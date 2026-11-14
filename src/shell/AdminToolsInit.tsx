'use client';

import { useEffect } from 'react';
import { setAdminToolsEnabled } from '@/lib/adminTools';

export default function AdminToolsInit() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('SHOW_ADMIN_TOOLS');
    if (raw === 'true') setAdminToolsEnabled(true);
    else if (raw === 'false') setAdminToolsEnabled(false);
  }, []);

  return null;
}
