import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import TestEngine from './pages/assessment/TestEngine';
import AssessmentResult from './pages/assessment/AssessmentResult';
import OnboardingComplete from './pages/OnboardingComplete';
import Declaration from './pages/Declaration';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ConsultantDetail from './pages/admin/ConsultantDetail';
import './index.css';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "1051464119459-a5apk0uflgqp3le9avo2qttmmrqcsg52.apps.googleusercontent.com";

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

// Protected Route — requires authentication
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-emerald-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;

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
  const hasAcceptedDeclaration = stepFlags?.has_accepted_declaration;
  const hasIdentity = stepFlags?.has_identity_doc;
  const verified = user?.is_verified;
  const passedAssessment = stepFlags?.has_passed_assessment;

  let allowed = false;
  switch (step) {
    case 'onboarding':
      // Allow them to edit their details until their identity is successfully verified
      allowed = !hasIdentity;
      break;
    case 'identity':
      allowed = onboarded && !hasIdentity;
      break;
    case 'face':
      allowed = onboarded && hasIdentity && !verified;
      break;
    case 'assessment':
      allowed = onboarded && verified;
      break;
    case 'documents':
      allowed = onboarded && passedAssessment;
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
    <Routes>
      <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Protected Onboarding Routes with Layout */}
      <Route element={<ProtectedRoute><OnboardingLayout /></ProtectedRoute>}>
        <Route path="/declaration" element={<Declaration />} />
        <Route path="/onboarding" element={
          <StepGuard step="onboarding"><Onboarding /></StepGuard>
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
        <Route path="/assessment/instructions" element={
          <StepGuard step="assessment"><Instructions /></StepGuard>
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
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/consultant/:id" element={<ConsultantDetail />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
