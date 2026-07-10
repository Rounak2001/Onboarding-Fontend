// Shared date/time/currency formatters for the Employees section. Single
// source of truth — these were previously duplicated across AdminEmployees.jsx
// and EmployeeDetail.jsx.

export const todayStr = () => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export const fmtTime = (iso) => {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            hour12: true, timeZone: 'Asia/Kolkata',
        });
    } catch { return ''; }
};

export const fmtDate = (iso) => {
    if (!iso) return '—';
    try {
        return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
};

export const inr = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
