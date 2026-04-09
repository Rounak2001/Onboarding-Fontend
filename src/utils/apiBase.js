export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiUrl = (path = '') => {
  const normalizedPath = String(path ?? '').trim();
  if (!normalizedPath) return API_BASE_URL;
  if (normalizedPath.startsWith('/')) return `${API_BASE_URL}${normalizedPath}`;
  return `${API_BASE_URL}/${normalizedPath}`;
};
