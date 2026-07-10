import { useState, useEffect, useCallback } from 'react';
import { Fingerprint } from 'lucide-react';
import { fetchEmployeeAttendance } from '../staffApi';
import StatCard from '../shared/StatCard';
import StatusChip, { ATTENDANCE_STATUS_COLORS } from '../shared/StatusChip';
import { card } from '../shared/styles';
import { fmtDate } from '../shared/format';

// A selfie thumbnail (when the photo is in S3) next to the punch time. Opens
// the full image in a new tab on click. Single consumer, so it stays local.
function PhotoTime({ photo, iso }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {photo && (
                <a href={photo} target="_blank" rel="noreferrer">
                    <img src={photo} alt="selfie" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--admin-border-soft)', display: 'block' }} />
                </a>
            )}
            <span>{iso ? iso.slice(11, 16) : '—'}</span>
        </div>
    );
}

export default function AttendanceTab({ employeeId, token }) {
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

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                <StatCard label="Records" value={s.records ?? 0} />
                <StatCard label="Full days" value={s.full_day ?? 0} color="#10b981" />
                <StatCard label="Half days" value={s.half_day ?? 0} color="#f59e0b" />
                <StatCard label="Absent" value={s.absent ?? 0} color="#ef4444" />
                <StatCard label="Holiday work" value={s.holiday_work ?? 0} color="#8b5cf6" />
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
                                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--admin-text-secondary)' }}><PhotoTime photo={r.checkin_photo} iso={r.checkin_time} /></td>
                                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--admin-text-secondary)' }}><PhotoTime photo={r.checkout_photo} iso={r.checkout_time} /></td>
                                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--admin-text-secondary)' }}>{r.total_hours != null ? Number(r.total_hours).toFixed(1) : '—'}</td>
                                    <td style={{ padding: '11px 16px' }}>
                                        <StatusChip value={r.day_status} map={ATTENDANCE_STATUS_COLORS} />
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
