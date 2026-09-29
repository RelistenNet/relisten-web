'use client';

import { useSegmentParams } from '@timber-js/app/client';
import React from 'react';
import Row, { unwrapSegment } from './Row';

type RowSegmentMatchProps = {
  children?: React.ReactNode;
  href?: string;
  loading?: boolean;
  activeSegments: Record<string, string | undefined>;
  fallbackParams?: Record<string, string>;
};

const RowSegmentMatch = ({ activeSegments, fallbackParams, ...props }: RowSegmentMatchProps) => {
  const params = useSegmentParams() as Record<string, string | string[] | undefined>;
  const active = Object.entries(activeSegments).every(
    ([key, value]) => (unwrapSegment(params[key]) ?? fallbackParams?.[key]) === value
  );
  return <Row {...props} active={active} />;
};

export default RowSegmentMatch;
