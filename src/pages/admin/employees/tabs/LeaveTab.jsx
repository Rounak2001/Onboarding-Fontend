import { useState, useEffect, useCallback } from 'react';
import { CalendarClock, Check, X as XIcon } from 'lucide-react';
import { fetchEmployeeLeave, actionLeave, READ_ONLY } from '../staffApi';
import StatCard from '../shared/StatCard';
import StatusChip, { LEAVE_STATUS_COLORS } from '../shared/StatusChip';
import { card } from '../shared/styles';
import { fmtDate } from '../shared/format';

export default function LeaveTab({ employeeId, token }) {
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

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
                <StatCard label="Comp-off available" value={bal.available_balance ?? 0} color="#10b981" />
                <StatCard label="Earned" value={bal.days_earned ?? 0} />
                <StatCard label="Used" value={bal.days_used ?? 0} />
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
                                <StatusChip value={r.status} map={LEAVE_STATUS_COLORS} />
                                {!READ_ONLY && r.status === 'pending' && (
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
