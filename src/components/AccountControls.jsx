import { useMemo } from 'react';

const truncateMiddle = (value, max = 28) => {
    const s = String(value || '');
    if (!s) return '';
    if (s.length <= max) return s;
    const head = Math.max(10, Math.floor((max - 1) / 2));
    const tail = Math.max(8, max - head - 1);
    return `${s.slice(0, head)}…${s.slice(-tail)}`;
};

const AccountControls = ({ email, onSignOut, compact = false, confirmText = '' }) => {
    const initial = useMemo(() => (String(email || '?').trim()[0] || '?').toUpperCase(), [email]);
    const displayEmail = truncateMiddle(email, compact ? 22 : 30);
    const isNavbarVariant = Boolean(onSignOut);

    const handleSignOut = async () => {
        if (confirmText && !window.confirm(confirmText)) return;
        await onSignOut?.();
    };

    const shellStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: compact ? 8 : 10,
    };

    const emailStyle = isNavbarVariant
        ? {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: compact ? '6px 12px' : '8px 14px',
            minHeight: compact ? 42 : 46,
            borderRadius: 999,
            border: '1px solid rgba(148,163,184,0.26)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
            boxShadow: '0 10px 24px rgba(2,8,23,0.24), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(12px)',
            color: '#f8fafc',
            fontSize: compact ? 12 : 13,
            fontWeight: 700,
            maxWidth: compact ? 250 : 360,
        }
        : {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: compact ? '6px 10px' : '7px 12px',
            borderRadius: 999,
            border: '1px solid #e5e7eb',
            background: '#f8fafc',
            color: '#0f172a',
            fontSize: compact ? 12 : 13,
            fontWeight: 650,
            maxWidth: compact ? 220 : 340,
        };

    const avatarStyle = isNavbarVariant
        ? {
            width: compact ? 24 : 28,
            height: compact ? 24 : 28,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 30% 30%, rgba(110,231,183,0.36), rgba(45,212,191,0.12))',
            border: '1px solid rgba(110,231,183,0.46)',
            color: '#a7f3d0',
            fontWeight: 900,
            fontSize: compact ? 12 : 13,
            flexShrink: 0,
            boxShadow: '0 0 0 4px rgba(45,212,191,0.08)',
        }
        : {
            width: compact ? 22 : 24,
            height: compact ? 22 : 24,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontWeight: 900,
            fontSize: compact ? 12 : 13,
            flexShrink: 0,
        };

    return (
        <div style={shellStyle}>
            {email && (
                <div
                    title={String(email)}
                    style={emailStyle}
                >
                    <span style={avatarStyle}>
                        {initial}
                    </span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: 0.1 }}>
                        {displayEmail}
                    </span>
                </div>
            )}

            {onSignOut && (
                <button
                    type="button"
                    className="tp-btn tp-signout-dark"
                    onClick={handleSignOut}
                    style={{
                        padding: compact ? '8px 14px' : '10px 16px',
                        minHeight: compact ? 42 : 46,
                        borderRadius: 999,
                        fontSize: compact ? 12 : 13,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                    }}
                >
                    Sign out
                </button>
            )}
        </div>
    );
};

export default AccountControls;
