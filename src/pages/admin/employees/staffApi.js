// API helpers for the staff KPI admin endpoints (Django /api/staff/admin-panel/*).
// Mirrors the fetch + bearer-token convention used by the other admin lists.
import { apiUrl } from '../../../utils/apiBase';

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
