import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, Pencil, UserX, ClipboardList, Target,
    CalendarDays, Fingerprint, CalendarClock, IndianRupee,
} from 'lucide-react';
import { fetchEmployeeDetail, updateEmployee, deactivateEmployee, READ_ONLY } from './staffApi';
import EmployeeForm from './forms/EmployeeForm';
import OverviewTab from './tabs/OverviewTab';
import KpiTab from './tabs/KpiTab';
import UpdatesTab from './tabs/UpdatesTab';
import AttendanceTab from './tabs/AttendanceTab';
import LeaveTab from './tabs/LeaveTab';
import PayrollTab from './tabs/PayrollTab';
import { card } from './shared/styles';

// Grouped so the tab bar reads as "today's status | admin-defined config |
// historical GLR records" instead of six equally-weighted buttons in a row.
const TAB_GROUPS = [
    { label: 'Today', tabs: [{ id: 'overview', label: 'Overview', icon: ClipboardList }] },
    {
        label: 'Work',
        tabs: [
            { id: 'kpis', label: 'KRAs', icon: Target },
            { id: 'updates', label: 'Daily updates', icon: CalendarDays },
        ],
    },
    {
        label: 'Records',
        tabs: [
            { id: 'attendance', label: 'Attendance', icon: Fingerprint },
            { id: 'leave', label: 'Leave', icon: CalendarClock },
            { id: 'payroll', label: 'Payroll', icon: IndianRupee },
        ],
    },
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            {detail.face_image_url
                                ? <img src={detail.face_image_url} alt={detail.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--admin-border-mid)', flexShrink: 0 }} />
                                : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--admin-row-alt)', border: '2px solid var(--admin-border-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)', fontWeight: 900, fontSize: 20, flexShrink: 0 }}>{(detail.name || '?').charAt(0).toUpperCase()}</div>}
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--admin-text-primary)' }}>{detail.name}</div>
                                <div style={{ fontSize: 13, color: 'var(--admin-text-muted)', marginTop: 2 }}>{detail.employee_id} · {detail.email}</div>
                            </div>
                        </div>
                        {!READ_ONLY && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { setEditErr(''); setEditing(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--admin-border-soft)', color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border-mid)', cursor: 'pointer' }}>
                                    <Pencil size={14} /> Edit
                                </button>
                                <button onClick={doDeactivate} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer' }}>
                                    <UserX size={14} /> Deactivate
                                </button>
                            </div>
                        )}
                    </div>

                    {!READ_ONLY && editing && (
                        <EmployeeForm
                            initial={detail}
                            onSubmit={submitEdit}
                            onClose={() => setEditing(false)}
                            saving={saving}
                            error={editErr}
                        />
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--admin-border-soft)', marginBottom: 16, overflowX: 'auto' }}>
                        {TAB_GROUPS.map((group, gi) => (
                            <div key={group.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {gi > 0 && <div style={{ width: 1, height: 20, background: 'var(--admin-border-mid)', margin: '0 8px' }} />}
                                {group.tabs.map((t) => {
                                    const Icon = t.icon;
                                    const active = tab === t.id;
                                    return (
                                        <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `2px solid ${active ? '#3b82f6' : 'transparent'}`, color: active ? '#3b82f6' : 'var(--admin-text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                            <Icon size={15} /> {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
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
