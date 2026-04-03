import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getProctoringPolicy } from '../../services/api';
import BrandLogo from '../../components/BrandLogo';
import { getAssessmentCategory, summarizeSelectedServices } from './assessmentCatalog';
import { normalizeAssessmentDomainLabel } from './domainLabels';
import {
    loadSelectedTests,
    saveSelectedTests,
    sanitizeSelectedTests,
} from './selectionPersistence';

const Instructions = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const selectedTests = useMemo(() => {
        const fromRouteState = sanitizeSelectedTests(location.state?.selectedTests);
        if (fromRouteState.length > 0) {
            return fromRouteState;
        }
        return loadSelectedTests();
    }, [location.state?.selectedTests]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [deviceChecking, setDeviceChecking] = useState(false);
    const [cameraStatus, setCameraStatus] = useState('Not tested');
    const [micStatus, setMicStatus] = useState('Not tested');
    const [micLevel, setMicLevel] = useState(0);
    const [deviceError, setDeviceError] = useState('');
    const previewVideoRef = useRef(null);
    const testStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const audioDataRef = useRef(null);
    const rafRef = useRef(null);
    const [policy, setPolicy] = useState({
        max_tab_warnings: 3,
        max_webcam_warnings: 3,
        max_fullscreen_exits: 3,
    });

    useEffect(() => {
        if (selectedTests.length === 0) {
            navigate('/assessment/select');
        }
    }, [navigate, selectedTests]);

    useEffect(() => {
        if (selectedTests.length > 0) {
            saveSelectedTests(selectedTests);
        }
    }, [selectedTests]);

    const selectedCategorySummaries = useMemo(() => {
        return selectedTests.map((test) => {
            const category = getAssessmentCategory(test?.slug || test?.name);
            const selectedServiceIds = Array.isArray(test?.selectedServiceIds) ? test.selectedServiceIds : [];
            const summary = summarizeSelectedServices(category || test?.slug || test?.name, selectedServiceIds, 4);

            return {
                ...test,
                category,
                selectedServiceIds,
                selectedServiceCount: selectedServiceIds.length,
                preview: summary.preview,
                remainingCount: summary.remainingCount,
            };
        });
    }, [selectedTests]);

    useEffect(() => {
        let mounted = true;
        const loadPolicy = async () => {
            try {
                const res = await getProctoringPolicy();
                if (!mounted) return;
                setPolicy({
                    max_tab_warnings: res?.thresholds?.max_tab_warnings ?? 3,
                    max_webcam_warnings: res?.thresholds?.max_webcam_warnings ?? 3,
                    max_fullscreen_exits: res?.thresholds?.max_fullscreen_exits ?? 3,
                });
            } catch (err) {
                console.error('Failed to load proctoring policy:', err);
            }
        };
        loadPolicy();
        return () => { mounted = false; };
    }, []);

    const stopDeviceTest = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        if (testStreamRef.current) {
            testStreamRef.current.getTracks().forEach((track) => track.stop());
            testStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        audioDataRef.current = null;
        setMicLevel(0);
        if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = null;
        }
    }, []);

    useEffect(() => {
        return () => stopDeviceTest();
    }, [stopDeviceTest]);

    const handleDeviceTest = useCallback(async () => {
        stopDeviceTest();
        setDeviceChecking(true);
        setDeviceError('');
        setCameraStatus('Checking...');
        setMicStatus('Checking...');

        if (!navigator?.mediaDevices?.getUserMedia) {
            setCameraStatus('Not supported');
            setMicStatus('Not supported');
            setDeviceError('This browser does not support camera/microphone testing.');
            setDeviceChecking(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            testStreamRef.current = stream;

            if (previewVideoRef.current) {
                previewVideoRef.current.srcObject = stream;
                await previewVideoRef.current.play().catch(() => { });
            }

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 1024;
            source.connect(analyser);
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            audioDataRef.current = new Uint8Array(analyser.fftSize);

            const updateMicMeter = () => {
                if (!analyserRef.current || !audioDataRef.current) return;
                analyserRef.current.getByteTimeDomainData(audioDataRef.current);
                let sumSquares = 0;
                for (let i = 0; i < audioDataRef.current.length; i += 1) {
                    const normalized = (audioDataRef.current[i] - 128) / 128;
                    sumSquares += normalized * normalized;
                }
                const rms = Math.sqrt(sumSquares / audioDataRef.current.length);
                setMicLevel(Math.min(100, Math.round(rms * 280)));
                rafRef.current = requestAnimationFrame(updateMicMeter);
            };
            rafRef.current = requestAnimationFrame(updateMicMeter);

            setCameraStatus('Working');
            setMicStatus('Working');
        } catch (err) {
            const errorName = String(err?.name || '').toLowerCase();
            if (errorName.includes('notallowed') || errorName.includes('permission')) {
                setCameraStatus('Permission denied');
                setMicStatus('Permission denied');
                setDeviceError('Camera/microphone permission was denied. Please allow access and retry.');
            } else if (errorName.includes('notfound') || errorName.includes('devicesnotfound')) {
                setCameraStatus('No device found');
                setMicStatus('No device found');
                setDeviceError('No camera or microphone device was detected.');
            } else {
                setCameraStatus('Error');
                setMicStatus('Error');
                setDeviceError('Unable to test camera/microphone. Please retry.');
            }
        } finally {
            setDeviceChecking(false);
        }
    }, [stopDeviceTest]);

    const handleStart = () => {
        setError('');
        setLoading(true);
        saveSelectedTests(selectedTests);
        navigate('/assessment/preflight', {
            state: { selectedTests },
        });
    };

    const rules = [
        'The assessment includes 50 MCQ questions followed by video questions.',
        'Questions are distributed evenly across your selected domains.',
        'Each MCQ has 4 options with one correct answer.',
        'You cannot go back to previous questions.',
        `Fullscreen is mandatory. Exiting fullscreen repeatedly may disqualify your attempt (limit: ${policy.max_fullscreen_exits}).`,
        'Proctoring is active. Keep your camera on during MCQ and allow microphone access for video questions.',
        `${policy.max_webcam_warnings} webcam violations or ${policy.max_tab_warnings} tab switches can lead to disqualification.`,
        'Maximum 2 attempts are allowed. Failing both attempts leads to disqualification.',
        'Submitted responses cannot be edited or changed.',
    ];

    const domainLabel = selectedCategorySummaries
        .map((test) => normalizeAssessmentDomainLabel(test?.category?.name || test?.name))
        .join(', ');

    const btnStyle = (primary, disabled) => ({
        flex: 1,
        padding: '15px 0',
        borderRadius: 10,
        fontWeight: primary ? 600 : 500,
        fontSize: 15,
        border: primary ? 'none' : '1px solid #d1d5db',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? '#e5e7eb' : primary ? '#059669' : '#fff',
        color: disabled ? '#9ca3af' : primary ? '#fff' : '#374151',
    });

    if (selectedTests.length === 0) {
        return null;
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, sans-serif" }}>
            <header style={{ background: '#0d1b2a', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ maxWidth: 1500, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BrandLogo />
                </div>
            </header>

            <div style={{ maxWidth: 950, margin: '0 auto', padding: '30px 24px 56px' }}>
                <section style={{ marginBottom: 24, borderBottom: '1px solid #dbe3ee', paddingBottom: 20 }}>
                    {/* <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{domainLabel}</p> */}
                    <h1 style={{ fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 800, color: '#0f172a', margin: '10px 0 0' }}>Assessment Instructions</h1>
                    <p style={{ fontSize: 15, color: '#475569', margin: '8px 0 0', lineHeight: 1.7 }}>
                        Read all points before you begin. These rules apply throughout the test session.
                    </p>
                </section>

                <section style={{ marginBottom: 18 }}>
                    <p style={{ fontSize: 13, fontWeight: 900, color: '#475569', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Selected Categories ({selectedCategorySummaries.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedCategorySummaries.map((test) => (
                            <div
                                key={test.id || test.slug || test.name}
                                style={{ borderBottom: '1px solid #dbe3ee', padding: '10px 0 12px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                                        {normalizeAssessmentDomainLabel(test?.category?.name || test.name)}
                                    </span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', background: '#e2e8f0', padding: '4px 8px', borderRadius: 999 }}>
                                        {test.selectedServiceCount} titles
                                    </span>
                                </div>
                                {test.selectedServiceCount > 0 && (
                                    <p style={{ fontSize: 12, lineHeight: 1.55, color: '#475569', margin: '8px 0 0' }}>
                                        {test.preview.join(', ')}
                                        {test.remainingCount > 0 ? ` +${test.remainingCount} more` : ''}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section style={{ marginBottom: 18, background: '#fffaf0', borderRadius: 10, paddingTop:15, paddingBottom: 12, border: '1px solid #f1d9aa' }}>
                    <p style={{ fontSize: 17, fontWeight: 900, color: '#475569', margin: ' 0 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Rules:
                    </p>
                    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', columnGap: 32 }}>
                        {rules.map((rule, i) => (
                            <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.45, color: '#0f172a', padding: '8px 10px' }}>
                                <span style={{ flexShrink: 0, fontWeight: 700, color: '#0f172a' }}>{i + 1}.</span>
                                <span style={{ fontWeight: 800, contentjustify: 'center', margin: '10' }}>{rule}</span>
                            </li>
                        ))}
                    </ol>
                </section>

                <section style={{ marginBottom: 18, paddingTop: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Device Check</p>
                            {/* <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Test your camera and microphone before starting.</p> */}
                        </div>
                        <button
                            className="tp-btn"
                            onClick={handleDeviceTest}
                            disabled={deviceChecking}
                            style={{ ...btnStyle(true, deviceChecking), flex: 'none', padding: '10px 14px' }}
                        >
                            {deviceChecking ? 'Checking...' : 'Test Camera & Mic'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', background: '#e2e8f0', padding: '5px 10px', borderRadius: 999 }}>
                            Camera: {cameraStatus}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', background: '#e2e8f0', padding: '5px 10px', borderRadius: 999 }}>
                            Microphone: {micStatus}
                        </span>
                    </div>

                    <div style={{ background: '#111827', borderRadius: 10, overflow: 'hidden', marginBottom: 10, aspectRatio: '16/9' }}>
                        <video ref={previewVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    <div style={{ marginBottom: 4, fontSize: 12, color: '#6b7280' }}>Mic input level</div>
                    <div style={{ height: 8, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${micLevel}%`, background: micLevel > 10 ? '#059669' : '#9ca3af', transition: 'width 120ms linear' }} />
                    </div>
                    {deviceError && <p style={{ margin: '10px 0 0', fontSize: 13, color: '#dc2626' }}>{deviceError}</p>}
                </section>

                <section style={{ borderTop: '1px solid #f1d9aa', borderBottom: '1px solid #f1d9aa', background: '#fffaf0', padding: '14px 0', marginBottom: 24, borderRadius: 10 }}>
                    <p style={{ fontSize: 15, color: '#92400e', margin: 10, lineHeight: 1.7 }}>
                        Important: Your assessment window is 2 hours. If interrupted, MCQ/video may restart within this window; after expiry, you must reselect categories.
                    </p>
                </section>

                {error && <div style={{ marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 16, color: '#dc2626' }}>{error}</div>}

                <div style={{ display: 'flex', gap: 250, flexWrap: 'wrap' }}>
                    <button className="tp-btn" onClick={() => navigate('/assessment/select')} style={btnStyle(false, false)}>Back</button>
                    <button className="tp-btn" onClick={handleStart} disabled={loading} style={btnStyle(true, loading)}>
                        {loading ? 'Starting...' : 'Start Assessment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Instructions;
