import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument } from '../services/api';
import FileDropzone from '../components/FileDropzone';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { isAssessmentDeviceBlocked } from '../utils/devicePolicy';
import { useIsNarrowScreen } from '../utils/useViewport';

const DocumentUpload = () => {
    const navigate = useNavigate();
    const { updateStepFlags } = useAuth();
    const isPhoneScreen = useIsNarrowScreen(640);
    const pageHorizontalPadding = isPhoneScreen ? 16 : 32;

    const [requiredDegree, setRequiredDegree] = useState(null);
    const [masters, setMasters] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [error, setError] = useState('');
    const [requiredDegreeFixPrompt, setRequiredDegreeFixPrompt] = useState(null);

    const requiredDegreeRef = useRef(null);
    const masterRef = useRef(null);
    const certRef = useRef(null);

    const validateFile = (file) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowed.includes(file.type)) return 'Only PDF, JPG, PNG allowed.';
        if (file.size > 10 * 1024 * 1024) return 'File must be under 10MB.';
        return null;
    };

    const setRequiredDegreeFromFile = (file) => {
        if (!file) return;
        const err = validateFile(file);
        if (err) { setError(err); return; }
        setError('');
        setRequiredDegree(file);
    };

    const setMastersFromFile = (file) => {
        if (!file) return;
        const err = validateFile(file);
        if (err) { setError(err); return; }
        setError('');
        setMasters(file);
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

    const uploadRequiredDegree = async (file) => {
        try {
            await uploadDocument('Education', 'bachelors_degree', file);
            return;
        } catch (bachelorErr) {
            try {
                await uploadDocument('Education', 'ca_degree', file);
                return;
            } catch (caErr) {
                const bachelorMessage = bachelorErr?.response?.data?.error;
                const caMessage = caErr?.response?.data?.error;
                throw new Error(
                    caMessage
                    || bachelorMessage
                    || "Required degree verification failed. Please upload a valid Bachelor's or CA degree certificate."
                );
            }
        }
    };

    const handleUpload = async () => {
        const hasRequiredDegree = Boolean(requiredDegree);
        if (!hasRequiredDegree) { setError("Please upload either your Bachelor's degree or CA degree."); return; }
        setUploading(true);
        setError('');
        setRequiredDegreeFixPrompt(null);

        const optionalFiles = [];
        if (masters) optionalFiles.push({ file: masters, type: 'masters_degree' });
        certificates.forEach((f) => optionalFiles.push({ file: f, type: 'certificate' }));
        const totalUploads = 1 + optionalFiles.length;

        try {
            setUploadProgress(`Uploading 1 of ${totalUploads}...`);
            try {
                await uploadRequiredDegree(requiredDegree);
            } catch (err) {
                const serverMessage = err?.message || 'Upload failed. Please try again.';
                setRequiredDegree(null);
                setRequiredDegreeFixPrompt({
                    title: "Bachelor's / CA degree verification failed",
                    message: serverMessage,
                });
                return;
            }

            for (let i = 0; i < optionalFiles.length; i++) {
                setUploadProgress(`Uploading ${i + 2} of ${totalUploads}...`);
                try {
                    await uploadDocument('Education', optionalFiles[i].type, optionalFiles[i].file);
                } catch (err) {
                    const serverMessage = err?.response?.data?.error;
                    setError(serverMessage || 'Upload failed. Please try again.');
                    return;
                }
            }
            updateStepFlags({ has_documents: true });
            navigate(isAssessmentDeviceBlocked() ? '/assessment/device-required' : '/assessment/select');
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    const hasRequiredDegree = Boolean(requiredDegree);
    const totalFiles = (requiredDegree ? 1 : 0) + (masters ? 1 : 0) + certificates.length;
    const uploadCtaLabel = isPhoneScreen
        ? `Upload ${totalFiles} Document${totalFiles !== 1 ? 's' : ''} & Continue`
        : `Upload ${totalFiles} Document${totalFiles !== 1 ? 's' : ''} & Continue to Assessment \u2192`;

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <header style={{ background: '#0d1b2a', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ maxWidth: 1500, margin: '0 auto', padding: `0 ${pageHorizontalPadding}px`, height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BrandLogo />
                </div>
            </header>

            <div style={{ maxWidth: 700, margin: '0 auto', padding: `${isPhoneScreen ? 20 : 32}px ${pageHorizontalPadding}px 60px` }}>
            {requiredDegreeFixPrompt && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
                    <div className="animate-fade-in-up" style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 24, maxWidth: 520, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecaca' }}>
                                <span style={{ color: '#dc2626', fontWeight: 900 }}>!</span>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{requiredDegreeFixPrompt.title}</div>
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 16 }}>
                            {requiredDegreeFixPrompt.message}
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexDirection: isPhoneScreen ? 'column' : 'row' }}>
                            <button
                                type="button"
                                onClick={() => setRequiredDegreeFixPrompt(null)}
                                style={{ padding: '10px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', width: isPhoneScreen ? '100%' : 'auto' }}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => { setRequiredDegreeFixPrompt(null); requiredDegreeRef.current?.click(); }}
                                style={{ padding: '10px 14px', borderRadius: 10, fontWeight: 800, fontSize: 13, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', width: isPhoneScreen ? '100%' : 'auto' }}
                            >
                                Upload correct file
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: 28 }}>
                <span style={{ display: 'inline-block', fontSize: 16, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '4px 12px', borderRadius: 20, marginBottom: 12 }}>Step 4 of 6</span>
                <h1 style={{ fontSize: isPhoneScreen ? 21 : 24, fontWeight: 700, color: '#111827', margin: 0 }}>Upload Qualifications</h1>
                <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6, lineHeight: 1.6 }}>Upload your degree certificates and any additional qualifications before the assessment.</p>
            </div>

            <p style={{ fontSize: 13, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 12px', marginTop: -16, marginBottom: 28 }}>
                Upload your Bachelor's / CA degree. The name on the uploaded required degree must match your verified Government ID.
            </p>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: isPhoneScreen ? 16 : 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: isPhoneScreen ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexDirection: isPhoneScreen ? 'column' : 'row' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{'\u{1F393}'}</span>
                        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Bachelor's / CA Degree</h2>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: 12 }}>Required</span>
                </div>
                <FileDropzone
                    title="Bachelor's / CA degree"
                    subtitle={'PDF, JPG, PNG \u2022 Max 10MB'}
                    accept=".pdf,.jpg,.jpeg,.png"
                    files={requiredDegree ? [requiredDegree] : []}
                    pickerRef={requiredDegreeRef}
                    onFilesSelected={(picked) => setRequiredDegreeFromFile(picked?.[0] || null)}
                    onRemoveAt={() => setRequiredDegree(null)}
                    disabled={uploading}
                />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: isPhoneScreen ? 16 : 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: isPhoneScreen ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexDirection: isPhoneScreen ? 'column' : 'row' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{'\u{1F4DC}'}</span>
                        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Master's Degree</h2>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: 12 }}>Optional</span>
                </div>
                <FileDropzone
                    title="Master's degree"
                    subtitle={'Optional \u2022 PDF, JPG, PNG \u2022 Max 10MB'}
                    accept=".pdf,.jpg,.jpeg,.png"
                    files={masters ? [masters] : []}
                    pickerRef={masterRef}
                    onFilesSelected={(picked) => setMastersFromFile(picked?.[0] || null)}
                    onRemoveAt={() => setMasters(null)}
                    disabled={uploading}
                />
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: isPhoneScreen ? 16 : 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: isPhoneScreen ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexDirection: isPhoneScreen ? 'column' : 'row' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{'\u{1F4CB}'}</span>
                        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Certificates</h2>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: 12 }}>
                        {certificates.length}/5 {'\u2022 Optional'}
                    </span>
                </div>

                <FileDropzone
                    title="Certificates"
                    subtitle={'Optional \u2022 PDF, JPG, PNG \u2022 Max 10MB each'}
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
                disabled={uploading || !hasRequiredDegree}
                onMouseDown={(e) => { if (!uploading && hasRequiredDegree) e.currentTarget.style.transform = 'scale(0.99)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                style={{
                    width: '100%',
                    padding: isPhoneScreen ? '14px 12px' : '14px 0',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: isPhoneScreen ? 15 : 14,
                    lineHeight: 1.35,
                    border: 'none',
                    background: (uploading || !hasRequiredDegree) ? '#e5e7eb' : '#059669',
                    color: (uploading || !hasRequiredDegree) ? '#9ca3af' : '#fff',
                    cursor: (uploading || !hasRequiredDegree) ? 'not-allowed' : 'pointer',
                    transition: 'background 160ms ease, transform 120ms ease, box-shadow 160ms ease',
                    boxShadow: (uploading || !hasRequiredDegree) ? 'none' : '0 10px 18px rgba(5,150,105,0.15)',
                    textAlign: 'center',
                }}>
                {uploading ? uploadProgress : uploadCtaLabel}
            </button>
            </div>
        </div>
    );
};

export default DocumentUpload;
