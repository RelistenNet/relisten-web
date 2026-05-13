export const ADMIN_TOOLS_STORAGE_KEY = 'adminTools';
export const ADMIN_TOOLS_CHANGE_EVENT = 'adminTools:change';

export function isAdminToolsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(ADMIN_TOOLS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAdminToolsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      window.sessionStorage.setItem(ADMIN_TOOLS_STORAGE_KEY, 'true');
    } else {
      window.sessionStorage.removeItem(ADMIN_TOOLS_STORAGE_KEY);
    }
    window.dispatchEvent(new Event(ADMIN_TOOLS_CHANGE_EVENT));
  } catch {
    // ignore
  }
}
