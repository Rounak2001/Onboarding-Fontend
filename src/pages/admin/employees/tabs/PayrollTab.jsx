import { useState, useEffect, useCallback } from 'react';
import { fetchEmployeePayroll } from '../staffApi';
import StatCard from '../shared/StatCard';
import { card } from '../shared/styles';
import { inr } from '../shared/format';

export default function PayrollTab({ employeeId, token }) {
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
                        <StatCard label="Base salary" value={inr(data.base_salary)} />
                        <StatCard label="Worked days" value={`${data.worked_days} / 30`} />
                        <StatCard label="Paid leaves" value={data.paid_leaves} />
                        <StatCard label="Extra days worked" value={data.extra_days_worked} />
                        <StatCard label="Total paid days" value={data.total_paid_days} />
                    </div>
                </>
            )}
        </div>
    );
}
