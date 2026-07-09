import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, Plus, Pencil, Archive, Target, ClipboardList,
    CalendarDays, Fingerprint, RefreshCw,
} from 'lucide-react';
import {
    fetchEmployeeDetail, fetchDailyUpdates,
    createKra, updateKra, archiveKra, createKpi, updateKpi, archiveKpi,
} from './staffApi';
import { KraFormModal, KpiFormModal } from './KraKpiForms';

const todayStr = () => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

const fmtTime = (iso) => {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            hour12: true, timeZone: 'Asia/Kolkata',
        });
    } catch { return ''; }
};

const chip = (bg, color) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11,
    fontWeight: 800, background: bg, color, border: `1px solid ${color}33`,
});

const card = {
    background: 'var(--admin-surface)', border: '1px solid var(--admin-border-soft)',
    borderRadius: 12, padding: 16,
};

const TABS = [
    { id: 'overview', label: 'Overview', icon: ClipboardList },
    { id: 'kpis', label: 'KRAs & KPIs', icon: Target },
    { id: 'updates', label: 'Daily updates', icon: CalendarDays },
    { id: 'attendance', label: 'Attendance', icon: Fingerprint },
];

export default function EmployeeDetail({ employeeId, token, onBack, isMobile }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('overview');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setDetail(await fetchEmployeeDetail(token, employeeId));
        } catch (e) {
            setError(e.message || 'Failed to load employee.');
        } finally {
            setLoading(false);
        }
    }, [token, employeeId]);

    useEffect(() => { load(); }, [load]);

    return (
        <div>
            <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--admin-text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 700, marginBottom: 14, padding: 0 }}>
                <ArrowLeft size={16} /> Back to team
            </button>

            {loading && <div style={{ color: 'var(--admin-text-muted)', padding: 24 }}>Loading…</div>}
            {error && !loading && (
                <div style={{ ...card, color: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{error}</span>
                    <button onClick={load} style={{ background: 'transparent', border: '1px solid var(--admin-border-mid)', borderRadius: 8, color: 'var(--admin-text-secondary)', padding: '6px 12px', cursor: 'pointer' }}>Retry</button>
                </div>
            )}

            {detail && !loading && (
                <>
                    <div style={{ ...card, marginBottom: 16 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--admin-text-primary)' }}>{detail.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 2 }}>{detail.employee_id} · {detail.email}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--admin-border-soft)', marginBottom: 16, overflowX: 'auto' }}>
                        {TABS.map((t) => {
                            const Icon = t.icon;
                            const active = tab === t.id;
                            return (
                                <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `2px solid ${active ? '#3b82f6' : 'transparent'}`, color: active ? '#3b82f6' : 'var(--admin-text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    <Icon size={15} /> {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {tab === 'overview' && <OverviewTab detail={detail} />}
                    {tab === 'kpis' && <KpiTab detail={detail} token={token} onChanged={load} />}
                    {tab === 'updates' && <UpdatesTab employeeId={employeeId} token={token} isMobile={isMobile} />}
                    {tab === 'attendance' && <AttendanceTab />}
                </>
            )}
        </div>
    );
}

function OverviewTab({ detail }) {
    const t = detail.today || {};
    const done = t.kpi_updated || 0;
    const total = t.kpi_total || 0;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={card}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>KPIs updated today</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--admin-text-primary)', marginTop: 6 }}>{done}<span style={{ fontSize: 16, color: 'var(--admin-text-muted)' }}> / {total}</span></div>
            </div>
            <div style={card}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Work summary today</div>
                <div style={{ marginTop: 10 }}>
                    {t.summary_present
                        ? <span style={chip('rgba(16,185,129,0.15)', '#10b981')}>Submitted</span>
                        : <span style={chip('rgba(245,158,11,0.15)', '#f59e0b')}>Missing</span>}
                </div>
                {t.summary_updated_at && <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 8 }}>Last edited {fmtTime(t.summary_updated_at)}</div>}
            </div>
            <div style={card}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active KRAs</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--admin-text-primary)', marginTop: 6 }}>{(detail.kras || []).length}</div>
            </div>
        </div>
    );
}

