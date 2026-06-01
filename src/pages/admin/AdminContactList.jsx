import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminUrl } from '../../utils/adminPath';
import { apiUrl } from '../../utils/apiBase';
import {
    Inbox, Mail, Phone, Clock, CheckCircle2, AlertCircle, ChevronDown,
    Send, FileText, RefreshCw, Search, Tag, Calendar, UserPlus, Flag,
    MessageSquare, ExternalLink, History, Download, Users,
} from 'lucide-react';
import ManageRecipientsModal from './ManageRecipientsModal';

// Resolves the admin JWT used for /admin-panel/* calls. Some flows in this
// codebase end up storing the literal string "null" into localStorage when
// a logout/login transition partially fails — that string is truthy but
// useless as a bearer token, so we explicitly filter it out here.
const _readAdminToken = (propToken) => {
    const candidates = [propToken];
    if (typeof window !== 'undefined') {
        candidates.push(window.localStorage.getItem('admin_token'));
    }
    for (const value of candidates) {
        if (typeof value === 'string' && value && value !== 'null' && value !== 'undefined') {
            return value;
        }
    }
    return '';
};

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'NEW', label: 'New' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'RESOLVED', label: 'Resolved' },
];

const INQUIRY_OPTIONS = [
    { value: '', label: 'All inquiry types' },
    { value: 'Feedback', label: 'Feedback' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Support', label: 'Support' },
    { value: 'Partnership', label: 'Partnership' },
    { value: 'home_page_lead', label: 'Homepage Lead' },
    { value: 'Other', label: 'Other' },
];

const PRIORITY_OPTIONS = [
    { value: '', label: 'All priorities' },
    { value: 'URGENT', label: 'Urgent' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' },
];

const SOURCE_OPTIONS = [
    { value: '', label: 'All sources' },
    { value: 'contact_form', label: 'Contact Form' },
    { value: 'home_page_lead', label: 'Homepage Popup' },
];

const STATUS_COLORS = {
    NEW: '#f59e0b',
    IN_PROGRESS: '#3b82f6',
    RESOLVED: '#10b981',
};

const PRIORITY_COLORS = {
    LOW: '#94a3b8',
    MEDIUM: '#3b82f6',
    HIGH: '#f97316',
    URGENT: '#ef4444',
};

const formatDate = (iso) => {
    if (!iso) return '-';
    try {
        return new Date(iso).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
            timeZone: 'Asia/Kolkata',
        });
    } catch { return '-'; }
};

const formatDateShort = (iso) => {
    if (!iso) return '-';
    try {
        return new Date(iso).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            timeZone: 'Asia/Kolkata',
        });
    } catch { return '-'; }
};

