import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import AdminThemeToggle from './AdminThemeToggle';
import AdminBrandLogo from './AdminBrandLogo';
import { useAdminTheme } from './adminTheme';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
    LayoutDashboard, MessageSquare, Bot, Globe, Users, TrendingUp,
    RefreshCw, Search, Filter, ChevronLeft, ChevronRight, AlertCircle,
    Zap, UserSquare, Activity,
} from 'lucide-react';

const RANGE_OPTIONS = [
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 90 days' },
];

const TOOL_LABELS = {
    model: 'AI Model',
    google_search: 'Web Search',
    file_search: 'Tax RAG',
    google_search_fallback: 'Web Search (fallback)',
    file_search_fallback: 'Tax RAG (fallback)',
    none: 'Direct',
    '': 'AI Model',
};

const TOOL_COLORS = {
    model: '#2dd4bf',
    google_search: '#60a5fa',
    file_search: '#a78bfa',
    google_search_fallback: '#38bdf8',
    file_search_fallback: '#818cf8',
    none: '#94a3b8',
    '': '#2dd4bf',
};

const PIE_COLORS = ['#2dd4bf', '#60a5fa', '#a78bfa', '#f59e0b', '#f87171', '#34d399'];

function StatCard({ label, value, sub, icon: Icon, color = '#2dd4bf', isLight, themeVars }) {
    return (
        <div style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border-mid)',
            borderRadius: 14,
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
        }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <Icon size={18} style={{ color }} />
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--admin-text-strong)', lineHeight: 1.1 }}>{value ?? '—'}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--admin-text-secondary)', marginTop: 3 }}>{label}</div>
                {sub && <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>{sub}</div>}
            </div>
        </div>
    );
}

function QueryList({ queries, label, emptyText, isLight }) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const PAGE = 25;

    const filtered = useMemo(() => {
        if (!search.trim()) return queries;
        const q = search.toLowerCase();
        return queries.filter(r => r.text.toLowerCase().includes(q));
    }, [queries, search]);

    const totalPages = Math.ceil(filtered.length / PAGE);
    const slice = filtered.slice(page * PAGE, page * PAGE + PAGE);

    const formatTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border-mid)',
            borderRadius: 14,
            overflow: 'hidden',
        }}>
            <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--admin-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--admin-text-strong)' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--admin-surface-soft)', border: '1px solid var(--admin-border-mid)', borderRadius: 8, padding: '6px 10px', minWidth: 180 }}>
                    <Search size={13} style={{ color: 'var(--admin-text-muted)', flexShrink: 0 }} />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        placeholder="Filter queries…"
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--admin-text-primary)', width: '100%' }}
                    />
                </div>
            </div>

            {slice.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>
                    {search ? 'No matching queries.' : emptyText}
                </div>
            ) : (
                <div>
                    {slice.map((row, i) => (
                        <div key={i} style={{
                            padding: '11px 18px',
                            borderBottom: i < slice.length - 1 ? '1px solid var(--admin-border-soft)' : 'none',
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            background: i % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)',
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: 'var(--admin-text-primary)', lineHeight: 1.45, wordBreak: 'break-word' }}>{row.text}</div>
                                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <span style={{
                                        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                                        background: `${TOOL_COLORS[row.tool] || '#2dd4bf'}18`,
                                        color: TOOL_COLORS[row.tool] || '#2dd4bf',
                                        border: `1px solid ${TOOL_COLORS[row.tool] || '#2dd4bf'}30`,
                                    }}>
                                        {TOOL_LABELS[row.tool] || row.tool || 'AI Model'}
                                    </span>
                                    {row.escalated && (
                                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>
                                            Escalated
                                        </span>
                                    )}
                                    <span style={{ fontSize: 10, color: 'var(--admin-text-muted)' }}>{formatTime(row.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div style={{ padding: '10px 18px', borderTop: '1px solid var(--admin-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                        {filtered.length} queries · page {page + 1} of {totalPages}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--admin-border-mid)', background: 'transparent', color: 'var(--admin-text-secondary)', fontSize: 12, cursor: 'pointer', opacity: page === 0 ? 0.4 : 1 }}>
                            <ChevronLeft size={13} />
                        </button>
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--admin-border-mid)', background: 'transparent', color: 'var(--admin-text-secondary)', fontSize: 12, cursor: 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                            <ChevronRight size={13} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function TopWordsCloud({ queries, isLight }) {
    const words = useMemo(() => {
        const STOP = new Set([
            'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'i', 'my', 'me', 'we', 'our', 'you', 'your',
            'it', 'its', 'this', 'that', 'these', 'those', 'what', 'how', 'when',
            'where', 'which', 'who', 'if', 'not', 'no', 'can', 'get', 'about', 'as',
        ]);
        const freq = {};
        queries.forEach(q => {
            q.text.toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length >= 3 && !STOP.has(w))
                .forEach(w => { freq[w] = (freq[w] || 0) + 1; });
        });
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 40)
            .map(([word, count]) => ({ word, count }));
    }, [queries]);

    if (!words.length) return (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>
            No query data yet — data accumulates as visitors chat.
        </div>
    );

    const max = words[0].count;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0' }}>
            {words.map(({ word, count }) => {
                const ratio = count / max;
                const size = Math.round(11 + ratio * 14);
                const alpha = Math.round(30 + ratio * 70);
                return (
                    <span key={word} title={`${count} time${count !== 1 ? 's' : ''}`} style={{
                        fontSize: size,
                        fontWeight: ratio > 0.5 ? 700 : ratio > 0.25 ? 600 : 500,
                        color: `rgba(45,212,191,${alpha / 100})`,
                        cursor: 'default',
                        padding: '2px 4px',
                        borderRadius: 4,
                        transition: 'color 0.15s',
                    }}>
                        {word}
                    </span>
                );
            })}
        </div>
    );
}

