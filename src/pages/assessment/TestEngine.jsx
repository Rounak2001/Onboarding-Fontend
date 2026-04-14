import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import TestQuestion from './TestQuestion';
import VideoQuestion from './VideoQuestion';
import { submitTest, submitVideo, logViolation, processProctoringSnapshot, uploadProctoringAudioClip, logProctoringAudioTelemetry, getProctoringPolicy, submitMcq, pingAssessment, saveMcqProgress } from '../../services/api';
import { saveAnswersLocally, getAnswersLocally, clearAnswersLocally } from '../../services/IndexedDBSyncHandler';
import BrandLogo from '../../components/BrandLogo';

const DEFAULT_PROCTORING_POLICY = {
    MAX_SESSION_VIOLATIONS: 9,
    MAX_TAB_WARNINGS: 3,
    MAX_WEBCAM_WARNINGS: 3,
    FULLSCREEN_REENTRY_GRACE_SECONDS: 10,
};
const ENABLE_DEV_DIAGNOSTICS = import.meta.env.DEV && String(
    import.meta.env.VITE_PROCTORING_DEBUG ?? 'false'
).toLowerCase() === 'true';
const SHOW_PROCTORING_DEBUG = ENABLE_DEV_DIAGNOSTICS;
const SHOW_DETECTOR_FALLBACK_NOTICE = ENABLE_DEV_DIAGNOSTICS;
const ENABLE_PROCTORING_AUDIO_ENDPOINTS = String(
    import.meta.env.VITE_PROCTORING_AUDIO_ENDPOINTS ?? 'false'
).toLowerCase() === 'true';
const EYE_TRACKING_ENABLED = String(import.meta.env.VITE_EYE_TRACKING || '').trim() === '1';
const FACE_LANDMARKER_MODEL_URL =
    String(import.meta.env.VITE_FACE_LANDMARKER_MODEL_URL || '').trim()
    || 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const TASKS_VISION_WASM_BASE_URL =
    String(import.meta.env.VITE_TASKS_VISION_WASM_BASE_URL || '').trim()
    || 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MCQ_SNAPSHOT_BASE_MS = 10000;
const VIDEO_SNAPSHOT_BASE_MS = 10000;
const AUDIO_RMS_THRESHOLD = 0.035;
const AUDIO_TELEMETRY_SAMPLE_MS = 200;
const AUDIO_TELEMETRY_POST_MS = 5000;
const SNAPSHOT_QUEUE_DB_NAME = 'taxplan-proctoring';
const SNAPSHOT_QUEUE_STORE_NAME = 'snapshot-upload-queue';
const VIDEO_QUEUE_STORE_NAME = 'video-upload-queue';
const MAX_QUEUED_SNAPSHOTS = 120;
const MAX_QUEUED_VIDEOS = 25;
const MAX_SILENT_FAILURES = 5;
const SNAPSHOT_MAX_RETRIES = 8;
const SNAPSHOT_RETRY_BASE_MS = 2000;
const SNAPSHOT_RETRY_MAX_MS = 60000;
const MIN_SNAPSHOT_INTERVAL_MS = 6000;
const VIDEO_QUESTION_TIME_SECONDS = 120;

const computeSnapshotRetryDelayMs = (retryCount) => {
    const exponent = Math.max(0, Number(retryCount) - 1);
    const delayMs = SNAPSHOT_RETRY_BASE_MS * (2 ** exponent);
    return Math.min(delayMs, SNAPSHOT_RETRY_MAX_MS);
};

const withSnapshotJitter = (baseMs) => {
    // Keep a predictable cadence for compliance checks.
    return Math.max(MIN_SNAPSHOT_INTERVAL_MS, baseMs);
};

const supportsIndexedDb = () => typeof window !== 'undefined' && !!window.indexedDB;

