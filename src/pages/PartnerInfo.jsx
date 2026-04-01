import { useNavigate } from 'react-router-dom';
import taxplanAdvisorLogo from '../assets/TAXPLANDARK.png';

const steps = [
    {
        title: 'Profile setup',
        detail: 'Personal details, address, practice type, phone verification, and experience.',
    },
    {
        title: 'Identity verification',
        detail: 'Upload a government ID so your onboarding details can be verified.',
    },
    {
        title: 'Face verification',
        detail: 'Complete a live webcam check to match your face with the uploaded ID.',
    },
    {
        title: 'Qualification upload',
        detail: "Submit your Bachelor's degree and any optional supporting certificates.",
    },
    {
        title: 'Assessment',
        detail: 'Complete the domain assessment on desktop with camera and microphone access.',
    },
    {
        title: 'Review',
        detail: 'Your assessment and documents are reviewed before consultant access is issued.',
    },
];

const checklist = [
    'Government-issued ID image',
    'Phone number for WhatsApp OTP',
    'Date of birth and address details',
    'Years of professional experience',
    "Bachelor's degree certificate",
    "Optional master's degree or additional certificates",
    'Optional experience letter',
    'Desktop/laptop with webcam and microphone',
];

const surface = {
    page: '#f6f8fb',
    card: '#ffffff',
    line: '#e2e8f0',
    text: '#0f172a',
    muted: '#475569',
    soft: '#64748b',
    brand: '#059669',
    brandSoft: '#ecfdf5',
    brandBorder: '#a7f3d0',
};

