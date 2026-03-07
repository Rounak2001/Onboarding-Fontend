import axios from 'axios';

// In production: requests go to /api/* on the SAME Vercel domain.
// Vercel rewrites those to https://main.taxplanadvisor.co/api/* (reverse proxy).
// This means cookies are SAME-SITE → Safari ITP / cross-site blocking is bypassed entirely.
//
// In local dev: VITE_API_BASE_URL points to your local Django server directly.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // keep so cookies still work in local dev
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request Interceptor ──────────────────────────────────────────────────────
// Inject Authorization: Bearer <token> from localStorage on every request.
// This is the fallback for environments where the cookie can't be forwarded
// (e.g. direct API calls during local dev without the Vercel proxy layer).
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('applicant_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor ─────────────────────────────────────────────────────
// On 401 Unauthorized: clear stored credentials and redirect to login.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('applicant_token');
            // Only redirect if not already on the login page to avoid redirect loops
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

// ── Auth ─────────────────────────────────────────────────────────────────────

// Google Authentication (Onboarding portal — uses distinct endpoint)
export const googleAuth = async (token) => {
    const response = await api.post('/onboarding/auth/google/', { token });
    return response.data;
};

// Complete onboarding
export const completeOnboarding = async (data) => {
    const response = await api.post('/auth/onboarding/', data);
    return response.data;
};

// Applicant Phone OTP (Onboarding portal)
export const sendOnboardingPhoneOtp = async (phone_number) => {
    const response = await api.post('/auth/onboarding/send-otp/', { phone_number });
    return response.data;
};

export const verifyOnboardingPhoneOtp = async (phone_number, otp) => {
    const response = await api.post('/auth/onboarding/verify-otp/', { phone_number, otp });
    return response.data;
};

// Accept declaration
export const acceptDeclaration = async () => {
    const response = await api.post('/auth/accept-declaration/');
    return response.data;
};

// Get user profile
export const getUserProfile = async () => {
    const response = await api.get('/auth/profile/');
    return response.data;
};

// Logout
export const logout = async () => {
    const response = await api.post('/auth/logout/');
    return response.data;
};

// Health check
export const healthCheck = async () => {
    const response = await api.get('/auth/health/');
    return response.data;
};

// Upload directly to S3 using PUT
export const uploadDirectlyToS3 = async (presignedUrl, file, contentType) => {
    // We use a raw fetch or standard axios without interceptors so we don't send auth headers to S3
    const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': contentType,
        },
    });
    if (!response.ok) {
        throw new Error('Failed to upload file to S3');
    }
    return response;
};

// ── Qualification Documents ───────────────────────────────────────────────────
export const getDocumentUploadUrl = async (data) => {
    const response = await api.post('/documents/get-upload-url/', data);
    return response.data;
};

export const uploadDocument = async (qualificationType, documentType, file) => {
    // 1. Get Presigned URL
    const fileExt = file.name.split('.').pop();
    const urlData = await getDocumentUploadUrl({
        filename: file.name,
        file_ext: fileExt,
        content_type: file.type
    });

    // 2. Upload to S3
    await uploadDirectlyToS3(urlData.url, file, file.type);

    // 3. Save to DB
    const response = await api.post('/documents/upload/', {
        qualification_type: qualificationType,
        document_type: documentType,
        s3_path: urlData.path
    });
    return response.data;
};

// Get consultant documents
export const getDocuments = async () => {
    const response = await api.get('/auth/documents/list/');
    return response.data;
};


// ── Face Verification ─────────────────────────────────────────────────────────
export const uploadFaceVerificationPhoto = async (userId, formData) => {
    const response = await api.post(`/face-verification/users/${userId}/upload-photo/`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const verifyFace = async (userId, data) => {
    const response = await api.post(`/face-verification/users/${userId}/verify-face/`, data);
    return response.data;
};


// ── Identity Verification ─────────────────────────────────────────────────────
export const uploadIdentityDocument = async (formData) => {
    const response = await api.post('/auth/identity/upload-doc/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

// Upload onboarding document (experience letter etc.)
export const uploadOnboardingDocument = async (formData) => {
    const response = await api.post('/auth/documents/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

// ── Assessment API ────────────────────────────────────────────────────────────
export const getTestTypes = async () => {
    const response = await api.get('/assessment/test-types/');
    return response.data;
};

export const createSession = async (data) => {
    const response = await api.post('/assessment/sessions/', data);
    return response.data;
};

export const saveMcqProgress = async (sessionId, data) => {
    const response = await api.post(`/assessment/sessions/${sessionId}/save_mcq/`, data);
    return response.data;
};

export const submitTest = async (sessionId, data) => {
    const response = await api.post(`/assessment/sessions/${sessionId}/submit_test/`, data);
    return response.data;
};

export const getVideoUploadUrl = async (sessionId, data) => {
    const response = await api.post(`/assessment/sessions/${sessionId}/get_video_upload_url/`, data);
    return response.data;
};

// Direct multipart video upload
export const submitVideo = async (sessionId, questionId, blob) => {
    const formData = new FormData();
    const fileName = `video_${questionId}.webm`;
    formData.append('video', blob, fileName);
    formData.append('question_id', questionId);
    const response = await api.post(`/assessment/sessions/${sessionId}/submit_video/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const logViolation = async (sessionId, data) => {
    const response = await api.post(`/assessment/sessions/${sessionId}/log_violation/`, data);
    return response.data;
};

export const getLatestResult = async () => {
    const response = await api.get('/assessment/sessions/latest_result/');
    return response.data;
};

export const processProctoringSnapshot = async (sessionId, formData) => {
    const response = await api.post(`/assessment/sessions/${sessionId}/process_proctoring_snapshot/`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getProctoringPolicy = async () => {
    const response = await api.get('/assessment/sessions/proctoring_policy/');
    return response.data;
};

export default api;
