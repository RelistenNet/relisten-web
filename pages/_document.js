import Document, { Head, Main, NextScript } from 'next/document'
import flush from 'styled-jsx/server'

export default class MyDocument extends Document {
  static getInitialProps ({ renderPage }) {
    const { html, head } = renderPage()
    const styles = flush()
    return { html, head, styles }
  }

  render () {
    return (
     <html>
       <Head>
         <style>
          {`
            body { margin: 0; font-family: Helvetica, sans-serif; }
            a { text-decoration: none; color: #333; }
          `}
        </style>
       </Head>
       <body>
          <Main />
          <NextScript />
       </body>
     </html>
    )
  }
}
