import { useState } from 'react';
import taxplanAdvisorLogo from '../assets/TAXPLANDARK.png';
import { apiUrl } from '../utils/apiBase';

const QUALIFICATIONS = [
    'CA (Chartered Accountant)',
    'CMA / ICWA',
    'CS (Company Secretary)',
    'B.Com (Bachelor of Commerce)',
    'M.Com (Master of Commerce)',
    'MBA – Finance / Taxation',
    'LLB – Tax / Corporate Law',
    'B.Com + CA Inter',
    'Other',
];

const WaitlistPage = () => {
    const [form, setForm] = useState({ name: '', phone: '', qualification: '' });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null); // 'success' | 'duplicate' | 'error'
    const [serverMessage, setServerMessage] = useState('');

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = 'Full name is required.';
        if (!form.phone.trim()) e.phone = 'Phone number is required.';
        else if (!/^\+?[\d\s\-]{7,15}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number.';
        if (!form.qualification) e.qualification = 'Please select your qualification.';
        return e;
    };

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const e2 = validate();
        if (Object.keys(e2).length) { setErrors(e2); return; }

        setSubmitting(true);
        try {
            const res = await fetch(apiUrl('/onboarding/waitlist/'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    qualification: form.qualification,
                }),
            });
            const data = await res.json();
            if (res.ok || res.status === 200) {
                setServerMessage(data.message || '');
                setResult(data.already_registered ? 'duplicate' : 'success');
            } else {
                setServerMessage(data.error || 'Something went wrong. Please try again.');
                setResult('error');
            }
        } catch {
            setServerMessage('Network error. Please check your connection and try again.');
            setResult('error');
        } finally {
            setSubmitting(false);
        }
    };

    const inputStyle = (hasError) => ({
        width: '100%',
        minHeight: 48,
        padding: '0 14px',
        borderRadius: 10,
        border: `1.5px solid ${hasError ? '#ef4444' : 'rgba(15,23,42,0.15)'}`,
        background: '#fff',
        fontSize: 15,
        color: '#0f172a',
        outline: 'none',
        fontFamily: 'inherit',
        transition: 'border-color 150ms',
        boxSizing: 'border-box',
    });

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #ecfeff 100%)',
                color: '#0f172a',
                fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, -apple-system, sans-serif",
            }}
        >
            {/* Header */}
            <header
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(248,250,252,0.88)',
                    borderBottom: '1px solid rgba(15,23,42,0.08)',
                }}
            >
                <div
                    style={{
                        maxWidth: 1200,
                        margin: '0 auto',
                        padding: '14px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <a
                        href="https://www.taxplanadvisor.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center' }}
                    >
                        <img src={taxplanAdvisorLogo} alt="TaxPlan Advisor" style={{ height: 36, width: 'auto' }} />
                    </a>
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: '#64748b',
                        }}
                    >
                        Consultant Onboarding
                    </span>
                </div>
            </header>

            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '52px 24px 80px' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(300px, 0.9fr)',
                        gap: 56,
                        alignItems: 'start',
                    }}
                >
                    {/* Left — messaging */}
                    <div>
                        {/* Status badge */}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '5px 12px',
                                    borderRadius: 999,
                                    background: '#fef3c7',
                                    border: '1px solid #fcd34d',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    letterSpacing: '0.07em',
                                    textTransform: 'uppercase',
                                    color: '#92400e',
                                }}
                            >
                                <span
                                    style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background: '#f59e0b',
                                        display: 'inline-block',
                                    }}
                                />
                                Applications Paused
                            </span>
                        </div>

                        <p
                            style={{
                                margin: '0 0 12px',
                                fontSize: 12,
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#0f766e',
                            }}
                        >
                            Next Phase Coming Soon
                        </p>

                        <h1
                            style={{
                                margin: '0 0 20px',
                                fontSize: 'clamp(2rem, 3.6vw, 3.6rem)',
                                lineHeight: 1.04,
                                letterSpacing: '-0.03em',
                                fontWeight: 800,
                                maxWidth: 680,
                            }}
                        >
                            Onboarding is{' '}
                            <span
                                style={{
                                    background: 'linear-gradient(135deg, #0f766e, #0369a1)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                temporarily
                            </span>
                            {' '}closed
                        </h1>

                        <p
                            style={{
                                margin: '0 0 36px',
                                maxWidth: 560,
                                fontSize: 17,
                                lineHeight: 1.7,
                                color: '#334155',
                            }}
                        >
                            We're currently reviewing applications from our first batch of consultants.
                            Leave your details below and we'll personally reach out when the next phase opens.
                        </p>

                        {/* Trust points */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {[
                                { icon: '✦', label: 'Priority access', desc: 'Waitlist members get notified first when onboarding reopens.' },
                                { icon: '✦', label: 'No spam', desc: 'We only reach out when there is a clear next step for you.' },
                                { icon: '✦', label: 'Verification-first platform', desc: 'Every consultant is assessed and verified before going live.' },
                            ].map(({ icon, label, desc }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                    <span
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 8,
                                            background: 'rgba(5,150,105,0.1)',
                                            border: '1px solid rgba(5,150,105,0.2)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 13,
                                            color: '#059669',
                                            flexShrink: 0,
                                            marginTop: 2,
                                        }}
                                    >
                                        {icon}
                                    </span>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{label}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 13, lineHeight: 1.6, color: '#475569' }}>{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right — form card */}
                    <div
                        style={{
                            borderRadius: 20,
                            background: '#ffffff',
                            border: '1px solid rgba(15,23,42,0.1)',
                            boxShadow: '0 24px 60px rgba(15,23,42,0.08)',
                            padding: '32px 28px',
                            position: 'sticky',
                            top: 88,
                        }}
                    >
                        {result === 'success' || result === 'duplicate' ? (
                            /* Success / already-registered state */
                            <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                                <div
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: '50%',
                                        background: result === 'success' ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)',
                                        border: `2px solid ${result === 'success' ? 'rgba(5,150,105,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 20px',
                                        fontSize: 28,
                                    }}
                                >
                                    {result === 'success' ? '✓' : '✦'}
                                </div>
                                <h2
                                    style={{
                                        margin: '0 0 10px',
                                        fontSize: 22,
                                        fontWeight: 800,
                                        letterSpacing: '-0.02em',
                                        color: '#0f172a',
                                    }}
                                >
                                    {result === 'success' ? "You're on the list!" : "Already registered"}
                                </h2>
                                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: '#475569' }}>
                                    {serverMessage}
                                </p>
                                <div
                                    style={{
                                        marginTop: 28,
                                        padding: '14px 16px',
                                        borderRadius: 12,
                                        background: '#f8fafc',
                                        border: '1px solid rgba(15,23,42,0.08)',
                                    }}
                                >
                                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: '#64748b' }}>
                                        In the meantime, visit{' '}
                                        <a
                                            href="https://www.taxplanadvisor.in"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#0f766e', fontWeight: 700, textDecoration: 'none' }}
                                        >
                                            taxplanadvisor.in
                                        </a>{' '}
                                        to learn more about the platform.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* Form state */
                            <>
                                <div style={{ marginBottom: 24 }}>
                                    <p
                                        style={{
                                            margin: '0 0 4px',
                                            fontSize: 12,
                                            fontWeight: 800,
                                            letterSpacing: '0.08em',
                                            textTransform: 'uppercase',
                                            color: '#0f766e',
                                        }}
                                    >
                                        Express Interest
                                    </p>
                                    <h2
                                        style={{
                                            margin: 0,
                                            fontSize: 22,
                                            fontWeight: 800,
                                            letterSpacing: '-0.02em',
                                            color: '#0f172a',
                                        }}
                                    >
                                        Join the waitlist
                                    </h2>
                                    <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.6, color: '#475569' }}>
                                        We'll contact you directly when the next phase opens.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {/* Name */}
                                    <div>
                                        <label
                                            style={{
                                                display: 'block',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: '#334155',
                                                marginBottom: 6,
                                            }}
                                        >
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Priya Sharma"
                                            value={form.name}
                                            onChange={handleChange('name')}
                                            style={inputStyle(!!errors.name)}
                                            onFocus={(e) => { e.target.style.borderColor = errors.name ? '#ef4444' : '#059669'; }}
                                            onBlur={(e) => { e.target.style.borderColor = errors.name ? '#ef4444' : 'rgba(15,23,42,0.15)'; }}
                                        />
                                        {errors.name && (
                                            <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{errors.name}</p>
                                        )}
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label
                                            style={{
                                                display: 'block',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: '#334155',
                                                marginBottom: 6,
                                            }}
                                        >
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="+91 98765 43210"
                                            value={form.phone}
                                            onChange={handleChange('phone')}
                                            style={inputStyle(!!errors.phone)}
                                            onFocus={(e) => { e.target.style.borderColor = errors.phone ? '#ef4444' : '#059669'; }}
                                            onBlur={(e) => { e.target.style.borderColor = errors.phone ? '#ef4444' : 'rgba(15,23,42,0.15)'; }}
                                        />
                                        {errors.phone && (
                                            <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{errors.phone}</p>
                                        )}
                                    </div>

                                    {/* Qualification */}
                                    <div>
                                        <label
                                            style={{
                                                display: 'block',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: '#334155',
                                                marginBottom: 6,
                                            }}
                                        >
                                            Highest Qualification
                                        </label>
                                        <select
                                            value={form.qualification}
                                            onChange={handleChange('qualification')}
                                            style={{
                                                ...inputStyle(!!errors.qualification),
                                                appearance: 'none',
                                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'right 14px center',
                                                paddingRight: 40,
                                                color: form.qualification ? '#0f172a' : '#94a3b8',
                                            }}
                                            onFocus={(e) => { e.target.style.borderColor = errors.qualification ? '#ef4444' : '#059669'; }}
                                            onBlur={(e) => { e.target.style.borderColor = errors.qualification ? '#ef4444' : 'rgba(15,23,42,0.15)'; }}
                                        >
                                            <option value="" disabled>Select your qualification</option>
                                            {QUALIFICATIONS.map((q) => (
                                                <option key={q} value={q}>{q}</option>
                                            ))}
                                        </select>
                                        {errors.qualification && (
                                            <p style={{ margin: '5px 0 0', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{errors.qualification}</p>
                                        )}
                                    </div>

                                    {result === 'error' && (
                                        <div
                                            style={{
                                                padding: '10px 14px',
                                                borderRadius: 8,
                                                background: '#fef2f2',
                                                border: '1px solid #fecaca',
                                                fontSize: 13,
                                                color: '#b91c1c',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {serverMessage}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        style={{
                                            minHeight: 50,
                                            borderRadius: 12,
                                            border: 'none',
                                            background: submitting ? '#6ee7b7' : '#059669',
                                            color: '#ffffff',
                                            fontSize: 15,
                                            fontWeight: 800,
                                            cursor: submitting ? 'not-allowed' : 'pointer',
                                            letterSpacing: '0.01em',
                                            boxShadow: submitting ? 'none' : '0 10px 24px rgba(5,150,105,0.28)',
                                            transition: 'background 200ms, box-shadow 200ms',
                                        }}
                                    >
                                        {submitting ? 'Submitting…' : 'Notify Me When It Opens →'}
                                    </button>

                                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
                                        No account created. We'll only use your details to contact you about onboarding.
                                    </p>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </main>

            <style>{`
                @media (max-width: 860px) {
                    main > div {
                        grid-template-columns: 1fr !important;
                    }
                    main > div > div:last-child {
                        position: static !important;
                    }
                }
                @media (max-width: 480px) {
                    main {
                        padding: 32px 16px 60px !important;
                    }
                    h1 {
                        font-size: clamp(1.75rem, 8vw, 2.2rem) !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default WaitlistPage;
