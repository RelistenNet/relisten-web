import dns from 'node:dns';
import { Roboto } from 'next/font/google';
import Script from 'next/script';
import React from 'react';
import Providers from './Providers';

// https://github.com/node-fetch/node-fetch/issues/1624#issuecomment-1407717012
dns.setDefaultResultOrder('ipv4first');

import '../styles/globals.css';

// TODO: figure out if we don't need any weights
const roboto = Roboto({ subsets: ['latin'], weight: ['100', '300', '400', '500', '700', '900'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={roboto.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

export const metadata = {
  title: {
    template: '%s | Relisten',
    default: 'Relisten', // a default is required when creating a template
  },
};
