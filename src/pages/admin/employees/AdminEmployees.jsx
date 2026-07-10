import { useState, useEffect, useCallback } from 'react';
import { Users, RefreshCw, ChevronRight, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';
import { fetchTeamToday, createEmployee, READ_ONLY } from './staffApi';
import EmployeeDetail from './EmployeeDetail';
import EmployeeForm from './forms/EmployeeForm';
import TrendsSection from './sections/TrendsSection';
import StatCard from './shared/StatCard';
import StatusChip, { ATTENDANCE_STATUS_COLORS } from './shared/StatusChip';
import { card } from './shared/styles';
import { todayStr, fmtTime } from './shared/format';

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

            {/* Today at a glance */}
            {!error && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
                    <StatCard label="Team" value={employees.length} size={28} />
                    <StatCard label="Work summaries submitted" value={submittedCount} suffix={`/ ${employees.length}`} color="#10b981" size={28} />
                    <StatCard label="KPI updates logged" value={totalKpiUpdates} color="#3b82f6" size={28} />
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

            {/* Roster — desktop table */}
            {!loading && !error && employees.length > 0 && !isMobile && (
                <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 18 }}>
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
                                    <td style={{ padding: '12px 16px' }}>
                                        <StatusChip value={e.attendance?.day_status} map={ATTENDANCE_STATUS_COLORS} />
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--admin-text-muted)' }}>{fmtTime(e.summary_updated_at) || '—'}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}><ChevronRight size={16} color="var(--admin-text-muted)" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Roster — mobile cards */}
            {!loading && !error && employees.length > 0 && isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
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

            {/* Trends — historical view, secondary to today's roster above */}
            <TrendsSection token={token} />
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
