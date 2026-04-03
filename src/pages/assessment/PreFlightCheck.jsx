import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { createSession } from '../../services/api';
import { getAssessmentCategory, summarizeSelectedServices } from './assessmentCatalog';
import { normalizeAssessmentDomainLabel } from './domainLabels';
import { isAssessmentDeviceBlocked } from '../../utils/devicePolicy';
import {
    loadSelectedTests,
    saveSelectedTests,
    sanitizeSelectedTests,
} from './selectionPersistence';

const BLACK_FRAME_MEAN_THRESHOLD = 8;
const BLACK_FRAME_VARIANCE_THRESHOLD = 10;
const SILENCE_RMS_THRESHOLD = 0.0015;
const AUDIO_SAMPLE_MS = 700;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PreFlightCheck = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const selectedTests = useMemo(
        () => {
            const fromRouteState = sanitizeSelectedTests(location.state?.selectedTests);
            if (fromRouteState.length > 0) {
                return fromRouteState;
            }
            return loadSelectedTests();
        },
        [location.state?.selectedTests]
    );
    const previewVideoRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const [checks, setChecks] = useState({
        camera: 'pending',
        microphone: 'pending',
        network: navigator?.onLine === false ? 'failed' : 'pending',
    });
    const [deviceBlocked, setDeviceBlocked] = useState(false);
    const [deviceBlockMessage, setDeviceBlockMessage] = useState('');
    const [checkError, setCheckError] = useState('');
    const [startError, setStartError] = useState('');
    const [checking, setChecking] = useState(true);
    const [starting, setStarting] = useState(false);

    const selectedCategorySummaries = useMemo(() => {
        return selectedTests.map((test) => {
            const category = getAssessmentCategory(test?.slug || test?.name);
            const selectedServiceIds = Array.isArray(test?.selectedServiceIds) ? test.selectedServiceIds : [];
            const summary = summarizeSelectedServices(category || test?.slug || test?.name, selectedServiceIds, 4);
            return {
                key: test.id || test.slug || test.name,
                label: normalizeAssessmentDomainLabel(test?.category?.name || test?.name),
                preview: summary.preview,
                remainingCount: summary.remainingCount,
            };
        });
    }, [selectedTests]);

    const stopMediaResources = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
        if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
    }, []);

    const waitForVideoFrame = useCallback(async () => {
        const video = previewVideoRef.current;
        if (!video) return false;

        const hasLoadedFrame = await new Promise((resolve) => {
            let done = false;
            const finalize = (result) => {
                if (done) return;
                done = true;
                video.removeEventListener('loadeddata', onLoadedData);
                clearTimeout(timeoutId);
                resolve(result);
            };
            const onLoadedData = () => finalize(true);
            const timeoutId = setTimeout(() => finalize(false), 2500);

            if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                finalize(true);
                return;
            }
            video.addEventListener('loadeddata', onLoadedData);
        });

        if (!hasLoadedFrame) return false;
        await wait(120);
        return true;
    }, []);

    const validateVideoIsNotBlack = useCallback(() => {
        const video = previewVideoRef.current;
        if (!video || video.videoWidth === 0 || video.videoHeight === 0) return false;

        const canvas = previewCanvasRef.current || document.createElement('canvas');
        previewCanvasRef.current = canvas;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return false;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
        if (!imageData?.length) return false;

        let luminanceSum = 0;
        let luminanceSqSum = 0;
        let sampledPixels = 0;
        for (let i = 0; i < imageData.length; i += 16) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
            luminanceSum += luminance;
            luminanceSqSum += luminance * luminance;
            sampledPixels += 1;
        }

        if (sampledPixels === 0) return false;
        const mean = luminanceSum / sampledPixels;
        const variance = (luminanceSqSum / sampledPixels) - (mean * mean);
        const appearsBlack = mean < BLACK_FRAME_MEAN_THRESHOLD && variance < BLACK_FRAME_VARIANCE_THRESHOLD;
        return !appearsBlack;
    }, []);

    const validateMicrophoneSignal = useCallback(async (stream) => {
        const audioTracks = stream?.getAudioTracks?.() || [];
        const hasLiveAudioTrack = audioTracks.some((track) => track.readyState === 'live' && track.enabled);
        if (!hasLiveAudioTrack) return false;

        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) {
            return hasLiveAudioTrack;
        }

        const context = new AudioContextCtor();
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        const timeDomainData = new Uint8Array(analyser.fftSize);

        try {
            if (context.state === 'suspended') {
                await context.resume().catch(() => { });
            }

            if (context.state !== 'running') {
                return hasLiveAudioTrack;
            }

            const endAt = Date.now() + AUDIO_SAMPLE_MS;
            let maxRms = 0;
            while (Date.now() < endAt) {
                analyser.getByteTimeDomainData(timeDomainData);
                let sumSquares = 0;
                for (let i = 0; i < timeDomainData.length; i += 1) {
                    const normalized = (timeDomainData[i] - 128) / 128;
                    sumSquares += normalized * normalized;
                }
                const rms = Math.sqrt(sumSquares / timeDomainData.length);
                if (rms > maxRms) maxRms = rms;
                await wait(80);
            }

            return maxRms > SILENCE_RMS_THRESHOLD;
        } finally {
            if (audioContextRef.current === context) {
                await context.close().catch(() => { });
                audioContextRef.current = null;
            }
        }
    }, []);

    const runChecks = useCallback(async () => {
        setChecking(true);
        setCheckError('');
        setStartError('');
        stopMediaResources();

        const online = navigator?.onLine !== false;
        setChecks({
            camera: 'pending',
            microphone: 'pending',
            network: online ? 'passed' : 'failed',
        });

        if (isAssessmentDeviceBlocked()) {
            setDeviceBlocked(true);
            setDeviceBlockMessage('This assessment requires a desktop or laptop computer.');
            setChecks((prev) => ({
                ...prev,
                camera: 'failed',
                microphone: 'failed',
            }));
            setChecking(false);
            return;
        }

        setDeviceBlocked(false);
        setDeviceBlockMessage('');

        if (!navigator?.mediaDevices?.getUserMedia) {
            setChecks((prev) => ({ ...prev, camera: 'failed', microphone: 'failed' }));
            setCheckError('Camera and microphone checks are not supported in this browser. Please use Chrome, Edge, or Firefox.');
            setChecking(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            mediaStreamRef.current = stream;
            if (previewVideoRef.current) {
                previewVideoRef.current.srcObject = stream;
                await previewVideoRef.current.play().catch(() => { });
            }

            const hasLiveVideoTrack = stream.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled);
            const hasVideoFrame = await waitForVideoFrame();
            const videoValid = hasLiveVideoTrack && hasVideoFrame && validateVideoIsNotBlack();
            const microphoneValid = await validateMicrophoneSignal(stream);

            setChecks((prev) => ({
                ...prev,
                camera: videoValid ? 'passed' : 'failed',
                microphone: microphoneValid ? 'passed' : 'failed',
            }));

            if (!videoValid || !microphoneValid) {
                const issueMessages = [];
                if (!videoValid) issueMessages.push('Camera stream is inactive or appears fully black.');
                if (!microphoneValid) issueMessages.push('Microphone stream appears inactive or fully silent.');
                setCheckError(`${issueMessages.join(' ')} Please allow permissions and ensure no other app is using these devices.`);
            }
        } catch (err) {
            const errorName = String(err?.name || '').toLowerCase();
            let message = 'Camera/microphone access failed. Please allow access and retry.';
            if (errorName.includes('notallowed') || errorName.includes('permission')) {
                message = 'Camera/microphone permission denied. Please allow access in your browser settings and retry.';
            } else if (errorName.includes('notfound') || errorName.includes('devicesnotfound')) {
                message = 'No camera or microphone device was found. Please connect required hardware and retry.';
            }

            setChecks((prev) => ({ ...prev, camera: 'failed', microphone: 'failed' }));
            setCheckError(message);
        } finally {
            stopMediaResources();
            setChecking(false);
        }
    }, [stopMediaResources, validateMicrophoneSignal, validateVideoIsNotBlack, waitForVideoFrame]);

    useEffect(() => {
        if (selectedTests.length === 0) {
            navigate('/assessment/select');
            return undefined;
        }
        saveSelectedTests(selectedTests);
        runChecks();
        return () => {
            stopMediaResources();
        };
    }, [navigate, runChecks, selectedTests, stopMediaResources]);

    useEffect(() => {
        const onNetworkChange = () => {
            setChecks((prev) => ({
                ...prev,
                network: navigator?.onLine === false ? 'failed' : 'passed',
            }));
        };

        window.addEventListener('online', onNetworkChange);
        window.addEventListener('offline', onNetworkChange);
        onNetworkChange();

        return () => {
            window.removeEventListener('online', onNetworkChange);
            window.removeEventListener('offline', onNetworkChange);
        };
    }, []);

    const allChecksPassed = checks.camera === 'passed' && checks.microphone === 'passed' && checks.network === 'passed' && !deviceBlocked;

    const handleStartTest = async () => {
        if (!allChecksPassed || starting) return;
        setStarting(true);
        setStartError('');
        try {
            saveSelectedTests(selectedTests);
            const session = await createSession({
                selected_tests: selectedTests.map((test) => test.slug || test.name),
                selected_test_details: selectedTests.map((test) => ({
                    slug: test.slug || test.name,
                    selected_service_ids: Array.isArray(test.selectedServiceIds) ? test.selectedServiceIds : [],
                })),
            });

            navigate('/assessment/test', {
                state: {
                    session,
                    preflight: {
                        mediaReady: true,
                        checkedAt: new Date().toISOString(),
                    },
                },
            });
        } catch (err) {
            const errorCode = String(err?.response?.data?.code || '');
            if (errorCode === 'ASSESSMENT_SESSION_EXPIRED_RESELECT') {
                navigate('/assessment/select', {
                    replace: true,
                    state: {
                        sessionNotice: err?.response?.data?.error || 'Your previous assessment window expired. Please select categories again.',
                    },
                });
                return;
            }
            setStartError(err?.response?.data?.error || 'Failed to start session.');
        } finally {
            setStarting(false);
        }
    };

    const checklistRows = [
        { key: 'camera', label: '\u{1F4F7} Camera Access', status: checks.camera },
        { key: 'microphone', label: '\u{1F3A4} Microphone Access', status: checks.microphone },
        { key: 'network', label: '\u{1F310} Network Connection', status: checks.network },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <header style={{ background: '#0d1b2a', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56 }}>
                <div style={{ maxWidth: 1500, margin: '0 auto', height: '100%', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
                    <BrandLogo />
                </div>
            </header>

            <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 48px' }}>
                <div style={{ marginBottom: 18 }}>
                    <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Pre-flight System Check</h1>
                    <p style={{ margin: '8px 0 0', color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
                        Complete the required checks before starting the assessment.
                    </p>
                </div>

                {selectedCategorySummaries.length > 0 && (
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', marginBottom: 8 }}>Selected categories</div>
                        <div style={{ display: 'grid', gap: 10 }}>
                            {selectedCategorySummaries.map((item) => (
                                <div key={item.key} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', background: '#f8fafc' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{item.label}</div>
                                    {item.preview.length > 0 && (
                                        <p style={{ margin: '5px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.55 }}>
                                            {item.preview.join(', ')}
                                            {item.remainingCount > 0 ? ` +${item.remainingCount} more` : ''}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {deviceBlocked && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 16px', marginBottom: 16, color: '#991b1b', fontSize: 14, fontWeight: 700 }}>
                        {deviceBlockMessage}
                    </div>
                )}

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
                    {checklistRows.map((row, index) => (
                        <div
                            key={row.key}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                padding: '14px 16px',
                                borderBottom: index < checklistRows.length - 1 ? '1px solid #e2e8f0' : 'none',
                            }}
                        >
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{row.label}</span>
                            <StatusPill status={row.status} />
                        </div>
                    ))}
                </div>

                {checkError && (
                    <div style={{ marginTop: 14, background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#9a3412', lineHeight: 1.55 }}>
                        {checkError}
                    </div>
                )}

                {startError && (
                    <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#b91c1c', lineHeight: 1.55 }}>
                        {startError}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
                    <button
                        className="tp-btn"
                        onClick={() => navigate('/assessment/instructions', { state: { selectedTests } })}
                        style={{
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#334155',
                            borderRadius: 10,
                            padding: '11px 16px',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Back
                    </button>
                    <button
                        className="tp-btn"
                        onClick={runChecks}
                        disabled={checking}
                        style={{
                            border: '1px solid #bbf7d0',
                            background: checking ? '#ecfdf5' : '#dcfce7',
                            color: '#166534',
                            borderRadius: 10,
                            padding: '11px 16px',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: checking ? 'not-allowed' : 'pointer',
                            opacity: checking ? 0.8 : 1,
                        }}
                    >
                        {checking ? 'Checking...' : 'Run Checks Again'}
                    </button>
                    <button
                        className="tp-btn"
                        onClick={handleStartTest}
                        disabled={!allChecksPassed || checking || starting}
                        style={{
                            marginLeft: 'auto',
                            border: 'none',
                            background: (!allChecksPassed || checking || starting) ? '#94a3b8' : '#059669',
                            color: '#ffffff',
                            borderRadius: 10,
                            padding: '11px 20px',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: (!allChecksPassed || checking || starting) ? 'not-allowed' : 'pointer',
                            minWidth: 140,
                        }}
                    >
                        {starting ? 'Starting...' : 'Start Test'}
                    </button>
                </div>
            </main>

            <video ref={previewVideoRef} autoPlay playsInline muted style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
        </div>
    );
};

const StatusPill = ({ status }) => {
    const normalized = String(status || 'pending');
    if (normalized === 'passed') {
        return <span style={{ fontSize: 12, fontWeight: 700, color: '#065f46', background: '#d1fae5', borderRadius: 999, padding: '4px 10px' }}>Passed</span>;
    }
    if (normalized === 'failed') {
        return <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', background: '#fee2e2', borderRadius: 999, padding: '4px 10px' }}>Failed</span>;
    }
    return <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', borderRadius: 999, padding: '4px 10px' }}>Checking</span>;
};

export default PreFlightCheck;
