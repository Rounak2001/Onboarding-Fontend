import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import { LifeBuoy, MessageSquare, Clock, CheckCircle2, AlertCircle, ChevronDown, Send, FileText, RefreshCw, Activity } from 'lucide-react';

const AdminSupportList = ({ isLight, viewportWidth, token, themeVars }) => {
    const navigate = useNavigate();
    const isMobile = viewportWidth <= 768;

    const [tickets, setTickets] = useState([]);
    const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, open, in_progress, resolved
    const [expandedTicketId, setExpandedTicketId] = useState(null);
    const [replyTexts, setReplyTexts] = useState({});
    const [sendingReply, setSendingReply] = useState({});
    const [actionLoading, setActionLoading] = useState(null);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('status', filter);

            const res = await fetch(apiUrl(`/admin-panel/global-tickets/?${params}`), {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            
            if (res.status === 401 || res.status === 403) {
                navigate(adminUrl());
                return;
            }
            
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets || []);
                setStats(data.stats || { total: 0, open: 0, in_progress: 0, resolved: 0 });
            } else {
                setTickets([]);
                setStats({ total: 0, open: 0, in_progress: 0, resolved: 0 });
            }
        } catch {
            setError('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    }, [filter, token, navigate]);

    useEffect(() => {
        if (!token) return;
        fetchTickets();
    }, [fetchTickets, token]);

    const handleResolve = async (ticketId) => {
        const resolution = prompt('Please enter a resolution note (optional):');
        if (resolution === null) return;

        setActionLoading(ticketId + 'resolve');
        try {
            const res = await fetch(apiUrl(`/admin-panel/tickets/${ticketId}/resolve/`), {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resolution })
            });
            if (res.ok) {
                fetchTickets();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Failed to resolve ticket');
            }
        } catch (err) {
            console.error('Resolve error:', err);
            alert('Failed to resolve ticket');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReply = async (ticketId) => {
        const text = replyTexts[ticketId] || '';
        if (!text.trim()) return;
        setSendingReply(prev => ({ ...prev, [ticketId]: true }));
        try {
            const res = await fetch(apiUrl(`/admin-panel/tickets/${ticketId}/reply/`), {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });
            if (res.ok) {
                setReplyTexts(prev => ({ ...prev, [ticketId]: '' }));
                fetchTickets();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'Failed to send reply');
            }
        } catch (err) {
            console.error('Reply error:', err);
            alert('Network error while sending reply');
        } finally {
            setSendingReply(prev => ({ ...prev, [ticketId]: false }));
        }
    };

    const summaryCards = [
        { key: 'all', label: 'Total Tickets', value: stats.total, color: '#3b82f6', icon: LifeBuoy },
        { key: 'open', label: 'Open', value: stats.open, color: '#f59e0b', icon: AlertCircle },
        { key: 'in_progress', label: 'In Progress', value: stats.in_progress, color: '#8b5cf6', icon: Clock },
        { key: 'resolved', label: 'Resolved', value: stats.resolved, color: '#10b981', icon: CheckCircle2 },
    ];

    return (
        <div style={{ ...themeVars, padding: isMobile ? '0' : '24px' }}>
            {/* Premium Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 32 }}>
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
                            transition: 'all 0.3s ease', 
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${card.color}15`, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <card.icon size={20} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase' }}>{card.label}</span>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--admin-text-primary)' }}>{card.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {loading ? (
                    <div style={{ padding: 80, textAlign: 'center', color: 'var(--admin-text-muted)', background: 'var(--admin-surface)', borderRadius: 24 }}>
                        <RefreshCw className="spin" size={32} style={{ marginBottom: 16, opacity: 0.5 }} />
                        <div style={{ fontWeight: 700 }}>Synchronizing Support Tickets...</div>
                    </div>
                ) : tickets.length > 0 ? (
                    tickets.map((t) => (
                        <div key={t.id} style={{ 
                            background: 'var(--admin-surface)', 
                            borderRadius: 24, 
                            border: `1px solid ${expandedTicketId === t.id ? '#3b82f6' : 'var(--admin-border-soft)'}`,
                            overflow: 'hidden',
                            boxShadow: expandedTicketId === t.id ? '0 15px 40px rgba(0,0,0,0.08)' : '0 4px 6px rgba(0,0,0,0.01)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}>
                            {/* Ticket Header */}
                            <div 
                                onClick={() => setExpandedTicketId(expandedTicketId === t.id ? null : t.id)}
                                style={{ padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 24 }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--admin-text-muted)', letterSpacing: '0.05em' }}>{t.ticket_id}</span>
                                        <span style={{ 
                                            padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 900,
                                            background: t.status === 'resolved' ? '#10b98115' : t.status === 'open' ? '#f59e0b15' : '#3b82f615',
                                            color: t.status === 'resolved' ? '#10b981' : t.status === 'open' ? '#f59e0b' : '#3b82f6',
                                            textTransform: 'uppercase', border: '1px solid currentColor'
                                        }}>{t.status}</span>
                                        <span style={{ padding: '4px 10px', borderRadius: 8, background: 'var(--admin-row-alt)', color: 'var(--admin-text-secondary)', fontSize: 10, fontWeight: 800 }}>{t.category.replace('_', ' ').toUpperCase()}</span>
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{t.subject}</h3>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: 150 }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)', marginBottom: 4 }}>{t.client_name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>{new Date(t.created_at).toLocaleDateString()}</div>
                                </div>
                                <div style={{ transform: expandedTicketId === t.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', color: 'var(--admin-text-muted)' }}>
                                    <ChevronDown size={20} />
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedTicketId === t.id && (
                                <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 32 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                        <div style={{ padding: 24, background: 'var(--admin-row-alt)', borderRadius: 20, border: '1px solid var(--admin-border-soft)' }}>
                                            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <FileText size={14} /> Description
                                            </div>
                                            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--admin-text-primary)', whiteSpace: 'pre-wrap' }}>{t.description}</p>
                                            {t.attachment && (
                                                <a href={t.attachment} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 20, color: '#3b82f6', textDecoration: 'none', fontWeight: 800, fontSize: 13, padding: '8px 16px', background: '#3b82f615', borderRadius: 10 }}>
                                                    <FileText size={16} /> View Original Attachment
                                                </a>
                                            )}
                                        </div>

                                        {/* Discussion */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--admin-text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <MessageSquare size={14} /> Conversation History
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {(!t.comments || t.comments.length === 0) ? (
                                                    <div style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--admin-border-soft)', borderRadius: 20, color: 'var(--admin-text-muted)', fontSize: 13, fontStyle: 'italic' }}>No replies yet. Start the conversation below.</div>
                                                ) : (
                                                    t.comments.map(c => (
                                                        <div key={c.id} style={{ 
                                                            alignSelf: c.is_admin_reply ? 'flex-end' : 'flex-start',
                                                            maxWidth: '85%',
                                                            padding: '16px 20px',
                                                            borderRadius: 20,
                                                            background: c.is_admin_reply ? '#1e293b' : 'var(--admin-surface)',
                                                            color: c.is_admin_reply ? 'white' : 'var(--admin-text-primary)',
                                                            border: '1px solid var(--admin-border-soft)',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 8, opacity: 0.8 }}>
                                                                <span style={{ fontWeight: 900, fontSize: 11 }}>{c.is_admin_reply ? 'Support Agent' : 'Client'}</span>
                                                                <span style={{ fontSize: 10 }}>{new Date(c.created_at).toLocaleTimeString()}</span>
                                                            </div>
                                                            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{c.message}</div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Reply Box */}
                                        {t.status !== 'resolved' && (
                                            <div style={{ position: 'relative' }}>
                                                <textarea 
                                                    value={replyTexts[t.id] || ''}
                                                    onChange={(e) => setReplyTexts(prev => ({ ...prev, [t.id]: e.target.value }))}
                                                    placeholder="Type your official reply..."
                                                    style={{ 
                                                        width: '100%', padding: '20px 60px 20px 20px', borderRadius: 20, background: 'var(--admin-surface)',
                                                        border: '1px solid var(--admin-border-soft)', color: 'var(--admin-text-primary)',
                                                        minHeight: 120, resize: 'none', outline: 'none', fontSize: 14,
                                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                                    }}
                                                />
                                                <button 
                                                    onClick={() => handleReply(t.id)}
                                                    disabled={sendingReply[t.id] || !(replyTexts[t.id] || '').trim()}
                                                    style={{ 
                                                        position: 'absolute', right: 16, bottom: 16, width: 44, height: 44, borderRadius: 14, 
                                                        background: '#10b981', color: 'white', border: 'none', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        opacity: sendingReply[t.id] ? 0.6 : 1, transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {sendingReply[t.id] ? <RefreshCw className="spin" size={20} /> : <Send size={20} />}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sidebar Meta */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                        <div style={{ padding: 24, background: 'var(--admin-surface)', borderRadius: 24, border: '1px solid var(--admin-border-soft)' }}>
                                            <h4 style={{ margin: '0 0 20px 0', fontSize: 12, fontWeight: 900, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Administrative Controls</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                {t.status !== 'resolved' && (
                                                    <button 
                                                        onClick={() => handleResolve(t.id)}
                                                        style={{ width: '100%', padding: '14px', borderRadius: 14, background: '#10b98115', color: '#10b981', border: '1px solid #10b98130', fontWeight: 900, cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}
                                                        onMouseOver={(e) => e.currentTarget.style.background = '#10b98125'}
                                                        onMouseOut={(e) => e.currentTarget.style.background = '#10b98115'}
                                                    >Resolve Ticket</button>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                        <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 700 }}>Client Profile</span>
                                                        <button onClick={() => window.open(`/Clients/${t.client_id}`, '_blank')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>View Details</button>
                                                    </div>
                                                    {t.consultant_id && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--admin-border-soft)' }}>
                                                            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 700 }}>Consultant</span>
                                                            <button onClick={() => window.open(`/Consultants/${t.consultant_id}`, '_blank')} style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>View Details</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {t.resolution && (
                                            <div style={{ padding: 24, background: '#10b98108', borderRadius: 24, border: '1px solid #10b98120' }}>
                                                <h4 style={{ margin: '0 0 12px 0', fontSize: 12, fontWeight: 900, color: '#10b981', textTransform: 'uppercase' }}>Final Resolution</h4>
                                                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--admin-text-primary)' }}>{t.resolution}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div style={{ padding: 100, textAlign: 'center', color: 'var(--admin-text-muted)', background: 'var(--admin-surface)', borderRadius: 24, border: '1px dashed var(--admin-border-soft)' }}>
                        <div style={{ fontSize: 48, marginBottom: 20 }}>📬</div>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>No Support Tickets</div>
                        <p style={{ marginTop: 8 }}>All clear! No tickets found matching this filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSupportList;
