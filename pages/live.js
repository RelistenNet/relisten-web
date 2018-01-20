import React, { Component } from 'react';
import withRedux from 'next-redux-wrapper'
import Router from 'next/router'

import { initStore } from '../redux'

import Layout from '../layouts'

import { fetchLive } from '../redux/modules/live'

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
        <div className="page-container">
          Live

          {live.data.map(data =>
            data.track && data.source ? <div key={data.track.id}>
              {data.track.title} - {data.source.artist.name}
            </div> : null
          )}
        </div>
        <style jsx>{`
          .page-container {
            flex: 1;
          }
        `}</style>
      </Layout>
    );
  }

}

export default withRedux(initStore, ({ live }) => ({ live }))(Live)
