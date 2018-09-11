import React from 'react'
import Document, { Head, Main, NextScript } from 'next/document'
import flush from 'styled-jsx/server'

export default class MyDocument extends Document {
  static getInitialProps ({ renderPage, req }) {
    const { html, head, errorHtml, chunks } = renderPage()
    const styles = flush()

    return { html, head, errorHtml, chunks, styles, fullPath: req.url }
  }
  render () {
    const { fullPath } = this.props;

    return (
      <html>
        <Head>
          <title>Relisten</title>
          <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" />
          <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.0.9/css/all.css" integrity="sha384-5SOiIsAziJl6AWe0HWRKTXlfcSHKmYV4RBF18PPJ173Kzn7jzMyFuTtk8JA7QQG1" crossOrigin="anonymous" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <meta httpEquiv="Content-Language" content="en" />
          <meta name="apple-itunes-app" content={`app-id=715886886, app-argument=https://relisten.net${fullPath}`} />
          <meta name="google" content="notranslate" />
          <link rel="icon" href="/static/favicon.ico" />
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
          <script async src="https://www.googletagmanager.com/gtag/js?id=UA-54000407-2" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());

                gtag('config', 'UA-54000407-2');
              `
            }}
          />
        </body>
     </html>
    )
  }
}
