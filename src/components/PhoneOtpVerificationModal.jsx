import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function PhoneOtpVerificationModal({
    open,
    onClose,
    otpDigits,
    onOtpDigitsChange,
    otpComplete,
    otpVerifying,
    otpSending,
    resendCooldown,
    otpError,
    otpMessage,
    devOtp,
    phoneDisplay,
    onVerify,
    onResend,
    resendDisabled = false,
    verificationEnabled = true,
    resendLabel = 'Resend OTP',
    verifyLabel = 'Verify',
    title = 'Verify OTP',
    subtitle,
    tip = 'Tip: If you did not receive it, check WhatsApp message requests/spam.',
}) {
    const otpBoxRefs = useRef([]);

    useEffect(() => {
        if (!open) return undefined;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', onKeyDown);
        const focusId = window.setTimeout(() => {
            const idx = otpDigits.findIndex((digit) => !digit);
            const target = otpBoxRefs.current[idx === -1 ? 0 : idx];
            target?.focus?.();
        }, 50);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKeyDown);
            window.clearTimeout(focusId);
        };
    }, [open, onClose, otpDigits]);

    if (!open) return null;

    const resolvedSubtitle = subtitle || (phoneDisplay ? `Sent to ${phoneDisplay}` : 'Sent to your WhatsApp number');

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 80,
                display: 'grid',
                placeItems: 'center',
                padding: 16,
                overflowY: 'auto',
                background: 'rgba(15, 23, 42, 0.35)',
                margin: 0,
            }}
        >
            <div
                style={{
                    width: 'min(520px, 100%)',
                    margin: 'auto',
                    maxHeight: 'calc(100vh - 32px)',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.22)',
                    background: 'rgba(255, 255, 255, 0.18)',
                    boxShadow: '0 18px 45px rgba(15, 23, 42, 0.25)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    overflow: 'hidden',
                }}
            >
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.14)' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{title}</div>
                        <div style={{ fontSize: 12, color: 'rgba(15,23,42,0.70)' }}>
                            {resolvedSubtitle}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            border: '1px solid rgba(15,23,42,0.12)',
                            background: 'rgba(255,255,255,0.55)',
                            color: '#0f172a',
                            cursor: 'pointer',
                            fontWeight: 900,
                        }}
                        aria-label="Close"
                    >
                        x
                    </button>
                </div>

                <div style={{ padding: 16 }} aria-live="polite">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div
                            onPaste={(event) => {
                                const text = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                                if (!text) return;
                                event.preventDefault();
                                const next = ['', '', '', '', '', ''];
                                for (let i = 0; i < text.length; i += 1) next[i] = text[i];
                                onOtpDigitsChange(next);
                                const focusIndex = Math.min(text.length, 5);
                                window.setTimeout(() => otpBoxRefs.current[focusIndex]?.focus?.(), 0);
                            }}
                            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                        >
                            {otpDigits.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={(element) => { otpBoxRefs.current[idx] = element; }}
                                    value={digit}
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    aria-label={`OTP digit ${idx + 1}`}
                                    onChange={(event) => {
                                        const value = String(event.target.value || '').replace(/\D/g, '').slice(-1);
                                        const next = [...otpDigits];
                                        next[idx] = value;
                                        onOtpDigitsChange(next);
                                        if (value && idx < 5) otpBoxRefs.current[idx + 1]?.focus?.();
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            if (otpComplete && !otpVerifying && verificationEnabled) onVerify();
                                            return;
                                        }
                                        if (event.key === 'Backspace') {
                                            event.preventDefault();
                                            const next = [...otpDigits];
                                            if (next[idx]) {
                                                next[idx] = '';
                                                onOtpDigitsChange(next);
                                                return;
                                            }
                                            if (idx > 0) {
                                                next[idx - 1] = '';
                                                onOtpDigitsChange(next);
                                                otpBoxRefs.current[idx - 1]?.focus?.();
                                            }
                                            return;
                                        }
                                        if (event.key === 'ArrowLeft' && idx > 0) {
                                            event.preventDefault();
                                            otpBoxRefs.current[idx - 1]?.focus?.();
                                        }
                                        if (event.key === 'ArrowRight' && idx < 5) {
                                            event.preventDefault();
                                            otpBoxRefs.current[idx + 1]?.focus?.();
                                        }
                                    }}
                                    style={{
                                        width: 42,
                                        height: 44,
                                        borderRadius: 12,
                                        fontSize: 16,
                                        fontWeight: 800,
                                        border: otpError ? '1px solid rgba(239, 68, 68, 0.55)' : '1px solid rgba(15,23,42,0.16)',
                                        background: 'rgba(255,255,255,0.60)',
                                        outline: 'none',
                                        textAlign: 'center',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    }}
                                />
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={onVerify}
                            disabled={!otpComplete || otpVerifying || !verificationEnabled}
                            style={{
                                padding: '11px 14px',
                                borderRadius: 12,
                                border: '1px solid rgba(5,150,105,0.65)',
                                background: otpVerifying ? 'rgba(209, 250, 229, 0.9)' : 'rgba(5,150,105,0.92)',
                                color: otpVerifying ? '#065f46' : '#fff',
                                fontSize: 13,
                                fontWeight: 900,
                                cursor: (!otpComplete || otpVerifying || !verificationEnabled) ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {otpVerifying ? 'Verifying...' : verifyLabel}
                        </button>

                        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                            {resendCooldown > 0 ? (
                                <span style={{ fontSize: 12, color: 'rgba(15,23,42,0.70)' }}>
                                    Resend in {resendCooldown}s
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onResend}
                                    disabled={resendDisabled || otpSending}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: 0,
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        cursor: (resendDisabled || otpSending) ? 'not-allowed' : 'pointer',
                                        textDecoration: 'underline',
                                    }}
                                >
                                    {otpSending ? 'Sending...' : resendLabel}
                                </button>
                            )}
                        </div>
                    </div>

                    {otpError && <div style={{ marginTop: 10, fontSize: 12, color: '#b91c1c' }}>{otpError}</div>}
                    {otpMessage && !otpError && <div style={{ marginTop: 10, fontSize: 12, color: '#065f46' }}>{otpMessage}</div>}
                    {devOtp && (
                        <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(15,23,42,0.65)' }}>
                            DEV OTP: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{devOtp}</span>
                        </div>
                    )}

                    <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(15,23,42,0.60)' }}>
                        {tip}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
