import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { googleAuth, sendOnboardingEmailOtp, verifyOnboardingEmailOtp } from '../services/api';
import { useAuth } from '../context/AuthContext';
import taxplanAdvisorDarkLogo from '../assets/TAXPLANDARK.png';
import EmailConflictDialog from '../components/EmailConflictDialog';
import { isAssessmentDeviceBlocked } from '../utils/devicePolicy';
import { isFaceVerificationSatisfied } from '../utils/devBypass';
import { useIsNarrowScreen, useViewportWidth } from '../utils/useViewport';

const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_OAUTH_ENABLED = GOOGLE_CLIENT_ID.length > 0;

const Login = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { syncAuthData } = useAuth();
    const isPhoneScreen = useIsNarrowScreen(640);
    const viewportWidth = useViewportWidth();
    const [error, setError] = useState('');
    const [conflictMessage, setConflictMessage] = useState('');
    const [showConflictDialog, setShowConflictDialog] = useState(false);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailInfo, setEmailInfo] = useState('');
    const googleButtonRef = useRef(null);

    const moveFocusBackToGoogleLogin = () => {
        setShowConflictDialog(false);

        requestAnimationFrame(() => {
            googleButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            googleButtonRef.current?.focus?.();
        });
    };
    const googleButtonWidth = String(Math.max(220, Math.min(350, viewportWidth - (isPhoneScreen ? 48 : 96))));

    const handleAuthSuccessData = (data) => {
        // Store the applicant JWT so the axios interceptor sends it as Bearer on all future requests
        if (data.applicant_token) {
            localStorage.setItem('applicant_token', data.applicant_token);
        }

        // Sync context state with the fresh server data
        syncAuthData(data);

        // Derive next route directly from server response BEFORE React re-renders from syncAuthData.
        const targetUser = data.user;
        const requestedNextPath = searchParams.get('next');
        const nextPath = requestedNextPath && requestedNextPath.startsWith('/')
            ? requestedNextPath
            : '';
        let nextRoute = '/';
        if (!data.has_accepted_declaration) {
            nextRoute = '/declaration';
        } else if (!targetUser?.is_onboarded) {
            nextRoute = '/onboarding';
        } else if (!data.has_identity_doc) {
            nextRoute = '/onboarding/identity';
        } else if (!isFaceVerificationSatisfied(targetUser)) {
            nextRoute = '/onboarding/face-verification';
        } else if (!data.has_documents) {
            nextRoute = '/onboarding/documentation';
        } else if (data.assessment_review_pending) {
            nextRoute = '/success';
        } else if (data.assessment_retry_locked) {
            nextRoute = '/assessment/result';
        } else if (!data.has_passed_assessment) {
            if (!data.assessment_can_start) {
                nextRoute = '/success';
            } else if (isAssessmentDeviceBlocked()) {
                nextRoute = '/assessment/device-required';
            } else {
                nextRoute = '/assessment/select';
            }
        } else {
            nextRoute = '/success';
        }
        navigate(nextPath || nextRoute);
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const data = await googleAuth(credentialResponse.credential);
            setError('');
            setConflictMessage('');
            setShowConflictDialog(false);
            setEmailInfo('');
            handleAuthSuccessData(data);
        } catch (err) {
            const errorData = err?.response?.data;
            if (errorData?.code === 'EMAIL_CONFLICT') {
                setError('');
                setConflictMessage(errorData.error);
                setShowConflictDialog(true);
            } else {
                setShowConflictDialog(false);
                setConflictMessage('');
                setError(errorData?.error || 'Authentication failed. Please try again.');
            }
            console.error('Login error:', err);
        }
    };

    const handleSendEmailOtp = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            setError('Please enter your email.');
            return;
        }
        setEmailLoading(true);
        setError('');
        setConflictMessage('');
        setShowConflictDialog(false);
        setEmailInfo('');
        try {
            const data = await sendOnboardingEmailOtp(normalizedEmail);
            setEmail(normalizedEmail);
            setEmailOtpSent(true);
            setEmailInfo(data?.debug_otp ? `DEV OTP: ${data.debug_otp}` : 'OTP sent to your email.');
        } catch (err) {
            const errorData = err?.response?.data;
            if (errorData?.code === 'EMAIL_CONFLICT') {
                setConflictMessage(errorData.error);
                setShowConflictDialog(true);
            } else {
                setError(errorData?.error || 'Unable to send OTP. Please try again.');
            }
        } finally {
            setEmailLoading(false);
        }
    };

    const handleVerifyEmailOtp = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !otp.trim()) {
            setError('Please enter both email and OTP.');
            return;
        }
        setEmailLoading(true);
        setError('');
        setConflictMessage('');
        setShowConflictDialog(false);
        try {
            const data = await verifyOnboardingEmailOtp(normalizedEmail, otp.trim());
            setEmailInfo('');
            handleAuthSuccessData(data);
        } catch (err) {
            const errorData = err?.response?.data;
            if (errorData?.code === 'EMAIL_CONFLICT') {
                setConflictMessage(errorData.error);
                setShowConflictDialog(true);
            } else {
                setError(errorData?.error || 'Invalid OTP. Please try again.');
            }
        } finally {
            setEmailLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, sans-serif",
                color: '#0f172a',
                padding: isPhoneScreen ? 14 : 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 460,
                }}
            >
                <section style={{ textAlign: 'center', marginBottom: isPhoneScreen ? 18 : 24 }}>
                    <a
                        href="https://taxplanadvisor.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center' }}
                    >
                        <img
                            src={taxplanAdvisorDarkLogo}
                            alt="Taxplan Advisor"
                            style={{ height: isPhoneScreen ? 44 : 52, width: 'auto', display: 'block', objectFit: 'contain' }}
                        />
                    </a>
                    <p
                        style={{
                            margin: '10px 0 0',
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: '#64748b',
                        }}
                    >
                        Consultant Onboarding Portal
                    </p>
                </section>

                <section
                    style={{
                        background: '#ffffff',
                        borderRadius: 16,
                        border: '1px solid #e2e8f0',
                        padding: isPhoneScreen ? 20 : 28,
                        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.2, color: '#0f172a', textAlign: 'center' }}>
                        Candidate Login
                    </h2>
                    <p style={{ margin: '18px 0 0', fontSize: 14, color: '#475569', lineHeight: 1.65, textAlign: 'center' }}>
                        Use the same Google account linked to your onboarding profile.
                    </p>

                    

                    

                    <div style={{ display: 'grid', gap: 15 }}>
                        <label htmlFor="email-login-input" style={{marginTop: 20, fontSize: 12, color: '#334155', fontWeight: 700 }}>
                            Login with email OTP
                        </label>
                        <input
                            id="email-login-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={emailLoading || emailOtpSent}
                            placeholder="Enter your email"
                            style={{
                                width: '100%',
                                minHeight: 42,
                                borderRadius: 10,
                                border: '1px solid #cbd5e1',
                                padding: '0 12px',
                                fontSize: 14,
                                outline: 'none',
                                color: '#0f172a',
                                background: emailOtpSent ? '#f8fafc' : '#ffffff',
                            }}
                        />

                        {emailOtpSent && (
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit OTP"
                                style={{
                                    width: '100%',
                                    minHeight: 42,
                                    borderRadius: 10,
                                    border: '1px solid #cbd5e1',
                                    padding: '0 12px',
                                    fontSize: 14,
                                    outline: 'none',
                                    color: '#0f172a',
                                    background: '#ffffff',
                                }}
                            />
                        )}

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {!emailOtpSent ? (
                                <button
                                    type="button"
                                    onClick={handleSendEmailOtp}
                                    disabled={emailLoading}
                                    style={{
                                        minHeight: 40,
                                        padding: '0 14px',
                                        borderRadius: 10,
                                        border: 'none',
                                        background: '#0f766e',
                                        color: '#fff',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: emailLoading ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {emailLoading ? 'Sending OTP...' : 'Send OTP'}
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleVerifyEmailOtp}
                                        disabled={emailLoading}
                                        style={{
                                            minHeight: 40,
                                            padding: '0 14px',
                                            borderRadius: 10,
                                            border: 'none',
                                            background: '#0f766e',
                                            color: '#fff',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            cursor: emailLoading ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {emailLoading ? 'Verifying...' : 'Verify OTP & Login'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendEmailOtp}
                                        disabled={emailLoading}
                                        style={{
                                            minHeight: 40,
                                            padding: '0 14px',
                                            borderRadius: 10,
                                            border: '1px solid #cbd5e1',
                                            background: '#fff',
                                            color: '#334155',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            cursor: emailLoading ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        Resend OTP
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEmailOtpSent(false);
                                            setOtp('');
                                            setEmailInfo('');
                                        }}
                                        disabled={emailLoading}
                                        style={{
                                            minHeight: 40,
                                            padding: '0 14px',
                                            borderRadius: 10,
                                            border: '1px solid #cbd5e1',
                                            background: '#fff',
                                            color: '#334155',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            cursor: emailLoading ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        Change email
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>OR</span>
                        <span style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    </div>

                    <div style={{ marginTop: 22 }}>
                        {GOOGLE_OAUTH_ENABLED ? (
                            <div
                                ref={googleButtonRef}
                                tabIndex={-1}
                                style={{ display: 'flex', justifyContent: 'center', outline: 'none' }}
                            >
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => {
                                        setShowConflictDialog(false);
                                        setConflictMessage('');
                                        setError('Login failed');
                                    }}
                                    theme="outline"
                                    shape="rectangular"
                                    size="large"
                                    width={googleButtonWidth}
                                />
                            </div>
                        ) : (
                            <p style={{ color: '#92400e', fontSize: 13, background: '#fffbeb', borderRadius: 10, padding: '10px 12px', margin: 0 }}>
                                Google login is disabled. Set `VITE_GOOGLE_CLIENT_ID` for this environment.
                            </p>
                        )}
                    </div>

                    {error && (
                        <p style={{ color: '#b91c1c', fontSize: 14, background: '#fef2f2', borderRadius: 10, padding: '10px 12px', marginTop: 14, marginBottom: 0 }}>
                            {error}
                        </p>
                    )}

                    {!!emailInfo && (
                        <p style={{ color: '#065f46', fontSize: 13, background: '#ecfdf5', borderRadius: 10, padding: '10px 12px', marginTop: 12, marginBottom: 0 }}>
                            {emailInfo}
                        </p>
                    )}

                    <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                        {['Google verified identity', 'Secure token-based session', 'Encrypted candidate data handling'].map((text, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b', marginBottom: i < 2 ? 8 : 0 }}>
                                <span style={{ color: '#059669', fontWeight: 700 }}>+</span>
                                <span>{text}</span>
                            </div>
                        ))}
                    </div>

                    <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6, marginTop: 16, marginBottom: 0, textAlign: 'center' }}>
                        By signing in, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </section>
            </div>

            <EmailConflictDialog
                open={showConflictDialog}
                message={conflictMessage}
                onClose={() => setShowConflictDialog(false)}
                onTryAnotherAccount={moveFocusBackToGoogleLogin}
            />
        </div>
    );
};

export default Login;
