import { useState, useEffect, useCallback } from 'react';
import { Users, RefreshCw, ChevronRight, CheckCircle2, AlertCircle, UserPlus, TrendingUp } from 'lucide-react';
import { fetchTeamToday, fetchTeamTrends, createEmployee, READ_ONLY } from './staffApi';
import EmployeeDetail from './EmployeeDetail';
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

const card = {
    background: 'var(--admin-surface)', border: '1px solid var(--admin-border-soft)',
    borderRadius: 12, padding: 16,
};

const attChip = (statusVal) => {
    const c = { full_day: '#10b981', present: '#3b82f6', half_day: '#f59e0b', absent: '#ef4444', holiday_work: '#8b5cf6' }[statusVal] || '#94a3b8';
    return { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: `${c}22`, color: c, textTransform: 'capitalize' };
};

function AttendanceCell({ attendance }) {
    if (!attendance?.day_status) return <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>—</span>;
    return <span style={attChip(attendance.day_status)}>{attendance.day_status.replace(/_/g, ' ')}</span>;
}

const PERIODS = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
];

function pctColor(pct) {
    if (pct == null) return '#94a3b8';
    if (pct >= 90) return '#10b981';
    if (pct >= 70) return '#f59e0b';
    return '#ef4444';
}

function TrendBar({ label, pct }) {
    const color = pctColor(pct);
    return (
        <div style={{ flex: 1, minWidth: 130 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 4 }}>
                <span>{label}</span>
                <span style={{ fontWeight: 800, color }}>{pct == null ? '—' : `${pct}%`}</span>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: 'var(--admin-border-soft)', overflow: 'hidden' }}>
                <div style={{ width: `${pct ?? 0}%`, height: '100%', background: color }} />
            </div>
        </div>
    );
}