const PartnerInfo = () => {
    const navigate = useNavigate();

    return (
        <div
            className="tp-page"
            style={{
                minHeight: '100vh',
                background: `linear-gradient(180deg, #ffffff 0%, ${surface.page} 100%)`,
                fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, -apple-system, sans-serif",
                color: surface.text,
            }}
        >
            <header
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: `1px solid ${surface.line}`,
                }}
            >
                <div
                    className="partner-header-inner"
                    style={{
                        maxWidth: 1120,
                        margin: '0 auto',
                        padding: '16px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        flexWrap: 'wrap',
                    }}
                >
                    <div
                        className="partner-navbar"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 16,
                            padding: '14px 18px',
                            borderRadius: 22,
                            border: `1px solid ${surface.line}`,
                            background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
                            boxShadow: '0 14px 34px rgba(15, 23, 42, 0.06)',
                        }}
                    >
                        <a
                            href="https://www.taxplanadvisor.in"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="partner-header-logo"
                            style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                        >
                            <img
                                src={taxplanAdvisorLogo}
                                alt="Taxplan Advisor"
                                style={{ height: 38, width: 'auto', display: 'block' }}
                            />
                        </a>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <a
                                className="tp-btn"
                                href="https://www.taxplanadvisor.in/about"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="About Us"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 40,
                                    padding: '0 16px',
                                    borderRadius: 999,
                                    border: `1px solid ${surface.line}`,
                                    background: '#fff',
                                    color: surface.text,
                                    textDecoration: 'none',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                About Us
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            <main style={{ maxWidth: 1120, margin: '0 auto', padding: '36px 24px 56px' }}>
                <section
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.15fr) minmax(300px, 0.85fr)',
                        gap: 24,
                    }}
                >
                    <div
                        style={{
                            background: surface.card,
                            border: `1px solid ${surface.line}`,
                            borderRadius: 28,
                            padding: '32px clamp(22px, 3vw, 40px)',
                            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.06)',
                        }}
                    >
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 12px',
                                borderRadius: 999,
                                background: surface.brandSoft,
                                border: `1px solid ${surface.brandBorder}`,
                                color: '#047857',
                                fontSize: 12,
                                fontWeight: 800,
                                letterSpacing: '0.03em',
                                textTransform: 'uppercase',
                            }}
                        >
                            Consultant Onboarding
                        </div>

                        <h1
                            style={{
                                margin: '18px 0 12px',
                                fontSize: 'clamp(2rem, 4vw, 3.4rem)',
                                lineHeight: 1.06,
                                letterSpacing: '-0.03em',
                                fontWeight: 800,
                            }}
                        >
                            Join TaxPlanAdvisor as a consultant
                        </h1>

                        <p
                            style={{
                                margin: 0,
                                maxWidth: 700,
                                fontSize: 16,
                                lineHeight: 1.7,
                                color: surface.muted,
                            }}
                        >
                            TaxPlanAdvisor connects clients with verified tax and compliance professionals. This
                            onboarding flow helps us confirm your identity, assess readiness, and collect the
                            qualification documents required before consultant access is issued.
                        </p>

                        <div style={{ marginTop: 14 }}>
                            <a
                                href="https://www.taxplanadvisor.in"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tp-btn"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    color: surface.muted,
                                    textDecoration: 'none',
                                    fontSize: 14,
                                    fontWeight: 700,
                                }}
                            >
                                Visit main website
                                <span className="tp-btn-icon" aria-hidden="true">↗</span>
                            </a>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                                gap: 12,
                                marginTop: 22,
                            }}
                        >
                                {[
                                { label: 'What to expect', value: '5 stages' },
                                { label: 'Steps overview', value: '6 steps' },
                                { label: 'Time', value: '10-15 min setup, then assessment + review' },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    style={{
                                        borderRadius: 18,
                                        border: `1px solid ${surface.line}`,
                                        background: '#fcfdff',
                                        padding: '16px 18px',
                                    }}
                                >
                                    <div style={{ fontSize: 12, fontWeight: 700, color: surface.soft, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {item.label}
                                    </div>
                                    <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800, color: surface.text }}>
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
                            <button
                                type="button"
                                className="tp-btn"
                                onClick={() => navigate('/login')}
                                style={{
                                    minHeight: 48,
                                    padding: '0 20px',
                                    borderRadius: 14,
                                    border: 'none',
                                    background: surface.brand,
                                    color: '#fff',
                                    fontSize: 15,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 16px 30px rgba(5, 150, 105, 0.18)',
                                }}
                            >
                                Start Onboarding
                            </button>

                            <button
                                type="button"
                                className="tp-btn"
                                onClick={() => navigate('/login')}
                                style={{
                                    minHeight: 48,
                                    padding: '0 20px',
                                    borderRadius: 14,
                                    border: `1px solid ${surface.line}`,
                                    background: '#fff',
                                    color: surface.text,
                                    fontSize: 15,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                Already registered? Sign in
                            </button>
                        </div>
                    </div>

                    <aside
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}
                    >
                        <div
                            style={{
                                background: surface.card,
                                border: `1px solid ${surface.line}`,
                                borderRadius: 24,
                                padding: '24px 22px',
                                boxShadow: '0 18px 40px rgba(15, 23, 42, 0.05)',
                            }}
                        >
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: surface.text }}>
                                What to keep ready
                            </h2>
                            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.7, color: surface.muted }}>
                                This checklist is based on the current onboarding fields and document requirements.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
                                {checklist.map((item) => (
                                    <div
                                        key={item}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 10,
                                            paddingBottom: 12,
                                            borderBottom: `1px solid ${surface.line}`,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: '50%',
                                                flexShrink: 0,
                                                background: surface.brandSoft,
                                                border: `1px solid ${surface.brandBorder}`,
                                                color: '#047857',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 12,
                                                fontWeight: 900,
                                            }}
                                        >
                                            ✓
                                        </div>
                                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: surface.text }}>
                                            {item}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </section>

                <section
                    style={{
                        marginTop: 24,
                        background: surface.card,
                        border: `1px solid ${surface.line}`,
                        borderRadius: 28,
                        padding: '28px clamp(22px, 3vw, 34px)',
                        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.04)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            gap: 16,
                            flexWrap: 'wrap',
                            marginBottom: 20,
                        }}
                    >
                        <div>
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: surface.text }}>
                                What the onboarding process involves
                            </h2>
                            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.7, color: surface.muted }}>
                                A clear view of the journey before you begin.
                            </p>
                        </div>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: 38,
                                padding: '0 14px',
                                borderRadius: 999,
                                background: '#f8fafc',
                                border: `1px solid ${surface.line}`,
                                color: surface.text,
                                fontSize: 13,
                                fontWeight: 800,
                            }}
                        >
                            6 steps · consultant-facing flow
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: 14,
                        }}
                    >
                        {steps.map((step, index) => (
                            <article
                                key={step.title}
                                style={{
                                    borderRadius: 20,
                                    border: `1px solid ${surface.line}`,
                                    background: '#fff',
                                    padding: '18px 18px 20px',
                                }}
                            >
                                <div
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 12,
                                        background: '#f8fafc',
                                        border: `1px solid ${surface.line}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 13,
                                        fontWeight: 800,
                                        color: surface.soft,
                                        marginBottom: 14,
                                    }}
                                >
                                    {String(index + 1).padStart(2, '0')}
                                </div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: surface.text }}>
                                    {step.title}
                                </h3>
                                <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.65, color: surface.muted }}>
                                    {step.detail}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>
            </main>

            <style>{`
                @media (max-width: 900px) {
                    main section:first-of-type {
                        grid-template-columns: 1fr !important;
                    }
                }

                @media (max-width: 640px) {
                    .partner-header-inner {
                        padding: 14px 16px !important;
                        justify-content: flex-start !important;
                        gap: 12px !important;
                    }

                    .partner-navbar {
                        padding: 12px 14px !important;
                        border-radius: 18px !important;
                    }

                    .partner-header-logo {
                        width: auto;
                        justify-content: flex-start;
                    }

                    .partner-header-logo img {
                        height: 32px !important;
                    }

                    .partner-navbar > div:last-child {
                        margin-left: auto;
                        width: auto;
                        justify-content: flex-end !important;
                        gap: 8px !important;
                    }

                    .partner-navbar > div:last-child a {
                        flex: 0 0 auto;
                        padding: 0 12px !important;
                        min-height: 36px !important;
                        font-size: 13px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default PartnerInfo;
