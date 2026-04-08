const AdminThemeToggle = ({ isLight, onToggle }) => (
    <button
        type="button"
        onClick={onToggle}
        aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
        title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: 4,
            borderRadius: 999,
            background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.96) 100%)'
                : 'linear-gradient(180deg, rgba(18,26,45,0.98) 0%, rgba(15,23,42,0.96) 100%)',
            border: `1px solid ${isLight ? 'rgba(148,163,184,0.26)' : 'rgba(148,163,184,0.16)'}`,
            boxShadow: isLight
                ? '0 10px 24px rgba(15,23,42,0.08)'
                : '0 10px 24px rgba(2,6,23,0.24)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
        }}
    >
        <span
            style={{
                padding: '7px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: isLight ? 600 : 800,
                color: isLight ? 'rgba(100,116,139,0.95)' : '#f8fafc',
                background: isLight ? 'transparent' : 'linear-gradient(135deg, rgba(37,99,235,0.92), rgba(29,78,216,0.88))',
                boxShadow: isLight ? 'none' : '0 8px 18px rgba(37,99,235,0.28)',
                transition: 'all 0.2s ease',
            }}
        >
            Dark
        </span>
        <span
            style={{
                padding: '7px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: isLight ? 800 : 600,
                color: isLight ? '#0f172a' : 'rgba(148,163,184,0.9)',
                background: isLight ? 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(226,232,240,0.98))' : 'transparent',
                boxShadow: isLight ? '0 8px 18px rgba(15,23,42,0.1)' : 'none',
                transition: 'all 0.2s ease',
            }}
        >
            Light
        </span>
    </button>
);

export default AdminThemeToggle;
