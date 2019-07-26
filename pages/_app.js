import React from 'react';
import App, { Container } from 'next/app';
import Head from 'next/head';
import { Provider } from 'react-redux';
import withRedux from 'next-redux-wrapper';
import Raven from 'raven-js';

require('@fortawesome/fontawesome-free/css/all.css');

// next.js polyfills for IE11
import 'core-js/features/object/assign';
import 'core-js/features/object/values';
import 'core-js/features/object/entries';
import 'core-js/features/string/ends-with';// unsure if needed
import 'core-js/features/string/starts-with';
import 'core-js/features/string/includes';
import 'core-js/features/array/includes';
import 'core-js/features/array/find';
import 'core-js/features/array/fill';
import 'core-js/features/promise';

import { initStore } from '../redux';

const SENTRY_PUBLIC_DSN = 'https://d8fe64a30ead43e2ac70c750bc79a806@sentry.io/1261843';

class MyApp extends App {
  constructor(...args) {
    super(...args);

    Raven.config(SENTRY_PUBLIC_DSN).install();
  }

  static async getInitialProps({ Component, ctx }) {
    let pageProps = {};

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx);
    }

    return { pageProps };
  }

  componentDidCatch(error, errorInfo) {
    Raven.captureException(error, { extra: errorInfo });

    // This is needed to render errors correctly in development / production
    super.componentDidCatch(error, errorInfo);
  }

  render() {
    const { Component, pageProps, store } = this.props;

    const fullPath = this.props.router.asPath;
    const content = 'app-id=715886886, app-argument=https://relisten.net' + fullPath;

    return (
      <Container>
        <Head>
          <title>Relisten</title>
          <meta name="apple-itunes-app" content={content} />
        </Head>
        <Provider store={store}>
          <Component {...pageProps} />
        </Provider>
      </Container>
    );
  }
}

export default withRedux(initStore)(MyApp);
