'use client';

import { useSyncExternalStore } from 'react';
import { ADMIN_TOOLS_CHANGE_EVENT, isAdminToolsEnabled } from '@/lib/adminTools';

function subscribe(onChange: () => void) {
  window.addEventListener(ADMIN_TOOLS_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(ADMIN_TOOLS_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useAdminTools(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isAdminToolsEnabled(),
    () => false
  );
}
