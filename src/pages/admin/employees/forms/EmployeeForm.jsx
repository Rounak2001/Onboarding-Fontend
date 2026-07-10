import { useState } from 'react';
import { X } from 'lucide-react';
import { ROLES, SATURDAY_POLICIES } from '../staffApi';

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

// Create OR edit an employee. On edit, employee_id and password are omitted
// (identity key is immutable here; password reset is a separate flow).
export default function EmployeeForm({ initial, onSubmit, onClose, saving, error }) {
    const editing = Boolean(initial?.id);
    const [form, setForm] = useState({
        employee_id: initial?.employee_id || '',
        name: initial?.name || '',
        email: initial?.email || '',
        password: '',
        phone: initial?.phone || '',
        role: initial?.role || 'employee',
        saturday_policy: initial?.saturday_policy || 'alt_sat_holiday',
        base_salary: initial?.base_salary ?? '',
    });
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            const payload = {
                name: form.name, email: form.email, phone: form.phone,
                role: form.role, saturday_policy: form.saturday_policy,
            };
            if (form.base_salary !== '' && form.base_salary !== null) {
                payload.base_salary = Number(form.base_salary);
            }
            onSubmit(payload);
        } else {
            onSubmit({
                employee_id: form.employee_id, name: form.name, email: form.email,
                password: form.password, phone: form.phone, role: form.role,
                saturday_policy: form.saturday_policy,
            });
        }
    };

    return (
        <div style={overlayStyle} onClick={onClose} role="presentation">
            <div style={modalStyle} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--admin-border-soft)' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{editing ? 'Edit employee' : 'Add employee'}</h3>
                    <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', padding: 4 }}>
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={submit} style={{ padding: 20 }}>
                    {!editing && (
                        <div style={fieldWrap}>
                            <label style={labelStyle}>Employee ID *</label>
                            <input style={inputStyle} value={form.employee_id} onChange={set('employee_id')} placeholder="e.g. EMP004" required />
                        </div>
                    )}
                    <div style={fieldWrap}>
                        <label style={labelStyle}>Full name *</label>
                        <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="e.g. Priya Menon" required />
                    </div>
                    <div style={fieldWrap}>
                        <label style={labelStyle}>Email *</label>
                        <input type="email" style={inputStyle} value={form.email} onChange={set('email')} placeholder="name@company.com" required />
                    </div>
                    {!editing && (
                        <div style={fieldWrap}>
                            <label style={labelStyle}>Temporary password *</label>
                            <input type="text" style={inputStyle} value={form.password} onChange={set('password')} placeholder="Employee can reset later" required />
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ ...fieldWrap, flex: 1 }}>
                            <label style={labelStyle}>Phone</label>
                            <input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="10-digit" />
                        </div>
                        <div style={{ ...fieldWrap, flex: 1 }}>
                            <label style={labelStyle}>Role</label>
                            <select style={inputStyle} value={form.role} onChange={set('role')}>
                                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ ...fieldWrap, flex: 1 }}>
                            <label style={labelStyle}>Saturday policy</label>
                            <select style={inputStyle} value={form.saturday_policy} onChange={set('saturday_policy')}>
                                {SATURDAY_POLICIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        {editing && (
                            <div style={{ ...fieldWrap, flex: 1 }}>
                                <label style={labelStyle}>Base salary (₹/mo)</label>
                                <input type="number" step="any" style={inputStyle} value={form.base_salary} onChange={set('base_salary')} placeholder="e.g. 30000" />
                            </div>
                        )}
                    </div>
                    {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</div>}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                        <button type="button" onClick={onClose} disabled={saving} style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: saving ? 'not-allowed' : 'pointer' }}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 800, background: saving ? 'rgba(59,130,246,0.4)' : '#3b82f6', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Saving…' : (editing ? 'Save changes' : 'Add employee')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