// Investor trends: attendance % and daily-update compliance % per employee over
// a selectable period, plus a missing-days count so gaps are explicit rather
// than hidden inside an average.
function TrendsSection({ token }) {
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(true);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try { setData(await fetchTeamTrends(token, days)); }
        catch (e) { setError(e.message || 'Failed to load trends.'); }
        finally { setLoading(false); }
    }, [token, days]);
    useEffect(() => { load(); }, [load]);

    const rows = data?.employees || [];
    const team = data?.team || {};

    return (
        <div style={{ ...card, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <button onClick={() => setOpen((o) => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <TrendingUp size={16} color="var(--admin-text-secondary)" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--admin-text-primary)' }}>Trends</span>
                    <span style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{open ? '(hide)' : '(show)'}</span>
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                    {PERIODS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setDays(p.value)}
                            style={{
                                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                                border: '1px solid var(--admin-border-mid)',
                                background: days === p.value ? '#3b82f6' : 'var(--admin-row-alt)',
                                color: days === p.value ? '#fff' : 'var(--admin-text-secondary)',
                            }}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {open && (
                <div style={{ marginTop: 14 }}>
                    {loading && <div style={{ color: 'var(--admin-text-muted)', fontSize: 13 }}>Loading trends…</div>}
                    {error && !loading && (
                        <div style={{ color: '#ef4444', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{error}</span>
                            <button onClick={load} style={{ background: 'transparent', border: '1px solid var(--admin-border-mid)', borderRadius: 8, color: 'var(--admin-text-secondary)', padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>Retry</button>
                        </div>
                    )}
                    {!loading && !error && (
                        <>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--admin-border-soft)' }}>
                                <TrendBar label="Team attendance" pct={team.attendance_pct} />
                                <TrendBar label="Team update compliance" pct={team.update_compliance_pct} />
                            </div>
                            {rows.length === 0 && <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No expected working days in this period.</div>}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {rows.map((r) => (
                                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                        <div style={{ minWidth: 140 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>{r.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                                                {r.employee_id} · {r.missing_updates > 0 ? `${r.missing_updates} missing update${r.missing_updates === 1 ? '' : 's'}` : 'no gaps'}
                                            </div>
                                        </div>
                                        <TrendBar label={`Attendance (${r.present_days}/${r.expected_days})`} pct={r.attendance_pct} />
                                        <TrendBar label={`Updates (${r.update_days}/${r.expected_days})`} pct={r.update_compliance_pct} />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// eslint-disable-next-line no-unused-vars
export default function AdminEmployees({ isLight, viewportWidth, token, themeVars }) {
    const isMobile = viewportWidth <= 768;
    const [date, setDate] = useState(todayStr());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formErr, setFormErr] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setData(await fetchTeamToday(token, date));
        } catch (e) {
            setError(e.status === 403 ? 'This section is restricted to super admins.' : (e.message || 'Failed to load team.'));
        } finally {
            setLoading(false);
        }
    }, [token, date]);

    useEffect(() => { if (!selected) load(); }, [load, selected]);

    const submitCreate = async (payload) => {
        setSaving(true); setFormErr('');
        try {
            await createEmployee(token, payload);
            setShowCreate(false);
            load();
        } catch (e) {
            setFormErr(e?.message || 'Failed to create employee.');
        } finally { setSaving(false); }
    };

    if (selected) {
        return (
            <div style={{ ...themeVars, padding: isMobile ? 12 : 24 }}>
                <EmployeeDetail employeeId={selected} token={token} isMobile={isMobile} onBack={() => setSelected(null)} />
            </div>
        );
    }

    const employees = data?.employees || [];
    const submittedCount = employees.filter((e) => e.summary_present).length;
    const totalKpiUpdates = employees.reduce((s, e) => s + (e.kpi_updated || 0), 0);
    const isToday = date === todayStr();

    return (
        <div style={{ ...themeVars, padding: isMobile ? 12 : 24 }}>
            {/* Header row: date + refresh */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
                <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, fontSize: 13, background: 'var(--admin-row-alt)', color: 'var(--admin-text-primary)', border: '1px solid var(--admin-border-mid)' }} />
                <button onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: 'pointer' }}>
                    <RefreshCw size={14} /> Refresh
                </button>
                <span style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>{isToday ? 'Today' : date}</span>
                {!READ_ONLY && (
                    <button onClick={() => { setFormErr(''); setShowCreate(true); }} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 800, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        <UserPlus size={14} /> Add employee
                    </button>
                )}
            </div>

            {!READ_ONLY && showCreate && (
                <EmployeeForm
                    onSubmit={submitCreate}
                    onClose={() => setShowCreate(false)}
                    saving={saving}
                    error={formErr}
                />
            )}

            <TrendsSection token={token} />

            {/* Summary cards */}
            {!error && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
                    <div style={card}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--admin-text-primary)', marginTop: 6 }}>{employees.length}</div>
                    </div>
                    <div style={card}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Work summaries submitted</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981', marginTop: 6 }}>{submittedCount}<span style={{ fontSize: 16, color: 'var(--admin-text-muted)' }}> / {employees.length}</span></div>
                    </div>
                    <div style={card}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>KPI updates logged</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#3b82f6', marginTop: 6 }}>{totalKpiUpdates}</div>
                    </div>
                </div>
            )}

            {loading && <div style={{ color: 'var(--admin-text-muted)', padding: 24 }}>Loading team…</div>}

            {error && !loading && (
                <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ef4444' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><AlertCircle size={18} /> {error}</span>
                    <button onClick={load} style={{ background: 'transparent', border: '1px solid var(--admin-border-mid)', borderRadius: 8, color: 'var(--admin-text-secondary)', padding: '6px 12px', cursor: 'pointer' }}>Retry</button>
                </div>
            )}

            {!loading && !error && employees.length === 0 && (
                <div style={{ ...card, textAlign: 'center', color: 'var(--admin-text-muted)', padding: 48 }}>
                    <Users size={30} style={{ opacity: 0.5, marginBottom: 10 }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>No employees yet</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Use “Add employee” above to create your first one.</div>
                </div>
            )}

            {/* Desktop table */}
            {!loading && !error && employees.length > 0 && !isMobile && (
                <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--admin-row-alt)' }}>
                                {['Employee', 'Work summary', 'KPIs updated', 'Attendance', 'Last edited', ''].map((h) => (
                                    <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((e) => (
                                <tr key={e.id} onClick={() => setSelected(e.id)} style={{ borderTop: '1px solid var(--admin-border-soft)', cursor: 'pointer' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)' }}>{e.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{e.employee_id}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {e.summary_present
                                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#10b981' }}><CheckCircle2 size={14} /> Submitted</span>
                                            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#f59e0b' }}><AlertCircle size={14} /> Missing</span>}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <KpiProgress done={e.kpi_updated} total={e.kpi_total} />
                                    </td>
                                    <td style={{ padding: '12px 16px' }}><AttendanceCell attendance={e.attendance} /></td>
                                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--admin-text-muted)' }}>{fmtTime(e.summary_updated_at) || '—'}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}><ChevronRight size={16} color="var(--admin-text-muted)" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Mobile cards */}
            {!loading && !error && employees.length > 0 && isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {employees.map((e) => (
                        <div key={e.id} onClick={() => setSelected(e.id)} style={{ ...card, cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--admin-text-primary)' }}>{e.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>{e.employee_id}</div>
                                </div>
                                <ChevronRight size={18} color="var(--admin-text-muted)" />
                            </div>
                            <div style={{ display: 'flex', gap: 14, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                {e.summary_present
                                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#10b981' }}><CheckCircle2 size={14} /> Summary</span>
                                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#f59e0b' }}><AlertCircle size={14} /> No summary</span>}
                                <KpiProgress done={e.kpi_updated} total={e.kpi_total} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function KpiProgress({ done, total }) {
    const d = done || 0;
    const t = total || 0;
    const pct = t > 0 ? Math.round((d / t) * 100) : 0;
    const color = t === 0 ? '#94a3b8' : d >= t ? '#10b981' : d > 0 ? '#3b82f6' : '#f59e0b';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 60, height: 6, borderRadius: 4, background: 'var(--admin-border-soft)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)' }}>{d}/{t}</span>
        </div>
    );
}
