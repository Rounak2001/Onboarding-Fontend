import { useState } from 'react';
import { Plus, Pencil, Archive } from 'lucide-react';
import {
    createKra, updateKra, archiveKra, createKpi, updateKpi, archiveKpi, READ_ONLY,
} from '../staffApi';
import { KraFormModal, KpiFormModal } from '../forms/KraKpiForms';
import { chip } from '../shared/StatusChip';
import { card, iconBtn } from '../shared/styles';

export default function KpiTab({ detail, token, onChanged }) {
    const [kraModal, setKraModal] = useState(null); // { mode, initial }
    const [kpiModal, setKpiModal] = useState(null); // { kraId, initial }
    const [saving, setSaving] = useState(false);
    const [formErr, setFormErr] = useState('');
    const kras = detail.kras || [];

    const errorText = (e) => {
        if (e?.data && typeof e.data === 'object') {
            const first = Object.values(e.data)[0];
            if (Array.isArray(first)) return first[0];
            if (typeof first === 'string') return first;
        }
        return e?.message || 'Something went wrong.';
    };

    const submitKra = async (payload) => {
        setSaving(true); setFormErr('');
        try {
            if (kraModal.initial?.id) await updateKra(token, kraModal.initial.id, payload);
            else await createKra(token, detail.id, payload);
            setKraModal(null);
            onChanged();
        } catch (e) { setFormErr(errorText(e)); } finally { setSaving(false); }
    };

    const submitKpi = async (payload) => {
        setSaving(true); setFormErr('');
        try {
            if (kpiModal.initial?.id) await updateKpi(token, kpiModal.initial.id, payload);
            else await createKpi(token, kpiModal.kraId, payload);
            setKpiModal(null);
            onChanged();
        } catch (e) { setFormErr(errorText(e)); } finally { setSaving(false); }
    };

    const onArchiveKra = async (kra) => {
        if (!window.confirm(`Archive KRA "${kra.title}" and its KPIs? This hides it from the employee.`)) return;
        try { await archiveKra(token, kra.id); onChanged(); } catch (e) { window.alert(errorText(e)); }
    };
    const onArchiveKpi = async (kpi) => {
        if (!window.confirm(`Archive KPI "${kpi.name}"?`)) return;
        try { await archiveKpi(token, kpi.id); onChanged(); } catch (e) { window.alert(errorText(e)); }
    };

    return (
        <div>
            {!READ_ONLY && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                    <button onClick={() => { setFormErr(''); setKraModal({ initial: null }); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 800, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        <Plus size={16} /> Add KRA
                    </button>
                </div>
            )}

            {kras.length === 0 && (
                <div style={{ ...card, textAlign: 'center', color: 'var(--admin-text-muted)', padding: 40 }}>
                    No KRAs yet. Add a result area, then define measurable KPIs beneath it.
                </div>
            )}

            {kras.map((kra) => (
                <div key={kra.id} style={{ ...card, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{kra.title}</div>
                            {kra.category && <span style={{ ...chip('rgba(139,92,246,0.15)', '#8b5cf6'), marginTop: 6 }}>{kra.category}</span>}
                            {kra.outcome_description && <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 8, maxWidth: 560 }}>{kra.outcome_description}</div>}
                        </div>
                        {!READ_ONLY && (
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                <button title="Edit KRA" onClick={() => { setFormErr(''); setKraModal({ initial: kra }); }} style={iconBtn}><Pencil size={15} /></button>
                                <button title="Add KPI" onClick={() => { setFormErr(''); setKpiModal({ kraId: kra.id, initial: null }); }} style={iconBtn}><Plus size={15} /></button>
                                <button title="Archive KRA" onClick={() => onArchiveKra(kra)} style={iconBtn}><Archive size={15} /></button>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(kra.kpis || []).length === 0 && <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No KPIs defined.</div>}
                        {(kra.kpis || []).map((kpi) => (
                            <div key={kpi.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 8, background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>{kpi.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                                        {kpi.metric_type}{kpi.target_value != null ? ` · target ${kpi.target_value}${kpi.unit ? ' ' + kpi.unit : ''}` : ''} · {kpi.direction === 'lower' ? 'lower better' : 'higher better'}
                                    </div>
                                </div>
                                {!READ_ONLY && (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button title="Edit KPI" onClick={() => { setFormErr(''); setKpiModal({ kraId: kra.id, initial: kpi }); }} style={iconBtn}><Pencil size={14} /></button>
                                        <button title="Archive KPI" onClick={() => onArchiveKpi(kpi)} style={iconBtn}><Archive size={14} /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {kraModal && <KraFormModal initial={kraModal.initial} onSubmit={submitKra} onClose={() => setKraModal(null)} saving={saving} error={formErr} />}
            {kpiModal && <KpiFormModal initial={kpiModal.initial} onSubmit={submitKpi} onClose={() => setKpiModal(null)} saving={saving} error={formErr} />}
        </div>
    );
}
