import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getUserProfile, logout as logoutApi } from '../services/api';

const AuthContext = createContext(null);
let pendingProfileRequest = null;

const mapStepFlags = (data = {}) => ({
    has_identity_doc: data.has_identity_doc || false,
    has_passed_assessment: data.has_passed_assessment || false,
    assessment_review_pending: data.assessment_review_pending || false,
    assessment_retry_locked: data.assessment_retry_locked || false,
    assessment_retry_available_at: data.assessment_retry_available_at || null,
    assessment_retry_in_seconds: data.assessment_retry_in_seconds || 0,
    assessment_can_retry_now: data.assessment_can_retry_now || false,
    assessment_can_start: data.assessment_can_start || false,
    passed_categories: data.passed_categories || [],
    unlocked_categories: data.unlocked_categories || [],
    available_assessment_categories: data.available_assessment_categories || [],
    has_documents: data.has_documents || false,
    has_accepted_declaration: data.has_accepted_declaration || false,
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [stepFlags, setStepFlags] = useState({});
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const isMountedRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const applyAuthData = useCallback((data) => {
        if (!isMountedRef.current) return;

        if (data?.user) {
            setUser(data.user);
        }
        setStepFlags(mapStepFlags(data));
        setIsAuthenticated(true);
        setLoading(false);
    }, []);

    const clearAuthState = useCallback(() => {
        if (!isMountedRef.current) return;

        setUser(null);
        setStepFlags({});
        setIsAuthenticated(false);
        setLoading(false);
    }, []);

    const checkAuth = useCallback(async ({ force = false } = {}) => {
        const request = !force && pendingProfileRequest
            ? pendingProfileRequest
            : getUserProfile();

        pendingProfileRequest = request;

        try {
            const data = await request;
            applyAuthData(data);
            return data;
        } catch (error) {
            localStorage.removeItem('applicant_token');
            clearAuthState();
            throw error;
        } finally {
            if (pendingProfileRequest === request) {
                pendingProfileRequest = null;
            }
        }
    }, [applyAuthData, clearAuthState]);

    useEffect(() => {
        const applicantToken = localStorage.getItem('applicant_token');
        if (!applicantToken) {
            setLoading(false);
            return;
        }

        checkAuth().catch(() => { });
    }, [checkAuth]);

    const syncAuthData = useCallback((data) => {
        applyAuthData(data);
    }, [applyAuthData]);

    const login = useCallback((userData) => {
        setUser(userData);
        setIsAuthenticated(true);
    }, []);

    const updateUser = useCallback((userData) => {
        setUser(userData);
    }, []);

    const updateStepFlags = useCallback((flags) => {
        setStepFlags((prev) => ({ ...prev, ...flags }));
    }, []);

    const logout = useCallback(async () => {
        try {
            await logoutApi();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('applicant_token');
            clearAuthState();
        }
    }, [clearAuthState]);

    const getNextRoute = useCallback((freshData = null) => {
        const targetUser = freshData?.user || user;
        const targetFlags = freshData ? {
            has_identity_doc: freshData.has_identity_doc,
            has_passed_assessment: freshData.has_passed_assessment,
            assessment_review_pending: freshData.assessment_review_pending,
            assessment_retry_locked: freshData.assessment_retry_locked,
            assessment_retry_available_at: freshData.assessment_retry_available_at,
            assessment_retry_in_seconds: freshData.assessment_retry_in_seconds,
            assessment_can_retry_now: freshData.assessment_can_retry_now,
            assessment_can_start: freshData.assessment_can_start,
            passed_categories: freshData.passed_categories || [],
            unlocked_categories: freshData.unlocked_categories || [],
            available_assessment_categories: freshData.available_assessment_categories || [],
            has_documents: freshData.has_documents,
            has_accepted_declaration: freshData.has_accepted_declaration,
        } : stepFlags;

        if (!isAuthenticated && !freshData) {
            return '/';
        }
        if (!targetFlags.has_accepted_declaration) {
            return '/declaration';
        }
        if (!targetUser?.is_onboarded) {
            return '/onboarding';
        }
        if (!targetFlags.has_identity_doc) {
            return '/onboarding/identity';
        }
        if (!targetUser?.is_verified) {
            return '/onboarding/face-verification';
        }
        if (targetFlags.assessment_review_pending) {
            return '/assessment/result';
        }
        if (targetFlags.assessment_retry_locked) {
            return '/assessment/result';
        }
        if (!targetFlags.has_passed_assessment) {
            return '/assessment/select';
        }
        if (!targetFlags.has_documents) {
            return '/onboarding/documentation';
        }
        return '/success';
    }, [isAuthenticated, stepFlags, user]);

    const value = useMemo(() => ({
        user,
        stepFlags,
        loading,
        isAuthenticated,
        login,
        logout,
        updateUser,
        updateStepFlags,
        checkAuth,
        syncAuthData,
        getNextRoute,
    }), [
        checkAuth,
        getNextRoute,
        isAuthenticated,
        loading,
        login,
        logout,
        stepFlags,
        syncAuthData,
        updateStepFlags,
        updateUser,
        user,
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
