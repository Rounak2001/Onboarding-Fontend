import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchDailyUpdates } from '../staffApi';
import { todayStr, fmtTime } from '../shared/format';
import { card } from '../shared/styles';

export default function UpdatesTab({ employeeId, token, isMobile }) {
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
