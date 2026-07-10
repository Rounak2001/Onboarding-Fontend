import { useState, useEffect, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { fetchTeamTrends } from '../staffApi';
import { card } from '../shared/styles';

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
export default function TrendsSection({ token }) {
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
