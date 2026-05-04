import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';

const AdminServiceList = ({ isLight, viewportWidth, token, themeVars }) => {
    const navigate = useNavigate();
    const isMobile = viewportWidth <= 768;

    const [services, setServices] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, active, pending, completed

    const fetchServices = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('status', filter);

            const res = await fetch(apiUrl(`/admin-panel/global-services/?${params}`), {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            
            if (res.status === 401 || res.status === 403) {
                navigate(adminUrl());
                return;
            }
            
            if (res.ok) {
                const data = await res.json();
                setServices(data.services || []);
                setStats(data.stats || { total: 0, active: 0, pending: 0, completed: 0 });
            } else {
                // Fallback empty state
                setServices([]);
                setStats({ total: 0, active: 0, pending: 0, completed: 0 });
            }
        } catch {
            setError('Failed to load services');
        } finally {
            setLoading(false);
        }
    }, [filter, token, navigate]);

    useEffect(() => {
        if (!token) return;
        fetchServices();
    }, [fetchServices, token]);

    const summaryCards = [
        { key: 'all', label: 'Total Services', value: stats.total, color: isLight ? '#64748b' : '#94a3b8' },
        { key: 'active', label: 'Active', value: stats.active, color: '#3b82f6' },
        { key: 'pending', label: 'Pending', value: stats.pending, color: '#f59e0b' },
        { key: 'completed', label: 'Completed', value: stats.completed, color: '#10b981' },
    ];

    return (
        <div style={{ ...themeVars }}>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
                {summaryCards.map(card => (
                    <button
                        key={card.key}
                        onClick={() => setFilter(card.key)}
                        style={{
                            padding: 20, borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                            background: 'var(--admin-surface-strong)',
                            border: `1px solid ${filter === card.key ? card.color : 'var(--admin-border-soft)'}`,
                            boxShadow: filter === card.key ? `0 0 0 1px ${card.color}` : 'none',
                        }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>{card.label}</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--admin-text-primary)', marginTop: 8 }}>{card.value}</div>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div style={{ background: 'var(--admin-surface-strong)', borderRadius: 18, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--admin-border-soft)' }}>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Service ID</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Service Name</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Client</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Consultant</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading...</td></tr>
                            ) : services.length > 0 ? (
                                services.map((s, i) => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)', background: i % 2 === 0 ? 'transparent' : 'var(--admin-row-alt)' }}>
                                        <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 800 }}>
                                            <button 
                                                onClick={() => window.open(`/Clients/${s.client_id}#service_requests`, '_blank')}
                                                style={{ background: 'none', border: 'none', color: 'var(--admin-text-primary)', fontWeight: 800, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 'inherit' }}
                                            >
                                                {s.service_id}
                                            </button>
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--admin-text-secondary)' }}>{s.name}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 13 }}>
                                            <button 
                                                onClick={() => window.open(`/Clients/${s.client_id}`, '_blank')}
                                                style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 'inherit' }}
                                            >
                                                {s.client_name || '-'}
                                            </button>
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: 13 }}>
                                            {s.consultant_name && s.consultant_name !== '-' ? (
                                                <button 
                                                    onClick={() => window.open(`/Consultants/${s.consultant_id}`, '_blank')}
                                                    style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 'inherit' }}
                                                >
                                                    {s.consultant_name}
                                                </button>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ 
                                                padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                                background: s.status === 'completed' ? 'rgba(16,185,129,0.1)' : s.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                                                color: s.status === 'completed' ? '#10b981' : s.status === 'pending' ? '#f59e0b' : '#3b82f6'
                                            }}>{s.status}</span>
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--admin-text-muted)' }}>{s.updated_at ? new Date(s.updated_at).toLocaleDateString() : '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No services found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminServiceList;
