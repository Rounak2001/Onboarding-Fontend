const ACTIVE_SP_KEY = 'activeSalesPerson';

export function getActiveSalesPerson() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_SP_KEY)) || null;
  } catch {
    return null;
  }
}

export function setActiveSalesPerson(sp) {
  if (sp) localStorage.setItem(ACTIVE_SP_KEY, JSON.stringify(sp));
  else localStorage.removeItem(ACTIVE_SP_KEY);
}
