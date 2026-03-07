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

    const handleSignOut = async () => {
        if (confirmText && !window.confirm(confirmText)) return;
        await onSignOut?.();
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 10 }}>
            {email && (
                <div
                    title={String(email)}
                    style={{
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
                    }}
                >
                    <span
                        style={{
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
                        }}
                    >
                        {initial}
                    </span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {displayEmail}
                    </span>
                </div>
            )}

            {onSignOut && (
                <button
                    type="button"
                    className="tp-btn tp-signout"
                    onClick={handleSignOut}
                    style={{
                        padding: compact ? '7px 10px' : '8px 12px',
                        borderRadius: 10,
                        fontSize: compact ? 12 : 13,
                        fontWeight: 800,
                    }}
                >
                    Sign out
                </button>
            )}
        </div>
    );
};

export default AccountControls;
