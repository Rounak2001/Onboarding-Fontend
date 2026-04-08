import { useEffect, useMemo, useState } from 'react';

export const ADMIN_THEME_STORAGE_KEY = 'tp_admin_theme';

const ADMIN_THEME_VARS = {
    dark: {
        '--admin-page-bg': 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        '--admin-page-bg-login': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        '--admin-header-bg': 'rgba(15,23,42,0.82)',
        '--admin-panel-bg': 'rgba(30,41,59,0.82)',
        '--admin-surface': 'rgba(30,41,59,0.6)',
        '--admin-surface-soft': 'rgba(15,23,42,0.45)',
        '--admin-surface-strong': 'rgba(15,23,42,0.72)',
        '--admin-surface-elevated': '#1e293b',
        '--admin-surface-accent': 'rgba(15,23,42,0.58)',
        '--admin-row-alt': 'rgba(15,23,42,0.3)',
        '--admin-tab-idle': 'rgba(15,23,42,0.3)',
        '--admin-soft-spot': 'rgba(255,255,255,0.02)',
        '--admin-empty-bg': 'rgba(30,41,59,0.8)',
        '--admin-base-0': '#0f172a',
        '--admin-base-1': '#1e293b',
        '--admin-text-strong': '#f1f5f9',
        '--admin-text-primary': '#e2e8f0',
        '--admin-text-primary-soft': '#cbd5e1',
        '--admin-text-secondary': '#94a3b8',
        '--admin-text-muted': '#64748b',
        '--admin-border-soft': 'rgba(148,163,184,0.1)',
        '--admin-border-mid': 'rgba(148,163,184,0.15)',
        '--admin-border-strong': 'rgba(148,163,184,0.24)',
        '--admin-shadow-lg': '0 25px 50px rgba(0,0,0,0.32)',
        '--admin-shadow-md': '0 16px 36px rgba(15,23,42,0.18)',
    },
    light: {
        '--admin-page-bg': 'linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)',
        '--admin-page-bg-login': 'linear-gradient(135deg, #f8fafc 0%, #eef4ff 52%, #fdfefe 100%)',
        '--admin-header-bg': 'rgba(255,255,255,0.88)',
        '--admin-panel-bg': 'rgba(255,255,255,0.94)',
        '--admin-surface': 'rgba(255,255,255,0.88)',
        '--admin-surface-soft': 'rgba(241,245,249,0.96)',
        '--admin-surface-strong': 'rgba(255,255,255,0.98)',
        '--admin-surface-elevated': '#ffffff',
        '--admin-surface-accent': 'rgba(248,250,252,0.96)',
        '--admin-row-alt': 'rgba(226,232,240,0.52)',
        '--admin-tab-idle': 'rgba(226,232,240,0.74)',
        '--admin-soft-spot': 'rgba(255,255,255,0.78)',
        '--admin-empty-bg': 'rgba(241,245,249,0.95)',
        '--admin-base-0': '#ffffff',
        '--admin-base-1': '#eef2ff',
        '--admin-text-strong': '#0f172a',
        '--admin-text-primary': '#1e293b',
        '--admin-text-primary-soft': '#334155',
        '--admin-text-secondary': '#475569',
        '--admin-text-muted': '#64748b',
        '--admin-border-soft': 'rgba(148,163,184,0.18)',
        '--admin-border-mid': 'rgba(148,163,184,0.26)',
        '--admin-border-strong': 'rgba(100,116,139,0.32)',
        '--admin-shadow-lg': '0 28px 50px rgba(148,163,184,0.18)',
        '--admin-shadow-md': '0 18px 34px rgba(148,163,184,0.14)',
    },
};

export const getStoredAdminTheme = () => {
    if (typeof window === 'undefined') {
        return 'dark';
    }
    const stored = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark';
};

export const useAdminTheme = () => {
    const [themeName, setThemeName] = useState(getStoredAdminTheme);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, themeName);
        }
        if (typeof document !== 'undefined') {
            document.documentElement.style.colorScheme = themeName === 'light' ? 'light' : 'dark';
        }
    }, [themeName]);

    const themeVars = useMemo(() => ADMIN_THEME_VARS[themeName], [themeName]);

    return {
        themeName,
        themeVars,
        isLight: themeName === 'light',
        toggleTheme: () => setThemeName((current) => (current === 'light' ? 'dark' : 'light')),
        setThemeName,
    };
};
