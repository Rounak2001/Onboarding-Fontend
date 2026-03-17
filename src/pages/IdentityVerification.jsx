import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadIdentityDocument } from '../services/api';
import { useAuth } from '../context/AuthContext';
import FileDropzone from '../components/FileDropzone';
import AccountControls from '../components/AccountControls';
import BrandLogo from '../components/BrandLogo';

const IdentityVerification = () => {
    const navigate = useNavigate();
    const { updateStepFlags, user, logout } = useAuth();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [mismatchDetails, setMismatchDetails] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const setIdentityFileFromFile = (selected) => {
        if (!selected) return;
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(selected.type)) {
            setError('Only JPG/PNG files accepted.');
            return;
        }
        if (selected.size > 5 * 1024 * 1024) {
            setError('File must be under 5MB.');
            return;
        }
        setError('');
        setMismatchDetails(null);
        setFile(selected);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(selected));
    };

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        setIdentityFileFromFile(selected);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError('');
        setMismatchDetails(null);
        try {
            const formData = new FormData();
            formData.append('identity_document', file);
            const response = await uploadIdentityDocument(formData);

            if (response.verification?.status === 'Verified') {
                updateStepFlags({ has_identity_doc: true });
                navigate('/onboarding/face-verification');
            } else {
                const status = response?.verification?.status || 'Invalid';
                setError(`Document verification failed (${status}). Please upload a valid Government ID.`);
            }
        } catch (err) {
            console.log('=== IDENTITY UPLOAD ERROR ===');
            console.log('err.response?.status:', err?.response?.status);
            console.log('err.response?.data:', err?.response?.data);
            const backendError = err?.response?.data?.error;
            const backendCode = err?.response?.data?.code;
            const verification = err?.response?.data?.verification;

            if (backendCode === 'PERSONAL_DETAILS_MISMATCH') {
                const issues = [];
                if (verification?.name_match === false) {
                    issues.push(`Name on ID does not match your profile (${verification.name_similarity_pct || 0}% similarity)`);
                }
                if (verification?.dob_match === false) {
                    issues.push('Date of Birth on ID does not match your profile');
                }
                if (issues.length === 0) {
                    issues.push('Details on ID do not match your profile');
                }
                setMismatchDetails(issues);
                setError('Your personal details do not match the uploaded Government ID.');
                // Clear the uploaded file so they can retry
                setFile(null);
                if (preview) URL.revokeObjectURL(preview);
                setPreview(null);
                setUploading(false);
                return;
            }
            if (backendCode === 'IDENTITY_INVALID') {
                setError(backendError || 'Document verification failed. Please upload a valid government ID.');
            } else if (backendCode === 'GEMINI_QUOTA_EXCEEDED' || backendCode === 'IDENTITY_VERIFICATION_UNAVAILABLE') {
                const retryIn = verification?.retry_in_s;
                setError(
                    retryIn
                        ? `Identity verification is temporarily unavailable. Please retry in ~${retryIn}s.`
                        : 'Identity verification is temporarily unavailable. Please try again in a few minutes.'
                );
            } else {
                setError(backendError || 'Upload failed. Please try again.');
            }
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    const containerStyle = { maxWidth: 700, margin: '0 auto', padding: '32px 32px 60px' };
    const cardStyle = { background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 };

    const handleSignOut = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="tp-page" style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <header style={{ background: '#0d1b2a', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BrandLogo />
                    <div style={{ marginLeft: 'auto' }}>
                        <AccountControls email={user?.email} onSignOut={handleSignOut} compact />
                    </div>
                </div>
            </header>

            <div style={containerStyle}>
                <div style={{ marginBottom: 28 }}>
                    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '4px 12px', borderRadius: 20, marginBottom: 12 }}>Step 2 of 5</span>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Identity Verification</h1>
                    <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Upload a clear government-issued ID for verification.</p>
                    <div style={{ marginTop: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 12px' }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.45 }}>
                            Warning: You may upload masked or unmasked ID. If you upload unmasked ID, you are responsible for sharing sensitive details.
                        </p>
                    </div>
                </div>

                <div style={cardStyle}>
                    {!preview ? (
                        <FileDropzone
                            title="Government ID"
                            subtitle="JPG, JPEG or PNG • Max 5MB"
                            helperText="Drag & drop or click to upload."
                            accept="image/jpeg,image/jpg,image/png"
                            files={file ? [file] : []}
                            pickerRef={fileInputRef}
                            onFilesSelected={(picked) => setIdentityFileFromFile(picked?.[0] || null)}
                            onRemoveAt={() => {
                                setFile(null);
                                if (preview) URL.revokeObjectURL(preview);
                                setPreview(null);
                                setMismatchDetails(null);
                                setError('');
                            }}
                            disabled={uploading}
                            error={error}
                        />
                    ) : (
                        <div>
                            <div style={{ background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 16 }}>
                                <img src={preview} alt="ID Preview" style={{ maxHeight: 320, margin: '0 auto', display: 'block', objectFit: 'contain', padding: 16 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    className="tp-btn"
                                    onClick={() => {
                                        setFile(null);
                                        if (preview) URL.revokeObjectURL(preview);
                                        setPreview(null);
                                        setMismatchDetails(null);
                                        setError('');
                                    }}
                                    style={{ flex: 1, padding: '12px 0', borderRadius: 8, fontWeight: 500, fontSize: 14, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer' }}
                                >
                                    Choose Different
                                </button>
                                <button
                                    className="tp-btn"
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    style={{
                                        flex: 1,
                                        padding: '12px 0',
                                        borderRadius: 8,
                                        fontWeight: 600,
                                        fontSize: 14,
                                        border: 'none',
                                        background: uploading ? '#e5e7eb' : '#059669',
                                        color: uploading ? '#9ca3af' : '#fff',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {uploading ? 'Verifying...' : 'Upload and Continue'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 20px' }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#dc2626', marginBottom: mismatchDetails ? 8 : 0 }}>{error}</p>
                        {mismatchDetails && mismatchDetails.length > 0 && (
                            <div>
                                <ul style={{ margin: '4px 0 12px', paddingLeft: 20 }}>
                                    {mismatchDetails.map((issue, i) => (
                                        <li key={i} style={{ fontSize: 13, color: '#991b1b', marginBottom: 2 }}>{issue}</li>
                                    ))}
                                </ul>
                                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
                                    Please update your profile details to match your Government ID exactly, then come back and upload again.
                                </p>
                                <button
                                    onClick={() => navigate('/onboarding', {
                                        state: {
                                            identityMismatchMessage: 'Please update your details to match your Government ID exactly, then upload the ID again.',
                                        },
                                    })}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: 8,
                                        fontWeight: 600,
                                        fontSize: 14,
                                        border: 'none',
                                        background: '#f59e0b',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    ← Update Profile Details
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IdentityVerification;
