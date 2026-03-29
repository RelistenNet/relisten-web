import dns from 'node:dns';
import React from 'react';
import type { Metadata } from '@timber-js/app/server';
import Providers from './Providers';
import { roboto } from '../fonts';

// https://github.com/node-fetch/node-fetch/issues/1624#issuecomment-1407717012
dns.setDefaultResultOrder('ipv4first');

import '../styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={roboto.className}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="apple-itunes-app" content="app-id=715886886" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  metadataBase: new URL('https://relisten.net'),
  title: {
    template: '%s | Relisten',
    default: 'Relisten',
  },
};
