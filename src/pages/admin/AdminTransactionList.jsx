import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { Receipt, TrendingUp, Users, Activity, RefreshCw } from 'lucide-react';

const AdminTransactionList = ({ isLight, viewportWidth, token, themeVars, initialFilter = 'all' }) => {
    const navigate = useNavigate();
    const isMobile = viewportWidth <= 768;

    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({ 
        total_count: 0, 
        total_revenue: 0, 
        total_payouts: 0, 
        pending_settlements: 0,
        total_paid_to_consultants: 0, 
        pending_amount: 0 
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState(initialFilter); // all, revenue, payouts, settlements

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('status', filter);

            const res = await fetch(apiUrl(`/admin-panel/global-transactions/?${params}`), {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            
            if (res.status === 401 || res.status === 403) {
                navigate(adminUrl());
                return;
            }
            
            if (res.ok) {
                const data = await res.json();
                setTransactions(data.transactions || []);
                setStats(data.stats || { total_count: 0, total_revenue: 0, total_paid_to_consultants: 0, pending_amount: 0 });
            } else {
                setTransactions([]);
                setStats({ total_count: 0, total_revenue: 0, total_paid_to_consultants: 0, pending_amount: 0 });
            }
        } catch {
            setError('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [filter, token, navigate]);

    useEffect(() => {
        if (!token) return;
        fetchTransactions();
    }, [fetchTransactions, token]);

    useEffect(() => {
        if (initialFilter) {
            setFilter(initialFilter);
        }
    }, [initialFilter]);

    const summaryCards = [
        { 
            key: 'all', 
            label: 'Total Transactions', 
            value: stats.total_count, 
            color: '#3b82f6', 
            icon: Receipt,
            sub: 'Platform wide orders'
        },
        { 
            key: 'revenue', 
            label: 'Client Revenue', 
            value: `₹${Number(stats.total_revenue || 0).toLocaleString()}`, 
            color: '#10b981', 
            icon: TrendingUp,
            sub: 'Gross client payments'
        },
        { 
            key: 'payouts', 
            label: 'Consultant Payouts', 
            value: `₹${Number(stats.total_paid_to_consultants || stats.total_payouts || 0).toLocaleString()}`, 
            color: '#8b5cf6', 
            icon: Users,
            sub: 'Net earnings disbursed'
        },
        { 
            key: 'settlements', 
            label: 'Pending Settlements', 
            value: `₹${Number(stats.pending_amount || stats.pending_settlements || 0).toLocaleString()}`, 
            color: '#f59e0b', 
            icon: Activity,
            sub: 'Awaiting completion'
        },
    ];

    return (
        <div style={{ ...themeVars, padding: isMobile ? '0' : '24px' }}>
            {/* Premium Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>
                {summaryCards.map(card => (
                    <div 
                        key={card.key}
                        onClick={() => setFilter(card.key)}
                        style={{ 
                            padding: 24, 
                            background: 'var(--admin-surface)', 
                            borderRadius: 24, 
                            border: `1px solid ${filter === card.key ? card.color : 'var(--admin-border-soft)'}`, 
                            boxShadow: filter === card.key ? `0 10px 25px -5px ${card.color}25` : '0 10px 30px rgba(0,0,0,0.02)', 
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseOver={(e) => {
                            if (filter !== card.key) {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.borderColor = `${card.color}50`;
                            }
                        }}
                        onMouseOut={(e) => {
                            if (filter !== card.key) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'var(--admin-border-soft)';
                            }
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${card.color}12`, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${card.color}25` }}>
                                <card.icon size={22} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--admin-text-primary)', marginBottom: 6 }}>{card.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Activity size={12} /> {card.sub}
                        </div>
                        {filter === card.key && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: card.color }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Table Area */}
            <div style={{ background: 'var(--admin-surface)', borderRadius: 24, border: '1px solid var(--admin-border-soft)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--admin-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                        {filter === 'all' ? 'All Transactions' : 
                         filter === 'revenue' ? 'Revenue Streams' :
                         filter === 'payouts' ? 'Consultant Payouts' : 'Settlement Queue'}
                    </h3>
                    {filter !== 'all' && (
                        <button 
                            onClick={() => setFilter('all')}
                            style={{ background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--admin-text-secondary)' }}
                        >Clear Filter</button>
                    )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                        <thead style={{ background: 'var(--admin-row-alt)' }}>
                            <tr>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Transaction</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Client</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Consultant</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Revenue</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Payout</th>
                                <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                                    <RefreshCw className="spin" size={24} style={{ marginBottom: 12, opacity: 0.5 }} />
                                    <div style={{ fontWeight: 600 }}>Loading transactions...</div>
                                </td></tr>
                            ) : transactions.length > 0 ? (
                                transactions.map((t, i) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid var(--admin-border-soft)', background: i % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '18px 24px', fontSize: 13, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <span>{t.transaction_id || `TRX-${t.id}`}</span>
                                                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--admin-text-muted)' }}>ID: #{t.id}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '18px 24px', fontSize: 13 }}>
                                            <button 
                                                onClick={() => window.open(`/Clients/${t.client_id}`, '_blank')}
                                                style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'none', fontSize: 'inherit' }}
                                                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                                            >
                                                {t.client_name || '-'}
                                            </button>
                                        </td>
                                        <td style={{ padding: '18px 24px', fontSize: 13 }}>
                                            {t.consultant_name && t.consultant_name !== '-' ? (
                                                <button 
                                                    onClick={() => window.open(`/Consultants/${t.consultant_id}`, '_blank')}
                                                    style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'none', fontSize: 'inherit' }}
                                                    onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                    onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                                                >
                                                    {t.consultant_name}
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--admin-text-muted)', fontSize: 12, fontStyle: 'italic' }}>Unassigned</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '18px 24px', fontSize: 14, color: 'var(--admin-text-primary)', fontWeight: 900, textAlign: 'right' }}>₹{Number(t.client_amount || 0).toLocaleString()}</td>
                                        <td style={{ padding: '18px 24px', fontSize: 14, color: '#8b5cf6', fontWeight: 900, textAlign: 'right' }}>₹{Number(t.consultant_amount || 0).toLocaleString()}</td>
                                        <td style={{ padding: '18px 24px', textAlign: 'center' }}>
                                            <span style={{ 
                                                padding: '6px 14px', borderRadius: 10, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em',
                                                background: t.status === 'paid' ? 'rgba(16,185,129,0.12)' : t.status === 'pending' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                                                color: t.status === 'paid' ? '#10b981' : t.status === 'pending' ? '#f59e0b' : '#ef4444',
                                                border: `1px solid ${t.status === 'paid' ? 'rgba(16,185,129,0.1)' : t.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'}`
                                            }}>{t.status || 'Pending'}</span>
                                        </td>
                                        <td style={{ padding: '18px 24px', fontSize: 12, color: 'var(--admin-text-muted)', textAlign: 'right', fontWeight: 700 }}>
                                            {t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={7} style={{ padding: 80, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                                    <div style={{ fontSize: 40, marginBottom: 16 }}>📂</div>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>No transactions found.</div>
                                    <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filters or search criteria.</div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminTransactionList;
