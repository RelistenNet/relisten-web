import React from 'react'
import Document, { Head, Main, NextScript } from 'next/document'
import flush from 'styled-jsx/server'
import { Helmet } from 'react-helmet'

export default class MyDocument extends Document {
  static getInitialProps ({ renderPage }) {
    const { html, head } = renderPage()
    const styles = flush()
    return { html, head, styles, helmet: Helmet.rewind() }
  }

  render () {
    const { helmet } = this.props

    return (
     <html {...helmet.htmlAttributes.toComponent()}>
       <Head>
        <link rel="stylesheet" type="text/css" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" async />
        <style>
          {`
            body { margin: 0; font-family: Helvetica, sans-serif; }
            a { text-decoration: none; color: #333; }
          `}
        </style>
          {helmet.title.toComponent()}
          {helmet.meta.toComponent()}
          {helmet.link.toComponent()}
       </Head>
       <body {...helmet.bodyAttributes.toComponent()}>
          <Main />
          <NextScript />
       </body>
     </html>
    )
  }
}
