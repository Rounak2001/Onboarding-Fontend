import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { readResponsePayload } from '../../utils/http';
import { clearAdminSession, getAdminRole, getAdminToken } from '../../utils/adminSession';
import AdminThemeToggle from './AdminThemeToggle';
import AdminBrandLogo from './AdminBrandLogo';
import { useAdminTheme } from './adminTheme';

const CALL_STATUS_OPTIONS = [
    { value: '', label: 'Not Set' },
    { value: 'not_called', label: 'Not Called' },
    { value: 'called', label: 'Called' },
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'rejected', label: 'Rejected' },
];

const buildCallTrackingDraft = (profile = {}) => ({
    caller_id: '',
    call_status: '',
    is_rejected: false,
    comments: '',
    issue_facing: '',
    next_follow_up: '',
});

const ConsultantDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isLight, themeVars, toggleTheme } = useAdminTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [restoringSessionId, setRestoringSessionId] = useState(null);
    const [restoringVideoSessionId, setRestoringVideoSessionId] = useState(null);
    const [credentialsPopup, setCredentialsPopup] = useState(null);
    const [error, setError] = useState('');
    const [openSections, setOpenSections] = useState({
        profile: true, identity: true, face: true, assessment: true, documents: true, feedback: true, callTracking: true,
    });
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);
    const [selectedVideoCard, setSelectedVideoCard] = useState(null);
    const [callerOptions, setCallerOptions] = useState([]);
    const [callTrackingDraft, setCallTrackingDraft] = useState(buildCallTrackingDraft());
    const [callLogs, setCallLogs] = useState([]);
    const [savingCallTracking, setSavingCallTracking] = useState(false);
    const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);
    const [viewportWidth, setViewportWidth] = useState(
        () => (typeof window !== 'undefined' ? window.innerWidth : 1280),
    );
    const renderInBody = (node) => (typeof document !== 'undefined' ? createPortal(node, document.body) : node);
    const isMobile = viewportWidth <= 768;

    const token = getAdminToken();
    const adminRole = getAdminRole();
    const canManageRestrictedActions = adminRole === 'super_admin';

    useEffect(() => {
        if (!token) { navigate(adminUrl()); return; }
        fetchDetail();
    }, [id]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchDetail = async () => {
        try {
            const res = await fetch(apiUrl(`/admin-panel/consultants/${id}/`), {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            if (res.status === 401 || res.status === 403) { clearAdminSession(); navigate(adminUrl()); return; }
            if (res.status === 404) { setError('Consultant not found'); setLoading(false); return; }
            const d = await res.json();
            setData(d);
            setCallerOptions(d.caller_options || []);
            setCallTrackingDraft(buildCallTrackingDraft());
            setCallLogs(d.call_logs || []);
            const initialFeedback = Array.isArray(d?.feedback_entries) && d.feedback_entries.length > 0
                ? d.feedback_entries[0]
                : d?.feedback;
            setSelectedFeedbackId(initialFeedback?.id ?? null);
        } catch { setError('Failed to load data'); }
        finally { setLoading(false); }
    };

    const handleCallTrackingChange = (field, value) => {
        setCallTrackingDraft((prev) => ({ ...prev, [field]: value }));
    };

    const handleSaveCallTracking = async () => {
        setSavingCallTracking(true);
        try {
            const res = await fetch(apiUrl(`/admin-panel/consultants/${id}/call-tracking/`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(callTrackingDraft),
            });
            const payload = await readResponsePayload(res);

            if (res.status === 401 || res.status === 403) {
                clearAdminSession();
                navigate(adminUrl());
                return;
            }
            if (!res.ok) {
                alert(payload.error || 'Failed to save call tracking');
                return;
            }

            const updated = payload.consultant || {};
            const newCallLog = payload.call_log;
            setData((prev) => ({
                ...prev,
                profile: {
                    ...(prev?.profile || {}),
                    ...updated,
                },
            }));
            setCallTrackingDraft(buildCallTrackingDraft());
            if (newCallLog) {
                setCallLogs((prev) => [newCallLog, ...prev]);
            }
            alert(payload.message || 'Call entry added successfully.');
        } catch {
            alert('Failed to connect to server');
        } finally {
            setSavingCallTracking(false);
        }
    };

    const generateCredentialsRequest = async (forcePhoneReassign = false) => {
        const body = forcePhoneReassign ? { force_phone_reassign: true } : {};
        return fetch(apiUrl(`/admin-panel/consultants/${id}/generate-credentials/`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        });
    };

    const handleGenerateCredentials = async () => {
        if (!window.confirm("Are you sure you want to generate and email credentials to this consultant?")) return;
        setGenerating(true);
        try {
            let res = await generateCredentialsRequest(false);
            let d = await readResponsePayload(res);

            if (res.status === 401) {
                clearAdminSession();
                navigate(adminUrl());
                return;
            }
            if (res.status === 403) {
                alert(d?.detail || d?.error || 'You do not have permission to generate credentials.');
                return;
            }

            if (!res.ok) {
                const errorMessage = d?.error || 'Failed to generate credentials';
                const isClientPhoneConflict =
                    typeof errorMessage === 'string' &&
                    errorMessage.includes('phone number') &&
                    errorMessage.includes('(CLIENT)');

                if (isClientPhoneConflict) {
                    const forceProceed = window.confirm(
                        `${errorMessage}\n\n` +
                        'To continue, we can reassign this phone number from the existing CLIENT account to this consultant account. Continue?'
                    );

                    if (forceProceed) {
                        res = await generateCredentialsRequest(true);
                        d = await readResponsePayload(res);
                        if (res.status === 401) {
                            clearAdminSession();
                            navigate(adminUrl());
                            return;
                        }
                        if (res.status === 403) {
                            alert(d?.detail || d?.error || 'You do not have permission to generate credentials.');
                            return;
                        }
                    } else {
                        alert(`Error: ${errorMessage}`);
                        return;
                    }
                }
            }

            if (res.ok) {
                setCredentialsPopup({ username: d.username, password: d.password, message: d.message });
                fetchDetail();
            } else {
                alert(`Error: ${d?.error || 'Failed to generate credentials'}`);
            }
        } catch (_err) {
            alert('Failed to connect to server');
        } finally {
            setGenerating(false);
        }
    };

    const handleRefresh = () => {
        fetchDetail();
    };

    const handleDeleteConsultant = async () => {
        if (!window.confirm('Delete this consultant permanently? This cannot be undone.')) return;
        setDeleting(true);
        try {
            const res = await fetch(apiUrl(`/admin-panel/consultants/${id}/delete/`), {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            const d = await readResponsePayload(res);
            if (res.status === 401) {
                clearAdminSession();
                navigate(adminUrl());
                return;
            }
            if (res.status === 403) {
                alert(d.detail || d.error || 'You do not have permission to delete consultants.');
                return;
            }
            if (!res.ok) {
                alert(`Error: ${d.error || 'Failed to delete consultant'}`);
                return;
            }
            navigate(adminUrl('dashboard'));
        } catch {
            alert('Failed to connect to server');
        } finally {
            setDeleting(false);
        }
    };

    const handleRestoreAssessment = async (sessionId) => {
        if (!window.confirm('Restore this violated session and reset violation count to 0?')) return;
        setRestoringSessionId(sessionId);
        try {
            const res = await fetch(apiUrl(`/admin-panel/consultants/${id}/restore-assessment/`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ session_id: sessionId }),
            });
            const payload = await readResponsePayload(res);

            if (res.status === 401 || res.status === 403) {
                clearAdminSession();
                navigate(adminUrl());
                return;
            }

            if (!res.ok) {
                alert(`Error: ${payload.error || 'Failed to restore assessment session'}`);
                return;
            }

            alert(payload.message || 'Assessment session restored successfully.');
            fetchDetail();
        } catch {
            alert('Failed to connect to server');
        } finally {
            setRestoringSessionId(null);
        }
    };

    const handleRestoreVideoAssessment = async (sessionId) => {
        if (!window.confirm('Restore video stage for this session? This will clear existing video responses and reopen video upload from Question 1.')) return;
        setRestoringVideoSessionId(sessionId);
        try {
            const res = await fetch(apiUrl(`/admin-panel/consultants/${id}/restore-video-assessment/`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ session_id: sessionId }),
            });
            const payload = await readResponsePayload(res);

            if (res.status === 401 || res.status === 403) {
                clearAdminSession();
                navigate(adminUrl());
                return;
            }

            if (!res.ok) {
                alert(`Error: ${payload.error || 'Failed to restore video stage'}`);
                return;
            }

            alert(payload.message || 'Video stage restored successfully.');
            fetchDetail();
        } catch {
            alert('Failed to connect to server');
        } finally {
            setRestoringVideoSessionId(null);
        }
    };

    const toggle = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

    // Styles
    const sectionStyle = {
        background: 'var(--admin-surface)', borderRadius: 14,
        border: '1px solid var(--admin-border-soft)', marginBottom: 16, overflow: 'hidden',
    };

    const sectionHeader = (title, key, icon, action = null) => (
        <div onClick={() => toggle(key)} style={{
            padding: isMobile ? '14px 12px' : '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? 8 : 12,
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            cursor: 'pointer',
            borderBottom: openSections[key] ? '1px solid rgba(148,163,184,0.08)' : 'none',
            transition: 'background 0.15s',
        }}
            onMouseEnter={(e) => e.currentTarget.style.background = isLight ? 'rgba(59,130,246,0.06)' : 'rgba(16,185,129,0.03)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--admin-text-primary)', flex: 1 }}>{title}</span>
            {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
            <span style={{
                color: 'var(--admin-text-muted)', fontSize: 18, fontWeight: 300,
                transform: openSections[key] ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
            }}>▾</span>
        </div>
    );

    const fieldRow = (label, value) => {
        const isEmpty = value === null || value === undefined || value === '';
        return (
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 4 : 0,
                padding: '10px 0',
                borderBottom: '1px solid rgba(148,163,184,0.06)',
            }}>
                <span style={{ width: isMobile ? 'auto' : 180, fontSize: 13, color: 'var(--admin-text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--admin-text-primary)', fontWeight: 500, wordBreak: 'break-all' }}>
                    {isEmpty ? <span style={{ color: 'var(--admin-text-muted)' }}>—</span> : value}
                </span>
            </div>
        );
    };

    const statusTag = (val, trueText, falseText) => (
        <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: val ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
            color: val ? '#34d399' : '#f87171',
        }}>
            {val ? trueText : falseText}
        </span>
    );

    const isPdf = (url) => url && url.split('?')[0].toLowerCase().endsWith('.pdf');

    const imgStyle = {
        maxWidth: '100%', maxHeight: 300, borderRadius: 8,
        border: '1px solid var(--admin-border-mid)', objectFit: 'contain',
        background: 'var(--admin-surface-strong)',
    };
    const formInputStyle = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--admin-surface-strong)',
        border: '1px solid var(--admin-border-mid)',
        color: 'var(--admin-text-primary)',
        fontSize: 13,
        outline: 'none',
        boxSizing: 'border-box',
    };
    const formTextAreaStyle = {
        ...formInputStyle,
        minHeight: 110,
        resize: 'vertical',
        fontFamily: 'inherit',
    };

    if (loading) return (
        <div style={{
            ...themeVars,
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--admin-page-bg)',
            fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--admin-text-muted)',
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: 40, height: 40, border: '3px solid var(--admin-border-strong)', borderTopColor: '#10b981',
                    borderRadius: '50%', margin: '0 auto 16px',
                    animation: 'spin 0.8s linear infinite',
                }} />
                Loading consultant data...
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
        </div>
    );

    if (error) return (
        <div style={{
            ...themeVars,
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--admin-page-bg)',
            fontFamily: "'Inter', system-ui, sans-serif", color: '#f87171',
        }}>
            {error}
        </div>
    );

    const p = data?.profile || {};
    const identityDocs = data?.identity_documents || [];
    const faceRecords = data?.face_verification || [];
    const sessions = data?.assessment_sessions || [];
    const isCandidateDisqualified = Boolean(data?.assessment_summary?.disqualified);
    const isCredentialsFailed = p.assessment_status === 'Credentials Failed';
    const qualDocs = data?.documents?.qualification_documents || [];
    const consultDocs = data?.documents?.consultant_documents || [];
    const feedback = data?.feedback;
    const feedbackEntries = Array.isArray(data?.feedback_entries) ? data.feedback_entries : (feedback ? [feedback] : []);
    const activeFeedback = feedbackEntries.find((entry) => entry.id === selectedFeedbackId) || feedbackEntries[0] || null;
    const totalCallAttempts = callLogs.length;

    return (
        <div className="tp-page" style={{
            ...themeVars,
            minHeight: '100vh',
            background: 'var(--admin-page-bg)',
            fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--admin-text-strong)',
        }}>
            {/* Header */}
            <header style={{
                background: 'var(--admin-header-bg)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--admin-border-soft)',
                position: 'sticky', top: 0, zIndex: 30,
            }}>
                <div style={{
                    maxWidth: 1500,
                    margin: '0 auto',
                    padding: isMobile ? '10px 12px' : '0 32px',
                    minHeight: 60,
                    display: 'flex',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    gap: isMobile ? 10 : 14,
                }}>
                    <AdminBrandLogo isLight={isLight} height={26} />
                    <button onClick={() => navigate(adminUrl('dashboard'))} style={{
                        padding: isMobile ? '7px 10px' : '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)',
                        border: '1px solid var(--admin-border-mid)', cursor: 'pointer',
                    }}>
                        ← Back
                    </button>
                    <div style={{ flex: 1, minWidth: isMobile ? '100%' : 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--admin-text-strong)', display: 'inline-block', wordBreak: 'break-word' }}>{p.full_name || p.email}</span>
                        <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginLeft: isMobile ? 0 : 10, display: 'inline-block', wordBreak: 'break-word' }}>{p.email}</span>
                    </div>
                    <AdminThemeToggle isLight={isLight} onToggle={toggleTheme} />
                    {canManageRestrictedActions && (
                        <button onClick={handleDeleteConsultant} disabled={deleting} style={{
                            padding: isMobile ? '7px 10px' : '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: deleting ? 'var(--admin-border-strong)' : 'rgba(239,68,68,0.12)',
                            color: deleting ? 'var(--admin-text-secondary)' : '#f87171',
                            border: '1px solid rgba(239,68,68,0.25)', cursor: deleting ? 'not-allowed' : 'pointer',
                        }}>
                            {deleting ? 'Deleting...' : 'Delete Consultant'}
                        </button>
                    )}

                </div>
            </header>

            <div style={{ maxWidth: 1500, margin: '0 auto', padding: isMobile ? '14px 10px 18px' : '28px 32px' }}>

                {isCredentialsFailed && (
                    <div style={{
                        marginBottom: 20,
                        padding: isMobile ? '14px 12px' : '20px 22px',
                        borderRadius: 16,
                        border: '1px solid rgba(249,115,22,0.35)',
                        background: isLight
                            ? 'linear-gradient(135deg, rgba(255,247,237,0.98) 0%, rgba(255,255,255,0.98) 100%)'
                            : 'linear-gradient(135deg, rgba(124,45,18,0.32) 0%, rgba(15,23,42,0.94) 100%)',
                        boxShadow: '0 18px 36px rgba(0,0,0,0.22)',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 20,
                            flexWrap: 'wrap',
                        }}>
                            <div style={{ flex: '1 1 420px', minWidth: isMobile ? '100%' : 0 }}>
                                <div style={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: '#fdba74',
                                    marginBottom: 10,
                                }}>
                                    Credential Generation Failed
                                </div>
                                <div style={{ fontSize: 14, color: 'var(--admin-text-primary)', lineHeight: 1.6, marginBottom: 10 }}>
                                    This consultant passed the assessment, but credentials could not be auto-generated.
                                    Resolve the issue below and generate them manually.
                                </div>
                                <div style={{
                                    padding: '12px 14px',
                                    borderRadius: 12,
                                    background: 'var(--admin-surface-strong)',
                                    border: '1px solid rgba(251,146,60,0.18)',
                                    color: '#fed7aa',
                                    fontSize: 13,
                                    lineHeight: 1.6,
                                }}>
                                    <span style={{ color: '#fdba74', fontWeight: 700 }}>Reason:</span>{' '}
                                    {p.credential_blocker_reason || 'Automatic credential generation failed for an unknown reason.'}
                                </div>
                            </div>
                            {canManageRestrictedActions && (
                                <button
                                    onClick={handleGenerateCredentials}
                                    disabled={generating}
                                    style={{
                                        padding: '12px 18px',
                                        borderRadius: 12,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        background: generating ? 'var(--admin-text-secondary)' : '#f97316',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: generating ? 'not-allowed' : 'pointer',
                                        boxShadow: generating ? 'none' : '0 10px 24px rgba(249,115,22,0.28)',
                                        alignSelf: 'center',
                                        minWidth: isMobile ? 0 : 240,
                                        width: isMobile ? '100%' : 'auto',
                                    }}
                                >
                                    {generating ? 'Generating...' : 'Generate Credentials Manually'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== PROFILE ===== */}
                <div style={sectionStyle}>
                    {sectionHeader('Profile Details', 'profile', '👤',
                        p.is_verified && (
                            (!p.has_credentials || isCredentialsFailed) ? (
                                canManageRestrictedActions ? (
                                    <button
                                        onClick={handleGenerateCredentials}
                                        disabled={generating}
                                        style={{
                                            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                            background: generating ? 'var(--admin-text-secondary)' : (isCredentialsFailed ? '#f97316' : '#3b82f6'), color: '#fff',
                                            border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                                            transition: 'background 0.2s',
                                            boxShadow: isCredentialsFailed
                                                ? '0 2px 8px rgba(249,115,22,0.3)'
                                                : '0 2px 4px rgba(59,130,246,0.3)',
                                        }}
                                    >
                                        {generating ? 'Generating...' : (isCredentialsFailed ? 'Generate Credentials Manually' : 'Generate Credentials')}
                                    </button>
                                ) : null
                            ) : (
                                <span style={{
                                    padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                    background: 'rgba(16,185,129,0.15)', color: '#34d399',
                                    border: '1px solid rgba(16,185,129,0.25)', display: 'inline-flex', alignItems: 'center', gap: 6
                                }}>
                                    ✓ Credentials Sent
                                </span>
                            )
                        )
                    )}
                    {openSections.profile && (
                        <div style={{ padding: isMobile ? '12px 12px 16px' : '12px 20px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 0 : '0 40px' }}>
                                <div>
                                    {fieldRow('First Name', p.first_name)}
                                    {fieldRow('Middle Name', p.middle_name)}
                                    {fieldRow('Last Name', p.last_name)}
                                    {fieldRow('Date of Birth', p.dob)}
                                    {fieldRow('Age', p.age)}
                                    {fieldRow('Phone', p.phone_number)}
                                    {fieldRow('Phone Verified', statusTag(!!p.is_phone_verified, 'Verified', 'Not Verified'))}
                                    {fieldRow('Email', p.email)}
                                </div>
                                <div>
                                    {fieldRow('Address Line 1', p.address_line1)}
                                    {fieldRow('Address Line 2', p.address_line2)}
                                    {fieldRow('City', p.city)}
                                    {fieldRow('State', p.state)}
                                    {fieldRow('Pincode', p.pincode)}
                                    {fieldRow('Practice Type', p.practice_type)}
                                    {fieldRow('Highest Qualification', p.qualification)}
                                    {fieldRow('Experience', p.years_of_experience ? `${p.years_of_experience} years` : null)}
                                </div>
                            </div>
                            <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                {fieldRow('Joined', p.created_at ? new Date(p.created_at).toLocaleString() : null)}
                                {fieldRow('Updated', p.updated_at ? new Date(p.updated_at).toLocaleString() : null)}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, background: p.has_accepted_declaration ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${p.has_accepted_declaration ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                                    <span style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>Declaration:</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: p.has_accepted_declaration ? '#34d399' : '#f87171' }}>
                                        {p.has_accepted_declaration ? '✅ Accepted' : '❌ Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== IDENTITY DOCUMENTS ===== */}
                <div style={sectionStyle}>
                    {sectionHeader(`Identity Documents (${identityDocs.length})`, 'identity', '🪪')}
                    {openSections.identity && (
                        <div style={{ padding: isMobile ? '12px 12px 16px' : '12px 20px 20px' }}>
                            {identityDocs.length === 0 ? (
                                <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>No identity documents uploaded.</p>
                            ) : identityDocs.map((doc, i) => (
                                <div key={i} style={{
                                    padding: 18, borderRadius: 12, marginBottom: 16,
                                    background: 'var(--admin-surface-soft)', border: '1px solid var(--admin-border-soft)',
                                }}>
                                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                        {/* Image Section */}
                                        <div style={{ flex: '0 0 auto', width: isMobile ? '100%' : 200 }}>
                                            {doc.file_url ? (
                                                <div style={{ marginBottom: 8 }}>
                                                    <img src={doc.file_url} alt="Identity Document" style={{ ...imgStyle, cursor: 'pointer', height: 140, objectFit: 'cover', width: '100%' }}
                                                        onClick={() => setSelectedImage(doc.file_url)}
                                                        onError={(e) => { e.target.style.display = 'none'; }} />
                                                </div>
                                            ) : (
                                                <div style={{ height: 140, borderRadius: 8, background: 'var(--admin-empty-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#f87171', marginBottom: 8 }}>
                                                    ⚠ Could not load image
                                                </div>
                                            )}
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', textAlign: 'center' }}>
                                                Uploaded: <span style={{ color: 'var(--admin-text-secondary)' }}>{new Date(doc.uploaded_at).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Verification Details Section */}
                                        <div style={{ flex: 1, minWidth: isMobile ? 0 : 250, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div style={{ padding: 16, background: 'var(--admin-surface-strong)', borderRadius: 12, border: '1px solid rgba(148,163,184,0.08)', boxShadow: isLight ? '0 12px 24px rgba(148,163,184,0.08)' : 'none', height: '100%' }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                    AI Verification Results
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Document Type Identified:</div>
                                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                                                            {doc.document_type || 'Unknown'}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Verification Status:</div>
                                                        <div>
                                                            <span style={{
                                                                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                                background: doc.verification_status === 'Verified' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                                                                color: doc.verification_status === 'Verified' ? '#34d399' : '#f87171',
                                                                display: 'inline-block'
                                                            }}>
                                                                {doc.verification_status || 'Pending / Unverified'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {doc.gemini_raw_response && (
                                                        <div style={{ marginTop: 4 }}>
                                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>AI Notes:</div>
                                                            <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', fontStyle: 'italic', background: 'var(--admin-surface-soft)', padding: '8px 12px', borderRadius: 8 }}>
                                                                {(() => {
                                                                    try {
                                                                        const parsed = JSON.parse(doc.gemini_raw_response);
                                                                        return parsed.notes || 'No additional notes.';
                                                                    } catch (e) {
                                                                        return 'Could not parse notes.';
                                                                    }
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===== FACE VERIFICATION ===== */}
                <div style={sectionStyle}>
                    {sectionHeader(`Face Verification (${faceRecords.length})`, 'face', '📸')}
                    {openSections.face && (
                        <div style={{ padding: isMobile ? '12px 12px 16px' : '12px 20px 20px' }}>
                            {faceRecords.length === 0 ? (
                                <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>No face verification records.</p>
                            ) : faceRecords.map((f, i) => (
                                <div key={i} style={{
                                    padding: 16, borderRadius: 10, marginBottom: 10,
                                    background: 'var(--admin-surface-soft)', border: '1px solid rgba(148,163,184,0.08)',
                                }}>
                                    {/* Photos side by side */}
                                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
                                        <div style={{ width: isMobile ? '100%' : 200, maxWidth: isMobile ? 'none' : 200 }}>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                ID Photo
                                            </div>
                                            {f.id_image_url ? (
                                                <img src={f.id_image_url} alt="ID Photo"
                                                    onClick={() => setSelectedImage(f.id_image_url)}
                                                    style={{ width: '100%', height: isMobile ? 220 : 240, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--admin-border-soft)', cursor: 'pointer' }}
                                                    onError={(e) => { e.target.outerHTML = '<div style="width:100%;height:220px;border-radius:8px;background:var(--admin-empty-bg);display:flex;align-items:center;justify-content:center;color:var(--admin-text-muted);font-size:12px">Failed to load</div>'; }} />
                                            ) : (
                                                <div style={{ width: '100%', height: isMobile ? 220 : 240, borderRadius: 8, background: 'var(--admin-empty-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)', fontSize: 12 }}>
                                                    No image
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ width: isMobile ? '100%' : 200, maxWidth: isMobile ? 'none' : 200 }}>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                Live Photo
                                            </div>
                                            {f.live_image_url ? (
                                                <img src={f.live_image_url} alt="Live Photo"
                                                    onClick={() => setSelectedImage(f.live_image_url)}
                                                    style={{ width: '100%', height: isMobile ? 220 : 240, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--admin-border-soft)', cursor: 'pointer' }}
                                                    onError={(e) => { e.target.outerHTML = '<div style="width:100%;height:220px;border-radius:8px;background:var(--admin-empty-bg);display:flex;align-items:center;justify-content:center;color:var(--admin-text-muted);font-size:12px">Failed to load</div>'; }} />
                                            ) : (
                                                <div style={{ width: '100%', height: isMobile ? 220 : 240, borderRadius: 8, background: 'var(--admin-empty-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)', fontSize: 12 }}>
                                                    No image
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Match info */}
                                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <div style={{ fontSize: 13 }}>
                                            <span style={{ color: 'var(--admin-text-muted)' }}>Match: </span>
                                            {statusTag(f.is_match, 'Match ✓', 'No Match ✗')}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>
                                            Confidence: <span style={{ color: 'var(--admin-text-primary)', fontWeight: 700 }}>
                                                {f.confidence != null ? `${f.confidence.toFixed(2)}%` : '—'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                                            Verified: <span style={{ color: 'var(--admin-text-secondary)' }}>{new Date(f.verified_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===== ASSESSMENT SESSIONS ===== */}
                <div style={sectionStyle}>
                    {sectionHeader(`Assessment Sessions (${sessions.length})`, 'assessment', '📝')}
                    {openSections.assessment && (
                        <div style={{ padding: isMobile ? '12px 12px 16px' : '12px 20px 20px' }}>
                            {sessions.length === 0 ? (
                                <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>No assessment sessions.</p>
                            ) : sessions.map((s, i) => (
                                <div key={i} style={{
                                    padding: 16, borderRadius: 10, marginBottom: 14,
                                    background: 'var(--admin-surface-soft)', border: '1px solid rgba(148,163,184,0.08)',
                                }}>
                                    {/* Session header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--admin-text-primary)' }}>
                                            {s.test_type || 'Unknown Test'}
                                        </span>
                                        {(() => {
                                            const isViolated = isCandidateDisqualified && (s.violation_count > 0 || s.status === 'flagged');
                                            const displayStatus = isViolated ? 'Violated' : s.status?.charAt(0).toUpperCase() + s.status?.slice(1);
                                            const isRed = isViolated;
                                            const isGreen = s.status === 'completed' && !isViolated;
                                            const isYellow = s.status === 'ongoing' && !isViolated;

                                            return (
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                    background: isGreen ? 'rgba(16,185,129,0.15)'
                                                        : isRed ? 'rgba(239,68,68,0.12)'
                                                            : isYellow ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.12)',
                                                    color: isGreen ? '#34d399'
                                                        : isRed ? '#f87171'
                                                            : isYellow ? '#fbbf24' : 'var(--admin-text-muted)',
                                                }}>
                                                    {displayStatus}
                                                </span>
                                            );
                                        })()}
                                        {(s.status === 'flagged' || s.can_video_restore) && (
                                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {s.can_video_restore && (
                                                    <button
                                                        onClick={() => handleRestoreVideoAssessment(s.id)}
                                                        disabled={restoringVideoSessionId === s.id}
                                                        title={s.video_restore_reason || 'Reopen video stage for this session'}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: 8,
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            background: restoringVideoSessionId === s.id ? 'var(--admin-border-strong)' : 'rgba(16,185,129,0.16)',
                                                            color: restoringVideoSessionId === s.id ? 'var(--admin-text-secondary)' : '#6ee7b7',
                                                            border: '1px solid rgba(16,185,129,0.4)',
                                                            cursor: restoringVideoSessionId === s.id ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        {restoringVideoSessionId === s.id ? 'Restoring Video...' : 'Restore Video Stage'}
                                                    </button>
                                                )}
                                                {s.status === 'flagged' && (
                                                    <button
                                                        onClick={() => handleRestoreAssessment(s.id)}
                                                        disabled={restoringSessionId === s.id}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: 8,
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            background: restoringSessionId === s.id ? 'var(--admin-border-strong)' : 'rgba(59,130,246,0.16)',
                                                            color: restoringSessionId === s.id ? 'var(--admin-text-secondary)' : '#93c5fd',
                                                            border: '1px solid rgba(59,130,246,0.35)',
                                                            cursor: restoringSessionId === s.id ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        {restoringSessionId === s.id ? 'Restoring...' : 'Restore Attempt'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Score cards */}
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, 1fr)', gap: 12, marginBottom: 14 }}>
                                        <div style={{ padding: 12, borderRadius: 8, background: 'var(--admin-surface)', border: '1px solid rgba(148,163,184,0.06)', textAlign: 'center' }}>
                                            <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>
                                                {(s.mcq_score ?? s.score ?? 0)}/{s.mcq_total ?? (s.question_set?.length || 50)}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>MCQ Score</div>
                                            {'mcq_answered' in s && (
                                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                                    Answered: {s.mcq_answered}/{s.mcq_total ?? (s.question_set?.length || 50)}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ padding: 12, borderRadius: 8, background: 'var(--admin-surface)', border: '1px solid rgba(148,163,184,0.06)', textAlign: 'center' }}>
                                            <div style={{ fontSize: 22, fontWeight: 800, color: '#a855f7' }}>
                                                {s.video_responses?.reduce((sum, v) => sum + (v.ai_score || 0), 0) || 0}/{(s.video_question_set?.length || 0) * 5}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>Video Score</div>
                                        </div>
                                        <div style={{ padding: 12, borderRadius: 8, background: 'var(--admin-surface)', border: '1px solid rgba(148,163,184,0.06)', textAlign: 'center' }}>
                                            <div style={{ fontSize: 22, fontWeight: 800, color: s.violation_count > 0 ? '#f87171' : '#34d399' }}>{s.violation_count}</div>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>Violations</div>
                                        </div>
                                        <div style={{ padding: 12, borderRadius: 8, background: 'var(--admin-surface)', border: '1px solid rgba(148,163,184,0.06)', textAlign: 'center' }}>
                                            <div style={{ fontSize: 22, fontWeight: 800, color: '#60a5fa' }}>{s.video_responses?.length || 0}</div>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>Videos Submitted</div>
                                        </div>
                                        <div style={{ padding: 12, borderRadius: 8, background: 'var(--admin-surface)', border: '1px solid rgba(148,163,184,0.06)', textAlign: 'center' }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text-secondary)', marginTop: 4 }}>{s.selected_domains?.join(', ') || '—'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>Domains</div>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
                                        <span>Started: <span style={{ color: 'var(--admin-text-secondary)' }}>{s.start_time ? new Date(s.start_time).toLocaleString() : '—'}</span></span>
                                        <span>Ended: <span style={{ color: 'var(--admin-text-secondary)' }}>{s.end_time ? new Date(s.end_time).toLocaleString() : '—'}</span></span>
                                    </div>

                                    {s.mcq_answers && typeof s.mcq_answers === 'object' && Object.keys(s.mcq_answers).length > 0 && (
                                        <div style={{ marginBottom: 12 }}>
                                            <details style={{
                                                background: 'var(--admin-surface-accent)',
                                                border: '1px solid rgba(148,163,184,0.08)',
                                                borderRadius: 10,
                                                padding: '10px 12px',
                                            }}>
                                                <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                                                    MCQ answers (autosaved)
                                                </summary>
                                                <pre style={{ marginTop: 10, whiteSpace: 'pre-wrap', fontSize: 11, color: 'var(--admin-text-secondary)' }}>
                                                    {JSON.stringify(s.mcq_answers, null, 2)}
                                                </pre>
                                            </details>
                                        </div>
                                    )}

                                    {/* Violations detail */}
                                    {s.violations?.length > 0 && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>Violation Log</div>
                                            <div style={{ borderRadius: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid rgba(239,68,68,0.1)' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: 'rgba(239,68,68,0.05)' }}>
                                                            <th style={{ padding: '8px 12px', fontSize: 11, color: 'var(--admin-text-muted)', textAlign: 'left', fontWeight: 600 }}>Type</th>
                                                            <th style={{ padding: '8px 12px', fontSize: 11, color: 'var(--admin-text-muted)', textAlign: 'left', fontWeight: 600 }}>Timestamp</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {s.violations.map((v, vi) => (
                                                            <tr key={vi} style={{ borderTop: '1px solid rgba(148,163,184,0.05)' }}>
                                                                <td style={{ padding: '8px 12px', fontSize: 12, color: '#fca5a5' }}>{v.violation_type}</td>
                                                                <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--admin-text-secondary)' }}>{new Date(v.timestamp).toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Proctoring Snapshots */}
                                    {s.proctoring_snapshots?.length > 0 && (
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>Proctoring Snapshots</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                                                {s.proctoring_snapshots.map((snap, si) => (
                                                    <div key={si} style={{
                                                        position: 'relative', borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                                                        border: snap.is_violation ? '2px solid #ef4444' : '1px solid var(--admin-border-soft)',
                                                        background: 'var(--admin-surface-strong)'
                                                    }} onClick={() => setSelectedSnapshot({ ...snap, _session_audio_clips: s.proctoring_audio_clips || [] })}>
                                                        <img src={snap.image_url} alt="Snapshot" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
                                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Error'; }} />

                                                        {snap.is_violation && (
                                                            <div style={{
                                                                position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'white',
                                                                fontSize: 9, fontWeight: 700, padding: '2px 4px', borderBottomLeftRadius: 6,
                                                                zIndex: 10
                                                            }}>VIOLATION</div>
                                                        )}

                                                        <div style={{ padding: '6px 4px', fontSize: 9 }}>
                                                            <div style={{ color: 'var(--admin-text-secondary)', marginBottom: 2 }}>{new Date(snap.timestamp).toLocaleTimeString()}</div>
                                                            <div style={{ color: 'var(--admin-text-primary)' }}>Faces: {snap.face_count}</div>
                                                            {snap.match_score > 0 && (
                                                                <div style={{ color: snap.match_score > 80 ? '#34d399' : '#f87171' }}>match: {Math.round(snap.match_score)}%</div>
                                                            )}
                                                            {'audio_detected' in snap && (
                                                                <div style={{ color: snap.audio_detected ? '#f87171' : 'var(--admin-text-secondary)' }}>
                                                                    audio: {String(!!snap.audio_detected)}
                                                                </div>
                                                            )}
                                                            {'gaze_violation' in snap && (
                                                                <div style={{ color: snap.gaze_violation ? '#f87171' : 'var(--admin-text-secondary)' }}>
                                                                    gaze: {String(snap.gaze_violation)}
                                                                </div>
                                                            )}
                                                            {snap.is_violation && (
                                                                <div style={{ color: '#fca5a5', fontWeight: 600, marginTop: 2, lineHeight: 1.2 }}>
                                                                    {snap.violation_reason}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Proctoring Audio Clips */}
                                    {s.proctoring_audio_clips?.length > 0 && (
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>
                                                Proctoring Audio Clips ({s.proctoring_audio_clips.length})
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                                                {s.proctoring_audio_clips.map((clip) => (
                                                    <div key={clip.id} style={{
                                                        padding: 12,
                                                        borderRadius: 12,
                                                        background: 'var(--admin-surface-accent)',
                                                        border: '1px solid var(--admin-border-soft)',
                                                        boxShadow: isLight ? '0 10px 24px rgba(15,23,42,0.06)' : 'none',
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                                                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-primary)', wordBreak: 'break-all' }}>
                                                                {clip.snapshot_id ? `snapshot: ${clip.snapshot_id}` : `clip #${clip.id}`}
                                                            </div>
                                                            <div style={{ fontSize: 10, color: 'var(--admin-text-secondary)' }}>
                                                                {clip.created_at ? new Date(clip.created_at).toLocaleTimeString() : '—'}
                                                            </div>
                                                        </div>
                                                        {clip.file_url ? (
                                                            <audio controls preload="none" style={{ width: '100%' }} src={clip.file_url} />
                                                        ) : (
                                                            <div style={{ fontSize: 12, color: '#fca5a5' }}>Audio URL missing</div>
                                                        )}
                                                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                                            <span style={{
                                                                padding: '2px 8px',
                                                                borderRadius: 999,
                                                                fontSize: 10,
                                                                fontWeight: 800,
                                                                background: clip.stt_status === 'completed'
                                                                    ? 'rgba(16,185,129,0.12)'
                                                                    : clip.stt_status === 'failed'
                                                                        ? 'rgba(239,68,68,0.12)'
                                                                        : 'rgba(148,163,184,0.12)',
                                                                color: clip.stt_status === 'completed'
                                                                    ? '#34d399'
                                                                    : clip.stt_status === 'failed'
                                                                        ? '#f87171'
                                                                        : 'var(--admin-text-secondary)',
                                                                border: '1px solid rgba(148,163,184,0.14)',
                                                            }}>
                                                                STT: {clip.stt_status || '—'}
                                                            </span>
                                                            {clip.stt_provider && (
                                                                <span style={{ fontSize: 10, color: 'var(--admin-text-secondary)' }}>
                                                                    {clip.stt_provider}{clip.stt_language ? ` (${clip.stt_language})` : ''}
                                                                </span>
                                                            )}
                                                            {clip.cheat_flag && (
                                                                <span style={{
                                                                    padding: '2px 8px',
                                                                    borderRadius: 999,
                                                                    fontSize: 10,
                                                                    fontWeight: 900,
                                                                    background: 'rgba(239,68,68,0.16)',
                                                                    color: '#fecaca',
                                                                    border: '1px solid rgba(239,68,68,0.28)',
                                                                }}>
                                                                    CHEAT PROMPT
                                                                </span>
                                                            )}
                                                        </div>
                                                        {clip.transcript && (
                                                            <div style={{
                                                                marginTop: 8,
                                                                fontSize: 11,
                                                                color: 'var(--admin-text-primary)',
                                                                lineHeight: 1.35,
                                                                background: 'var(--admin-surface-soft)',
                                                                border: '1px solid rgba(148,163,184,0.12)',
                                                                borderRadius: 10,
                                                                padding: '8px 10px',
                                                                maxHeight: 90,
                                                                overflow: 'auto',
                                                            }}>
                                                                {clip.transcript}
                                                            </div>
                                                        )}
                                                        {Array.isArray(clip.cheat_matches) && clip.cheat_matches.length > 0 && (
                                                            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--admin-text-secondary)' }}>
                                                                matches: <span style={{ color: 'var(--admin-text-primary)', fontWeight: 700 }}>{clip.cheat_matches.join(', ')}</span>
                                                            </div>
                                                        )}
                                                        <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--admin-text-secondary)' }}>
                                                            <span>level: <span style={{ color: 'var(--admin-text-primary)', fontWeight: 700 }}>{clip.audio_level ?? '—'}</span></span>
                                                            <span>duration: <span style={{ color: 'var(--admin-text-primary)', fontWeight: 700 }}>{clip.duration_ms ?? '—'}ms</span></span>
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>mime: {clip.mime_type || '—'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Continuous Audio Telemetry */}
                                    {((s.proctoring_audio_telemetry_summary?.events || 0) > 0 || (s.proctoring_audio_telemetry?.length || 0) > 0) && (
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>
                                                Audio Telemetry
                                            </div>
                                            <div style={{
                                                background: 'rgba(2,132,199,0.06)',
                                                border: '1px solid rgba(2,132,199,0.18)',
                                                borderRadius: 12,
                                                padding: 12,
                                            }}>
                                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                                                    <span>events: <span style={{ color: 'var(--admin-text-primary)', fontWeight: 800 }}>{s.proctoring_audio_telemetry_summary?.events ?? (s.proctoring_audio_telemetry?.length || 0)}</span></span>
                                                    <span>speech: <span style={{ color: 'var(--admin-text-primary)', fontWeight: 800 }}>{Math.round((s.proctoring_audio_telemetry_summary?.total_speech_ms || 0) / 1000)}s</span></span>
                                                    <span>max level: <span style={{ color: 'var(--admin-text-primary)', fontWeight: 800 }}>{s.proctoring_audio_telemetry_summary?.max_level ?? '—'}</span></span>
                                                </div>

                                                {Array.isArray(s.proctoring_audio_telemetry) && s.proctoring_audio_telemetry.length > 0 && (
                                                    <details style={{ marginTop: 10 }}>
                                                        <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                                                            View recent telemetry ({s.proctoring_audio_telemetry.length})
                                                        </summary>
                                                        <div style={{ marginTop: 10, borderRadius: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid rgba(148,163,184,0.08)' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                                <thead>
                                                                    <tr style={{ background: 'rgba(148,163,184,0.06)' }}>
                                                                        <th style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-muted)', textAlign: 'left', fontWeight: 700 }}>Window</th>
                                                                        <th style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-muted)', textAlign: 'left', fontWeight: 700 }}>Speech</th>
                                                                        <th style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-muted)', textAlign: 'left', fontWeight: 700 }}>Bursts</th>
                                                                        <th style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-muted)', textAlign: 'left', fontWeight: 700 }}>Avg</th>
                                                                        <th style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-muted)', textAlign: 'left', fontWeight: 700 }}>Max</th>
                                                                        <th style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-muted)', textAlign: 'left', fontWeight: 700 }}>Mic</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {s.proctoring_audio_telemetry.slice(0, 40).map((t) => (
                                                                        <tr key={t.id} style={{ borderTop: '1px solid rgba(148,163,184,0.06)' }}>
                                                                            <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-secondary)' }}>
                                                                                {t.window_start && t.window_end
                                                                                    ? `${new Date(t.window_start).toLocaleTimeString()} → ${new Date(t.window_end).toLocaleTimeString()}`
                                                                                    : (t.created_at ? new Date(t.created_at).toLocaleTimeString() : '—')}
                                                                            </td>
                                                                            <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-primary)', fontWeight: 700 }}>
                                                                                {Math.round((t.speech_ms || 0) / 1000)}s
                                                                            </td>
                                                                            <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-primary)', fontWeight: 700 }}>
                                                                                {t.bursts ?? 0}
                                                                            </td>
                                                                            <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-secondary)' }}>
                                                                                {t.avg_level ?? '—'}
                                                                            </td>
                                                                            <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-secondary)' }}>
                                                                                {t.max_level ?? '—'}
                                                                            </td>
                                                                            <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--admin-text-secondary)' }}>
                                                                                {t.mic_status || '—'}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </details>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Video Responses — List all questions */}
                                    {s.video_question_set?.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 8 }}>Video Responses</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                                {s.video_question_set.map((q, qi) => {
                                                    // Find the latest response for this question (highest ID)
                                                    const response = s.video_responses
                                                        ?.filter(v => v.question_identifier === q.id)
                                                        ?.sort((a, b) => (b.id || 0) - (a.id || 0))[0];
                                                    return (
                                                        <div key={qi} style={{
                                                            padding: 12, borderRadius: 10,
                                                            background: 'var(--admin-surface)', border: '1px solid rgba(148,163,184,0.06)',
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>
                                                                        Video {qi + 1}
                                                                    </span>
                                                                    {response && (
                                                                        <button
                                                                            onClick={() => {
                                                                                // Pause all videos on the page before opening the modal
                                                                                document.querySelectorAll('video').forEach(vid => vid.pause());
                                                                                setSelectedVideoCard({ ...response, question: q.text || q.question });
                                                                            }}
                                                                            style={{
                                                                                background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0,
                                                                                fontSize: 14, display: 'flex', alignItems: 'center'
                                                                            }}
                                                                            title="Expand Details"
                                                                        >
                                                                            ⤢
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {response ? (
                                                                    <span style={{ fontSize: 10, fontWeight: 600, color: '#34d399', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 10 }}>Submitted</span>
                                                                ) : (
                                                                    <span style={{ fontSize: 10, fontWeight: 600, color: '#fca5a5', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 10 }}>Missing</span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 13, color: 'var(--admin-text-primary)', fontWeight: 600, marginBottom: 10, lineHeight: 1.4 }}>
                                                                {q.text || q.question}
                                                            </div>
                                                            {response && response.video_url ? (
                                                                <>
                                                                    <div style={{ position: 'relative' }}>
                                                                        <video
                                                                            src={response.video_url}
                                                                            controls
                                                                            style={{ width: '100%', maxHeight: 200, borderRadius: 6, background: '#000' }}
                                                                        />
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <span>{new Date(response.uploaded_at).toLocaleString()}</span>

                                                                        {/* AI Evaluation Control */}
                                                                        {response.ai_status === 'failed' ? (
                                                                            <span style={{ color: '#fca5a5', fontWeight: 600, fontSize: 11 }}>⚠ Evaluation Failed</span>
                                                                        ) : (!response.ai_status || response.ai_status === 'pending' || response.ai_status === 'processing') ? (
                                                                            <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                                <span style={{ animation: 'pulse 1.5s infinite' }}>⚡</span> Analyzing...
                                                                                <button onClick={handleRefresh} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>Refresh</button>
                                                                            </span>
                                                                        ) : (
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                <span style={{ color: '#34d399', fontWeight: 600, fontSize: 11 }}>✓ Evaluated</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* AI Results Display */}
                                                                    {response.ai_status === 'completed' && (
                                                                        <div style={{ marginTop: 12, padding: 12, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 8, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>AI SCORE</span>
                                                                                <span style={{ fontSize: 14, fontWeight: 800, color: '#ddd6fe' }}>{response.ai_score}/5</span>
                                                                            </div>
                                                                            <div style={{ marginBottom: 8 }}>
                                                                                <div style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', marginBottom: 2 }}>TRANSCRIPT</div>
                                                                                <div style={{ fontSize: 11, color: '#c4b5fd', maxHeight: 60, overflowY: 'auto', fontStyle: 'italic' }}>
                                                                                    "{response.ai_transcript}"
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', marginBottom: 2 }}>FEEDBACK</div>
                                                                                <div style={{ fontSize: 11, color: '#c4b5fd' }}>
                                                                                    {response.ai_feedback?.feedback || response.ai_feedback}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 12, background: 'var(--admin-surface-strong)', borderRadius: 6, border: '1px dashed var(--admin-border-strong)' }}>
                                                                    No video response
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}


                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===== UPLOADED DOCUMENTS ===== */}
                <div style={sectionStyle}>
                    {sectionHeader(`Uploaded Documents (${qualDocs.length + consultDocs.length})`, 'documents', '📄')}
                    {openSections.documents && (
                        <div style={{ padding: isMobile ? '12px 12px 16px' : '12px 20px 20px' }}>
                            {qualDocs.length === 0 && consultDocs.length === 0 ? (
                                <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>No documents uploaded.</p>
                            ) : (
                                <div>
                                    {qualDocs.length > 0 && (
                                        <>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 10 }}>
                                                Qualification Documents
                                            </div>
                                            {qualDocs.map((d, i) => (
                                                <div key={i} style={{
                                                    padding: 14, borderRadius: 10, marginBottom: 10,
                                                    background: 'var(--admin-surface-soft)', border: '1px solid rgba(148,163,184,0.08)',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                        <div>
                                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-primary)' }}>{d.document_type}</span>
                                                            {d.title && <span style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginLeft: 8 }}>({d.title})</span>}
                                                        </div>
                                                        <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                                                            {new Date(d.uploaded_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    {d.file_url ? (
                                                        <div onClick={() => setSelectedImage(d.file_url)} style={{ cursor: 'pointer' }}>
                                                            {isPdf(d.file_url) ? (
                                                                <div style={{
                                                                    ...imgStyle, height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                    color: '#fca5a5', gap: 10, background: 'rgba(239,68,68,0.1)'
                                                                }}>
                                                                    <span style={{ fontSize: 48 }}>📄</span>
                                                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>PDF Document</span>
                                                                    <span style={{ fontSize: 11, color: 'var(--admin-text-secondary)' }}>Click to preview</span>
                                                                </div>
                                                            ) : (
                                                                <img src={d.file_url} alt={d.document_type}
                                                                    style={{ ...imgStyle, maxHeight: 250 }}
                                                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                                                />
                                                            )}
                                                            {/* Fallback container for broken images */}
                                                            <div style={{ display: 'none', padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 12, background: 'var(--admin-surface-strong)', borderRadius: 8 }}>
                                                                ⚠ Image not available
                                                                <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{ display: 'block', marginTop: 8, color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}>
                                                                    View / Download
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>⚠ File not available</div>
                                                    )}
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {consultDocs.length > 0 && (
                                        <>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 10, marginTop: qualDocs.length > 0 ? 16 : 0 }}>
                                                Consultant Documents
                                            </div>
                                            {consultDocs.map((d, i) => (
                                                <div key={i} style={{
                                                    padding: 18, borderRadius: 12, marginBottom: 16,
                                                    background: 'var(--admin-surface-soft)', border: '1px solid var(--admin-border-soft)',
                                                }}>
                                                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                                        {/* Document Preview Section */}
                                                        <div style={{ flex: '0 0 auto', width: isMobile ? '100%' : 220 }}>
                                                            <div style={{ marginBottom: 10 }}>
                                                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text-primary)', display: 'block' }}>{d.qualification_type}</span>
                                                                <span style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>{d.document_type}</span>
                                                            </div>
                                                            {d.file_url ? (
                                                                <div onClick={() => setSelectedImage(d.file_url)} style={{ cursor: 'pointer' }}>
                                                                    {isPdf(d.file_url) ? (
                                                                        <div style={{
                                                                            ...imgStyle, height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                                            color: '#60a5fa', gap: 10, background: 'rgba(59,130,246,0.1)', cursor: 'pointer'
                                                                        }}>
                                                                            <span style={{ fontSize: 36 }}>📄</span>
                                                                            <span style={{ fontSize: 12, fontWeight: 600 }}>PDF Document</span>
                                                                        </div>
                                                                    ) : (
                                                                        <img src={d.file_url} alt={d.document_type}
                                                                            style={{ ...imgStyle, height: 140, width: '100%', objectFit: 'cover' }}
                                                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                                                        />
                                                                    )}
                                                                    <div style={{ display: 'none', padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 12, background: 'var(--admin-surface-strong)', borderRadius: 8 }}>
                                                                        ⚠ Image not available
                                                                        <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            style={{ display: 'block', marginTop: 8, color: '#60a5fa', fontSize: 13, textDecoration: 'none' }}>
                                                                            View / Download
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ height: 140, borderRadius: 8, background: 'var(--admin-empty-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#f87171' }}>
                                                                    ⚠ File not available
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', textAlign: 'center', marginTop: 8 }}>
                                                                Uploaded: <span style={{ color: 'var(--admin-text-secondary)' }}>{new Date(d.uploaded_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>

                                                        {/* Verification Details Section */}
                                                        <div style={{ flex: 1, minWidth: isMobile ? 0 : 250, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                            <div style={{ padding: 16, background: 'var(--admin-surface-strong)', borderRadius: 10, border: '1px solid rgba(148,163,184,0.05)', height: '100%' }}>
                                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                                    AI Verification Results
                                                                </div>

                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                                    <div>
                                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Document Type Identified:</div>
                                                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                                                                            {(() => {
                                                                                try {
                                                                                    if (d.gemini_raw_response) {
                                                                                        return JSON.parse(d.gemini_raw_response).determined_type || 'Unknown';
                                                                                    }
                                                                                } catch (e) { }
                                                                                return 'Unknown';
                                                                            })()}
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Verification Status:</div>
                                                                        <div>
                                                                            <span style={{
                                                                                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                                                background: d.verification_status === 'Verified' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                                                                                color: d.verification_status === 'Verified' ? '#34d399' : '#f87171',
                                                                                display: 'inline-block'
                                                                            }}>
                                                                                {d.verification_status || 'Pending / Unverified'}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {(() => {
                                                                        const docType = String(d.document_type || '').toLowerCase();
                                                                        if (docType !== 'bachelors_degree' && docType !== 'ca_degree') return null;
                                                                        if (String(d.verification_status || '').toLowerCase() === 'verified') return null;
                                                                        const degreeLabel = docType === 'ca_degree' ? 'CA degree' : "Bachelor's degree";
                                                                        try {
                                                                            const parsed = d.gemini_raw_response ? JSON.parse(d.gemini_raw_response) : {};
                                                                            const reason = parsed?.rejection_reason || 'Not a valid degree';
                                                                            return (
                                                                                <div style={{ marginTop: 2 }}>
                                                                                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Validation:</div>
                                                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>
                                                                                        {degreeLabel} validation failed ({reason})
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        } catch (e) {
                                                                            return (
                                                                                <div style={{ marginTop: 2 }}>
                                                                                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Validation:</div>
                                                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>
                                                                                        {degreeLabel} validation failed
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }
                                                                    })()}

                                                                    {d.gemini_raw_response && (
                                                                        <div style={{ marginTop: 4 }}>
                                                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>AI Notes:</div>
                                                                            <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', fontStyle: 'italic', background: 'var(--admin-surface-soft)', padding: '8px 12px', borderRadius: 6 }}>
                                                                                {(() => {
                                                                                    try {
                                                                                        const parsed = JSON.parse(d.gemini_raw_response);
                                                                                        return parsed.notes || 'No additional notes.';
                                                                                    } catch (e) {
                                                                                        return 'Could not parse notes.';
                                                                                    }
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={sectionStyle}>
                    {sectionHeader('Candidate Feedback', 'feedback', '💬')}
                    {openSections.feedback && (
                        <div style={{ padding: isMobile ? '12px 12px 16px' : '16px 20px 20px' }}>
                            {feedbackEntries.length === 0 ? (
                                <p style={{ color: 'var(--admin-text-muted)', fontSize: 13, margin: 0 }}>
                                    No onboarding feedback submitted yet.
                                </p>
                            ) : (
                                <>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                        gap: 12,
                                        marginBottom: 18,
                                    }}>
                                        <div style={{ padding: 12, borderRadius: 10, background: 'var(--admin-surface-soft)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Experience Rating</div>
                                            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: 'var(--admin-text-strong)' }}>{activeFeedback?.experience_rating}/5</div>
                                        </div>
                                        <div style={{ padding: 12, borderRadius: 10, background: 'var(--admin-surface-soft)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Had Difficulties</div>
                                            <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: activeFeedback?.had_difficulties ? '#fbbf24' : '#34d399' }}>
                                                {activeFeedback?.had_difficulties ? 'Yes' : 'No'}
                                            </div>
                                        </div>
                                        <div style={{ padding: 12, borderRadius: 10, background: 'var(--admin-surface-soft)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Submitted At</div>
                                            <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                                                {activeFeedback?.submitted_at ? new Date(activeFeedback.submitted_at).toLocaleString() : '—'}
                                            </div>
                                        </div>
                                        <div style={{ padding: 12, borderRadius: 10, background: 'var(--admin-surface-soft)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Entries</div>
                                            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: 'var(--admin-text-strong)' }}>
                                                {feedbackEntries.length}
                                            </div>
                                        </div>
                                    </div>

                                    {Array.isArray(activeFeedback?.difficulty_categories) && activeFeedback.difficulty_categories.length > 0 && (
                                        <div style={{ marginBottom: 18 }}>
                                            <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 8, fontWeight: 700 }}>Difficulty Categories</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {activeFeedback.difficulty_categories.map((item) => (
                                                    <span
                                                        key={item}
                                                        style={{
                                                            padding: '6px 10px',
                                                            borderRadius: 999,
                                                            background: 'rgba(59,130,246,0.12)',
                                                            border: '1px solid rgba(59,130,246,0.18)',
                                                            color: '#93c5fd',
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {String(item || '').replace(/_/g, ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, background: 'var(--admin-surface-accent)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                        <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 8, fontWeight: 700 }}>Difficulties Details</div>
                                        <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--admin-text-primary)', whiteSpace: 'pre-wrap' }}>
                                            {activeFeedback?.difficulties_details || '—'}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                                        <div style={{ padding: 14, borderRadius: 12, background: 'var(--admin-surface-accent)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                            <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 8, fontWeight: 700 }}>What Went Well</div>
                                            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--admin-text-primary)', whiteSpace: 'pre-wrap' }}>
                                                {activeFeedback?.what_went_well || '—'}
                                            </div>
                                        </div>
                                        <div style={{ padding: 14, borderRadius: 12, background: 'var(--admin-surface-accent)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                            <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 8, fontWeight: 700 }}>What Needs Improvement</div>
                                            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--admin-text-primary)', whiteSpace: 'pre-wrap' }}>
                                                {activeFeedback?.what_needs_improvement || '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {feedbackEntries.length > 1 && (
                                        <div style={{ marginTop: 18 }}>
                                            <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 10, fontWeight: 700 }}>Feedback History</div>
                                            <div style={{ display: 'grid', gap: 10 }}>
                                                {feedbackEntries.map((entry, index) => (
                                                    <div
                                                        key={entry.id || index}
                                                        onClick={() => setSelectedFeedbackId(entry.id ?? null)}
                                                        style={{
                                                            padding: 14,
                                                            borderRadius: 12,
                                                            background: selectedFeedbackId === entry.id
                                                                ? (isLight ? 'rgba(219,234,254,0.92)' : 'rgba(30,58,138,0.35)')
                                                                : (index === 0 ? 'var(--admin-surface-accent)' : 'var(--admin-surface-soft)'),
                                                            border: selectedFeedbackId === entry.id
                                                                ? '1px solid rgba(96,165,250,0.45)'
                                                                : '1px solid rgba(148,163,184,0.08)',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                                                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--admin-text-strong)' }}>
                                                                {selectedFeedbackId === entry.id
                                                                    ? `Selected: Submission ${feedbackEntries.length - index}`
                                                                    : (index === 0 ? 'Latest submission' : `Submission ${feedbackEntries.length - index}`)}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                                                                {entry.submitted_at ? new Date(entry.submitted_at).toLocaleString() : '-'}
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: 13, color: 'var(--admin-text-primary-soft)', lineHeight: 1.65 }}>
                                                            Rating: {entry.experience_rating}/5
                                                        </div>
                                                        {entry.what_needs_improvement && (
                                                            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--admin-text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                                                {entry.what_needs_improvement}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div style={sectionStyle}>
                    {sectionHeader('Call Tracking', 'callTracking', '📞')}
                    {openSections.callTracking && (
                        <div style={{ padding: isMobile ? '12px 12px 16px' : '16px 20px 20px' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: 12,
                                marginBottom: 18,
                            }}>
                                <div style={{ padding: 12, borderRadius: 10, background: 'var(--admin-surface-soft)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Calls</div>
                                    <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: 'var(--admin-text-strong)' }}>{totalCallAttempts}</div>
                                </div>
                                <div style={{ padding: 12, borderRadius: 10, background: 'var(--admin-surface-soft)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Latest Caller</div>
                                    <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)' }}>{p.caller_name || 'No caller'}</div>
                                </div>
                                <div style={{ padding: 12, borderRadius: 10, background: 'var(--admin-surface-soft)', border: '1px solid rgba(148,163,184,0.08)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Latest Status</div>
                                    <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: 'var(--admin-text-primary)' }}>{p.call_status_label || 'Not Set'}</div>
                                </div>
                            </div>

                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary-soft)', marginBottom: 12 }}>Add New Call Entry</div>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 6, fontWeight: 700 }}>Caller</div>
                                    <select
                                        value={callTrackingDraft.caller_id}
                                        onChange={(e) => handleCallTrackingChange('caller_id', e.target.value)}
                                        style={formInputStyle}
                                    >
                                        <option value="">Select caller</option>
                                        {callerOptions.map((option) => (
                                            <option key={option.id} value={option.id}>{option.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 6, fontWeight: 700 }}>Call Status</div>
                                    <select
                                        value={callTrackingDraft.call_status}
                                        onChange={(e) => handleCallTrackingChange('call_status', e.target.value)}
                                        style={formInputStyle}
                                    >
                                        {CALL_STATUS_OPTIONS.map((option) => (
                                            <option key={option.value || 'blank'} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 6, fontWeight: 700 }}>Next Follow Up</div>
                                    <input
                                        type="date"
                                        value={callTrackingDraft.next_follow_up}
                                        onChange={(e) => handleCallTrackingChange('next_follow_up', e.target.value)}
                                        style={formInputStyle}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--admin-text-primary-soft)' }}>
                                    <input
                                        type="checkbox"
                                        checked={callTrackingDraft.is_rejected}
                                        onChange={(e) => handleCallTrackingChange('is_rejected', e.target.checked)}
                                    />
                                    Rejected
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 18 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 6, fontWeight: 700 }}>Comments</div>
                                    <textarea
                                        value={callTrackingDraft.comments}
                                        onChange={(e) => handleCallTrackingChange('comments', e.target.value)}
                                        placeholder="Comments"
                                        style={formTextAreaStyle}
                                    />
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginBottom: 6, fontWeight: 700 }}>Issue Facing</div>
                                    <textarea
                                        value={callTrackingDraft.issue_facing}
                                        onChange={(e) => handleCallTrackingChange('issue_facing', e.target.value)}
                                        placeholder="Issue facing"
                                        style={formTextAreaStyle}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>
                                    Current: <span style={{ color: 'var(--admin-text-primary)', fontWeight: 600 }}>{p.caller_name || 'No caller'}</span>
                                    {' · '}
                                    <span style={{ color: 'var(--admin-text-primary)', fontWeight: 600 }}>{p.call_status_label || 'Not Set'}</span>
                                </div>
                                <button
                                    onClick={handleSaveCallTracking}
                                    disabled={savingCallTracking}
                                    style={{
                                        padding: '9px 16px',
                                        borderRadius: 10,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        background: savingCallTracking ? 'var(--admin-border-strong)' : 'rgba(16,185,129,0.15)',
                                        color: savingCallTracking ? 'var(--admin-text-secondary)' : '#34d399',
                                        border: '1px solid rgba(16,185,129,0.28)',
                                        cursor: savingCallTracking ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {savingCallTracking ? 'Saving...' : 'Save Call Tracking'}
                                </button>
                            </div>

                            <div style={{ marginTop: 24 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary-soft)', marginBottom: 12 }}>Call History</div>
                                {callLogs.length === 0 ? (
                                    <p style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>No call entries added yet.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {callLogs.map((log) => (
                                            <div
                                                key={log.id}
                                                style={{
                                                    padding: 14,
                                                    borderRadius: 12,
                                                    background: 'var(--admin-surface-accent)',
                                                    border: '1px solid rgba(148,163,184,0.08)',
                                                    boxShadow: isLight ? '0 10px 24px rgba(15,23,42,0.05)' : 'none',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                                                        Call {log.call_round}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                                                        {log.called_at ? new Date(log.called_at).toLocaleString() : '—'}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 10 }}>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Caller</div>
                                                        <div style={{ fontSize: 13, color: 'var(--admin-text-primary)', fontWeight: 600 }}>{log.caller_name || '—'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Status</div>
                                                        <div style={{ fontSize: 13, color: 'var(--admin-text-primary)', fontWeight: 600 }}>{log.call_status_label || 'Not Set'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Rejected</div>
                                                        <div style={{ fontSize: 13, color: log.is_rejected ? '#f87171' : '#34d399', fontWeight: 700 }}>
                                                            {log.is_rejected ? 'Yes' : 'No'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Next Follow Up</div>
                                                        <div style={{ fontSize: 13, color: 'var(--admin-text-primary)', fontWeight: 600 }}>
                                                            {log.next_follow_up ? new Date(log.next_follow_up).toLocaleDateString() : '—'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Comments</div>
                                                        <div style={{ fontSize: 13, color: 'var(--admin-text-primary-soft)', lineHeight: 1.5 }}>{log.comments || '—'}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>Issue Facing</div>
                                                        <div style={{ fontSize: 13, color: 'var(--admin-text-primary-soft)', lineHeight: 1.5 }}>{log.issue_facing || '—'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Credentials Modal */}
            {credentialsPopup && renderInBody(
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: isMobile ? 10 : 20,
                }} onClick={() => setCredentialsPopup(null)}>
                    <div style={{
                        background: 'var(--admin-base-1)', padding: isMobile ? 18 : 32, borderRadius: 16, width: isMobile ? '100%' : 400, maxWidth: 400,
                        border: '1px solid var(--admin-border-soft)', textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--admin-text-strong)', marginBottom: 8 }}>Credentials Generated!</h3>
                        <p style={{ color: 'var(--admin-text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
                            {credentialsPopup.message}
                        </p>

                        <div style={{ background: 'var(--admin-surface-strong)', padding: 16, borderRadius: 8, marginBottom: 24, textAlign: 'left' }}>
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Username</div>
                                <div style={{ fontSize: 15, color: 'var(--admin-text-primary)', fontWeight: 600, fontFamily: 'monospace' }}>{credentialsPopup.username}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Password</div>
                                <div style={{ fontSize: 15, color: 'var(--admin-text-primary)', fontWeight: 600, fontFamily: 'monospace' }}>{credentialsPopup.password}</div>
                            </div>
                        </div>

                        <button onClick={() => setCredentialsPopup(null)} style={{
                            width: '100%', padding: '10px', borderRadius: 8,
                            background: '#3b82f6', color: '#fff', border: 'none',
                            fontWeight: 600, fontSize: 14, cursor: 'pointer'
                        }}>
                            Done
                        </button>
                    </div>
                </div>
                )
            }

            {/* Snapshot Modal */}
            {
                selectedSnapshot && renderInBody(
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 110,
                        background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 8 : 20
                    }} onClick={() => setSelectedSnapshot(null)}>
                        <div style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: isMobile ? '100%' : 980,
                            maxHeight: '90vh',
                            background: 'var(--admin-base-1)',
                            borderRadius: 16,
                            border: '1px solid var(--admin-border-soft)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{
                                padding: isMobile ? '12px 10px' : '14px 18px',
                                borderBottom: '1px solid var(--admin-border-soft)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                flexWrap: isMobile ? 'wrap' : 'nowrap',
                                background: 'var(--admin-surface-soft)',
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--admin-text-strong)' }}>
                                        Proctoring Snapshot
                                        {selectedSnapshot.is_violation && (
                                            <span style={{
                                                marginLeft: 10, fontSize: 11, fontWeight: 800,
                                                background: 'rgba(239,68,68,0.15)', color: '#f87171',
                                                border: '1px solid rgba(239,68,68,0.25)', padding: '2px 8px', borderRadius: 999,
                                            }}>
                                                VIOLATION
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                                        {selectedSnapshot.timestamp ? new Date(selectedSnapshot.timestamp).toLocaleString() : '—'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                                    <button
                                        className="tp-btn"
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(JSON.stringify(selectedSnapshot, null, 2));
                                            } catch {
                                                // ignore clipboard failures
                                            }
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: 10,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            background: 'var(--admin-border-soft)',
                                            color: 'var(--admin-text-secondary)',
                                            border: '1px solid var(--admin-border-mid)',
                                            cursor: 'pointer',
                                        }}
                                        title="Copy snapshot JSON"
                                    >
                                        Copy JSON
                                    </button>
                                    <button
                                        className="tp-btn"
                                        onClick={() => {
                                            try {
                                                window.open(selectedSnapshot.image_url, '_blank', 'noopener,noreferrer');
                                            } catch {
                                                // ignore popup failures
                                            }
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: 10,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            background: 'rgba(59,130,246,0.12)',
                                            color: '#60a5fa',
                                            border: '1px solid rgba(59,130,246,0.18)',
                                            cursor: 'pointer',
                                        }}
                                        title="Open original snapshot in a new tab"
                                    >
                                        Open Original
                                    </button>
                                    <button onClick={() => setSelectedSnapshot(null)} style={{
                                        background: 'none', border: 'none', color: 'var(--admin-text-secondary)', fontSize: 22, cursor: 'pointer',
                                        padding: 0, display: 'flex', alignItems: 'center'
                                    }}>
                                        ✕
                                    </button>
                                </div>
                            </div>

                            <div style={{ padding: isMobile ? 10 : 18, overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.25fr 1fr', gap: 16 }}>
                                    <div style={{
                                        borderRadius: 14,
                                        overflow: 'hidden',
                                        background: 'var(--admin-surface-strong)',
                                        border: '1px solid var(--admin-border-soft)',
                                    }}>
                                        <img
                                            src={selectedSnapshot.image_url}
                                            alt="Snapshot"
                                            style={{ width: '100%', display: 'block', maxHeight: '70vh', objectFit: 'contain', background: '#0b1220' }}
                                        />
                                    </div>

                                    <div style={{
                                        borderRadius: 14,
                                        background: 'var(--admin-surface-strong)',
                                        border: '1px solid var(--admin-border-soft)',
                                        padding: 14,
                                    }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--admin-text-primary)', marginBottom: 10 }}>Telemetry</div>
                                        {fieldRow('snapshot_id', selectedSnapshot.snapshot_id || '—')}
                                        {fieldRow('faces', String(selectedSnapshot.face_count ?? '—'))}
                                        {fieldRow('match_score', selectedSnapshot.match_score != null ? `${Math.round(selectedSnapshot.match_score)}%` : '—')}
                                        {fieldRow('pose_yaw', selectedSnapshot.pose_yaw ?? '—')}
                                        {fieldRow('pose_pitch', selectedSnapshot.pose_pitch ?? '—')}
                                        {fieldRow('pose_roll', selectedSnapshot.pose_roll ?? '—')}
                                        {fieldRow('mouth_state', selectedSnapshot.mouth_state ?? '—')}
                                        {fieldRow('audio_detected', String(selectedSnapshot.audio_detected ?? '—'))}
                                        {fieldRow('audio_level', selectedSnapshot?.rule_outcomes?.audio_signal?.audio_level ?? '—')}
                                        {fieldRow('audio_threshold', selectedSnapshot?.rule_outcomes?.audio_signal?.audio_threshold ?? '—')}
                                        {fieldRow('gaze_violation', String(selectedSnapshot.gaze_violation ?? '—'))}
                                        {(() => {
                                            const clips = Array.isArray(selectedSnapshot?._session_audio_clips) ? selectedSnapshot._session_audio_clips : [];
                                            const match = clips.find(c => c?.snapshot_id && String(c.snapshot_id) === String(selectedSnapshot.snapshot_id));
                                            if (!match?.file_url) return null;
                                            return (
                                                <div style={{ marginTop: 10 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--admin-text-primary)', marginBottom: 6 }}>
                                                        Audio Clip
                                                    </div>
                                                    <audio controls preload="none" style={{ width: '100%' }} src={match.file_url} />
                                                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--admin-text-secondary)' }}>
                                                        level: <span style={{ color: 'var(--admin-text-primary)', fontWeight: 700 }}>{match.audio_level ?? '—'}</span>
                                                        {' · '}
                                                        duration: <span style={{ color: 'var(--admin-text-primary)', fontWeight: 700 }}>{match.duration_ms ?? '—'}ms</span>
                                                        {' · '}
                                                        mime: <span style={{ color: 'var(--admin-text-primary)', fontWeight: 700 }}>{match.mime_type || '—'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        {selectedSnapshot.violation_reason && (
                                            <div style={{ marginTop: 10, fontSize: 12, color: '#fca5a5', fontWeight: 700 }}>
                                                Reason: <span style={{ color: '#fecaca', fontWeight: 600 }}>{selectedSnapshot.violation_reason}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                                    <div style={{
                                        borderRadius: 14,
                                        background: 'var(--admin-surface-strong)',
                                        border: '1px solid var(--admin-border-soft)',
                                        padding: 14,
                                    }}>
                                        <details>
                                            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                                                label_detection_results ({Array.isArray(selectedSnapshot.label_detection_results) ? selectedSnapshot.label_detection_results.length : 0})
                                            </summary>
                                            <pre style={{ marginTop: 10, whiteSpace: 'pre-wrap', fontSize: 11, color: 'var(--admin-text-secondary)' }}>
                                                {JSON.stringify(selectedSnapshot.label_detection_results || [], null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                    <div style={{
                                        borderRadius: 14,
                                        background: 'var(--admin-surface-strong)',
                                        border: '1px solid var(--admin-border-soft)',
                                        padding: 14,
                                    }}>
                                        <details open>
                                            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                                                rule_outcomes
                                            </summary>
                                            <pre style={{ marginTop: 10, whiteSpace: 'pre-wrap', fontSize: 11, color: 'var(--admin-text-secondary)' }}>
                                                {JSON.stringify(selectedSnapshot.rule_outcomes || {}, null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Image Modal */}
            {
                selectedImage && renderInBody(
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 100,
                        background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40
                    }} onClick={() => setSelectedImage(null)}>
                        <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
                            <button onClick={() => setSelectedImage(null)} style={{
                                position: 'absolute', top: -50, right: 0,
                                border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(0,0,0,0.5)', borderRadius: 20
                            }}>
                                ✕ Close
                            </button>
                            {isPdf(selectedImage) ? (
                                <iframe src={selectedImage} title="Document Preview" style={{
                                    width: '80vw', height: '80vh', borderRadius: 8, border: 'none', background: '#fff'
                                }} />
                            ) : (
                                <img src={selectedImage} alt="Full view" style={{
                                    maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain',
                                    borderRadius: 8, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                                }} />
                            )}
                        </div>
                    </div>
                    )
            }
            {/* Expanded Video Card Modal */}
            {
                selectedVideoCard && renderInBody(
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 100,
                        background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 8 : 20
                    }} onClick={() => setSelectedVideoCard(null)}>
                        <div style={{
                            position: 'relative', width: '100%', maxWidth: 800, maxHeight: '90vh',
                            background: 'var(--admin-base-1)', borderRadius: 16, border: '1px solid var(--admin-border-soft)',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden'
                        }} onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div style={{
                                padding: isMobile ? '12px 12px' : '16px 24px', borderBottom: '1px solid var(--admin-border-soft)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--admin-surface-soft)'
                            }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--admin-text-strong)', margin: 0 }}>Video Analysis</h3>
                                <button onClick={() => setSelectedVideoCard(null)} style={{
                                    background: 'none', border: 'none', color: 'var(--admin-text-secondary)', fontSize: 24, cursor: 'pointer',
                                    padding: 0, display: 'flex', alignItems: 'center'
                                }}>
                                    ✕
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div style={{ padding: isMobile ? 12 : 24, overflowY: 'auto' }}>
                                {/* Question */}
                                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--admin-text-primary)', marginBottom: 20, lineHeight: 1.5 }}>
                                    {selectedVideoCard.question}
                                </div>

                                {/* Video Player */}
                                <div style={{ marginBottom: 24, borderRadius: 12, overflow: 'hidden', background: '#000', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                    <video
                                        controls
                                        style={{ width: '100%', maxHeight: isMobile ? 260 : 400, display: 'block' }}
                                    >
                                        <source src={selectedVideoCard.video_url} type="video/webm" />
                                        Your browser does not support the video tag.
                                    </video>
                                </div>

                                {/* Results Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(250px, 1fr) 2fr', gap: isMobile ? 12 : 24 }}>
                                    {/* Score Column */}
                                    <div style={{
                                        padding: 20, background: 'var(--admin-surface-soft)', borderRadius: 12, border: '1px solid rgba(148,163,184,0.08)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8
                                    }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>AI Score</div>
                                        <div style={{ fontSize: isMobile ? 38 : 48, fontWeight: 800, color: '#10b981' }}>{selectedVideoCard.ai_score}/5</div>
                                        <div style={{
                                            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                            background: 'rgba(16,185,129,0.1)', color: '#34d399'
                                        }}>
                                            {selectedVideoCard.ai_status === 'completed' ? 'Evaluated' : selectedVideoCard.ai_status}
                                        </div>
                                    </div>

                                    {/* Feedback Column */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div style={{ padding: 16, background: 'var(--admin-surface-soft)', borderRadius: 12, border: '1px solid rgba(148,163,184,0.08)' }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Transcript</div>
                                            <div style={{ fontSize: 14, color: 'var(--admin-text-primary-soft)', lineHeight: 1.6, fontStyle: 'italic', maxHeight: 150, overflowY: 'auto' }}>
                                                "{selectedVideoCard.ai_transcript}"
                                            </div>
                                        </div>

                                        <div style={{ padding: 16, background: 'rgba(59,130,246,0.05)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.1)' }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 8, textTransform: 'uppercase' }}>AI Feedback</div>
                                            <div style={{ fontSize: 14, color: '#bfdbfe', lineHeight: 1.6 }}>
                                                {selectedVideoCard.ai_feedback?.feedback || selectedVideoCard.ai_feedback}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    )
            }
        </div >
    );
};

export default ConsultantDetail;
