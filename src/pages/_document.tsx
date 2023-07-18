import Document, { DocumentContext, Head, Html, Main, NextScript } from 'next/document';
import Script from 'next/script';

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);

    return { ...initialProps };
  }

  render() {
    const headStyle = `
      body { margin: 0; font-family: Roboto, Helvetica, Helvetica Neue, sans-serif; -webkit-font-smoothing: antialiased; color: #333; }
      a { text-decoration: none; color: #333; }
    `
    return (
      <Html>
        <Head>
          <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" />
          <link rel="icon" href="/favicon.ico" />
          <style>{headStyle}</style>
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
