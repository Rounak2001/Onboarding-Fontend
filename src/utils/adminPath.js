const normalizeAdminPrefix = (value) => {
  const raw = String(value ?? '').trim();
  const stripped = raw.replace(/^\/+|\/+$/g, '');
  if (!stripped) return 'admin';
  // Keep it to a single, safe path segment.
  if (!/^[A-Za-z0-9_-]+$/.test(stripped)) return 'admin';
  return stripped;
};

export const ADMIN_PREFIX = normalizeAdminPrefix(import.meta.env.VITE_ADMIN_PATH);
export const ADMIN_BASE = `/${ADMIN_PREFIX}`;
export const IS_DEFAULT_ADMIN_PATH = ADMIN_PREFIX === 'admin';

export const adminUrl = (suffix = '') => {
  const tail = String(suffix ?? '').trim();
  if (!tail) return ADMIN_BASE;
  if (tail.startsWith('/')) return `${ADMIN_BASE}${tail}`;
  return `${ADMIN_BASE}/${tail}`;
};
