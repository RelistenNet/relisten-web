import App, { Container } from 'next/app';
import React from 'react';
import { Provider } from 'react-redux';
import withRedux from 'next-redux-wrapper'
import Raven from 'raven-js'

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

    return (
      <Container>
        <Provider store={store}>
          <Component {...pageProps} />
        </Provider>
      </Container>
    );
  }
}

export default withRedux(initStore)(MyApp);
