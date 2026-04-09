import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { clearAdminSession, getAdminToken } from '../../utils/adminSession';
import AdminThemeToggle from './AdminThemeToggle';
import AdminBrandLogo from './AdminBrandLogo';
import { useAdminTheme } from './adminTheme';

const PAGE_SIZE = 25;
const TODAY_TIMEZONE = 'Asia/Kolkata';

const EmailDashboard = () => {
    const navigate = useNavigate();
    const { isLight, themeVars, toggleTheme } = useAdminTheme();
    const token = getAdminToken();

    const [summary, setSummary] = useState(null);
    const [tab, setTab] = useState('notifications');
    const [notifications, setNotifications] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [activeCardFilter, setActiveCardFilter] = useState('all');

    const [nPage, setNPage] = useState(1);
    const [nTotalPages, setNTotalPages] = useState(1);
    const [nStatus, setNStatus] = useState('');
    const [nSearch, setNSearch] = useState('');
    const [nSort, setNSort] = useState({ key: 'scheduled_for', direction: 'desc' });

    const [lPage, setLPage] = useState(1);
    const [lTotalPages, setLTotalPages] = useState(1);
    const [lType, setLType] = useState('');
    const [lStatus, setLStatus] = useState('');
    const [lSearch, setLSearch] = useState('');
    const [lDays, setLDays] = useState(7);
    const [lSort, setLSort] = useState({ key: 'sent_at', direction: 'desc' });

    const [expandedRow, setExpandedRow] = useState(null);
    const [viewportWidth, setViewportWidth] = useState(
        () => (typeof window !== 'undefined' ? window.innerWidth : 1280),
    );
    const isMobile = viewportWidth <= 768;
    const isNarrowMobile = viewportWidth <= 430;

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const fetchSummary = async () => {
        try {
            const res = await fetch(apiUrl('/admin-panel/email-dashboard/'), { headers });
            if (res.status === 401 || res.status === 403) {
                clearAdminSession();
                navigate(adminUrl());
                return;
            }
            setSummary(await res.json());
        } catch {
            // ignore
        }
    };

    const fetchNotifications = async (pg = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pg, page_size: PAGE_SIZE });
            if (nStatus) params.set('status', nStatus);
            if (nSearch.trim()) params.set('search', nSearch.trim());
            if (activeCardFilter !== 'all') params.set('card_filter', activeCardFilter);
            params.set('sort_by', nSort.key);
            params.set('sort_dir', nSort.direction);
            const res = await fetch(apiUrl(`/admin-panel/email-dashboard/notifications/?${params}`), { headers });
            if (res.status === 401 || res.status === 403) {
                clearAdminSession();
                navigate(adminUrl());
                return;
            }
            const data = await res.json();
            setNotifications(data.notifications || []);
            setNTotalPages(data.total_pages || 1);
            setNPage(pg);
        } catch {
            // ignore
        }
        setLoading(false);
    };

    const fetchLogs = async (pg = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pg, page_size: PAGE_SIZE, days: lDays });
            if (lType) params.set('type', lType);
            if (lStatus) params.set('status', lStatus);
            if (lSearch.trim()) params.set('search', lSearch.trim());
            if (activeCardFilter !== 'all') params.set('card_filter', activeCardFilter);
            params.set('sort_by', lSort.key);
            params.set('sort_dir', lSort.direction);
            const res = await fetch(apiUrl(`/admin-panel/email-dashboard/logs/?${params}`), { headers });
            if (res.status === 401 || res.status === 403) {
                clearAdminSession();
                navigate(adminUrl());
                return;
            }
            const data = await res.json();
            setLogs(data.logs || []);
            setLTotalPages(data.total_pages || 1);
            setLPage(pg);
        } catch {
            // ignore
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!token) {
            navigate(adminUrl());
            return;
        }
        fetchSummary();
        fetchNotifications(1);
    }, []);

    useEffect(() => {
        if (tab === 'notifications') fetchNotifications(1);
        else fetchLogs(1);
    }, [tab, nStatus, lType, lStatus, lDays, activeCardFilter, nSort, lSort]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (tab === 'notifications') fetchNotifications(1);
            else fetchLogs(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [nSearch, lSearch]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const doAction = async (url, method = 'POST', body = null) => {
        setActionLoading(url);
        try {
            const options = { method, headers: { ...headers, 'Content-Type': 'application/json' } };
            if (body) options.body = JSON.stringify(body);
            const res = await fetch(apiUrl(url), options);
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Action failed');
                return data;
            }
            fetchSummary();
            if (tab === 'notifications') fetchNotifications(nPage);
            else fetchLogs(lPage);
            return data;
        } catch {
            alert('Failed to connect');
            return null;
        } finally {
            setActionLoading(null);
        }
    };

    const fmt = (iso) => (
        iso
            ? new Date(iso).toLocaleString('en-IN', {
                timeZone: TODAY_TIMEZONE,
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            })
            : '-'
    );

    const statusBadge = (status) => {
        const colors = {
            sent: { bg: 'rgba(16,185,129,0.14)', fg: '#34d399', border: 'rgba(16,185,129,0.25)' },
            queued: { bg: 'rgba(245,158,11,0.12)', fg: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
            sending: { bg: 'rgba(59,130,246,0.12)', fg: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
            failed: { bg: 'rgba(239,68,68,0.14)', fg: '#f87171', border: 'rgba(239,68,68,0.22)' },
            cancelled: { bg: 'rgba(100,116,139,0.12)', fg: 'var(--admin-text-secondary)', border: 'rgba(100,116,139,0.15)' },
        };
        const color = colors[status] || colors.queued;
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: color.bg,
                color: color.fg,
                border: `1px solid ${color.border}`,
                textTransform: 'capitalize',
            }}>
                {status}
            </span>
        );
    };

    const typeBadge = (type) => {
        const icons = { notification: '🔔', abandonment: '📩', credential: '🔑', otp: '🔐' };
        const labels = { notification: 'Notification', abandonment: 'Abandonment', credential: 'Credential', otp: 'OTP' };
        return (
            <span style={{ fontSize: 12, color: 'var(--admin-text-primary-soft)', whiteSpace: 'nowrap' }}>
                {icons[type] || '📧'} {labels[type] || type}
            </span>
        );
    };

    const templateLabel = (key) => {
        const map = {
            welcome_first_login: 'Welcome',
            degree_step_complete: 'Degree Complete',
            assessment_retry_available: 'Retry Available',
        };
        return map[key] || key;
    };

    const toggleSort = (kind, key) => {
        if (kind === 'notifications') {
            setNSort((current) => (
                current.key === key
                    ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
                    : { key, direction: 'asc' }
            ));
            return;
        }
        setLSort((current) => (
            current.key === key
                ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
                : { key, direction: 'asc' }
        ));
    };

    const filteredNotifications = useMemo(() => notifications, [notifications]);
    const filteredLogs = useMemo(() => logs, [logs]);

    const metricCard = (filterKey, label, value, tint = 'slate', subtitle = '') => {
        const tints = {
            emerald: { edge: 'rgba(16,185,129,0.28)', bg: 'rgba(16,185,129,0.08)', fg: '#34d399' },
            blue: { edge: 'rgba(59,130,246,0.28)', bg: 'rgba(59,130,246,0.08)', fg: '#60a5fa' },
            amber: { edge: 'rgba(245,158,11,0.28)', bg: 'rgba(245,158,11,0.08)', fg: '#fbbf24' },
            red: { edge: 'rgba(239,68,68,0.28)', bg: 'rgba(239,68,68,0.08)', fg: '#f87171' },
            slate: { edge: 'var(--admin-border-mid)', bg: 'rgba(148,163,184,0.06)', fg: 'var(--admin-text-secondary)' },
        };
        const color = tints[tint] || tints.slate;
        const active = activeCardFilter === filterKey;
        return (
            <button
                type="button"
                onClick={() => setActiveCardFilter((current) => (current === filterKey ? 'all' : filterKey))}
                style={{
                    padding: isMobile ? 12 : 16,
                    borderRadius: 16,
                    background: active ? 'var(--admin-surface-strong)' : 'var(--admin-surface-accent)',
                    border: `1px solid ${active ? color.fg : color.edge}`,
                    boxShadow: active
                        ? (isLight ? '0 18px 32px rgba(148,163,184,0.16)' : '0 14px 28px rgba(0,0,0,0.28)')
                        : (isLight ? '0 10px 22px rgba(148,163,184,0.08)' : '0 8px 30px rgba(0,0,0,0.25)'),
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: isMobile ? 64 : 72,
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                }}
            >
                <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: 'var(--admin-text-muted)' }}>{label}</div>
                <div style={{ marginTop: 6, fontSize: isMobile ? 20 : 24, fontWeight: 900, color: 'var(--admin-text-strong)' }}>{value}</div>
                {subtitle && <div style={{ marginTop: 2, fontSize: 11, color: 'var(--admin-text-muted)' }}>{subtitle}</div>}
                <div style={{
                    position: 'absolute',
                    inset: -60,
                    background: `radial-gradient(circle at 70% 10%, ${color.bg}, transparent 55%)`,
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute',
                    right: 14,
                    top: 14,
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: color.fg,
                    boxShadow: `0 0 0 6px ${color.bg}`,
                }} />
            </button>
        );
    };

    const pagination = (page, totalPages, onPage) => (
        <div style={{
            padding: isMobile ? '12px' : '10px 16px',
            borderTop: '1px solid rgba(148,163,184,0.08)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            color: 'var(--admin-text-muted)',
            fontSize: 12,
            flexWrap: 'wrap',
            gap: 8,
        }}>
            <span style={{ textAlign: isMobile ? 'center' : 'left' }}>
                Page <span style={{ color: 'var(--admin-text-primary)', fontWeight: 800 }}>{page}</span> of <span style={{ color: 'var(--admin-text-primary)', fontWeight: 800 }}>{totalPages}</span>
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                {[
                    { label: isMobile ? 'First' : '<<', disabled: page <= 1, pg: 1 },
                    { label: isMobile ? 'Prev' : '<', disabled: page <= 1, pg: page - 1 },
                    { label: isMobile ? 'Next' : '>', disabled: page >= totalPages, pg: page + 1 },
                    { label: isMobile ? 'Last' : '>>', disabled: page >= totalPages, pg: totalPages },
                ].map((button, index) => (
                    <button
                        key={index}
                        onClick={() => onPage(button.pg)}
                        disabled={button.disabled || loading}
                        style={{
                            padding: isMobile ? '6px 10px' : '5px 12px',
                            borderRadius: 7,
                            fontSize: 12,
                            fontWeight: 700,
                            background: 'var(--admin-tab-idle)',
                            color: button.disabled ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)',
                            border: '1px solid var(--admin-border-mid)',
                            cursor: button.disabled ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {button.label}
                    </button>
                ))}
            </div>
        </div>
    );

    const selectStyle = {
        padding: '9px 12px',
        borderRadius: 10,
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border-mid)',
        color: 'var(--admin-text-primary)',
        fontSize: 12,
        outline: 'none',
        cursor: 'pointer',
    };

    const inputStyle = {
        padding: '9px 14px',
        borderRadius: 10,
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border-mid)',
        color: 'var(--admin-text-strong)',
        fontSize: 12,
        outline: 'none',
        flex: '1 1 200px',
        maxWidth: 320,
    };

    const actionBtnStyle = (color = 'blue') => {
        const colors = {
            blue: { bg: 'rgba(59,130,246,0.14)', fg: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
            red: { bg: 'rgba(239,68,68,0.12)', fg: '#f87171', border: 'rgba(239,68,68,0.2)' },
            amber: { bg: 'rgba(245,158,11,0.12)', fg: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
            emerald: { bg: 'rgba(16,185,129,0.14)', fg: '#34d399', border: 'rgba(16,185,129,0.25)' },
        };
        const colorSet = colors[color] || colors.blue;
        return {
            padding: isMobile ? '7px 12px' : '6px 14px',
            borderRadius: 8,
            fontSize: isMobile ? 12 : 11,
            fontWeight: 700,
            background: colorSet.bg,
            color: colorSet.fg,
            border: `1px solid ${colorSet.border}`,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s',
        };
    };

    const sortHeaderStyle = {
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: 11,
        fontWeight: 800,
        color: 'var(--admin-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    };

    const renderSortHeader = (label, kind, key) => {
        const sort = kind === 'notifications' ? nSort : lSort;
        const isActive = sort.key === key;
        const arrow = isActive ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : '';
        return (
            <button
                type="button"
                onClick={() => toggleSort(kind, key)}
                style={{ ...sortHeaderStyle, color: isActive ? 'var(--admin-text-primary-soft)' : 'var(--admin-text-muted)' }}
            >
                {label}{arrow}
            </button>
        );
    };

    const summaryData = summary;

    return (
        <div style={{
            ...themeVars,
            minHeight: '100vh',
            background: 'var(--admin-page-bg)',
            fontFamily: "'Inter', system-ui, sans-serif",
            color: 'var(--admin-text-strong)',
        }}>
            <header style={{
                background: 'var(--admin-header-bg)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--admin-border-soft)',
                position: 'sticky',
                top: 0,
                zIndex: 30,
            }}>
                <div style={{
                    maxWidth: 1300,
                    margin: '0 auto',
                    padding: isMobile ? '10px 14px' : '0 32px',
                    minHeight: 60,
                    display: 'flex',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    gap: isMobile ? 10 : 14,
                }}>
                    <AdminBrandLogo isLight={isLight} height={28} />
                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--admin-text-strong)' }}>Email Monitor</span>
                    <div style={{
                        marginLeft: isMobile ? 0 : 'auto',
                        width: isMobile ? '100%' : 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isMobile ? 'flex-start' : 'flex-end',
                        flexWrap: 'wrap',
                        gap: isMobile ? 8 : 12,
                    }}>
                        <AdminThemeToggle isLight={isLight} onToggle={toggleTheme} />
                        <button onClick={() => navigate(adminUrl('dashboard'))} style={{ ...actionBtnStyle('emerald'), padding: isMobile ? '7px 10px' : '8px 14px' }}>&lt;- Dashboard</button>
                        <button onClick={() => { fetchSummary(); tab === 'notifications' ? fetchNotifications(nPage) : fetchLogs(lPage); }} style={{ ...actionBtnStyle('blue'), padding: isMobile ? '7px 10px' : '8px 14px' }}>Refresh</button>
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 1300, margin: '0 auto', padding: isMobile ? '14px 12px 18px' : '28px 32px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isNarrowMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(168px, 1fr))',
                    gap: isMobile ? 10 : 12,
                    marginBottom: isMobile ? 14 : 24,
                }}>
                    {metricCard('sent_today', 'Sent Today', summaryData?.emails_today?.sent ?? '-', 'emerald', `Total: ${summaryData?.notifications?.total_sent ?? '-'}`)}
                    {metricCard('failed_today', 'Failed Today', summaryData?.emails_today?.failed ?? '-', summaryData?.emails_today?.failed > 0 ? 'red' : 'slate', `Total: ${summaryData?.notifications?.total_failed ?? '-'}`)}
                    {metricCard('in_queue', 'In Queue', summaryData?.notifications?.in_queue ?? '-', 'amber')}
                    {metricCard('reminders_today', 'Reminders Today', summaryData?.abandonment?.sent_today ?? '-', 'blue', `At max (30): ${summaryData?.abandonment?.users_at_max_reminders ?? '-'}`)}
                </div>

                {activeCardFilter !== 'all' && (
                    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--admin-text-secondary)' }}>
                            Card filter active: <span style={{ color: 'var(--admin-text-strong)', fontWeight: 700 }}>{activeCardFilter.replaceAll('_', ' ')}</span>
                        </span>
                        <button type="button" onClick={() => setActiveCardFilter('all')} style={{ ...actionBtnStyle('blue'), width: isMobile ? '100%' : 'auto' }}>Clear Filter</button>
                    </div>
                )}

                {summaryData?.history?.length > 0 && (
                    <div style={{
                        background: 'var(--admin-surface)',
                        borderRadius: 14,
                        border: '1px solid var(--admin-border-soft)',
                        padding: isMobile ? '14px 12px' : '18px 22px',
                        marginBottom: isMobile ? 14 : 24,
                    }}>
                        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--admin-text-muted)', marginBottom: 12 }}>
                            7-Day Delivery History
                        </div>
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                            {summaryData.history.map((day) => (
                                <div key={day.date} style={{
                                    flex: '1 1 0',
                                    minWidth: 100,
                                    padding: '12px 14px',
                                    background: 'var(--admin-surface-soft)',
                                    borderRadius: 10,
                                    border: '1px solid rgba(148,163,184,0.08)',
                                    textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>
                                        {new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: '#34d399' }}>{day.sent}</div>
                                    <div style={{ fontSize: 10, color: 'var(--admin-text-muted)' }}>sent</div>
                                    {day.failed > 0 && (
                                        <div style={{ marginTop: 4, fontSize: 13, fontWeight: 800, color: '#f87171' }}>
                                            {day.failed} <span style={{ fontSize: 10, fontWeight: 600 }}>failed</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
                    <button
                        disabled={!!actionLoading}
                        onClick={async () => {
                            const data = await doAction('/admin-panel/email-dashboard/test-smtp/', 'POST', { email: '' });
                            if (data?.message) alert(data.message);
                        }}
                        style={{ ...actionBtnStyle('blue'), width: isMobile ? '100%' : 'auto' }}
                    >
                        Test SMTP
                    </button>
                    <button
                        disabled={!!actionLoading}
                        onClick={async () => {
                            const data = await doAction('/admin-panel/email-dashboard/force-daily-run/');
                            if (data?.message) alert(data.message);
                        }}
                        style={{ ...actionBtnStyle('amber'), width: isMobile ? '100%' : 'auto' }}
                    >
                        Force Daily Run
                    </button>
                    <button
                        disabled={!!actionLoading}
                        onClick={async () => {
                            if (!window.confirm('Retry ALL failed notifications?')) return;
                            const data = await doAction('/admin-panel/email-dashboard/retry-all-failed/');
                            if (data?.message) alert(data.message);
                        }}
                        style={{ ...actionBtnStyle('red'), width: isMobile ? '100%' : 'auto' }}
                    >
                        Retry All Failed
                    </button>
                    <button
                        disabled={!!actionLoading}
                        onClick={async () => {
                            const data = await doAction('/admin-panel/notifications/dispatch-due/', 'POST');
                            if (data?.message) alert(data.message);
                            else alert(`Queued ${data?.queued || 0} notification(s).`);
                        }}
                        style={{ ...actionBtnStyle('emerald'), width: isMobile ? '100%' : 'auto' }}
                    >
                        Send Due Emails
                    </button>
                </div>

                <div style={{ display: 'flex', gap: 2, marginBottom: 0, overflowX: 'auto' }}>
                    {['notifications', 'logs'].map((value) => (
                        <button
                            key={value}
                            onClick={() => setTab(value)}
                            style={{
                                padding: isMobile ? '10px 12px' : '10px 22px',
                                fontSize: 12,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: 0.6,
                                borderRadius: '10px 10px 0 0',
                                background: tab === value ? 'var(--admin-surface-strong)' : 'var(--admin-tab-idle)',
                                color: tab === value ? 'var(--admin-text-strong)' : 'var(--admin-text-muted)',
                                border: tab === value ? '1px solid var(--admin-border-soft)' : '1px solid transparent',
                                borderBottom: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                flex: isMobile ? '1 1 0' : '0 0 auto',
                                minWidth: isMobile ? 120 : 'auto',
                            }}
                        >
                            {value === 'notifications' ? 'Notifications' : 'Email Log'}
                        </button>
                    ))}
                </div>

                <div style={{
                    background: 'var(--admin-surface)',
                    borderRadius: isMobile ? '0 12px 12px 12px' : '0 14px 14px 14px',
                    border: '1px solid var(--admin-border-soft)',
                    overflow: 'hidden',
                }}>
                    {tab === 'notifications' && (
                        <>
                            <div style={{
                                padding: isMobile ? '12px' : '14px 18px',
                                display: 'flex',
                                gap: 10,
                                flexWrap: 'wrap',
                                flexDirection: isMobile ? 'column' : 'row',
                                alignItems: isMobile ? 'stretch' : 'center',
                                borderBottom: '1px solid rgba(148,163,184,0.08)',
                                background: isLight ? 'rgba(248,250,252,0.82)' : 'transparent',
                            }}>
                                <input
                                    placeholder="Search email or template..."
                                    value={nSearch}
                                    onChange={(event) => setNSearch(event.target.value)}
                                    style={{ ...inputStyle, width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? 'none' : 320, boxSizing: 'border-box' }}
                                />
                                <select value={nStatus} onChange={(event) => setNStatus(event.target.value)} style={{ ...selectStyle, width: isMobile ? '100%' : 'auto' }}>
                                    <option value="">All statuses</option>
                                    <option value="queued">Queued</option>
                                    <option value="sending">Sending</option>
                                    <option value="sent">Sent</option>
                                    <option value="failed">Failed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                {isMobile && (
                                    <>
                                        <select value={nSort.key} onChange={(event) => setNSort((current) => ({ ...current, key: event.target.value }))} style={{ ...selectStyle, width: '100%' }}>
                                            <option value="template">Sort: Template</option>
                                            <option value="recipient">Sort: Recipient</option>
                                            <option value="status">Sort: Status</option>
                                            <option value="scheduled_for">Sort: Scheduled</option>
                                            <option value="sent_at">Sort: Sent At</option>
                                        </select>
                                        <select value={nSort.direction} onChange={(event) => setNSort((current) => ({ ...current, direction: event.target.value }))} style={{ ...selectStyle, width: '100%' }}>
                                            <option value="asc">Order: Ascending</option>
                                            <option value="desc">Order: Descending</option>
                                        </select>
                                    </>
                                )}
                            </div>
                            {isMobile ? (
                                <div style={{ padding: 10, display: 'grid', gap: 10 }}>
                                    {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading...</div>}
                                    {!loading && filteredNotifications.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No notifications found.</div>}
                                    {!loading && filteredNotifications.map((item, index) => (
                                        <div
                                            key={item.id}
                                            onClick={() => item.last_error && setExpandedRow(expandedRow === item.id ? null : item.id)}
                                            style={{
                                                borderRadius: 12,
                                                border: '1px solid rgba(148,163,184,0.12)',
                                                background: index % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)',
                                                padding: 12,
                                                cursor: item.last_error ? 'pointer' : 'default',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>{templateLabel(item.template_key)}</div>
                                                {statusBadge(item.status)}
                                            </div>
                                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--admin-text-secondary)', wordBreak: 'break-word' }}>{item.recipient_email}</div>
                                            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                                                <div>
                                                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--admin-text-muted)' }}>Scheduled</div>
                                                    <div style={{ marginTop: 2, fontSize: 12, color: 'var(--admin-text-secondary)' }}>{fmt(item.scheduled_for)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--admin-text-muted)' }}>Sent At</div>
                                                    <div style={{ marginTop: 2, fontSize: 12, color: 'var(--admin-text-secondary)' }}>{fmt(item.sent_at)}</div>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {item.status === 'failed' && (
                                                    <button
                                                        disabled={!!actionLoading}
                                                        onClick={(event) => { event.stopPropagation(); doAction(`/admin-panel/email-dashboard/retry-notification/${item.id}/`); }}
                                                        style={actionBtnStyle('blue')}
                                                    >
                                                        Retry
                                                    </button>
                                                )}
                                                {item.status === 'queued' && (
                                                    <button
                                                        disabled={!!actionLoading}
                                                        onClick={(event) => { event.stopPropagation(); doAction(`/admin-panel/email-dashboard/cancel-notification/${item.id}/`); }}
                                                        style={actionBtnStyle('red')}
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                            {expandedRow === item.id && item.last_error && (
                                                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--admin-surface-soft)', border: '1px solid rgba(239,68,68,0.15)', fontSize: 11, fontFamily: 'monospace', color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 140, overflowY: 'auto' }}>
                                                    {item.last_error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                <th>{renderSortHeader('Template', 'notifications', 'template')}</th>
                                                <th>{renderSortHeader('Recipient', 'notifications', 'recipient')}</th>
                                                <th>{renderSortHeader('Status', 'notifications', 'status')}</th>
                                                <th>{renderSortHeader('Scheduled', 'notifications', 'scheduled_for')}</th>
                                                <th>{renderSortHeader('Sent At', 'notifications', 'sent_at')}</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.7 }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading...</td></tr>}
                                            {!loading && filteredNotifications.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No notifications found.</td></tr>}
                                            {!loading && filteredNotifications.map((item, index) => (
                                                <tr key={item.id}>
                                                    <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                            <tbody>
                                                                <tr
                                                                    onClick={() => item.last_error && setExpandedRow(expandedRow === item.id ? null : item.id)}
                                                                    style={{ background: index % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)', cursor: item.last_error ? 'pointer' : 'default' }}
                                                                >
                                                                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--admin-text-primary)' }}>{templateLabel(item.template_key)}</td>
                                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--admin-text-secondary)' }}>{item.recipient_email}</td>
                                                                    <td style={{ padding: '12px 16px' }}>{statusBadge(item.status)}</td>
                                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--admin-text-secondary)' }}>{fmt(item.scheduled_for)}</td>
                                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--admin-text-secondary)' }}>{fmt(item.sent_at)}</td>
                                                                    <td style={{ padding: '12px 16px' }}>
                                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                                            {item.status === 'failed' && <button disabled={!!actionLoading} onClick={(event) => { event.stopPropagation(); doAction(`/admin-panel/email-dashboard/retry-notification/${item.id}/`); }} style={actionBtnStyle('blue')}>Retry</button>}
                                                                            {item.status === 'queued' && <button disabled={!!actionLoading} onClick={(event) => { event.stopPropagation(); doAction(`/admin-panel/email-dashboard/cancel-notification/${item.id}/`); }} style={actionBtnStyle('red')}>Cancel</button>}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                {expandedRow === item.id && item.last_error && (
                                                                    <tr>
                                                                        <td colSpan={6} style={{ padding: '0 16px 14px 16px', background: 'rgba(239,68,68,0.04)' }}>
                                                                            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--admin-surface-soft)', border: '1px solid rgba(239,68,68,0.15)', fontSize: 11, fontFamily: 'monospace', color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 160, overflowY: 'auto' }}>
                                                                                {item.last_error}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {pagination(nPage, nTotalPages, fetchNotifications)}
                        </>
                    )}
                    {tab === 'logs' && (
                        <>
                            <div style={{
                                padding: isMobile ? '12px' : '14px 18px',
                                display: 'flex',
                                gap: 10,
                                flexWrap: 'wrap',
                                flexDirection: isMobile ? 'column' : 'row',
                                alignItems: isMobile ? 'stretch' : 'center',
                                borderBottom: '1px solid rgba(148,163,184,0.08)',
                                background: isLight ? 'rgba(248,250,252,0.82)' : 'transparent',
                            }}>
                                <input
                                    placeholder="Search email or subject..."
                                    value={lSearch}
                                    onChange={(event) => setLSearch(event.target.value)}
                                    style={{ ...inputStyle, width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? 'none' : 320, boxSizing: 'border-box' }}
                                />
                                <select value={lType} onChange={(event) => setLType(event.target.value)} style={{ ...selectStyle, width: isMobile ? '100%' : 'auto' }}>
                                    <option value="">All types</option>
                                    <option value="notification">Notification</option>
                                    <option value="abandonment">Abandonment</option>
                                    <option value="credential">Credential</option>
                                    <option value="otp">OTP</option>
                                </select>
                                <select value={lStatus} onChange={(event) => setLStatus(event.target.value)} style={{ ...selectStyle, width: isMobile ? '100%' : 'auto' }}>
                                    <option value="">All statuses</option>
                                    <option value="sent">Sent</option>
                                    <option value="failed">Failed</option>
                                </select>
                                <select value={lDays} onChange={(event) => setLDays(Number(event.target.value))} style={{ ...selectStyle, width: isMobile ? '100%' : 'auto' }}>
                                    <option value={7}>Last 7 days</option>
                                    <option value={30}>Last 30 days</option>
                                    <option value={60}>Last 60 days</option>
                                </select>
                                {isMobile && (
                                    <>
                                        <select value={lSort.key} onChange={(event) => setLSort((current) => ({ ...current, key: event.target.value }))} style={{ ...selectStyle, width: '100%' }}>
                                            <option value="type">Sort: Type</option>
                                            <option value="subject">Sort: Subject</option>
                                            <option value="recipient">Sort: Recipient</option>
                                            <option value="status">Sort: Status</option>
                                            <option value="sent_at">Sort: Sent At</option>
                                            <option value="error">Sort: Error</option>
                                        </select>
                                        <select value={lSort.direction} onChange={(event) => setLSort((current) => ({ ...current, direction: event.target.value }))} style={{ ...selectStyle, width: '100%' }}>
                                            <option value="asc">Order: Ascending</option>
                                            <option value="desc">Order: Descending</option>
                                        </select>
                                    </>
                                )}
                            </div>
                            {isMobile ? (
                                <div style={{ padding: 10, display: 'grid', gap: 10 }}>
                                    {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading...</div>}
                                    {!loading && filteredLogs.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No email logs found.</div>}
                                    {!loading && filteredLogs.map((item, index) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                borderRadius: 12,
                                                border: '1px solid rgba(148,163,184,0.12)',
                                                background: index % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)',
                                                padding: 12,
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                                {typeBadge(item.email_type)}
                                                {statusBadge(item.status)}
                                            </div>
                                            <div title={item.subject} style={{ marginTop: 8, fontSize: 12, color: 'var(--admin-text-primary)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.subject}
                                            </div>
                                            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--admin-text-secondary)', wordBreak: 'break-word' }}>{item.recipient_email}</div>
                                            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                                                <div>
                                                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--admin-text-muted)' }}>Sent At</div>
                                                    <div style={{ marginTop: 2, fontSize: 12, color: 'var(--admin-text-secondary)' }}>{fmt(item.created_at)}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--admin-text-muted)' }}>Error</div>
                                                    <div title={item.error_message} style={{ marginTop: 2, fontSize: 11, color: '#fca5a5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.error_message || '-'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                <th>{renderSortHeader('Type', 'logs', 'type')}</th>
                                                <th>{renderSortHeader('Subject', 'logs', 'subject')}</th>
                                                <th>{renderSortHeader('Recipient', 'logs', 'recipient')}</th>
                                                <th>{renderSortHeader('Status', 'logs', 'status')}</th>
                                                <th>{renderSortHeader('Sent At', 'logs', 'sent_at')}</th>
                                                <th>{renderSortHeader('Error', 'logs', 'error')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading...</td></tr>}
                                            {!loading && filteredLogs.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No email logs found.</td></tr>}
                                            {!loading && filteredLogs.map((item, index) => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)', background: index % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)' }}>
                                                    <td style={{ padding: '12px 16px' }}>{typeBadge(item.email_type)}</td>
                                                    <td title={item.subject} style={{ padding: '12px 16px', fontSize: 12, color: 'var(--admin-text-primary)', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subject}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--admin-text-secondary)' }}>{item.recipient_email}</td>
                                                    <td style={{ padding: '12px 16px' }}>{statusBadge(item.status)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--admin-text-secondary)' }}>{fmt(item.created_at)}</td>
                                                    <td title={item.error_message} style={{ padding: '12px 16px', fontSize: 11, color: '#fca5a5', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.error_message || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {pagination(lPage, lTotalPages, fetchLogs)}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailDashboard;
