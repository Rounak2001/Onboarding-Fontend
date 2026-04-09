const rawApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim();

const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(value);

const getRuntimeHostname = () => {
  if (typeof window === 'undefined') return '';
  return String(window.location?.hostname || '').toLowerCase();
};

const isLocalRuntime = () => {
  const host = getRuntimeHostname();
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
};

const normalizeBaseUrl = () => {
  if (!rawApiBaseUrl) return '/api';

  // In deployed environments, always prefer same-origin /api to avoid brittle CORS failures.
  if (isAbsoluteHttpUrl(rawApiBaseUrl) && !isLocalRuntime()) {
    return '/api';
  }

  return rawApiBaseUrl.replace(/\/+$/, '') || '/api';
};

export const API_BASE_URL = normalizeBaseUrl();

export const apiUrl = (path = '') => {
  const normalizedPath = String(path ?? '').trim();
  if (!normalizedPath) return API_BASE_URL;
  if (normalizedPath.startsWith('/')) return `${API_BASE_URL}${normalizedPath}`;
  return `${API_BASE_URL}/${normalizedPath}`;
};
