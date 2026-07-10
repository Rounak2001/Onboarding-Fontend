import { card } from './styles';

// A "label + big number" card — replaces the ~5 near-identical blocks that were
// copy-pasted across OverviewTab, AttendanceTab, LeaveTab, PayrollTab and the
// list-page summary cards. `suffix` renders a smaller trailing value (e.g.
// "12 / 15"); `size` lets a call site opt into the larger "headline" number
// used for top-of-page metrics (default is the smaller in-tab-grid size).
export default function StatCard({ label, value, suffix, color, size = 24 }) {
    return (
        <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
            </div>
            <div style={{ fontSize: size, fontWeight: 900, color: color || 'var(--admin-text-primary)', marginTop: 6 }}>
                {value}
                {suffix != null && (
                    <span style={{ fontSize: size - 12, color: 'var(--admin-text-muted)' }}> {suffix}</span>
                )}
            </div>
        </div>
    );
}
