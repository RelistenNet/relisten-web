'use client';

import { RefObject, useEffect } from 'react';

export default function Scroller({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    containerRef?.current
      ?.querySelector(`[data-is-active="true"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [containerRef.current]);

  return null;
}