function KpiTab({ detail, token, onChanged }) {
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <button onClick={() => { setFormErr(''); setKraModal({ initial: null }); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 800, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    <Plus size={16} /> Add KRA
                </button>
            </div>

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
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button title="Edit KRA" onClick={() => { setFormErr(''); setKraModal({ initial: kra }); }} style={iconBtn}><Pencil size={15} /></button>
                            <button title="Add KPI" onClick={() => { setFormErr(''); setKpiModal({ kraId: kra.id, initial: null }); }} style={iconBtn}><Plus size={15} /></button>
                            <button title="Archive KRA" onClick={() => onArchiveKra(kra)} style={iconBtn}><Archive size={15} /></button>
                        </div>
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
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button title="Edit KPI" onClick={() => { setFormErr(''); setKpiModal({ kraId: kra.id, initial: kpi }); }} style={iconBtn}><Pencil size={14} /></button>
                                    <button title="Archive KPI" onClick={() => onArchiveKpi(kpi)} style={iconBtn}><Archive size={14} /></button>
                                </div>
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

const iconBtn = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, borderRadius: 7, background: 'var(--admin-border-soft)',
    color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: 'pointer',
};

function UpdatesTab({ employeeId, token, isMobile }) {
    const [date, setDate] = useState(todayStr());
    const [row, setRow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await fetchDailyUpdates(token, date, employeeId);
            setRow((data.feed || [])[0] || null);
        } catch (e) {
            setError(e.message || 'Failed to load updates.');
        } finally { setLoading(false); }
    }, [token, date, employeeId]);

    useEffect(() => { load(); }, [load]);

    return (
        <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, fontSize: 13, background: 'var(--admin-row-alt)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border-mid)' }} />
                <button onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: 'pointer' }}><RefreshCw size={14} /> Refresh</button>
            </div>

            {loading && <div style={{ color: 'var(--admin-text-muted)', padding: 20 }}>Loading…</div>}
            {error && !loading && <div style={{ ...card, color: '#ef4444' }}>{error}</div>}

            {!loading && !error && (
                <div style={card}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Work summary</div>
                    {row?.summary
                        ? <div style={{ fontSize: 14, color: 'var(--admin-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{row.summary}</div>
                        : <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>No summary submitted for this day.</div>}
                    {row?.summary_updated_at && <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 8 }}>Last edited {fmtTime(row.summary_updated_at)}</div>}

                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '18px 0 8px' }}>KPI values</div>
                    {(row?.kpi_values || []).length === 0 && <div style={{ fontSize: 13, color: 'var(--admin-text-muted)' }}>No KPI values recorded.</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(row?.kpi_values || []).map((v) => (
                            <div key={v.kpi_id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--admin-row-alt)', border: '1px solid var(--admin-border-soft)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>{v.kpi_name}</span>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#3b82f6' }}>
                                        {v.actual_value != null ? v.actual_value : '—'}{v.unit ? ` ${v.unit}` : ''}{v.target_value != null ? <span style={{ color: 'var(--admin-text-muted)', fontWeight: 600 }}> / {v.target_value}</span> : null}
                                    </span>
                                </div>
                                {v.note && <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 6 }}>{v.note}</div>}
                                {v.blockers && <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>Blocker: {v.blockers}</div>}
                                {v.next_step && <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>Next: {v.next_step}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function AttendanceTab() {
    return (
        <div style={{ ...card, textAlign: 'center', color: 'var(--admin-text-muted)', padding: 40 }}>
            <Fingerprint size={28} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>Attendance view coming with the GLR migration</div>
            <div style={{ fontSize: 12, marginTop: 6, maxWidth: 420, marginInline: 'auto' }}>
                Punch-in/out, hours and GPS are served by the GLR backend today. They appear here once attendance data is migrated (Phase 3), read-only.
            </div>
        </div>
    );
}
