'use client';

import { useEffect } from 'react';
import { setBlogSeenCookie } from './BlogNavLink';

export default function BlogSeenMarker() {
  useEffect(() => {
    setBlogSeenCookie();
  }, []);

  return null;
}
