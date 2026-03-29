import dns from 'node:dns';
import React from 'react';
import type { Metadata } from '@timber-js/app/server';
import Providers from './Providers';

// https://github.com/node-fetch/node-fetch/issues/1624#issuecomment-1407717012
dns.setDefaultResultOrder('ipv4first');

import '../styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="apple-itunes-app" content="app-id=715886886" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet" />
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
