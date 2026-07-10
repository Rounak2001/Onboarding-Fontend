import { deltaColor, SPARKLINE_ACCENT } from './severity';
import { card } from './styles';

function Sparkline({ points, width = 90, height = 24 }) {
    const pts = points.filter((v) => v != null);
    if (pts.length < 2) return null;
    const step = width / (pts.length - 1);
    const coords = pts.map((v, i) => [i * step, height - (v / 100) * height]);
    const path = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const [lastX, lastY] = coords[coords.length - 1];
    return (
        <svg width={width} height={height} style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
            <polyline points={path} fill="none" stroke={SPARKLINE_ACCENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={lastX} cy={lastY} r={2.5} fill={SPARKLINE_ACCENT} stroke="var(--admin-surface)" strokeWidth={1.5} />
        </svg>
    );
}

// Stat-tile contract: label + value + delta vs a named prior period + optional
// sparkline — this is what makes a percentage read as analytics instead of a
// bare colored number. `upIsGood` flips which delta direction counts as good
// (both attendance and update-compliance are "up is good" here).
export default function TrendStatTile({ label, pct, delta, sparkline, days, upIsGood = true }) {
    let deltaText = null;
    if (pct != null) {
        if (delta == null) deltaText = 'no prior data';
        else if (delta === 0) deltaText = `steady vs previous ${days} days`;
        else deltaText = `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} pts vs previous ${days} days`;
    }
    const hasSparkline = sparkline && sparkline.filter((v) => v != null).length >= 2;

    return (
        <div style={{ ...card, flex: 1, minWidth: 200, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {label}
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--admin-text-primary)', marginTop: 4 }}>
                    {pct == null ? '—' : `${pct}%`}
                </div>
                {deltaText && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: deltaColor(delta, { upIsGood }), marginTop: 4 }}>
                        {deltaText}
                    </div>
                )}
            </div>
            {hasSparkline && <Sparkline points={sparkline} />}
        </div>
    );
}
