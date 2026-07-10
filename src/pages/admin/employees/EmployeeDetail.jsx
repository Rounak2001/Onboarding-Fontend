import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, Plus, Pencil, Archive, Target, ClipboardList,
    CalendarDays, Fingerprint, RefreshCw, UserX, CalendarClock, Check, X as XIcon, IndianRupee,
} from 'lucide-react';
import {
    fetchEmployeeDetail, fetchDailyUpdates, fetchEmployeeAttendance,
    fetchEmployeeLeave, actionLeave, fetchEmployeePayroll,
    createKra, updateKra, archiveKra, createKpi, updateKpi, archiveKpi,
    updateEmployee, deactivateEmployee,
} from './staffApi';
import { KraFormModal, KpiFormModal } from './KraKpiForms';
import EmployeeForm from './EmployeeForm';

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
    { id: 'leave', label: 'Leave', icon: CalendarClock },
    { id: 'payroll', label: 'Payroll', icon: IndianRupee },
];

export default function EmployeeDetail({ employeeId, token, onBack, isMobile }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('overview');
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editErr, setEditErr] = useState('');

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

    const submitEdit = async (payload) => {
        setSaving(true); setEditErr('');
        try {
            await updateEmployee(token, employeeId, payload);
            setEditing(false);
            load();
        } catch (e) {
            setEditErr(e?.message || 'Failed to save.');
        } finally { setSaving(false); }
    };

    const doDeactivate = async () => {
        if (!window.confirm(`Deactivate ${detail?.name}? They will no longer appear in the team list or be able to log in.`)) return;
        try {
            await deactivateEmployee(token, employeeId);
            onBack();
        } catch (e) {
            window.alert(e?.message || 'Failed to deactivate.');
        }
    };

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
                    <div style={{ ...card, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--admin-text-primary)' }}>{detail.name}</div>
                            <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 2 }}>{detail.employee_id} · {detail.email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => { setEditErr(''); setEditing(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: 'pointer' }}>
                                <Pencil size={14} /> Edit
                            </button>
                            <button onClick={doDeactivate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer' }}>
                                <UserX size={14} /> Deactivate
                            </button>
                        </div>
                    </div>

                    {editing && (
                        <EmployeeForm
                            initial={detail}
                            onSubmit={submitEdit}
                            onClose={() => setEditing(false)}
                            saving={saving}
                            error={editErr}
                        />
                    )}

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
                    {tab === 'attendance' && <AttendanceTab employeeId={employeeId} token={token} />}
                    {tab === 'leave' && <LeaveTab employeeId={employeeId} token={token} />}
                    {tab === 'payroll' && <PayrollTab employeeId={employeeId} token={token} />}
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

const DAY_STATUS_STYLE = {
    full_day: chip('rgba(16,185,129,0.15)', '#10b981'),
    half_day: chip('rgba(245,158,11,0.15)', '#f59e0b'),
    absent: chip('rgba(239,68,68,0.15)', '#ef4444'),
    holiday_work: chip('rgba(139,92,246,0.15)', '#8b5cf6'),
    present: chip('rgba(59,130,246,0.15)', '#3b82f6'),
};
const hhmm = (iso) => (iso ? iso.slice(11, 16) : '—');
const fmtDate = (iso) => {
    if (!iso) return '—';
    try {
        return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
};

function AttendanceTab({ employeeId, token }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try { setData(await fetchEmployeeAttendance(token, employeeId, 90)); }
        catch (e) { setError(e.message || 'Failed to load attendance.'); }
        finally { setLoading(false); }
    }, [token, employeeId]);
    useEffect(() => { load(); }, [load]);

    if (loading) return <div style={{ color: 'var(--admin-text-muted)', padding: 24 }}>Loading attendance…</div>;
    if (error) {
        return (
            <div style={{ ...card, color: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{error}</span>
                <button onClick={load} style={{ background: 'transparent', border: '1px solid var(--admin-border-mid)', borderRadius: 8, color: 'var(--admin-text-secondary)', padding: '6px 12px', cursor: 'pointer' }}>Retry</button>
            </div>
        );
    }

    const s = data?.summary || {};
    const records = data?.records || [];

    if (!records.length) {
        return (
            <div style={{ ...card, textAlign: 'center', color: 'var(--admin-text-muted)', padding: 40 }}>
                <Fingerprint size={28} style={{ opacity: 0.5, marginBottom: 10 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>No attendance records yet</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Check-ins for this employee will show here.</div>
            </div>
        );
    }

    const stat = (label, value, color) => (
        <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: color || 'var(--admin-text-primary)', marginTop: 6 }}>{value}</div>
        </div>
    );

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                {stat('Records', s.records ?? 0)}
                {stat('Full days', s.full_day ?? 0, '#10b981')}
                {stat('Half days', s.half_day ?? 0, '#f59e0b')}
                {stat('Absent', s.absent ?? 0, '#ef4444')}
                {stat('Holiday work', s.holiday_work ?? 0, '#8b5cf6')}
            </div>

            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                        <thead>
                            <tr style={{ background: 'var(--admin-row-alt)' }}>
                                {['Date', 'Check-in', 'Check-out', 'Hours', 'Status'].map((h) => (
                                    <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r) => (
                                <tr key={r.id} style={{ borderTop: '1px solid var(--admin-border-soft)' }}>
                                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--admin-text-primary)', fontWeight: 600 }}>{fmtDate(r.date)}</td>
                                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--admin-text-secondary)' }}>{hhmm(r.checkin_time)}</td>
                                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--admin-text-secondary)' }}>{hhmm(r.checkout_time)}</td>
                                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--admin-text-secondary)' }}>{r.total_hours != null ? Number(r.total_hours).toFixed(1) : '—'}</td>
                                    <td style={{ padding: '11px 16px' }}>
                                        {r.day_status
                                            ? <span style={DAY_STATUS_STYLE[r.day_status] || chip('var(--admin-border-soft)', 'var(--admin-text-secondary)')}>{r.day_status.replace('_', ' ')}</span>
                                            : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const LEAVE_STATUS_STYLE = {
    pending: chip('rgba(245,158,11,0.15)', '#f59e0b'),
    approved: chip('rgba(16,185,129,0.15)', '#10b981'),
    rejected: chip('rgba(239,68,68,0.15)', '#ef4444'),
};

function LeaveTab({ employeeId, token }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try { setData(await fetchEmployeeLeave(token, employeeId)); }
        catch (e) { setError(e.message || 'Failed to load leave.'); }
        finally { setLoading(false); }
    }, [token, employeeId]);
    useEffect(() => { load(); }, [load]);

    const act = async (leaveId, action) => {
        setBusyId(leaveId);
        try { await actionLeave(token, leaveId, { action }); await load(); }
        catch (e) { window.alert(e?.message || 'Action failed.'); }
        finally { setBusyId(null); }
    };

    if (loading) return <div style={{ color: 'var(--admin-text-muted)', padding: 24 }}>Loading leave…</div>;
    if (error) {
        return (
            <div style={{ ...card, color: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{error}</span>
                <button onClick={load} style={{ background: 'transparent', border: '1px solid var(--admin-border-mid)', borderRadius: 8, color: 'var(--admin-text-secondary)', padding: '6px 12px', cursor: 'pointer' }}>Retry</button>
            </div>
        );
    }

    const bal = data?.balance || {};
    const requests = data?.requests || [];
    const statCard = (label, value, color) => (
        <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: color || 'var(--admin-text-primary)', marginTop: 6 }}>{value}</div>
        </div>
    );

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
                {statCard('Comp-off available', bal.available_balance ?? 0, '#10b981')}
                {statCard('Earned', bal.days_earned ?? 0)}
                {statCard('Used', bal.days_used ?? 0)}
            </div>

            {requests.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', color: 'var(--admin-text-muted)', padding: 40 }}>
                    <CalendarClock size={28} style={{ opacity: 0.5, marginBottom: 10 }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>No leave requests</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {requests.map((r) => (
                        <div key={r.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--admin-text-primary)' }}>
                                    {fmtDate(r.start_date)} → {fmtDate(r.end_date)}
                                </div>
                                {r.reason && <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 3 }}>{r.reason}</div>}
                                {r.admin_notes && <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 3, fontStyle: 'italic' }}>Note: {r.admin_notes}</div>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={LEAVE_STATUS_STYLE[r.status] || chip('var(--admin-border-soft)', 'var(--admin-text-secondary)')}>{r.status}</span>
                                {r.status === 'pending' && (
                                    <>
                                        <button onClick={() => act(r.id, 'approve')} disabled={busyId === r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, background: '#10b981', color: '#fff', border: 'none', cursor: busyId === r.id ? 'not-allowed' : 'pointer' }}>
                                            <Check size={14} /> Approve
                                        </button>
                                        <button onClick={() => act(r.id, 'reject')} disabled={busyId === r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', cursor: busyId === r.id ? 'not-allowed' : 'pointer' }}>
                                            <XIcon size={14} /> Reject
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const inr = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);

function PayrollTab({ employeeId, token }) {
    const now = new Date();
    const [ym, setYm] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        const [year, month] = ym.split('-');
        try { setData(await fetchEmployeePayroll(token, employeeId, { year, month })); }
        catch (e) { setError(e.message || 'Failed to load payroll.'); }
        finally { setLoading(false); }
    }, [token, employeeId, ym]);
    useEffect(() => { load(); }, [load]);

    const statCard = (label, value) => (
        <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--admin-text-primary)', marginTop: 6 }}>{value}</div>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>Month</label>
                <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, fontSize: 13, background: 'var(--admin-row-alt)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border-mid)' }} />
            </div>

            {loading && <div style={{ color: 'var(--admin-text-muted)', padding: 24 }}>Loading payroll…</div>}
            {error && !loading && (
                <div style={{ ...card, color: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{error}</span>
                    <button onClick={load} style={{ background: 'transparent', border: '1px solid var(--admin-border-mid)', borderRadius: 8, color: 'var(--admin-text-secondary)', padding: '6px 12px', cursor: 'pointer' }}>Retry</button>
                </div>
            )}

            {data && !loading && !error && (
                <>
                    <div style={{ ...card, marginBottom: 12, background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Net payable (fixed 30-day)</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#10b981', marginTop: 4 }}>{inr(data.calculated_salary)}</div>
                        <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 4 }}>{data.total_paid_days} paid days · policy: {(data.saturday_policy || '').replace(/_/g, ' ')}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                        {statCard('Base salary', inr(data.base_salary))}
                        {statCard('Worked days', `${data.worked_days} / 30`)}
                        {statCard('Paid leaves', data.paid_leaves)}
                        {statCard('Extra days worked', data.extra_days_worked)}
                        {statCard('Total paid days', data.total_paid_days)}
                    </div>
                </>
            )}
        </div>
    );
}
