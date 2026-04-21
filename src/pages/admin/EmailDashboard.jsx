import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LabelList,
} from 'recharts';
import { apiUrl } from '../../utils/apiBase';
import { adminUrl } from '../../utils/adminPath';
import { clearAdminSession, getAdminToken } from '../../utils/adminSession';

const API_BASE = apiUrl('/admin-panel/email-dashboard');

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt    = (n) => (n ?? 0).toLocaleString();
const fmtPct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
};
const fmtDayLabel = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// ── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       '#080e1c',
  surface:  '#0d1526',
  card:     '#111d32',
  card2:    '#162038',
  border:   '#1e2d45',
  text:     '#e2e8f0',
  muted:    '#64748b',
  dim:      '#334155',
  // semantic
  emerald:  '#10b981',
  emeraldD: '#059669',
  red:      '#ef4444',
  redD:     '#dc2626',
  amber:    '#f59e0b',
  amberD:   '#d97706',
  blue:     '#3b82f6',
  blueD:    '#2563eb',
  purple:   '#8b5cf6',
  purpleD:  '#7c3aed',
  indigo:   '#6366f1',
  cyan:     '#06b6d4',
  slate:    '#475569',
  // email type colors
  TYPE: {
    abandonment: '#f59e0b',   // amber
    notification: '#8b5cf6',  // purple
    credential:  '#10b981',   // emerald
    otp:         '#06b6d4',   // cyan
  },
  // bucket colors
  BUCKET: {
    new_join:   '#10b981',
    progress:   '#3b82f6',
    assessment: '#f59e0b',
    retry:      '#8b5cf6',
  },
};

// ── CSS helpers ───────────────────────────────────────────────────────────────
const badge = (color) => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
  fontSize: '11px', fontWeight: 700, background: `${color}22`, color, whiteSpace: 'nowrap',
});
const card = (extra = {}) => ({
  background: C.card, borderRadius: '14px', padding: '20px 22px',
  border: `1px solid ${C.border}`, ...extra,
});
const btn = (color = C.slate, small = false) => ({
  padding: small ? '5px 12px' : '8px 18px',
  background: color, color: '#fff', border: 'none',
  borderRadius: small ? '6px' : '8px', cursor: 'pointer',
  fontSize: small ? '12px' : '13px', fontWeight: 600, whiteSpace: 'nowrap',
});
const input = {
  background: C.card2, border: `1px solid ${C.border}`, borderRadius: '8px',
  padding: '8px 14px', color: C.text, fontSize: '13px', outline: 'none', minWidth: '0',
};
const sel = { ...input, cursor: 'pointer' };

// ── Type + Bucket badges ──────────────────────────────────────────────────────
const TypeBadge = ({ t }) => {
  const color = C.TYPE[t] || C.slate;
  const labels = { abandonment: '9AM', notification: 'Event', credential: 'Creds', otp: 'OTP' };
  return <span style={badge(color)}>{labels[t] || t}</span>;
};
const BucketBadge = ({ b }) => {
  if (!b) return <span style={{ color: C.dim, fontSize: '12px' }}>—</span>;
  const color = C.BUCKET[b] || C.slate;
  return <span style={badge(color)}>{b.replace('_', ' ')}</span>;
};
const StatusBadge = ({ s }) => {
  const map = { sent: C.emerald, failed: C.red, queued: C.amber, sending: C.blue, cancelled: C.dim };
  return <span style={badge(map[s] || C.slate)}>{s}</span>;
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, accent, onClick, foot }) => (
  <div onClick={onClick} style={{
    ...card(),
    borderTop: `3px solid ${accent}`,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'opacity 0.15s',
    minWidth: 0,
  }}>
    <div style={{ fontSize: '30px', fontWeight: 900, color: C.text, lineHeight: 1, marginBottom: '5px' }}>{fmt(value)}</div>
    <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted }}>{label}</div>
    {foot && <div style={{ fontSize: '11px', color: accent, marginTop: '4px' }}>{foot}</div>}
  </div>
);

