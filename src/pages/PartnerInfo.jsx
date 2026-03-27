import { useNavigate } from 'react-router-dom';

const PartnerInfo = () => {
    const navigate = useNavigate();
    const CONTENT_WIDTH = 1000;
    const CONTENT_INSET = 28;
    const brand = {
        mirage: '#081828',
        mint: '#28C088',
        ocean: '#A0C8F0',
        platinum: '#E0E8E8',
    };

    const sectionTitle = (title) => (
        <h2
            style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1.2,
                color: brand.mirage,
                letterSpacing: '-0.01em',
            }}
        >
            {title}
        </h2>
    );

    const stepBlock = (stepNo, heading, body) => (
        <article
            style={{
                display: 'grid',
                gridTemplateColumns: '68px 1fr',
                gap: 16,
                alignItems: 'start',
                width: '100%',
            }}
        >
            <p
                aria-hidden="true"
                style={{
                    margin: 0,
                    fontSize: 44,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: 'rgba(8, 24, 40, 0.14)',
                    letterSpacing: '-0.03em',
                }}
            >
                {stepNo}
            </p>
            <div>
                <h3
                    style={{
                        margin: '0 0 8px',
                        fontSize: 20,
                        fontWeight: 700,
                        lineHeight: 1.3,
                        color: brand.mirage,
                    }}
                >
                    {heading}
                </h3>
                <p
                    style={{
                        margin: 0,
                        fontSize: 14,
                        lineHeight: 1.62,
                        color: '#475569',
                        textAlign: 'justify',
                        textAlignLast: 'left',
                        textJustify: 'inter-word',
                        hyphens: 'auto',
                        WebkitHyphens: 'auto',
                        MozHyphens: 'auto',
                        overflowWrap: 'break-word',
                    }}
                >
                    {body}
                </p>
            </div>
        </article>
    );

    return (
        <div
            className="tp-page"
            style={{
                minHeight: '100vh',
                background: '#ffffff',
                fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, -apple-system, sans-serif",
            }}
        >
            <header
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    background: 'rgba(255, 255, 255, 0.96)',
                    borderBottom: `1px solid ${brand.platinum}`,
                    backdropFilter: 'blur(10px)',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        minHeight: 64,
                        padding: '0 0 0 32px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <img
                        src="/Col_Log_1.png"
                        alt="Taxplan Advisor"
                        style={{
                            height: 40,
                            width: 'auto',
                            objectFit: 'contain',
                            display: 'block',
                        }}
                    />
                </div>
            </header>

            <main
                style={{
                    maxWidth: CONTENT_WIDTH,
                    margin: '0 auto',
                    padding: '38px 0 48px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 34,
                }}
            >
                <section
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 30,
                        maxWidth: CONTENT_WIDTH,
                        margin: '0 auto',
                        width: '100%',
                        padding: `0 ${CONTENT_INSET}px`,
                        boxSizing: 'border-box',
                    }}
                >
                    <section
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                            paddingTop: 4,
                        }}
                    >
                        <h1
                            style={{
                                margin: 0,
                                fontSize: 'clamp(1.95rem, 3.2vw, 2.8rem)',
                                lineHeight: 1.12,
                                fontWeight: 800,
                                letterSpacing: '-0.02em',
                                color: brand.mirage,
                                width: '100%',
                            }}
                        >
                            Become a Taxplan Advisor Partner
                        </h1>

                        <p
                            style={{
                                margin: 0,
                                fontSize: 16,
                                lineHeight: 1.65,
                                color: '#475569',
                                maxWidth: '100%',
                                textAlign: 'justify',
                                textAlignLast: 'left',
                                textJustify: 'inter-word',
                                hyphens: 'auto',
                                WebkitHyphens: 'auto',
                                MozHyphens: 'auto',
                                overflowWrap: 'break-word',
                            }}
                        >
                            This portal is for qualified tax and financial professionals seeking to partner with
                            Taxplan Advisor. Our onboarding process is designed to uphold high standards and ensure
                            lasting client trust.
                        </p>

                        <p
                            style={{
                                margin: 0,
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#64748b',
                                letterSpacing: '0.01em',
                                width: '100%',
                            }}
                        >
                            ~30 mins to complete &bull; Secure verification &bull; Portal access after approval
                        </p>
                    </section>

                    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {sectionTitle('How onboarding works')}

                        {stepBlock(
                            '01',
                            'Identity & Eligibility',
                            'Valid government ID, live face verification, and degree documents are required to validate profile authenticity before assessment.'
                        )}

                        {stepBlock(
                            '02',
                            'The Assessment',
                            'You complete 50 MCQ questions, video responses, and standard proctoring checks to confirm baseline readiness for client facing work.'
                        )}

                        {stepBlock(
                            '03',
                            'Review & Access',
                            'After successful submission and review, approved consultants receive immediate portal credential access.'
                        )}
                    </section>
                </section>

                <section
                    style={{
                        textAlign: 'justify',
                        textAlignLast: 'left',
                        textJustify: 'inter-word',
                        color: '#64748b',
                        fontSize: 12.5,
                        lineHeight: 1.75,
                        maxWidth: CONTENT_WIDTH,
                        margin: '0 auto',
                        width: '100%',
                        padding: `0 ${CONTENT_INSET}px`,
                        boxSizing: 'border-box',
                        hyphens: 'auto',
                        WebkitHyphens: 'auto',
                        MozHyphens: 'auto',
                        overflowWrap: 'break-word',
                    }}
                >
                    Approval is not automatic employment. Passing the assessment makes you eligible for activation
                    subject to verification and review. By continuing, you consent to camera and microphone usage for
                    identity verification and assessment integrity. By continuing, you agree to the portal terms and
                    privacy policy.
                </section>

                <section
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        width: '100%',
                        maxWidth: CONTENT_WIDTH,
                        margin: '0 auto',
                        padding: `0 ${CONTENT_INSET}px`,
                        boxSizing: 'border-box',
                    }}
                >
                    <button
                        className="tp-btn"
                        onClick={() => navigate('/login')}
                        style={{
                            minWidth: 320,
                            padding: '15px 30px',
                            borderRadius: 14,
                            border: 'none',
                            background: brand.mint,
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: 15,
                            fontWeight: 800,
                            letterSpacing: '0.01em',
                            boxShadow: '0 10px 24px rgba(40, 192, 136, 0.28)',
                        }}
                    >
                        Start Application <span className="tp-btn-icon">-&gt;</span>
                    </button>
                </section>
            </main>
        </div>
    );
};

export default PartnerInfo;