const idbRequest = (request) => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const openSnapshotQueueDb = () => new Promise((resolve, reject) => {
    if (!supportsIndexedDb()) {
        reject(new Error('IndexedDB is not supported'));
        return;
    }
    const req = window.indexedDB.open(SNAPSHOT_QUEUE_DB_NAME, 3);
    req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(SNAPSHOT_QUEUE_STORE_NAME)) {
            const store = db.createObjectStore(SNAPSHOT_QUEUE_STORE_NAME, { keyPath: 'snapshot_id' });
            store.createIndex('session_created_at', ['session_id', 'created_at'], { unique: false });
            store.createIndex('created_at', 'created_at', { unique: false });
        }
        if (!db.objectStoreNames.contains(VIDEO_QUEUE_STORE_NAME)) {
            const store = db.createObjectStore(VIDEO_QUEUE_STORE_NAME, { keyPath: 'upload_id' });
            store.createIndex('session_created_at', ['session_id', 'created_at'], { unique: false });
            store.createIndex('created_at', 'created_at', { unique: false });
        }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

const snapshotQueueGetAll = async () => {
    const db = await openSnapshotQueueDb();
    try {
        const tx = db.transaction(SNAPSHOT_QUEUE_STORE_NAME, 'readonly');
        const store = tx.objectStore(SNAPSHOT_QUEUE_STORE_NAME);
        return await idbRequest(store.getAll());
    } finally {
        db.close();
    }
};

const snapshotQueueUpsert = async (item) => {
    const db = await openSnapshotQueueDb();
    try {
        const tx = db.transaction(SNAPSHOT_QUEUE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(SNAPSHOT_QUEUE_STORE_NAME);
        await idbRequest(store.put(item));
    } finally {
        db.close();
    }
};

const snapshotQueueDelete = async (snapshotId) => {
    const db = await openSnapshotQueueDb();
    try {
        const tx = db.transaction(SNAPSHOT_QUEUE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(SNAPSHOT_QUEUE_STORE_NAME);
        await idbRequest(store.delete(snapshotId));
    } finally {
        db.close();
    }
};

const snapshotQueueClearForSession = async (sessionId) => {
    if (!sessionId) return;
    const allItems = await snapshotQueueGetAll();
    const matchingItems = allItems.filter((item) => item?.session_id === sessionId);
    for (const item of matchingItems) {
        if (item?.snapshot_id) {
            await snapshotQueueDelete(item.snapshot_id);
        }
    }
};

const videoQueueGetAll = async () => {
    const db = await openSnapshotQueueDb();
    try {
        const tx = db.transaction(VIDEO_QUEUE_STORE_NAME, 'readonly');
        const store = tx.objectStore(VIDEO_QUEUE_STORE_NAME);
        return await idbRequest(store.getAll());
    } finally {
        db.close();
    }
};

const videoQueueUpsert = async (item) => {
    const db = await openSnapshotQueueDb();
    try {
        const tx = db.transaction(VIDEO_QUEUE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(VIDEO_QUEUE_STORE_NAME);
        await idbRequest(store.put(item));
    } finally {
        db.close();
    }
};

const videoQueueDelete = async (uploadId) => {
    const db = await openSnapshotQueueDb();
    try {
        const tx = db.transaction(VIDEO_QUEUE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(VIDEO_QUEUE_STORE_NAME);
        await idbRequest(store.delete(uploadId));
    } finally {
        db.close();
    }
};

const videoQueueClearForSession = async (sessionId) => {
    if (!sessionId) return;
    const allItems = await videoQueueGetAll();
    const matchingItems = allItems.filter((item) => item?.session_id === sessionId);
    for (const item of matchingItems) {
        if (item?.upload_id) {
            await videoQueueDelete(item.upload_id);
        }
    }
};

const TestEngine = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { session } = location.state || {};
    const sessionRecoveryMode = String(session?.session_recovery?.mode || '').trim();
    const preflightMediaReady = Boolean(location.state?.preflight?.mediaReady);
    const [questions, setQuestions] = useState([]);
    const [videoQuestions, setVideoQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);

    const [questionTimeLeft, setQuestionTimeLeft] = useState(30);
    const [isVideoSection, setIsVideoSection] = useState(false);
    const [showVideoPrepScreen, setShowVideoPrepScreen] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [violationMessage, setViolationMessage] = useState('');
    const [sessionRecoveryNotice, setSessionRecoveryNotice] = useState('');
    const [proctoringPolicy, setProctoringPolicy] = useState(DEFAULT_PROCTORING_POLICY);
    const [serverViolationCount, setServerViolationCount] = useState(0);
    const [serverViolationCounters, setServerViolationCounters] = useState({});
    const [lastViolationType, setLastViolationType] = useState('');
    const [lastViolationTypeCount, setLastViolationTypeCount] = useState(0);
    const [lastServerViolationReason, setLastServerViolationReason] = useState('');
    const [lastServerViolationAt, setLastServerViolationAt] = useState(null);
    const [violationEvents, setViolationEvents] = useState([]);
    const [debugTelemetry, setDebugTelemetry] = useState({
        lastClientTimestamp: null,
        audioDetected: false,
        audioLevel: 0,
        micStatus: preflightMediaReady ? 'ready' : 'idle',
        gazeViolation: null,
        poseYaw: null,
        posePitch: null,
        poseRoll: null,
        mouthState: 'unknown',
        labelCount: 0,
        detectorStatus: 'idle',
        fullscreenState: false,
        lastSnapshotStatus: 'idle',
        snapshotCadenceMs: MCQ_SNAPSHOT_BASE_MS,
        lastSnapshotDurationMs: 0,
        lastViolationCount: 0,
        lastReason: null,
        lastError: null,
    });

    const [currentVideoQuestionIndex, setCurrentVideoQuestionIndex] = useState(0);
    const [currentVideoTimeLeft, setCurrentVideoTimeLeft] = useState(VIDEO_QUESTION_TIME_SECONDS);
    const [currentVideoDeadlineAt, setCurrentVideoDeadlineAt] = useState(null);
    const [videoCompleted, setVideoCompleted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatusText, setSubmitStatusText] = useState('Submitting assessment…');
    const [pendingVideoUploads, setPendingVideoUploads] = useState(0);
    const [failedVideoUploads, setFailedVideoUploads] = useState(0);
    const [pendingSnapshotUploads, setPendingSnapshotUploads] = useState(0);
    const [failedSnapshotUploads, setFailedSnapshotUploads] = useState(0);
    const [snapshotRecordedCount, setSnapshotRecordedCount] = useState(0);
    const [isProctoringBlocked, setIsProctoringBlocked] = useState(false);
    const [proctoringSuspended, setProctoringSuspended] = useState(false);
    const [proctoringSuspendReason, setProctoringSuspendReason] = useState('');
    const [isOnline, setIsOnline] = useState(() => navigator?.onLine !== false);
    const [webcamStatus, setWebcamStatus] = useState(preflightMediaReady ? 'ready' : 'idle');
    const [permissionRetrying, setPermissionRetrying] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(() => !!document.fullscreenElement);
    const [submissionResult] = useState(null);
    const lastViolationTime = useRef(0);
    const hasStartedAssessmentRef = useRef(false);
    const hasSessionExpiryRedirectedRef = useRef(false);
    const fullscreenGraceTimerRef = useRef(null);
    const mcqAutosaveTimerRef = useRef(null);
    const mcqAutosaveLastPayloadRef = useRef('');

    // Proctoring Refs
    const webcamRef = useRef(null);
    const snapshotIntervalRef = useRef(null);
    const micStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const audioDataArrayRef = useRef(null);
    const faceDetectorRef = useRef(null);
    const faceLandmarkerRef = useRef(null);
    const faceLandmarkerInitPromiseRef = useRef(null);
    const lastSnapshotDurationRef = useRef(0);
    const deferInitialMicProbeRef = useRef(preflightMediaReady);
    const snapshotCaptureInFlightRef = useRef(false);
    const videoSnapshotGetterRef = useRef(null);
    const isVideoUploadWorkerRunningRef = useRef(false);
    const isSnapshotUploadWorkerRunningRef = useRef(false);
    const audioTelemetryRef = useRef({
        windowStartMs: 0,
        lastSampleMs: 0,
        lastDetected: false,
        speechMs: 0,
        bursts: 0,
        sampleCount: 0,
        sumLevel: 0,
        maxLevel: 0,
        lastPostMs: 0,
    });
    const lastBurstClipAtRef = useRef(0);
    const violationTypeLabel = useCallback((rawType) => {
        const v = String(rawType || '').toLowerCase();
        const map = {
            tab_switch: 'Tab',
            fullscreen_exit: 'Fullscreen',
            face: 'Face',
            pose: 'Pose',
            voice: 'Voice',
            webcam: 'Webcam',
        };
        return map[v] || (v ? v.replace(/_/g, ' ') : 'Violation');
    }, []);

    const applyBackendViolationMeta = useCallback((res) => {
        if (!res) return;
        const context = res?.context || {};
        setServerViolationCount(prev => res?.violation_count ?? prev);
        if (context?.violation_counters && typeof context.violation_counters === 'object') {
            setServerViolationCounters(context.violation_counters);
        }
        if (context?.violation_type) {
            setLastViolationType(context.violation_type);
        }
        if (context?.violation_type_count != null) {
            setLastViolationTypeCount(Number(context.violation_type_count) || 0);
        }
        if (res?.reason) {
            setLastServerViolationReason(res.reason);
            setLastServerViolationAt(new Date());
            setViolationEvents(prev => {
                const event = {
                    at: new Date().toISOString(),
                    reason: res.reason,
                    type: context?.violation_type || 'unknown',
                    status: res.status || 'warning',
                    total: res?.violation_count ?? 0,
                };
                return [event, ...prev].slice(0, 8);
            });
        }
    }, []);

    // Load session data
    useEffect(() => {
        let mounted = true;
        const initializeSession = async () => {
            if (!session) { navigate('/assessment/select'); return; }
            const isMcqRestart = sessionRecoveryMode === 'mcq_restart';
            const isVideoRestart = sessionRecoveryMode === 'video_restart';
            if (session.question_set) setQuestions(session.question_set);
            else if (session.questions) setQuestions(session.questions);
            if (session.video_question_set) setVideoQuestions(session.video_question_set);
            else if (session.video_questions) setVideoQuestions(session.video_questions);
            else if (session.videoQuestions) setVideoQuestions(session.videoQuestions);
            setServerViolationCount(session?.violation_count || 0);
            if (session?.violation_counters && typeof session.violation_counters === 'object') {
                setServerViolationCounters(session.violation_counters);
            }

            if (session.id) {
                if (supportsIndexedDb() && (isMcqRestart || isVideoRestart)) {
                    await snapshotQueueClearForSession(session.id).catch(() => { });
                    await videoQueueClearForSession(session.id).catch(() => { });
                }

                if (isMcqRestart) {
                    await clearAnswersLocally(session.id).catch(() => { });
                    if (mounted) {
                        setAnswers({});
                        setCurrentQuestionIndex(0);
                        setQuestionTimeLeft(30);
                    }
                } else {
                    // Restore offline answers if any exist.
                    const cachedAnswers = await getAnswersLocally(session.id);
                    if (mounted && cachedAnswers && Object.keys(cachedAnswers).length > 0) {
                        setAnswers(cachedAnswers);
                    }
                }
            }

            if (mounted && (isVideoRestart || session?.status === 'mcq_completed')) {
                setShowVideoPrepScreen(true);
                setIsVideoSection(false);
                setCurrentVideoQuestionIndex(0);
                setCurrentVideoDeadlineAt(null);
                setCurrentVideoTimeLeft(VIDEO_QUESTION_TIME_SECONDS);
                setVideoCompleted(false);
            }

            if (mounted && isMcqRestart) {
                setShowVideoPrepScreen(false);
                setIsVideoSection(false);
                setCurrentVideoQuestionIndex(0);
                setVideoCompleted(false);
                setCurrentVideoDeadlineAt(null);
                setCurrentVideoTimeLeft(VIDEO_QUESTION_TIME_SECONDS);
            }

            if (mounted && (isMcqRestart || isVideoRestart)) {
                setViolationEvents([]);
                setLastServerViolationReason('');
                setLastServerViolationAt(null);
                setLastViolationType('');
                setLastViolationTypeCount(0);
                setPendingSnapshotUploads(0);
                setPendingVideoUploads(0);
                setFailedSnapshotUploads(0);
                setFailedVideoUploads(0);
                setIsProctoringBlocked(false);
                setProctoringSuspended(false);
                setProctoringSuspendReason('');
                setSnapshotRecordedCount(0);
                setDebugTelemetry(prev => ({
                    ...prev,
                    lastSnapshotStatus: 'idle',
                    lastError: null,
                    lastReason: null,
                    lastViolationCount: 0,
                }));
            }

            if (mounted) {
                const recoveryMessage = String(session?.session_recovery?.message || '').trim();
                setSessionRecoveryNotice(recoveryMessage);
                setLoading(false);
            }
        };
        initializeSession();
        return () => { mounted = false; };
    }, [session, navigate, sessionRecoveryMode]);

    const startVideoQuestion = useCallback(() => {
        const deadline = Date.now() + (VIDEO_QUESTION_TIME_SECONDS * 1000);
        setCurrentVideoDeadlineAt(deadline);
        setCurrentVideoTimeLeft(VIDEO_QUESTION_TIME_SECONDS);
    }, []);

    const openVideoPrepScreen = useCallback(() => {
        setIsVideoSection(false);
        setShowVideoPrepScreen(true);
        setCurrentVideoQuestionIndex(0);
        setCurrentVideoDeadlineAt(null);
        setCurrentVideoTimeLeft(VIDEO_QUESTION_TIME_SECONDS);
    }, []);

    const beginVideoAssessment = () => {
        setShowVideoPrepScreen(false);
        setIsVideoSection(true);
        setProctoringSuspended(false);
        setProctoringSuspendReason('');
        setCurrentVideoQuestionIndex(0);
        setCurrentVideoDeadlineAt(null);
        setCurrentVideoTimeLeft(VIDEO_QUESTION_TIME_SECONDS);
    };

    useEffect(() => {
        let mounted = true;
        const loadPolicy = async () => {
            try {
                const policyRes = await getProctoringPolicy();
                const thresholds = policyRes?.thresholds || {};
                if (!mounted) return;
                setProctoringPolicy({
                    MAX_SESSION_VIOLATIONS: thresholds.max_session_violations ?? DEFAULT_PROCTORING_POLICY.MAX_SESSION_VIOLATIONS,
                    MAX_TAB_WARNINGS: thresholds.max_tab_warnings ?? DEFAULT_PROCTORING_POLICY.MAX_TAB_WARNINGS,
                    MAX_WEBCAM_WARNINGS: thresholds.max_webcam_warnings ?? DEFAULT_PROCTORING_POLICY.MAX_WEBCAM_WARNINGS,
                    FULLSCREEN_REENTRY_GRACE_SECONDS: thresholds.fullscreen_reentry_grace_seconds ?? DEFAULT_PROCTORING_POLICY.FULLSCREEN_REENTRY_GRACE_SECONDS,
                });
            } catch (err) {
                console.error('Failed to load proctoring policy:', err);
            }
        };
        loadPolicy();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!navigator?.mediaDevices?.getUserMedia) {
            setWebcamStatus('unsupported');
        }
    }, []);

    const stopAudioDetector = useCallback(() => {
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        audioDataArrayRef.current = null;
    }, []);

    const initAudioDetector = useCallback(async () => {
        if (analyserRef.current || !navigator?.mediaDevices?.getUserMedia) {
            if (!navigator?.mediaDevices?.getUserMedia) {
                setDebugTelemetry(prev => ({ ...prev, micStatus: 'unsupported' }));
            }
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 1024;
            analyser.smoothingTimeConstant = 0.85;
            source.connect(analyser);

            micStreamRef.current = stream;
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            audioDataArrayRef.current = new Uint8Array(analyser.fftSize);
            setDebugTelemetry(prev => ({ ...prev, micStatus: 'ready' }));
        } catch (err) {
            console.error('Mic detector init failed:', err);
            setDebugTelemetry(prev => ({ ...prev, micStatus: 'denied' }));
        }
    }, []);

    const handleRetryMediaPermissions = useCallback(async () => {
        if (!navigator?.mediaDevices?.getUserMedia) {
            setWebcamStatus('unsupported');
            setDebugTelemetry(prev => ({ ...prev, micStatus: 'unsupported' }));
            return;
        }
        setPermissionRetrying(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            stream.getTracks().forEach((track) => track.stop());
            setWebcamStatus('ready');
            stopAudioDetector();
            await initAudioDetector();
            setDebugTelemetry(prev => ({ ...prev, lastError: null }));
        } catch (err) {
            const errorName = String(err?.name || '').toLowerCase();
            if (errorName.includes('notallowed') || errorName.includes('permission')) {
                setWebcamStatus('denied');
                setDebugTelemetry(prev => ({ ...prev, micStatus: 'denied' }));
            } else if (errorName.includes('notfound') || errorName.includes('devicesnotfound')) {
                setWebcamStatus('unavailable');
                setDebugTelemetry(prev => ({ ...prev, micStatus: 'unavailable' }));
            } else {
                setWebcamStatus('error');
            }
            setDebugTelemetry(prev => ({ ...prev, lastError: err?.message || 'Permission retry failed' }));
        } finally {
            setPermissionRetrying(false);
        }
    }, [initAudioDetector, stopAudioDetector]);

    const getAudioSignal = useCallback(() => {
        if (!analyserRef.current || !audioDataArrayRef.current) {
            return { detected: false, level: 0, threshold: AUDIO_RMS_THRESHOLD };
        }
        analyserRef.current.getByteTimeDomainData(audioDataArrayRef.current);
        let sumSquares = 0;
        for (let i = 0; i < audioDataArrayRef.current.length; i += 1) {
            const normalized = (audioDataArrayRef.current[i] - 128) / 128;
            sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / audioDataArrayRef.current.length);
        const detected = rms > AUDIO_RMS_THRESHOLD;
        return { detected, level: Number(rms.toFixed(4)), threshold: AUDIO_RMS_THRESHOLD };
    }, []);

    useEffect(() => {
        if (!submissionResult) {
            if (deferInitialMicProbeRef.current) {
                deferInitialMicProbeRef.current = false;
            } else {
                initAudioDetector();
            }
        }
        return () => {
            stopAudioDetector();
        };
    }, [submissionResult, initAudioDetector, stopAudioDetector]);

    useEffect(() => {
        if (!submissionResult && preflightMediaReady) {
            setDebugTelemetry(prev => ({
                ...prev,
                micStatus: prev.micStatus === 'idle' ? 'ready' : prev.micStatus,
            }));
        }
    }, [preflightMediaReady, submissionResult]);

    useEffect(() => {
        if (!submissionResult && preflightMediaReady) {
            setWebcamStatus(prev => (prev === 'idle' ? 'ready' : prev));
        }
    }, [preflightMediaReady, submissionResult]);

    // Continuous audio telemetry: lightweight client-side VAD sampling (works across browsers via WebAudio).
    useEffect(() => {
        if (!ENABLE_PROCTORING_AUDIO_ENDPOINTS) return;
        if (!session?.id) return;
        if (loading || submissionResult) return;
        if (!navigator?.mediaDevices?.getUserMedia) return;

        let timer = null;
        const tick = async () => {
            const now = Date.now();
            const state = audioTelemetryRef.current;
            if (!state.windowStartMs) {
                state.windowStartMs = now;
                state.lastSampleMs = now;
                state.lastPostMs = now;
            }

            const { detected, level, threshold } = getAudioSignal();
            const dt = Math.max(0, now - (state.lastSampleMs || now));
            state.lastSampleMs = now;

            // DEV-only: capture short clips on speech bursts so STT can detect "mark B/option 2" prompts.
            if (ENABLE_PROCTORING_AUDIO_ENDPOINTS && import.meta.env.DEV && detected && !state.lastDetected) {
                if (typeof MediaRecorder !== 'undefined' && now - lastBurstClipAtRef.current >= 8000) {
                    lastBurstClipAtRef.current = now;
                    (async () => {
                        try {
                            if (!micStreamRef.current) await initAudioDetector();
                            const stream = micStreamRef.current;
                            if (!stream) return;

                            const chunks = [];
                            const recorder = new MediaRecorder(stream);
                            const startedAt = Date.now();
                            const done = new Promise((resolve) => {
                                recorder.ondataavailable = (e) => {
                                    if (e.data && e.data.size > 0) chunks.push(e.data);
                                };
                                recorder.onstop = () => resolve();
                            });
                            recorder.start();
                            setTimeout(() => {
                                try { recorder.stop(); } catch { /* ignore */ }
                            }, 2500);
                            await done;
                            if (chunks.length === 0) return;

                            const mime = chunks[0]?.type || recorder.mimeType || '';
                            const blob = new Blob(chunks, { type: mime || undefined });
                            const ext = (mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm');

                            const formData = new FormData();
                            formData.append('audio', blob, `burst_${startedAt}.${ext}`);
                            formData.append('snapshot_id', '');
                            formData.append('client_timestamp', new Date().toISOString());
                            formData.append('duration_ms', String(Date.now() - startedAt));
                            formData.append('audio_level', level == null ? '' : String(level));
                            formData.append('mime_type', mime);
                            await uploadProctoringAudioClip(session.id, formData);
                        } catch {
                            // ignore clip capture failures
                        }
                    })();
                }
            }

            state.sampleCount += 1;
            state.sumLevel += Number(level || 0);
            state.maxLevel = Math.max(state.maxLevel || 0, Number(level || 0));

            if (detected) {
                state.speechMs += dt;
                if (!state.lastDetected) state.bursts += 1;
            }
            state.lastDetected = detected;

            // Post windowed telemetry periodically; best-effort and never blocks candidate flow.
            if (now - (state.lastPostMs || now) >= AUDIO_TELEMETRY_POST_MS) {
                const windowStart = new Date(state.windowStartMs).toISOString();
                const windowEnd = new Date(now).toISOString();
                const avgLevel = state.sampleCount > 0 ? Number((state.sumLevel / state.sampleCount).toFixed(4)) : null;

                const payload = {
                    window_start: windowStart,
                    window_end: windowEnd,
                    speech_ms: Math.round(state.speechMs || 0),
                    bursts: Math.round(state.bursts || 0),
                    sample_count: Math.round(state.sampleCount || 0),
                    avg_level: avgLevel,
                    max_level: Number((state.maxLevel || 0).toFixed(4)),
                    threshold,
                    mic_status: debugTelemetry.micStatus,
                };

                // Reset window immediately (even if the network fails).
                state.windowStartMs = now;
                state.lastPostMs = now;
                state.speechMs = 0;
                state.bursts = 0;
                state.sampleCount = 0;
                state.sumLevel = 0;
                state.maxLevel = 0;

                try {
                    if (navigator?.onLine !== false) {
                        await logProctoringAudioTelemetry(session.id, payload);
                        setDebugTelemetry(prev => ({ ...prev, lastAudioTelemetrySentAt: new Date().toISOString() }));
                    }
                } catch {
                    // swallow network errors
                }
            }
        };

        timer = setInterval(() => {
            tick().catch(() => { });
        }, AUDIO_TELEMETRY_SAMPLE_MS);

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [debugTelemetry.micStatus, getAudioSignal, initAudioDetector, loading, session?.id, submissionResult]);

    const ensureFaceLandmarker = useCallback(async () => {
        if (faceLandmarkerRef.current) return faceLandmarkerRef.current;
        if (faceLandmarkerInitPromiseRef.current) return faceLandmarkerInitPromiseRef.current;

        faceLandmarkerInitPromiseRef.current = (async () => {
            const mod = await import('@mediapipe/tasks-vision');
            const FilesetResolver = mod.FilesetResolver;
            const FaceLandmarker = mod.FaceLandmarker;

            const vision = await FilesetResolver.forVisionTasks(TASKS_VISION_WASM_BASE_URL);
            const landmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL },
                runningMode: 'IMAGE',
                numFaces: 1,
                outputFaceBlendshapes: false,
                outputFacialTransformationMatrixes: false,
            });
            faceLandmarkerRef.current = landmarker;
            return landmarker;
        })();

        return faceLandmarkerInitPromiseRef.current;
    }, []);

    const computeIrisGazeViolation = useCallback((landmarks, imageWidth, imageHeight) => {
        if (!Array.isArray(landmarks) || landmarks.length < 478) return null;
        const toPx = (idx) => {
            const p = landmarks[idx];
            if (!p) return null;
            return { x: p.x * imageWidth, y: p.y * imageHeight };
        };

        // MediaPipe FaceMesh / FaceLandmarker indices.
        // Right eye corners: 33 (outer), 133 (inner). Iris: 469-472.
        // Left eye corners: 362 (outer), 263 (inner). Iris: 474-477.
        const rOuter = toPx(33);
        const rInner = toPx(133);
        const lOuter = toPx(362);
        const lInner = toPx(263);
        const rIris = [469, 470, 471, 472].map(toPx).filter(Boolean);
        const lIris = [474, 475, 476, 477].map(toPx).filter(Boolean);
        if (!rOuter || !rInner || !lOuter || !lInner || rIris.length < 2 || lIris.length < 2) return null;

        const irisCenter = (pts) => {
            const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
            return { x: sum.x / pts.length, y: sum.y / pts.length };
        };

        const rC = irisCenter(rIris);
        const lC = irisCenter(lIris);

        const ratio = (outer, inner, c) => {
            const width = Math.max(1, Math.abs(inner.x - outer.x));
            const minX = Math.min(outer.x, inner.x);
            return (c.x - minX) / width; // 0..1-ish
        };

        const rRatio = ratio(rOuter, rInner, rC);
        const lRatio = ratio(lOuter, lInner, lC);

        // Rough thresholds: centered ~0.5. Too far left/right => likely looking away or face turned.
        // Stricter gaze threshold for testing: smaller "center" window.
        const isOffCenter = (v) => v < 0.4 || v > 0.6;
        return isOffCenter(rRatio) || isOffCenter(lRatio);
    }, []);

    const getVisualTelemetry = useCallback(async (imageBlob) => {
        const fallback = {
            gazeViolation: null,
            poseYaw: null,
            posePitch: null,
            poseRoll: null,
            mouthState: 'unknown',
            labelDetectionResults: [],
            detectorStatus: 'fallback',
        };

        try {
            if (EYE_TRACKING_ENABLED) {
                try {
                    const landmarker = await ensureFaceLandmarker();
                    const bitmap = await createImageBitmap(imageBlob);
                    try {
                        const res = landmarker.detect(bitmap);
                        const faceLandmarks = res?.faceLandmarks?.[0] || null;
                        if (!faceLandmarks) {
                            return { ...fallback, detectorStatus: 'eye_tracking_no_face' };
                        }
                        const irisViolation = computeIrisGazeViolation(faceLandmarks, bitmap.width, bitmap.height);
                        return {
                            ...fallback,
                            gazeViolation: irisViolation == null ? null : Boolean(irisViolation),
                            detectorStatus: irisViolation == null ? 'eye_tracking_low_confidence' : 'eye_tracking_ready',
                        };
                    } finally {
                        bitmap.close();
                    }
                } catch (err) {
                    console.error('Eye tracking init/detect failed:', err);
                    return { ...fallback, detectorStatus: 'eye_tracking_error' };
                }
            }

            // Do not fabricate gaze/head-pose values in the browser when eye tracking isn't reliable.
            // Omitting gaze_violation/pose_* lets the backend derive conservative telemetry from Rekognition.
            return { ...fallback, detectorStatus: 'server_fallback' };
        } catch (err) {
            console.error('Visual telemetry detector failed:', err);
            return { ...fallback, detectorStatus: 'error' };
        }
    }, []);

    const getAdaptiveSnapshotCadenceMs = useCallback(() => {
        return isVideoSection ? VIDEO_SNAPSHOT_BASE_MS : MCQ_SNAPSHOT_BASE_MS;
    }, [isVideoSection]);

    const setSnapshotDebugTelemetry = useCallback((updater) => {
        if (!SHOW_PROCTORING_DEBUG && !SHOW_DETECTOR_FALLBACK_NOTICE) return;
        setDebugTelemetry(updater);
    }, []);

    const getSnapshotErrorMessage = useCallback((err) => {
        return String(err?.response?.data?.error || err?.message || '').trim();
    }, []);

    const isSessionExpiredError = useCallback((err) => {
        const errorCode = String(err?.response?.data?.code || '').trim().toUpperCase();
        return errorCode === 'ASSESSMENT_SESSION_EXPIRED_RESELECT';
    }, []);

    const redirectToCategoryReselect = useCallback((err) => {
        if (hasSessionExpiryRedirectedRef.current) {
            return;
        }
        hasSessionExpiryRedirectedRef.current = true;
        if (snapshotIntervalRef.current) {
            clearInterval(snapshotIntervalRef.current);
        }
        if (fullscreenGraceTimerRef.current) {
            clearTimeout(fullscreenGraceTimerRef.current);
            fullscreenGraceTimerRef.current = null;
        }
        setProctoringSuspended(true);
        setIsProctoringBlocked(false);
        const message = String(
            err?.response?.data?.error
            || 'Your assessment session expired. Please select categories again to continue.'
        ).trim();
        navigate('/assessment/select', {
            replace: true,
            state: { sessionNotice: message },
        });
    }, [navigate]);

    const handleProctoringSessionInactive = useCallback((err) => {
        if (isSessionExpiredError(err)) {
            redirectToCategoryReselect(err);
            return true;
        }
        const msg = getSnapshotErrorMessage(err).toLowerCase();
        const inactive = msg.includes('session not active');
        if (!inactive) return false;
        setSnapshotDebugTelemetry(prev => ({
            ...prev,
            lastSnapshotStatus: 'retrying',
            lastError: 'Session not active: retrying proctoring snapshot upload.',
        }));
        // Keep proctoring active and allow retry/queue flow to proceed.
        return false;
    }, [getSnapshotErrorMessage, isSessionExpiredError, redirectToCategoryReselect, setSnapshotDebugTelemetry]);

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const refreshVideoQueueStats = useCallback(async () => {
        if (!supportsIndexedDb() || !session?.id) {
            setPendingVideoUploads(0);
            return;
        }
        try {
            const allItems = await videoQueueGetAll();
            const pending = allItems.filter((item) => item?.session_id === session.id).length;
            setPendingVideoUploads(pending + (isVideoUploadWorkerRunningRef.current ? 1 : 0));
        } catch {
            setPendingVideoUploads(0);
        }
    }, [session?.id]);

    const trimVideoQueue = useCallback(async () => {
        if (!supportsIndexedDb()) return;
        const allItems = await videoQueueGetAll();
        if (allItems.length <= MAX_QUEUED_VIDEOS) return;
        const extras = allItems
            .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
            .slice(0, allItems.length - MAX_QUEUED_VIDEOS);
        for (const item of extras) {
            if (item?.upload_id) {
                await videoQueueDelete(item.upload_id);
            }
        }
    }, []);

    const drainVideoUploadQueue = useCallback(async () => {
        if (!supportsIndexedDb() || !session?.id || isVideoUploadWorkerRunningRef.current) return;
        isVideoUploadWorkerRunningRef.current = true;
        await refreshVideoQueueStats();

        try {
            while (true) {
                const allItems = await videoQueueGetAll();
                const item = allItems
                    .filter((row) => row?.session_id === session.id)
                    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))[0];
                if (!item) break;

                try {
                    await submitVideo(
                        session.id,
                        item.questionId,
                        item.blob,
                        item.questionText,
                        Number(item.durationSeconds)
                    );
                    await videoQueueDelete(item.upload_id);
                } catch (err) {
                    if (isSessionExpiredError(err)) {
                        await videoQueueDelete(item.upload_id);
                        redirectToCategoryReselect(err);
                        break;
                    }
                    const nextRetries = (Number(item.retries) || 0) + 1;
                    if (nextRetries <= 5) {
                        await videoQueueUpsert({ ...item, retries: nextRetries });
                        await sleep(Math.min(2000 * nextRetries, 6000));
                    } else {
                        await videoQueueDelete(item.upload_id);
                        setFailedVideoUploads(prev => prev + 1);
                    }
                    break;
                } finally {
                    await refreshVideoQueueStats();
                }
            }
        } finally {
            isVideoUploadWorkerRunningRef.current = false;
            await refreshVideoQueueStats();
        }
    }, [session?.id, refreshVideoQueueStats, isSessionExpiredError, redirectToCategoryReselect]);

    const enqueueVideoUpload = useCallback(async (uploadPayload) => {
        if (!uploadPayload?.blob || !uploadPayload?.questionId) return;
        const uploadId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : `video-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        await videoQueueUpsert({
            upload_id: uploadId,
            session_id: session.id,
            created_at: new Date().toISOString(),
            questionId: uploadPayload.questionId,
            questionText: uploadPayload.questionText || '',
            durationSeconds: Number(uploadPayload.durationSeconds),
            blob: uploadPayload.blob,
            fileName: uploadPayload.fileName,
            retries: 0,
        });
        await trimVideoQueue();
        await refreshVideoQueueStats();
        drainVideoUploadQueue();
    }, [drainVideoUploadQueue, refreshVideoQueueStats, session?.id, trimVideoQueue]);

    const waitForVideoUploadsToFinish = useCallback(async (maxWaitMs = 30000) => {
        const deadline = Date.now() + maxWaitMs;
        while (Date.now() < deadline) {
            const allItems = supportsIndexedDb() ? await videoQueueGetAll() : [];
            const pending = allItems.filter((row) => row?.session_id === session?.id).length;
            const hasPending = isVideoUploadWorkerRunningRef.current || pending > 0;
            if (!hasPending) return true;
            await sleep(250);
        }
        return false;
    }, [session?.id]);

    const buildSnapshotId = useCallback(() => {
        try {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
        } catch {
            // ignore and fallback below
        }
        return `snap-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    }, []);

    const isRetryableSnapshotError = useCallback((err) => {
        if (!err?.response) return true;
        const statusCode = Number(err.response.status) || 0;
        return statusCode >= 500 || statusCode === 429;
    }, []);

    const refreshSnapshotQueueStats = useCallback(async () => {
        if (!supportsIndexedDb() || !session?.id) {
            setPendingSnapshotUploads(0);
            setIsProctoringBlocked(false);
            return;
        }
        try {
            const allItems = await snapshotQueueGetAll();
            const pending = allItems.filter((item) => item?.session_id === session.id).length;
            const pendingWithWorker = pending + (isSnapshotUploadWorkerRunningRef.current ? 1 : 0);
            setPendingSnapshotUploads(pendingWithWorker);
            setIsProctoringBlocked(pendingWithWorker >= MAX_SILENT_FAILURES);
        } catch {
            setPendingSnapshotUploads(0);
            setIsProctoringBlocked(false);
        }
    }, [session?.id]);

    const trimSnapshotQueue = useCallback(async () => {
        if (!supportsIndexedDb()) return;
        const allItems = await snapshotQueueGetAll();
        if (allItems.length <= MAX_QUEUED_SNAPSHOTS) return;
        const extras = allItems
            .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
            .slice(0, allItems.length - MAX_QUEUED_SNAPSHOTS);
        for (const item of extras) {
            if (item?.snapshot_id) {
                await snapshotQueueDelete(item.snapshot_id);
            }
        }
    }, []);

    const enqueueSnapshotUpload = useCallback(async (snapshotItem, overrides = {}) => {
        if (!supportsIndexedDb()) return;
        const nowIso = new Date().toISOString();
        const queuedItem = {
            ...snapshotItem,
            ...overrides,
            retries: Number(overrides.retries ?? snapshotItem.retries ?? 0),
            queued_at: snapshotItem.queued_at || nowIso,
            next_attempt_at: overrides.next_attempt_at ?? snapshotItem.next_attempt_at ?? nowIso,
            last_error: overrides.last_error ?? snapshotItem.last_error ?? null,
        };
        await snapshotQueueUpsert(queuedItem);
        await trimSnapshotQueue();
        await refreshSnapshotQueueStats();
    }, [refreshSnapshotQueueStats, trimSnapshotQueue]);

    const sendSnapshotToBackend = useCallback(async (snapshotItem, startedAt) => {
        const formData = new FormData();
        formData.append('image', snapshotItem.image_blob, 'snapshot.jpg');
        formData.append('audio_detected', String(snapshotItem.audio_detected));
        formData.append('audio_level', snapshotItem.audio_level == null ? '' : String(snapshotItem.audio_level));
        formData.append('audio_threshold', snapshotItem.audio_threshold == null ? '' : String(snapshotItem.audio_threshold));
        if (snapshotItem.gaze_violation !== null && snapshotItem.gaze_violation !== undefined) {
            formData.append('gaze_violation', String(snapshotItem.gaze_violation));
        }
        formData.append('pose_yaw', snapshotItem.pose_yaw == null ? '' : String(snapshotItem.pose_yaw));
        formData.append('pose_pitch', snapshotItem.pose_pitch == null ? '' : String(snapshotItem.pose_pitch));
        formData.append('pose_roll', snapshotItem.pose_roll == null ? '' : String(snapshotItem.pose_roll));
        formData.append('mouth_state', snapshotItem.mouth_state || 'unknown');
        formData.append('label_detection_results', JSON.stringify(snapshotItem.label_detection_results || []));
        formData.append('fullscreen_state', String(snapshotItem.fullscreen_state));
        formData.append('client_timestamp', snapshotItem.client_timestamp);
        formData.append('snapshot_id', snapshotItem.snapshot_id);
        formData.append('detector_status', snapshotItem.detector_status || 'unknown');
        formData.append('webcam_status', snapshotItem.webcam_status || 'unknown');
        formData.append('mic_status', snapshotItem.mic_status || 'unknown');

        const res = await processProctoringSnapshot(session.id, formData);
        applyBackendViolationMeta(res);
        const responseContext = res?.context || {};
        setSnapshotDebugTelemetry(prev => ({
            ...prev,
            lastSnapshotStatus: res?.status || 'unknown',
            lastSnapshotDurationMs: Date.now() - startedAt,
            lastViolationCount: res?.violation_count ?? prev.lastViolationCount,
            lastReason: res?.reason || null,
            gazeViolation: responseContext.gaze_violation ?? prev.gazeViolation,
            poseYaw: responseContext.pose_yaw ?? prev.poseYaw,
            posePitch: responseContext.pose_pitch ?? prev.posePitch,
            poseRoll: responseContext.pose_roll ?? prev.poseRoll,
            mouthState: responseContext.mouth_state ?? prev.mouthState,
            labelCount: Array.isArray(responseContext.label_detection_results)
                ? responseContext.label_detection_results.length
                : prev.labelCount,
            detectorStatus: responseContext.detector_mode || (
                responseContext.server_fallback_applied ? 'server_fallback' : prev.detectorStatus
            ),
            lastError: null,
        }));
        lastSnapshotDurationRef.current = Date.now() - startedAt;

        if (res.status === 'terminated') {
            handleTermination();
        } else if (res.status === 'warning') {
            setViolationMessage(res.reason || 'Violation detected.');
            setShowWarningModal(true);
        }
        return res;
    }, [session?.id, applyBackendViolationMeta, setSnapshotDebugTelemetry]);

    const lastAudioClipUploadAtRef = useRef(0);
    const maybeCaptureAndUploadAudioClip = useCallback(async ({
        snapshotId,
        audioLevel,
        audioDetected,
        clientTimestamp,
    }) => {
        if (!ENABLE_PROCTORING_AUDIO_ENDPOINTS) return;
        if (!import.meta.env.DEV) return;
        if (!audioDetected) return;
        if (navigator?.onLine === false) return;
        if (!session?.id) return;

        const now = Date.now();
        if (now - lastAudioClipUploadAtRef.current < 8000) return;
        lastAudioClipUploadAtRef.current = now;

        if (typeof MediaRecorder === 'undefined') {
            setSnapshotDebugTelemetry(prev => ({ ...prev, lastError: prev.lastError || 'MediaRecorder unsupported: audio clip upload skipped.' }));
            return;
        }

        try {
            if (!micStreamRef.current) {
                await initAudioDetector();
            }
            const stream = micStreamRef.current;
            if (!stream) return;

            const chunks = [];
            const recorder = new MediaRecorder(stream);
            const startedAt = Date.now();

            const done = new Promise((resolve) => {
                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };
                recorder.onstop = () => resolve();
            });

            recorder.start();
            setTimeout(() => {
                try { recorder.stop(); } catch { /* ignore */ }
            }, 1600);

            await done;
            const durationMs = Date.now() - startedAt;
            if (chunks.length === 0) return;

            const mime = chunks[0]?.type || recorder.mimeType || '';
            const blob = new Blob(chunks, { type: mime || undefined });
            const ext = (mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm');

            const formData = new FormData();
            formData.append('audio', blob, `clip_${snapshotId}.${ext}`);
            formData.append('snapshot_id', snapshotId);
            formData.append('client_timestamp', clientTimestamp || new Date().toISOString());
            formData.append('duration_ms', String(durationMs));
            formData.append('audio_level', audioLevel == null ? '' : String(audioLevel));
            formData.append('mime_type', mime);

            await uploadProctoringAudioClip(session.id, formData);
            setSnapshotDebugTelemetry(prev => ({ ...prev, lastAudioClipUploadAt: new Date().toISOString() }));
        } catch (err) {
            setSnapshotDebugTelemetry(prev => ({
                ...prev,
                lastError: err?.response?.data?.error || err?.message || 'Audio clip upload failed',
            }));
        }
    }, [initAudioDetector, session?.id, setSnapshotDebugTelemetry]);

    const drainSnapshotUploadQueue = useCallback(async () => {
        if (!supportsIndexedDb() || !session?.id || proctoringSuspended || isSnapshotUploadWorkerRunningRef.current || navigator?.onLine === false) return;
        isSnapshotUploadWorkerRunningRef.current = true;
        await refreshSnapshotQueueStats();

        try {
            while (true) {
                const allItems = await snapshotQueueGetAll();
                const nowMs = Date.now();
                const nextItem = allItems
                    .filter((item) => item?.session_id === session.id)
                    .filter((item) => {
                        if (!item?.next_attempt_at) return true;
                        const dueAtMs = Date.parse(item.next_attempt_at);
                        return Number.isNaN(dueAtMs) || dueAtMs <= nowMs;
                    })
                    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))[0];

                if (!nextItem) break;
                try {
                    await sendSnapshotToBackend(nextItem, Date.now());
                    await snapshotQueueDelete(nextItem.snapshot_id);
                } catch (err) {
                    if (handleProctoringSessionInactive(err)) {
                        break;
                    }
                    if (isRetryableSnapshotError(err)) {
                        const nextRetries = (Number(nextItem.retries) || 0) + 1;
                        const errMsg = err?.response?.data?.error || err?.message || 'Snapshot retry failed';
                        if (nextRetries > SNAPSHOT_MAX_RETRIES) {
                            await snapshotQueueDelete(nextItem.snapshot_id);
                            setFailedSnapshotUploads(prev => prev + 1);
                        } else {
                            const delayMs = computeSnapshotRetryDelayMs(nextRetries);
                            await enqueueSnapshotUpload(nextItem, {
                                retries: nextRetries,
                                next_attempt_at: new Date(Date.now() + delayMs).toISOString(),
                                last_error: errMsg,
                            });
                        }
                        break;
                    }
                    await snapshotQueueDelete(nextItem.snapshot_id);
                    setFailedSnapshotUploads(prev => prev + 1);
                }
                await refreshSnapshotQueueStats();
            }
        } finally {
            isSnapshotUploadWorkerRunningRef.current = false;
            await refreshSnapshotQueueStats();
        }
    }, [enqueueSnapshotUpload, handleProctoringSessionInactive, isRetryableSnapshotError, proctoringSuspended, refreshSnapshotQueueStats, sendSnapshotToBackend, session?.id]);

    const waitForSnapshotUploadsToFinish = useCallback(async (maxWaitMs = 12000) => {
        const deadline = Date.now() + maxWaitMs;
        while (Date.now() < deadline) {
            const allItems = supportsIndexedDb() ? await snapshotQueueGetAll() : [];
            const pending = allItems.filter((item) => item?.session_id === session?.id).length;
            if (!isSnapshotUploadWorkerRunningRef.current && pending === 0) return true;
            await sleep(250);
        }
        return false;
    }, [session?.id]);

    useEffect(() => {
        const onOnline = () => {
            setIsOnline(true);
            drainVideoUploadQueue();
            if (!proctoringSuspended) drainSnapshotUploadQueue();
        };
        const onOffline = () => {
            setIsOnline(false);
        };
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        const retryTick = setInterval(() => {
            if (navigator?.onLine === false) return;
            drainVideoUploadQueue();
            if (!proctoringSuspended) drainSnapshotUploadQueue();
        }, 8000);
        refreshSnapshotQueueStats();
        refreshVideoQueueStats();
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
            clearInterval(retryTick);
        };
    }, [drainVideoUploadQueue, drainSnapshotUploadQueue, proctoringSuspended, refreshSnapshotQueueStats, refreshVideoQueueStats]);

    // Background heartbeat ping
    useEffect(() => {
        if (!session?.id || submissionResult || loading) return;
        const pingInterval = setInterval(() => {
            if (navigator?.onLine !== false) {
                pingAssessment(session.id, { client_timestamp: new Date().toISOString() })
                    .catch(e => {
                        if (isSessionExpiredError(e)) {
                            redirectToCategoryReselect(e);
                            return;
                        }
                        console.error("Heartbeat failed", e);
                    });
            }
        }, 10000);
        return () => clearInterval(pingInterval);
    }, [session?.id, submissionResult, loading, isSessionExpiredError, redirectToCategoryReselect]);

    // MCQ next
    const handleNext = useCallback(() => {
        if (isProctoringBlocked) return;
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setQuestionTimeLeft(30);
        } else {
            if (videoQuestions.length > 0) {
                openVideoPrepScreen();
            } else {
                setIsVideoSection(true);
                setShowVideoPrepScreen(false);
                setCurrentVideoQuestionIndex(0);
            }
            // Synchronous save of MCQ progress when transitioning to video
            if (session?.id) {
                submitMcq(session.id, { answers }).catch(err => {
                    if (isSessionExpiredError(err)) {
                        redirectToCategoryReselect(err);
                        return;
                    }
                    console.error("Failed to submit MCQ intermediate progress:", err);
                });
            }
        }
    }, [currentQuestionIndex, isProctoringBlocked, questions.length, session?.id, answers, openVideoPrepScreen, videoQuestions.length, isSessionExpiredError, redirectToCategoryReselect]);

    // MCQ 30s timer
    useEffect(() => {
        if (loading || isVideoSection || showVideoPrepScreen || questions.length === 0 || submissionResult || isProctoringBlocked) return;
        setQuestionTimeLeft(30);
        const t = setInterval(() => {
            setQuestionTimeLeft(prev => {
                if (prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [currentQuestionIndex, isVideoSection, isProctoringBlocked, showVideoPrepScreen, questions.length, loading, submissionResult]);

    // MCQ timeout → next
    useEffect(() => {
        if (!isVideoSection && !showVideoPrepScreen && questionTimeLeft === 0 && questions.length > 0 && !loading && !submissionResult && !isProctoringBlocked) handleNext();
    }, [questionTimeLeft, isVideoSection, showVideoPrepScreen, questions.length, loading, handleNext, isProctoringBlocked, submissionResult]);

    useEffect(() => {
        if (!isVideoSection || showVideoPrepScreen || videoCompleted || !currentVideoDeadlineAt || submissionResult || isProctoringBlocked) return;

        const updateVideoCountdown = () => {
            const remainingMs = Math.max(0, currentVideoDeadlineAt - Date.now());
            setCurrentVideoTimeLeft(Math.ceil(remainingMs / 1000));
        };

        updateVideoCountdown();
        const timer = setInterval(updateVideoCountdown, 250);
        return () => clearInterval(timer);
    }, [isVideoSection, showVideoPrepScreen, videoCompleted, currentVideoDeadlineAt, isProctoringBlocked, submissionResult]);

    useEffect(() => {
        if (!hasStartedAssessmentRef.current && !showVideoPrepScreen && !isVideoSection) return;

        const handlePopState = () => {
            window.history.pushState(null, '', window.location.href);
        };

        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [showVideoPrepScreen, isVideoSection]);

    // Snapshot loop for both MCQ and video sections.
    useEffect(() => {
        if (loading || submissionResult || !session?.id || proctoringSuspended || isProctoringBlocked) return undefined;
        const cadenceMs = withSnapshotJitter(getAdaptiveSnapshotCadenceMs());
        setSnapshotDebugTelemetry(prev => ({ ...prev, snapshotCadenceMs: cadenceMs }));

        const timerId = setInterval(() => {
            captureAndAnalyzeSnapshot();
        }, cadenceMs);

        return () => clearInterval(timerId);
    }, [isVideoSection, loading, proctoringSuspended, isProctoringBlocked, submissionResult, session?.id, getAdaptiveSnapshotCadenceMs, setSnapshotDebugTelemetry]);

    const captureAndAnalyzeSnapshot = async () => {
        if (proctoringSuspended) return;
        if (isProctoringBlocked) return;
        if (snapshotCaptureInFlightRef.current) return;
        const imageSrcFromMcq = webcamRef.current?.getScreenshot?.() || null;
        const imageSrcFromVideo = typeof videoSnapshotGetterRef.current === 'function'
            ? videoSnapshotGetterRef.current()
            : null;
        const imageSrc = imageSrcFromMcq || imageSrcFromVideo;
        if (!imageSrc) return;
        snapshotCaptureInFlightRef.current = true;
        const startedAt = Date.now();

        let blob = null;
        try {
            // Convert base64 to blob
            const fetched = await fetch(imageSrc);
            blob = await fetched.blob();
        } catch (err) {
            console.error('Snapshot capture failed:', err);
            setSnapshotDebugTelemetry(prev => ({
                ...prev,
                lastSnapshotStatus: 'capture_error',
                lastSnapshotDurationMs: Date.now() - startedAt,
                lastError: err?.message || 'Snapshot capture failed',
            }));
            snapshotCaptureInFlightRef.current = false;
            return;
        }

        if (!blob || blob.size < 1) {
            setSnapshotDebugTelemetry(prev => ({
                ...prev,
                lastSnapshotStatus: 'skipped_empty_frame',
                lastSnapshotDurationMs: Date.now() - startedAt,
                lastError: null,
            }));
            snapshotCaptureInFlightRef.current = false;
            return;
        }

        // Backward-compatible snapshot metadata contract (Task 2)
        if (!analyserRef.current && !proctoringSuspended) {
            await initAudioDetector();
        }
        const audioSignal = getAudioSignal();
        const visualSignal = await getVisualTelemetry(blob);
        const audioDetected = audioSignal.detected;
        const gazeViolation = visualSignal.gazeViolation;
        const fullscreenState = !!document.fullscreenElement;
        const clientTimestamp = new Date().toISOString();
        const snapshotId = buildSnapshotId();

        const snapshotItem = {
            snapshot_id: snapshotId,
            session_id: session.id,
            created_at: clientTimestamp,
            queued_at: clientTimestamp,
            next_attempt_at: clientTimestamp,
            image_blob: blob,
            audio_detected: audioDetected,
            audio_level: audioSignal.level,
            audio_threshold: audioSignal.threshold,
            gaze_violation: gazeViolation,
            pose_yaw: visualSignal.poseYaw,
            pose_pitch: visualSignal.posePitch,
            pose_roll: visualSignal.poseRoll,
            mouth_state: visualSignal.mouthState || 'unknown',
            label_detection_results: visualSignal.labelDetectionResults || [],
            fullscreen_state: fullscreenState,
            client_timestamp: clientTimestamp,
            detector_status: visualSignal.detectorStatus,
            webcam_status: webcamStatus,
            mic_status: debugTelemetry.micStatus,
            retries: 0,
            last_error: null,
        };
        setSnapshotRecordedCount(prev => prev + 1);

        setSnapshotDebugTelemetry(prev => ({
            ...prev,
            lastClientTimestamp: clientTimestamp,
            audioDetected,
            audioLevel: audioSignal.level,
            detectorStatus: visualSignal.detectorStatus,
            gazeViolation,
            poseYaw: visualSignal.poseYaw,
            posePitch: visualSignal.posePitch,
            poseRoll: visualSignal.poseRoll,
            mouthState: visualSignal.mouthState || 'unknown',
            labelCount: (visualSignal.labelDetectionResults || []).length,
            fullscreenState,
            lastSnapshotStatus: 'sending',
            lastReason: null,
            lastError: null,
        }));

        // DEV-only: upload short audio clips when audio is detected so admin can review proctoring telemetry.
        // This is best-effort and should never block snapshot uploads or the candidate flow.
        maybeCaptureAndUploadAudioClip({
            snapshotId,
            audioLevel: audioSignal.level,
            audioDetected,
            clientTimestamp,
        });

        if (navigator?.onLine === false) {
            await enqueueSnapshotUpload(snapshotItem, {
                next_attempt_at: new Date().toISOString(),
                last_error: 'Queued while offline',
            });
            setSnapshotDebugTelemetry(prev => ({
                ...prev,
                lastSnapshotStatus: 'queued_offline',
                lastSnapshotDurationMs: Date.now() - startedAt,
                lastError: 'Offline: snapshot queued for background upload.',
            }));
            snapshotCaptureInFlightRef.current = false;
            return;
        }

        try {
            await sendSnapshotToBackend(snapshotItem, startedAt);
        } catch (err) {
            if (handleProctoringSessionInactive(err)) {
                snapshotCaptureInFlightRef.current = false;
                return;
            }
            const retryable = isRetryableSnapshotError(err);
            if (retryable) {
                await enqueueSnapshotUpload(snapshotItem, {
                    next_attempt_at: new Date().toISOString(),
                    last_error: err?.response?.data?.error || err?.message || 'Network retry queued',
                });
                setSnapshotDebugTelemetry(prev => ({
                    ...prev,
                    lastSnapshotStatus: 'queued',
                    lastSnapshotDurationMs: Date.now() - startedAt,
                    lastError: 'Network unstable. Snapshot queued for retry.',
                }));
                drainSnapshotUploadQueue();
                lastSnapshotDurationRef.current = Date.now() - startedAt;
                snapshotCaptureInFlightRef.current = false;
                return;
            }
            console.error("Proctoring Error:", err);
            setSnapshotDebugTelemetry(prev => ({
                ...prev,
                lastSnapshotStatus: 'error',
                lastSnapshotDurationMs: Date.now() - startedAt,
                lastError: err?.response?.data?.error || err?.message || 'Snapshot request failed',
            }));
            lastSnapshotDurationRef.current = Date.now() - startedAt;
        } finally {
            snapshotCaptureInFlightRef.current = false;
        }
    };

    const handleTermination = () => {
        setShowWarningModal(false);
        if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
        if (fullscreenGraceTimerRef.current) clearTimeout(fullscreenGraceTimerRef.current);
        if (session?.id) {
            saveMcqProgress(session.id, { answers }).catch((err) => {
                if (isSessionExpiredError(err)) {
                    redirectToCategoryReselect(err);
                }
            });
        }
        handleSubmitTest();
    };

    // MCQ autosave: persist score/answers after each answer change (debounced).
    useEffect(() => {
        if (!session?.id) return;
        if (loading || isVideoSection || submissionResult) return;
        if (!questions || questions.length === 0) return;

        const payload = JSON.stringify(answers || {});
        if (payload === mcqAutosaveLastPayloadRef.current) return;

        if (mcqAutosaveTimerRef.current) clearTimeout(mcqAutosaveTimerRef.current);
        mcqAutosaveTimerRef.current = setTimeout(() => {
            mcqAutosaveLastPayloadRef.current = payload;
            saveMcqProgress(session.id, { answers }).catch(err => {
                if (isSessionExpiredError(err)) {
                    redirectToCategoryReselect(err);
                    return;
                }
                console.error('MCQ autosave failed:', err);
            });
        }, 600);

        return () => {
            if (mcqAutosaveTimerRef.current) clearTimeout(mcqAutosaveTimerRef.current);
        };
    }, [answers, session?.id, loading, isVideoSection, submissionResult, questions?.length, isSessionExpiredError, redirectToCategoryReselect]);

    // Client-side Proctoring (Tab switch, etc.)
    useEffect(() => {
        const onVisChange = () => {
            if (document.hidden || document.visibilityState === 'hidden') {
                triggerViolation('Tab switch / app switch detected', 'tab');
            }
        };
        const onWindowBlur = () => {
            if (!hasStartedAssessmentRef.current || submissionResult) return;
            triggerViolation('Window focus lost (possible Alt-Tab)', 'tab');
        };
        const onFsChange = () => {
            const isNowFullScreen = !!document.fullscreenElement;
            setIsFullScreen(isNowFullScreen);

            if (isNowFullScreen) {
                hasStartedAssessmentRef.current = true;
                if (fullscreenGraceTimerRef.current) {
                    clearTimeout(fullscreenGraceTimerRef.current);
                    fullscreenGraceTimerRef.current = null;
                }
                return;
            }

            if (!hasStartedAssessmentRef.current || submissionResult) return;

            const graceMs = Math.max(
                0,
                Number(proctoringPolicy.FULLSCREEN_REENTRY_GRACE_SECONDS || 0) * 1000
            );

            if (fullscreenGraceTimerRef.current) {
                clearTimeout(fullscreenGraceTimerRef.current);
                fullscreenGraceTimerRef.current = null;
            }

            fullscreenGraceTimerRef.current = setTimeout(() => {
                if (!document.fullscreenElement && !submissionResult) {
                    triggerViolation('Exited fullscreen mode', 'fullscreen');
                }
            }, graceMs);
        };
        const prevent = (e) => { e.preventDefault(); return false; };
        const onKey = (e) => {
            const k = String(e.key || '');
            const key = k.toLowerCase();
            const isCtrlLike = e.ctrlKey || e.metaKey; // metaKey for macOS

            // Block function keys (best-effort; some may be reserved by the browser/OS).
            if (/^f([1-9]|1[0-2])$/i.test(k)) {
                e.preventDefault();
                return false;
            }

            // DevTools / view-source / common navigation shortcuts (best-effort).
            const isTab = key === 'tab' || e.code === 'Tab';
            const forbidden =
                // DevTools
                (isCtrlLike && e.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) ||
                // View source / save / print / open / new tab/window / close / refresh / address bar
                (isCtrlLike && ['u', 's', 'p', 'o', 'n', 'w', 'r', 'l', 't'].includes(key)) ||
                // Tab switching
                (isCtrlLike && isTab) ||
                (isCtrlLike && e.shiftKey && (isTab || key === 'r')) ||
                // Back/forward
                (e.altKey && (key === 'arrowleft' || key === 'arrowright' || isTab)) ||
                // Refresh keys
                key === 'f5' ||
                // Print screen (not consistently capturable across browsers)
                key === 'printscreen';

            // Best-effort: browsers/OS may still override some shortcuts (e.g. Alt+Tab cannot be blocked).
            if (forbidden) {
                e.preventDefault();
                triggerViolation('Forbidden shortcut attempted', 'tab');
                return false;
            }
        };
        document.addEventListener('visibilitychange', onVisChange);
        document.addEventListener('fullscreenchange', onFsChange);
        window.addEventListener('blur', onWindowBlur);
        document.addEventListener('contextmenu', prevent, true);
        document.addEventListener('copy', prevent, true);
        document.addEventListener('paste', prevent, true);
        document.addEventListener('cut', prevent, true);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('visibilitychange', onVisChange);
            document.removeEventListener('fullscreenchange', onFsChange);
            window.removeEventListener('blur', onWindowBlur);
            document.removeEventListener('contextmenu', prevent, true);
            document.removeEventListener('copy', prevent, true);
            document.removeEventListener('paste', prevent, true);
            document.removeEventListener('cut', prevent, true);
            document.removeEventListener('keydown', onKey, true);
            if (fullscreenGraceTimerRef.current) clearTimeout(fullscreenGraceTimerRef.current);
            if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
        };
    }, [proctoringPolicy.FULLSCREEN_REENTRY_GRACE_SECONDS, submissionResult]);

    const triggerViolation = async (reason = 'Tab switch', type = 'tab') => {
        const now = Date.now();
        if (now - lastViolationTime.current < 2000) return;
        lastViolationTime.current = now;

        // We only log client-side violations here (tab/fullscreen). 
        // Snapshot violations are logged by the server.
        if (session?.id && (type === 'tab' || type === 'fullscreen')) {
            try {
                const violationType = type === 'fullscreen' ? 'fullscreen_exit' : 'tab_switch';
                const res = await logViolation(session.id, { violation_type: violationType });
                applyBackendViolationMeta(res);
                if (res.status === 'terminated') {
                    handleTermination();
                } else if (res.status === 'warning') {
                    setViolationMessage(res.reason || reason);
                    setShowWarningModal(true);
                }
            } catch (error) {
                console.error('Failed to log violation:', error);
            }
        }
    };

    const enterFullScreen = () => {
        document.documentElement.requestFullscreen().catch(console.error);
        hasStartedAssessmentRef.current = true;
        if (fullscreenGraceTimerRef.current) {
            clearTimeout(fullscreenGraceTimerRef.current);
            fullscreenGraceTimerRef.current = null;
        }
        setIsFullScreen(true);
    };

    const handleAnswer = (optionKey) => {
        if (isProctoringBlocked) return;
        setAnswers(prev => {
            const nextAnswers = { ...prev, [questions[currentQuestionIndex].id]: optionKey };
            if (session?.id) {
                saveAnswersLocally(session.id, nextAnswers).catch(err => {
                    console.error("Local sync error", err);
                });
            }
            return nextAnswers;
        });
    };

    const handleSubmitTest = async () => {
        try {
            setIsSubmitting(true);
            setSubmitStatusText('Finalizing uploads…');
            if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current); // Stop snapshots

            // Give background video uploads a chance to finish before final submission.
            drainVideoUploadQueue();
            drainSnapshotUploadQueue();
            await waitForVideoUploadsToFinish(30000);
            await waitForSnapshotUploadsToFinish(12000);

            // Exit fullscreen and wait for it to complete
            if (document.fullscreenElement) {
                try {
                    await document.exitFullscreen();
                } catch { /* ignore */ }
                // Small delay to ensure browser finishes exiting fullscreen
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            setSubmitStatusText('Submitting answers…');
            await submitTest(session.id, { answers });
            
            if (session?.id) {
                await clearAnswersLocally(session.id);
            }
            
            navigate('/success', {
                state: { assessment_submitted: true }
            });
        } catch (err) {
            if (isSessionExpiredError(err)) {
                redirectToCategoryReselect(err);
                return;
            }
            console.error('Failed to submit test:', err);
            alert('Submission failed. Please try again.');
            setIsSubmitting(false);
        }
    };

    const handleVideoComplete = useCallback((uploadPayload) => {
        if (uploadPayload?.blob && uploadPayload?.questionId) {
            void enqueueVideoUpload(uploadPayload);
        }

        if (currentVideoQuestionIndex < videoQuestions.length - 1) {
            setCurrentVideoQuestionIndex(prev => prev + 1);
            setCurrentVideoDeadlineAt(null);
            setCurrentVideoTimeLeft(VIDEO_QUESTION_TIME_SECONDS);
        } else {
            setVideoCompleted(true);
            setCurrentVideoDeadlineAt(null);
            handleSubmitTest();
        }
    }, [currentVideoQuestionIndex, videoQuestions.length, enqueueVideoUpload, handleSubmitTest]);

    const handleVideoRecordingStart = useCallback(() => {
        if (currentVideoDeadlineAt) return;
        startVideoQuestion();
    }, [currentVideoDeadlineAt, startVideoQuestion]);

    // --- Styles ---
    const s = {
        page: { minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", userSelect: 'none' },
        center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: "'Inter', system-ui, sans-serif", padding: 32 },
        card: { background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '48px 40px', maxWidth: 500, width: '100%', textAlign: 'center' },
        header: { position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: '#0d1b2a', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', color: '#f8fafc', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' },
        btnPrimary: { padding: '14px 32px', borderRadius: 10, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', background: '#059669', color: '#fff' },
        btnDanger: { padding: '14px 32px', borderRadius: 10, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff', width: '100%' },
        webcamContainer: { position: 'fixed', bottom: 20, right: 20, width: 140, height: 105, background: '#000', borderRadius: 8, overflow: 'hidden', zIndex: 50, border: '2px solid #fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }
    };

    if (loading || !session) {
        return (
            <div style={s.center}>
                <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    const showInitialFullscreenPrompt = !isFullScreen && !hasStartedAssessmentRef.current && !submissionResult && !isSubmitting;
    const showFullscreenOverlay = !isFullScreen && hasStartedAssessmentRef.current && !submissionResult && !isSubmitting;

    // Fullscreen prompt
    if (showInitialFullscreenPrompt) {
        return (
            <div style={s.center}>
                <div style={s.card}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🖥️</div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Fullscreen Required</h1>
                    <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
                        This assessment must be taken in fullscreen mode.
                    </p>
                    <button className="tp-btn" onClick={enterFullScreen} style={s.btnPrimary}>🖥️ Enter Fullscreen & Begin</button>
                </div>
            </div>
        );
    }

    const progressPct = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
    const permissionIssues = [];
    if (webcamStatus === 'denied') permissionIssues.push('Camera permission denied');
    else if (webcamStatus === 'unsupported') permissionIssues.push('Camera not supported');
    else if (webcamStatus === 'unavailable') permissionIssues.push('Camera device not found');
    if (debugTelemetry.micStatus === 'denied') permissionIssues.push('Microphone permission denied');
    else if (debugTelemetry.micStatus === 'unsupported') permissionIssues.push('Microphone not supported');
    else if (debugTelemetry.micStatus === 'unavailable') permissionIssues.push('Microphone device not found');
    if (SHOW_DETECTOR_FALLBACK_NOTICE && debugTelemetry.detectorStatus === 'server_fallback') {
        permissionIssues.push('Face detector unsupported: using server fallback');
    }
    if (SHOW_DETECTOR_FALLBACK_NOTICE && debugTelemetry.detectorStatus === 'error') {
        permissionIssues.push('Face detector error: fallback active');
    }

    const showEyeTrackingFallbackNotice =
        import.meta.env.DEV
        && EYE_TRACKING_ENABLED
        && String(debugTelemetry.detectorStatus || '').startsWith('eye_tracking_')
        && debugTelemetry.detectorStatus !== 'eye_tracking_ready';

    const topContentOffset = 56
        + (sessionRecoveryNotice ? 38 : 0)
        + (permissionIssues.length > 0 ? 38 : 0)
        + (showEyeTrackingFallbackNotice ? 38 : 0);

    return (
        <div className="tp-page" style={s.page} onContextMenu={e => e.preventDefault()} onCopy={e => e.preventDefault()} onCut={e => e.preventDefault()} onPaste={e => e.preventDefault()}>

            {isSubmitting && (
                <div
                    className="animate-fade-in"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 80,
                        background: 'rgba(15,23,42,0.55)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <div
                        className="animate-fade-in-up"
                        style={{
                            width: '100%',
                            maxWidth: 520,
                            background: '#ffffff',
                            borderRadius: 16,
                            border: '1px solid #e5e7eb',
                            padding: '28px 24px',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                border: '4px solid #e5e7eb',
                                borderTopColor: '#059669',
                                animation: 'spin 1s linear infinite',
                            }} />
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Submitting</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                            {submitStatusText}
                        </div>
                        <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
                            Please don’t close this tab.
                        </div>
                    </div>
                </div>
            )}

            {/* Warning Modal */}
            {showWarningModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%', margin: 16, textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Proctoring Warning</h2>
                        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>{violationMessage || 'Violation detected.'}</p>
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', fontSize: 16, fontWeight: 700, color: '#dc2626', marginBottom: 20 }}>
                            {lastViolationType
                                ? `${violationTypeLabel(lastViolationType)} violations: ${lastViolationTypeCount}`
                                : `Total violations: ${serverViolationCount}`}
                        </div>
                        <button className="tp-btn" onClick={() => setShowWarningModal(false)} style={s.btnDanger}>I Understand & Resume</button>
                    </div>
                </div>
            )}

            {permissionIssues.length > 0 && !submissionResult && (
                <div style={{
                    position: 'fixed',
                    top: 56,
                    left: 0,
                    right: 0,
                    zIndex: 45,
                    background: '#fff7ed',
                    color: '#9a3412',
                    borderBottom: '1px solid #fed7aa',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {permissionIssues.join(' | ')}
                    </div>
                    <button
                        className="tp-btn"
                        onClick={handleRetryMediaPermissions}
                        disabled={permissionRetrying}
                        style={{
                            border: '1px solid #fdba74',
                            background: permissionRetrying ? '#ffedd5' : '#fff',
                            color: '#9a3412',
                            borderRadius: 8,
                            padding: '5px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: permissionRetrying ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {permissionRetrying ? 'Retrying...' : 'Retry permissions'}
                    </button>
                </div>
            )}

            {showEyeTrackingFallbackNotice && !submissionResult && (
                <div style={{
                    position: 'fixed',
                    top: 56 + (permissionIssues.length > 0 ? 38 : 0),
                    left: 0,
                    right: 0,
                    zIndex: 44,
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    borderBottom: '1px solid #bfdbfe',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                    fontWeight: 600,
                }}>
                    <span style={{ fontSize: 16 }}>🧪</span>
                    <span>Dev: Your device/browser can’t run eye tracking; continuing with standard proctoring.</span>
                </div>
            )}

            {/* Webcam (always active during MCQ, except when submitted) */}
            {!isVideoSection && !showVideoPrepScreen && !submissionResult && (
                <div style={s.webcamContainer}>
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={1}
                        videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onUserMedia={() => {
                            setWebcamStatus('ready');
                            setDebugTelemetry(prev => ({ ...prev, lastError: null }));
                        }}
                        onUserMediaError={(err) => {
                            console.error('Webcam error:', err);
                            const errorName = String(err?.name || '').toLowerCase();
                            if (errorName.includes('notallowed') || errorName.includes('permission')) {
                                setWebcamStatus('denied');
                            } else if (errorName.includes('notfound') || errorName.includes('devicesnotfound')) {
                                setWebcamStatus('unavailable');
                            } else {
                                setWebcamStatus('error');
                            }
                            setDebugTelemetry(prev => ({ ...prev, lastError: err?.message || 'Webcam error' }));
                        }}
                    />
                </div>
            )}

            {/* Header */}
            <header style={s.header}>
                <div style={{ maxWidth: 1500, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <BrandLogo />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* MCQ timer only - video timer is inside VideoQuestion */}
                    {!isVideoSection && !showVideoPrepScreen && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>Time</span>
                            <span style={{
                                fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
                                color: questionTimeLeft < 10 ? '#f87171' : '#f8fafc',
                            }}>
                                {String(questionTimeLeft).padStart(2, '0')}s
                            </span>
                        </div>
                    )}
                    <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '5px 12px',
                        borderRadius: 20,
                        background: isOnline ? '#ecfdf5' : '#fff7ed',
                        color: isOnline ? '#065f46' : '#9a3412',
                        border: isOnline ? '1px solid #86efac' : '1px solid #fdba74'
                    }}>
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                    {serverViolationCount > 0 && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            {serverViolationCount > 0 && (
                                <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74' }}>Violations: {serverViolationCount}
                                </span>
                            )}
                            {Object.entries(serverViolationCounters)
                                .filter(([, count]) => Number(count) > 0)
                                .map(([vType, count]) => (
                                    <span key={`server-${vType}`} style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                        {violationTypeLabel(vType)}: {count}
                                    </span>
                                ))}
                        </div>
                    )}
                    </div>
                </div>
            </header>

            {/* Progress bar */}
            {!isVideoSection && !showVideoPrepScreen && questions.length > 0 && (
                <div style={{ position: 'fixed', top: topContentOffset, left: 0, right: 0, height: 4, background: '#e5e7eb', zIndex: 30 }}>
                    <div style={{ height: '100%', background: '#059669', transition: 'width 0.5s ease', width: `${progressPct}%` }}></div>
                </div>
            )}

            {showFullscreenOverlay && (
                <div style={{
                    position: 'fixed',
                    top: topContentOffset,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.76)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 70,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: 540,
                        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                        borderRadius: 24,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 24px 80px rgba(15,23,42,0.26)',
                        padding: '34px 30px',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: 76,
                            height: 76,
                            margin: '0 auto 18px',
                            borderRadius: 24,
                            background: 'linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 34,
                        }}>
                            ⛶
                        </div>
                        <h2 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
                            Return to fullscreen
                        </h2>
                        <p style={{ margin: '0 auto 18px', maxWidth: 420, fontSize: 15, lineHeight: 1.7, color: '#475569' }}>
                            This assessment is still active. Re-enter fullscreen immediately to continue.
                        </p>
                        <button className="tp-btn" onClick={enterFullScreen} style={{ ...s.btnPrimary, width: '100%', marginBottom: 12 }}>
                            Re-enter fullscreen
                        </button>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                            Leaving fullscreen may still be logged as a violation.
                        </p>
                    </div>
                </div>
            )}

            {sessionRecoveryNotice && (
                <div style={{
                    position: 'fixed',
                    top: 60,
                    left: 0,
                    right: 0,
                    zIndex: 35,
                    background: '#ecfdf5',
                    color: '#065f46',
                    borderBottom: '1px solid #bbf7d0',
                    padding: '8px 24px',
                    fontSize: 13,
                    fontWeight: 700,
                }}>
                    {sessionRecoveryNotice}
                </div>
            )}

            {isProctoringBlocked && !submissionResult && !isSubmitting && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.62)',
                    backdropFilter: 'blur(9px)',
                    zIndex: 75,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: 620,
                        background: '#ffffff',
                        borderRadius: 18,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 28px 80px rgba(15,23,42,0.28)',
                        padding: '28px 24px',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>Warning</div>
                        <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
                            Assessment paused
                        </h2>
                        <p style={{ margin: '0 0 8px', fontSize: 15, lineHeight: 1.65, color: '#334155' }}>
                            Proctoring connection lost. Please check your camera and internet connection. The test has been paused.
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                            Auto-resume will start once queued proctoring snapshots fall below {MAX_SILENT_FAILURES}.
                        </p>
                    </div>
                </div>
            )}

            {/* Main content */}
            <main style={{ flex: 1, marginTop: topContentOffset, padding: '40px 24px', maxWidth: showVideoPrepScreen ? 1300 : 920, margin: `${topContentOffset}px auto 0`, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: `calc(100vh - ${topContentOffset}px)` }}>

                {/* MCQ Section */}
                {!isVideoSection && !showVideoPrepScreen && questions.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '32px 28px' }}>
                        <TestQuestion
                            question={questions[currentQuestionIndex]}
                            questionIndex={currentQuestionIndex}
                            totalQuestions={questions.length}
                            onSelectAnswer={handleAnswer}
                            selectedAnswer={answers[questions[currentQuestionIndex]?.id]}
                        />
                        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                className="tp-btn"
                                onClick={handleNext}
                                disabled={isProctoringBlocked}
                                style={{
                                    ...s.btnPrimary,
                                    opacity: isProctoringBlocked ? 0.6 : 1,
                                    cursor: isProctoringBlocked ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {currentQuestionIndex === questions.length - 1 ? 'Proceed to Video' : 'Next Question'}
                            </button>
                        </div>
                    </div>
                )}

                {showVideoPrepScreen && videoQuestions.length > 0 && (
                    <section style={{ width: '100%' }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b' }}>
                            Video assessment ahead
                        </p>
                        <h1 style={{ margin: '12px 0 10px', fontSize: 34, lineHeight: 1.1, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
                            Prepare for the video assessment
                        </h1>
                        <p style={{ margin: 0, maxWidth: 900, fontSize: 16, lineHeight: 1.75, color: '#475569' }}>
                            Your MCQ section is complete. Next, you will answer {videoQuestions.length} video question{videoQuestions.length > 1 ? 's' : ''} using your camera and microphone.
                            Make sure your setup is fully ready before you continue.
                        </p>

                        <div style={{ marginTop: 20, borderTop: '1px solid #e2e8f0' }} />

                        <h3 style={{ margin: '22px 0 12px', fontSize: 16, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Before you start
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', columnGap: 42, rowGap: 0 }}>
                            {[
                                ['Use earphones or a headset', 'Clearer audio makes your response easier to review and reduces echo.'],
                                ['Sit in a quiet environment', 'Avoid background voices, fan noise, traffic, or interruptions.'],
                                ['Keep your face clearly visible', 'Stay centered in the frame with your head and shoulders in view.'],
                                ['Use front lighting', 'Face the light source so your expressions and eye contact stay visible.'],
                                ['Speak clearly and answer to the point', 'Think for a second, then respond in a structured way.'],
                                ['Stay in fullscreen throughout', 'Keep the assessment open and uninterrupted while you answer.'],
                            ].map(([title, text]) => (
                                <div key={title} style={{ padding: '14px 0', borderBottom: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.45 }}>{title}</p>
                                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#64748b' }}>{text}</p>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 26, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button className="tp-btn" onClick={beginVideoAssessment} style={{ ...s.btnPrimary, minWidth: 390 }}>
                                <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#fff',letterSpacing: '0.08em' }}>
                               Start video assessment</p>
                            </button>
                        </div>
                    </section>
                )}

                {/* Video Section*/}
                {isVideoSection && !videoCompleted && videoQuestions.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: '32px 28px' }}>
                        <VideoQuestion
                            key={`video-${currentVideoQuestionIndex}`}
                            question={videoQuestions[currentVideoQuestionIndex]}
                            questionIndex={currentVideoQuestionIndex}
                            totalVideoQuestions={videoQuestions.length}
                            registerSnapshotGetter={(getter) => { videoSnapshotGetterRef.current = getter; }}
                            onRecordingStarted={handleVideoRecordingStart}
                            onVideoUploaded={handleVideoComplete}
                            timeLeft={currentVideoTimeLeft}
                            totalTime={VIDEO_QUESTION_TIME_SECONDS}
                        />
                    </div>
                )}

                {isVideoSection && videoCompleted && (
                    <div style={{ ...s.card, margin: '0 auto' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Video section completed</h2>
                        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 0 }}>
                            {isSubmitting ? submitStatusText : 'Submitting your assessment…'}
                        </p>
                    </div>
                )}

                {/* No video questions → submit */}
                {isVideoSection && videoQuestions.length === 0 && !submissionResult && (
                    <div style={{ ...s.card, margin: '0 auto' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📤</div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Review & Submit</h2>
                        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>All questions completed. Ready to submit.</p>
                        <button className="tp-btn" onClick={handleSubmitTest} style={s.btnPrimary}>Submit Assessment</button>
                    </div>
                )}

                {/* No MCQs */}
                {!isVideoSection && !showVideoPrepScreen && questions.length === 0 && (
                    <div style={{ ...s.card, margin: '0 auto' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>No Questions Available</h2>
                        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>No MCQ questions for the selected domains.</p>
                        {videoQuestions.length > 0 && (
                            <button className="tp-btn" onClick={openVideoPrepScreen} style={s.btnPrimary}>
                                Proceed to Video Questions
                            </button>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default TestEngine;