const ChatAnalytics = () => {
    const navigate = useNavigate();
    const { isLight, themeVars, toggleTheme } = useAdminTheme();
    const token = localStorage.getItem('admin_token');

    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('public');

    const fetchData = useCallback(async () => {
        if (!token) { navigate(adminUrl()); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(apiUrl(`/chat/analytics/?days=${days}`), {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401 || res.status === 403) { navigate(adminUrl()); return; }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json);
        } catch (e) {
            setError('Failed to load analytics. ' + e.message);
        } finally {
            setLoading(false);
        }
    }, [token, days, navigate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toolPieData = useMemo(() => {
        if (!data) return [];
        return Object.entries(data.tool_breakdown || {}).map(([tool, count]) => ({
            name: TOOL_LABELS[tool] || tool,
            value: count,
            color: TOOL_COLORS[tool] || '#94a3b8',
        }));
    }, [data]);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--admin-page-bg)', ...themeVars }}>
            {/* Header */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 40,
                background: 'var(--admin-header-bg)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                borderBottom: '1px solid var(--admin-border-soft)',
                padding: '0 20px',
                height: 58, display: 'flex', alignItems: 'center', gap: 16,
            }}>
                <AdminBrandLogo isLight={isLight} compact />
                <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                    <button onClick={() => navigate(adminUrl('dashboard'))}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--admin-text-secondary)', fontSize: 12, fontWeight: 600 }}>
                        <LayoutDashboard size={13} /> Dashboard
                    </button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 7, border: 'none', background: 'rgba(45,212,191,0.12)', cursor: 'default', color: '#2dd4bf', fontSize: 12, fontWeight: 700 }}>
                        <Bot size={13} /> Chat Analytics
                    </button>
                </nav>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={fetchData} disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--admin-border-mid)', background: 'var(--admin-surface)', cursor: 'pointer', color: 'var(--admin-text-secondary)', fontSize: 12, fontWeight: 600, opacity: loading ? 0.5 : 1 }}>
                        <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
                    </button>
                    <AdminThemeToggle isLight={isLight} onToggle={toggleTheme} />
                </div>
            </header>

            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px 60px' }}>
                {/* Title + range picker */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--admin-text-strong)', margin: 0 }}>Nirmala T.AI — Chat Analytics</h1>
                        <p style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                            What people are asking before and after they sign up.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--admin-surface-soft)', border: '1px solid var(--admin-border-mid)', borderRadius: 9, padding: 3 }}>
                        {RANGE_OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => setDays(opt.value)}
                                style={{
                                    padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                    background: days === opt.value ? 'rgba(45,212,191,0.15)' : 'transparent',
                                    color: days === opt.value ? '#2dd4bf' : 'var(--admin-text-secondary)',
                                    transition: 'all 0.15s',
                                }}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 13, marginBottom: 20 }}>
                        <AlertCircle size={15} /> {error}
                    </div>
                )}

                {loading && !data && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--admin-text-muted)', fontSize: 14 }}>
                        Loading analytics…
                    </div>
                )}

                {data && (
                    <>
                        {/* Summary cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
                            <StatCard label="Today (all)" value={data.summary.today} icon={Activity} color="#2dd4bf" isLight={isLight} themeVars={themeVars} />
                            <StatCard label={`Public queries (${days}d)`} value={data.summary.public_total} sub="Landing page visitors" icon={Globe} color="#60a5fa" isLight={isLight} themeVars={themeVars} />
                            <StatCard label={`Logged-in queries (${days}d)`} value={data.summary.auth_total} sub="Signed-up clients" icon={Users} color="#a78bfa" isLight={isLight} themeVars={themeVars} />
                            <StatCard label="Total queries" value={data.summary.total} icon={MessageSquare} color="#f59e0b" isLight={isLight} themeVars={themeVars} />
                            <StatCard
                                label="Escalation rate"
                                value={`${data.summary.escalation_rate_pct}%`}
                                sub={`${data.summary.escalated_sessions} of ${data.summary.total_sessions} sessions`}
                                icon={TrendingUp}
                                color="#fb923c"
                                isLight={isLight}
                                themeVars={themeVars}
                            />
                        </div>

                        {/* Volume chart */}
                        <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-mid)', borderRadius: 14, padding: '20px 20px 12px', marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--admin-text-strong)', marginBottom: 16 }}>Daily Query Volume</div>
                            {data.volume_by_day.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)', fontSize: 13 }}>No data yet for this period.</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={data.volume_by_day} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gradPublic" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="gradAuth" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border-soft)" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} tickLine={false} axisLine={false}
                                            tickFormatter={v => { const d = new Date(v); return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`; }} />
                                        <YAxis tick={{ fontSize: 10, fill: 'var(--admin-text-muted)' }} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ background: 'var(--admin-surface-elevated)', border: '1px solid var(--admin-border-mid)', borderRadius: 8, fontSize: 12 }}
                                            labelStyle={{ color: 'var(--admin-text-secondary)', marginBottom: 4 }}
                                            itemStyle={{ color: 'var(--admin-text-primary)' }} />
                                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                                        <Area type="monotone" dataKey="public" name="Public (landing page)" stroke="#60a5fa" strokeWidth={2} fill="url(#gradPublic)" dot={false} />
                                        <Area type="monotone" dataKey="auth" name="Logged-in clients" stroke="#2dd4bf" strokeWidth={2} fill="url(#gradAuth)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Tool breakdown + word cloud row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                            {/* Pie chart */}
                            <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-mid)', borderRadius: 14, padding: '18px 16px' }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--admin-text-strong)', marginBottom: 14 }}>
                                    How Nirmala Answered
                                </div>
                                {toolPieData.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--admin-text-muted)', fontSize: 13 }}>No data.</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={toolPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                                                dataKey="value" paddingAngle={3}>
                                                {toolPieData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ background: 'var(--admin-surface-elevated)', border: '1px solid var(--admin-border-mid)', borderRadius: 8, fontSize: 12 }} />
                                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} formatter={(value) => <span style={{ color: 'var(--admin-text-secondary)' }}>{value}</span>} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Word cloud for active tab */}
                            <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-mid)', borderRadius: 14, padding: '18px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--admin-text-strong)' }}>Top Query Words</div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {['public', 'auth'].map(t => (
                                            <button key={t} onClick={() => setActiveTab(t)}
                                                style={{
                                                    padding: '3px 10px', borderRadius: 6, border: '1px solid var(--admin-border-mid)',
                                                    background: activeTab === t ? 'rgba(45,212,191,0.15)' : 'transparent',
                                                    color: activeTab === t ? '#2dd4bf' : 'var(--admin-text-muted)',
                                                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                                }}>
                                                {t === 'public' ? 'Landing' : 'App'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <TopWordsCloud
                                    queries={activeTab === 'public' ? data.public_queries : data.auth_queries}
                                    isLight={isLight}
                                />
                            </div>
                        </div>

                        {/* Query lists */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <QueryList
                                queries={data.public_queries}
                                label={`Public Queries — Landing Page (${data.public_queries.length})`}
                                emptyText="No public query text recorded yet. Data will appear from now on."
                                isLight={isLight}
                            />
                            <QueryList
                                queries={data.auth_queries}
                                label={`Logged-in Client Queries (${data.auth_queries.length})`}
                                emptyText="No authenticated queries in this period."
                                isLight={isLight}
                            />
                        </div>
                    </>
                )}
            </main>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ChatAnalytics;
