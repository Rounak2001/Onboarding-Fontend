import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { googleAuth } from '../services/api';
import { useAuth } from '../context/AuthContext';
import taxplanAdvisorDarkLogo from '../assets/TAXPLANDARK.png';
import EmailConflictDialog from '../components/EmailConflictDialog';
import { isAssessmentDeviceBlocked } from '../utils/devicePolicy';
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
    const googleButtonRef = useRef(null);

    const moveFocusBackToGoogleLogin = () => {
        setShowConflictDialog(false);

        requestAnimationFrame(() => {
            googleButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            googleButtonRef.current?.focus?.();
        });
    };
    const googleButtonWidth = String(Math.max(220, Math.min(350, viewportWidth - (isPhoneScreen ? 48 : 96))));

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const data = await googleAuth(credentialResponse.credential);
            setError('');
            setConflictMessage('');
            setShowConflictDialog(false);

            // Store the applicant JWT so the axios interceptor sends it as Bearer on all future requests
            if (data.applicant_token) {
                localStorage.setItem('applicant_token', data.applicant_token);
            }

            // Sync context state with the fresh server data
            syncAuthData(data);

            // Derive next route directly from server response — BEFORE React re-renders
            // from syncAuthData. If we called checkAuth() first, React would re-render
            // PublicRoute with isAuthenticated=true which immediately navigates via
            // getNextRoute() → /declaration, racing with whatever we navigate to next.
            // Using the fresh response data avoids any stale-state race condition.
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
            } else if (!targetUser?.is_verified) {
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

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isPhoneScreen ? 14 : 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: isPhoneScreen ? 22 : 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                        <a href="https://taxplanadvisor.in" target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                            <img
                                src={taxplanAdvisorDarkLogo}
                                alt="Taxplan Advisor"
                            style={{ height: isPhoneScreen ? 46 : 56, width: 'auto', display: 'block', objectFit: 'contain' }}
                            />
                        </a>
                    </div>
                    <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>Consultant Onboarding Portal</p>
                </div>

                {/* Card */}
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: isPhoneScreen ? 20 : 32, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', textAlign: 'center', margin: '0 0 4px' }}>Welcome</h2>
                    <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: isPhoneScreen ? 20 : 28 }}>Sign in with your Google account to get started</p>

                    {GOOGLE_OAUTH_ENABLED ? (
                        <div
                            ref={googleButtonRef}
                            tabIndex={-1}
                            style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, outline: 'none' }}
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
                        <p style={{ color: '#92400e', fontSize: 13, textAlign: 'center', background: '#fffbeb', borderRadius: 8, padding: '10px 12px', marginBottom: 20 }}>
                            Google login is disabled. Set `VITE_GOOGLE_CLIENT_ID` for this environment.
                        </p>
                    )}

                    {error && (
                        <p style={{ color: '#dc2626', fontSize: 14, textAlign: 'center', background: '#fef2f2', borderRadius: 8, padding: '8px 16px', marginTop: 16 }}>{error}</p>
                    )}

                    <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f3f4f6' }}>
                        {['End-to-end encrypted', 'Google verified identity', 'Data securely stored'].map((text, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#6b7280', marginBottom: i < 2 ? 10 : 0 }}>
                                <span style={{ color: '#059669', fontSize: 14 }}>✓</span>
                                <span>{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24 }}>
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>

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
