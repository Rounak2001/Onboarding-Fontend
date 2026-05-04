import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import AdminThemeToggle from './AdminThemeToggle';
import AdminBrandLogo from './AdminBrandLogo';
import { useAdminTheme } from './adminTheme';
import { 
    Phone, 
    PhoneIncoming, 
    PhoneOutgoing, 
    PhoneMissed, 
    Calendar, 
    User, 
    Users, 
    Clock, 
    Search, 
    Filter, 
    ChevronLeft, 
    ChevronRight, 
    LayoutDashboard, 
    UserSquare,
    MessageSquare,
    Bell,
    ExternalLink,
    RefreshCw,
    CheckCircle2,
    XCircle,
    MoreVertical
} from 'lucide-react';

const PAGE_SIZE = 50;

const CallLogs = ({ embedded = false }) => {
    const navigate = useNavigate();

    const parseStructuredComments = (comments) => {
        let atCallStatus = null;
        let followUpTime = null;
        let cleanComments = comments || '';

        // Match [At Call: STATUS]
        const statusMatch = cleanComments.match(/\[At Call: ([^\]]+)\]/);
        if (statusMatch) {
            atCallStatus = statusMatch[1];
            cleanComments = cleanComments.replace(statusMatch[0], '').trim();
        }

        // Match [Follow-up: HH:MM]
        const timeMatch = cleanComments.match(/\[Follow-up: ([^\]]+)\]/);
        if (timeMatch) {
            followUpTime = timeMatch[1];
            cleanComments = cleanComments.replace(timeMatch[0], '').trim();
        }

        return { atCallStatus, followUpTime, cleanComments };
    };
    const { isLight, themeVars, toggleTheme } = useAdminTheme();
    const token = localStorage.getItem('admin_token');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [outcomeFilter, setOutcomeFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState('all'); // 'all' | 'daily' | 'weekly' | 'monthly'
    const [stats, setStats] = useState(null);
    const [callTab, setCallTab] = useState('service'); // 'service' or 'onboarding'
    const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth > 768 : true));
    const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));

    const isMobile = viewportWidth <= 768;

    const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

    const fetchLogs = useCallback(async (pg = 1, searchQuery = search, status = statusFilter, outcome = outcomeFilter, tab = callTab, dateRange = dateRangeFilter) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String((pg - 1) * PAGE_SIZE),
            });
            if (searchQuery.trim()) params.set('search', searchQuery.trim());
            if (status !== 'all') params.set('status', status);
            if (tab === 'service' && outcome !== 'all') params.set('outcome', outcome);
            if (dateRange !== 'all') params.set('date_range', dateRange);

            const endpoint = tab === 'service' ? '/calls/admin-logs/' : '/admin-panel/onboarding-call-logs/';
            const res = await fetch(apiUrl(`${endpoint}?${params}`), { 
                headers: authHeaders,
                cache: 'no-store'
            });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('admin_token');
                navigate(adminUrl());
                return;
            }
            const data = await res.json();
            setLogs(data.results || []);
            setTotalCount(data.total || 0);
            setStats(data.stats || null);
            setTotalPages(Math.ceil((data.total || 0) / PAGE_SIZE));
            setPage(pg);
        } catch (err) {
            setError('Failed to load call logs');
        } finally {
            setLoading(false);
        }
    }, [authHeaders, navigate, search, statusFilter, outcomeFilter, callTab, dateRangeFilter]);

    useEffect(() => {
        fetchLogs(1);
    }, [fetchLogs]);

    useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchLogs(page);
        setRefreshing(false);
    };

    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return { bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: CheckCircle2 };
            case 'failed': return { bg: 'rgba(239,68,68,0.1)', color: '#f87171', icon: XCircle };
            case 'no-answer': return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: Clock };
            case 'busy': return { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', icon: PhoneMissed };
            case 'initiated': return { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', icon: RefreshCw };
            case 'ringing': return { bg: 'rgba(139,92,246,0.1)', color: '#a78bfa', icon: Bell };
            default: return { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', icon: Phone };
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const formatFollowUp = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        
        let color = '#10b981'; // Green for future
        if (days < 0) color = '#f87171'; // Red for overdue
        else if (days <= 1) color = '#f59e0b'; // Amber for soon
        
        return {
            text: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days < 0 ? `${Math.abs(days)}d overdue` : `In ${days} days`,
            color
        };
    };

    // --- Embedded mode: skip outer shell, just render content ---
    if (embedded) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Filters */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    <div style={{ position: 'relative', flex: '1 1 300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
                        <input type="text" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)} style={{ width: '100%', background: 'var(--admin-surface)', border: '1px solid var(--admin-border-mid)', borderRadius: 10, padding: '10px 12px 10px 40px', fontSize: 14, color: 'var(--admin-text-strong)', outline: 'none' }} />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-mid)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: 'var(--admin-text-strong)', outline: 'none' }}>
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="no-answer">No Answer</option>
                        <option value="busy">Busy</option>
                        <option value="ringing">Ringing</option>
                        <option value="initiated">Initiated</option>
                    </select>
                    {callTab === 'service' && (
                        <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-mid)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: 'var(--admin-text-strong)', outline: 'none' }}>
                            <option value="all">All Outcomes</option>
                            <option value="connected">Successful</option>
                            <option value="interested">Interested</option>
                            <option value="callback">Callback</option>
                            <option value="not_interested">Not Interested</option>
                        </select>
                    )}
                    <button onClick={handleRefresh} disabled={refreshing} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-soft)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--admin-text-primary)' }}>
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>Refresh</span>
                    </button>
                </div>

                {/* Stats chips */}
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 16, scrollbarWidth: 'none', flexShrink: 0 }}>
                    {[
                        { label: 'Daily', value: stats?.daily || 0, color: '#3b82f6', range: 'daily' },
                        { label: 'Weekly', value: stats?.weekly || 0, color: '#8b5cf6', range: 'weekly' },
                        { label: 'Monthly', value: stats?.monthly || 0, color: '#f59e0b', range: 'monthly' },
                    ].map((s) => {
                        const isActive = dateRangeFilter === s.range;
                        return (
                            <button key={s.range} onClick={() => { const next = isActive ? 'all' : s.range; setDateRangeFilter(next); fetchLogs(1, search, statusFilter, outcomeFilter, callTab, next); }} style={{ flexShrink: 0, minWidth: 90, padding: '12px 20px', background: isActive ? `${s.color}18` : 'var(--admin-surface)', borderRadius: 20, border: `1px solid ${isActive ? s.color : 'var(--admin-border-soft)'}`, display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center', cursor: 'pointer' }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: isActive ? s.color : 'var(--admin-text-muted)', textTransform: 'uppercase' }}>{s.label}</span>
                                <span style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</span>
                            </button>
                        );
                    })}
                    <div style={{ width: 1, height: 40, background: 'var(--admin-border-soft)', margin: '0 4px', alignSelf: 'center', flexShrink: 0 }} />
                    {[
                        { label: 'Completed', value: stats?.status_counts?.completed || 0, color: '#10b981', status: 'completed' },
                        { label: 'Failed', value: stats?.status_counts?.failed || 0, color: '#ef4444', status: 'failed' },
                        { label: 'No Answer', value: stats?.status_counts?.['no-answer'] || stats?.status_counts?.['no_answer'] || 0, color: '#f59e0b', status: 'no-answer' },
                        { label: 'Busy', value: stats?.status_counts?.busy || 0, color: '#6b7280', status: 'busy' },
                    ].map((s) => {
                        const isActive = statusFilter === s.status;
                        return (
                            <button key={s.status} onClick={() => { const next = isActive ? 'all' : s.status; setStatusFilter(next); fetchLogs(1, search, next, outcomeFilter, callTab, dateRangeFilter); }} style={{ flexShrink: 0, minWidth: 90, padding: '12px 20px', background: isActive ? `${s.color}18` : 'var(--admin-surface)', borderRadius: 20, border: `1px solid ${isActive ? s.color : 'var(--admin-border-soft)'}`, display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center', cursor: 'pointer' }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: isActive ? s.color : 'var(--admin-text-muted)', textTransform: 'uppercase' }}>{s.label}</span>
                                <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--admin-border-soft)', marginBottom: 16 }}>
                    <button onClick={() => { setLogs([]); setStats(null); setCallTab('service'); }} style={{ padding: '12px 8px', border: 'none', background: 'none', borderBottom: callTab === 'service' ? '2px solid #3b82f6' : '2px solid transparent', color: callTab === 'service' ? '#3b82f6' : 'var(--admin-text-muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Service (Consultant → Client)</button>
                    <button onClick={() => { setLogs([]); setStats(null); setCallTab('onboarding'); }} style={{ padding: '12px 8px', border: 'none', background: 'none', borderBottom: callTab === 'onboarding' ? '2px solid #3b82f6' : '2px solid transparent', color: callTab === 'onboarding' ? '#3b82f6' : 'var(--admin-text-muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Onboarding (Admin → Consultant)</button>
                </div>

                {/* Logs */}
                {loading ? (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)', gap: 12 }}>
                        <Phone size={48} strokeWidth={1} />
                        <span style={{ fontSize: 16, fontWeight: 500 }}>No call logs found</span>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 16 }}>
                        {logs.map(log => {
                            const currentStatus = log.status || log.call_status;
                            const statusStyle = getStatusStyle(currentStatus);
                            const followUp = formatFollowUp(log.follow_up_date);
                            const parsed = parseStructuredComments(log.notes || log.comments);
                            return (
                                <div key={log.id} style={{ background: 'var(--admin-surface)', borderRadius: 16, border: '1px solid var(--admin-border-soft)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                        <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 260 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: callTab === 'service' ? '#3b82f610' : '#10b98110', display: 'flex', alignItems: 'center', justifyContent: 'center', color: callTab === 'service' ? '#3b82f6' : '#10b981', flexShrink: 0, border: `1px solid ${callTab === 'service' ? '#3b82f620' : '#10b98120'}` }}>
                                                {callTab === 'service' ? <PhoneOutgoing size={22} /> : <PhoneIncoming size={22} />}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    {callTab === 'service' ? (
                                                        <>
                                                            <span onClick={() => window.open(`/Consultants/${log.consultant_id}`, '_blank')} style={{ fontWeight: 800, fontSize: 15, cursor: 'pointer', color: 'var(--admin-text-primary)' }}>{log.consultant_name}</span>
                                                            <ChevronRight size={14} style={{ color: 'var(--admin-text-muted)' }} />
                                                            <span onClick={() => window.open(`/Clients/${log.client_id}`, '_blank')} style={{ fontWeight: 700, fontSize: 15, color: '#3b82f6', cursor: 'pointer' }}>{log.client_name}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Caller</span>
                                                            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--admin-text-primary)' }}>{log.caller_name}</span>
                                                            <ChevronRight size={14} style={{ color: 'var(--admin-text-muted)' }} />
                                                            <span onClick={() => window.open(`/Consultants/${log.application_id}`, '_blank')} style={{ fontWeight: 700, fontSize: 15, color: '#10b981', cursor: 'pointer' }}>{log.consultant_name}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--admin-text-muted)' }}>
                                                        <Calendar size={13} /> {formatDate(callTab === 'service' ? log.created_at : log.called_at)}
                                                    </span>
                                                    {callTab === 'service' && <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}><Clock size={13} /> {log.duration_display}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 10, background: statusStyle.bg, color: statusStyle.color, fontSize: 11, fontWeight: 800, border: `1px solid ${statusStyle.color}20` }}>
                                                <statusStyle.icon size={13} />
                                                {(currentStatus || '').replace('_', ' ').toUpperCase()}
                                            </div>
                                            {log.outcome && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-secondary)', background: 'var(--admin-surface-strong)', padding: '2px 8px', borderRadius: 6 }}>{log.outcome.replace('_', ' ').toUpperCase()}</span>}
                                            <a href={`tel:${callTab === 'service' ? (log.client_phone || '') : (log.consultant_phone || '')}`} onClick={(e) => e.stopPropagation()} style={{ width: 36, height: 36, background: '#3b82f615', borderRadius: 10, color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #3b82f630' }} title="Call">
                                                <Phone size={18} />
                                            </a>
                                        </div>
                                    </div>
                                    {followUp && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 8, background: `${followUp.color}10`, border: `1px solid ${followUp.color}25`, width: 'fit-content' }}>
                                            <Bell size={13} style={{ color: followUp.color }} />
                                            <span style={{ fontSize: 11, fontWeight: 800, color: followUp.color }}>FOLLOW UP: {followUp.text.toUpperCase()} · {new Date(log.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                        </div>
                                    )}
                                    {(log.notes || log.comments) && (() => {
                                        const { cleanComments } = parseStructuredComments(log.notes || log.comments);
                                        return cleanComments ? (
                                            <div style={{ padding: 14, background: 'var(--admin-surface-strong)', borderRadius: 12, fontSize: 13, color: 'var(--admin-text-secondary)', borderLeft: `3px solid ${callTab === 'service' ? '#3b82f6' : '#10b981'}`, lineHeight: 1.5 }}>
                                                {cleanComments}
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {!loading && logs.length > 0 && (
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                        <span style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>Showing <b>{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalCount)}</b> of <b>{totalCount}</b></span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button disabled={page === 1} onClick={() => fetchLogs(page - 1)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--admin-border-mid)', background: 'var(--admin-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}><ChevronLeft size={16} /></button>
                            <button disabled={page === totalPages} onClick={() => fetchLogs(page + 1)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--admin-border-mid)', background: 'var(--admin-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- Full-page mode (original) ---
    return (
        <div className="tp-page" style={{ ...themeVars, height: '100vh', display: 'flex', overflow: 'hidden', background: 'var(--admin-page-bg)', fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--admin-text-strong)' }}>
            
            {/* SIDEBAR NAVIGATION */}
            <div style={{ 
                width: sidebarOpen ? 260 : (isMobile ? 0 : 80), 
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                background: 'var(--admin-header-bg)', 
                borderRight: '1px solid var(--admin-border-soft)', 
                display: 'flex', flexDirection: 'column', flexShrink: 0,
                overflow: 'hidden', position: isMobile ? 'absolute' : 'relative',
                height: '100%', zIndex: 40,
                transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)'
            }}>
                <div style={{ height: 72, padding: sidebarOpen ? '0 24px' : '0', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', borderBottom: '1px solid var(--admin-border-soft)' }}>
                     {sidebarOpen ? <AdminBrandLogo isLight={isLight} height={26} /> : <div onClick={() => setSidebarOpen(true)} style={{cursor:'pointer'}}><AdminBrandLogo isLight={isLight} height={20} iconOnly /></div>}
                </div>

                <div style={{ flex: 1, padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                     {[
                         { id: 'dashboard', icon: LayoutDashboard, label: 'Analytics', path: adminUrl('dashboard') },
                         { id: 'consultant', icon: Users, label: 'Consultants', path: adminUrl('dashboard') },
                         { id: 'client', icon: UserSquare, label: 'Clients', path: adminUrl('dashboard') },
                         { id: 'call-logs', icon: Phone, label: 'Call Logs', path: adminUrl('call-logs') },
                     ].map(item => (
                          <button 
                              key={item.id} 
                              onClick={() => { 
                                  if (item.id === 'call-logs') return; 
                                  navigate(item.path); 
                                  if (isMobile) setSidebarOpen(false); 
                              }}
                              style={{ 
                                  display: 'flex', alignItems: 'center', padding: '12px', borderRadius: 12, 
                                  background: item.id === 'call-logs' ? (isLight ? '#eff6ff' : 'rgba(59,130,246,0.15)') : 'transparent', 
                                  color: item.id === 'call-logs' ? '#3b82f6' : 'var(--admin-text-secondary)',
                                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                  justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: sidebarOpen ? 16 : 0,
                                  whiteSpace: 'nowrap'
                              }}
                          >
                              <item.icon size={22} />
                              {sidebarOpen && <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>}
                          </button>
                     ))}
                </div>

                {!isMobile && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--admin-border-soft)', display: 'flex', justifyContent: sidebarOpen ? 'flex-end' : 'center' }}>
                         <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-soft)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--admin-text-secondary)', transition: 'transform 0.2s' }}>
                             {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                         </button>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative', background: 'var(--admin-page-bg)' }}>
                
                {isMobile && sidebarOpen && (
                    <div onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 35 }} />
                )}

                <header style={{ background: 'var(--admin-header-bg)', borderBottom: '1px solid var(--admin-border-soft)', position: 'relative', zIndex: 30 }}>
                    <div style={{
                        padding: isMobile ? '10px 14px' : '0 32px',
                        minHeight: 72,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 14,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {isMobile && (
                                <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-primary)' }}>
                                    <Clock size={24} />
                                </button>
                            )}
                            <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--admin-text-primary)' }}>Call Logs</span>
                            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>{totalCount} Total</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <AdminThemeToggle isLight={isLight} onToggle={toggleTheme} />
                            <button onClick={handleRefresh} disabled={refreshing} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-soft)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--admin-text-primary)', transition: 'all 0.2s' }}>
                                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                {!isMobile && <span style={{ fontWeight: 600, fontSize: 13 }}>Refresh</span>}
                            </button>
                        </div>
                    </div>
                </header>

                <div style={{ padding: isMobile ? '12px' : '20px 32px', display: 'flex', gap: 12, flexWrap: 'wrap', background: 'var(--admin-page-bg)', borderBottom: '1px solid var(--admin-border-soft)' }}>
                    <div style={{ position: 'relative', flex: isMobile ? '1 1 100%' : '1 1 300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Search by name or phone..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
                            style={{ width: '100%', background: 'var(--admin-surface)', border: '1px solid var(--admin-border-mid)', borderRadius: 10, padding: '10px 12px 10px 40px', fontSize: 14, color: 'var(--admin-text-strong)', outline: 'none' }} 
                        />
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8, flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-mid)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: 'var(--admin-text-strong)', outline: 'none' }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="no-answer">No Answer</option>
                            <option value="busy">Busy</option>
                            <option value="ringing">Ringing</option>
                            <option value="initiated">Initiated</option>
                        </select>

                        {callTab === 'service' && (
                            <select 
                                value={outcomeFilter}
                                onChange={(e) => setOutcomeFilter(e.target.value)}
                                style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-mid)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: 'var(--admin-text-strong)', outline: 'none' }}
                            >
                                <option value="all">All Outcomes</option>
                                <option value="connected">Successful</option>
                                <option value="interested">Interested</option>
                                <option value="callback">Callback</option>
                                <option value="not_interested">Not Interested</option>
                            </select>
                        )}
                    </div>
                </div>

                <div style={{ 
                    padding: isMobile ? '16px' : '16px 32px', 
                    display: 'flex',
                    gap: 10, 
                    overflowX: 'auto',
                    background: 'var(--admin-page-bg)', 
                    borderBottom: '1px solid var(--admin-border-soft)',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    flexShrink: 0,
                }}>
                     {/* Time Stats */}
                     {[
                         { label: 'Daily', value: stats?.daily || 0, color: '#3b82f6', range: 'daily' },
                         { label: 'Weekly', value: stats?.weekly || 0, color: '#8b5cf6', range: 'weekly' },
                         { label: 'Monthly', value: stats?.monthly || 0, color: '#f59e0b', range: 'monthly' },
                     ].map((s) => {
                         const isActive = dateRangeFilter === s.range;
                         return (
                             <button key={s.range} onClick={() => { const next = isActive ? 'all' : s.range; setDateRangeFilter(next); fetchLogs(1, search, statusFilter, outcomeFilter, callTab, next); }} style={{ flexShrink: 0, minWidth: 90, padding: '12px 20px', background: isActive ? `${s.color}18` : 'var(--admin-surface)', borderRadius: 20, border: `1px solid ${isActive ? s.color : 'var(--admin-border-soft)'}`, display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.18s' }}>
                                 <span style={{ fontSize: 10, fontWeight: 800, color: isActive ? s.color : 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                                 <span style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</span>
                             </button>
                         );
                     })}
                     
                     <div style={{ width: 1, height: 40, background: 'var(--admin-border-soft)', margin: '0 4px', alignSelf: 'center', flexShrink: 0 }} />
                     
                     {/* Status Stats */}
                     {[
                         { label: 'Completed', value: stats?.status_counts?.completed || 0, color: '#10b981', status: 'completed' },
                         { label: 'Failed', value: stats?.status_counts?.failed || 0, color: '#ef4444', status: 'failed' },
                         { label: 'No Answer', value: stats?.status_counts?.['no-answer'] || stats?.status_counts?.['no_answer'] || 0, color: '#f59e0b', status: 'no-answer' },
                         { label: 'Busy', value: stats?.status_counts?.busy || 0, color: '#6b7280', status: 'busy' },
                         { label: 'Ringing', value: stats?.status_counts?.ringing || 0, color: '#8b5cf6', status: 'ringing' },
                         { label: 'Initiated', value: stats?.status_counts?.initiated || 0, color: '#3b82f6', status: 'initiated' },
                     ].map((s) => {
                         const isActive = statusFilter === s.status;
                         return (
                             <button key={s.status} onClick={() => { const next = isActive ? 'all' : s.status; setStatusFilter(next); fetchLogs(1, search, next, outcomeFilter, callTab, dateRangeFilter); }} style={{ flexShrink: 0, minWidth: 90, padding: '12px 20px', background: isActive ? `${s.color}18` : 'var(--admin-surface)', borderRadius: 20, border: `1px solid ${isActive ? s.color : 'var(--admin-border-soft)'}`, display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.18s' }}>
                                 <span style={{ fontSize: 9, fontWeight: 800, color: isActive ? s.color : 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>{s.label}</span>
                                 <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
                             </button>
                         );
                     })}
                </div>

                <div style={{ padding: '0 32px', background: 'var(--admin-page-bg)' }}>
                    <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--admin-border-soft)' }}>
                        <button 
                            onClick={() => { setLogs([]); setStats(null); setCallTab('service'); }}
                            style={{ 
                                padding: '16px 8px', border: 'none', background: 'none', 
                                borderBottom: callTab === 'service' ? '2px solid #3b82f6' : '2px solid transparent',
                                color: callTab === 'service' ? '#3b82f6' : 'var(--admin-text-muted)',
                                fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            Service Interactions (Consultant → Client)
                        </button>
                        <button 
                            onClick={() => { setLogs([]); setStats(null); setCallTab('onboarding'); }}
                            style={{ 
                                padding: '16px 8px', border: 'none', background: 'none', 
                                borderBottom: callTab === 'onboarding' ? '2px solid #3b82f6' : '2px solid transparent',
                                color: callTab === 'onboarding' ? '#3b82f6' : 'var(--admin-text-muted)',
                                fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            Onboarding History (Admin → Consultant)
                        </button>
                    </div>
                </div>

                <main style={{ flex: 'none', padding: isMobile ? '12px' : '24px 32px' }}>
                    {loading ? (
                        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
                        </div>
                    ) : logs.length === 0 ? (
                        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)', gap: 16 }}>
                            <Phone size={48} strokeWidth={1} />
                            <span style={{ fontSize: 16, fontWeight: 500 }}>No call logs found</span>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
                            {logs.map(log => {
                                const currentStatus = log.status || log.call_status;
                                const statusStyle = getStatusStyle(currentStatus);
                                const followUp = formatFollowUp(log.follow_up_date);
                                const parsed = parseStructuredComments(log.notes || log.comments);
                                
                                return (
                                    <div key={log.id} style={{ 
                                        background: 'var(--admin-surface)', 
                                        borderRadius: 20, 
                                        border: '1px solid var(--admin-border-soft)', 
                                        padding: isMobile ? 16 : 24,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 16,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'default',
                                        boxShadow: isLight ? '0 4px 12px rgba(148,163,184,0.05)' : 'none',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = isLight ? '0 12px 30px rgba(148,163,184,0.12)' : '0 12px 30px rgba(0,0,0,0.2)';
                                        e.currentTarget.style.borderColor = '#3b82f640';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = isLight ? '0 4px 12px rgba(148,163,184,0.05)' : 'none';
                                        e.currentTarget.style.borderColor = 'var(--admin-border-soft)';
                                    }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                                            <div style={{ display: 'flex', gap: 16, flex: 1, minWidth: 280 }}>
                                                <div style={{ 
                                                    width: 52, height: 52, borderRadius: 14, 
                                                    background: callTab === 'service' ? 'linear-gradient(135deg, #3b82f615 0%, #3b82f605 100%)' : 'linear-gradient(135deg, #10b98115 0%, #10b98105 100%)', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                    color: callTab === 'service' ? '#3b82f6' : '#10b981', 
                                                    flexShrink: 0,
                                                    border: `1px solid ${callTab === 'service' ? '#3b82f620' : '#10b98120'}`
                                                }}>
                                                    {callTab === 'service' ? <PhoneOutgoing size={26} /> : <PhoneIncoming size={26} />}
                                                </div>
                                                
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        {callTab === 'service' ? (
                                                            <>
                                                                <span 
                                                                    onClick={() => navigate(`/Consultants/${log.consultant_id}`)}
                                                                    style={{ fontWeight: 800, fontSize: 17, cursor: 'pointer', color: 'var(--admin-text-primary)' }}
                                                                >
                                                                    {log.consultant_name}
                                                                </span>
                                                                <ChevronRight size={16} style={{ color: 'var(--admin-text-muted)' }} />
                                                                <span 
                                                                    onClick={() => window.open(`/Clients/${log.client_id}`, '_blank')}
                                                                    style={{ fontWeight: 700, fontSize: 17, color: '#3b82f6', cursor: 'pointer' }}
                                                                >
                                                                    {log.client_name}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Caller</span>
                                                                    <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--admin-text-primary)' }}>{log.caller_name}</span>
                                                                </div>
                                                                <ChevronRight size={16} style={{ color: 'var(--admin-text-muted)' }} />
                                                                <span 
                                                                    onClick={() => navigate(`/Consultants/${log.application_id}`)}
                                                                    style={{ fontWeight: 700, fontSize: 17, color: '#10b981', cursor: 'pointer' }}
                                                                >
                                                                    {log.consultant_name}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--admin-text-muted)', fontWeight: 500 }}>
                                                            <Calendar size={14} /> {formatDate(callTab === 'service' ? log.created_at : log.called_at)}
                                                        </span>
                                                        {callTab === 'service' && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--admin-text-muted)', fontWeight: 500 }}>
                                                                <Clock size={14} /> {log.duration_display}
                                                            </span>
                                                        )}
                                                        {callTab === 'onboarding' && log.call_round && (
                                                            <span style={{ padding: '3px 10px', borderRadius: 8, background: isLight ? '#f1f5f9' : '#1e293b', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-secondary)', letterSpacing: '0.02em' }}>
                                                                ROUND {log.call_round}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: 8 }}>
                                                    <div style={{ 
                                                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, 
                                                        background: statusStyle.bg, color: statusStyle.color, 
                                                        fontSize: 12, fontWeight: 800, border: `1px solid ${statusStyle.color}20` 
                                                    }}>
                                                        <statusStyle.icon size={14} />
                                                        {`CALL: ${(log.status || log.call_status)?.replace('_', ' ')?.toUpperCase()}`}
                                                    </div>
                                                    {log.outcome && (
                                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', background: 'var(--admin-surface-strong)', padding: '2px 8px', borderRadius: 6 }}>
                                                            {log.outcome.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <a 
                                                    href={`tel:${callTab === 'service' ? (log.client_phone || '') : (log.consultant_phone || '')}`} 
                                                    onClick={(e) => e.stopPropagation()} 
                                                    style={{ 
                                                        width: 42, height: 42, background: '#3b82f615', borderRadius: 12, color: '#3b82f6', 
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                                        border: '1px solid #3b82f630'
                                                    }} 
                                                    title="Call Number"
                                                >
                                                    <Phone size={20} />
                                                </a>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {(log.lead_main_status || parsed.atCallStatus) && (
                                                <span style={{ padding: '4px 12px', borderRadius: 8, background: '#8b5cf610', color: '#8b5cf6', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', border: '1px solid #8b5cf625' }}>
                                                    LIVE: {log.lead_main_status || parsed.atCallStatus}
                                                </span>
                                            )}
                                            {parsed.atCallStatus && (
                                                <span style={{ padding: '4px 12px', borderRadius: 8, background: '#f59e0b10', color: '#f59e0b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', border: '1px solid #f59e0b25' }}>
                                                    AT CALL: {parsed.atCallStatus}
                                                </span>
                                            )}
                                            {followUp && (
                                                <div style={{ 
                                                    padding: '4px 12px', borderRadius: 8, background: `${followUp.color}10`, border: `1px solid ${followUp.color}25`,
                                                    display: 'flex', alignItems: 'center', gap: 6
                                                }}>
                                                    <Bell size={13} style={{ color: followUp.color }} />
                                                    <span style={{ fontSize: 11, fontWeight: 800, color: followUp.color }}>
                                                        FOLLOW UP: {followUp.text.toUpperCase()}
                                                        {parsed.followUpTime ? ` @ ${parsed.followUpTime}` : ''}
                                                        {' · '}
                                                        {new Date(log.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        {' '}
                                                        {new Date(log.follow_up_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {(log.notes || log.comments) && (() => {
                                            const { cleanComments } = parseStructuredComments(log.notes || log.comments);
                                            return (
                                                <div style={{ 
                                                    width: '100%', padding: '16px', background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.02)', 
                                                    borderRadius: 14, fontSize: 14, color: 'var(--admin-text-secondary)', 
                                                    borderLeft: `4px solid ${callTab === 'service' ? '#3b82f6' : '#10b981'}`,
                                                    lineHeight: 1.6
                                                }}>
                                                    <div style={{ fontWeight: 800, fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {callTab === 'service' ? 'Consultant Notes' : 'Admin Comments'}
                                                    </div>
                                                    <div style={{ color: 'var(--admin-text-strong)', fontWeight: 500 }}>
                                                        {cleanComments || 'No detailed notes provided.'}
                                                    </div>
                                                    {log.issue_facing && (
                                                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--admin-border-soft)', fontSize: 13 }}>
                                                            <b style={{ color: 'var(--admin-text-muted)', textTransform: 'uppercase', fontSize: 11, marginRight: 8 }}>Issue:</b> 
                                                            <span style={{ color: '#ef4444', fontWeight: 600 }}>{log.issue_facing}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>

                <footer style={{ background: 'var(--admin-header-bg)', borderTop: '1px solid var(--admin-border-soft)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>
                        Showing <b>{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalCount)}</b> of <b>{totalCount}</b>
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                            disabled={page === 1} 
                            onClick={() => fetchLogs(page - 1)}
                            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--admin-border-mid)', background: 'var(--admin-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            const p = i + 1;
                            return (
                                <button 
                                    key={p} 
                                    onClick={() => fetchLogs(p)}
                                    style={{ width: 36, height: 36, borderRadius: 8, border: p === page ? '1px solid #3b82f6' : '1px solid var(--admin-border-mid)', background: p === page ? '#3b82f6' : 'var(--admin-surface)', color: p === page ? '#fff' : 'var(--admin-text-primary)', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button 
                            disabled={page === totalPages} 
                            onClick={() => fetchLogs(page + 1)}
                            style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--admin-border-mid)', background: 'var(--admin-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default CallLogs;
