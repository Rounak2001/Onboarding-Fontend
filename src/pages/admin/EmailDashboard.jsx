import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import BrandLogo from '../../components/BrandLogo';

const PAGE_SIZE = 25;

const EmailDashboard = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('admin_token');

    // ── State ──
    const [summary, setSummary] = useState(null);
    const [tab, setTab] = useState('notifications');
    const [notifications, setNotifications] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    // Notification filters
    const [nPage, setNPage] = useState(1);
    const [nTotal, setNTotal] = useState(0);
    const [nTotalPages, setNTotalPages] = useState(1);
    const [nStatus, setNStatus] = useState('');
    const [nSearch, setNSearch] = useState('');

    // Log filters
    const [lPage, setLPage] = useState(1);
    const [lTotal, setLTotal] = useState(0);
    const [lTotalPages, setLTotalPages] = useState(1);
    const [lType, setLType] = useState('');
    const [lStatus, setLStatus] = useState('');
    const [lSearch, setLSearch] = useState('');
    const [lDays, setLDays] = useState(7);

    // Expanded error row
    const [expandedRow, setExpandedRow] = useState(null);

    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    // ── Fetch summary ──
    const fetchSummary = async () => {
        try {
            const res = await fetch(apiUrl('/admin-panel/email-dashboard/'), { headers });
            if (res.status === 401 || res.status === 403) { localStorage.removeItem('admin_token'); navigate(adminUrl()); return; }
            setSummary(await res.json());
        } catch { /* ignore */ }
    };

    // ── Fetch notifications ──
    const fetchNotifications = async (pg = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pg, page_size: PAGE_SIZE });
            if (nStatus) params.set('status', nStatus);
            if (nSearch.trim()) params.set('search', nSearch.trim());
            const res = await fetch(apiUrl(`/admin-panel/email-dashboard/notifications/?${params}`), { headers });
            if (res.status === 401 || res.status === 403) { localStorage.removeItem('admin_token'); navigate(adminUrl()); return; }
            const data = await res.json();
            setNotifications(data.notifications || []);
            setNTotal(data.total || 0);
            setNTotalPages(data.total_pages || 1);
            setNPage(pg);
        } catch { /* ignore */ }
        setLoading(false);
    };

    // ── Fetch logs ──
    const fetchLogs = async (pg = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pg, page_size: PAGE_SIZE, days: lDays });
            if (lType) params.set('type', lType);
            if (lStatus) params.set('status', lStatus);
            if (lSearch.trim()) params.set('search', lSearch.trim());
            const res = await fetch(apiUrl(`/admin-panel/email-dashboard/logs/?${params}`), { headers });
            if (res.status === 401 || res.status === 403) { localStorage.removeItem('admin_token'); navigate(adminUrl()); return; }
            const data = await res.json();
            setLogs(data.logs || []);
            setLTotal(data.total || 0);
            setLTotalPages(data.total_pages || 1);
            setLPage(pg);
        } catch { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => {
        if (!token && !import.meta.env.DEV) { navigate(adminUrl()); return; }
        fetchSummary();
        fetchNotifications(1);
    }, []);

    useEffect(() => {
        if (tab === 'notifications') fetchNotifications(1);
        else fetchLogs(1);
    }, [tab, nStatus, lType, lStatus, lDays]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (tab === 'notifications') fetchNotifications(1);
            else fetchLogs(1);
        }, 350);
        return () => clearTimeout(t);
    }, [nSearch, lSearch]);

    // ── Actions ──
    const doAction = async (url, method = 'POST', body = null) => {
        setActionLoading(url);
        try {
            const opts = { method, headers: { ...headers, 'Content-Type': 'application/json' } };
            if (body) opts.body = JSON.stringify(body);
            const res = await fetch(apiUrl(url), opts);
            const data = await res.json();
            if (!res.ok) { alert(data.error || 'Action failed'); return data; }
            fetchSummary();
            if (tab === 'notifications') fetchNotifications(nPage);
            else fetchLogs(lPage);
            return data;
        } catch { alert('Failed to connect'); return null; }
        finally { setActionLoading(null); }
    };

    // ── Helpers ──
    const fmt = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

    const statusBadge = (s) => {
        const colors = {
            sent: { bg: 'rgba(16,185,129,0.14)', fg: '#34d399', border: 'rgba(16,185,129,0.25)' },
            queued: { bg: 'rgba(245,158,11,0.12)', fg: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
            sending: { bg: 'rgba(59,130,246,0.12)', fg: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
            failed: { bg: 'rgba(239,68,68,0.14)', fg: '#f87171', border: 'rgba(239,68,68,0.22)' },
            cancelled: { bg: 'rgba(100,116,139,0.12)', fg: '#94a3b8', border: 'rgba(100,116,139,0.15)' },
        };
        const c = colors[s] || colors.queued;
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
                textTransform: 'capitalize',
            }}>{s}</span>
        );
    };

    const typeBadge = (t) => {
        const icons = { notification: '🔔', abandonment: '📩', credential: '🔑', otp: '🔐' };
        const labels = { notification: 'Notification', abandonment: 'Abandonment', credential: 'Credential', otp: 'OTP' };
        return (
            <span style={{ fontSize: 12, color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                {icons[t] || '📧'} {labels[t] || t}
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

    // ── Metric Card (same style as AdminDashboard) ──
    const metricCard = (label, value, tint = 'slate', subtitle = '') => {
        const tints = {
            emerald: { edge: 'rgba(16,185,129,0.28)', bg: 'rgba(16,185,129,0.08)', fg: '#34d399' },
            blue: { edge: 'rgba(59,130,246,0.28)', bg: 'rgba(59,130,246,0.08)', fg: '#60a5fa' },
            amber: { edge: 'rgba(245,158,11,0.28)', bg: 'rgba(245,158,11,0.08)', fg: '#fbbf24' },
            red: { edge: 'rgba(239,68,68,0.28)', bg: 'rgba(239,68,68,0.08)', fg: '#f87171' },
            slate: { edge: 'rgba(148,163,184,0.18)', bg: 'rgba(148,163,184,0.06)', fg: '#94a3b8' },
        };
        const c = tints[tint] || tints.slate;
        return (
            <div style={{
                padding: 16, borderRadius: 14,
                background: 'rgba(15,23,42,0.45)',
                border: `1px solid ${c.edge}`,
                boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                position: 'relative', overflow: 'hidden', minHeight: 72,
            }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: '#64748b' }}>
                    {label}
                </div>
                <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>
                    {value}
                </div>
                {subtitle && <div style={{ marginTop: 2, fontSize: 11, color: '#64748b' }}>{subtitle}</div>}
                <div style={{
                    position: 'absolute', inset: -60,
                    background: `radial-gradient(circle at 70% 10%, ${c.bg}, transparent 55%)`,
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', right: 14, top: 14,
                    width: 10, height: 10, borderRadius: 999,
                    background: c.fg, boxShadow: `0 0 0 6px ${c.bg}`,
                }} />
            </div>
        );
    };

    // ── Pagination ──
    const pagination = (page, totalPages, onPage) => (
        <div style={{
            padding: '10px 16px', borderTop: '1px solid rgba(148,163,184,0.08)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            color: '#64748b', fontSize: 12, flexWrap: 'wrap', gap: 8,
        }}>
            <span>
                Page <span style={{ color: '#e2e8f0', fontWeight: 800 }}>{page}</span> of <span style={{ color: '#e2e8f0', fontWeight: 800 }}>{totalPages}</span>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
                {[
                    { label: '‹', disabled: page <= 1, pg: page - 1 },
                    { label: '›', disabled: page >= totalPages, pg: page + 1 },
                ].map((b, i) => (
                    <button key={i} onClick={() => onPage(b.pg)} disabled={b.disabled || loading} style={{
                        padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                        background: 'rgba(148,163,184,0.08)', color: b.disabled ? '#334155' : '#94a3b8',
                        border: '1px solid rgba(148,163,184,0.15)', cursor: b.disabled ? 'not-allowed' : 'pointer',
                    }}>{b.label}</button>
                ))}
            </div>
        </div>
    );

    // ── Select style ──
    const selectStyle = {
        padding: '9px 12px', borderRadius: 10,
        background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.15)',
        color: '#e2e8f0', fontSize: 12, outline: 'none', cursor: 'pointer',
    };

    const inputStyle = {
        padding: '9px 14px', borderRadius: 10,
        background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(148,163,184,0.15)',
        color: '#f1f5f9', fontSize: 12, outline: 'none', flex: '1 1 200px', maxWidth: 320,
    };

    const actionBtnStyle = (color = 'blue') => {
        const colors = {
            blue: { bg: 'rgba(59,130,246,0.14)', fg: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
            red: { bg: 'rgba(239,68,68,0.12)', fg: '#f87171', border: 'rgba(239,68,68,0.2)' },
            amber: { bg: 'rgba(245,158,11,0.12)', fg: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
            emerald: { bg: 'rgba(16,185,129,0.14)', fg: '#34d399', border: 'rgba(16,185,129,0.25)' },
        };
        const c = colors[color] || colors.blue;
        return {
            padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
        };
    };

    const s = summary;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            fontFamily: "'Inter', system-ui, sans-serif", color: '#f1f5f9',
        }}>
            {/* ── Header ── */}
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
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>Email Monitor</span>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => navigate(adminUrl('dashboard'))} style={{
                            ...actionBtnStyle('emerald'), padding: '8px 14px',
                        }}>← Dashboard</button>
                        <button onClick={() => { fetchSummary(); tab === 'notifications' ? fetchNotifications(nPage) : fetchLogs(lPage); }} style={{
                            ...actionBtnStyle('blue'), padding: '8px 14px',
                        }}>Refresh</button>
                    </div>
                </div>
            </header>

            <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 32px' }}>

                {/* ── Health Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {metricCard('Sent Today', s?.emails_today?.sent ?? '—', 'emerald', `Total: ${s?.notifications?.total_sent ?? '—'}`)}
                    {metricCard('Failed Today', s?.emails_today?.failed ?? '—', s?.emails_today?.failed > 0 ? 'red' : 'slate', `Total: ${s?.notifications?.total_failed ?? '—'}`)}
                    {metricCard('In Queue', s?.notifications?.in_queue ?? '—', 'amber')}
                    {metricCard('Reminders Today', s?.abandonment?.sent_today ?? '—', 'blue', `At max (30): ${s?.abandonment?.users_at_max_reminders ?? '—'}`)}
                </div>

                {/* ── 7-Day History ── */}
                {s?.history?.length > 0 && (
                    <div style={{
                        background: 'rgba(30,41,59,0.5)', borderRadius: 14,
                        border: '1px solid rgba(148,163,184,0.1)',
                        padding: '18px 22px', marginBottom: 24,
                    }}>
                        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.7, color: '#64748b', marginBottom: 12 }}>
                            7-Day Delivery History
                        </div>
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                            {s.history.map(d => (
                                <div key={d.date} style={{
                                    flex: '1 1 0', minWidth: 100, padding: '12px 14px',
                                    background: 'rgba(15,23,42,0.4)', borderRadius: 10,
                                    border: '1px solid rgba(148,163,184,0.08)', textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                                        {new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: '#34d399' }}>{d.sent}</div>
                                    <div style={{ fontSize: 10, color: '#64748b' }}>sent</div>
                                    {d.failed > 0 && (
                                        <div style={{ marginTop: 4, fontSize: 13, fontWeight: 800, color: '#f87171' }}>{d.failed} <span style={{ fontSize: 10, fontWeight: 600 }}>failed</span></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Action Toolbar ── */}
                <div style={{
                    display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center',
                }}>
                    <button
                        disabled={!!actionLoading}
                        onClick={async () => {
                            const d = await doAction('/admin-panel/email-dashboard/test-smtp/', 'POST', { email: '' });
                            if (d?.message) alert(d.message);
                        }}
                        style={actionBtnStyle('blue')}
                    >🧪 Test SMTP</button>
                    <button
                        disabled={!!actionLoading}
                        onClick={async () => {
                            const d = await doAction('/admin-panel/email-dashboard/force-daily-run/');
                            if (d?.message) alert(d.message);
                        }}
                        style={actionBtnStyle('amber')}
                    >📊 Force Daily Run</button>
                    <button
                        disabled={!!actionLoading}
                        onClick={async () => {
                            if (!window.confirm('Retry ALL failed notifications?')) return;
                            const d = await doAction('/admin-panel/email-dashboard/retry-all-failed/');
                            if (d?.message) alert(d.message);
                        }}
                        style={actionBtnStyle('red')}
                    >🔄 Retry All Failed</button>
                    <button
                        disabled={!!actionLoading}
                        onClick={async () => {
                            const d = await doAction('/admin-panel/notifications/dispatch-due/', 'POST');
                            if (d?.message) alert(d.message);
                            else alert(`Queued ${d?.queued || 0} notification(s).`);
                        }}
                        style={actionBtnStyle('emerald')}
                    >📤 Send Due Emails</button>
                </div>

                {/* ── Tabs ── */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 0 }}>
                    {['notifications', 'logs'].map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding: '10px 22px', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6,
                            borderRadius: '10px 10px 0 0',
                            background: tab === t ? 'rgba(30,41,59,0.5)' : 'rgba(15,23,42,0.3)',
                            color: tab === t ? '#f1f5f9' : '#64748b',
                            border: tab === t ? '1px solid rgba(148,163,184,0.1)' : '1px solid transparent',
                            borderBottom: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                            {t === 'notifications' ? '🔔 Notifications' : '📋 Email Log'}
                        </button>
                    ))}
                </div>

                {/* ── Tab Content ── */}
                <div style={{
                    background: 'rgba(30,41,59,0.5)', borderRadius: '0 14px 14px 14px',
                    border: '1px solid rgba(148,163,184,0.1)', overflow: 'hidden',
                }}>
                    {/* ── Notifications Tab ── */}
                    {tab === 'notifications' && (
                        <>
                            <div style={{ padding: '14px 18px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                                <input placeholder="Search email or template…" value={nSearch} onChange={e => setNSearch(e.target.value)} style={inputStyle} />
                                <select value={nStatus} onChange={e => setNStatus(e.target.value)} style={selectStyle}>
                                    <option value="">All statuses</option>
                                    <option value="queued">Queued</option>
                                    <option value="sending">Sending</option>
                                    <option value="sent">Sent</option>
                                    <option value="failed">Failed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                            {['Template', 'Recipient', 'Status', 'Scheduled', 'Sent At', 'Actions'].map(h => (
                                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && (
                                            <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading…</td></tr>
                                        )}
                                        {!loading && notifications.length === 0 && (
                                            <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No notifications found.</td></tr>
                                        )}
                                        {!loading && notifications.map((n, i) => (
                                            <>
                                                <tr
                                                    key={n.id}
                                                    onClick={() => n.last_error && setExpandedRow(expandedRow === n.id ? null : n.id)}
                                                    style={{
                                                        borderBottom: '1px solid rgba(148,163,184,0.06)',
                                                        background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)',
                                                        cursor: n.last_error ? 'pointer' : 'default',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.04)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)'}
                                                >
                                                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{templateLabel(n.template_key)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{n.recipient_email}</td>
                                                    <td style={{ padding: '12px 16px' }}>{statusBadge(n.status)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{fmt(n.scheduled_for)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{fmt(n.sent_at)}</td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            {n.status === 'failed' && (
                                                                <button
                                                                    disabled={!!actionLoading}
                                                                    onClick={e => { e.stopPropagation(); doAction(`/admin-panel/email-dashboard/retry-notification/${n.id}/`); }}
                                                                    style={actionBtnStyle('blue')}
                                                                >Retry</button>
                                                            )}
                                                            {n.status === 'queued' && (
                                                                <button
                                                                    disabled={!!actionLoading}
                                                                    onClick={e => { e.stopPropagation(); doAction(`/admin-panel/email-dashboard/cancel-notification/${n.id}/`); }}
                                                                    style={actionBtnStyle('red')}
                                                                >Cancel</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedRow === n.id && n.last_error && (
                                                    <tr key={`err-${n.id}`}>
                                                        <td colSpan={6} style={{ padding: '0 16px 14px 16px', background: 'rgba(239,68,68,0.04)' }}>
                                                            <div style={{
                                                                padding: '10px 14px', borderRadius: 8,
                                                                background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(239,68,68,0.15)',
                                                                fontSize: 11, fontFamily: 'monospace', color: '#fca5a5',
                                                                whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 160, overflowY: 'auto',
                                                            }}>
                                                                {n.last_error}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {pagination(nPage, nTotalPages, fetchNotifications)}
                        </>
                    )}

                    {/* ── Logs Tab ── */}
                    {tab === 'logs' && (
                        <>
                            <div style={{ padding: '14px 18px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                                <input placeholder="Search email or subject…" value={lSearch} onChange={e => setLSearch(e.target.value)} style={inputStyle} />
                                <select value={lType} onChange={e => setLType(e.target.value)} style={selectStyle}>
                                    <option value="">All types</option>
                                    <option value="notification">🔔 Notification</option>
                                    <option value="abandonment">📩 Abandonment</option>
                                    <option value="credential">🔑 Credential</option>
                                    <option value="otp">🔐 OTP</option>
                                </select>
                                <select value={lStatus} onChange={e => setLStatus(e.target.value)} style={selectStyle}>
                                    <option value="">All statuses</option>
                                    <option value="sent">✅ Sent</option>
                                    <option value="failed">❌ Failed</option>
                                </select>
                                <select value={lDays} onChange={e => setLDays(Number(e.target.value))} style={selectStyle}>
                                    <option value={7}>Last 7 days</option>
                                    <option value={30}>Last 30 days</option>
                                    <option value={60}>Last 60 days</option>
                                </select>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                            {['Type', 'Subject', 'Recipient', 'Status', 'Sent At', 'Error'].map(h => (
                                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7 }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && (
                                            <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading…</td></tr>
                                        )}
                                        {!loading && logs.length === 0 && (
                                            <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No email logs found.</td></tr>
                                        )}
                                        {!loading && logs.map((l, i) => (
                                            <tr
                                                key={l.id}
                                                style={{
                                                    borderBottom: '1px solid rgba(148,163,184,0.06)',
                                                    background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.04)'}
                                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)'}
                                            >
                                                <td style={{ padding: '12px 16px' }}>{typeBadge(l.email_type)}</td>
                                                <td title={l.subject} style={{ padding: '12px 16px', fontSize: 12, color: '#e2e8f0', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.subject}</td>
                                                <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{l.recipient_email}</td>
                                                <td style={{ padding: '12px 16px' }}>{statusBadge(l.status)}</td>
                                                <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{fmt(l.created_at)}</td>
                                                <td title={l.error_message} style={{ padding: '12px 16px', fontSize: 11, color: '#fca5a5', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.error_message || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {pagination(lPage, lTotalPages, fetchLogs)}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailDashboard;
