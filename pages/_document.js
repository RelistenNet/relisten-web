import React from 'react';
import Document, { Head, Main, NextScript } from 'next/document';

const artists = [
  'robert-hunter',
  'circles-around-the-sun',
  'hard-working-americans',
];

const randomSlug = () => artists[Math.floor(Math.random() * artists.length)];

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);

    return { ...initialProps };
  }

  render() {
    return (
      <html>
        <Head>
          <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <meta httpEquiv="Content-Language" content="en" />
          <meta name="google" content="notranslate" />
          <link rel="icon" href="/static/favicon.ico" />
          <style>
            {`
              body { margin: 0; font-family: Roboto, Helvetica, Helvetica Neue, sans-serif; -webkit-font-smoothing: antialiased; color: #333; }
              a { text-decoration: none; color: #333; }
              #thanks-neal-and-rh { display: block; position: fixed; top: 1px; left: 0; right: 0; height: 4px; background: #000; }
              #thanks-neal-and-rh > div { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
            `}
          </style>
        </Head>
        <body>
          <Main />
          <NextScript />
          <a href={`/${randomSlug()}`} id="thanks-neal-and-rh"><div></div></a>
          <script async src="https://www.googletagmanager.com/gtag/js?id=UA-54000407-2" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());

                gtag('config', 'UA-54000407-2');
              `,
            }}
          />
        </body>
      </html>
    );
  }
}
