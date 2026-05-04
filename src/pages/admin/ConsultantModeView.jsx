import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Users,
    CheckCircle2,
    Circle,
    Mail,
    CreditCard,
    MessageSquare,
    PhoneCall,
    Clock,
    User,
    FileText,
    ClipboardList,
    Search as SearchIcon,
    AlertCircle,
    TrendingUp,
    Wallet,
    Calendar,
    ChevronRight,
    Video,
    LifeBuoy,
    Plus,
    X
} from 'lucide-react';
import { apiUrl } from '../../utils/apiBase';

/**
 * Simplified Scope Helper for Admin View
 */
const getScopeText = (req) => {
    if (!req) return null;

    // Logic similar to taxplanadvisor/src/lib/serviceRequestScope.js
    const years = [];
    if (req.created_at) {
        const date = new Date(req.created_at);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed
        // India FY is Apr-Mar. If month is Apr (3) or later, FY is currentYear-nextYear
        const fy = month >= 3 ? `FY ${year}-${String(year + 1).slice(2)}` : `FY ${year - 1}-${String(year).slice(2)}`;
        years.push(fy);
    }

    // Default scope text if no specific details
    const scopeLine = req.service_title?.toLowerCase().includes('itr') ? 'Base filing scope' : 'Standard Service Scope';

    return {
        scopeLine: req.scope_data?.summary || scopeLine,
        years: req.scope_data?.years || years,
        hasDetails: !!(req.scope_data?.summary || req.scope_data?.years?.length)
    };
};

const normalizeStatus = (status) => {
    const labelMap = {
        consultant_dropped: 'Rejected By Consultant',
        cancelled: 'Rejected By Client',
        wip: 'Work In Progress',
        completed: 'Completed',
        revision_pending: 'Revision Pending',
        under_query: 'Under Query',
        under_review: 'Under Review',
        doc_pending: 'Documents Pending',
        final_review: 'Final Review',
        filed: 'Filed',
        assigned: 'Assigned',
        pending: 'Pending',
    };
    return labelMap[status] || (status || 'unknown').replace(/_/g, ' ');
};

