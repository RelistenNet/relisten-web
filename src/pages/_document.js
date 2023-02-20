import Document, { Head, Html, Main, NextScript } from 'next/document';
import Script from 'next/script';

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);

    return { ...initialProps };
  }

  render() {
    return (
      <Html>
        <Head>
          <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <meta httpEquiv="Content-Language" content="en" />
          <meta name="google" content="notranslate" />
          <link rel="icon" href="/favicon.ico" />
          <style>
            {`
              body { margin: 0; font-family: Roboto, Helvetica, Helvetica Neue, sans-serif; -webkit-font-smoothing: antialiased; color: #333; }
              a { text-decoration: none; color: #333; }
            `}
          </style>
        </Head>
        <body>
          <Main />
          <NextScript />
          <Script
            strategy="lazyOnload"
            async
            defer
            data-domain="relisten.net"
            src="https://plausible.typetwo.space/js/plausible.js"
          />
        </body>
      </Html>
    );
  }
}
