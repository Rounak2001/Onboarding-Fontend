import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLatestResult } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../../components/BrandLogo';

const formatRetryUnlockAt = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

const formatRetryCountdown = (seconds) => {
    const totalSeconds = Math.max(0, Number(seconds) || 0);
    if (!totalSeconds) return '';

    const totalMinutes = Math.ceil(totalSeconds / 60);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 && days === 0) parts.push(`${minutes}m`);

    return parts.join(' ');
};

const AssessmentResult = () => {
    const navigate = useNavigate();
    const { checkAuth } = useAuth();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isActive = true;
        let timeoutId;
        let hasSuccessfulFetch = false;
        let initialFailureCount = 0;

        const scheduleRetry = (delayMs) => {
            if (!isActive) return;
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(fetchData, delayMs);
        };

        const fetchData = async () => {
            try {
                const data = await getLatestResult();
                if (!isActive) return;
                hasSuccessfulFetch = true;
                initialFailureCount = 0;
                setResult(data);
                setError('');
                setLoading(false);

                if (data?.review_pending) {
                    scheduleRetry(4000);
                    return;
                }

                if (data?.retry_locked) {
                    scheduleRetry(60000);
                    return;
                }

                checkAuth().catch(() => { });
            } catch (err) {
                if (!isActive) return;
                console.error('Failed to load assessment results:', err);

                if (hasSuccessfulFetch) {
                    setError('');
                    setLoading(false);
                    scheduleRetry(5000);
                    return;
                }

                initialFailureCount += 1;
                if (initialFailureCount < 3) {
                    scheduleRetry(2000);
                    return;
                }

                setError('Failed to load results.');
                setLoading(false);
            }
        };

        fetchData();
        return () => {
            isActive = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    const handleContinue = async () => {
        await checkAuth().catch(() => { });
        navigate('/success');
    };

    const handleRetry = () => {
        navigate('/assessment/select');
    };

    const handleDashboard = async () => {
        if (!isFinalAnalysisReady) return;
        await checkAuth().catch(() => { });
        navigate('/success');
    };

    const reviewProgress = useMemo(() => {
        const expected = Number(result?.video_expected || 0);
        const completed = Number(result?.video_completed || 0);
        if (expected <= 0) return 22;
        const pct = Math.round((completed / expected) * 100);
        return Math.max(18, Math.min(100, pct));
    }, [result?.video_completed, result?.video_expected]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="tp-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 24 }}>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 32, textAlign: 'center', maxWidth: 420, width: '100%' }}>
                    <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>
                    <button
                        className="tp-btn"
                        onClick={handleDashboard}
                        style={{ padding: '10px 24px', borderRadius: 8, background: '#059669', color: '#fff', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const reviewPending = Boolean(result?.review_pending);
    const passed = Boolean(result?.passed);
    const disqualified = Boolean(result?.status === 'flagged' || result?.disqualified || result?.hide_marks);
    const retryLocked = Boolean(result?.retry_locked) && !reviewPending && !passed && !disqualified;
    const attemptsRemaining = Number(result?.attempts_remaining || 0);
    const failureReasons = Array.isArray(result?.failure_reasons) ? result.failure_reasons : [];
    const score = Number(result?.score || 0);
    const total = Number(result?.total || 50);
    const videoScore = Number(result?.video_score || 0);
    const videoTotal = Number(result?.video_total_possible || 0);
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const videoPercentage = videoTotal > 0 ? Math.round((videoScore / videoTotal) * 100) : 0;
    const retryUnlockAtText = formatRetryUnlockAt(result?.retry_available_at);
    const retryCountdownText = formatRetryCountdown(result?.retry_in_seconds);
    const expectedVideoAnswers = Number(result?.video_expected || 0);
    const completedVideoAnswers = Number(result?.video_completed || 0);
    const hasMcqAnalysis = result?.score != null && result?.total != null;
    const hasVideoAnalysis = expectedVideoAnswers <= 0 || (result?.video_score != null && result?.video_total_possible != null && completedVideoAnswers >= expectedVideoAnswers);
    const isFinalAnalysisReady = !reviewPending && hasMcqAnalysis && hasVideoAnalysis;

    const accent = reviewPending
        ? { primary: '#b45309', soft: '#fff7ed', border: '#fdba74' }
        : passed
            ? { primary: '#15803d', soft: '#f0fdf4', border: '#86efac' }
            : disqualified
                ? { primary: '#b91c1c', soft: '#fef2f2', border: '#fca5a5' }
                : { primary: '#b45309', soft: '#fff7ed', border: '#fdba74' };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #f9fafb 100%)', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <header style={{ background: '#0d1b2a', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ maxWidth: 920, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BrandLogo />
                </div>
            </header>

            <div style={{ maxWidth: 920, margin: '0 auto', padding: '42px 32px 56px' }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulseRing {
                    0% { transform: scale(0.92); opacity: 0.38; }
                    70% { transform: scale(1.08); opacity: 0; }
                    100% { transform: scale(1.08); opacity: 0; }
                }
                @keyframes dotBob {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
                    40% { transform: translateY(-4px); opacity: 1; }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-120%); }
                    100% { transform: translateX(220%); }
                }
                .tp-result-card {
                    animation: fadeUp 320ms ease;
                }
            `}</style>

            <div className="tp-result-card" style={{ position: 'relative', overflow: 'hidden', background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 18px 60px rgba(15, 23, 42, 0.06)', padding: '40px 36px' }}>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at top right, ${accent.soft}, transparent 36%)`, pointerEvents: 'none' }} />

                    {reviewPending ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: accent.primary, background: accent.soft, border: `1px solid ${accent.border}`, padding: '8px 14px', borderRadius: 999, marginBottom: 16 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent.primary }} />
                                    REVIEW IN PROGRESS
                                </span>

                                <h1 style={{ fontSize: 30, fontWeight: 800, color: '#111827', margin: 0 }}>
                                    Reviewing your video responses
                                </h1>
                                <p style={{ maxWidth: 560, fontSize: 15, lineHeight: 1.7, color: '#6b7280', margin: '12px 0 0' }}>
                                    Your MCQ answers are submitted and your video responses are being scored in the background. We will unlock the next step only after both checks are fully complete.
                                </p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, color: accent.primary, fontWeight: 700 }}>
                                    {[0, 1, 2].map((idx) => (
                                        <span
                                            key={idx}
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: accent.primary,
                                                display: 'inline-block',
                                                animation: `dotBob 1.2s ease-in-out ${idx * 0.15}s infinite`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: 30, background: '#fcfcfd', border: '1px solid #edf2f7', borderRadius: 18, padding: 22 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                                            Video scoring progress
                                        </div>
                                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                                            {Number(result?.video_completed || 0)} of {Number(result?.video_expected || 0)} video answers scored
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: accent.primary, background: accent.soft, border: `1px solid ${accent.border}`, padding: '8px 12px', borderRadius: 999 }}>
                                        {reviewProgress}%
                                    </div>
                                </div>

                                <div style={{ position: 'relative', height: 12, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
                                    <div style={{ width: `${reviewProgress}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)', transition: 'width 400ms ease' }} />
                                    <div style={{ position: 'absolute', top: 0, bottom: 0, width: '28%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)', animation: 'shimmer 1.8s linear infinite' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginTop: 22 }}>
                                <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 0.4 }}>MCQ SCORE</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 8 }}>{percentage}%</div>
                                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>MCQ review complete</div>
                                </div>
                                <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 0.4 }}>VIDEO STATUS</div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginTop: 10 }}>Scoring</div>
                                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Please keep this tab open or return later.</div>
                                </div>
                            </div>

                            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
                                <button
                                    className="tp-btn"
                                    onClick={handleDashboard}
                                    disabled={!isFinalAnalysisReady}
                                    style={{
                                        padding: '12px 22px',
                                        borderRadius: 10,
                                        border: '1px solid #d1d5db',
                                        background: '#fff',
                                        color: !isFinalAnalysisReady ? '#94a3b8' : '#374151',
                                        fontWeight: 600,
                                        cursor: !isFinalAnalysisReady ? 'not-allowed' : 'pointer',
                                        opacity: !isFinalAnalysisReady ? 0.7 : 1,
                                    }}
                                >
                                    Return to Dashboard
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                <h1 style={{ fontSize: 30, fontWeight: 800, color: passed ? '#15803d' : disqualified ? '#b91c1c' : '#b45309', margin: 0 }}>
                                    {passed ? 'Assessment cleared' : disqualified ? 'Assessment disqualified' : retryLocked ? 'Retry unlock scheduled' : 'Assessment not cleared'}
                                </h1>
                                <p style={{ maxWidth: 560, fontSize: 15, lineHeight: 1.7, color: '#6b7280', margin: '12px 0 0' }}>
                                    {passed
                                        ? 'Both your MCQ and video thresholds are complete. You can continue to your dashboard.'
                                        : disqualified
                                            ? 'Your assessment access is locked because of violations or the maximum number of failed attempts.'
                                            : retryLocked
                                                ? `This attempt did not clear all thresholds. You still have ${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining, and your next retry unlocks 24 hours after this result.`
                                                : attemptsRemaining > 0
                                                    ? `This attempt did not clear all thresholds. You still have ${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining.`
                                                    : 'This attempt did not clear all thresholds.'}
                                </p>
                            </div>

                            {retryLocked && (
                                <div style={{ marginTop: 24, background: '#fffaf0', border: '1px solid #fdba74', borderRadius: 16, padding: 18 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#9a3412', marginBottom: 8 }}>Next retry unlock</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#7c2d12' }}>
                                        {retryUnlockAtText || '24 hours after your last failed attempt'}
                                    </div>
                                    {retryCountdownText && (
                                        <div style={{ fontSize: 13, color: '#9a3412', marginTop: 6 }}>
                                            Time remaining: {retryCountdownText}
                                        </div>
                                    )}
                                </div>
                            )}

                            {!disqualified && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginTop: 28 }}>
                                <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 0.4 }}>MCQ SCORE</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 8 }}>{percentage}%</div>
                                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>MCQ performance</div>
                                </div>
                                <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 0.4 }}>VIDEO SCORE</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 8 }}>{videoPercentage}%</div>
                                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Video performance</div>
                                </div>
                            </div>
                            )}

                            {failureReasons.length > 0 && !passed && (
                                <div style={{ marginTop: 24, background: '#fffaf0', border: '1px solid #fed7aa', borderRadius: 16, padding: 18 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#9a3412', marginBottom: 8 }}>What needs attention</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {failureReasons.map((reason, idx) => (
                                            <div key={`${reason}-${idx}`} style={{ fontSize: 14, color: '#7c2d12', lineHeight: 1.55 }}>
                                                {reason}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
                                {passed ? (
                                    <button
                                        className="tp-btn"
                                        onClick={handleContinue}
                                        style={{
                                            padding: '13px 22px',
                                            borderRadius: 10,
                                            border: 'none',
                                            background: '#059669',
                                            color: '#fff',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            boxShadow: '0 10px 24px rgba(5, 150, 105, 0.18)',
                                        }}
                                    >
                                        Continue to Dashboard
                                    </button>
                                ) : !disqualified && !retryLocked && attemptsRemaining > 0 ? (
                                    <button
                                        className="tp-btn"
                                        onClick={handleRetry}
                                        style={{
                                            padding: '13px 22px',
                                            borderRadius: 10,
                                            border: 'none',
                                            background: '#059669',
                                            color: '#fff',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            boxShadow: '0 10px 24px rgba(5, 150, 105, 0.18)',
                                        }}
                                    >
                                        Retry Assessment →
                                    </button>
                                ) : null}

                                <button
                                    className="tp-btn"
                                    onClick={handleDashboard}
                                    style={{
                                        padding: '13px 22px',
                                        borderRadius: 10,
                                        border: '1px solid #d1d5db',
                                        background: '#fff',
                                        color: '#374151',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </>
                    )}
            </div>
            </div>
        </div>
    );
};

export default AssessmentResult;
