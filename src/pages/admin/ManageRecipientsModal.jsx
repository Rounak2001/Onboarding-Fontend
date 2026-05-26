import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiUrl } from '../../utils/apiBase';
import { X, Plus, Trash2, Mail, Phone, User, Loader2, Check } from 'lucide-react';

const ManageRecipientsModal = ({ open, onClose, token, themeVars }) => {
    const [recipients, setRecipients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });

    const authHeaders = useCallback(() => {
        // Filter out literal "null"/"undefined" strings that some logout
        // flows leave behind in localStorage — they're truthy but invalid.
        const candidates = [token];
        if (typeof window !== 'undefined') candidates.push(window.localStorage.getItem('admin_token'));
        const t = candidates.find(v => typeof v === 'string' && v && v !== 'null' && v !== 'undefined') || '';
        return t
            ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
            : { 'Content-Type': 'application/json' };
    }, [token]);

    const fetchRecipients = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(apiUrl('/admin-panel/contact-submissions/recipients/'), {
                headers: authHeaders(),
            });
            if (!res.ok) {
                setError(`Failed to load recipients (HTTP ${res.status})`);
                return;
            }
            const data = await res.json();
            setRecipients(data.recipients || []);
        } catch {
            setError('Network error loading recipients');
        } finally {
            setLoading(false);
        }
    }, [authHeaders]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (open) fetchRecipients();
    }, [open, fetchRecipients]);

    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    const handleCreate = async (e) => {
        e.preventDefault();
        const name = form.name.trim();
        const email = form.email.trim();
        if (!name || !email) {
            setError('Name and email are required');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const res = await fetch(apiUrl('/admin-panel/contact-submissions/recipients/'), {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({
                    name, email,
                    phone: form.phone.trim(),
                    notes: form.notes.trim(),
                    is_active: true,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || `Failed to create (HTTP ${res.status})`);
                return;
            }
            setRecipients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setForm({ name: '', email: '', phone: '', notes: '' });
        } catch {
            setError('Network error creating recipient');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (r) => {
        try {
            const res = await fetch(apiUrl(`/admin-panel/contact-submissions/recipients/${r.id}/`), {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ is_active: !r.is_active }),
            });
            if (!res.ok) return;
            const data = await res.json();
            setRecipients(prev => prev.map(x => (x.id === r.id ? data : x)));
        } catch { /* swallow */ }
    };

    const handleDelete = async (r) => {
        if (!window.confirm(`Remove ${r.name} from notification recipients?`)) return;
        try {
            const res = await fetch(apiUrl(`/admin-panel/contact-submissions/recipients/${r.id}/`), {
                method: 'DELETE',
                headers: authHeaders(),
            });
            if (!res.ok) return;
            setRecipients(prev => prev.filter(x => x.id !== r.id));
        } catch { /* swallow */ }
    };

    if (!open) return null;

    const body = (
        <div
            onClick={onClose}
            style={{
                ...themeVars,
                position: 'fixed', inset: 0, zIndex: 10000,
                background: 'rgba(2, 6, 23, 0.6)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--admin-surface)',
                    borderRadius: 22,
                    width: '100%',
                    maxWidth: 720,
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    border: '1px solid var(--admin-border-soft)',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--admin-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                            Notification Recipients
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                            People here get an email the moment a new contact submission arrives.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: 'var(--admin-text-muted)', padding: 6, borderRadius: 8,
                        }}
                        aria-label="Close"
                    ><X size={20} /></button>
                </div>

                {/* Body */}
                <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Add new */}
                    <form
                        onSubmit={handleCreate}
                        style={{
                            padding: 18,
                            background: 'var(--admin-row-alt)',
                            border: '1px solid var(--admin-border-soft)',
                            borderRadius: 16,
                        }}
                    >
                        <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                            Add a recipient
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                            <Field icon={User} placeholder="Full name *" value={form.name} onChange={(v) => setForm(p => ({ ...p, name: v }))} />
                            <Field icon={Mail} placeholder="Email *" type="email" value={form.email} onChange={(v) => setForm(p => ({ ...p, email: v }))} />
                            <Field icon={Phone} placeholder="Phone (optional)" value={form.phone} onChange={(v) => setForm(p => ({ ...p, phone: v }))} />
                            <Field placeholder="Notes (optional)" value={form.notes} onChange={(v) => setForm(p => ({ ...p, notes: v }))} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12 }}>
                            <span style={{ fontSize: 12, color: error ? '#ef4444' : 'var(--admin-text-muted)', fontWeight: 600 }}>
                                {error || 'They\'ll be notified for every new submission.'}
                            </span>
                            <button
                                type="submit"
                                disabled={saving || !form.name.trim() || !form.email.trim()}
                                style={{
                                    padding: '10px 16px', borderRadius: 10, border: 'none',
                                    background: (!form.name.trim() || !form.email.trim() || saving) ? '#3b82f640' : '#3b82f6',
                                    color: '#fff', fontWeight: 800, fontSize: 12,
                                    cursor: (saving || !form.name.trim() || !form.email.trim()) ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                }}
                            >
                                {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                                {saving ? 'Adding...' : 'Add recipient'}
                            </button>
                        </div>
                    </form>

                    {/* List */}
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                            Current recipients ({recipients.length})
                        </div>
                        {loading ? (
                            <div style={{ padding: 30, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                                <Loader2 className="spin" size={20} />
                            </div>
                        ) : recipients.length === 0 ? (
                            <div style={{
                                padding: 30, textAlign: 'center',
                                color: 'var(--admin-text-muted)',
                                background: 'var(--admin-row-alt)',
                                border: '1px dashed var(--admin-border-soft)',
                                borderRadius: 14,
                                fontSize: 13, fontStyle: 'italic',
                            }}>
                                No recipients yet — add one above to start getting email notifications.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {recipients.map(r => (
                                    <div
                                        key={r.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 14px',
                                            background: 'var(--admin-row-alt)',
                                            border: `1px solid ${r.is_active ? '#10b98130' : 'var(--admin-border-soft)'}`,
                                            borderRadius: 12,
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--admin-text-primary)' }}>{r.name}</span>
                                                {!r.is_active && (
                                                    <span style={{
                                                        padding: '2px 7px', borderRadius: 6, fontSize: 9, fontWeight: 900,
                                                        background: 'var(--admin-border-soft)', color: 'var(--admin-text-muted)',
                                                        textTransform: 'uppercase',
                                                    }}>Paused</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                <span>{r.email}</span>
                                                {r.phone && <span>· {r.phone}</span>}
                                                {r.notes && <span>· {r.notes}</span>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleActive(r)}
                                            title={r.is_active ? 'Pause notifications' : 'Resume notifications'}
                                            style={{
                                                padding: '6px 10px', borderRadius: 8, border: '1px solid var(--admin-border-soft)',
                                                background: 'var(--admin-surface)',
                                                color: r.is_active ? '#10b981' : 'var(--admin-text-muted)',
                                                fontWeight: 800, fontSize: 11, cursor: 'pointer',
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                            }}
                                        >
                                            <Check size={12} /> {r.is_active ? 'Active' : 'Paused'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(r)}
                                            title="Remove"
                                            style={{
                                                padding: 8, borderRadius: 8, border: '1px solid #ef444430',
                                                background: '#ef444412', color: '#ef4444',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(body, document.body);
};

const Field = ({ icon, placeholder, value, onChange, type = 'text' }) => {
    const Icon = icon;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border-soft)',
        }}>
            {Icon && <Icon size={14} style={{ color: 'var(--admin-text-muted)' }} />}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--admin-text-primary)', fontSize: 13,
                }}
            />
        </div>
    );
};

export default ManageRecipientsModal;
