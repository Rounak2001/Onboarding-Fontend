import { AlertCircle } from 'lucide-react';

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 1000,
    },
    card: {
        width: '100%',
        maxWidth: 460,
        background: '#ffffff',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid rgba(239, 68, 68, 0.15)',
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
    },
    header: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        padding: 24,
        background: '#fef2f2',
        borderBottom: '1px solid rgba(239, 68, 68, 0.12)',
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 999,
        background: 'rgba(239, 68, 68, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    title: {
        margin: 0,
        fontSize: 20,
        lineHeight: 1.25,
        fontWeight: 700,
        color: '#111827',
    },
    message: {
        margin: '8px 0 0',
        fontSize: 14,
        lineHeight: 1.6,
        color: '#475569',
    },
    hint: {
        margin: '10px 0 0',
        fontSize: 13,
        lineHeight: 1.6,
        color: '#64748b',
    },
    actions: {
        padding: 24,
        display: 'grid',
        gap: 12,
    },
    primaryButton: {
        width: '100%',
        minHeight: 44,
        borderRadius: 12,
        border: 'none',
        background: '#111827',
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
    },
    secondaryButton: {
        width: '100%',
        minHeight: 44,
        borderRadius: 12,
        border: '1px solid #d1d5db',
        background: '#ffffff',
        color: '#111827',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
    },
};

const EmailConflictDialog = ({ open, message, onClose, onTryAnotherAccount }) => {
    if (!open) {
        return null;
    }

    return (
        <div style={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="email-conflict-title">
            <div style={styles.card}>
                <div style={styles.header}>
                    <div style={styles.iconWrap}>
                        <AlertCircle size={20} color="#dc2626" />
                    </div>
                    <div>
                        <h3 id="email-conflict-title" style={styles.title}>
                            Email already linked to another account
                        </h3>
                        <p style={styles.message}>
                            {message || 'Please use a different email address to continue.'}
                        </p>
                        <p style={styles.hint}>
                            Close this message, then choose another Google account to continue.
                        </p>
                    </div>
                </div>

                <div style={styles.actions}>
                    <button type="button" style={styles.primaryButton} onClick={onTryAnotherAccount}>
                        Choose Another Google Account
                    </button>
                    <button type="button" style={styles.secondaryButton} onClick={onClose}>
                        Stay on Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailConflictDialog;
