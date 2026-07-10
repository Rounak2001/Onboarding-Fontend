// Reserved status palette (never themed) — shared by meters and stat tiles so
// a percentage always maps to the same good/warning/critical color.
export const STATUS_GOOD = '#0ca30c';
export const STATUS_WARNING = '#fab219';
export const STATUS_CRITICAL = '#d03b3b';

// Sequential accent for trend lines/sparklines — magnitude-over-time, not a verdict.
export const SPARKLINE_ACCENT = '#2a78d6';

export function severityColor(pct, { good = 90, warning = 70 } = {}) {
    if (pct == null) return 'var(--admin-text-muted)';
    if (pct >= good) return STATUS_GOOD;
    if (pct >= warning) return STATUS_WARNING;
    return STATUS_CRITICAL;
}

// A meter's unfilled track: a lighter step of the fill's own ramp, not flat gray.
export const trackTint = (color) => (color.startsWith('#') ? `${color}26` : 'var(--admin-border-soft)');

// Delta text color: direction x whether up is good for this metric.
export function deltaColor(delta, { upIsGood = true } = {}) {
    if (delta == null || delta === 0) return 'var(--admin-text-muted)';
    const isGood = upIsGood ? delta > 0 : delta < 0;
    return isGood ? STATUS_GOOD : STATUS_CRITICAL;
}