// ── Recharts custom tooltip ───────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
      <div style={{ fontWeight: 700, marginBottom: '6px', color: C.text }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '2px' }}>
          {p.name}: <strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

// ── 30-Day Bar/Area Chart ─────────────────────────────────────────────────────
const DeliveryChart = ({ history }) => {
  const data = useMemo(() => (history || []).map(d => ({
    label: fmtDayLabel(d.date),
    sent:   Object.entries(d).filter(([k]) => k.endsWith('_sent')).reduce((a, [, v]) => a + v, 0),
    failed: Object.entries(d).filter(([k]) => k.endsWith('_failed')).reduce((a, [, v]) => a + v, 0),
  })), [history]);

  if (!data.length) return <div style={{ color: C.muted, fontSize: '13px' }}>No data in range.</div>;

  // Only label every 5th tick to avoid overlap
  const tickFormatter = (_, i) => (i % 5 === 0 ? data[i]?.label || '' : '');

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: C.muted, fontSize: 11 }} tickLine={false} axisLine={false}
          tickFormatter={(v, i) => i % 5 === 0 ? v : ''} />
        <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: `${C.border}50` }} />
        <Legend wrapperStyle={{ fontSize: '12px', color: C.muted, paddingTop: '8px' }} />
        <Bar dataKey="sent"   name="Sent"   fill={C.emerald} radius={[3, 3, 0, 0]} />
        <Bar dataKey="failed" name="Failed" fill={C.red}     radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// ── Type Pie Chart ─────────────────────────────────────────────────────────────
