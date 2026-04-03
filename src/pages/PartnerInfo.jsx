import { useNavigate } from 'react-router-dom';
import taxplanAdvisorLogo from '../assets/TAXPLANDARK.png';

const highlights = [
    'Built for tax and compliance professionals',
    'Verification-first onboarding quality standards',
    'Assessment and profile review before activation',
];

const requirements = [
    'Government-issued ID image',
    'Phone number for WhatsApp OTP',
    'Date of birth and address details',
    'Years of professional experience',
    "Bachelor's degree certificate or CA degree certificate",
    "Optional: master's degree or additional certificates",
    'Optional: experience letter',
];

const PartnerInfo = () => {
    const navigate = useNavigate();

    return (
        <div
            className="tp-page"
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #ecfeff 100%)',
                color: '#0f172a',
                fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, -apple-system, sans-serif",
            }}
        >
            <header
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(248, 250, 252, 0.88)',
                    borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
                }}
            >
                <div
                    style={{
                        maxWidth: 1500,
                        margin: '0 auto',
                        padding: '14px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                    }}
                >
                    <a
                        href="https://www.taxplanadvisor.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center' }}
                    >
                        <img
                            src={taxplanAdvisorLogo}
                            alt="Taxplan Advisor"
                            style={{ height: 38, width: 'auto', display: 'block' }}
                        />
                    </a>

                    {/* <button
                        type="button"
                        className="tp-btn"
                        onClick={() => navigate('/login')}
                        style={{
                            minHeight: 40,
                            padding: '0 16px',
                            borderRadius: 999,
                            border: '1px solid rgba(15, 23, 42, 0.12)',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Candidate Login
                    </button> */}
                </div>
            </header>

            <main style={{ maxWidth: 1500, margin: '0 auto', padding: '42px 24px 64px' }}>
                <section
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, 0.9fr)',
                        gap: 38,
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 12,
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#0f766e',
                            }}
                        >
                            Consultant Onboarding
                        </p>

                        <h1
                            style={{
                                margin: '10px 0 14px',
                                fontSize: 'clamp(2rem, 5vw, 4rem)',
                                lineHeight: 1.02,
                                letterSpacing: '-0.03em',
                                fontWeight: 800,
                                maxWidth: 800,
                            }}
                        >
                            <p>Join TaxPlan Advisor</p>
                            <p>as a Verified Consultant</p>
                        </h1>

                        <p
                            style={{
                                margin: 0,
                                maxWidth: 700,
                                fontSize: 17,
                                lineHeight: 1.65,
                                color: '#334155',
                            }}
                        >
                            This onboarding is designed for professionals seeking consultant access on TaxPlanAdvisor.
                            Complete profile verification, document checks, and consultant evaluation to move ahead.
                        </p>

                        <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {/* {highlights.map((item) => (
                                <span
                                    key={item}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        minHeight: 34,
                                        padding: '0 12px',
                                        borderRadius: 999,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: '#1e293b',
                                        background: 'rgba(255,255,255,0.72)',
                                        border: '1px solid rgba(15,23,42,0.1)',
                                    }}
                                >
                                    {item}
                                </span>
                            ))} */}
                        </div>

                        <div style={{ marginTop: 30, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="tp-btn"
                                onClick={() => navigate('/login')}
                                style={{
                                    minHeight: 50,
                                    padding: '0 22px',
                                    borderRadius: 12,
                                    border: 'none',
                                    background: '#059669',
                                    color: '#ffffff',
                                    fontSize: 15,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 14px 28px rgba(5, 150, 105, 0.24)',
                                }}
                            >
                                Start Onboarding
                            </button>

                            <a
                                href="#eligibility"
                                className="tp-btn"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    minHeight: 50,
                                    padding: '0 22px',
                                    borderRadius: 12,
                                    border: '1px solid rgba(15,23,42,0.16)',
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    fontSize: 15,
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                }}
                            >
                                Check Eligibility
                            </a>
                        </div>
                    </div>

                    <div
                        style={{
                            minHeight: 300,
                            borderRadius: 26,
                            background: '#fffbeb',
                            border: '1px solid #fcd34d',
                            padding: '26px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: 14,
                        }}
                    >
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b45309' }}>
                            Important
                        </p>
                        <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.2, fontWeight: 800, color: '#7c2d12' }}>
                            Assessment is desktop/laptop only
                        </h2>
                        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#78350f' }}>
                            Mobile devices are not supported for consultant assessment completion. Keep a working desktop or laptop with camera and microphone ready.
                        </p>
                        <div
                            style={{
                                marginTop: 4,
                                paddingTop: 12,
                                borderTop: '1px solid rgba(124,45,18,0.22)',
                            }}
                        >
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b45309' }}>
                                Time
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 15, lineHeight: 1.6, color: '#7c2d12', fontWeight: 700 }}>
                                10-15 min setup, then assessment + review
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    id="eligibility"
                    style={{
                        marginTop: 54,
                        paddingTop: 24,
                        borderTop: '1px solid rgba(15,23,42,0.1)',
                    }}
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(260px, 0.9fr) minmax(0, 1.1fr)',
                            gap: 22,
                            alignItems: 'stretch',
                        }}
                    >
                        <div style={{ padding: '4px 0' }}>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: '#0f766e',
                                }}
                            >
                                Checklist
                            </p>
                            <h2 style={{ margin: '8px 0 0', fontSize: 30, lineHeight: 1.1, letterSpacing: '-0.02em', fontWeight: 800 }}>
                                What to keep ready
                            </h2>
                            <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.7, color: '#334155' }}>
                                Keep these details and documents ready before you start to avoid delays.
                            </p>
                        </div>

                        <div
                            style={{
                                padding: '6px 0',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: 2,
                            }}
                        >
                            {requirements.map((item) => (
                                <div
                                    key={item}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 10,
                                        minHeight: 44,
                                        padding: '10px 0',
                                        borderBottom: '1px solid rgba(15,23,42,0.08)',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 20,
                                            height: 17,
                                            marginTop: 2,
                                            borderRadius: 999,
                                            background: 'transparent',
                                            border: '1.5px solid rgba(5,150,105,0.55)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#059669',
                                            fontSize: 11,
                                            fontWeight: 800,
                                            flexShrink: 0,
                                        }}
                                    >
                                        ✓
                                    </span>
                                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#0f172a', fontWeight: 600 }}>{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* <section
                    style={{
                        marginTop: 56,
                        padding: '26px 24px',
                        borderRadius: 20,
                        border: '1px solid rgba(15,23,42,0.12)',
                        background: 'linear-gradient(90deg, rgba(5,150,105,0.09) 0%, rgba(59,130,246,0.08) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 18,
                        flexWrap: 'wrap',
                    }}
                >
                    <div>
                        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                            Ready to begin your consultant onboarding?
                        </h3>
                        <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.65, color: '#334155' }}>
                            Use desktop/laptop for the assessment phase and keep your required documents ready.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="tp-btn"
                        onClick={() => navigate('/login')}
                        style={{
                            minHeight: 48,
                            padding: '0 20px',
                            borderRadius: 12,
                            border: 'none',
                            background: '#059669',
                            color: '#ffffff',
                            fontSize: 15,
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 12px 24px rgba(5,150,105,0.22)',
                        }}
                    >
                        Continue to Login
                    </button>
                </section> */}
            </main>

            <style>{`
                @media (max-width: 920px) {
                    main section:first-of-type {
                        grid-template-columns: 1fr !important;
                    }

                    #eligibility > div {
                        grid-template-columns: 1fr !important;
                    }
                }

                @media (max-width: 640px) {
                    header > div {
                        padding: 12px 16px !important;
                    }

                    main {
                        padding: 28px 16px 48px !important;
                    }

                    h1 {
                        font-size: clamp(1.7rem, 9vw, 2.35rem) !important;
                        line-height: 1.08 !important;
                    }

                    h2 {
                        font-size: 1.55rem !important;
                        line-height: 1.18 !important;
                    }

                    p {
                        line-height: 1.58 !important;
                    }

                    .tp-btn {
                        width: 100% !important;
                        justify-content: center !important;
                    }

                    #eligibility > div > div:last-child {
                        grid-template-columns: 1fr !important;
                        gap: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default PartnerInfo;
