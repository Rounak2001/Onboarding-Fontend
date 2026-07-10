import { chip } from '../shared/StatusChip';
import StatCard from '../shared/StatCard';
import { card } from '../shared/styles';
import { fmtTime } from '../shared/format';

export default function OverviewTab({ detail }) {
    const t = detail.today || {};
    const done = t.kpi_updated || 0;
    const total = t.kpi_total || 0;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatCard label="KPIs updated today" value={done} suffix={`/ ${total}`} size={28} />
            <div style={card}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Work summary today</div>
                <div style={{ marginTop: 10 }}>
                    {t.summary_present
                        ? <span style={chip('rgba(16,185,129,0.15)', '#10b981')}>Submitted</span>
                        : <span style={chip('rgba(245,158,11,0.15)', '#f59e0b')}>Missing</span>}
                </div>
                {t.summary_updated_at && <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 8 }}>Last edited {fmtTime(t.summary_updated_at)}</div>}
            </div>
            <StatCard label="Active KRAs" value={(detail.kras || []).length} size={28} />
        </div>
    );
}
