// API helpers for the staff KPI admin endpoints (Django /api/staff/admin-panel/*).
// Mirrors the fetch + bearer-token convention used by the other admin lists.
import { apiUrl } from '../../../utils/apiBase';

// Panel-wide read-only switch. When true, all write controls (add/edit/
// deactivate employee, KRA/KPI editing, leave approve/reject) are hidden so the
// Employees section is view-only for everyone. Flip to false to restore editing.
export const READ_ONLY = false;

const resolveToken = (propToken) => {
    const candidates = [propToken];
    if (typeof window !== 'undefined') {
        candidates.push(window.localStorage.getItem('admin_token'));
    }
    for (const value of candidates) {
        if (typeof value === 'string' && value && value !== 'null' && value !== 'undefined') {
            return value;
        }
    }
    return '';
};

const request = async (token, path, { method = 'GET', body } = {}) => {
    const authToken = resolveToken(token);
    const res = await fetch(apiUrl(`/staff${path}`), {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try {
        data = await res.json();
    } catch {
        data = {};
    }
    if (!res.ok) {
        const err = new Error(data.detail || `Request failed (${res.status})`);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
};

const qs = (params) => {
    const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
    return clean.length ? `?${new URLSearchParams(Object.fromEntries(clean))}` : '';
};

export const fetchTeamToday = (token, date) => request(token, `/admin-panel/team-today/${qs({ date })}`);
export const fetchTeamTrends = (token, days) => request(token, `/admin-panel/team-trends/${qs({ days })}`);
export const fetchEmployees = (token, date) => request(token, `/admin-panel/employees/${qs({ date })}`);
export const fetchEmployeeDetail = (token, id, date) => request(token, `/admin-panel/employees/${id}/${qs({ date })}`);
export const fetchEmployeeKras = (token, id, includeArchived) =>
    request(token, `/admin-panel/employees/${id}/kras/${qs({ include_archived: includeArchived ? 1 : '' })}`);
export const createKra = (token, id, body) => request(token, `/admin-panel/employees/${id}/kras/`, { method: 'POST', body });
export const updateKra = (token, kraId, body) => request(token, `/admin-panel/kras/${kraId}/`, { method: 'PATCH', body });
export const archiveKra = (token, kraId) => request(token, `/admin-panel/kras/${kraId}/`, { method: 'DELETE' });
export const createKpi = (token, kraId, body) => request(token, `/admin-panel/kras/${kraId}/kpis/`, { method: 'POST', body });
export const updateKpi = (token, kpiId, body) => request(token, `/admin-panel/kpis/${kpiId}/`, { method: 'PATCH', body });
export const archiveKpi = (token, kpiId) => request(token, `/admin-panel/kpis/${kpiId}/`, { method: 'DELETE' });
export const fetchDailyUpdates = (token, date, employeeId) =>
    request(token, `/admin-panel/daily-updates/${qs({ date, employee: employeeId })}`);
export const fetchEmployeeDailyReports = (token, id) =>
    request(token, `/admin-panel/employees/${id}/daily-reports/`);

// --- employee management (admin-panel authed) ---
export const createEmployee = (token, body) =>
    request(token, `/admin-panel/employees/`, { method: 'POST', body });
export const updateEmployee = (token, id, body) =>
    request(token, `/admin-panel/employees/${id}/`, { method: 'PUT', body });
export const deactivateEmployee = (token, id) =>
    request(token, `/admin-panel/employees/${id}/`, { method: 'DELETE' });
export const fetchEmployeeAttendance = (token, id, limit) =>
    request(token, `/admin-panel/employees/${id}/attendance/${qs({ limit })}`);
export const fetchEmployeeLeave = (token, id) =>
    request(token, `/admin-panel/employees/${id}/leave/`);
export const actionLeave = (token, leaveId, body) =>
    request(token, `/admin-panel/leave/${leaveId}/action/`, { method: 'POST', body });
export const fetchEmployeePayroll = (token, id, { year, month } = {}) =>
    request(token, `/admin-panel/employees/${id}/payroll/${qs({ year, month })}`);

export const ROLES = [
    { value: 'employee', label: 'Employee' },
    { value: 'admin', label: 'Admin' },
    { value: 'superadmin', label: 'Super admin' },
];

export const SATURDAY_POLICIES = [
    { value: 'alt_sat_holiday', label: 'Alternate Saturdays off (2nd & 4th)' },
    { value: 'all_sat_working', label: 'All Saturdays working' },
    { value: 'all_sat_holiday', label: 'All Saturdays off' },
    { value: 'all_sat_half_day', label: 'All Saturdays half-day' },
    { value: 'all_sat_wfh', label: 'All Saturdays WFH' },
    { value: 'alt_sat_holiday_rest_wfh', label: 'Alt Saturdays off, rest WFH' },
];

export const METRIC_TYPES = [
    { value: 'number', label: 'Number' },
    { value: 'percent', label: 'Percent' },
    { value: 'count', label: 'Count' },
    { value: 'boolean', label: 'Yes / No' },
];

export const DIRECTIONS = [
    { value: 'higher', label: 'Higher is better' },
    { value: 'lower', label: 'Lower is better' },
];
