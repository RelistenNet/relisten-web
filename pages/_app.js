import React from 'react';
import App, { Container } from 'next/app';
import Head from 'next/head'
import { Provider } from 'react-redux';
import withRedux from 'next-redux-wrapper'
import Raven from 'raven-js'

// next.js polyfills for IE11
import 'core-js/fn/object/assign'
import 'core-js/fn/object/values'
import 'core-js/fn/object/entries'
import 'core-js/fn/string/ends-with'// unsure if needed
import 'core-js/fn/string/starts-with'
import 'core-js/fn/string/includes'
import 'core-js/fn/array/includes'
import 'core-js/fn/array/find'
import 'core-js/features/promise';

import { initStore } from '../redux'

const SENTRY_PUBLIC_DSN = 'https://d8fe64a30ead43e2ac70c750bc79a806@sentry.io/1261843'

class MyApp extends App {
  constructor(...args) {
    super(...args);

    Raven.config(SENTRY_PUBLIC_DSN).install();
  }

  static async getInitialProps({ Component, router, ctx }) {
    let pageProps = {};

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx);
    }

    return { pageProps };
  }

  componentDidCatch(error, errorInfo) {
    Raven.captureException(error, { extra: errorInfo })

    // This is needed to render errors correctly in development / production
    super.componentDidCatch(error, errorInfo)
  }

  render() {
    const { Component, pageProps, store } = this.props;

    const fullPath = this.props.router.asPath;

    return (
      <Container>
        <Head>
          <meta name="apple-itunes-app" content={`app-id=715886886, app-argument=https://relisten.net${fullPath}`} />
        </Head>
        <Provider store={store}>
          <Component {...pageProps} />
        </Provider>
      </Container>
    );
  }
}

export default withRedux(initStore)(MyApp);
