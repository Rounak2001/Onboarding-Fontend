import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { readResponsePayload } from '../../utils/http';
import BrandLogo from '../../components/BrandLogo';

const PAGE_SIZE = 50;

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [consultants, setConsultants] = useState([]);
    const [stats, setStats] = useState({ total: 0, completed: 0, ongoing: 0, violated: 0, working: 0 });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [verificationFilter, setVerificationFilter] = useState('all');
    const [credentialsFilter, setCredentialsFilter] = useState('all');
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [exporting, setExporting] = useState(false);
    const [dispatchingDueNotifications, setDispatchingDueNotifications] = useState(false);

    const token = localStorage.getItem('admin_token');
    const searchRef = useRef(search);

    const fetchConsultants = async (
        pg = 1,
        currentSearch = search,
        currentStatus = statusFilter,
        currentVerification = verificationFilter,
        currentCredentials = credentialsFilter,
    ) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: pg, page_size: PAGE_SIZE });
            if (currentSearch.trim()) params.set('search', currentSearch.trim());
            if (currentStatus !== 'all') params.set('status', currentStatus);
            if (currentVerification !== 'all') params.set('verification', currentVerification);
            if (currentCredentials !== 'all') params.set('credentials', currentCredentials);

            const res = await fetch(apiUrl(`/admin-panel/consultants/?${params}`), {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            if (res.status === 401 || res.status === 403) { localStorage.removeItem('admin_token'); navigate(adminUrl()); return; }
            const data = await res.json();
            setConsultants(data.consultants || []);
            setStats(data.stats || { total: 0, completed: 0, ongoing: 0, violated: 0, working: 0 });
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
        if (!token && !import.meta.env.DEV) { navigate(adminUrl()); return; }
        fetchConsultants(1);
    }, []);

    // Debounced search re-fetch
    useEffect(() => {
        searchRef.current = search;
        const timer = setTimeout(() => {
            if (searchRef.current === search) fetchConsultants(1, search, statusFilter, verificationFilter, credentialsFilter);
        }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    // Immediate re-fetch on filter change
    useEffect(() => {
        fetchConsultants(1, search, statusFilter, verificationFilter, credentialsFilter);
    }, [statusFilter, verificationFilter, credentialsFilter]);

    const handleDeleteConsultant = async (consultantId, consultantName) => {
        if (!window.confirm(`Delete ${consultantName || 'this consultant'} permanently? This cannot be undone.`)) return;
        setDeletingId(consultantId);
        try {
            const res = await fetch(apiUrl(`/admin-panel/consultants/${consultantId}/delete/`), {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('admin_token');
                navigate(adminUrl());
                return;
            }
            const data = await readResponsePayload(res);
            if (!res.ok) {
                alert(data.error || 'Failed to delete consultant');
                return;
            }
            setConsultants(prev => prev.filter(c => c.id !== consultantId));
        } catch {
            alert('Failed to connect to server');
        } finally {
            setDeletingId(null);
        }
    };

    // Filtering is server-side; only sort the current page client-side
    const sorted = useMemo(() => {
        const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
        const toDate = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d.getTime() : null; };
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...consultants].sort((a, b) => {
            if (sortKey === 'name') return String(a?.full_name || a?.email || '').localeCompare(String(b?.full_name || b?.email || '')) * dir;
            if (sortKey === 'score') return ((toNum(a?.assessment_score) ?? -1) - (toNum(b?.assessment_score) ?? -1)) * dir;
            if (sortKey === 'status') return String(a?.assessment_status || '').localeCompare(String(b?.assessment_status || '')) * dir;
            return ((toDate(a?.created_at) ?? 0) - (toDate(b?.created_at) ?? 0)) * dir;
        });
    }, [consultants, sortKey, sortDir]);

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.set('search', search.trim());
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (verificationFilter !== 'all') params.set('verification', verificationFilter);
            if (credentialsFilter !== 'all') params.set('credentials', credentialsFilter);

            const res = await fetch(apiUrl(`/admin-panel/consultants/export/?${params}`), {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            if (res.status === 401 || res.status === 403) { localStorage.removeItem('admin_token'); navigate(adminUrl()); return; }
            if (!res.ok) { alert('Export failed'); return; }

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

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        navigate(adminUrl());
    };

    const handleDispatchDueNotifications = async () => {
        setDispatchingDueNotifications(true);
        try {
            const res = await fetch(apiUrl('/admin-panel/notifications/dispatch-due/'), {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('admin_token');
                navigate(adminUrl());
                return;
            }
            const payload = await readResponsePayload(res);
            if (!res.ok) {
                alert(payload.error || 'Failed to dispatch due onboarding notifications');
                return;
            }
            alert(payload.message || `Queued ${payload.queued || 0} due onboarding notification(s).`);
        } catch {
            alert('Failed to connect to server');
        } finally {
            setDispatchingDueNotifications(false);
        }
    };

    const verificationBadge = (status) => {
        const colors = {
            Matched: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
            'All Verified': { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
            'No Match': { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.2)' },
            Pending: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
            'Not Done': { bg: 'rgba(100,116,139,0.12)', color: '#64748b', border: 'rgba(100,116,139,0.15)' },
            'No Docs': { bg: 'rgba(100,116,139,0.12)', color: '#64748b', border: 'rgba(100,116,139,0.15)' },
        };
        const c = colors[status] || colors.Pending;
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                whiteSpace: 'nowrap',
            }}>
                {status}
            </span>
        );
    };

    const assessmentStatusBadgeStyle = (status) => {
        const statusColors = {
            Completed: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
            Ongoing: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
            Pending: { bg: 'rgba(250,204,21,0.12)', color: '#facc15' },
            Failed: { bg: 'rgba(251,113,133,0.12)', color: '#fb7185' },
            Violated: { bg: 'rgba(239,68,68,0.14)', color: '#f87171' },
            'Not Started': { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
        };
        return statusColors[status] || statusColors['Not Started'];
    };

    const metricCard = (label, value, tint = 'emerald', options = {}) => {
        const { active = false, onClick = null } = options;
        const tints = {
            emerald: { edge: 'rgba(16,185,129,0.28)', bg: 'rgba(16,185,129,0.08)', fg: '#34d399' },
            blue: { edge: 'rgba(59,130,246,0.28)', bg: 'rgba(59,130,246,0.08)', fg: '#60a5fa' },
            amber: { edge: 'rgba(245,158,11,0.28)', bg: 'rgba(245,158,11,0.08)', fg: '#fbbf24' },
            rose: { edge: 'rgba(249,115,22,0.28)', bg: 'rgba(249,115,22,0.08)', fg: '#fb923c' },
            red: { edge: 'rgba(239,68,68,0.28)', bg: 'rgba(239,68,68,0.08)', fg: '#f87171' },
            slate: { edge: 'rgba(148,163,184,0.18)', bg: 'rgba(148,163,184,0.06)', fg: '#94a3b8' },
        };
        const c = tints[tint] || tints.slate;
        return (
            <button
                type="button"
                onClick={onClick || undefined}
                style={{
                padding: 14,
                borderRadius: 14,
                background: active ? 'rgba(15,23,42,0.72)' : 'rgba(15,23,42,0.45)',
                border: `1px solid ${active ? c.fg : c.edge}`,
                boxShadow: active ? `0 0 0 2px ${c.bg}, 0 8px 30px rgba(0,0,0,0.25)` : '0 8px 30px rgba(0,0,0,0.25)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 70,
                textAlign: 'left',
                cursor: onClick ? 'pointer' : 'default',
                width: '100%',
                color: 'inherit',
                transition: 'all 0.16s ease',
            }}
            >
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: '#64748b' }}>
                    {label}
                </div>
                <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900, color: '#f1f5f9' }}>
                    {value}
                </div>
                <div style={{
                    position: 'absolute',
                    inset: -60,
                    background: `radial-gradient(circle at 70% 10%, ${c.bg}, transparent 55%)`,
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute',
                    right: 14,
                    top: 14,
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: c.fg,
                    boxShadow: `0 0 0 6px ${c.bg}`,
                }} />
            </button>
        );
    };

    const handleMetricCardClick = (cardKey) => {
        if (cardKey === 'Total') {
            setStatusFilter('all');
            setCredentialsFilter('all');
            return;
        }
        if (cardKey === 'Completed') {
            setStatusFilter('Completed');
            setCredentialsFilter('all');
            return;
        }
        if (cardKey === 'Ongoing') {
            setStatusFilter('Ongoing');
            setCredentialsFilter('all');
            return;
        }
        if (cardKey === 'Violated') {
            setStatusFilter('Violated');
            setCredentialsFilter('all');
            return;
        }
        if (cardKey === 'Consultants') {
            setStatusFilter('all');
            setCredentialsFilter('sent');
        }
    };

    const activeMetricCard = useMemo(() => {
        if (credentialsFilter === 'sent' && statusFilter === 'all') return 'Consultants';
        if (statusFilter === 'Completed' && credentialsFilter === 'all') return 'Completed';
        if (statusFilter === 'Ongoing' && credentialsFilter === 'all') return 'Ongoing';
        if (statusFilter === 'Violated' && credentialsFilter === 'all') return 'Violated';
        if (statusFilter === 'all' && credentialsFilter === 'all') return 'Total';
        return null;
    }, [statusFilter, credentialsFilter]);

    const setSort = (key) => {
        setSortKey(prev => {
            if (prev !== key) {
                setSortDir('desc');
                return key;
            }
            setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
            return prev;
        });
    };

    const sortIndicator = (key) => {
        if (sortKey !== key) return <span style={{ color: '#334155', marginLeft: 6 }}>↕</span>;
        return <span style={{ color: '#10b981', marginLeft: 6 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="tp-page" style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            fontFamily: "'Inter', system-ui, sans-serif", color: '#f1f5f9',
        }}>
            <header style={{
                background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(148,163,184,0.1)',
                position: 'sticky', top: 0, zIndex: 30,
            }}>
                <div style={{
                    maxWidth: 1300, margin: '0 auto', padding: '0 32px',
                    height: 60, display: 'flex', alignItems: 'center', gap: 14,
                }}>
                    <BrandLogo height={28} />
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>Admin Dashboard</span>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{
                            padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: 'rgba(16,185,129,0.15)', color: '#34d399',
                            border: '1px solid rgba(16,185,129,0.25)',
                        }}>
                            Showing {totalCount} total
                        </span>
                        <button className="tp-btn" onClick={handleExportExcel} disabled={exporting || loading} style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            background: exporting ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.15)',
                            color: exporting ? '#64748b' : '#34d399',
                            border: '1px solid rgba(16,185,129,0.25)',
                            cursor: (exporting || loading) ? 'not-allowed' : 'pointer',
                        }}>
                            {exporting ? 'Exporting…' : 'Export Excel'}
                        </button>
                        <button className="tp-btn" onClick={() => fetchConsultants(page)} disabled={loading} style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            background: 'rgba(148,163,184,0.1)', color: '#94a3b8',
                            border: '1px solid rgba(148,163,184,0.18)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}>
                            {loading ? 'Refreshing…' : 'Refresh'}
                        </button>
                        <button className="tp-btn" onClick={handleDispatchDueNotifications} disabled={dispatchingDueNotifications} style={{
                            padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            background: dispatchingDueNotifications ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.16)',
                            color: dispatchingDueNotifications ? '#94a3b8' : '#60a5fa',
                            border: '1px solid rgba(59,130,246,0.25)',
                            cursor: dispatchingDueNotifications ? 'not-allowed' : 'pointer',
                        }}>
                            {dispatchingDueNotifications ? 'Dispatching…' : 'Send Due Emails'}
                        </button>
                        <button className="tp-btn" onClick={handleLogout} style={{
                            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: 'rgba(239,68,68,0.1)', color: '#f87171',
                            border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
                    {metricCard('Total', stats.total, 'slate', { active: activeMetricCard === 'Total', onClick: () => handleMetricCardClick('Total') })}
                    {metricCard('Completed', stats.completed, 'blue', { active: activeMetricCard === 'Completed', onClick: () => handleMetricCardClick('Completed') })}
                    {metricCard('Ongoing', stats.ongoing, 'amber', { active: activeMetricCard === 'Ongoing', onClick: () => handleMetricCardClick('Ongoing') })}
                    {metricCard('Violated', stats.violated, 'red', { active: activeMetricCard === 'Violated', onClick: () => handleMetricCardClick('Violated') })}
                    {metricCard('Consultants', stats.working, 'emerald', { active: activeMetricCard === 'Consultants', onClick: () => handleMetricCardClick('Consultants') })}
                </div>

                <div style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginBottom: 18,
                }}>
                    <input
                        placeholder="Search by name, email, or phone…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            flex: '1 1 320px',
                            maxWidth: 520,
                            padding: '11px 16px',
                            borderRadius: 12,
                            background: 'rgba(30,41,59,0.6)',
                            border: '1px solid rgba(148,163,184,0.15)',
                            color: '#f1f5f9',
                            fontSize: 13,
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#10b981'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'rgba(148,163,184,0.15)'; }}
                    />

                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: 'rgba(30,41,59,0.6)',
                        border: '1px solid rgba(148,163,184,0.15)',
                        color: '#e2e8f0',
                        fontSize: 13,
                        outline: 'none',
                        cursor: 'pointer',
                    }}>
                        <option value="all">All statuses</option>
                        <option value="Completed">Completed</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Violated">Violated</option>
                        <option value="Failed">Failed</option>
                        <option value="Pending">Pending</option>
                        <option value="Not Started">Not Started</option>
                    </select>

                    <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: 'rgba(30,41,59,0.6)',
                        border: '1px solid rgba(148,163,184,0.15)',
                        color: '#e2e8f0',
                        fontSize: 13,
                        outline: 'none',
                        cursor: 'pointer',
                    }}>
                        <option value="all">All verification</option>
                        <option value="verified">Verified</option>
                        <option value="not_verified">Not verified</option>
                    </select>

                    {(search || statusFilter !== 'all' || verificationFilter !== 'all' || credentialsFilter !== 'all') && (
                        <button className="tp-btn" onClick={() => { setSearch(''); setStatusFilter('all'); setVerificationFilter('all'); setCredentialsFilter('all'); }} style={{
                            padding: '10px 12px',
                            borderRadius: 12,
                            background: 'rgba(148,163,184,0.1)',
                            color: '#94a3b8',
                            border: '1px solid rgba(148,163,184,0.18)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 800,
                        }}>
                            Clear
                        </button>
                    )}
                </div>

                {loading && (
                    <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
                        <div style={{
                            width: 36, height: 36, border: '3px solid #334155', borderTopColor: '#10b981',
                            borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite',
                        }} />
                        Loading consultants...
                        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                    </div>
                )}

                {error && <div style={{ textAlign: 'center', padding: 40, color: '#f87171' }}>{error}</div>}

                {!loading && !error && (
                    <div style={{
                        background: 'rgba(30,41,59,0.5)', borderRadius: 14,
                        border: '1px solid rgba(148,163,184,0.1)', overflow: 'hidden',
                    }}>
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1220, tableLayout: 'fixed' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                    <th onClick={() => setSort('name')} style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        cursor: 'pointer', userSelect: 'none',
                                        width: 220,
                                    }}>Name{sortIndicator('name')}</th>
                                    <th style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        width: 320,
                                    }}>Email</th>
                                    <th style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        width: 160,
                                    }}>Phone</th>
                                    <th onClick={() => setSort('status')} style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        cursor: 'pointer', userSelect: 'none',
                                        width: 140,
                                    }}>Assessment{sortIndicator('status')}</th>
                                    <th onClick={() => setSort('score')} style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        cursor: 'pointer', userSelect: 'none',
                                        width: 100,
                                    }}>Score{sortIndicator('score')}</th>
                                    <th style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        width: 95,
                                    }}>Video</th>
                                    <th style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        width: 120,
                                    }}>Credentials</th>
                                    <th style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        width: 120,
                                    }}>ID Verify</th>
                                    <th style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        width: 130,
                                    }}>Doc Verify</th>
                                    <th style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        width: 70,
                                    }}>Docs</th>
                                    <th onClick={() => setSort('created_at')} style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        cursor: 'pointer', userSelect: 'none',
                                        width: 120,
                                    }}>Joined{sortIndicator('created_at')}</th>
                                    <th style={{
                                        padding: '14px 16px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8,
                                        width: 140,
                                    }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((c, i) => (
                                    <tr
                                        key={c.id}
                                        onClick={() => window.open(adminUrl(`consultant/${c.id}`), '_blank', 'noopener,noreferrer')}
                                        style={{
                                            borderBottom: '1px solid rgba(148,163,184,0.06)',
                                            cursor: 'pointer', transition: 'background 0.15s',
                                            background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)'}
                                    >
                                        <td
                                            title={c.full_name || c.email || ''}
                                            style={{
                                                padding: '14px 16px',
                                                fontSize: 13,
                                                fontWeight: 800,
                                                color: '#e2e8f0',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            <a
                                                href={adminUrl(`consultant/${c.id}`)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    color: '#e2e8f0',
                                                    textDecoration: 'none',
                                                }}
                                            >
                                                {c.full_name || '-'}
                                            </a>
                                        </td>
                                        <td
                                            title={c.email || ''}
                                            style={{
                                                padding: '14px 16px',
                                                fontSize: 13,
                                                color: '#94a3b8',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {c.email}
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>{c.phone_number || '-'}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            {(() => {
                                                const statusStyle = assessmentStatusBadgeStyle(c.assessment_status);
                                                return (
                                            <span style={{
                                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                background: statusStyle.bg,
                                                color: statusStyle.color,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {c.assessment_status}
                                            </span>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.assessment_score != null ? `${c.assessment_score}/50` : '-'}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.video_score != null ? `${c.video_score}/${c.video_total || '?'}` : '-'}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                background: c.has_credentials ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.12)',
                                                color: c.has_credentials ? '#34d399' : '#64748b',
                                                border: `1px solid ${c.has_credentials ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.15)'}`,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {c.has_credentials ? 'Sent' : '-'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>{verificationBadge(c.face_verification_status)}</td>
                                        <td style={{ padding: '14px 16px' }}>{verificationBadge(c.doc_verification_status)}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.document_count}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteConsultant(c.id, c.full_name || c.email);
                                                }}
                                                disabled={deletingId === c.id}
                                                style={{
                                                    padding: '7px 12px', borderRadius: 10, fontSize: 11, fontWeight: 800,
                                                    border: '1px solid rgba(239,68,68,0.25)',
                                                    background: deletingId === c.id ? 'rgba(148,163,184,0.15)' : 'rgba(239,68,68,0.12)',
                                                    color: deletingId === c.id ? '#94a3b8' : '#f87171',
                                                    cursor: deletingId === c.id ? 'not-allowed' : 'pointer',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {deletingId === c.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {sorted.length === 0 && (
                                    <tr>
                                        <td colSpan={12} style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                                            {(search || statusFilter !== 'all' || verificationFilter !== 'all' || credentialsFilter !== 'all')
                                                ? 'No consultants match your current filters.'
                                                : 'No consultants found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            </table>
                        </div>
                        <div style={{
                            padding: '10px 16px',
                            borderTop: '1px solid rgba(148,163,184,0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: '#64748b',
                            fontSize: 12,
                            flexWrap: 'wrap',
                            gap: 8,
                        }}>
                            <span>
                                Page <span style={{ color: '#e2e8f0', fontWeight: 800 }}>{page}</span> of <span style={{ color: '#e2e8f0', fontWeight: 800 }}>{totalPages}</span>
                                {' · '}{totalCount} result{totalCount !== 1 ? 's' : ''}
                            </span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button
                                    onClick={() => fetchConsultants(1, search, statusFilter, verificationFilter, credentialsFilter)}
                                    disabled={page <= 1 || loading}
                                    style={{
                                        padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                                        background: 'rgba(148,163,184,0.08)', color: page <= 1 ? '#334155' : '#94a3b8',
                                        border: '1px solid rgba(148,163,184,0.15)', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                                    }}
                                >«</button>
                                <button
                                    onClick={() => fetchConsultants(page - 1, search, statusFilter, verificationFilter, credentialsFilter)}
                                    disabled={page <= 1 || loading}
                                    style={{
                                        padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                                        background: 'rgba(148,163,184,0.08)', color: page <= 1 ? '#334155' : '#94a3b8',
                                        border: '1px solid rgba(148,163,184,0.15)', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                                    }}
                                >‹ Prev</button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                                    const p = start + i;
                                    return p <= totalPages ? (
                                        <button
                                            key={p}
                                            onClick={() => fetchConsultants(p, search, statusFilter, verificationFilter, credentialsFilter)}
                                            disabled={loading}
                                            style={{
                                                padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                                                background: p === page ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.08)',
                                                color: p === page ? '#34d399' : '#94a3b8',
                                                border: `1px solid ${p === page ? 'rgba(16,185,129,0.35)' : 'rgba(148,163,184,0.15)'}`,
                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                minWidth: 32,
                                            }}
                                        >{p}</button>
                                    ) : null;
                                })}
                                <button
                                    onClick={() => fetchConsultants(page + 1, search, statusFilter, verificationFilter, credentialsFilter)}
                                    disabled={page >= totalPages || loading}
                                    style={{
                                        padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                                        background: 'rgba(148,163,184,0.08)', color: page >= totalPages ? '#334155' : '#94a3b8',
                                        border: '1px solid rgba(148,163,184,0.15)', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                                    }}
                                >Next ›</button>
                                <button
                                    onClick={() => fetchConsultants(totalPages, search, statusFilter, verificationFilter, credentialsFilter)}
                                    disabled={page >= totalPages || loading}
                                    style={{
                                        padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                                        background: 'rgba(148,163,184,0.08)', color: page >= totalPages ? '#334155' : '#94a3b8',
                                        border: '1px solid rgba(148,163,184,0.15)', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                                    }}
                                >»</button>
                            </div>
                            <span style={{ color: '#94a3b8' }}>Tip: click headers to sort</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
