import { Roboto } from 'next/font/google';
import dns from 'node:dns';
import React from 'react';
import Providers from './Providers';

// https://github.com/node-fetch/node-fetch/issues/1624#issuecomment-1407717012
dns.setDefaultResultOrder('ipv4first');

import '../styles/globals.css';
import Link from 'next/link';

// TODO: figure out if we don't need any weights
const roboto = Roboto({ subsets: ['latin'], weight: ['100', '300', '400', '500', '700', '900'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={roboto.className}>
        <Link href="https://en.wikipedia.org/wiki/Bill_Walton" target="_blank">
          <div className="fixed top-0 z-10 h-2 w-full bg-black" />
        </Link>
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
