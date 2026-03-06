import { createContext, useContext, useState, useEffect } from 'react';
import { getUserProfile, logout as logoutApi } from '../services/api';

const AuthContext = createContext(null);

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

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const data = await getUserProfile();
            setUser(data.user);
            setStepFlags({
                has_identity_doc: data.has_identity_doc || false,
                has_passed_assessment: data.has_passed_assessment || false,
                has_documents: data.has_documents || false,
                has_accepted_declaration: data.has_accepted_declaration || false,
            });
            setIsAuthenticated(true);
        } catch (error) {
            // Clear any stale token — if getUserProfile 401s, the token is
            // expired or invalid. The axios interceptor also clears it, but
            // we do it here too for immediate consistency.
            localStorage.removeItem('applicant_token');
            setUser(null);
            setStepFlags({});
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };


    const syncAuthData = (data) => {
        if (data.user) setUser(data.user);
        setStepFlags({
            has_identity_doc: data.has_identity_doc || false,
            has_passed_assessment: data.has_passed_assessment || false,
            has_documents: data.has_documents || false,
            has_accepted_declaration: data.has_accepted_declaration || false,
        });
        setIsAuthenticated(true);
    };

    const login = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
    };

    const updateUser = (userData) => {
        setUser(userData);
    };

    const updateStepFlags = (flags) => {
        setStepFlags(prev => ({ ...prev, ...flags }));
    };

    const logout = async () => {
        try {
            await logoutApi();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear the applicant JWT so the axios Bearer interceptor stops sending it
            localStorage.removeItem('applicant_token');
            setUser(null);
            setStepFlags({});
            setIsAuthenticated(false);
        }
    };

    const getNextRoute = (freshData = null) => {
        const targetUser = freshData?.user || user;
        const targetFlags = freshData ? {
            has_identity_doc: freshData.has_identity_doc,
            has_passed_assessment: freshData.has_passed_assessment,
            has_documents: freshData.has_documents,
            has_accepted_declaration: freshData.has_accepted_declaration
        } : stepFlags;

        console.log("--- DEBUG: getNextRoute calculation ---");
        console.log("    isAuthenticated:", isAuthenticated || !!freshData);
        console.log("    targetUser:", targetUser);
        console.log("    targetFlags:", targetFlags);

        if (!isAuthenticated && !freshData) {
            console.log("    -> Decision: Redirect to / (Not authenticated)");
            return '/';
        }
        if (!targetFlags.has_accepted_declaration) {
            console.log("    -> Decision: Redirect to /declaration (Declaration not accepted)");
            return '/declaration';
        }
        if (!targetUser?.is_onboarded) {
            console.log("    -> Decision: Redirect to /onboarding (Profile incomplete)");
            return '/onboarding';
        }
        if (!targetFlags.has_identity_doc) {
            console.log("    -> Decision: Redirect to /onboarding/identity (Identity missing)");
            return '/onboarding/identity';
        }
        if (!targetUser?.is_verified) {
            console.log("    -> Decision: Redirect to /onboarding/face-verification (Face not verified)");
            return '/onboarding/face-verification';
        }
        if (!targetFlags.has_passed_assessment) {
            console.log("    -> Decision: Redirect to /assessment/select (Assessment pending)");
            return '/assessment/select';
        }
        if (!targetFlags.has_documents) {
            console.log("    -> Decision: Redirect to /onboarding/documentation (Docs missing)");
            return '/onboarding/documentation';
        }
        console.log("    -> Decision: Success / Dashboard");
        return '/success';
    };

    const value = {
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
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
