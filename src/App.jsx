import { useEffect, useState, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Success from './pages/Success';
import Feedback from './pages/Feedback';
import DocumentUpload from './pages/DocumentUpload';
import FaceVerification from './pages/FaceVerification';
import IdentityVerification from './pages/IdentityVerification';
import TestList from './pages/assessment/TestList';
import Instructions from './pages/assessment/Instructions';
import PreFlightCheck from './pages/assessment/PreFlightCheck';
import TestEngine from './pages/assessment/TestEngine';
import AssessmentResult from './pages/assessment/AssessmentResult';
import AssessmentDeviceRequired from './pages/assessment/AssessmentDeviceRequired';
import OnboardingComplete from './pages/OnboardingComplete';
import Declaration from './pages/Declaration';
import PartnerInfo from './pages/PartnerInfo';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ConsultantDetail from './pages/admin/ConsultantDetail';
import AdminClientDetail from './pages/admin/AdminClientDetail';
import EmailDashboard from './pages/admin/EmailDashboard';
import CallLogs from './pages/admin/CallLogs';
import { ADMIN_BASE, adminUrl, IS_DEFAULT_ADMIN_PATH } from './utils/adminPath';
import { isAssessmentDeviceBlocked } from './utils/devicePolicy';
import { isFaceVerificationSatisfied } from './utils/devBypass';
import { apiUrl } from './utils/apiBase';
import { Phone, Bell, X, Calendar, Clock, ChevronRight, Search, RefreshCw } from 'lucide-react';
import './index.css';
const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_OAUTH_ENABLED = GOOGLE_CLIENT_ID.length > 0;

// Layout for onboarding pages — includes a fixed header
export const OnboardingLayout = () => {
  const location = useLocation();
  const isAssessmentRoute = location.pathname.startsWith('/assessment');
  const showFeedbackButton = location.pathname !== '/feedback' && !isAssessmentRoute;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showFeedbackButton && (
        <div
          style={{
            position: 'fixed',
            top: 10,
            left: 0,
            right: 0,
            zIndex: 70,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              maxWidth: 1440,
              margin: '0 auto',
              padding: '0 32px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={() => window.open('/feedback', '_blank', 'noopener,noreferrer')}
              style={{
                pointerEvents: 'auto',
                border: '1px solid rgba(251,146,60,0.55)',
                background: 'linear-gradient(135deg, rgba(249,115,22,0.95), rgba(194,65,12,0.95))',
                color: '#fff7ed',
                borderRadius: 999,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.01em',
                cursor: 'pointer',
                boxShadow: '0 14px 30px rgba(249,115,22,0.28), 0 0 0 1px rgba(251,146,60,0.2) inset',
                marginRight: 56,
                transition: 'transform 160ms ease, box-shadow 160ms ease, filter 160ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 18px 34px rgba(249,115,22,0.34), 0 0 0 1px rgba(253,186,116,0.26) inset';
                e.currentTarget.style.filter = 'brightness(1.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 14px 30px rgba(249,115,22,0.28), 0 0 0 1px rgba(251,146,60,0.2) inset';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              Share Feedback
            </button>
          </div>
        </div>
      )}
      <main style={{ flex: 1, position: 'relative' }}>
        <Outlet />
      </main>
    </div>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Protected Route — requires authentication
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-emerald-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const nextPath = `${location.pathname}${location.search || ''}`;
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  return children;
};

// Public Route — redirect if already logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, getNextRoute } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-emerald-600"></div>
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to={getNextRoute()} replace />;
  }
  return children;
};

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const AdminReminderLayout = () => {
    const [reminders, setReminders] = useState([]);
    const [dismissedIds, setDismissedIds] = useState(new Set());
    const audioRef = useRef(new Audio(NOTIFICATION_SOUND_URL));
    const location = useLocation();
    const token = localStorage.getItem('admin_token');

    useEffect(() => {
        if (!token) return;

        const fetchFollowups = async () => {
            try {
                const res = await fetch(apiUrl('/admin-panel/upcoming-followups/'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) return;
                const data = await res.json();
                setReminders(data);
            } catch (err) {
                console.error('Followup fetch failed', err);
            }
        };

        fetchFollowups();
        const interval = setInterval(fetchFollowups, 600000); // Fetch from server every 10 minutes
        return () => clearInterval(interval);
    }, [token]);

    // Local check for reminders every minute
    const [activeReminders, setActiveReminders] = useState([]);
    useEffect(() => {
        const checkLocalReminders = () => {
            const now = new Date().getTime();
            const upcoming = reminders.filter(r => {
                const fTime = new Date(r.follow_up_time).getTime();
                const diff = fTime - now;
                // Trigger if within 5.5 minutes and not in the past and not dismissed
                return diff > 0 && diff <= 5.5 * 60 * 1000 && !dismissedIds.has(r.id);
            });

            if (upcoming.length > 0 && upcoming.length > activeReminders.length) {
                audioRef.current.play().catch(e => console.log('Audio play blocked', e));
            }
            setActiveReminders(upcoming);
        };

        checkLocalReminders();
        const t = setInterval(checkLocalReminders, 30000); // Check local list every 30 seconds
        return () => clearInterval(t);
    }, [reminders, dismissedIds, activeReminders.length]);

    const dismiss = (id) => {
        setDismissedIds(prev => new Set([...prev, id]));
        setActiveReminders(prev => prev.filter(r => r.id !== id));
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
            {activeReminders.length > 0 && (
                <div style={{ 
                    position: 'fixed', 
                    top: 20, 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    zIndex: 9999, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 10,
                    width: '90%',
                    maxWidth: 400
                }}>
                    {activeReminders.map(r => (
                        <div key={r.id} style={{ 
                            background: 'white', 
                            borderRadius: 12, 
                            padding: '16px', 
                            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', 
                            borderLeft: '4px solid #ef4444',
                            display: 'flex',
                            gap: 12,
                            animation: 'slideDown 0.3s ease-out'
                        }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                                <Phone size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Follow-up Reminder</span>
                                    <button onClick={() => dismiss(r.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}>
                                        <X size={16} />
                                    </button>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 4 }}>{r.consultant_name}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#ef4444', fontWeight: 800, marginTop: 4 }}>
                                    <Calendar size={12} /> {new Date(r.follow_up_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (In 5 mins)
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Outlet />
        </div>
    );
};

const StepGuard = ({ step, children }) => {
  const { user, stepFlags, loading, getNextRoute } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-emerald-600"></div>
      </div>
    );
  }

  const onboarded = user?.is_onboarded;
  const hasIdentity = stepFlags?.has_identity_doc;
  const assessmentReviewPending = stepFlags?.assessment_review_pending;
  const assessmentRetryLocked = stepFlags?.assessment_retry_locked;
  const assessmentCanStart = stepFlags?.assessment_can_start;
  const verified = isFaceVerificationSatisfied(user);
  const hasDocuments = stepFlags?.has_documents;
  const deviceBlockedForAssessment = isAssessmentDeviceBlocked();

  let allowed = false;
    switch (step) {
    case 'onboarding':
      // Allow profile completion, and allow edits until face verification is completed.
      // This prevents redirect loops when identity docs exist but profile is not marked onboarded yet.
      allowed = !onboarded || !verified;
      break;
    case 'onboarding-details':
      // Dedicated edit route for already-onboarded users (e.g. identity mismatch corrections).
      allowed = Boolean(onboarded);
      break;
    case 'identity':
      allowed = onboarded && (!hasIdentity || !verified);
      break;
    case 'face':
      allowed = onboarded && hasIdentity && !verified;
      break;
    case 'assessment':
      allowed = onboarded
        && verified
        && hasDocuments
        && assessmentCanStart
        && !assessmentReviewPending
        && !assessmentRetryLocked
        && !deviceBlockedForAssessment;
      break;
    case 'assessment-device-required':
      allowed = onboarded
        && verified
        && hasDocuments
        && assessmentCanStart
        && !assessmentReviewPending
        && !assessmentRetryLocked
        && deviceBlockedForAssessment;
      break;
    case 'documents':
      allowed = onboarded && verified && !hasDocuments;
      break;
    case 'dashboard':
      allowed = onboarded;
      break;
    default:
      allowed = true;
  }

  if (!allowed) {
    return <Navigate to={getNextRoute()} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/" element={<PublicRoute><PartnerInfo /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Protected Onboarding Routes with Layout */}
      <Route element={<ProtectedRoute><OnboardingLayout /></ProtectedRoute>}>
        <Route path="/declaration" element={<Declaration />} />
        <Route path="/onboarding" element={
          <StepGuard step="onboarding"><Onboarding /></StepGuard>
        } />
        <Route path="/onboarding/details" element={
          <StepGuard step="onboarding-details"><Onboarding /></StepGuard>
        } />
        <Route path="/success" element={
          <StepGuard step="dashboard"><Success /></StepGuard>
        } />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/onboarding/identity" element={
          <StepGuard step="identity"><IdentityVerification /></StepGuard>
        } />
        <Route path="/onboarding/face-verification" element={
          <StepGuard step="face"><FaceVerification /></StepGuard>
        } />
        <Route path="/assessment/select" element={
          <StepGuard step="assessment"><TestList /></StepGuard>
        } />
        <Route path="/assessment/device-required" element={
          <StepGuard step="assessment-device-required"><AssessmentDeviceRequired /></StepGuard>
        } />
        <Route path="/assessment/instructions" element={
          <StepGuard step="assessment"><Instructions /></StepGuard>
        } />
        <Route path="/assessment/preflight" element={
          <StepGuard step="assessment"><PreFlightCheck /></StepGuard>
        } />
        <Route path="/assessment/test" element={
          <StepGuard step="assessment"><TestEngine /></StepGuard>
        } />
        <Route path="/assessment/result" element={<AssessmentResult />} />
        <Route path="/onboarding/documentation" element={
          <StepGuard step="documents"><DocumentUpload /></StepGuard>
        } />
        <Route path="/onboarding/complete" element={<OnboardingComplete />} />
      </Route>

      {/* Admin Panel Routes — with Reminder Layout */}
      <Route element={<AdminReminderLayout />}>
        <Route path={ADMIN_BASE} element={<AdminLogin />} />
        <Route path={adminUrl('dashboard')} element={<AdminDashboard />} />
        <Route path={adminUrl('consultants')} element={<AdminDashboard />} />
        <Route path={adminUrl('clients')} element={<AdminDashboard />} />
        <Route path={adminUrl('emails')} element={<EmailDashboard />} />
        <Route path={adminUrl('call-logs')} element={<CallLogs />} />
        <Route path="/Consultants/:id" element={<ConsultantDetail />} />
        <Route path="/Clients/:id" element={<AdminClientDetail />} />
      </Route>
      {!IS_DEFAULT_ADMIN_PATH && (
        <>
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/admin/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/admin/consultant/:id" element={<Navigate to="/" replace />} />
          <Route path="/admin/client/:id" element={<Navigate to="/" replace />} />
        </>
      )}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  const appTree = (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );

  if (!GOOGLE_OAUTH_ENABLED) {
    return appTree;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {appTree}
    </GoogleOAuthProvider>
  );
}

export default App;
