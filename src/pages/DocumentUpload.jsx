import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument } from '../services/api';
import FileDropzone from '../components/FileDropzone';
import { useAuth } from '../context/AuthContext';
import AccountControls from '../components/AccountControls';

const DocumentUpload = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Individual file states
    const [bachelors, setBachelors] = useState(null);
    const [masters, setMasters] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [error, setError] = useState('');
    const [bachelorsFixPrompt, setBachelorsFixPrompt] = useState(null); // { title, message }

    const bachelorRef = useRef(null);
    const masterRef = useRef(null);
    const certRef = useRef(null);

    const validateFile = (file) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.type)) return 'Only PDF, JPG, PNG allowed.';
        if (file.size > 10 * 1024 * 1024) return 'File must be under 10MB.';
        return null;
    };

    const setBachelorsFromFile = (file) => {
        if (!file) return;
        const err = validateFile(file);
        if (err) { setError(err); return; }
        setError(''); setBachelors(file);
    };

    const setMastersFromFile = (file) => {
        if (!file) return;
        const err = validateFile(file);
        if (err) { setError(err); return; }
        setError(''); setMasters(file);
    };

    const addCertificatesFromFiles = (incomingFiles) => {
        const newFiles = Array.from(incomingFiles || []).filter(Boolean);
        if (newFiles.length === 0) return;
        if (certificates.length + newFiles.length > 5) { setError('Maximum 5 certificates allowed.'); return; }
        for (const f of newFiles) {
            const err = validateFile(f);
            if (err) { setError(err); return; }
        }
        setError('');
        setCertificates(prev => [...prev, ...newFiles]);
    };

    const removeCert = (i) => setCertificates(prev => prev.filter((_, idx) => idx !== i));

    const handleUpload = async () => {
        if (!bachelors) { setError("Please upload your Bachelor's degree."); return; }
        setUploading(true); setError('');
        setBachelorsFixPrompt(null);

        const allFiles = [];
        allFiles.push({ file: bachelors, type: 'bachelors_degree' });
        if (masters) allFiles.push({ file: masters, type: 'masters_degree' });
        certificates.forEach(f => allFiles.push({ file: f, type: 'certificate' }));

        try {
            for (let i = 0; i < allFiles.length; i++) {
                setUploadProgress(`Uploading ${i + 1} of ${allFiles.length}...`);
                try {
                    await uploadDocument('Education', allFiles[i].type, allFiles[i].file);
                } catch (err) {
                    const docType = allFiles[i].type;
                    const serverMessage = err?.response?.data?.error;
                    if (docType === 'bachelors_degree') {
                        setBachelors(null);
                        setBachelorsFixPrompt({
                            title: "Bachelor's degree verification failed",
                            message: serverMessage || "Please upload the correct Bachelor's degree certificate.",
                        });
                        return;
                    }
                    setError(serverMessage || 'Upload failed. Please try again.');
                    return;
                }
            }
            navigate('/onboarding/complete');
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    const totalFiles = (bachelors ? 1 : 0) + (masters ? 1 : 0) + certificates.length;

    const handleSignOut = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="tp-page" style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, background: '#059669', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>T</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#111827', fontSize: 15 }}>Taxplan Advisor</span>
                    <div style={{ marginLeft: 'auto' }}>
                        <AccountControls email={user?.email} onSignOut={handleSignOut} />
                    </div>
                </div>
            </header>

            {bachelorsFixPrompt && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
                    <div className="animate-fade-in-up" style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 24, maxWidth: 520, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecaca' }}>
                                <span style={{ color: '#dc2626', fontWeight: 900 }}>!</span>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{bachelorsFixPrompt.title}</div>
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 16 }}>
                            {bachelorsFixPrompt.message}
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setBachelorsFixPrompt(null)}
                                style={{ padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => { setBachelorsFixPrompt(null); bachelorRef.current?.click(); }}
                                style={{ padding: '10px 14px', borderRadius: 10, fontWeight: 800, fontSize: 13, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer' }}
                            >
                                Upload correct file
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 32px 60px' }}>
                <div style={{ marginBottom: 28 }}>
                    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '4px 12px', borderRadius: 20, marginBottom: 12 }}>Step 5 of 5</span>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Upload Qualifications</h1>
                    <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Upload your degree certificates and any additional qualifications.</p>
                </div>

                {/* 1. Bachelor's Degree (Required) */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>🎓</span>
                            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Bachelor's Degree</h2>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: 12 }}>Required</span>
                    </div>
                    <FileDropzone
                        title="Bachelor's degree"
                        subtitle="PDF, JPG, PNG • Max 10MB"
                        accept=".pdf,.jpg,.jpeg,.png"
                        files={bachelors ? [bachelors] : []}
                        pickerRef={bachelorRef}
                        onFilesSelected={(picked) => setBachelorsFromFile(picked?.[0] || null)}
                        onRemoveAt={() => setBachelors(null)}
                        disabled={uploading}
                    />
                </div>

                {/* 2. Master's Degree (Optional) */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>📜</span>
                            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Master's Degree</h2>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: 12 }}>Optional</span>
                    </div>
                    <FileDropzone
                        title="Master's degree"
                        subtitle="Optional • PDF, JPG, PNG • Max 10MB"
                        accept=".pdf,.jpg,.jpeg,.png"
                        files={masters ? [masters] : []}
                        pickerRef={masterRef}
                        onFilesSelected={(picked) => setMastersFromFile(picked?.[0] || null)}
                        onRemoveAt={() => setMasters(null)}
                        disabled={uploading}
                    />
                </div>

                {/* 3. Certificates (up to 5) */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>📋</span>
                            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Certificates</h2>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: 12 }}>
                            {certificates.length}/5 • Optional
                        </span>
                    </div>

                    <FileDropzone
                        title="Certificates"
                        subtitle="Optional • PDF, JPG, PNG • Max 10MB each"
                        helperText="You can upload up to 5 certificates."
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        maxFiles={5}
                        files={certificates}
                        pickerRef={certRef}
                        onFilesSelected={(picked) => addCertificatesFromFiles(picked)}
                        onRemoveAt={(idx) => removeCert(idx)}
                        disabled={uploading}
                    />
                </div>

                {error && <div style={{ marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#dc2626' }}>{error}</div>}

                <button
                    className="tp-btn"
                    onClick={handleUpload}
                    disabled={uploading || !bachelors}
                    onMouseDown={(e) => { if (!uploading && bachelors) e.currentTarget.style.transform = 'scale(0.99)'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    style={{
                        width: '100%', padding: '14px 0', borderRadius: 10, fontWeight: 600, fontSize: 14, border: 'none',
                        background: (uploading || !bachelors) ? '#e5e7eb' : '#059669',
                        color: (uploading || !bachelors) ? '#9ca3af' : '#fff',
                        cursor: (uploading || !bachelors) ? 'not-allowed' : 'pointer',
                        transition: 'background 160ms ease, transform 120ms ease, box-shadow 160ms ease',
                        boxShadow: (uploading || !bachelors) ? 'none' : '0 10px 18px rgba(5,150,105,0.15)',
                    }}>
                    {uploading ? uploadProgress : `Upload ${totalFiles} Document${totalFiles !== 1 ? 's' : ''} & Complete →`}
                </button>
            </div>
        </div>
    );
};

export default DocumentUpload;
