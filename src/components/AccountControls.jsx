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
    // On mobile show fewer characters to avoid overflow
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 480;
    const maxChars = isMobile ? 16 : compact ? 22 : 30;
    const displayEmail = truncateMiddle(email, maxChars);
    const isNavbarVariant = Boolean(onSignOut);

    const handleSignOut = async () => {
        if (confirmText && !window.confirm(confirmText)) return;
        await onSignOut?.();
    };

    const shellStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: compact ? 6 : 8,
        minWidth: 0,
    };

    const emailStyle = isNavbarVariant
        ? {
            display: 'inline-flex',
            alignItems: 'center',
            gap: compact ? 6 : 8,
            padding: compact ? '5px 10px' : '7px 13px',
            minHeight: compact ? 36 : 42,
            borderRadius: 999,
            border: '1px solid rgba(148,163,184,0.26)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
            boxShadow: '0 10px 24px rgba(2,8,23,0.24), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(12px)',
            color: '#f8fafc',
            fontSize: compact ? 11 : 12,
            fontWeight: 700,
            maxWidth: compact ? 180 : 260,
            minWidth: 0,
            overflow: 'hidden',
        }
        : {
            display: 'inline-flex',
            alignItems: 'center',
            gap: compact ? 6 : 8,
            padding: compact ? '5px 9px' : '6px 11px',
            borderRadius: 999,
            border: '1px solid #e5e7eb',
            background: '#f8fafc',
            color: '#0f172a',
            fontSize: compact ? 11 : 12,
            fontWeight: 650,
            maxWidth: compact ? 180 : 260,
            minWidth: 0,
            overflow: 'hidden',
        };

    const avatarStyle = isNavbarVariant
        ? {
            width: compact ? 22 : 26,
            height: compact ? 22 : 26,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 30% 30%, rgba(110,231,183,0.36), rgba(45,212,191,0.12))',
            border: '1px solid rgba(110,231,183,0.46)',
            color: '#a7f3d0',
            fontWeight: 900,
            fontSize: compact ? 11 : 12,
            flexShrink: 0,
            boxShadow: '0 0 0 3px rgba(45,212,191,0.08)',
        }
        : {
            width: compact ? 20 : 22,
            height: compact ? 20 : 22,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontWeight: 900,
            fontSize: compact ? 11 : 12,
            flexShrink: 0,
        };

    const supportPillStyle = isNavbarVariant
        ? {
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 1,
            padding: compact ? '4px 10px' : '5px 13px',
            borderRadius: 10,
            border: '1px solid rgba(110,231,183,0.28)',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.10))',
            boxShadow: '0 4px 14px rgba(16,185,129,0.14)',
            backdropFilter: 'blur(10px)',
            flexShrink: 0,
        }
        : {
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 1,
            padding: compact ? '4px 10px' : '5px 12px',
            borderRadius: 10,
            border: '1px solid #d1fae5',
            background: '#f0fdf4',
            flexShrink: 0,
        };

    return (
        <div style={shellStyle}>
            {/* Support number */}
            <div style={supportPillStyle}>
                <span style={{
                    fontSize: compact ? 10 : 11,
                    fontWeight: 800,
                    letterSpacing: 0.2,
                    whiteSpace: 'nowrap',
                    color: isNavbarVariant ? '#6ee7b7' : '#065f46',
                    lineHeight: 1.3,
                }}>
                    📞 +91 788 789 1236 / 1234
                </span>
                {!compact && (
                    <span style={{
                        fontSize: 9.5,
                        fontWeight: 600,
                        color: isNavbarVariant ? 'rgba(167,243,208,0.75)' : '#34d399',
                        whiteSpace: 'nowrap',
                        letterSpacing: 0.1,
                        lineHeight: 1.2,
                    }}>
                        Mon–Sat · 09:00 AM – 06:00 PM
                    </span>
                )}
            </div>

            {email && (
                <div
                    title={String(email)}
                    style={emailStyle}
                >
                    <span style={avatarStyle}>
                        {initial}
                    </span>
                    <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        letterSpacing: 0.1,
                        minWidth: 0,
                        flex: 1,
                    }}>
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
                        padding: compact ? '7px 12px' : '9px 15px',
                        minHeight: compact ? 36 : 42,
                        borderRadius: 999,
                        fontSize: compact ? 11 : 12,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}
                >
                    Sign out
                </button>
            )}
        </div>
    );
};

export default AccountControls;
