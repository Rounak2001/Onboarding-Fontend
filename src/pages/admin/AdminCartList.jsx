import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { Phone } from 'lucide-react';

const AdminCartList = ({ isLight, viewportWidth, token, themeVars }) => {
    const navigate = useNavigate();
    const isMobile = viewportWidth <= 768;

    const [carts, setCarts] = useState([]);
    const [stats, setStats] = useState({ total_carts: 0, active_carts: 0, abandoned_value: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchCarts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(apiUrl('/admin-panel/global-carts/'), {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            
            if (res.status === 401 || res.status === 403) {
                navigate(adminUrl());
                return;
            }
            
            if (res.ok) {
                const data = await res.json();
                setCarts(data.carts || []);
                setStats(data.stats || { total_carts: 0, active_carts: 0, abandoned_value: 0 });
            } else {
                // Fallback empty state
                setCarts([]);
                setStats({ total_carts: 0, active_carts: 0, abandoned_value: 0 });
            }
        } catch {
            setError('Failed to load carts');
        } finally {
            setLoading(false);
        }
    }, [token, navigate]);

    useEffect(() => {
        if (!token) return;
        fetchCarts();
    }, [fetchCarts, token]);

    const summaryCards = [
        { key: 'total', label: 'Total Carts', value: stats.total_carts, color: isLight ? '#64748b' : '#94a3b8', isCurrency: false },
        { key: 'active', label: 'Active Carts', value: stats.active_carts, color: '#3b82f6', isCurrency: false },
        { key: 'value', label: 'Abandoned Value', value: stats.abandoned_value, color: '#ef4444', isCurrency: true },
    ];

    return (
        <div style={{ ...themeVars }}>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
                {summaryCards.map(card => (
                    <div
                        key={card.key}
                        style={{
                            padding: 20, borderRadius: 16, textAlign: 'left',
                            background: 'var(--admin-surface-strong)',
                            border: `1px solid var(--admin-border-soft)`,
                        }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>{card.label}</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--admin-text-primary)', marginTop: 8 }}>
                            {card.isCurrency ? `₹${Number(card.value).toLocaleString()}` : card.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ background: 'var(--admin-surface-strong)', borderRadius: 18, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Client Name</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Phone Number</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Items in Cart</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Cart Value</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Last Updated</th>
                                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading...</td></tr>
                            ) : carts.length > 0 ? (
                                carts.map((c, i) => (
                                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)', background: i % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)' }}>
                                        <td style={{ padding: '14px 16px', fontSize: 13 }}>
                                            <button 
                                                onClick={() => window.open(`/Clients/${c.client_id}`, '_blank')}
                                                style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 800, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 'inherit' }}
                                            >
                                                {c.client_name || '-'}
                                            </button>
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--admin-text-secondary)', fontWeight: 600 }}>{c.phone_number || '-'}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--admin-text-secondary)' }}>{c.items_count || 0} items</td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--admin-text-primary)', fontWeight: 800 }}>₹{Number(c.cart_value || 0).toLocaleString()}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--admin-text-muted)' }}>{c.updated_at ? new Date(c.updated_at).toLocaleString() : '-'}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                            {c.phone_number && (
                                                <a
                                                    href={`tel:${c.phone_number}`}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}
                                                >
                                                    <Phone size={14} /> Call Client
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No abandoned carts found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminCartList;