const statusBadgeClass = (status) => {
    if (status === 'completed') return { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' };
    if (status === 'consultant_dropped') return { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' };
    if (status === 'cancelled') return { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' };
    return { background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' };
};

const formatServiceDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${Math.max(1, diffMins)} minutes ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} days ago`;
};

/**
 * ConsultantModeView — Professional admin view of a consultant's live performance.
 */
const ConsultantModeView = ({ performanceData, isMobile, isLight }) => {
    const [selectedClientForServices, setSelectedClientForServices] = useState(null);
    const [supportTab, setSupportTab] = useState('all');
    const [expandedTicketId, setExpandedTicketId] = useState(null);
    const [localTickets, setLocalTickets] = useState(performanceData.support_tickets || []);
    const [replyTexts, setReplyTexts] = useState({});
    const [replyFiles, setReplyFiles] = useState({});
    const [sendingReply, setSendingReply] = useState({});

    React.useEffect(() => {
        setLocalTickets(performanceData.support_tickets || []);
    }, [performanceData.support_tickets]);

    const handleAdminReply = async (ticketId) => {
        const text = replyTexts[ticketId] || '';
        const file = replyFiles[ticketId];
        if (!text.trim() && !file) return;

        try {
            setSendingReply(prev => ({ ...prev, [ticketId]: true }));
            const formData = new FormData();
            formData.append('message', text);
            if (file) formData.append('attachment', file);

            const token = localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/admin-panel/tickets/${ticketId}/reply/`), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Reply failed with status ${res.status}`);
            }
            const newComment = await res.json();

            setLocalTickets(prev => prev.map(t => 
                t.id === ticketId ? { ...t, comments: [...(t.comments || []), newComment], status: 'in_progress' } : t
            ));
            setReplyTexts(prev => ({ ...prev, [ticketId]: '' }));
            setReplyFiles(prev => ({ ...prev, [ticketId]: null }));
        } catch (err) {
            console.error('Admin reply error:', err);
            alert(`Failed to send reply: ${err.message}`);
        } finally {
            setSendingReply(prev => ({ ...prev, [ticketId]: false }));
        }
    };

    const handleResolveTicket = async (ticketId) => {
        const resolution = prompt('Please enter a resolution note (optional):');
        if (resolution === null) return;

        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(apiUrl(`/admin-panel/tickets/${ticketId}/resolve/`), {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resolution })
            });

            if (!res.ok) throw new Error('Resolve failed');
            const data = await res.json();
            setLocalTickets(prev => prev.map(t => 
                t.id === ticketId ? { ...t, status: data.status, resolution: data.resolution } : t
            ));
            alert('Ticket marked as Resolved');
        } catch (err) {
            console.error(err);
            alert('Failed to resolve ticket');
        }
    };


    if (!performanceData) return null;

    const pc = performanceData.profile_completion || {};
    const wl = performanceData.workload || {};
    const prof = performanceData.profile || {};
    const earnings = performanceData.earnings || {};
    const bank = performanceData.bank_details;
    const clients = performanceData.clients || [];
    const activeRequests = performanceData.active_requests || [];
    const activities = performanceData.activities || [];
    const availability = performanceData.availability || {};
    const weeklyHours = availability.weekly_hours || [];
    const upcomingMeetings = performanceData.upcoming_meetings || [];
    const supportTickets = localTickets;

    const pct = pc.percentage || 0;
    const steps = pc.steps || [];
    const completedCount = pc.completed_steps || 0;
    const totalSteps = pc.total_steps || 7;

    const WORKFLOW_STAGES = [
        { key: 'pending', label: 'Pending', icon: Clock },
        { key: 'assigned', label: 'Consultant Assigned', icon: User },
        { key: 'doc_pending', label: 'Doc Upload', icon: FileText },
        { key: 'wip', label: 'work in progress', icon: ClipboardList },
        { key: 'review', label: 'Review', icon: SearchIcon },
        { key: 'completed', label: 'Complete', icon: CheckCircle2 },
    ];

    const getStageIndex = (status) => {
        const statusMap = {
            'pending': 0,
            'assigned': 1,
            'doc_pending': 2,
            'under_review': 2,
            'in_progress': 3,
            'wip': 3,
            'under_query': 2,
            'final_review': 4,
            'filed': 4,
            'revision_pending': 4,
            'completed': 5,
            'cancelled': -1,
            'consultant_dropped': 1,
        };
        return statusMap[status] ?? 0;
    };

    /* ── shared styles ── */
    const cardStyle = {
        background: 'var(--admin-surface)',
        borderRadius: 16,
        border: '1px solid var(--admin-border-soft)',
        overflow: 'hidden',
        boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
    };
    const cardHeaderStyle = {
        padding: isMobile ? '16px 16px 12px' : '20px 24px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--admin-border-soft)',
    };
    const cardBodyStyle = { padding: isMobile ? 16 : 24 };

    const sectionTitleStyle = {
        fontWeight: 700, fontSize: 16, color: 'var(--admin-text-strong)', margin: 0,
    };

    const WorkloadCard = ({ label, value, accent, icon: Icon }) => (
        <div style={{
            padding: isMobile ? '16px 14px' : '20px',
            borderRadius: 14,
            border: accent ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--admin-border-soft)',
            background: accent
                ? (isLight ? 'rgba(16,185,129,0.04)' : 'rgba(16,185,129,0.06)')
                : 'var(--admin-surface-soft)',
            display: 'flex', flexDirection: 'column', gap: 10,
            position: 'relative',
            overflow: 'hidden',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: 'var(--admin-text-muted)',
                }}>{label}</span>
                {Icon && <Icon size={16} color={accent ? '#10b981' : 'var(--admin-text-muted)'} opacity={0.6} />}
            </div>
            <span style={{
                fontSize: 28, fontWeight: 800,
                color: accent ? '#10b981' : 'var(--admin-text-strong)',
                lineHeight: 1,
            }}>{value}</span>
            {accent && (
                <div style={{
                    position: 'absolute', right: -10, bottom: -10,
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'rgba(16,185,129,0.05)', zIndex: 0
                }} />
            )}
        </div>
    );

    const StatusProgressBar = ({ currentStatus }) => {
        const currentStageIndex = getStageIndex(currentStatus);
        if (currentStageIndex === -1) return null;

        return (
            <div style={{ width: '100%', padding: '20px 0 10px' }}>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
                    {/* Progress Line */}
                    <div style={{
                        position: 'absolute', left: 0, right: 0, top: 12,
                        height: 2, background: 'var(--admin-border-soft)', borderRadius: 2,
                        zIndex: 0
                    }} />
                    <div style={{
                        position: 'absolute', left: 0, top: 12,
                        height: 2, background: '#10b981', borderRadius: 2,
                        width: `${(currentStageIndex / (WORKFLOW_STAGES.length - 1)) * 100}%`,
                        transition: 'width 0.5s ease',
                        zIndex: 1
                    }} />

                    {WORKFLOW_STAGES.map((stage, idx) => {
                        const isCompleted = idx < currentStageIndex;
                        const isCurrent = idx === currentStageIndex;
                        const Icon = stage.icon;

                        return (
                            <div key={stage.key} style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                gap: 8, position: 'relative', zIndex: 2, width: '16%'
                            }}>
                                <div style={{
                                    width: 26, height: 26, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: isCompleted || isCurrent ? '#10b981' : 'var(--admin-surface-elevated)',
                                    border: isCompleted || isCurrent ? 'none' : '2px solid var(--admin-border-mid)',
                                    color: isCompleted || isCurrent ? '#fff' : 'var(--admin-text-muted)',
                                    transition: 'all 0.3s'
                                }}>
                                    {isCompleted ? <CheckCircle2 size={14} /> : <Icon size={13} />}
                                </div>
                                <span style={{
                                    fontSize: 9, fontWeight: 600, textAlign: 'center',
                                    color: isCompleted || isCurrent ? 'var(--admin-text-strong)' : 'var(--admin-text-muted)',
                                    textTransform: 'uppercase', letterSpacing: '0.02em',
                                    lineHeight: 1.2
                                }}>{stage.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

            {/* ═══════ 1. PROFILE COMPLETION ═══════ */}
            <div style={cardStyle}>
                <div style={cardBodyStyle}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16
                    }}>
                        <div>
                            <h2 style={{ ...sectionTitleStyle, fontSize: 18 }}>Profile completion</h2>
                            <p style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                                {completedCount} of {totalSteps} steps done
                            </p>
                        </div>
                        <div style={{
                            fontSize: 32, fontWeight: 800,
                            color: pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444',
                        }}>{pct}%</div>
                    </div>

                    <div style={{
                        height: 8, borderRadius: 6, background: 'var(--admin-border-soft)',
                        overflow: 'hidden', marginBottom: 24
                    }}>
                        <div style={{
                            height: '100%', width: `${pct}%`, background: '#10b981',
                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {steps.map((step) => (
                            <div key={step.key} style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '10px 14px', borderRadius: 10,
                                background: step.completed ? 'transparent' : 'var(--admin-surface-soft)',
                                border: step.completed ? '1px solid transparent' : '1px solid var(--admin-border-soft)',
                                transition: 'all 0.2s'
                            }}>
                                {step.completed ? (
                                    <CheckCircle2 size={18} color="#10b981" />
                                ) : (
                                    <Circle size={18} color="var(--admin-text-muted)" opacity={0.5} />
                                )}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            fontSize: 14, fontWeight: 600,
                                            color: step.completed ? 'var(--admin-text-muted)' : 'var(--admin-text-strong)'
                                        }}>{step.label}</span>
                                        {!step.completed && step.priority && (
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, padding: '2px 8px',
                                                borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                                                textTransform: 'uppercase'
                                            }}>Priority</span>
                                        )}
                                    </div>
                                    {!step.completed && step.subtitle && (
                                        <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2 }}>{step.subtitle}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════ 2. MY WORKLOAD ═══════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
                    <TrendingUp size={16} color="var(--admin-text-muted)" />
                    <h2 style={{ ...sectionTitleStyle, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)' }}>My Workload</h2>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                    gap: 16
                }}>
                    <WorkloadCard label="Clients" value={wl.unique_clients ?? 0} accent icon={Users} />
                    <WorkloadCard label="Total Services" value={wl.total_services ?? 0} icon={ClipboardList} />
                    <WorkloadCard label="Work in Progress" value={wl.work_in_progress ?? 0} accent icon={Clock} />
                    <WorkloadCard label="Completed" value={wl.completed ?? 0} icon={CheckCircle2} />
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                    gap: 16
                }}>
                    <WorkloadCard label="Rejected by Consultant" value={wl.rejected_by_consultant ?? 0} />
                    <WorkloadCard label="Rejected by Client" value={wl.rejected_by_client ?? 0} />
                    <WorkloadCard label="Services Offered" value={`${wl.services_offered_active ?? 0} / ${wl.services_offered_total ?? 0}`} accent icon={TrendingUp} />
                </div>
            </div>

            {/* ═══════ 3. ACTIVE CLIENTS & SERVICE REQUESTS ═══════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Clients Section */}
                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <Users size={18} color="#10b981" />
                        <h2 style={sectionTitleStyle}>Clients</h2>
                        <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                            background: 'rgba(16,185,129,0.1)', color: '#10b981', marginLeft: 4
                        }}>{clients.length}</span>

                        <div style={{ marginLeft: 'auto', position: 'relative', width: isMobile ? 120 : 240 }}>
                            <SearchIcon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                style={{
                                    width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--admin-border-soft)',
                                    background: 'var(--admin-surface-soft)', padding: '0 12px 0 32px', fontSize: 12,
                                    outline: 'none', color: 'var(--admin-text-strong)'
                                }}
                            />
                        </div>
                    </div>
                    <div style={{ ...cardBodyStyle, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {clients.length > 0 ? clients.slice(0, 5).map((c, i) => (
                                <div key={i}
                                    onClick={() => {
                                        if (c.id) window.location.href = `/clients/${c.id}`;
                                    }}
                                    style={{
                                        padding: 16, borderRadius: 12, border: '1px solid var(--admin-border-soft)',
                                        background: 'var(--admin-surface-elevated)', transition: 'transform 0.2s',
                                        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                                        cursor: 'pointer'
                                    }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <h4
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (c.id) window.location.href = `/clients/${c.id}`;
                                                }}
                                                style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--admin-text-strong)', cursor: 'pointer' }}
                                            >
                                                {c.name}
                                            </h4>
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedClientForServices(c);
                                                }}
                                                style={{
                                                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                                                    borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {c.service_requests?.length || 0} service{(c.service_requests?.length !== 1) ? 's' : ''}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--admin-text-muted)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Mail size={12} /> {c.email || 'No email'}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <CreditCard size={12} /> {c.pan || 'PAN pending'}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button style={{
                                            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--admin-border-soft)',
                                            background: 'var(--admin-surface-soft)', fontSize: 12, fontWeight: 600,
                                            color: 'var(--admin-text-strong)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                                        }}>Request Service</button>
                                        <button style={{
                                            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--admin-border-soft)',
                                            background: 'var(--admin-surface-soft)', fontSize: 12, fontWeight: 600,
                                            color: 'var(--admin-text-strong)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                                        }}><MessageSquare size={14} /> Chat</button>
                                        <button style={{
                                            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--admin-border-soft)',
                                            background: 'var(--admin-surface-soft)', fontSize: 12, fontWeight: 600,
                                            color: 'var(--admin-text-strong)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                                        }}><PhoneCall size={14} /> Call</button>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No clients assigned yet.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Upcoming Meetings Section */}
                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <Video size={18} color="#f59e0b" />
                        <h2 style={sectionTitleStyle}>Upcoming Meetings</h2>
                        <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                            background: 'rgba(245,158,11,0.1)', color: '#f59e0b', marginLeft: 4
                        }}>{upcomingMeetings.length}</span>
                    </div>
                    <div style={{ ...cardBodyStyle, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {upcomingMeetings.length > 0 ? upcomingMeetings.map((mtg, i) => (
                                <div key={i} style={{
                                    padding: 16, borderRadius: 12, border: '1px solid var(--admin-border-soft)',
                                    background: 'var(--admin-surface-elevated)', display: 'flex', flexWrap: 'wrap',
                                    alignItems: 'center', justifyContent: 'space-between', gap: 16
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--admin-text-strong)' }}>{mtg.topic}</h4>
                                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {mtg.client_name}</span>
                                            <span>•</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {new Date(mtg.date).toLocaleDateString()} {mtg.start_time} - {mtg.end_time}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                            background: mtg.status === 'confirmed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                            color: mtg.status === 'confirmed' ? '#10b981' : '#f59e0b',
                                        }}>{mtg.status.toUpperCase()}</span>
                                        {mtg.meeting_link && (
                                            <a href={mtg.meeting_link} target="_blank" rel="noopener noreferrer" style={{
                                                padding: '6px 12px', borderRadius: 8, background: '#3b82f6', color: '#fff',
                                                fontSize: 12, fontWeight: 600, textDecoration: 'none'
                                            }}>Join</a>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No upcoming meetings scheduled.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Service Requests Section */}
                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <Clock size={18} color="#3b82f6" />
                        <h2 style={sectionTitleStyle}>Active Service Requests</h2>
                        <span style={{
                            padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                            background: 'rgba(59,130,246,0.1)', color: '#3b82f6', marginLeft: 4
                        }}>{activeRequests.length}</span>
                    </div>
                    <div style={{ ...cardBodyStyle, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {activeRequests.length > 0 ? activeRequests.slice(0, 5).map((req, i) => {
                                const scope = getScopeText(req);
                                return (
                                    <div key={i} style={{
                                        padding: 20, borderRadius: 14, border: '1px solid var(--admin-border-soft)',
                                        background: 'var(--admin-surface-elevated)', display: 'flex', flexDirection: 'column', gap: 16
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <h4
                                                    onClick={() => {
                                                        if (req.client_id) window.location.href = `/clients/${req.client_id}`;
                                                    }}
                                                    style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--admin-text-strong)', cursor: 'pointer' }}
                                                >
                                                    {req.client_name} — {req.service_title}
                                                </h4>
                                                <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', margin: 0 }}>Created: {new Date(req.created_at || req.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-text-muted)', marginTop: 4 }}>
                                                    SCOPE: <span style={{ color: 'var(--admin-text-primary)' }}>"{scope.scopeLine}"</span>
                                                    {scope.years.map(y => (
                                                        <span key={y} style={{ marginLeft: 8, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 4 }}>{y}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                    background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)'
                                                }}>{req.status_display}</span>
                                                <button style={{
                                                    padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
                                                    background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: 11, fontWeight: 700,
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                                }}>REJECT</button>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                <Clock size={14} color="var(--admin-text-muted)" />
                                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-strong)' }}>Workflow Progress</span>
                                                <ChevronRight size={14} color="var(--admin-text-muted)" />
                                            </div>
                                            <StatusProgressBar currentStatus={req.status} />
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No active service requests.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════ 4. PROFILE OVERVIEW ═══════ */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <TrendingUp size={18} color="#10b981" />
                    <h2 style={sectionTitleStyle}>Profile Overview</h2>
                </div>
                <div style={cardBodyStyle}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                        gap: 16,
                    }}>
                        {[
                            {
                                label: 'Status',
                                render: () => (
                                    <span style={{
                                        padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                        background: prof.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                        color: prof.is_active ? '#10b981' : '#ef4444',
                                    }}>{prof.is_active ? 'Active' : 'Inactive'}</span>
                                ),
                            },
                            {
                                label: 'Capacity',
                                text: `${prof.current_client_count ?? 0} / ${prof.max_concurrent_clients ?? 10}`,
                            },
                            {
                                label: 'Rating',
                                text: `${prof.average_rating?.toFixed(1) || '—'} (${prof.total_reviews ?? 0} reviews)`,
                            },
                            {
                                label: 'Fee',
                                text: `₹${Number(prof.consultation_fee || 0).toLocaleString('en-IN')}`,
                            },
                        ].map((item, i) => (
                            <div key={i} style={{
                                padding: '16px', borderRadius: 12,
                                background: 'var(--admin-surface-soft)',
                                border: '1px solid var(--admin-border-soft)',
                            }}>
                                <div style={{
                                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                                    letterSpacing: '0.05em', color: 'var(--admin-text-muted)', marginBottom: 8,
                                }}>{item.label}</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--admin-text-strong)' }}>
                                    {item.render ? item.render() : item.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════ 5. AVAILABILITY ═══════ */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <Calendar size={18} color="#10b981" />
                    <h2 style={sectionTitleStyle}>Availability</h2>
                </div>
                <div style={cardBodyStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                            { id: 0, name: 'Sunday', short: 'S' },
                            { id: 1, name: 'Monday', short: 'M' },
                            { id: 2, name: 'Tuesday', short: 'T' },
                            { id: 3, name: 'Wednesday', short: 'W' },
                            { id: 4, name: 'Thursday', short: 'T' },
                            { id: 5, name: 'Friday', short: 'F' },
                            { id: 6, name: 'Saturday', short: 'S' }
                        ].map(day => {
                            const dayRanges = weeklyHours.filter(h => h.day_of_week === day.id);
                            const isActive = dayRanges.length > 0;

                            const formatTime = (timeStr) => {
                                if (!timeStr) return '';
                                const [h, m] = timeStr.split(':');
                                const hours = parseInt(h, 10);
                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                const displayHours = hours % 12 || 12;
                                return `${displayHours}:${m} ${ampm}`;
                            };

                            return (
                                <div key={day.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    padding: '8px 0', borderBottom: day.id === 6 ? 'none' : '1px solid var(--admin-border-soft)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 120 }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12, fontWeight: 700,
                                            background: isActive ? '#10b981' : 'var(--admin-surface-soft)',
                                            color: isActive ? '#fff' : 'var(--admin-text-muted)'
                                        }}>{day.short}</div>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--admin-text-strong)' : 'var(--admin-text-muted)' }}>
                                            {day.name}
                                        </span>
                                    </div>

                                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                        {isActive ? dayRanges.map((range, idx) => (
                                            <span key={idx} style={{
                                                fontSize: 12, fontWeight: 600, color: 'var(--admin-text-strong)',
                                                padding: '4px 10px', background: 'var(--admin-surface-elevated)',
                                                borderRadius: 6, border: '1px solid var(--admin-border-soft)'
                                            }}>
                                                {formatTime(range.start_time)} - {formatTime(range.end_time)}
                                            </span>
                                        )) : (
                                            <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Unavailable</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ═══════ 6. EARNINGS ═══════ */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <Wallet size={18} color="#10b981" />
                    <h2 style={sectionTitleStyle}>Earnings & Financials</h2>
                </div>
                <div style={cardBodyStyle}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                        gap: 16,
                    }}>
                        {[
                            { label: 'Total Earnings (60%)', value: earnings.total_earnings, color: '#10b981' },
                            { label: 'Total Withdrawn', value: earnings.total_withdrawn, color: '#ef4444' },
                            { label: 'Available Balance', value: earnings.available_balance, color: '#3b82f6' },
                        ].map((e, i) => (
                            <div key={i} style={{
                                padding: '20px', borderRadius: 14,
                                background: 'var(--admin-surface-soft)',
                                border: '1px solid var(--admin-border-soft)',
                            }}>
                                <div style={{
                                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                                    letterSpacing: '0.05em', color: 'var(--admin-text-muted)', marginBottom: 10,
                                }}>{e.label}</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: e.color }}>
                                    ₹{(e.value || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════ 7. BANK DETAILS ═══════ */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <Wallet size={18} color="var(--admin-text-muted)" />
                    <h2 style={sectionTitleStyle}>Bank Details</h2>
                </div>
                <div style={cardBodyStyle}>
                    {bank ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 20,
                        }}>
                            {[
                                { l: 'Account Name', v: bank.account_name },
                                { l: 'Account Number', v: bank.account_number },
                                { l: 'IFSC Code', v: bank.ifsc_code },
                                { l: 'Bank Name', v: bank.bank_name || 'N/A' },
                                {
                                    l: 'Verification',
                                    v: (
                                        <span style={{
                                            padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                            background: bank.is_verified ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                            color: bank.is_verified ? '#10b981' : '#f59e0b',
                                        }}>{bank.is_verified ? 'Verified' : 'Pending'}</span>
                                    ),
                                },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div style={{
                                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: '0.05em', color: 'var(--admin-text-muted)', marginBottom: 8,
                                    }}>{item.l}</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--admin-text-strong)' }}>{item.v}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--admin-text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No bank details provided.</div>
                    )}
                </div>
            </div>

            {/* ═══════ 8. ACTIVITY TIMELINE ═══════ */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <Calendar size={18} color="var(--admin-text-muted)" />
                    <h2 style={sectionTitleStyle}>Recent Activity</h2>
                </div>
                <div style={cardBodyStyle}>
                    {activities.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {activities.map((act, i) => (
                                <div key={i} style={{
                                    display: 'flex', gap: 16, padding: '16px 0',
                                    borderBottom: i < activities.length - 1 ? '1px solid var(--admin-border-soft)' : 'none',
                                }}>
                                    <div style={{
                                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 6,
                                        background: '#3b82f6', boxShadow: '0 0 10px rgba(59,130,246,0.3)'
                                    }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-strong)' }}>
                                            {act.title || act.activity_type}
                                        </div>
                                        {act.description && (
                                            <div style={{ fontSize: 13, color: 'var(--admin-text-primary)', marginTop: 4, lineHeight: 1.5 }}>
                                                {act.description}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 8 }}>
                                            <Clock size={12} /> {act.created_at ? new Date(act.created_at).toLocaleString() : ''}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: 'var(--admin-text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No recent activities found.</div>
                    )}
                </div>
            </div>

            {/* ═══════ 9. SUPPORT & CONCERNS ═══════ */}
            <div style={cardStyle}>
                <div style={{ ...cardHeaderStyle, borderBottom: 'none', paddingBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <LifeBuoy size={22} />
                        </div>
                        <div>
                            <h2 style={{ ...sectionTitleStyle, margin: 0 }}>Support & Concerns</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--admin-text-muted)' }}>Client raised tickets and issues.</p>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '20px 24px' }}>
                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                        {[
                            { label: 'OPEN', count: supportTickets.filter(t => ['open', 'reopened'].includes(t.status)).length, color: '#3b82f6', bg: 'rgba(59,130,246,0.05)', border: '#dbeafe', icon: AlertCircle },
                            { label: 'IN PROGRESS', count: supportTickets.filter(t => t.status === 'in_progress').length, color: '#f59e0b', bg: 'rgba(245,158,11,0.05)', border: '#fef3c7', icon: Clock },
                            { label: 'RESOLVED', count: supportTickets.filter(t => ['resolved', 'closed'].includes(t.status)).length, color: '#10b981', bg: 'rgba(16,185,129,0.05)', border: '#d1fae5', icon: CheckCircle2 },
                        ].map((stat, idx) => (
                            <div key={idx} style={{
                                padding: 20, borderRadius: 16, background: stat.bg, border: `1px solid ${stat.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 800, color: stat.color, letterSpacing: '0.05em', margin: 0 }}>{stat.label}</p>
                                    <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--admin-text-strong)', margin: '4px 0 0 0' }}>{stat.count}</h3>
                                </div>
                                <stat.icon size={32} color={stat.color} style={{ opacity: 0.2 }} />
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--admin-surface-soft)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
                        {['all', 'open', 'working', 'resolved'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setSupportTab(tab)}
                                style={{
                                    padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none',
                                    background: supportTab === tab ? 'var(--admin-surface-elevated)' : 'transparent',
                                    color: supportTab === tab ? 'var(--admin-text-strong)' : 'var(--admin-text-muted)',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    boxShadow: supportTab === tab ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                                }}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {supportTickets
                            .filter(t => {
                                if (supportTab === 'all') return true;
                                if (supportTab === 'open') return ['open', 'reopened'].includes(t.status);
                                if (supportTab === 'working') return t.status === 'in_progress';
                                if (supportTab === 'resolved') return ['resolved', 'closed'].includes(t.status);
                                return true;
                            })
                            .length > 0 ? supportTickets
                                .filter(t => {
                                    if (supportTab === 'all') return true;
                                    if (supportTab === 'open') return ['open', 'reopened'].includes(t.status);
                                    if (supportTab === 'working') return t.status === 'in_progress';
                                    if (supportTab === 'resolved') return ['resolved', 'closed'].includes(t.status);
                                    return true;
                                })
                                .map((ticket, i) => (
                                    <div key={i}
                                        onClick={() => setExpandedTicketId(expandedTicketId === ticket.id ? null : ticket.id)}
                                        style={{
                                            padding: '20px 24px', borderRadius: 16, border: '1px solid var(--admin-border-soft)',
                                            background: 'var(--admin-surface-elevated)', display: 'flex', flexDirection: 'column',
                                            cursor: 'pointer', transition: 'all 0.2s', gap: 0
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--admin-text-primary)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--admin-border-soft)'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.02em' }}>{ticket.ticket_id || `TKT-${ticket.id}`}</span>

                                                    <span style={{
                                                        padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                        background: ticket.status === 'open' ? '#dbeafe' : ticket.status === 'resolved' ? '#d1fae5' : '#fef3c7',
                                                        color: ticket.status === 'open' ? '#2563eb' : ticket.status === 'resolved' ? '#059669' : '#d97706',
                                                    }}>{(ticket.status || '').charAt(0).toUpperCase() + (ticket.status || '').slice(1)}</span>

                                                    {ticket.category && (
                                                        <span style={{
                                                            padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                            background: '#f1f5f9', color: '#64748b',
                                                        }}>{ticket.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                                                    )}

                                                    {ticket.priority && (
                                                        <span style={{
                                                            padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                            background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5'
                                                        }}>{ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority</span>
                                                    )}
                                                </div>
                                                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{ticket.subject}</h4>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{timeAgo(ticket.created_at)}</span>
                                                <ChevronRight 
                                                    size={18} 
                                                    style={{ 
                                                        transform: expandedTicketId === ticket.id ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.3s ease',
                                                        color: '#94a3b8'
                                                    }} 
                                                />
                                            </div>
                                        </div>

                                        {expandedTicketId === ticket.id && (
                                            <div 
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ 
                                                    marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--admin-border-soft)',
                                                    display: 'flex', flexDirection: 'column', gap: 20, cursor: 'default'
                                                }}
                                            >
                                                <div>
                                                    <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Description</p>
                                                    <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                                        {ticket.description}
                                                    </div>
                                                    {ticket.related_service_title && (
                                                        <p style={{ fontSize: 12, color: '#64748b', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ fontWeight: 700 }}>Related Service:</span> {ticket.related_service_title}
                                                        </p>
                                                    )}
                                                    {ticket.attachment && (
                                                        <div style={{ marginTop: 16 }}>
                                                            <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Attached Document</p>
                                                            <a 
                                                                href={ticket.attachment.startsWith('http') ? ticket.attachment : apiUrl(ticket.attachment).replace('/api/media', '/media')} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                style={{ 
                                                                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', 
                                                                    background: 'white', color: '#1e293b', borderRadius: 10, fontSize: 13, 
                                                                    fontWeight: 700, border: '1px solid #e2e8f0', textDecoration: 'none',
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'
                                                                }}
                                                            >
                                                                <FileText size={16} color="#64748b" /> View Original Attachment
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    <p style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <MessageSquare size={16} color="#94a3b8" /> Discussion History
                                                    </p>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto', padding: '10px 4px' }}>
                                                        {(!ticket.comments || ticket.comments.length === 0) ? (
                                                            <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '16px 0', background: '#fff', borderRadius: 12, border: '1px dashed #e2e8f0' }}>
                                                                No replies yet. We will respond here shortly.
                                                            </p>
                                                        ) : (
                                                            ticket.comments.map((comment) => (
                                                                <div 
                                                                    key={comment.id}
                                                                    style={{
                                                                        alignSelf: comment.is_admin_reply ? 'flex-end' : 'flex-start',
                                                                        maxWidth: '85%', padding: '12px 16px', borderRadius: 16,
                                                                        background: comment.is_admin_reply ? '#1e293b' : '#f8fafc',
                                                                        color: comment.is_admin_reply ? 'white' : '#1e293b',
                                                                        border: '1px solid #e2e8f0',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 12 }}>
                                                                        <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.8 }}>
                                                                            {comment.is_admin_reply ? 'Admin Support' : 'Consultant'}
                                                                        </span>
                                                                        <span style={{ fontSize: 9, opacity: 0.6 }}>
                                                                            {new Date(comment.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{comment.message}</p>
                                                                    {comment.attachment && (
                                                                        <a href={comment.attachment.startsWith('http') ? comment.attachment : apiUrl(comment.attachment).replace('/api/media', '/media')} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: comment.is_admin_reply ? '#93c5fd' : '#2563eb', fontWeight: 700 }}>
                                                                            <FileText size={12} /> View Attachment
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Reply Area */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#f8fafc', padding: 16, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <textarea 
                                                            placeholder="Type a reply..."
                                                            value={replyTexts[ticket.id] || ''}
                                                            onChange={e => setReplyTexts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                                            style={{
                                                                width: '100%', minHeight: 80, padding: '12px 45px 12px 16px', borderRadius: 12,
                                                                border: '1px solid #cbd5e1', fontSize: 14, resize: 'none', background: 'white'
                                                            }}
                                                        />
                                                        <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <label style={{ cursor: 'pointer', color: replyFiles[ticket.id] ? '#10b981' : '#64748b' }}>
                                                                <FileText size={20} />
                                                                <input 
                                                                    type="file" 
                                                                    style={{ display: 'none' }}
                                                                    onChange={e => setReplyFiles(prev => ({ ...prev, [ticket.id]: e.target.files[0] }))}
                                                                />
                                                            </label>
                                                        </div>
                                                        <button 
                                                            disabled={sendingReply[ticket.id]}
                                                            onClick={() => handleAdminReply(ticket.id)}
                                                            style={{
                                                                position: 'absolute', right: 12, bottom: 12, width: 36, height: 36, borderRadius: 8,
                                                                background: '#10b981', color: 'white', border: 'none', cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                opacity: sendingReply[ticket.id] ? 0.6 : 1
                                                            }}
                                                        >
                                                            <TrendingUp size={18} style={{ transform: 'rotate(45deg)' }} />
                                                        </button>
                                                    </div>
                                                    {replyFiles[ticket.id] && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#10b981', fontWeight: 700 }}>
                                                            <CheckCircle2 size={14} /> Attached: {replyFiles[ticket.id].name}
                                                            <button onClick={() => setReplyFiles(prev => ({ ...prev, [ticket.id]: null }))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                                     
                                                    
                                                    {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                                                        <button 
                                                            onClick={() => handleResolveTicket(ticket.id)}
                                                            style={{
                                                                flex: 1, padding: '12px', borderRadius: 10, background: '#d1fae5', color: '#059669',
                                                                border: '1px solid #10b981', fontSize: 12, fontWeight: 800, cursor: 'pointer'
                                                            }}
                                                        >Resolve Ticket</button>
                                                    )}

                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )) : (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>No support tickets raised.</div>
                        )}
                    </div>
                </div>
            </div>
            {/* ═══════ SERVICE DETAILS MODAL ═══════ */}
            {selectedClientForServices && createPortal(
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 10000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 12 : 24
                    }}
                    onClick={() => setSelectedClientForServices(null)}
                >
                    <div
                        style={{
                            width: '100%', maxWidth: 1000, maxHeight: '90vh', background: 'var(--admin-surface)',
                            borderRadius: 20, border: '1px solid var(--admin-border-soft)',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--admin-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--admin-text-strong)' }}>{selectedClientForServices.name}</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--admin-text-muted)' }}>
                                    Clients services - {selectedClientForServices.service_requests?.length || 0} item{(selectedClientForServices.service_requests?.length !== 1) ? 's' : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedClientForServices(null)}
                                style={{
                                    width: 36, height: 36, borderRadius: 8, border: '1px solid var(--admin-border-soft)',
                                    background: 'var(--admin-surface-soft)', color: 'var(--admin-text-muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
                            <div style={{ borderRadius: 12, border: '1px solid var(--admin-border-soft)', overflow: 'hidden' }}>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1.5fr',
                                    background: 'var(--admin-surface-soft)', borderBottom: '1px solid var(--admin-border-soft)',
                                    fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em'
                                }}>
                                    <div style={{ padding: '12px 16px' }}>Service</div>
                                    {!isMobile && <div style={{ padding: '12px 16px' }}>Status</div>}
                                    <div style={{ padding: '12px 16px' }}>Date (Updated/Created)</div>
                                </div>
                                <div style={{ background: 'var(--admin-surface-elevated)' }}>
                                    {(selectedClientForServices.service_requests || []).map((req, idx) => {
                                        const scope = getScopeText(req);
                                        const badge = statusBadgeClass(req.status);
                                        return (
                                            <div key={idx} style={{
                                                display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1.5fr',
                                                borderBottom: idx < (selectedClientForServices.service_requests.length - 1) ? '1px solid var(--admin-border-soft)' : 'none',
                                                fontSize: 14, color: 'var(--admin-text-strong)'
                                            }}>
                                                <div style={{ padding: '16px' }}>
                                                    <div style={{ fontWeight: 700 }}>{req.service_title || 'Unknown Service'}</div>
                                                    {scope.hasDetails && (
                                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 6 }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--admin-text-primary)' }}>Scope:</span> {scope.scopeLine} {scope.years.join(' | ')}
                                                        </div>
                                                    )}
                                                    {isMobile && (
                                                        <div style={{ marginTop: 8 }}>
                                                            <span style={{
                                                                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                                                                background: badge.background, color: badge.color
                                                            }}>{normalizeStatus(req.status).toUpperCase()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {!isMobile && (
                                                    <div style={{ padding: '16px', display: 'flex', alignItems: 'center' }}>
                                                        <span style={{
                                                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                                            background: badge.background, color: badge.color, border: badge.border
                                                        }}>{normalizeStatus(req.status)}</span>
                                                    </div>
                                                )}
                                                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', color: 'var(--admin-text-muted)', fontSize: 13 }}>
                                                    {formatServiceDate(req.updated_at || req.created_at)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ConsultantModeView;
