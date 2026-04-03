import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Success from './pages/Success';
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
import { ADMIN_BASE, adminUrl, IS_DEFAULT_ADMIN_PATH } from './utils/adminPath';
import { isAssessmentDeviceBlocked } from './utils/devicePolicy';
import { isFaceVerificationSatisfied } from './utils/devBypass';
import './index.css';
const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_OAUTH_ENABLED = GOOGLE_CLIENT_ID.length > 0;

// Layout for onboarding pages — includes a fixed header
export const OnboardingLayout = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
      allowed = onboarded && !hasIdentity;
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

      {/* Admin Panel Routes — standalone */}
      <Route path={ADMIN_BASE} element={<AdminLogin />} />
      <Route path={adminUrl('dashboard')} element={<AdminDashboard />} />
      <Route path={adminUrl('consultant/:id')} element={<ConsultantDetail />} />
      {!IS_DEFAULT_ADMIN_PATH && (
        <>
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/admin/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/admin/consultant/:id" element={<Navigate to="/" replace />} />
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
