import { useState } from 'react';
import { X } from 'lucide-react';
import { METRIC_TYPES, DIRECTIONS } from './staffApi';

const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};

const modalStyle = {
    background: 'var(--admin-surface)', color: 'var(--admin-text-primary)',
    border: '1px solid var(--admin-border-mid)', borderRadius: 14,
    width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
};

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 6 };
const inputStyle = {
    width: '100%', padding: '9px 11px', borderRadius: 8, fontSize: 13,
    background: 'var(--admin-row-alt)', color: 'var(--admin-text-primary)',
    border: '1px solid var(--admin-border-mid)', outline: 'none', boxSizing: 'border-box',
};
const fieldWrap = { marginBottom: 14 };

function ModalShell({ title, onClose, children }) {
    return (
        <div style={overlayStyle} onClick={onClose} role="presentation">
            <div style={modalStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--admin-border-soft)' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h3>
                    <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', padding: 4 }}>
                        <X size={18} />
                    </button>
                </div>
                <div style={{ padding: 20 }}>{children}</div>
            </div>
        </div>
    );
}

function FormButtons({ onClose, saving, submitLabel }) {
    return (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: saving ? 'not-allowed' : 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 800, background: saving ? 'rgba(59,130,246,0.4)' : '#3b82f6', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Saving…' : submitLabel}</button>
        </div>
    );
}

export function KraFormModal({ initial, onSubmit, onClose, saving, error }) {
    const editing = Boolean(initial?.id);
    const [form, setForm] = useState({
        title: initial?.title || '',
        category: initial?.category || '',
        outcome_description: initial?.outcome_description || '',
        start_date: initial?.start_date || '',
        due_date: initial?.due_date || '',
    });
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = (e) => {
        e.preventDefault();
        const payload = { ...form };
        if (!payload.start_date) delete payload.start_date;
        if (!payload.due_date) delete payload.due_date;
        onSubmit(payload);
    };

    return (
        <ModalShell title={editing ? 'Edit KRA' : 'Add KRA'} onClose={onClose}>
            <form onSubmit={submit}>
                <div style={fieldWrap}>
                    <label style={labelStyle}>Title *</label>
                    <input style={inputStyle} value={form.title} onChange={set('title')} placeholder="e.g. Client Onboarding" required />
                </div>
                <div style={fieldWrap}>
                    <label style={labelStyle}>Category</label>
                    <input style={inputStyle} value={form.category} onChange={set('category')} placeholder="e.g. Delivery" />
                </div>
                <div style={fieldWrap}>
                    <label style={labelStyle}>Outcome description</label>
                    <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={form.outcome_description} onChange={set('outcome_description')} placeholder="What good looks like for this result area" />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ ...fieldWrap, flex: 1 }}>
                        <label style={labelStyle}>Start date</label>
                        <input type="date" style={inputStyle} value={form.start_date} onChange={set('start_date')} />
                    </div>
                    <div style={{ ...fieldWrap, flex: 1 }}>
                        <label style={labelStyle}>Due date</label>
                        <input type="date" style={inputStyle} value={form.due_date} onChange={set('due_date')} />
                    </div>
                </div>
                {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</div>}
                <FormButtons onClose={onClose} saving={saving} submitLabel={editing ? 'Save changes' : 'Add KRA'} />
            </form>
        </ModalShell>
    );
}

export function KpiFormModal({ initial, onSubmit, onClose, saving, error }) {
    const editing = Boolean(initial?.id);
    const [form, setForm] = useState({
        name: initial?.name || '',
        metric_type: initial?.metric_type || 'number',
        unit: initial?.unit || '',
        target_value: initial?.target_value ?? '',
        direction: initial?.direction || 'higher',
        update_frequency: initial?.update_frequency || 'daily',
        evidence_required: initial?.evidence_required || false,
    });
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = (e) => {
        e.preventDefault();
        const payload = { ...form };
        payload.target_value = payload.target_value === '' ? null : Number(payload.target_value);
        onSubmit(payload);
    };

    return (
        <ModalShell title={editing ? 'Edit KPI' : 'Add KPI'} onClose={onClose}>
            <form onSubmit={submit}>
                <div style={fieldWrap}>
                    <label style={labelStyle}>KPI name *</label>
                    <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="e.g. Clients onboarded" required />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ ...fieldWrap, flex: 1 }}>
                        <label style={labelStyle}>Metric type</label>
                        <select style={inputStyle} value={form.metric_type} onChange={set('metric_type')}>
                            {METRIC_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <div style={{ ...fieldWrap, flex: 1 }}>
                        <label style={labelStyle}>Unit</label>
                        <input style={inputStyle} value={form.unit} onChange={set('unit')} placeholder="clients, %, hrs…" />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ ...fieldWrap, flex: 1 }}>
                        <label style={labelStyle}>Target value</label>
                        <input type="number" step="any" style={inputStyle} value={form.target_value} onChange={set('target_value')} placeholder="e.g. 3" />
                    </div>
                    <div style={{ ...fieldWrap, flex: 1 }}>
                        <label style={labelStyle}>Direction</label>
                        <select style={inputStyle} value={form.direction} onChange={set('direction')}>
                            {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                    </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--admin-text-secondary)', marginBottom: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.evidence_required} onChange={(e) => setForm((f) => ({ ...f, evidence_required: e.target.checked }))} />
                    Require evidence with each update
                </label>
                {error && <div style={{ color: '#ef4444', fontSize: 12, margin: '8px 0' }}>{error}</div>}
                <FormButtons onClose={onClose} saving={saving} submitLabel={editing ? 'Save changes' : 'Add KPI'} />
            </form>
        </ModalShell>
    );
}
