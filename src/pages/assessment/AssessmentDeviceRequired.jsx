import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { isAssessmentDeviceBlocked } from '../../utils/devicePolicy';

const AssessmentDeviceRequired = () => {
    const navigate = useNavigate();
    const { getNextRoute } = useAuth();
    const [recheckError, setRecheckError] = useState('');

    const handleDesktopRecheck = () => {
        if (isAssessmentDeviceBlocked()) {
            setRecheckError('We still detect a mobile or tablet browser. Please open this same link on a desktop or laptop.');
            return;
        }

        setRecheckError('');
        navigate(getNextRoute(), { replace: true });
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <header style={{ background: '#0d1b2a', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ maxWidth: 1500, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center' }}>
                    <BrandLogo />
                </div>
            </header>

            <main style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 40px' }}>
                <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '22px 18px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.07)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '6px 10px', borderRadius: 999, border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#047857', fontSize: 12, fontWeight: 600 }}>
                        Profile and document verification complete
                    </div>

                    <h1 style={{ fontSize: 24, lineHeight: 1.25, color: '#0f172a', margin: '0 0 14px', fontWeight: 700 }}>
                        Desktop or Laptop Required for Assessment
                    </h1>

                    <p style={{ fontSize: 14, lineHeight: 1.65, color: '#334155', margin: '0 0 10px' }}>
                        Your profile and document verification are complete.
                    </p>
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: '#334155', margin: '0 0 10px' }}>
                        The next step is a proctored assessment, which is available only on a desktop or laptop.
                    </p>
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: '#334155', margin: 0 }}>
                        Please reopen this link on a desktop or laptop with camera and microphone enabled to continue. Your progress has been saved.
                    </p>

                    {recheckError && (
                        <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 10, border: '1px solid #fed7aa', background: '#fff7ed', color: '#9a3412', fontSize: 13, lineHeight: 1.5 }}>
                            {recheckError}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleDesktopRecheck}
                        style={{
                            marginTop: 20,
                            width: '100%',
                            border: 'none',
                            borderRadius: 12,
                            padding: '13px 16px',
                            background: '#059669',
                            color: '#ffffff',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 8px 18px rgba(5, 150, 105, 0.25)',
                        }}
                    >
                        I am on desktop now
                    </button>
                </section>
            </main>
        </div>
    );
};

export default AssessmentDeviceRequired;