const TypePieChart = ({ byType }) => {
  const data = useMemo(() => {
    const totals = {};
    (byType || []).forEach(({ email_type, status, count }) => {
      if (!totals[email_type]) totals[email_type] = { name: email_type, value: 0 };
      totals[email_type].value += count;
    });
    return Object.values(totals);
  }, [byType]);

  if (!data.length) return <div style={{ color: C.muted, fontSize: '13px' }}>No data today.</div>;

  const labels = { abandonment: '9AM', notification: 'Event', credential: 'Creds', otp: 'OTP' };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
          dataKey="value" nameKey="name" paddingAngle={3}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={C.TYPE[entry.name] || C.slate} />
          ))}
          <LabelList dataKey="value" position="outside" style={{ fill: C.muted, fontSize: '11px' }} />
        </Pie>
        <Tooltip formatter={(v, n) => [fmt(v), labels[n] || n]}
          contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '12px' }} />
        <Legend formatter={(v) => labels[v] || v} wrapperStyle={{ fontSize: '12px', color: C.muted }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ── Funnel horizontal bar chart ───────────────────────────────────────────────
const ELIGIBLE_SET = new Set(['New Join','Profile Details','Gov ID','Face Verification','Degree Upload','Assessment Ongoing','MCQ','Retry']);
const STATUS_ORDER = ['New Join','Profile Details','Gov ID','Face Verification','Degree Upload','Assessment Ongoing','MCQ','Retry','Disqualified','Credentials Failed','Credentials Sent'];

const FunnelChart = ({ funnel }) => {
  const data = STATUS_ORDER.map(s => ({ name: s, value: funnel?.[s] || 0 }));
  const colors = STATUS_ORDER.map(s =>
    s === 'Credentials Sent' ? C.emeraldD
    : ELIGIBLE_SET.has(s) ? C.blue
    : C.red
  );

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} layout="vertical" barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
        <XAxis type="number" tick={{ fill: C.muted, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fill: C.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: `${C.border}50` }} />
        <Bar dataKey="value" name="Users" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => <Cell key={entry.name} fill={colors[i]} />)}
          <LabelList dataKey="value" position="right" style={{ fill: C.muted, fontSize: '11px' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ── Bucket bar chart ──────────────────────────────────────────────────────────
const BucketChart = ({ byBucket }) => {
  const buckets = ['new_join', 'progress', 'assessment', 'retry'];
  const labels  = { new_join: 'New Join', progress: 'Progress', assessment: 'Assessment', retry: 'Retry' };
  const data = buckets.map(b => ({
    name: labels[b],
    sent:   byBucket?.[b]?.sent   || 0,
    failed: byBucket?.[b]?.failed || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="40%">
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: `${C.border}50` }} />
        <Legend wrapperStyle={{ fontSize: '12px', color: C.muted }} />
        <Bar dataKey="sent"   name="Sent"   fill={C.emerald} radius={[3, 3, 0, 0]} />
        <Bar dataKey="failed" name="Failed" fill={C.red}     radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// ── Sort arrow ─────────────────────────────────────────────────────────────────
const SortIcon = ({ field, sortBy, sortDir }) => {
  if (sortBy !== field) return <span style={{ color: C.dim, marginLeft: '4px' }}>↕</span>;
  return <span style={{ color: C.blue, marginLeft: '4px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
};

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ page, totalPages, total, pageSize, onPage }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginTop: '16px', fontSize: '13px', color: C.muted, flexWrap: 'wrap', gap: '10px' }}>
    <span>Showing {fmt(Math.min((page - 1) * pageSize + 1, total))}–{fmt(Math.min(page * pageSize, total))} of {fmt(total)}</span>
    <div style={{ display: 'flex', gap: '6px' }}>
      <button style={btn(C.slate, true)} disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span style={{ padding: '5px 10px', fontSize: '12px' }}>{page} / {totalPages}</span>
      <button style={btn(C.slate, true)} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  </div>
);

// ── Tab Bar ───────────────────────────────────────────────────────────────────
const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', gap: '4px', background: C.surface, padding: '4px',
    borderRadius: '10px', marginBottom: '20px', border: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
    {tabs.map(t => (
      <button key={t.key} onClick={() => onChange(t.key)} style={{
        padding: '8px 18px',
        background: active === t.key ? C.card : 'transparent',
        color: active === t.key ? C.text : C.muted,
        border: active === t.key ? `1px solid ${C.border}` : '1px solid transparent',
        borderRadius: '7px', cursor: 'pointer', fontSize: '13px',
        fontWeight: active === t.key ? 700 : 500, transition: 'all 0.15s',
      }}>{t.label}</button>
    ))}
  </div>
);

// ── Th (sortable) ─────────────────────────────────────────────────────────────
const Th = ({ field, label, sortBy, sortDir, onSort, style = {} }) => (
  <th onClick={() => field && onSort(field)} style={{
    padding: '10px 14px', textAlign: 'left', color: field ? C.muted : C.dim,
    fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: `1px solid ${C.border}`, cursor: field ? 'pointer' : 'default',
    userSelect: 'none', whiteSpace: 'nowrap', ...style,
  }}>
    {label}{field && <SortIcon field={field} sortBy={sortBy} sortDir={sortDir} />}
  </th>
);

// ── Alert Banner ──────────────────────────────────────────────────────────────
const Alert = ({ color, icon, children, action }) => (
  <div style={{ background: `${color}12`, border: `1px solid ${color}44`, borderRadius: '10px',
    padding: '12px 18px', marginBottom: '14px', fontSize: '13px', color,
    display: 'flex', alignItems: 'center', gap: '10px' }}>
    <span>{icon}</span>
    <span style={{ flex: 1 }}>{children}</span>
    {action}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════
export default function EmailDashboard() {
  const navigate = useNavigate();
  const token = getAdminToken();
  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab,  setActiveTab]  = useState('log');
  const [actionMsg,  setActionMsg]  = useState(null); // { text, type: 'ok'|'err' }

  // ── Log tab state ──
  const [logs,      setLogs]     = useState([]);
  const [logTotal,  setLT]       = useState(0);
  const [logPage,   setLP]       = useState(1);
  const [logSearch, setLS]       = useState('');
  const [logType,   setLType]    = useState('');
  const [logStatus, setLSt]      = useState('');
  const [logBucket, setLBucket]  = useState('');
  const [cardFilter,setCardF]    = useState('');
  const [logSort,   setLogSort]  = useState('created_at');
  const [logDir,    setLogDir]   = useState('desc');

  // ── Notifications tab state ──
  const [notifs,       setNotifs]    = useState([]);
  const [notifTotal,   setNT]        = useState(0);
  const [notifPage,    setNP]        = useState(1);
  const [notifSearch,  setNS]        = useState('');
  const [notifStatus,  setNSt]       = useState('');

  const PAGE_SIZE = 25;

  const resetSession = useCallback(() => {
    clearAdminSession();
    navigate(adminUrl());
  }, [navigate]);

  // ── fetch helpers ──────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch(`${API_BASE}/`, { credentials: 'include', headers: authHeaders });
      if (r.status === 401 || r.status === 403) return resetSession();
      if (r.ok) setSummary(await r.json());
    } finally { setRefreshing(false); setLoading(false); }
  }, [authHeaders, resetSession]);

  const fetchLogs = useCallback(async () => {
    const p = new URLSearchParams({ page: logPage, page_size: PAGE_SIZE, days: 30, sort_by: logSort, sort_dir: logDir });
    if (logSearch)  p.set('search', logSearch);
    if (logType)    p.set('type', logType);
    if (logStatus)  p.set('status', logStatus);
    if (logBucket)  p.set('bucket', logBucket);
    if (cardFilter) p.set('card_filter', cardFilter);
    const r = await fetch(`${API_BASE}/logs/?${p}`, { credentials: 'include', headers: authHeaders });
    if (r.status === 401 || r.status === 403) return resetSession();
    if (r.ok) { const d = await r.json(); setLogs(d.logs || []); setLT(d.total || 0); }
  }, [logPage, logSearch, logType, logStatus, logBucket, cardFilter, logSort, logDir, authHeaders, resetSession]);

  const fetchNotifs = useCallback(async () => {
    const p = new URLSearchParams({ page: notifPage, page_size: PAGE_SIZE });
    if (notifSearch) p.set('search', notifSearch);
    if (notifStatus) p.set('status', notifStatus);
    const r = await fetch(`${API_BASE}/notifications/?${p}`, { credentials: 'include', headers: authHeaders });
    if (r.status === 401 || r.status === 403) return resetSession();
    if (r.ok) { const d = await r.json(); setNotifs(d.notifications || []); setNT(d.total || 0); }
  }, [notifPage, notifSearch, notifStatus, authHeaders, resetSession]);

  useEffect(() => { if (!token && !import.meta.env.DEV) resetSession(); }, [resetSession, token]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { const id = setInterval(fetchSummary, 60000); return () => clearInterval(id); }, [fetchSummary]);
  useEffect(() => { if (activeTab === 'log')  fetchLogs();   }, [activeTab, fetchLogs]);
  useEffect(() => { if (activeTab === 'notif') fetchNotifs(); }, [activeTab, fetchNotifs]);

  // ── sort handler (log table) ───────────────────────────────────────────
  const handleLogSort = (field) => {
    if (logSort === field) setLogDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setLogSort(field); setLogDir('desc'); }
    setLP(1);
  };

  // ── action helper ──────────────────────────────────────────────────────
  const action = async (url, method = 'POST', label = '') => {
    setActionMsg({ text: `Running: ${label}…`, type: 'ok' });
    try {
      const r = await fetch(url, { method, credentials: 'include', headers: authHeaders });
      if (r.status === 401 || r.status === 403) {
        resetSession();
        return;
      }
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch {
        setActionMsg({ text: `Server returned non-JSON (status ${r.status}) — is Django running?`, type: 'err' });
        return;
      }
      if (!r.ok) { setActionMsg({ text: data.error || data.detail || `Error ${r.status}`, type: 'err' }); return; }
      setActionMsg({ text: data.message || JSON.stringify(data), type: 'ok' });
      fetchSummary();
      if (activeTab === 'log')  fetchLogs();
      if (activeTab === 'notif') fetchNotifs();
    } catch (e) { setActionMsg({ text: `Network error: ${e.message}`, type: 'err' }); }
    setTimeout(() => setActionMsg(null), 6000);
  };

  const toLog = (card) => { setCardF(card); setLP(1); setActiveTab('log'); };
  const toBucket = (b)  => { setLBucket(b); setLP(1); setCardF(''); setActiveTab('log'); };

  // ── derived values ─────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <span style={{ color: C.muted }}>Loading Email Monitor…</span>
    </div>
  );

  const su   = summary || {};
  const ns   = su.notifications || {};
  const et   = su.emails_today  || {};
  const ab   = su.abandonment   || {};
  const fnl  = su.funnel_live   || {};
  const h30  = su.history_30d   || [];
  const eventToday = (et.by_type || []).filter(r => r.email_type === 'notification' && r.status === 'sent').reduce((a, r) => a + r.count, 0);
  const rb   = ab.by_bucket?.retry || {};
  const rbTotal = (rb.sent || 0) + (rb.failed || 0);
  const rbRate  = rbTotal > 0 ? (rb.failed / rbTotal) * 100 : 0;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", padding: '24px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.02em' }}>📧 Email Monitor</h1>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>
            {refreshing ? '⟳ Syncing…' : 'Auto-refreshes every 60s · Times in IST'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={btn(C.slate)} onClick={fetchSummary}>↺ Refresh</button>
          <button style={btn(C.purpleD)} onClick={() => action(`${API_BASE}/send-due-notifications/`, 'POST', 'Send Due Emails')}>▶ Send Due</button>
          <button style={btn(C.amberD)} onClick={() => action(`${API_BASE}/force-daily-run/`, 'POST', 'Force 9AM Run')}>⚡ Force 9AM</button>
          <button style={btn(C.blueD)} onClick={() => action(`${API_BASE}/test-smtp/`, 'POST', 'SMTP Test')}>✉ Test SMTP</button>
          <button style={btn(C.redD)} onClick={() => action(`${API_BASE}/retry-all-failed/`, 'POST', 'Retry All')}>⟳ Retry Failed</button>
        </div>
      </div>

      {/* ── Action feedback ── */}
      {actionMsg && (
        <Alert color={actionMsg.type === 'err' ? C.red : C.emerald} icon={actionMsg.type === 'err' ? '⚠' : 'ℹ'}>
          {actionMsg.text}
        </Alert>
      )}

      {/* ── Alert banners ── */}
      {(et.failed || 0) > 0 && (
        <Alert color={C.red} icon="⚠"
          action={<button style={btn(C.red, true)} onClick={() => toLog('failed_today')}>View →</button>}>
          <strong>{fmt(et.failed)} failure{et.failed !== 1 ? 's' : ''} today</strong> — check the Email Log tab.
        </Alert>
      )}
      {rbRate > 10 && (
        <Alert color={C.amber} icon="⚡">
          <strong>Retry bucket: {rbRate.toFixed(0)}% failure rate today</strong> — check SMTP or delivery errors.
        </Alert>
      )}

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: '14px', marginBottom: '24px' }}>
        <KpiCard label="Sent Today"         value={et.sent}                    accent={C.emerald}  onClick={() => toLog('sent_today')} />
        <KpiCard label="Failed Today"       value={et.failed}                  accent={et.failed > 0 ? C.red : C.dim} onClick={() => toLog('failed_today')}
          foot={et.sent + et.failed > 0 ? fmtPct(et.failed, et.sent + et.failed) + ' fail rate' : null} />
        <KpiCard label="In Queue"           value={ns.in_queue}                accent={C.amber}    onClick={() => setActiveTab('notif')} />
        <KpiCard label="9AM Reminders"      value={ab.sent_today}              accent={C.amber}    onClick={() => toLog('reminders_today')} />
        <KpiCard label="At Reminder Cap"    value={ab.users_at_max_reminders}  accent={C.dim} />
        <KpiCard label="Event Emails Today" value={eventToday}                 accent={C.purple}   onClick={() => toLog('event_today')} />
      </div>

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px', marginBottom: '24px' }}>
        <div style={card()}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: '16px' }}>
            30-Day Email Delivery
          </div>
          <DeliveryChart history={h30} />
        </div>
        <div style={card()}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: '16px' }}>
            Today by Type
          </div>
          <TypePieChart byType={et.by_type} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <TabBar
        tabs={[
          { key: 'log',    label: '📋 Email Log' },
          { key: 'notif',  label: '🔔 Notifications' },
          { key: 'bucket', label: '🪣 By Bucket' },
          { key: 'funnel', label: '📊 Funnel Live' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ══ Email Log Tab ══ */}
      {activeTab === 'log' && (
        <div style={card()}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
            <input style={{ ...input, flex: '1 1 160px' }} placeholder="Search email or subject…"
              value={logSearch} onChange={e => { setLS(e.target.value); setLP(1); }} />
            <select style={sel} value={logType} onChange={e => { setLType(e.target.value); setLP(1); }}>
              <option value="">All Types</option>
              <option value="abandonment">9AM Abandonment</option>
              <option value="notification">Event (notification)</option>
              <option value="credential">Credential</option>
              <option value="otp">OTP</option>
            </select>
            <select style={sel} value={logStatus} onChange={e => { setLSt(e.target.value); setLP(1); }}>
              <option value="">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
            <select style={sel} value={logBucket} onChange={e => { setLBucket(e.target.value); setLP(1); }}>
              <option value="">All Buckets</option>
              <option value="new_join">New Join</option>
              <option value="progress">Progress</option>
              <option value="assessment">Assessment</option>
              <option value="retry">Retry</option>
            </select>
            {cardFilter && (
              <button style={btn(C.redD, true)} onClick={() => { setCardF(''); setLP(1); }}>✕ Clear filter</button>
            )}
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <Th label="Type"   sortBy={logSort} sortDir={logDir} onSort={handleLogSort} />
                  <Th label="Bucket" sortBy={logSort} sortDir={logDir} onSort={handleLogSort} />
                  <Th label="Recipient" sortBy={logSort} sortDir={logDir} onSort={handleLogSort} />
                  <Th label="Subject" sortBy={logSort} sortDir={logDir} onSort={handleLogSort} />
                  <Th label="Status" sortBy={logSort} sortDir={logDir} onSort={handleLogSort} />
                  <Th field="created_at" label="Time" sortBy={logSort} sortDir={logDir} onSort={handleLogSort} />
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: C.muted }}>No logs found.</td></tr>
                ) : logs.map(l => (
                  <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                    <td style={{ padding: '11px 14px' }}><TypeBadge t={l.email_type} /></td>
                    <td style={{ padding: '11px 14px' }}><BucketBadge b={l.bucket} /></td>
                    <td style={{ padding: '11px 14px', color: C.muted, fontSize: '12px' }}>{l.recipient_email}</td>
                    <td style={{ padding: '11px 14px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }} title={l.subject}>{l.subject}</td>
                    <td style={{ padding: '11px 14px' }}><StatusBadge s={l.status} /></td>
                    <td style={{ padding: '11px 14px', color: C.muted, fontSize: '12px', whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={logPage} totalPages={Math.max(1, Math.ceil(logTotal / PAGE_SIZE))} total={logTotal} pageSize={PAGE_SIZE} onPage={setLP} />
        </div>
      )}

      {/* ══ Notifications Tab ══ */}
      {activeTab === 'notif' && (
        <div style={card()}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <input style={{ ...input, flex: '1 1 160px' }} placeholder="Search email or template…"
              value={notifSearch} onChange={e => { setNS(e.target.value); setNP(1); }} />
            <select style={sel} value={notifStatus} onChange={e => { setNSt(e.target.value); setNP(1); }}>
              <option value="">All Statuses</option>
              {['queued','sending','sent','failed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  {['Template','Recipient','Status','Scheduled','Sent At','Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: C.muted, fontWeight: 600,
                      fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notifs.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: C.muted }}>No notifications found.</td></tr>
                ) : notifs.map(n => (
                  <tr key={n.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                    <td style={{ padding: '11px 14px' }}><span style={badge(C.purple)}>{n.template_key}</span></td>
                    <td style={{ padding: '11px 14px', color: C.muted, fontSize: '12px' }}>{n.recipient_email}</td>
                    <td style={{ padding: '11px 14px' }}><StatusBadge s={n.status} /></td>
                    <td style={{ padding: '11px 14px', color: C.muted, fontSize: '12px' }}>{fmtDate(n.scheduled_for)}</td>
                    <td style={{ padding: '11px 14px', color: C.muted, fontSize: '12px' }}>{fmtDate(n.sent_at)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      {n.status === 'failed'  && <button style={btn(C.amberD, true)} onClick={() => action(`${API_BASE}/retry-notification/${n.id}/`, 'POST', 'Retry')}>↺ Retry</button>}
                      {n.status === 'queued'  && <button style={btn(C.redD, true)}   onClick={() => action(`${API_BASE}/cancel-notification/${n.id}/`, 'POST', 'Cancel')}>✕ Cancel</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={notifPage} totalPages={Math.max(1, Math.ceil(notifTotal / PAGE_SIZE))} total={notifTotal} pageSize={PAGE_SIZE} onPage={setNP} />
        </div>
      )}

      {/* ══ By Bucket Tab ══ */}
      {activeTab === 'bucket' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          <div style={card()}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: '16px' }}>
              Today's 9AM Sends by Bucket
            </div>
            <BucketChart byBucket={ab.by_bucket} />
          </div>
          <div style={card()}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: '14px' }}>
              Bucket Audit — Click row to filter Email Log
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr>
                {['Bucket','Sent','Failed','Fail %'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.muted, fontWeight: 600,
                    fontSize: '11px', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {['new_join','progress','assessment','retry'].map(b => {
                  const d = ab.by_bucket?.[b] || { sent: 0, failed: 0 };
                  const total = d.sent + d.failed;
                  const rate  = total > 0 ? (d.failed / total * 100).toFixed(1) : null;
                  const high  = rate && Number(rate) > 10;
                  return (
                    <tr key={b} style={{ cursor: 'pointer', borderBottom: `1px solid ${C.border}20` }}
                      onClick={() => toBucket(b)}>
                      <td style={{ padding: '10px 12px' }}><BucketBadge b={b} /></td>
                      <td style={{ padding: '10px 12px', color: C.emerald, fontWeight: 700 }}>{fmt(d.sent)}</td>
                      <td style={{ padding: '10px 12px', color: d.failed > 0 ? C.red : C.muted, fontWeight: d.failed > 0 ? 700 : 400 }}>{fmt(d.failed)}</td>
                      <td style={{ padding: '10px 12px', color: high ? C.red : C.muted, fontWeight: high ? 700 : 400 }}>
                        {rate ? `${rate}%` : '—'}{high ? ' ⚠' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ Funnel Live Tab ══ */}
      {activeTab === 'funnel' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px' }}>
          <div style={card()}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: '16px' }}>
              Users by Onboarding Stage
            </div>
            <FunnelChart funnel={fnl} />
          </div>
          <div style={card()}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.muted, marginBottom: '14px' }}>
              Stage → Email Policy
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr>
                {['Stage','Users','Policy'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.muted, fontWeight: 600,
                    fontSize: '11px', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {STATUS_ORDER.map(s => (
                  <tr key={s} style={{ borderBottom: `1px solid ${C.border}20` }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600, fontSize: '12px' }}>{s}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 800, fontSize: '15px' }}>{fmt(fnl[s] || 0)}</td>
                    <td style={{ padding: '9px 12px' }}>
                      {ELIGIBLE_SET.has(s) ? <span style={badge(C.emerald)}>9AM reminder</span>
                        : s === 'Credentials Sent' ? <span style={badge(C.emeraldD)}>✓ Graduated</span>
                        : <span style={badge(C.red)}>No email</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
