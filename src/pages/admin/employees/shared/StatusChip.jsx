// One shared status-chip visual language for the Employees section, replacing
// the previously duplicated chip()/attChip()/DAY_STATUS_STYLE/LEAVE_STATUS_STYLE
// implementations that rendered the same concept slightly differently.

export const chip = (bg, color) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11,
    fontWeight: 800, background: bg, color, border: `1px solid ${color}33`,
});

export const ATTENDANCE_STATUS_COLORS = {
    full_day: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    half_day: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    absent: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    holiday_work: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
    present: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
};

export const LEAVE_STATUS_COLORS = {
    pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    approved: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    rejected: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
};

// <StatusChip value="full_day" map={ATTENDANCE_STATUS_COLORS} /> — looks up the
// color for `value` in `map` and renders a pill with underscores replaced by
// spaces; falls back to a neutral chip for unknown values, and an em-dash when
// there's no value at all.
export default function StatusChip({ value, map, fallbackColor = '#94a3b8' }) {
    if (!value) return <span style={{ color: 'var(--admin-text-muted)', fontSize: 12 }}>—</span>;
    const entry = map?.[value];
    const bg = entry ? entry.bg : `${fallbackColor}22`;
    const color = entry ? entry.color : fallbackColor;
    return <span style={chip(bg, color)}>{String(value).replace(/_/g, ' ')}</span>;
}
