import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Webcam from 'react-webcam';
import { normalizeAssessmentDomainLabel } from './domainLabels';

const TOTAL_TIME = 120; // 2 min 00 sec
const START_RECORDING_SPEECH_RMS_THRESHOLD = 0.04;
const START_RECORDING_SPEECH_MIN_FRAMES = 4;
const RECORDING_SPEECH_RMS_THRESHOLD = 0.03;
const RECORDING_SPEECH_MIN_FRAMES = 4;
const NO_VOICE_PROMPT_AFTER_MS = 5000;

export default function VideoQuestion({
    question,
    onVideoUploaded,
    onRecordingStarted,
    questionIndex,
    totalVideoQuestions,
    registerSnapshotGetter,
    timeLeft = TOTAL_TIME,
    totalTime = TOTAL_TIME,
}) {
    const webcamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const autoSubmitRef = useRef(false);
    const timeExpiryHandledRef = useRef(false);
    const recordingStartedAtRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioSourceRef = useRef(null);
    const audioAnalyserRef = useRef(null);
    const audioDataArrayRef = useRef(null);
    const speechFramesRef = useRef(0);
    const startReminderShownRef = useRef(false);
    const recordingSpeechFramesRef = useRef(0);
    const recordingVoiceDetectedRef = useRef(false);
    const recordingMonitorStartedAtRef = useRef(0);
    const noVoicePromptShownRef = useRef(false);
    const discardCurrentRecordingRef = useRef(false);

    const [recording, setRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploaded, setUploaded] = useState(false);
    const [error, setError] = useState('');
    const [hasStartedRecording, setHasStartedRecording] = useState(false);
    const [showStartRecordingPrompt, setShowStartRecordingPrompt] = useState(false);
    const [showEnableMicPrompt, setShowEnableMicPrompt] = useState(false);
    const [micLevel, setMicLevel] = useState(0);
    const categoryLabel = useMemo(() => {
        const raw = String(question?.category || '').trim();
        if (raw) return raw;
        if (question?.type === 'introduction') return 'Introduction';
        return normalizeAssessmentDomainLabel(question?.domain);
    }, [question?.category, question?.domain, question?.type]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setRecording(false);
    }, []);

    const teardownSpeechMonitor = useCallback(() => {
        speechFramesRef.current = 0;
        audioAnalyserRef.current = null;
        audioDataArrayRef.current = null;
        audioSourceRef.current = null;
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
    }, []);

    useEffect(() => {
        timeExpiryHandledRef.current = false;
        autoSubmitRef.current = false;
        recordingStartedAtRef.current = null;
        setRecording(false);
        setRecordedBlob(null);
        setPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setUploaded(false);
        setError('');
        setHasStartedRecording(false);
        setShowStartRecordingPrompt(false);
        setShowEnableMicPrompt(false);
        setMicLevel(0);
        startReminderShownRef.current = false;
        recordingSpeechFramesRef.current = 0;
        recordingVoiceDetectedRef.current = false;
        recordingMonitorStartedAtRef.current = 0;
        noVoicePromptShownRef.current = false;
        discardCurrentRecordingRef.current = false;
        chunksRef.current = [];
        teardownSpeechMonitor();
    }, [question?.id, teardownSpeechMonitor]);

    const handleQueueAndAdvance = useCallback((blob) => {
        const uploadBlob = blob || recordedBlob;
        if (!uploadBlob) return;

        setError('');
        setUploaded(true);

        setTimeout(() => {
            const startedAtMs = Number(recordingStartedAtRef.current || 0);
            const durationSeconds = startedAtMs > 0
                ? Math.max(0, (Date.now() - startedAtMs) / 1000)
                : null;
            onVideoUploaded && onVideoUploaded({
                questionId: question.id,
                questionText: question.question || question.text || '',
                blob: uploadBlob,
                fileName: `video_${question.id}.webm`,
                durationSeconds,
            });
        }, 250);
    }, [recordedBlob, onVideoUploaded, question.id, question.question, question.text]);

    useEffect(() => {
        if (timeLeft > 0 || timeExpiryHandledRef.current) return;
        timeExpiryHandledRef.current = true;

        if (hasStartedRecording && recording) {
            autoSubmitRef.current = true;
            setShowEnableMicPrompt(false);
            setTimeout(() => stopRecording(), 0);
        } else if (!hasStartedRecording) {
            onVideoUploaded && onVideoUploaded();
        }
    }, [timeLeft, hasStartedRecording, recording, stopRecording, onVideoUploaded]);

    useEffect(() => {
        if (autoSubmitRef.current && recordedBlob && !uploaded) {
            autoSubmitRef.current = false;
            setTimeout(() => handleQueueAndAdvance(recordedBlob), 0);
        }
    }, [recordedBlob, uploaded, handleQueueAndAdvance]);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
            teardownSpeechMonitor();
        };
    }, [preview, teardownSpeechMonitor]);

    useEffect(() => {
        if (!hasStartedRecording || recording) return;
        setShowStartRecordingPrompt(false);
        setShowEnableMicPrompt(false);
        teardownSpeechMonitor();
        setMicLevel(0);
    }, [hasStartedRecording, recording, teardownSpeechMonitor]);

    useEffect(() => {
        if (
            hasStartedRecording
            || recording
            || recordedBlob
            || uploaded
            || timeLeft <= 0
            || startReminderShownRef.current
        ) {
            return undefined;
        }

        let cancelled = false;

        const ensureSpeechDetector = async () => {
            if (audioAnalyserRef.current && audioDataArrayRef.current) return true;
            const stream = webcamRef.current?.video?.srcObject;
            if (!stream || !stream.getAudioTracks().some((track) => track.readyState === 'live' && track.enabled !== false)) {
                return false;
            }

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return false;

            try {
                const context = new AudioCtx();
                const source = context.createMediaStreamSource(stream);
                const analyser = context.createAnalyser();
                analyser.fftSize = 2048;
                source.connect(analyser);
                if (context.state === 'suspended') {
                    await context.resume().catch(() => { });
                }
                audioContextRef.current = context;
                audioSourceRef.current = source;
                audioAnalyserRef.current = analyser;
                audioDataArrayRef.current = new Uint8Array(analyser.fftSize);
                speechFramesRef.current = 0;
                return true;
            } catch {
                teardownSpeechMonitor();
                return false;
            }
        };

        const intervalId = setInterval(async () => {
            if (cancelled || startReminderShownRef.current) return;
            const initialized = await ensureSpeechDetector();
            if (!initialized) return;
            const analyser = audioAnalyserRef.current;
            const data = audioDataArrayRef.current;
            if (!analyser || !data) return;

            analyser.getByteTimeDomainData(data);
            let sumSquares = 0;
            for (let i = 0; i < data.length; i += 1) {
                const centered = (data[i] - 128) / 128;
                sumSquares += centered * centered;
            }
            const rms = Math.sqrt(sumSquares / data.length);
            if (rms >= START_RECORDING_SPEECH_RMS_THRESHOLD) {
                speechFramesRef.current += 1;
            } else {
                speechFramesRef.current = 0;
            }

            if (speechFramesRef.current >= START_RECORDING_SPEECH_MIN_FRAMES) {
                startReminderShownRef.current = true;
                setShowStartRecordingPrompt(true);
                teardownSpeechMonitor();
            }
        }, 350);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [hasStartedRecording, recording, recordedBlob, uploaded, timeLeft, question?.id, teardownSpeechMonitor]);

    useEffect(() => {
        if (typeof registerSnapshotGetter === 'function') {
            registerSnapshotGetter(() => {
                if (!recording) return null;
                return webcamRef.current?.getScreenshot?.() || null;
            });
            return () => registerSnapshotGetter(null);
        }
        return undefined;
    }, [registerSnapshotGetter, recording]);

    useEffect(() => {
        if (!recording) {
            setMicLevel(0);
            teardownSpeechMonitor();
            return undefined;
        }

        let cancelled = false;
        let intervalId = null;

        const ensureSpeechDetector = async () => {
            if (audioAnalyserRef.current && audioDataArrayRef.current) return true;
            const stream = webcamRef.current?.video?.srcObject;
            if (!stream || !stream.getAudioTracks().some((track) => track.readyState === 'live' && track.enabled !== false)) {
                return false;
            }

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return false;

            try {
                const context = new AudioCtx();
                const source = context.createMediaStreamSource(stream);
                const analyser = context.createAnalyser();
                analyser.fftSize = 2048;
                analyser.smoothingTimeConstant = 0.8;
                source.connect(analyser);
                if (context.state === 'suspended') {
                    await context.resume().catch(() => { });
                }
                audioContextRef.current = context;
                audioSourceRef.current = source;
                audioAnalyserRef.current = analyser;
                audioDataArrayRef.current = new Uint8Array(analyser.fftSize);
                return true;
            } catch {
                teardownSpeechMonitor();
                return false;
            }
        };

        const startMonitor = async () => {
            const initialized = await ensureSpeechDetector();
            if (!initialized || cancelled) return;

            intervalId = setInterval(() => {
                if (cancelled) return;
                const analyser = audioAnalyserRef.current;
                const data = audioDataArrayRef.current;
                if (!analyser || !data) return;

                analyser.getByteTimeDomainData(data);
                let sumSquares = 0;
                for (let i = 0; i < data.length; i += 1) {
                    const centered = (data[i] - 128) / 128;
                    sumSquares += centered * centered;
                }
                const rms = Math.sqrt(sumSquares / data.length);
                setMicLevel(Math.max(0, Math.min(1, rms * 8)));

                if (rms >= RECORDING_SPEECH_RMS_THRESHOLD) {
                    recordingSpeechFramesRef.current += 1;
                } else if (recordingSpeechFramesRef.current > 0) {
                    recordingSpeechFramesRef.current -= 1;
                }

                if (recordingSpeechFramesRef.current >= RECORDING_SPEECH_MIN_FRAMES) {
                    recordingVoiceDetectedRef.current = true;
                }

                const elapsed = Date.now() - Number(recordingMonitorStartedAtRef.current || Date.now());
                if (
                    elapsed >= NO_VOICE_PROMPT_AFTER_MS
                    && !recordingVoiceDetectedRef.current
                    && !noVoicePromptShownRef.current
                ) {
                    noVoicePromptShownRef.current = true;
                    setShowEnableMicPrompt(true);
                }
            }, 140);
        };

        startMonitor();

        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
            setMicLevel(0);
            teardownSpeechMonitor();
        };
    }, [recording, teardownSpeechMonitor]);

    const startRecording = useCallback(() => {
        chunksRef.current = [];
        discardCurrentRecordingRef.current = false;
        setRecordedBlob(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        setError('');
        setShowStartRecordingPrompt(false);
        setShowEnableMicPrompt(false);
        setMicLevel(0);
        recordingSpeechFramesRef.current = 0;
        recordingVoiceDetectedRef.current = false;
        recordingMonitorStartedAtRef.current = Date.now();
        noVoicePromptShownRef.current = false;

        const stream = webcamRef.current?.video?.srcObject;
        if (!stream) {
            setError('Cannot access camera. Please allow camera permissions.');
            return;
        }

        const hasLiveVideoTrack = stream.getVideoTracks().some(
            (track) => track.readyState === 'live' && track.enabled !== false
        );
        const hasLiveAudioTrack = stream.getAudioTracks().some(
            (track) => track.readyState === 'live' && track.enabled !== false
        );

        if (!hasLiveVideoTrack || !hasLiveAudioTrack) {
            setError('Both camera and microphone must be active to record a video answer.');
            return;
        }

        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
            if (discardCurrentRecordingRef.current) {
                discardCurrentRecordingRef.current = false;
                chunksRef.current = [];
                setRecordedBlob(null);
                setPreview((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return null;
                });
                return;
            }
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            setRecordedBlob(blob);
            setPreview(URL.createObjectURL(blob));
        };

        mediaRecorderRef.current = recorder;
        recordingStartedAtRef.current = Date.now();
        if (typeof onRecordingStarted === 'function') {
            onRecordingStarted();
        }
        recorder.start();
        setRecording(true);
        setHasStartedRecording(true);
    }, [preview, onRecordingStarted]);

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const safeTotalTime = Math.max(1, totalTime || TOTAL_TIME);
    const pct = ((safeTotalTime - Math.max(0, timeLeft)) / safeTotalTime) * 100;
    const isLow = timeLeft < 15;
    const timerShellStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        borderRadius: 18,
        border: `1px solid ${isLow ? '#fecaca' : '#bfdbfe'}`,
        background: isLow
            ? 'linear-gradient(135deg, rgba(255,245,245,0.98) 0%, rgba(254,226,226,0.98) 100%)'
            : 'linear-gradient(135deg, rgba(239,246,255,0.98) 0%, rgba(224,242,254,0.98) 52%, rgba(224,231,255,0.98) 100%)',
        boxShadow: isLow
            ? '0 10px 28px rgba(220,38,38,0.22), inset 0 1px 0 rgba(255,255,255,0.85)'
            : '0 12px 30px rgba(37,99,235,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
        minWidth: 132,
        justifyContent: 'center',
    };
    const recordingButtonStyle = {
        padding: '9px 12px',
        borderRadius: 10,
        fontWeight: 600,
        fontSize: 12,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flexShrink: 0,
    };

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '5px 14px', borderRadius: 20 }}>
                        Video {questionIndex + 1} / {totalVideoQuestions}
                    </span>
                    {categoryLabel && (
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                color: '#0f766e',
                                background: '#ecfeff',
                                border: '1px solid #99f6e4',
                                borderRadius: 999,
                                padding: '6px 10px',
                                textTransform: 'uppercase',
                                lineHeight: 1,
                                maxWidth: '100%',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {categoryLabel}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {!uploaded && !recording && !recordedBlob && timeLeft > 0 && (
                        <button
                            className="tp-btn"
                            onClick={startRecording}
                            style={{
                                ...recordingButtonStyle,
                                background: '#059669',
                                color: '#fff',
                            }}
                        >
                            Start Recording
                        </button>
                    )}

                    {!uploaded && recording && (
                        <button
                            className="tp-btn"
                            onClick={stopRecording}
                            style={{
                                ...recordingButtonStyle,
                                background: '#dc2626',
                                color: '#fff',
                            }}
                        >
                            Stop Recording
                        </button>
                    )}

                    {!uploaded && recordedBlob && !recording && timeLeft > 0 && (
                        <button
                            className="tp-btn"
                            onClick={() => {
                                setRecordedBlob(null);
                                if (preview) URL.revokeObjectURL(preview);
                                setPreview(null);
                            }}
                            style={{
                                ...recordingButtonStyle,
                                background: '#fff',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                            }}
                        >
                            Re-record
                        </button>
                    )}

                    {!uploaded && recordedBlob && !recording && (
                        <button
                            className="tp-btn"
                            onClick={() => handleQueueAndAdvance()}
                            style={{
                                ...recordingButtonStyle,
                                background: '#059669',
                                color: '#fff',
                            }}
                        >
                            Submit & Next
                        </button>
                    )}

                    <div style={timerShellStyle}>
                        <span
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: isLow ? '#dc2626' : '#2563eb',
                                boxShadow: isLow
                                    ? '0 0 0 5px rgba(220,38,38,0.16), 0 0 18px rgba(220,38,38,0.45)'
                                    : '0 0 0 5px rgba(37,99,235,0.12), 0 0 18px rgba(37,99,235,0.32)',
                                animation: 'pulse 1.4s infinite',
                                flexShrink: 0,
                            }}
                        />
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: isLow ? '#b91c1c' : '#1d4ed8' }}>
                            TIMER
                        </span>
                        <span
                            style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: 22,
                                letterSpacing: '0.04em',
                                color: isLow ? '#991b1b' : '#0f172a',
                                textShadow: isLow
                                    ? '0 0 14px rgba(220,38,38,0.18)'
                                    : '0 0 18px rgba(59,130,246,0.14)',
                            }}
                        >
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1.5, margin: '0 0 16px' }}>
                {question.question || question.text}
            </h2>

            <div style={{ background: '#111827', borderRadius: 12, overflow: 'hidden', position: 'relative', aspectRatio: '16/9', marginBottom: 8 }}>
                {uploaded ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>OK</div>
                        <p style={{ fontWeight: 600, color: '#059669', fontSize: 16 }}>Queued. Moving next...</p>
                    </div>
                ) : preview ? (
                    <video src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                ) : (
                    <>
                        {!recording && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                padding: '0 20px',
                                color: '#d1d5db',
                                fontSize: 25,
                                lineHeight: 1.5,
                            }}>
                                Camera preview will appear after you click Start Recording.
                            </div>
                        )}
                        <Webcam
                            audio={true}
                            muted={true}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: recording ? 'block' : 'none' }}
                            mirrored={true}
                        />
                        {recording && (
                            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 20 }}>
                                    <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', animation: 'pulse 1s infinite' }}></div>
                                    REC
                                </div>
                            </div>
                        )}
                        {recording && (
                            <div style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                minWidth: 160,
                                background: 'rgba(15, 23, 42, 0.74)',
                                border: '1px solid rgba(148, 163, 184, 0.26)',
                                borderRadius: 10,
                                padding: '8px 10px',
                                backdropFilter: 'blur(4px)',
                            }}>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#cbd5e1', marginBottom: 6 }}>
                                    MIC LEVEL
                                </div>
                                <div style={{ height: 8, borderRadius: 999, background: 'rgba(148,163,184,0.25)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.max(4, Math.round(micLevel * 100))}%`,
                                        transition: 'width 100ms linear',
                                        borderRadius: 999,
                                        background: micLevel > 0.18 ? '#22c55e' : '#f59e0b',
                                    }} />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: 2, transition: 'width 1s linear',
                    background: isLow ? '#dc2626' : '#059669',
                    width: `${pct}%`,
                }}></div>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
                Video answers require both camera and microphone to be active.
            </p>

            {error && <div style={{ marginBottom: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#dc2626' }}>{error}</div>}

            {showStartRecordingPrompt && !recording && !recordedBlob && timeLeft > 0 && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(17, 24, 39, 0.58)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: 16,
                }}>
                    <div style={{
                        width: 'min(92vw, 460px)',
                        background: '#fff',
                        borderRadius: 14,
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 22px 50px rgba(17, 24, 39, 0.3)',
                        padding: '18px 18px 16px',
                    }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#111827', fontWeight: 700 }}>
                            Start recording first
                        </h3>
                        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                            Please click Start Recording before answering, so your response is captured.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                className="tp-btn"
                                onClick={() => setShowStartRecordingPrompt(false)}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid #d1d5db',
                                    background: '#fff',
                                    color: '#374151',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Dismiss
                            </button>
                            <button
                                className="tp-btn"
                                onClick={startRecording}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: '#059669',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: 16,
                                    
                                }}
                            >
                                Start Recording
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEnableMicPrompt && recording && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(17, 24, 39, 0.58)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    padding: 16,
                }}>
                    <div style={{
                        width: 'min(92vw, 500px)',
                        background: '#fff',
                        borderRadius: 14,
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 22px 50px rgba(17, 24, 39, 0.3)',
                        padding: '18px 18px 16px',
                    }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#111827', fontWeight: 700 }}>
                            Please enable microphone
                        </h3>
                        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                            We could not detect voice in the first 5 seconds of recording. Please enable your mic and re-record this answer.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                                className="tp-btn"
                                onClick={() => setShowEnableMicPrompt(false)}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: '1px solid #d1d5db',
                                    background: '#fff',
                                    color: '#374151',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Continue anyway
                            </button>
                            <button
                                className="tp-btn"
                                onClick={() => {
                                    discardCurrentRecordingRef.current = true;
                                    setShowEnableMicPrompt(false);
                                    stopRecording();
                                }}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: '#dc2626',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Re-record with mic
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!uploaded && !recording && !recordedBlob && timeLeft === 0 && (
                <div style={{ textAlign: 'center', width: '100%', padding: 16, color: '#6b7280', fontSize: 14 }}>
                    Time expired. Moving to next question...
                </div>
            )}
        </div>
    );
}
