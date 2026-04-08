import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLatestResult } from '../services/api';
import BrandLogo from '../components/BrandLogo';
import { isAssessmentDeviceBlocked } from '../utils/devicePolicy';
import { isFaceVerificationSatisfied } from '../utils/devBypass';
import { useIsNarrowScreen } from '../utils/useViewport';

const formatRetryUnlockAt = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

const getRetrySecondsRemaining = (value) => {
    if (!value) return 0;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 0;
    return Math.max(0, Math.ceil((parsed.getTime() - Date.now()) / 1000));
};

const formatRetryCountdown = (totalSeconds) => {
    const seconds = Math.max(0, Number(totalSeconds) || 0);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (days > 0 || hours > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    parts.push(`${String(remainingSeconds).padStart(2, '0')}s`);

    return parts.join(' ');
};

const Success = () => {
    const { user, stepFlags, checkAuth, updateStepFlags } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isCompactScreen = useIsNarrowScreen(900);
    const isPhoneScreen = useIsNarrowScreen(640);
    const pageHorizontalPadding = isPhoneScreen ? 16 : (isCompactScreen ? 20 : 32);
    const [assessmentPassed, setAssessmentPassed] = useState(stepFlags?.has_passed_assessment || false);
    const [assessmentStatus, setAssessmentStatus] = useState(null);
    const [assessmentReviewPending, setAssessmentReviewPending] = useState(stepFlags?.assessment_review_pending || false);
    const [assessmentFailed, setAssessmentFailed] = useState(stepFlags?.assessment_failed || false);
    const [attemptsRemaining, setAttemptsRemaining] = useState(stepFlags?.assessment_attempts_remaining || 0);
    const [canRetryNow, setCanRetryNow] = useState(stepFlags?.assessment_can_retry_now || false);
    const [isDisqualified, setIsDisqualified] = useState(false);
    const [retryLocked, setRetryLocked] = useState(stepFlags?.assessment_retry_locked || false);
    const [retryAvailableAt, setRetryAvailableAt] = useState(stepFlags?.assessment_retry_available_at || null);
    const [retrySecondsRemaining, setRetrySecondsRemaining] = useState(() => getRetrySecondsRemaining(stepFlags?.assessment_retry_available_at));
    const [loading, setLoading] = useState(true);
    const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);

    const refreshAssessmentState = useCallback(async () => {
        try {
            const data = await getLatestResult();
            setAssessmentPassed(Boolean(data?.passed));
            if (data?.status) setAssessmentStatus(data.status);
            setAssessmentReviewPending(Boolean(data?.review_pending));
            setAssessmentFailed(Boolean(data?.failed));
            setAttemptsRemaining(Number(data?.attempts_remaining || 0));
            setCanRetryNow(Boolean(data?.can_retry_now));
            setRetryLocked(Boolean(data?.retry_locked));
            setRetryAvailableAt(data?.retry_available_at || null);
            setRetrySecondsRemaining(getRetrySecondsRemaining(data?.retry_available_at));
            setIsDisqualified(Boolean(data?.disqualified));
            updateStepFlags({
                has_passed_assessment: Boolean(data?.passed),
                assessment_review_pending: Boolean(data?.review_pending),
                assessment_failed: Boolean(data?.failed),
                assessment_attempts_remaining: Number(data?.attempts_remaining || 0),
                assessment_retry_locked: Boolean(data?.retry_locked),
                assessment_retry_available_at: data?.retry_available_at || null,
                assessment_retry_in_seconds: getRetrySecondsRemaining(data?.retry_available_at),
                assessment_can_retry_now: Boolean(data?.can_retry_now),
            });
            return data;
        } catch (_error) {
            return null;
        }
    }, [updateStepFlags]);

    useEffect(() => {
        let isActive = true;

        const loadPageState = async () => {
            await refreshAssessmentState();
            if (isActive) {
                setLoading(false);
            }
        };

        loadPageState();

        return () => {
            isActive = false;
        };
    }, [refreshAssessmentState]);

    useEffect(() => {
        if (!retryLocked || !retryAvailableAt) {
            setRetrySecondsRemaining(0);
            return undefined;
        }

        setRetrySecondsRemaining(getRetrySecondsRemaining(retryAvailableAt));

        const intervalId = window.setInterval(() => {
            const nextValue = getRetrySecondsRemaining(retryAvailableAt);
            setRetrySecondsRemaining(nextValue);

            if (nextValue <= 0) {
                window.clearInterval(intervalId);
                checkAuth().catch(() => { });
                refreshAssessmentState();
            }
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [retryLocked, retryAvailableAt, checkAuth, refreshAssessmentState]);

    const hasIdentity = stepFlags?.has_identity_doc;
    const isVerified = isFaceVerificationSatisfied(user);
    const isFlagged = assessmentStatus === 'flagged';
    const underReview = assessmentReviewPending || assessmentStatus === 'review_pending';
    const disqualified = isFlagged || isDisqualified;
    const assessmentEntryRoute = isAssessmentDeviceBlocked() ? '/assessment/device-required' : '/assessment/select';
    const isRetryFlow = Boolean(
        assessmentFailed
        && attemptsRemaining > 0
        && !underReview
        && !disqualified
        && !assessmentPassed
    );
    const showRetryAvailableBanner = Boolean(
        isRetryFlow
        && canRetryNow
        && stepFlags?.has_documents
        && isVerified
        && hasIdentity
    );
    const showRetryLockedBanner = Boolean(
        isRetryFlow
        && retryLocked
        && stepFlags?.has_documents
        && isVerified
        && hasIdentity
    );
    const showReviewCompletionBanner = Boolean(
        underReview
        && stepFlags?.has_documents
        && isVerified
        && hasIdentity
        && !retryLocked
        && !disqualified
    );
    
    useEffect(() => {
        if (!showReviewCompletionBanner) {
            setShowFeedbackPopup(false);
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            setShowFeedbackPopup(true);
        }, 5000);

        return () => window.clearTimeout(timeoutId);
    }, [showReviewCompletionBanner]);
    const retryUnlockText = formatRetryUnlockAt(retryAvailableAt);
    const retryCountdownText = formatRetryCountdown(retrySecondsRemaining);
    const steps = [
        { label: 'Profile Details', desc: 'Personal and practice information', done: user?.is_onboarded, icon: '\u{1F464}' },
        { label: 'Identity Verification', desc: 'Upload government-issued ID', done: hasIdentity, action: () => navigate('/onboarding/identity'), icon: '\u{1FAAA}' },
        { label: 'Face Verification', desc: 'Verify your identity via camera', done: isVerified, requires: hasIdentity, action: () => navigate('/onboarding/face-verification'), icon: '\u{1F4F8}' },
        {
            label: 'Qualification Upload',
            desc: stepFlags?.has_documents
                ? 'Qualification documents uploaded successfully.'
                : 'Upload your degree certificates and additional qualifications.',
            done: stepFlags?.has_documents,
            requires: isVerified,
            action: () => navigate('/onboarding/documentation'),
            icon: '\u{1F4C4}',
        },
        {
            label: disqualified
                ? 'Assessment Disqualified'
                : underReview
                    ? 'Assessment Under Review'
                    : showRetryLockedBanner
                        ? 'Assessment Retry Locked'
                        : showRetryAvailableBanner
                            ? 'Assessment Retry Available'
                            : 'Domain Assessment',
            desc: disqualified
                ? 'Maximum attempts exceeded or violations detected.'
                : underReview
                    ? 'We are reviewing your assessment and will email you within 48 hours.'
                    : showRetryLockedBanner
                        ? `Your next assessment attempt unlocks on ${retryUnlockText || 'the next available slot'}. Time remaining: ${retryCountdownText}.`
                        : showRetryAvailableBanner
                            ? `Your previous attempt did not clear all thresholds. You still have ${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining and can start your retry now.`
                        : '50 MCQs plus video questions',
            done: assessmentPassed || stepFlags?.has_passed_assessment,
            requires: isVerified && stepFlags?.has_documents && !disqualified,
            action: disqualified || underReview || retryLocked ? null : () => navigate(assessmentEntryRoute),
            icon: disqualified ? '\u{1F6AB}' : underReview ? '\u23F3' : isRetryFlow ? '\u{1F504}' : '\u{1F4DD}',
            customStatus: disqualified
                ? (
                    <span
                        style={{
                            fontSize: 12,
                            color: '#dc2626',
                            fontWeight: 600,
                            background: '#fef2f2',
                            padding: '6px 14px',
                            borderRadius: 20,
                            border: '1px solid #fecaca',
                            display: 'inline-flex',
                            width: isPhoneScreen ? '100%' : 'auto',
                            justifyContent: 'center',
                        }}
                    >
                        Disqualified
                    </span>
                )
                : underReview
                    ? (
                        <span
                            style={{
                                fontSize: 12,
                                color: '#9a3412',
                                fontWeight: 600,
                                background: '#fff7ed',
                                padding: '6px 14px',
                                borderRadius: 20,
                                border: '1px solid #fdba74',
                                display: 'inline-flex',
                                width: isPhoneScreen ? '100%' : 'auto',
                                justifyContent: 'center',
                            }}
                        >
                            Under Review
                        </span>
                    )
                    : showRetryLockedBanner
                        ? (
                            <span
                                style={{
                                    fontSize: 12,
                                    color: '#9a3412',
                                    fontWeight: 600,
                                    background: '#fff7ed',
                                    padding: '6px 14px',
                                    borderRadius: 20,
                                    border: '1px solid #fdba74',
                                    display: 'inline-flex',
                                    width: isPhoneScreen ? '100%' : 'auto',
                                    justifyContent: 'center',
                                }}
                            >
                                {retryCountdownText}
                            </span>
                        )
                        : showRetryAvailableBanner
                            ? (
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: '#166534',
                                        fontWeight: 600,
                                        background: '#f0fdf4',
                                        padding: '6px 14px',
                                        borderRadius: 20,
                                        border: '1px solid #bbf7d0',
                                        display: 'inline-flex',
                                        width: isPhoneScreen ? '100%' : 'auto',
                                        justifyContent: 'center',
                                    }}
                                >
                                    Retry Available
                                </span>
                            )
                        : null,
        },
    ];

    const currentStepIndex = steps.findIndex((step, i) => {
        if (step.done) return false;
        if (i === 0) return true;
        for (let j = 0; j < i; j += 1) {
            if (!steps[j].done) return false;
        }
        return true;
    });

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    const openFeedbackForm = () => {
        window.open('/feedback', '_blank', 'noopener,noreferrer');
        setShowFeedbackPopup(false);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <header style={{ background: '#0d1b2a', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ maxWidth: 1500, margin: '0 auto', padding: `0 ${pageHorizontalPadding}px`, height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BrandLogo />
                </div>
            </header>

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: `${isPhoneScreen ? 20 : (isCompactScreen ? 28 : 40)}px ${pageHorizontalPadding}px` }}>
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: isPhoneScreen ? 22 : (isCompactScreen ? 24 : 26), fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.25 }}>{`Welcome back, ${user?.first_name || user?.email?.split('@')[0]}`}</h1>
                    <p style={{ fontSize: isPhoneScreen ? 14 : 15, color: '#6b7280', marginTop: 8, lineHeight: 1.6 }}>Complete the steps below to finish your consultant onboarding.</p>
                </div>

                {showReviewCompletionBanner && (
                    <div style={{ marginBottom: 22, background: '#ecfdf5', borderRadius: 12, padding: isPhoneScreen ? 16 : 22, border: '1px solid #bbf7d0' }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#065f46', margin: '0 0 8px' }}>
                            Congratulations, you have completed all onboarding steps.
                        </h2>
                        <p style={{ fontSize: 14, color: '#047857', margin: 0, lineHeight: 1.65 }}>
                            We are currently reviewing your assessment. You will receive an email update within 48 hours once the review is complete.
                        </p>
                    </div>
                )}
                {showRetryAvailableBanner && (
                    <div style={{ marginBottom: 22, background: '#fff7ed', borderRadius: 12, padding: isPhoneScreen ? 16 : 22, border: '1px solid #fdba74' }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#9a3412', margin: '0 0 8px' }}>
                            Assessment retry available
                        </h2>
                        <p style={{ fontSize: 14, color: '#9a3412', margin: 0, lineHeight: 1.65 }}>
                            Your previous assessment attempt did not clear all thresholds. You still have {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining. Please start your retry when you are ready.
                        </p>
                    </div>
                )}
                {showRetryLockedBanner && (
                    <div style={{ marginBottom: 22, background: '#fff7ed', borderRadius: 12, padding: isPhoneScreen ? 16 : 22, border: '1px solid #fdba74' }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#9a3412', margin: '0 0 8px' }}>
                            Assessment retry scheduled
                        </h2>
                        <p style={{ fontSize: 14, color: '#9a3412', margin: 0, lineHeight: 1.65 }}>
                            Your previous assessment attempt did not clear all thresholds. Your next retry unlocks on {retryUnlockText || 'the next available slot'}. Time remaining: {retryCountdownText}.
                        </p>
                    </div>
                )}

                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    {steps.map((step, i) => {
                        const isActive = i === currentStepIndex;
                        const isLocked = !step.done && !isActive;

                        return (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: isPhoneScreen ? 'stretch' : 'center',
                                    gap: isPhoneScreen ? 12 : (isCompactScreen ? 16 : 20),
                                    padding: isPhoneScreen ? '16px 14px' : (isCompactScreen ? '18px 18px' : '20px 28px'),
                                    borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                                    background: isActive ? '#f0fdf4' : '#fff',
                                    opacity: isLocked ? 0.82 : 1,
                                    transition: 'all 0.2s',
                                    flexDirection: isPhoneScreen ? 'column' : 'row',
                                }}
                            >
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 14,
                                        fontWeight: 700,
                                        background: step.done ? '#dcfce7' : isActive ? '#059669' : '#f3f4f6',
                                        color: step.done ? '#16a34a' : isActive ? '#fff' : '#9ca3af',
                                    }}
                                >
                                    {step.done ? '✓' : i + 1}
                                </div>

                                {!isPhoneScreen && <span style={{ fontSize: isCompactScreen ? 22 : 24, flexShrink: 0 }}>{step.icon}</span>}

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3
                                        style={{
                                            fontSize: 15,
                                            fontWeight: 600,
                                            margin: 0,
                                            color: step.done ? '#166534' : isActive ? '#111827' : '#475569',
                                        }}
                                    >
                                        {step.label}
                                    </h3>
                                    <p style={{ fontSize: 13, color: step.done ? '#166534' : '#64748b', margin: '4px 0 0', lineHeight: 1.55 }}>
                                        {step.desc}
                                    </p>
                                </div>

                                <div style={{ flexShrink: 0, width: isPhoneScreen ? '100%' : 'auto' }}>
                                    {step.done ? (
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: 20, display: 'inline-flex', width: isPhoneScreen ? '100%' : 'auto', justifyContent: 'center' }}>
                                            Complete
                                        </span>
                                    ) : isActive && step.action ? (
                                        <button
                                            onClick={step.action}
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                background: '#059669',
                                                color: '#fff',
                                                padding: '10px 24px',
                                                borderRadius: 8,
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s',
                                                width: isPhoneScreen ? '100%' : 'auto',
                                            }}
                                            onMouseEnter={(e) => { e.target.style.background = '#047857'; }}
                                            onMouseLeave={(e) => { e.target.style.background = '#059669'; }}
                                        >
                                            Start →
                                        </button>
                                    ) : (
                                        step.customStatus || (
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    color: '#64748b',
                                                    fontWeight: 600,
                                                    display: isPhoneScreen ? 'inline-flex' : 'inline',
                                                    width: isPhoneScreen ? '100%' : 'auto',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                Locked
                                            </span>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {stepFlags?.has_documents && assessmentPassed && isVerified && hasIdentity && (
                    <div style={{ marginTop: 32, textAlign: 'center', background: '#ecfdf5', borderRadius: 12, padding: isPhoneScreen ? 18 : 24, border: '1px solid #d1fae5' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#065f46', margin: '0 0 8px' }}>Onboarding Complete!</h2>
                        <p style={{ fontSize: 15, color: '#047857', margin: 0, lineHeight: 1.6 }}>
                            You have completed the onboarding process. As soon as every required verification check clears, your login credentials will be generated automatically and emailed to you.
                        </p>
                    </div>
                )}

            </div>

            {showFeedbackPopup && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        zIndex: 120,
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: 420,
                            borderRadius: 20,
                            background: '#ffffff',
                            boxShadow: '0 24px 64px rgba(15, 23, 42, 0.24)',
                            border: '1px solid #e5e7eb',
                            padding: isPhoneScreen ? 20 : 24,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                            <div>
                                <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 12 }}>💬</div>
                                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                                    Please give feedback
                                </h3>
                                <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: '#475569' }}>
                                    You completed all onboarding steps. Your feedback will help us improve this process.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFeedbackPopup(false)}
                                aria-label="Close feedback popup"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    fontSize: 22,
                                    lineHeight: 1,
                                    padding: 0,
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 22, flexDirection: isPhoneScreen ? 'column' : 'row' }}>
                            <button
                                type="button"
                                onClick={() => setShowFeedbackPopup(false)}
                                style={{
                                    flex: 1,
                                    minHeight: 44,
                                    borderRadius: 10,
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#334155',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Maybe later
                            </button>
                            <button
                                type="button"
                                onClick={openFeedbackForm}
                                style={{
                                    flex: 1,
                                    minHeight: 44,
                                    borderRadius: 10,
                                    border: 'none',
                                    background: '#059669',
                                    color: '#ffffff',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                Open feedback form
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Success;
