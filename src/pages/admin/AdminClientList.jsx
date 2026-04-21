import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { readResponsePayload } from '../../utils/http'; 
import AdminDateRangePicker from './AdminDateRangePicker';
const PAGE_SIZE = 50;

const JOINED_DATE_OPTIONS = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'last_7_days', label: 'This Week' },
    { value: 'last_30_days', label: 'This Month' },
    { value: 'last_90_days', label: 'Last 3 Months' },
];

const ACTIVE_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
];

const ONBOARDED_OPTIONS = [
    { value: 'all', label: 'All Onboarding' },
    { value: 'true', label: 'Onboarded' },
    { value: 'false', label: 'Not Onboarded' },
];

const AdminClientList = ({ isLight, viewportWidth, token, themeVars }) => {
    const navigate = useNavigate();
    const isMobile = viewportWidth <= 768;
    const isNarrowMobile = viewportWidth <= 430;

    const [clients, setClients] = useState([]);
    const [stats, setStats] = useState({ total: 0, onboarded: 0, active: 0, with_orders: 0, inactive: 0 });
    const [search, setSearch] = useState('');
    const [isActiveFilter, setIsActiveFilter] = useState('all');
    const [isOnboardedFilter, setIsOnboardedFilter] = useState('all');
    const [joinedDateFilter, setJoinedDateFilter] = useState('all');
    const [hasOrdersFilter, setHasOrdersFilter] = useState('all');
    const [cardFilter, setCardFilter] = useState('total');
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);

    const searchRef = useRef('');
    const hasInitializedSearchEffect = useRef(false);

    const summaryCards = [
        {
            filterKey: 'total',
            label: 'Total Clients',
            value: stats.total || 0,
            accent: isLight ? '#64748B' : '#94A3B8',
            border: isLight ? 'rgba(100,116,139,0.30)' : 'rgba(148,163,184,0.35)',
            background: isLight 
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.98) 100%)' 
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(24,35,56,0.95) 100%)',
        },
        {
            filterKey: 'onboarded',
            label: 'Onboarded',
            value: stats.onboarded || 0,
            accent: isLight ? '#059669' : '#34D399',
            border: isLight ? 'rgba(5,150,105,0.30)' : 'rgba(16,185,129,0.30)',
            background: isLight 
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(236,253,245,0.98) 100%)' 
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(12,44,42,0.92) 100%)',
        },
        {
            filterKey: 'active',
            label: 'Active',
            value: stats.active || 0,
            accent: isLight ? '#2563EB' : '#60A5FA',
            border: isLight ? 'rgba(37,99,235,0.30)' : 'rgba(96,165,250,0.30)',
            background: isLight 
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(239,246,255,0.98) 100%)' 
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(18,35,73,0.92) 100%)',
        },
        {
            filterKey: 'with_orders',
            label: 'Paying Clients',
            value: stats.with_orders || 0,
            accent: isLight ? '#D97706' : '#FBBF24',
            border: isLight ? 'rgba(217,119,6,0.32)' : 'rgba(251,191,36,0.32)',
            background: isLight 
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,247,237,0.98) 100%)' 
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(54,39,16,0.92) 100%)',
        },
        {
            filterKey: 'inactive',
            label: 'Inactive',
            value: stats.inactive || 0,
            accent: isLight ? '#DC2626' : '#FB7185',
            border: isLight ? 'rgba(220,38,38,0.30)' : 'rgba(251,113,133,0.30)',
            background: isLight 
                ? 'linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,241,242,0.98) 100%)' 
                : 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(41,22,36,0.92) 100%)',
        },
    ];

    const fetchClients = useCallback(async (
        pg = 1,
        currentSearch = search,
        cIsActive = isActiveFilter,
        cIsOnboarded = isOnboardedFilter,
        cJoinedRange = joinedDateFilter,
        cHasOrders = hasOrdersFilter,
        cCardFilter = cardFilter,
    ) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ page: String(pg), page_size: String(PAGE_SIZE) });
            if (currentSearch.trim()) params.set('search', currentSearch.trim());
            if (cIsActive !== 'all') params.set('is_active', cIsActive);
            if (cIsOnboarded !== 'all') params.set('is_onboarded', cIsOnboarded);
            if (cJoinedRange !== 'all') params.set('joined_range', cJoinedRange);
            if (cHasOrders !== 'all') params.set('has_orders', cHasOrders);
            if (cCardFilter && cCardFilter !== 'total') params.set('card_filter', cCardFilter);

            const res = await fetch(apiUrl(`/admin-panel/clients/?${params}`), {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('admin_token');
                navigate(adminUrl());
                return;
            }
            
            const data = await res.json();
            setClients(data.clients || []);
            setStats(data.stats || { total: 0, onboarded: 0, active: 0, with_orders: 0, inactive: 0 });
            setTotalPages(data.total_pages || 1);
            setTotalCount(data.total || 0);
            setPage(pg);
        } catch {
            setError('Failed to load clients');
        } finally {
            setLoading(false);
        }
    }, [navigate, search, isActiveFilter, isOnboardedFilter, joinedDateFilter, hasOrdersFilter, cardFilter, token]);

    // Search effect
    useEffect(() => {
        if (!hasInitializedSearchEffect.current) {
            hasInitializedSearchEffect.current = true;
            return undefined;
        }
        searchRef.current = search;
        const timer = setTimeout(() => {
            if (searchRef.current === search) fetchClients(1);
        }, 350);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Filter effect
    useEffect(() => {
        if (!token && !import.meta.env.DEV) return;
        fetchClients(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActiveFilter, isOnboardedFilter, joinedDateFilter, hasOrdersFilter, cardFilter, token]);

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.set('search', search.trim());
            if (isActiveFilter !== 'all') params.set('is_active', isActiveFilter);
            if (isOnboardedFilter !== 'all') params.set('is_onboarded', isOnboardedFilter);
            if (joinedDateFilter !== 'all') params.set('joined_range', joinedDateFilter);
            if (hasOrdersFilter !== 'all') params.set('has_orders', hasOrdersFilter);
            if (cardFilter && cardFilter !== 'total') params.set('card_filter', cardFilter);
            
            const res = await fetch(apiUrl(`/admin-panel/clients/export/?${params}`), {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('admin_token');
                navigate(adminUrl());
                return;
            }
            if (!res.ok) {
                const payload = await readResponsePayload(res);
                return alert(payload.error || payload.detail || 'Export failed');
            }
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const contentDisposition = res.headers.get('content-disposition') || '';
            const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
            const serverFilename = filenameMatch ? decodeURIComponent(filenameMatch[1].replace(/"/g, '')) : '';
            a.download = serverFilename || `clients_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.setTimeout(() => window.URL.revokeObjectURL(url), 1200);
            document.body.removeChild(a);
        } catch {
            alert('Failed to export clients');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div style={{ ...themeVars }}>
            {/* Header / Actions specific to client list like Export */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button 
                    className="tp-btn" 
                    onClick={handleExportExcel} 
                    disabled={exporting || loading} 
                    style={{ 
                        padding: isMobile ? '7px 10px' : '8px 14px', borderRadius: 8, fontSize: isMobile ? 11 : 12, fontWeight: 700, 
                        background: exporting ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.15)', 
                        color: exporting ? 'var(--admin-text-muted)' : '#34d399', border: '1px solid rgba(16,185,129,0.25)', 
                        cursor: exporting || loading ? 'not-allowed' : 'pointer' 
                    }}>
                    {exporting ? 'Exporting...' : 'Export Excel'}
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isNarrowMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(210px, 1fr))', gap: isMobile ? 10 : 14, marginBottom: isMobile ? 14 : 22 }}>
                {summaryCards.map((card) => (
                    <button
                        type="button"
                        key={card.label}
                        onClick={() => {
                            setCardFilter(card.filterKey);
                            setIsActiveFilter('all');
                            setIsOnboardedFilter('all');
                            setHasOrdersFilter('all');
                        }}
                        style={{
                            minHeight: isMobile ? 90 : 108,
                            borderRadius: 18,
                            border: `1px solid ${cardFilter === card.filterKey ? card.accent : card.border}`,
                            background: card.background,
                            boxShadow: isLight
                                ? '0 18px 36px rgba(148,163,184,0.12), inset 0 1px 0 rgba(255,255,255,0.9)'
                                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                            padding: isMobile ? '12px 12px 10px' : '18px 18px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            width: '100%',
                            textAlign: 'left',
                            cursor: 'pointer',
                            outline: 'none',
                            transform: cardFilter === card.filterKey ? 'translateY(-1px)' : 'none',
                            transition: 'border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: isLight ? '#64748b' : '#6f89b4' }}>
                                {card.label}
                            </span>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: card.accent, boxShadow: `0 0 0 8px ${card.accent}1c`, flexShrink: 0 }} />
                        </div>
                        <div style={{ fontSize: isMobile ? 24 : 32, lineHeight: 1, fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', letterSpacing: '-0.03em' }}>
                            {card.value}
                        </div>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div style={{ marginBottom: isMobile ? 12 : 18 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
                    <input 
                        value={search} 
                        placeholder="Search clients..." 
                        onChange={(e) => setSearch(e.target.value)} 
                        style={{ flex: isMobile ? '0 0 auto' : '1 1 320px', width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? 'none' : 520, padding: '11px 16px', borderRadius: 12, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', boxShadow: isLight ? '0 10px 20px rgba(148,163,184,0.08)' : 'none', color: 'var(--admin-text-strong)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} 
                    />
                    
                    <select value={isActiveFilter} onChange={(e) => setIsActiveFilter(e.target.value)} style={{ width: isMobile ? '100%' : 'auto', padding: '10px 12px', borderRadius: 12, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', color: 'var(--admin-text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                        {ACTIVE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    
                    <select value={isOnboardedFilter} onChange={(e) => setIsOnboardedFilter(e.target.value)} style={{ width: isMobile ? '100%' : 'auto', padding: '10px 12px', borderRadius: 12, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', color: 'var(--admin-text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                        {ONBOARDED_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    
                    <div style={{ width: isMobile ? '100%' : '200px' }}>
                        <AdminDateRangePicker value={joinedDateFilter} onChange={setJoinedDateFilter} isLight={isLight} />
                    </div>

                    <select value={hasOrdersFilter} onChange={(e) => setHasOrdersFilter(e.target.value)} style={{ width: isMobile ? '100%' : 'auto', padding: '10px 12px', borderRadius: 12, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', color: 'var(--admin-text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                        <option value="all">All Orders</option>
                        <option value="true">Has Orders</option>
                        <option value="false">No Orders</option>
                    </select>

                    {(search || isActiveFilter !== 'all' || isOnboardedFilter !== 'all' || joinedDateFilter !== 'all' || hasOrdersFilter !== 'all' || cardFilter !== 'total') && (
                        <button 
                            className="tp-btn" 
                            onClick={() => { setSearch(''); setIsActiveFilter('all'); setIsOnboardedFilter('all'); setJoinedDateFilter('all'); setHasOrdersFilter('all'); setCardFilter('total'); }} 
                            style={{ width: isMobile ? '100%' : 'auto', padding: '10px 12px', borderRadius: 12, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {loading && <div style={{ textAlign: 'center', padding: 60, color: 'var(--admin-text-muted)' }}>Loading clients...</div>}
            {error && <div style={{ textAlign: 'center', padding: 40, color: '#f87171' }}>{error}</div>}

            {/* Table / List */}
            {!loading && !error && (
                <div style={{ background: 'var(--admin-surface-strong)', borderRadius: 18, border: '1px solid var(--admin-border-soft)', boxShadow: isLight ? '0 18px 40px rgba(148,163,184,0.12)' : 'none', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900, tableLayout: 'fixed' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, width: 220 }}>Name</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, width: 240 }}>Contact</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, width: 140 }}>PAN/GSTIN</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, width: 120 }}>Status</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, width: 100 }}>Orders</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, width: 120 }}>Spent (₹)</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, width: 120 }}>Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map((c, i) => (
                                    <tr key={c.id} onClick={() => window.open(`/Clients/${c.id}`, '_blank')} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)', cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)' }}>
                                        <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 800, color: 'var(--admin-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/Clients/${c.id}`); }} 
                                                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', outline: 'none', display: 'block' }}
                                            >
                                                <div style={{ fontSize: 14, fontWeight: 800, color: '#3b82f6' }}>{c.first_name || c.last_name ? `${c.first_name || ''} ${c.last_name || ''}` : '-'}</div>
                                            </button>
                                        </td>
                                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email || '-'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>{c.phone_number || '-'}</div>
                                        </td>
                                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)' }}>{c.pan_number || '-'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>{c.gstin || '-'}</div>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                                                {c.is_active ? 
                                                    <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>Active</span> : 
                                                    <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>Inactive</span>
                                                }
                                                {c.is_onboarded ? 
                                                    <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>Onboarded</span> : 
                                                    <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border-mid)', color: 'var(--admin-text-secondary)' }}>Not Onboarded</span>
                                                }
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--admin-text-secondary)', fontWeight: 700 }}>
                                            {c.order_count || 0}
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--admin-text-secondary)', fontWeight: 700 }}>
                                            {c.total_spent ? `₹${Number(c.total_spent).toLocaleString()}` : '-'}
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                                            {c.date_joined ? new Date(c.date_joined).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {clients.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: 14 }}>No clients match your current filters.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                
                    {/* Pagination */}
                    <div style={{ padding: isMobile ? '12px' : '10px 16px', borderTop: '1px solid rgba(148,163,184,0.08)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', color: 'var(--admin-text-muted)', fontSize: 12, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ textAlign: isMobile ? 'center' : 'left' }}>Page <span style={{ color: 'var(--admin-text-primary)', fontWeight: 800 }}>{page}</span> of <span style={{ color: 'var(--admin-text-primary)', fontWeight: 800 }}>{totalPages}</span> • {totalCount} result{totalCount !== 1 ? 's' : ''}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                            <button onClick={() => fetchClients(1)} disabled={page <= 1 || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page <= 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>{'<<'}</button>
                            <button onClick={() => fetchClients(page - 1)} disabled={page <= 1 || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page <= 1 ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>{'< Prev'}</button>
                            <button onClick={() => fetchClients(page + 1)} disabled={page >= totalPages || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page >= totalPages ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>{'Next >'}</button>
                            <button onClick={() => fetchClients(totalPages)} disabled={page >= totalPages || loading} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'var(--admin-tab-idle)', color: page >= totalPages ? 'var(--admin-text-muted)' : 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>{'>>'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminClientList;
