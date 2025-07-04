import { Roboto } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import dns from 'node:dns';
import React from 'react';
import Providers from './Providers';

// https://github.com/node-fetch/node-fetch/issues/1624#issuecomment-1407717012
dns.setDefaultResultOrder('ipv4first');

import '../styles/globals.css';
// import Link from 'next/link';

// TODO: figure out if we don't need any weights
const font = Roboto({ subsets: ['latin'], weight: ['400', '500', '700', '900'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="apple-itunes-app" content="app-id=715886886" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={font.className}>
        <NextTopLoader showSpinner={false} />
        {/* <Link href="https://en.wikipedia.org/wiki/Phil_Lesh" target="_blank">
          <div className="fixed top-0 z-10 h-2 w-full bg-black" />
        </Link> */}
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
