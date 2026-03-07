import { useNavigate } from 'react-router-dom';

const PartnerInfo = () => {
    const navigate = useNavigate();

    const card = {
        background: '#fff',
        border: '1px solid rgba(148,163,184,0.22)',
        borderRadius: 18,
        padding: 24,
        boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
        backdropFilter: 'blur(6px)',
    };
    const softCard = {
        ...card,
        background: 'rgba(255,255,255,0.92)',
    };

    const pill = (text) => (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: 'rgba(16,185,129,0.10)',
            color: '#065f46',
            border: '1px solid rgba(16,185,129,0.22)',
        }}>
            {text}
        </span>
    );

    const sectionTitle = (title) => (
        <h2 style={{ fontSize: 14, fontWeight: 900, color: '#111827', margin: '0 0 10px' }}>
            {title}
        </h2>
    );

    const bullet = (text) => (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
            <span style={{ color: '#059669', fontWeight: 900, marginTop: 1 }}>✓</span>
            <span>{text}</span>
        </div>
    );

    return (
        <div className="tp-page" style={{
            minHeight: '100vh',
            background: 'radial-gradient(1200px 600px at 20% 0%, rgba(16,185,129,0.18) 0%, rgba(248,250,252,1) 55%), radial-gradient(900px 420px at 90% 10%, rgba(59,130,246,0.10) 0%, rgba(248,250,252,0) 60%), #f8fafc',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            <header style={{
                background: 'rgba(255,255,255,0.85)',
                borderBottom: '1px solid rgba(148,163,184,0.22)',
                position: 'sticky',
                top: 0,
                zIndex: 30,
                backdropFilter: 'blur(10px)',
            }}>
                <div style={{
                    maxWidth: 1020,
                    margin: '0 auto',
                    padding: '0 24px',
                    height: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 38,
                            height: 38,
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            borderRadius: 12,
                        }}>
                            <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>T</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ fontWeight: 800, color: '#111827', fontSize: 14 }}>Taxplan Advisor</span>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>Consultant Partner Program</span>
                        </div>
                    </div>

                    <div />
                </div>
            </header>

            <div style={{ maxWidth: 1020, margin: '0 auto', padding: '34px 24px 64px' }}>
                <div style={{ marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {pill('Fast onboarding')}
                    {pill('Verified consultants')}
                    {pill('Assessment-based eligibility')}
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.25fr 0.75fr',
                    gap: 16,
                    alignItems: 'start',
                }}>
                    <div style={{ ...softCard, position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute',
                            inset: -2,
                            background: 'radial-gradient(400px 180px at 15% 0%, rgba(16,185,129,0.20) 0%, rgba(255,255,255,0) 60%)',
                            pointerEvents: 'none',
                        }} />
                        <h1 style={{ fontSize: 28, fontWeight: 950, color: '#111827', margin: '0 0 10px', lineHeight: 1.15 }}>
                            Become a Taxplan Advisor partner consultant
                        </h1>
                        <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.7 }}>
                            This portal is for CAs/consultants who want to work with Taxplan Advisor. We use a short verification + assessment flow to
                            ensure quality and protect clients.
                        </p>

                        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button
                                className="tp-btn"
                                onClick={() => window.scrollTo({ top: 1000, behavior: 'smooth' })}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: 12,
                                    fontWeight: 800,
                                    fontSize: 14,
                                    border: '1px solid #d1d5db',
                                    background: '#fff',
                                    color: '#111827',
                                    cursor: 'pointer',
                                }}
                            >
                                How it works
                            </button>
                        </div>

                        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                fontSize: 12, fontWeight: 700, color: '#0f172a',
                                background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.08)',
                                borderRadius: 999, padding: '6px 10px',
                            }}>
                                <span>⏱</span><span>~10–15 min to complete</span>
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                fontSize: 12, fontWeight: 700, color: '#0f172a',
                                background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.08)',
                                borderRadius: 999, padding: '6px 10px',
                            }}>
                                <span>🔒</span><span>Secure verification</span>
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                fontSize: 12, fontWeight: 700, color: '#0f172a',
                                background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.08)',
                                borderRadius: 999, padding: '6px 10px',
                            }}>
                                <span>💼</span><span>Portal access after approval</span>
                            </div>
                        </div>
                    </div>

                    <div style={{
                        ...softCard,
                        background: 'linear-gradient(180deg, rgba(16,185,129,0.10) 0%, rgba(255,255,255,0.92) 60%)',
                        borderColor: 'rgba(16,185,129,0.22)',
                    }}>
                        {sectionTitle('What you get')}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {bullet('Access to the consultant portal after approval.')}
                            {bullet('Clear onboarding steps (profile → ID → face → assessment → documents).')}
                            {bullet('Credentials issued after verification + assessment + review.')}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={softCard}>
                        {sectionTitle('Eligibility & requirements')}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {bullet('Valid government ID (for identity verification).')}
                            {bullet('Live face verification via webcam.')}
                            {bullet('Degree documents (Bachelor’s required; other docs optional).')}
                            {bullet('Desktop/laptop recommended for assessment.')}
                        </div>
                    </div>
                    <div style={softCard}>
                        {sectionTitle('Assessment overview')}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {bullet('50 MCQ questions (domains split across your selection).')}
                            {bullet('Video questions with camera + microphone.')}
                            {bullet('Standard proctoring during assessment to ensure fairness.')}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 16, ...softCard }}>
                    {sectionTitle('How approval works')}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {bullet('Complete identity + face verification and upload required documents.')}
                            {bullet('Pass the assessment and follow proctoring policy.')}
                            {bullet('We review the application for final activation.')}
                        </div>
                        <div style={{
                            background: '#fff7ed',
                            border: '1px solid rgba(253,186,116,0.65)',
                            borderRadius: 12,
                            padding: 14,
                            color: '#9a3412',
                            fontSize: 13,
                            lineHeight: 1.6,
                            fontWeight: 600,
                        }}>
                            Approval is not automatic employment. Passing the assessment makes you eligible for activation subject to verification and review.
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 16, ...softCard }}>
                    {sectionTitle('Privacy & consent')}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {bullet('You will be asked to use camera/microphone for identity, face verification, and the assessment.')}
                        {bullet('By continuing, you consent to verification/proctoring required to protect clients and maintain assessment integrity.')}
                    </div>
                </div>

                <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
                    <button
                        className="tp-btn"
                        onClick={() => navigate('/login')}
                        style={{
                            padding: '14px 18px',
                            borderRadius: 14,
                            fontWeight: 950,
                            fontSize: 14,
                            border: 'none',
                            background: '#059669',
                            color: '#fff',
                            cursor: 'pointer',
                            minWidth: 240,
                        }}
                    >
                        Continue to sign in <span className="tp-btn-icon">→</span>
                    </button>
                </div>

                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 18, lineHeight: 1.6 }}>
                    By continuing, you agree to the portal terms and privacy policy.
                </p>
            </div>
        </div>
    );
};

export default PartnerInfo;
