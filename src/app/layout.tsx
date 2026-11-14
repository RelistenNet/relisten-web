import dns from 'node:dns';
import React from 'react';
import type { Metadata } from '@timber-js/app/server';
import { METADATA_BASE } from '@/lib/constants';
import Providers from './Providers';
import PreviewIndicator from '@/components/PreviewIndicator';
import { getDeploymentEnvironment } from '@/lib/deployment/server';
import { roboto } from '../fonts';
import { themeCookie } from '../lib/themeCookie';

// https://github.com/node-fetch/node-fetch/issues/1624#issuecomment-1407717012
dns.setDefaultResultOrder('ipv4first');

import '../styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const deployment = getDeploymentEnvironment();
  const theme = themeCookie.get();
  const dataTheme = theme === 'light' || theme === 'dark' ? theme : undefined;
  return (
    <html lang="en" className={roboto.className} data-theme={dataTheme}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-itunes-app" content="app-id=715886886" />
      </head>
      <body
        style={
          deployment.isPreview
            ? ({ '--preview-banner-height': '4rem' } as React.CSSProperties)
            : undefined
        }
      >
        <PreviewIndicator deployment={deployment} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  metadataBase: METADATA_BASE,
  title: {
    template: '%s | Relisten',
    default: 'Relisten',
  },
};
