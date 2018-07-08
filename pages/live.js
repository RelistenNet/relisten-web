import React, { Component } from 'react';
import withRedux from 'next-redux-wrapper'
import Router from 'next/router'
import Head from 'next/head'

import { initStore } from '../redux'

import Layout from '../layouts'

import { fetchLive } from '../redux/modules/live'

import LiveTrack from '../components/LiveTrack';

function uniqBy(a, key) {
  var seen = new Set();
  return a.filter(item => {
      var k = key(item);
      return seen.has(k) ? false : seen.add(k);
  });
}

const keyFn = (item) => {
  return item && item.track && item.track.track && item.track.track.id;
}

class Live extends Component {
  static async getInitialProps({ store, isServer, pathname, query }) {
    await store.dispatch(fetchLive());
    return {
      live: store.getState().live,
    };
  }

  componentDidMount() {
    this.intervalId = setInterval(() =>
      this.props.dispatch(fetchLive())
    , 7000);
  }

  componentWillUnmount() {
    clearInterval(this.intervalId);
  }

  render() {
    const { live } = this.props;

    return (
      <Layout>
        <Head>
          <title>Live | Relisten</title>
        </Head>
        <div className="page-container">
          {uniqBy(live.data, keyFn).map(data =>
            <LiveTrack {...data} key={data.track.track.id} />
          )}
        </div>
        <style jsx>{`
          .page-container {
            flex: 1;
            max-width: 768px;
            width: 768px;
            margin: 0 auto;
          }
        `}</style>
      </Layout>
    );
  }

}

export default withRedux(initStore, ({ live }) => ({ live }))(Live)
