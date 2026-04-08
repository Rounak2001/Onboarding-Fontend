const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_ROLE_KEY = 'admin_role';
const ADMIN_USERNAME_KEY = 'admin_username';

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

export const getAdminToken = () => (canUseStorage() ? window.localStorage.getItem(ADMIN_TOKEN_KEY) : null);

export const getAdminRole = () => (canUseStorage() ? window.localStorage.getItem(ADMIN_ROLE_KEY) : null);

export const getAdminUsername = () => (canUseStorage() ? window.localStorage.getItem(ADMIN_USERNAME_KEY) : null);

export const persistAdminSession = ({ token, role, username }) => {
    if (!canUseStorage()) return;

    if (token) window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else window.localStorage.removeItem(ADMIN_TOKEN_KEY);

    if (role) window.localStorage.setItem(ADMIN_ROLE_KEY, role);
    else window.localStorage.removeItem(ADMIN_ROLE_KEY);

    if (username) window.localStorage.setItem(ADMIN_USERNAME_KEY, username);
    else window.localStorage.removeItem(ADMIN_USERNAME_KEY);
};

export const clearAdminSession = () => {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    window.localStorage.removeItem(ADMIN_ROLE_KEY);
    window.localStorage.removeItem(ADMIN_USERNAME_KEY);
};