// eslint-disable-next-line no-unused-vars
const AdminContactList = ({ isLight, viewportWidth, token, themeVars }) => {
    const navigate = useNavigate();
    const isMobile = viewportWidth <= 768;

    const [submissions, setSubmissions] = useState([]);
    const [stats, setStats] = useState({
        total: 0, new: 0, in_progress: 0, resolved: 0,
        sales_partnership: 0, homepage_leads: 0, unattended: 0, urgent_high: 0,
    });
    const [pageInfo, setPageInfo] = useState({ current: 1, total: 1, total_items: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [inquiryFilter, setInquiryFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);

    const [expandedId, setExpandedId] = useState(null);
    const [assignableUsers, setAssignableUsers] = useState([]);
    const [actionLoading, setActionLoading] = useState({});
    const [replyTexts, setReplyTexts] = useState({});
    const [noteTexts, setNoteTexts] = useState({});
    const [tagInputs, setTagInputs] = useState({});
    const [recipientsOpen, setRecipientsOpen] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Debounce search
    const searchTimer = useRef(null);
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(searchTimer.current);
    }, [search]);

    const buildQuery = useCallback(() => {
        const p = new URLSearchParams();
        if (statusFilter) p.set('status', statusFilter);
        if (inquiryFilter) p.set('inquiry_type', inquiryFilter);
        if (priorityFilter) p.set('priority', priorityFilter);
        if (sourceFilter) p.set('source', sourceFilter);
        if (debouncedSearch) p.set('q', debouncedSearch);
        p.set('page', String(page));
        p.set('page_size', '50');
        return p.toString();
    }, [statusFilter, inquiryFilter, priorityFilter, sourceFilter, debouncedSearch, page]);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError('');
        const url = apiUrl(`/admin-panel/contact-submissions/?${buildQuery()}`);
        // Read token fresh from localStorage at call time so we never
        // race the parent's first render.
        const authToken = _readAdminToken(token);
        try {
            const res = await fetch(url, {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            });
            if (res.status === 401 || res.status === 403) {
                console.warn('[ContactInbox] auth rejected', res.status);
                navigate(adminUrl());
                return;
            }
            const text = await res.text();
            if (!res.ok) {
                console.error('[ContactInbox] non-ok response', res.status, text);
                setError(`Failed to load submissions (HTTP ${res.status})`);
                setSubmissions([]);
                return;
            }
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseErr) {
                console.error('[ContactInbox] JSON parse failed', parseErr, text.slice(0, 200));
                setError('Server returned an invalid response');
                setSubmissions([]);
                return;
            }
            setSubmissions(data.results || []);
            setStats(data.stats || {});
            setPageInfo(data.page || { current: 1, total: 1, total_items: 0 });
        } catch (err) {
            console.error('[ContactInbox] fetch failed', err);
            setError('Network error while loading submissions');
        } finally {
            setLoading(false);
        }
    }, [buildQuery, token, navigate]);

    useEffect(() => {
        // fetchList reads the token fresh from localStorage at call time,
        // so we can run it unconditionally — no risk of a stale-token race.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchList();
    }, [fetchList]);

    // Silently refresh only the stats counters after an action — no loading spinner.
    const refreshStats = useCallback(async () => {
        const authToken = _readAdminToken(token);
        try {
            const res = await fetch(apiUrl(`/admin-panel/contact-submissions/?${buildQuery()}`), {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                setStats(data.stats || {});
            }
        } catch { /* non-critical */ }
    }, [buildQuery, token]);

    // Fetch the active-recipient pool used by the per-row Assignee dropdown.
    // Re-run on mount, when the recipients modal closes, and whenever the
    // submissions list refreshes (cheap; the endpoint caps at 200 rows).
    const fetchAssignableUsers = useCallback(async () => {
        const authToken = _readAdminToken(token);
        try {
            const res = await fetch(apiUrl('/admin-panel/contact-submissions/assignable-users/'), {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            });
            if (res.ok) {
                const data = await res.json();
                setAssignableUsers(data.users || data.recipients || []);
            }
        } catch { /* non-critical */ }
    }, [token]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAssignableUsers();
    }, [fetchAssignableUsers]);

    // Generic action runner with optimistic updates.
    // Pass optimisticPatch to apply immediately; originalRow to revert on failure.
    const runAction = useCallback(async (submissionId, path, body, actionKey, optimisticPatch, originalRow) => {
        const key = `${submissionId}:${actionKey}`;
        const authToken = _readAdminToken(token);

        // Apply optimistic update instantly — UI reflects change before server responds
        if (optimisticPatch) {
            setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, ...optimisticPatch } : s));
        }

        setActionLoading(prev => ({ ...prev, [key]: true }));
        try {
            const res = await fetch(apiUrl(`/admin-panel/contact-submissions/${submissionId}/${path}/`), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body || {}),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                // Revert to original on failure
                if (originalRow) setSubmissions(prev => prev.map(s => s.id === submissionId ? originalRow : s));
                alert(data.error || 'Action failed');
                return null;
            }
            // Reconcile with real server data
            setSubmissions(prev => prev.map(s => s.id === submissionId ? data : s));
            refreshStats();
            return data;
        } catch {
            if (originalRow) setSubmissions(prev => prev.map(s => s.id === submissionId ? originalRow : s));
            alert('Network error');
            return null;
        } finally {
            setActionLoading(prev => ({ ...prev, [key]: false }));
        }
    }, [token, refreshStats]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const authToken = _readAdminToken(token);
            const res = await fetch(apiUrl(`/admin-panel/contact-submissions/export.csv?${buildQuery()}`), {
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            });
            if (!res.ok) {
                alert(`Export failed (HTTP ${res.status})`);
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '').replace(/-/g, '');
            a.download = `contact_submissions_${ts}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            alert('Network error during export');
        } finally {
            setExporting(false);
        }
    };

    const handleStatusChange = (s, newStatus) =>
        runAction(s.id, 'status', { status: newStatus }, `status-${newStatus}`,
            { status: newStatus }, s);

    const handlePriorityChange = (s, newPriority) =>
        runAction(s.id, 'priority', { priority: newPriority }, `priority-${newPriority}`,
            { priority: newPriority }, s);

    const handleAssignChange = (s, recipientId) => {
        const user = recipientId
            ? assignableUsers.find(u => String(u.id) === String(recipientId)) || null
            : null;
        runAction(s.id, 'assign', { recipient_id: recipientId || null }, 'assign',
            { assigned_to: user }, s);
    };

    const handleAddNote = async (s) => {
        const note = (noteTexts[s.id] || '').trim();
        if (!note) return;
        const updated = await runAction(s.id, 'notes', { note }, 'note', null, s);
        if (updated) setNoteTexts(prev => ({ ...prev, [s.id]: '' }));
    };

    const handleAddTag = async (s) => {
        const tag = (tagInputs[s.id] || '').trim();
        if (!tag) return;
        const updated = await runAction(s.id, 'tags', { add: [tag] }, `tag-add-${tag}`,
            { tags: [...(s.tags || []), tag] }, s);
        if (updated) setTagInputs(prev => ({ ...prev, [s.id]: '' }));
    };

    const handleRemoveTag = (s, tag) =>
        runAction(s.id, 'tags', { remove: [tag] }, `tag-remove-${tag}`,
            { tags: (s.tags || []).filter(t => t !== tag) }, s);

    const handleSetFollowUp = (s, date) =>
        runAction(s.id, 'follow-up', { follow_up_date: date || null }, 'follow-up',
            { follow_up_date: date || null }, s);

    const handleMarkContacted = (s) =>
        runAction(s.id, 'contacted', {}, 'contacted',
            { last_contacted_at: new Date().toISOString() }, s);

    const handleSendReply = async (s) => {
        const message = (replyTexts[s.id] || '').trim();
        if (!message) return;
        if (!window.confirm(`Send this reply email to ${s.email}?`)) return;
        const updated = await runAction(s.id, 'reply', { message }, 'reply',
            { admin_reply_text: message, admin_reply_sent_at: new Date().toISOString() }, s);
        if (updated) setReplyTexts(prev => ({ ...prev, [s.id]: '' }));
    };

    const summaryCards = useMemo(() => ([
        { key: 'all', filterStatus: '', label: 'Total Submissions', value: stats.total, color: '#3b82f6', icon: Inbox },
        { key: 'unattended', filterStatus: 'NEW', label: 'Unattended', value: stats.unattended, color: '#f59e0b', icon: AlertCircle, hint: 'New + In Progress' },
        { key: 'urgent', filterStatus: '', label: 'Urgent / High', value: stats.urgent_high, color: '#ef4444', icon: Flag, hint: 'Open & high priority' },
        { key: 'sales_partnership', filterStatus: '', label: 'Sales & Partnership', value: stats.sales_partnership, color: '#8b5cf6', icon: MessageSquare, hint: 'Revenue-relevant inquiries' },
        { key: 'homepage_leads', filterStatus: '', label: 'Homepage Leads', value: stats.homepage_leads, color: '#06b6d4', icon: UserPlus, hint: 'From popup' },
        { key: 'resolved', filterStatus: 'RESOLVED', label: 'Resolved', value: stats.resolved, color: '#10b981', icon: CheckCircle2 },
    ]), [stats]);

    const onCardClick = (card) => {
        if (card.key === 'urgent') {
            setPriorityFilter(p => (p === 'URGENT' || p === 'HIGH' ? '' : 'URGENT'));
            return;
        }
        if (card.key === 'sales_partnership') {
            setInquiryFilter(p => (p === 'Sales' ? 'Partnership' : p === 'Partnership' ? '' : 'Sales'));
            return;
        }
        if (card.key === 'homepage_leads') {
            setSourceFilter(p => (p === 'home_page_lead' ? '' : 'home_page_lead'));
            return;
        }
        setStatusFilter(card.filterStatus);
        setPage(1);
    };

    return (
        <div style={{ ...themeVars, padding: isMobile ? 12 : 24 }}>
            {/* Summary cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: isMobile ? 12 : 18,
                marginBottom: 24,
            }}>
                {summaryCards.map(card => {
                    const active = (
                        (card.key === 'urgent' && (priorityFilter === 'URGENT' || priorityFilter === 'HIGH'))
                        || (card.key === 'sales_partnership' && (inquiryFilter === 'Sales' || inquiryFilter === 'Partnership'))
                        || (card.key === 'homepage_leads' && sourceFilter === 'home_page_lead')
                        || (card.key === 'unattended' && statusFilter === 'NEW')
                        || (card.key === 'resolved' && statusFilter === 'RESOLVED')
                        || (card.key === 'all' && !statusFilter && !priorityFilter && !inquiryFilter && !sourceFilter)
                    );
                    return (
                        <button
                            key={card.key}
                            type="button"
                            onClick={() => onCardClick(card)}
                            style={{
                                textAlign: 'left',
                                padding: 20,
                                background: 'var(--admin-surface)',
                                borderRadius: 20,
                                border: `1px solid ${active ? card.color : 'var(--admin-border-soft)'}`,
                                boxShadow: active ? `0 8px 22px -8px ${card.color}40` : '0 6px 16px rgba(0,0,0,0.02)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: `${card.color}15`, color: card.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <card.icon size={18} />
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {card.label}
                                </span>
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--admin-text-primary)', lineHeight: 1 }}>
                                {card.value ?? 0}
                            </div>
                            {card.hint && (
                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 6, fontWeight: 600 }}>
                                    {card.hint}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Filter bar */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 20,
                padding: 16,
                background: 'var(--admin-surface)',
                borderRadius: 16,
                border: '1px solid var(--admin-border-soft)',
            }}>
                <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, email, phone..."
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 36px',
                            borderRadius: 10,
                            border: '1px solid var(--admin-border-soft)',
                            background: 'var(--admin-row-alt)',
                            color: 'var(--admin-text-primary)',
                            fontSize: 13,
                            outline: 'none',
                        }}
                    />
                </div>
                {[
                    { value: statusFilter, set: setStatusFilter, options: STATUS_OPTIONS },
                    { value: inquiryFilter, set: setInquiryFilter, options: INQUIRY_OPTIONS },
                    { value: priorityFilter, set: setPriorityFilter, options: PRIORITY_OPTIONS },
                    { value: sourceFilter, set: setSourceFilter, options: SOURCE_OPTIONS },
                ].map((f, i) => (
                    <select
                        key={i}
                        value={f.value}
                        onChange={(e) => { f.set(e.target.value); setPage(1); }}
                        style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            border: '1px solid var(--admin-border-soft)',
                            background: 'var(--admin-row-alt)',
                            color: 'var(--admin-text-primary)',
                            fontSize: 13,
                            cursor: 'pointer',
                            minWidth: 140,
                        }}
                    >
                        {f.options.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ))}
                <button
                    onClick={() => { fetchList(); }}
                    disabled={loading}
                    style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--admin-border-soft)',
                        background: 'var(--admin-row-alt)',
                        color: 'var(--admin-text-secondary)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
                </button>
                <button
                    onClick={() => handleExport()}
                    disabled={exporting}
                    style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(16,185,129,0.25)',
                        background: 'rgba(16,185,129,0.12)',
                        color: '#10b981',
                        cursor: exporting ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <Download size={14} className={exporting ? 'spin' : ''} />
                    {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
                <button
                    onClick={() => setRecipientsOpen(true)}
                    style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid rgba(168,85,247,0.25)',
                        background: 'rgba(168,85,247,0.12)',
                        color: '#c084fc',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <Users size={14} /> Manage Recipients
                </button>
            </div>

            {error && (
                <div style={{ padding: 16, background: '#fef2f2', color: '#b91c1c', borderRadius: 12, marginBottom: 16, fontSize: 13, fontWeight: 700 }}>
                    {error}
                </div>
            )}

            {/* List */}
            {loading ? (
                <div style={{ padding: 80, textAlign: 'center', color: 'var(--admin-text-muted)', background: 'var(--admin-surface)', borderRadius: 20 }}>
                    <RefreshCw className="spin" size={28} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <div style={{ fontWeight: 700 }}>Loading submissions...</div>
                </div>
            ) : submissions.length === 0 ? (
                <div style={{ padding: 80, textAlign: 'center', color: 'var(--admin-text-muted)', background: 'var(--admin-surface)', borderRadius: 20 }}>
                    <Inbox size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <div style={{ fontWeight: 700, fontSize: 15 }}>No contact submissions match your filters</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {submissions.map(s => (
                        <SubmissionRow
                            key={s.id}
                            s={s}
                            isMobile={isMobile}
                            expanded={expandedId === s.id}
                            onToggle={() => {
                                const next = expandedId === s.id ? null : s.id;
                                setExpandedId(next);
                                // Refresh the recipient pool whenever a row
                                // is expanded so the dropdown is always live.
                                if (next !== null) fetchAssignableUsers();
                            }}
                            assignableUsers={assignableUsers}
                            actionLoading={actionLoading}
                            noteText={noteTexts[s.id] || ''}
                            setNoteText={(v) => setNoteTexts(prev => ({ ...prev, [s.id]: v }))}
                            replyText={replyTexts[s.id] || ''}
                            setReplyText={(v) => setReplyTexts(prev => ({ ...prev, [s.id]: v }))}
                            tagInput={tagInputs[s.id] || ''}
                            setTagInput={(v) => setTagInputs(prev => ({ ...prev, [s.id]: v }))}
                            onStatus={handleStatusChange}
                            onPriority={handlePriorityChange}
                            onAssign={handleAssignChange}
                            onAddNote={handleAddNote}
                            onAddTag={handleAddTag}
                            onRemoveTag={handleRemoveTag}
                            onSetFollowUp={handleSetFollowUp}
                            onMarkContacted={handleMarkContacted}
                            onSendReply={handleSendReply}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pageInfo.total > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24, fontSize: 13, color: 'var(--admin-text-secondary)' }}>
                    <button
                        disabled={page <= 1 || loading}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        style={paginationBtnStyle(page <= 1)}
                    >Previous</button>
                    <span style={{ fontWeight: 700 }}>
                        Page {pageInfo.current} of {pageInfo.total} · {pageInfo.total_items} total
                    </span>
                    <button
                        disabled={page >= pageInfo.total || loading}
                        onClick={() => setPage(p => Math.min(pageInfo.total, p + 1))}
                        style={paginationBtnStyle(page >= pageInfo.total)}
                    >Next</button>
                </div>
            )}

            <ManageRecipientsModal
                open={recipientsOpen}
                onClose={() => {
                    setRecipientsOpen(false);
                    // Recipients pool may have changed — refresh the
                    // assignee dropdown so newly-added entries show up.
                    fetchAssignableUsers();
                }}
                token={token}
                themeVars={themeVars}
            />
        </div>
    );
};

const paginationBtnStyle = (disabled) => ({
    padding: '8px 16px',
    borderRadius: 10,
    border: '1px solid var(--admin-border-soft)',
    background: 'var(--admin-surface)',
    color: 'var(--admin-text-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    fontWeight: 700,
    fontSize: 12,
});

// ───────────────────────────────────────────────────────────────────────────

const SubmissionRow = ({
    s, isMobile, expanded, onToggle, assignableUsers, actionLoading,
    noteText, setNoteText, replyText, setReplyText, tagInput, setTagInput,
    onStatus, onPriority, onAssign, onAddNote, onAddTag, onRemoveTag,
    onSetFollowUp, onMarkContacted, onSendReply,
}) => {
    const statusColor = STATUS_COLORS[s.status] || '#94a3b8';
    const priorityColor = PRIORITY_COLORS[s.priority] || '#94a3b8';
    const isLoading = (key) => Boolean(actionLoading[`${s.id}:${key}`]);

    return (
        <div style={{
            background: 'var(--admin-surface)',
            borderRadius: 20,
            border: `1px solid ${expanded ? statusColor : 'var(--admin-border-soft)'}`,
            overflow: 'hidden',
            boxShadow: expanded ? '0 12px 32px rgba(0,0,0,0.06)' : '0 4px 8px rgba(0,0,0,0.01)',
            transition: 'all 0.25s',
        }}>
            {/* Header */}
            <div
                onClick={onToggle}
                style={{ padding: isMobile ? 16 : 22, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20, flexWrap: isMobile ? 'wrap' : 'nowrap' }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={badgeStyle(statusColor)}>{s.status.replace('_', ' ')}</span>
                        <span style={badgeStyle(priorityColor)}>{s.priority}</span>
                        <span style={mutedBadgeStyle}>{s.inquiry_type}</span>
                        {s.source === 'home_page_lead' && (
                            <span style={{ ...mutedBadgeStyle, background: '#06b6d415', color: '#06b6d4' }}>POPUP</span>
                        )}
                        {(s.tags || []).slice(0, 3).map(t => (
                            <span key={t} style={{ ...mutedBadgeStyle, background: '#a855f715', color: '#a855f7' }}>#{t}</span>
                        ))}
                    </div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                        {s.full_name}
                    </h3>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4, fontWeight: 600, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={12} /> {s.email}
                        </span>
                        {s.phone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Phone size={12} /> {s.phone}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--admin-text-muted)', minWidth: 140 }}>
                    <div style={{ fontWeight: 700, color: 'var(--admin-text-secondary)' }}>{formatDate(s.created_at)}</div>
                    {s.assigned_to && (
                        <div style={{ marginTop: 4 }}>Assigned: <span style={{ fontWeight: 700 }}>{s.assigned_to.full_name}</span></div>
                    )}
                </div>
                <ChevronDown
                    size={20}
                    style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--admin-text-muted)' }}
                />
            </div>

            {/* Expanded */}
            {expanded && (
                <div style={{
                    padding: isMobile ? '0 16px 20px' : '0 24px 24px',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
                    gap: 20,
                }}>
                    {/* ── Left column ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Services / Message */}
                        {s.source === 'home_page_lead' ? (
                            <Section title="Services Requested" icon={FileText}>
                                {s.message ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {s.message.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                                            <span key={tag} style={{
                                                padding: '5px 14px', borderRadius: 999,
                                                fontSize: 12, fontWeight: 700,
                                                background: 'rgba(34,197,94,0.1)',
                                                color: 'rgb(34,197,94)',
                                                border: '1px solid rgba(34,197,94,0.2)',
                                                letterSpacing: '0.02em',
                                            }}>{tag}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--admin-text-muted)' }}>No services selected.</span>
                                )}
                            </Section>
                        ) : (
                            <Section title="Message" icon={FileText}>
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14, color: 'var(--admin-text-primary)' }}>
                                    {s.message || <span style={{ fontStyle: 'italic', color: 'var(--admin-text-muted)' }}>(no message)</span>}
                                </p>
                            </Section>
                        )}

                        {/* Reply via email */}
                        <Section title="Reply to Submitter" icon={Send}>
                            {s.admin_reply_sent_at && (
                                <div style={{
                                    padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                                    background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)',
                                    display: 'flex', flexDirection: 'column', gap: 4,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#10b981' }}>
                                        <Send size={11} /> Sent {formatDate(s.admin_reply_sent_at)}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.5 }}>
                                        {s.admin_reply_text}
                                    </div>
                                </div>
                            )}
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={`Write a reply to ${s.email}…`}
                                rows={3}
                                style={{ ...inputStyle, width: '100%', resize: 'vertical', minHeight: 80, fontFamily: 'inherit', lineHeight: 1.6 }}
                            />
                            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => onSendReply(s)}
                                    disabled={!replyText.trim() || isLoading('reply')}
                                    style={{
                                        ...primaryBtnStyle(!replyText.trim() || isLoading('reply'), '#10b981'),
                                        display: 'inline-flex', alignItems: 'center', gap: 7,
                                        padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                                    }}
                                >
                                    <Send size={13} />
                                    {isLoading('reply') ? 'Sending…' : 'Send Reply Email'}
                                </button>
                            </div>
                        </Section>

                        {/* Internal Notes */}
                        <Section title="Internal Notes" icon={FileText}>
                            {s.admin_notes ? (
                                <div style={{
                                    padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                                    background: 'var(--admin-bg, #0d1b2a)', border: '1px solid var(--admin-border-soft)',
                                    fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.65,
                                    whiteSpace: 'pre-wrap',
                                }}>{s.admin_notes}</div>
                            ) : (
                                <p style={{ margin: '0 0 12px', fontSize: 13, fontStyle: 'italic', color: 'var(--admin-text-muted)' }}>No notes yet.</p>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder="Add an internal note…"
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <button
                                    onClick={() => onAddNote(s)}
                                    disabled={!noteText.trim() || isLoading('note')}
                                    style={{ ...primaryBtnStyle(!noteText.trim() || isLoading('note')), padding: '8px 16px', borderRadius: 9, fontWeight: 700 }}
                                >Add</button>
                            </div>
                        </Section>

                        {/* Activity timeline */}
                        {(s.activities || []).length > 0 && (
                            <Section title="Activity" icon={History}>
                                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 240, overflowY: 'auto' }}>
                                    {s.activities.map((a, idx) => (
                                        <div key={a.id} style={{ display: 'flex', gap: 12, paddingBottom: 12 }}>
                                            {/* Timeline line + dot */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                                <div style={{
                                                    width: 8, height: 8, borderRadius: '50%', marginTop: 4,
                                                    background: a.action.includes('status') ? '#f59e0b'
                                                        : a.action.includes('reply') ? '#10b981'
                                                        : a.action.includes('note') ? '#8b5cf6'
                                                        : '#3b82f6',
                                                    flexShrink: 0,
                                                }} />
                                                {idx < s.activities.length - 1 && (
                                                    <div style={{ width: 1, flex: 1, background: 'var(--admin-border-soft)', marginTop: 4 }} />
                                                )}
                                            </div>
                                            <div style={{ flex: 1, paddingBottom: 4 }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-primary)', textTransform: 'capitalize' }}>
                                                    {a.action.replace(/_/g, ' ')}
                                                    {a.from_value && a.to_value && (
                                                        <span style={{ fontWeight: 500, color: 'var(--admin-text-muted)' }}> · {a.from_value} → {a.to_value}</span>
                                                    )}
                                                    {!a.from_value && a.to_value && (
                                                        <span style={{ fontWeight: 500, color: 'var(--admin-text-muted)' }}> · {a.to_value}</span>
                                                    )}
                                                </div>
                                                {a.detail && <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 2 }}>{a.detail}</div>}
                                                <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 3 }}>
                                                    {a.actor_username || 'system'} · {formatDate(a.created_at)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </div>

                    {/* ── Right column — actions ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                        {/* Status */}
                        <ControlCard label="Status">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                                {STATUS_OPTIONS.filter(o => o.value).map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => onStatus(s, opt.value)}
                                        disabled={s.status === opt.value || isLoading(`status-${opt.value}`)}
                                        style={{
                                            padding: '7px 4px', borderRadius: 8, border: '1px solid',
                                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            borderColor: s.status === opt.value ? STATUS_COLORS[opt.value] : 'var(--admin-border-soft)',
                                            background: s.status === opt.value ? `${STATUS_COLORS[opt.value]}22` : 'transparent',
                                            color: s.status === opt.value ? STATUS_COLORS[opt.value] : 'var(--admin-text-muted)',
                                        }}
                                    >{opt.label}</button>
                                ))}
                            </div>
                        </ControlCard>

                        {/* Priority */}
                        <ControlCard label="Priority">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                {PRIORITY_OPTIONS.filter(o => o.value).map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => onPriority(s, opt.value)}
                                        disabled={s.priority === opt.value || isLoading(`priority-${opt.value}`)}
                                        style={{
                                            padding: '7px 4px', borderRadius: 8, border: '1px solid',
                                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            borderColor: s.priority === opt.value ? PRIORITY_COLORS[opt.value] : 'var(--admin-border-soft)',
                                            background: s.priority === opt.value ? `${PRIORITY_COLORS[opt.value]}22` : 'transparent',
                                            color: s.priority === opt.value ? PRIORITY_COLORS[opt.value] : 'var(--admin-text-muted)',
                                        }}
                                    >{opt.label}</button>
                                ))}
                            </div>
                        </ControlCard>

                        {/* Assignee */}
                        <ControlCard label="Assignee">
                            <select
                                value={s.assigned_to ? s.assigned_to.id : ''}
                                onChange={(e) => onAssign(s, e.target.value || null)}
                                style={{ ...inputStyle, width: '100%', fontWeight: 600 }}
                            >
                                <option value="">Unassigned</option>
                                {assignableUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name}</option>
                                ))}
                            </select>
                            {assignableUsers.length === 0 && (
                                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--admin-text-muted)' }}>
                                    No recipients yet — add in <strong>Manage Recipients</strong>.
                                </div>
                            )}
                        </ControlCard>

                        {/* Follow-up + Outreach */}
                        <ControlCard label="Follow-up Date">
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                    type="date"
                                    value={s.follow_up_date || ''}
                                    onChange={(e) => onSetFollowUp(s, e.target.value)}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                {s.follow_up_date && (
                                    <button onClick={() => onSetFollowUp(s, null)} style={primaryBtnStyle(false, '#94a3b8')}>Clear</button>
                                )}
                            </div>
                        </ControlCard>

                        <ControlCard label="Outreach">
                            <button
                                onClick={() => onMarkContacted(s)}
                                disabled={isLoading('contacted')}
                                style={{
                                    ...primaryBtnStyle(isLoading('contacted'), '#3b82f6'),
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: 7, padding: '9px 14px', borderRadius: 9, fontWeight: 700, fontSize: 13,
                                }}
                            >
                                <Phone size={13} /> Mark contacted now
                            </button>
                            {s.last_contacted_at && (
                                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--admin-text-muted)', textAlign: 'center' }}>
                                    Last: {formatDate(s.last_contacted_at)}
                                </div>
                            )}
                        </ControlCard>

                        {/* Tags */}
                        <ControlCard label="Tags">
                            {(s.tags || []).length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                    {s.tags.map(t => (
                                        <span
                                            key={t}
                                            onClick={() => onRemoveTag(s, t)}
                                            title="Click to remove"
                                            style={{
                                                padding: '3px 10px', background: 'rgba(168,85,247,0.1)',
                                                color: '#a855f7', borderRadius: 999, fontSize: 11,
                                                fontWeight: 700, cursor: 'pointer',
                                                border: '1px solid rgba(168,85,247,0.2)',
                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                            }}
                                        >#{t} <span style={{ opacity: 0.7, fontSize: 13, lineHeight: 1 }}>×</span></span>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') onAddTag(s); }}
                                    placeholder="Add a tag…"
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <button
                                    onClick={() => onAddTag(s)}
                                    disabled={!tagInput.trim()}
                                    style={{ ...primaryBtnStyle(!tagInput.trim(), '#a855f7'), padding: '8px 12px', borderRadius: 9 }}
                                ><Tag size={13} /></button>
                            </div>
                        </ControlCard>

                        {s.jira_ticket_key && (
                            <ControlCard label="Jira">
                                <a
                                    href={`${(typeof window !== 'undefined' && window.JIRA_BASE_URL) || ''}/browse/${s.jira_ticket_key}`}
                                    target="_blank" rel="noreferrer"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        color: '#3b82f6', textDecoration: 'none', fontWeight: 700, fontSize: 13,
                                    }}
                                >
                                    {s.jira_ticket_key} <ExternalLink size={13} />
                                </a>
                            </ControlCard>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ───────────────────────────────────────────────────────────────────────────
// Small styled helpers

const Section = ({ title, icon, children }) => {
    const IconComp = icon;
    return (
        <div style={{ padding: 18, background: 'var(--admin-row-alt)', borderRadius: 16, border: '1px solid var(--admin-border-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 11, fontWeight: 900, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <IconComp size={13} /> {title}
            </div>
            {children}
        </div>
    );
};

const ControlCard = ({ label, children }) => (
    <div style={{ padding: 14, background: 'var(--admin-row-alt)', borderRadius: 14, border: '1px solid var(--admin-border-soft)' }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {label}
        </div>
        {children}
    </div>
);

const badgeStyle = (color) => ({
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 900,
    background: `${color}15`,
    color,
    border: `1px solid ${color}30`,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
});

const mutedBadgeStyle = {
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 800,
    background: 'var(--admin-border-soft)',
    color: 'var(--admin-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
};

const inputStyle = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--admin-border-soft)',
    background: 'var(--admin-surface)',
    color: 'var(--admin-text-primary)',
    fontSize: 13,
    outline: 'none',
};

const primaryBtnStyle = (disabled, color = '#3b82f6') => ({
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: disabled ? `${color}40` : color,
    color: '#fff',
    fontWeight: 700,
    fontSize: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
});

const pillBtnStyle = (active, color) => ({
    padding: '8px 12px',
    borderRadius: 10,
    border: `1px solid ${active ? color : 'var(--admin-border-soft)'}`,
    background: active ? `${color}15` : 'var(--admin-surface)',
    color: active ? color : 'var(--admin-text-secondary)',
    fontWeight: 800,
    fontSize: 12,
    cursor: active ? 'default' : 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
});

export default AdminContactList;
