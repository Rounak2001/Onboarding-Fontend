import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { verifyFace } from '../services/api';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

const FaceVerification = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const webcamRef = useRef(null);

    const [capturedImage, setCapturedImage] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setCapturedImage(imageSrc);
            setError('');
        }
    }, []);

    const handleReuploadId = useCallback(() => {
        navigate('/onboarding/identity', {
            state: error
                ? {
                    faceMismatchMessage: 'Your live photo did not match the current uploaded ID. If your ID photo is old, upload a newer valid government ID and try face verification again.',
                }
                : undefined,
        });
    }, [error, navigate]);

    const handleVerify = async () => {
        if (!capturedImage) return;
        setVerifying(true);
        setError('');
        try {
            const result = await verifyFace(user?.id, { live_photo_base64: capturedImage });
            if (result.match) {
                updateUser({ ...user, is_verified: true });
                navigate('/success');
            } else {
                setError(`Face did not match (similarity: ${result.similarity?.toFixed(1)}%). Please retry live photo or change your uploaded ID.`);
                setCapturedImage(null);
            }
        } catch (err) {
            setError('Verification failed. Please retry live photo or change your uploaded ID.');
            setCapturedImage(null);
            console.error(err);
        } finally {
            setVerifying(false);
        }
    };

    const btnPrimary = (disabled) => ({
        flex: 1,
        padding: '14px 18px',
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 15,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? '#e5e7eb' : '#059669',
        color: disabled ? '#9ca3af' : '#fff',
        boxShadow: disabled ? 'none' : '0 14px 30px rgba(5,150,105,0.18)',
        transition: 'transform 140ms ease, box-shadow 180ms ease, background 180ms ease, opacity 180ms ease',
    });

    const btnSecondary = {
        flex: 1,
        padding: '14px 18px',
        borderRadius: 12,
        fontWeight: 600,
        fontSize: 14,
        border: '1px solid #d1fae5',
        background: '#f8fffb',
        color: '#065f46',
        cursor: 'pointer',
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
        transition: 'transform 140ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease',
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <header style={{ background: '#0d1b2a', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BrandLogo />
                </div>
            </header>

            <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 32px 60px' }}>
                <div style={{ marginBottom: 28 }}>
                    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '4px 12px', borderRadius: 20, marginBottom: 12 }}>Step 3 of 6</span>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Face Verification</h1>
                    <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Now take a live photo using your webcam to verify your identity against the ID you uploaded.</p>
                </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>{'\u{1F4F8} Live Capture'}</h2>
                    <button
                        className="tp-btn"
                        onClick={handleReuploadId}
                        style={{
                            fontSize: 13,
                            color: '#059669',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            cursor: 'pointer',
                            fontWeight: 700,
                            borderRadius: 999,
                            padding: '10px 14px',
                            boxShadow: '0 8px 20px rgba(5,150,105,0.08)',
                            transition: 'transform 140ms ease, box-shadow 180ms ease, background 180ms ease',
                        }}
                    >
                        {'\u2190 Change Uploaded ID'}
                    </button>
                </div>

                <div style={{ aspectRatio: '16/9', background: '#111827', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                    {capturedImage ? (
                        <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            mirrored={true}
                        />
                    )}
                </div>

                {!capturedImage ? (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280', background: '#f9fafb', borderRadius: 8, padding: '10px 14px', border: '1px solid #e5e7eb', marginBottom: 16 }}>
                            <span>{'\u{1F4A1}'}</span><span>Position your face clearly in the frame with good lighting.</span>
                        </div>
                        <button className="tp-btn" onClick={capture} style={{ ...btnPrimary(false), width: '100%', flex: 'none' }}>
                            {'\u{1F4F8} Capture Photo'}
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="tp-btn" onClick={() => { setCapturedImage(null); setError(''); }} style={btnSecondary}>Retake</button>
                        <button className="tp-btn" onClick={handleVerify} disabled={verifying} style={btnPrimary(verifying)}>
                            {verifying ? 'Verifying...' : 'Verify Face \u2192'}
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div
                    style={{
                        marginTop: 18,
                        borderRadius: 16,
                        border: '1px solid #fecaca',
                        background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)',
                        padding: '16px 18px',
                        boxShadow: '0 12px 28px rgba(220, 38, 38, 0.08)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                flexShrink: 0,
                                background: '#fff',
                                border: '1px solid #fecaca',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#dc2626',
                                fontSize: 16,
                                fontWeight: 800,
                            }}
                        >
                            !
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.4, color: '#991b1b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Verification Warning
                            </div>
                            <p style={{ margin: 0, fontSize: 14, color: '#b91c1c', lineHeight: 1.65 }}>
                                {error}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default FaceVerification;
