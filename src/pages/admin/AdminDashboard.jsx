import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { readResponsePayload } from '../../utils/http';
import AdminThemeToggle from './AdminThemeToggle';
import AdminBrandLogo from './AdminBrandLogo';
import { useAdminTheme } from './adminTheme';

const PAGE_SIZE = 50;
const STATUS_FILTER_OPTIONS = [
    'New Join', 'Profile Details', 'Gov ID', 'Face Verification',
    'Degree Upload', 'Assessment Ongoing',
    'Credentials Sent', 'Credentials Failed', 'Retry', 'Disqualified',
];
const ASSESSMENT_SUBSTATUS_OPTIONS = [
    { value: 'all', label: 'All stages' },
    { value: 'mcq', label: 'MCQ' },
    { value: 'video', label: 'Video' },
];
const JOINED_DATE_OPTIONS = [
    { value: 'all', label: 'All joined dates' },
    { value: 'today', label: 'Joined Today' },
    { value: 'last_3_days', label: 'Last 3 days' },
    { value: 'last_5_days', label: 'Last 5 days' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_15_days', label: 'Last 15 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
];
const STATUS_COLORS = {
    'New Join': { bg: 'rgba(148,163,184,0.12)', color: 'var(--admin-text-secondary)' },
    'Profile Details': { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
    'Gov ID': { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    'Face Verification': { bg: 'rgba(45,212,191,0.12)', color: '#2dd4bf' },
    'Degree Upload': { bg: 'rgba(56,189,248,0.12)', color: '#38bdf8' },
    'Assessment Ongoing': { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
    MCQ: { bg: 'rgba(129,140,248,0.12)', color: '#818cf8' },
    Completed: { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
    'Credentials Sent': { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    'Credentials Failed': { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
    Retry: { bg: 'rgba(251,146,60,0.12)', color: '#fb923c' },
    Disqualified: { bg: 'rgba(248,113,113,0.14)', color: '#f87171' },
};
const SUBSTATUS_COLORS = {
    MCQ: { bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
    Video: { bg: 'rgba(139,92,246,0.12)', color: '#7c3aed' },
};

const ChevronIcon = ({ open }) => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 20 20"
        aria-hidden="true"
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}
    >
        <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CheckIcon = ({ visible }) => (
    <svg width="11" height="11" viewBox="0 0 20 20" aria-hidden="true" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.14s ease' }}>
        <path d="M4.5 10.5L8.2 14.2L15.5 6.9" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CloseIcon = () => (
    <svg width="11" height="11" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M6 6L14 14M14 6L6 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { isLight, themeVars, toggleTheme } = useAdminTheme();
    const token = localStorage.getItem('admin_token');
    const searchRef = useRef('');
    const hasInitializedSearchEffect = useRef(false);
    const statusMenuRef = useRef(null);
    const [consultants, setConsultants] = useState([]);
    const [stats, setStats] = useState({ total: 0, status_counts: {} });
    const [search, setSearch] = useState('');
    const [statusFilters, setStatusFilters] = useState([]);
    const [assessmentSubstatusFilter, setAssessmentSubstatusFilter] = useState('all');
    const [joinedDateFilter, setJoinedDateFilter] = useState('all');
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [dispatchingDueNotifications, setDispatchingDueNotifications] = useState(false);
    const [statusMenuOpen, setStatusMenuOpen] = useState(false);
    const showAssessmentSubstatus = statusFilters.includes('Assessment Ongoing');

    const statusCounts = stats?.status_counts || {};
    const totalValue = Number(stats?.total || 0);
    const consultantsValue = Number(statusCounts['Credentials Sent'] ?? stats?.working ?? 0);
    const spamLeadsValue = Number(statusCounts['New Join'] || 0);
    const disqualifiedValue = Number(statusCounts['Disqualified'] ?? stats?.violated ?? 0);
    const inProgressValue = Math.max(0, totalValue - spamLeadsValue - consultantsValue - disqualifiedValue);

    const summaryCards = [
        {
            label: 'Total',
            value: totalValue,
            accent: isLight ? '#64748B' : '#94A3B8',
            border: isLight ? 'rgba(100,116,139,0.30)' : 'rgba(148,163,184,0.35)',
            background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(24,35,56,0.95) 100%)',
        },
        {
            label: 'Consultants',
            value: consultantsValue,
            accent: isLight ? '#059669' : '#34D399',
            border: isLight ? 'rgba(5,150,105,0.30)' : 'rgba(16,185,129,0.30)',
            background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(236,253,245,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(12,44,42,0.92) 100%)',
        },
        {
            label: 'In Progress',
            value: inProgressValue,
            accent: isLight ? '#2563EB' : '#60A5FA',
            border: isLight ? 'rgba(37,99,235,0.30)' : 'rgba(96,165,250,0.30)',
            background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(239,246,255,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(18,35,73,0.92) 100%)',
        },
        {
            label: 'Spam Leads',
            value: spamLeadsValue,
            accent: isLight ? '#D97706' : '#FBBF24',
            border: isLight ? 'rgba(217,119,6,0.32)' : 'rgba(251,191,36,0.32)',
            background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,247,237,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(54,39,16,0.92) 100%)',
        },
        {
            label: 'Disqualified',
            value: disqualifiedValue,
            accent: isLight ? '#DC2626' : '#FB7185',
            border: isLight ? 'rgba(220,38,38,0.30)' : 'rgba(251,113,133,0.30)',
            background: isLight
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,241,242,0.98) 100%)'
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(41,22,36,0.92) 100%)',
        },
    ];

    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    const resetSession = () => {
        localStorage.removeItem('admin_token');
        navigate(adminUrl());
    };

    const fetchConsultants = async (
        pg = 1,
        currentSearch = search,
        currentStatuses = statusFilters,
        currentAssessmentSubstatus = assessmentSubstatusFilter,
        currentJoinedDate = joinedDateFilter,
    ) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: String(pg), page_size: String(PAGE_SIZE) });
            if (currentSearch.trim()) params.set('search', currentSearch.trim());
            currentStatuses.forEach((statusValue) => params.append('status', statusValue));
            if (currentStatuses.includes('Assessment Ongoing') && currentAssessmentSubstatus !== 'all') {
                params.set('assessment_substatus', currentAssessmentSubstatus);
            }
            if (currentJoinedDate !== 'all') params.set('joined_range', currentJoinedDate);
            const res = await fetch(apiUrl(`/admin-panel/consultants/?${params}`), { headers: authHeaders });
            if (res.status === 401 || res.status === 403) return resetSession();
            const data = await res.json();
            setConsultants(data.consultants || []);
            setStats(data.stats || { total: 0, status_counts: {} });
            setTotalPages(data.total_pages || 1);
            setTotalCount(data.total || 0);
            setPage(pg);
        } catch {
            setError('Failed to load consultants');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token && !import.meta.env.DEV) navigate(adminUrl());
    }, [navigate, token]);

    useEffect(() => {
        if (!hasInitializedSearchEffect.current) {
            hasInitializedSearchEffect.current = true;
            return undefined;
        }
        searchRef.current = search;
        const timer = setTimeout(() => {
            if (searchRef.current === search) fetchConsultants(1, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter);
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        if (!token && !import.meta.env.DEV) return;
        fetchConsultants(1, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilters, assessmentSubstatusFilter, joinedDateFilter]);

    useEffect(() => {
        if (!showAssessmentSubstatus && assessmentSubstatusFilter !== 'all') {
            setAssessmentSubstatusFilter('all');
        }
    }, [showAssessmentSubstatus, assessmentSubstatusFilter]);

    useEffect(() => {
        if (!statusMenuOpen) return undefined;
        const handlePointerDown = (event) => {
            if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
                setStatusMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [statusMenuOpen]);

    const normalizeAdminStatus = (statusValue) => {
        const raw = String(statusValue || '').trim();
        if (!raw) return 'New Join';
        const normalized = raw.toLowerCase();
        if (normalized === 'completed') return 'Credentials Failed';
        if (normalized === 'credentials not sent') return 'Credentials Failed';
        return raw;
    };

    const sorted = useMemo(() => {
        const toNum = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };
        const toDate = (v) => {
            const d = v ? new Date(v) : null;
            return d && !Number.isNaN(d.getTime()) ? d.getTime() : null;
        };
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...consultants].sort((a, b) => {
            if (sortKey === 'name') return String(a?.full_name || a?.email || '').localeCompare(String(b?.full_name || b?.email || '')) * dir;
            if (sortKey === 'status') {
                const statusA = normalizeAdminStatus(a?.assessment_display_status || a?.assessment_status);
                const statusB = normalizeAdminStatus(b?.assessment_display_status || b?.assessment_status);
                return String(statusA).localeCompare(String(statusB)) * dir;
            }
            if (sortKey === 'score') return ((toNum(a?.assessment_score) ?? -1) - (toNum(b?.assessment_score) ?? -1)) * dir;
            if (sortKey === 'updated_at') return ((toDate(a?.updated_at) ?? 0) - (toDate(b?.updated_at) ?? 0)) * dir;
            if (sortKey === 'assessment_count') return ((toNum(a?.assessment_count) ?? 0) - (toNum(b?.assessment_count) ?? 0)) * dir;
            return ((toDate(a?.created_at) ?? 0) - (toDate(b?.created_at) ?? 0)) * dir;
        });
    }, [consultants, sortDir, sortKey]);

    const setSort = (key) => {
        setSortKey((prev) => {
            if (prev !== key) {
                setSortDir('desc');
                return key;
            }
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
            return prev;
        });
    };

    const sortIndicator = (key) => {
        const isActive = sortKey === key;
        const upColor = isActive && sortDir === 'asc' ? '#10b981' : 'var(--admin-text-muted)';
        const downColor = isActive && sortDir === 'desc' ? '#10b981' : 'var(--admin-text-muted)';
        const inactiveOpacity = isActive ? 0.45 : 0.35;

        return (
            <span
                aria-hidden="true"
                style={{
                    marginLeft: 8,
                    display: 'inline-flex',
                    flexDirection: 'column',
                    gap: 2,
                    verticalAlign: 'middle',
                }}
            >
                <span
                    style={{
                        width: 0,
                        height: 0,
                        borderLeft: '4px solid transparent',
                        borderRight: '4px solid transparent',
                        borderBottom: `6px solid ${upColor}`,
                        opacity: isActive && sortDir === 'asc' ? 1 : inactiveOpacity,
                    }}
                />
                <span
                    style={{
                        width: 0,
                        height: 0,
                        borderLeft: '4px solid transparent',
                        borderRight: '4px solid transparent',
                        borderTop: `6px solid ${downColor}`,
                        opacity: isActive && sortDir === 'desc' ? 1 : inactiveOpacity,
                    }}
                />
            </span>
        );
    };

    const toggleStatusFilter = (statusValue) => {
        setStatusFilters((prev) => (
            prev.includes(statusValue)
                ? prev.filter((value) => value !== statusValue)
                : [...prev, statusValue]
        ));
    };

    const statusSelectionLabel = statusFilters.length === 0
        ? 'All statuses'
        : statusFilters.length === 1
            ? statusFilters[0]
            : `${statusFilters.length} statuses`;

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.set('search', search.trim());
            statusFilters.forEach((statusValue) => params.append('status', statusValue));
            if (showAssessmentSubstatus && assessmentSubstatusFilter !== 'all') {
                params.set('assessment_substatus', assessmentSubstatusFilter);
            }
            if (joinedDateFilter !== 'all') params.set('joined_range', joinedDateFilter);
            const res = await fetch(apiUrl(`/admin-panel/consultants/export/?${params}`), { headers: authHeaders });
            if (res.status === 401 || res.status === 403) return resetSession();
            if (!res.ok) return alert('Export failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `consultants_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch {
            alert('Failed to export');
        } finally {
            setExporting(false);
        }
    };

    const handleDispatchDueNotifications = async () => {
        setDispatchingDueNotifications(true);
        try {
            const res = await fetch(apiUrl('/admin-panel/notifications/dispatch-due/'), { method: 'POST', headers: authHeaders });
            if (res.status === 401 || res.status === 403) return resetSession();
            const payload = await readResponsePayload(res);
            if (!res.ok) return alert(payload.error || 'Failed to dispatch due onboarding notifications');
            alert(payload.message || `Queued ${payload.queued || 0} due onboarding notification(s).`);
        } catch {
            alert('Failed to connect to server');
        } finally {
            setDispatchingDueNotifications(false);
        }
    };

    return (
        <div className="tp-page" style={{ ...themeVars, minHeight: '100vh', background: 'var(--admin-page-bg)', fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--admin-text-strong)' }}>
            <header style={{ background: 'var(--admin-header-bg)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--admin-border-soft)', position: 'sticky', top: 0, zIndex: 30 }}>
                <div style={{ maxWidth: 1500, margin: '0 auto', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <AdminBrandLogo isLight={isLight} height={28} />
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Admin Dashboard</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <AdminThemeToggle isLight={isLight} onToggle={toggleTheme} />
                        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>Showing {totalCount} total</span>
                        <button className="tp-btn" onClick={handleExportExcel} disabled={exporting || loading} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: exporting ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.15)', color: exporting ? 'var(--admin-text-muted)' : '#34d399', border: '1px solid rgba(16,185,129,0.25)', cursor: exporting || loading ? 'not-allowed' : 'pointer' }}>{exporting ? 'Exporting...' : 'Export Excel'}</button>
                        <button className="tp-btn" onClick={() => fetchConsultants(page)} disabled={loading} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'Refreshing...' : 'Refresh'}</button>
                        <button className="tp-btn" onClick={() => navigate(adminUrl('emails'))} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)', cursor: 'pointer' }}>Email Monitor</button>
                        <button className="tp-btn" onClick={handleDispatchDueNotifications} disabled={dispatchingDueNotifications} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: dispatchingDueNotifications ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.16)', color: dispatchingDueNotifications ? 'var(--admin-text-secondary)' : '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', cursor: dispatchingDueNotifications ? 'not-allowed' : 'pointer' }}>{dispatchingDueNotifications ? 'Dispatching...' : 'Send Due Emails'}</button>
                        <button className="tp-btn" onClick={resetSession} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>Logout</button>
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 1500, margin: '0 auto', padding: '28px 32px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: 14,
                    marginBottom: 22,
                }}>
                    {summaryCards.map((card) => (
                        <div
                            key={card.label}
                            style={{
                                minHeight: 108,
                                borderRadius: 18,
                                border: `1px solid ${card.border}`,
                                background: card.background,
                                boxShadow: isLight
                                    ? '0 18px 36px rgba(148,163,184,0.12), inset 0 1px 0 rgba(255,255,255,0.9)'
                                    : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                                padding: '18px 18px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: isLight ? '#64748b' : '#6f89b4',
                                }}>
                                    {card.label}
                                </span>
                                <span style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    background: card.accent,
                                    boxShadow: `0 0 0 8px ${card.accent}1c`,
                                    flexShrink: 0,
                                }} />
                            </div>
                            <div style={{
                                fontSize: 32,
                                lineHeight: 1,
                                fontWeight: 800,
                                color: isLight ? '#0f172a' : '#ffffff',
                                letterSpacing: '-0.03em',
                            }}>
                                {card.value}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input value={search} placeholder="Search by name, email, or phone..." onChange={(e) => setSearch(e.target.value)} style={{ flex: '1 1 320px', maxWidth: 520, padding: '11px 16px', borderRadius: 12, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', boxShadow: isLight ? '0 10px 20px rgba(148,163,184,0.08)' : 'none', color: 'var(--admin-text-strong)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                        <div ref={statusMenuRef} style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => setStatusMenuOpen((open) => !open)}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: 12,
                                    background: 'var(--admin-surface-strong)',
                                    border: '1px solid var(--admin-border-mid)',
                                    boxShadow: isLight ? '0 10px 20px rgba(148,163,184,0.08)' : 'none',
                                    color: 'var(--admin-text-primary)',
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    minWidth: 172,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                }}
                            >
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{statusSelectionLabel}</span>
                                <span style={{ color: 'var(--admin-text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                                    <ChevronIcon open={statusMenuOpen} />
                                </span>
                            </button>
                            {statusMenuOpen && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 8px)',
                                        left: 0,
                                        zIndex: 12,
                                        width: 250,
                                        maxHeight: 280,
                                        overflowY: 'auto',
                                        padding: 10,
                                        borderRadius: 12,
                                        background: 'var(--admin-surface-strong)',
                                        border: '1px solid var(--admin-border-mid)',
                                        boxShadow: isLight ? '0 18px 30px rgba(148,163,184,0.2)' : '0 18px 34px rgba(2,6,23,0.45)',
                                    }}
                                >
                                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                                        Select Statuses
                                    </div>
                                    {STATUS_FILTER_OPTIONS.map((statusOption) => {
                                        const selected = statusFilters.includes(statusOption);
                                        return (
                                            <button
                                                key={statusOption}
                                                type="button"
                                                onClick={() => toggleStatusFilter(statusOption)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 10px',
                                                    borderRadius: 9,
                                                    border: `1px solid ${selected ? 'rgba(16,185,129,0.34)' : 'var(--admin-border-mid)'}`,
                                                    background: selected ? 'rgba(16,185,129,0.12)' : 'var(--admin-surface)',
                                                    color: selected ? '#10b981' : 'var(--admin-text-secondary)',
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    marginBottom: 6,
                                                    textAlign: 'left',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: 14,
                                                        height: 14,
                                                        borderRadius: 3,
                                                        border: `1px solid ${selected ? 'rgba(16,185,129,0.55)' : 'var(--admin-border-mid)'}`,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 10,
                                                        lineHeight: 1,
                                                        color: selected ? '#10b981' : 'transparent',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <CheckIcon visible={selected} />
                                                </span>
                                                <span>{statusOption}</span>
                                            </button>
                                        );
                                    })}
                                    {statusFilters.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStatusFilters([]);
                                                setAssessmentSubstatusFilter('all');
                                            }}
                                            style={{
                                                width: '100%',
                                                marginTop: 4,
                                                padding: '7px 10px',
                                                borderRadius: 9,
                                                border: '1px solid var(--admin-border-mid)',
                                                background: 'var(--admin-surface)',
                                                color: 'var(--admin-text-muted)',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Clear status selection
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setStatusMenuOpen(false)}
                                        style={{
                                            width: '100%',
                                            marginTop: 6,
                                            padding: '7px 10px',
                                            borderRadius: 9,
                                            border: '1px solid rgba(16,185,129,0.34)',
                                            background: 'rgba(16,185,129,0.14)',
                                            color: '#10b981',
                                            fontSize: 12,
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </div>
                        <select value={joinedDateFilter} onChange={(e) => setJoinedDateFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', boxShadow: isLight ? '0 10px 20px rgba(148,163,184,0.08)' : 'none', color: 'var(--admin-text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                            {JOINED_DATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        {(search || statusFilters.length > 0 || assessmentSubstatusFilter !== 'all' || joinedDateFilter !== 'all') && <button className="tp-btn" onClick={() => { setSearch(''); setStatusFilters([]); setAssessmentSubstatusFilter('all'); setJoinedDateFilter('all'); setStatusMenuOpen(false); }} style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>Clear</button>}
                    </div>
                    {statusFilters.length > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {statusFilters.map((statusValue) => (
                                <button
                                    key={statusValue}
                                    type="button"
                                    onClick={() => toggleStatusFilter(statusValue)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: 999,
                                        border: '1px solid rgba(16,185,129,0.35)',
                                        background: 'rgba(16,185,129,0.14)',
                                        color: '#10b981',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <span>{statusValue}</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                        <CloseIcon />
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                    {showAssessmentSubstatus && (
                        <div
                            style={{
                                marginTop: 10,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 10px',
                                borderRadius: 12,
                                background: isLight ? 'rgba(248,250,252,0.92)' : 'rgba(15,23,42,0.48)',
                                border: '1px solid var(--admin-border-soft)',
                            }}
                        >
                            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>
                                Assessment Stage
                            </span>
                            {ASSESSMENT_SUBSTATUS_OPTIONS.map((option) => {
                                const isActive = assessmentSubstatusFilter === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setAssessmentSubstatusFilter(option.value)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: 999,
                                            border: `1px solid ${isActive ? 'rgba(16,185,129,0.34)' : 'var(--admin-border-mid)'}`,
                                            background: isActive ? 'rgba(16,185,129,0.14)' : 'var(--admin-surface-strong)',
                                            color: isActive ? '#10b981' : 'var(--admin-text-secondary)',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--admin-text-muted)' }}>Loading consultants...</div>}
                {error && <div style={{ textAlign: 'center', padding: 40, color: '#f87171' }}>{error}</div>}

                {!loading && !error && (
                    <div style={{ background: 'var(--admin-surface-strong)', borderRadius: 18, border: '1px solid var(--admin-border-soft)', boxShadow: isLight ? '0 18px 40px rgba(148,163,184,0.12)' : 'none', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1060, tableLayout: 'fixed' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                        <th onClick={() => setSort('name')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 220 }}>Name{sortIndicator('name')}</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, width: 300 }}>Details</th>
                                        <th onClick={() => setSort('status')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 150 }}>Status{sortIndicator('status')}</th>
                                        <th onClick={() => setSort('score')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 180 }}>Score{sortIndicator('score')}</th>
                                        <th onClick={() => setSort('created_at')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 120 }}>Joining{sortIndicator('created_at')}</th>
                                        <th onClick={() => setSort('updated_at')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 140 }}>Latest Changes{sortIndicator('updated_at')}</th>
                                        <th onClick={() => setSort('assessment_count')} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer', userSelect: 'none', width: 120 }}>Attempts{sortIndicator('assessment_count')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((c, i) => {
                                        const displayStatus = normalizeAdminStatus(c.assessment_display_status || c.assessment_status);
                                        const style = STATUS_COLORS[displayStatus] || STATUS_COLORS['New Join'];
                                        const substatusStyle = c.assessment_substatus ? (SUBSTATUS_COLORS[c.assessment_substatus] || SUBSTATUS_COLORS.MCQ) : null;
                                        return (
                                            <tr key={c.id} onClick={() => window.open(adminUrl(`consultant/${c.id}`), '_blank', 'noopener,noreferrer')} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)', cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)' }}>
                                                <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 800, color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <a href={adminUrl(`consultant/${c.id}`)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--admin-text-primary)', textDecoration: 'none' }}>{c.full_name || '-'}</a>
                                                </td>
                                                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email || '-'}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>{c.phone_number || '-'}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                                                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: style.bg, color: style.color, whiteSpace: 'nowrap' }}>{displayStatus}</span>
                                                        {c.assessment_substatus && (
                                                            <span style={{ padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800, background: substatusStyle.bg, color: substatusStyle.color, letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                                                {c.assessment_substatus}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                                    <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', fontWeight: 700 }}>{c.assessment_score != null ? `MCQ: ${c.assessment_score}/50` : 'MCQ: -'}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>{c.video_score != null ? `Video: ${c.video_score}/${c.video_total || '?'}` : 'Video: -'}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--admin-text-muted)' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
                                                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--admin-text-muted)' }}>{c.updated_at ? new Date(c.updated_at).toLocaleString() : '-'}</td>
                                                <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--admin-text-secondary)', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.assessment_count ?? 0}</td>
                                            </tr>
                                        );
                                    })}
                                    {sorted.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>{(search || statusFilters.length > 0 || assessmentSubstatusFilter !== 'all' || joinedDateFilter !== 'all') ? 'No consultants match your current filters.' : 'No consultants found.'}</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(148,163,184,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--admin-text-muted)', fontSize: 12, flexWrap: 'wrap', gap: 8, background: isLight ? 'rgba(248,250,252,0.9)' : 'transparent' }}>
                            <span>Page <span style={{ color: 'var(--admin-text-primary)', fontWeight: 800 }}>{page}</span> of <span style={{ color: 'var(--admin-text-primary)', fontWeight: 800 }}>{totalPages}</span>{' . '}{totalCount} result{totalCount !== 1 ? 's' : ''}</span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button onClick={() => fetchConsultants(1, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter)} disabled={page <= 1 || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page <= 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>{'<<'}</button>
                                <button onClick={() => fetchConsultants(page - 1, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter)} disabled={page <= 1 || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page <= 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>{'< Prev'}</button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                                    const p = start + i;
                                    return p <= totalPages ? <button key={p} onClick={() => fetchConsultants(p, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter)} disabled={loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: p === page ? 'rgba(16,185,129,0.2)' : 'var(--admin-tab-idle)', color: p === page ? '#34d399' : 'var(--admin-text-secondary)', border: `1px solid ${p === page ? 'rgba(16,185,129,0.35)' : 'var(--admin-border-mid)'}`, cursor: loading ? 'not-allowed' : 'pointer', minWidth: 32 }}>{p}</button> : null;
                                })}
                                <button onClick={() => fetchConsultants(page + 1, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter)} disabled={page >= totalPages || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page >= totalPages ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>{'Next >'}</button>
                                <button onClick={() => fetchConsultants(totalPages, search, statusFilters, assessmentSubstatusFilter, joinedDateFilter)} disabled={page >= totalPages || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page >= totalPages ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>{'>>'}</button>
                            </div>
                            <span style={{ color: 'var(--admin-text-secondary)' }}>Tip: click headers to sort</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
