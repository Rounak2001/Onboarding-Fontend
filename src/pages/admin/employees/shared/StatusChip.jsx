// One shared status-chip visual language for the Employees section, replacing
// the previously duplicated chip()/attChip()/DAY_STATUS_STYLE/LEAVE_STATUS_STYLE
// implementations that rendered the same concept slightly differently.

export const chip = (bg, color) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11,
    fontWeight: 800, background: bg, color, border: `1px solid ${color}33`,
});

// Status colors (good/warning/critical) are reserved for true good/bad states
// and never doubled as identity. full_day/half_day/absent and approved/pending/
// rejected are true good/bad states, so they wear the status palette; present
// and holiday_work are neutral/informational (not a verdict), so they wear
// plain categorical identity colors instead.
export const ATTENDANCE_STATUS_COLORS = {
    full_day: { bg: 'rgba(12,163,12,0.15)', color: '#0ca30c' },
    half_day: { bg: 'rgba(250,178,25,0.18)', color: '#fab219' },
    absent: { bg: 'rgba(208,59,59,0.15)', color: '#d03b3b' },
    holiday_work: { bg: 'rgba(74,58,167,0.15)', color: '#4a3aa7' },
    present: { bg: 'rgba(42,120,214,0.15)', color: '#2a78d6' },
};

export const LEAVE_STATUS_COLORS = {
    pending: { bg: 'rgba(250,178,25,0.18)', color: '#fab219' },
    approved: { bg: 'rgba(12,163,12,0.15)', color: '#0ca30c' },
    rejected: { bg: 'rgba(208,59,59,0.15)', color: '#d03b3b' },
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
