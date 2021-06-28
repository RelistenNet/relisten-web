import React, { Component } from 'react';
import Head from 'next/head';
import { connect } from 'react-redux';

import Layout from '../layouts';

import { fetchLive } from '../redux/modules/live';

import LiveTrack from '../components/LiveTrack';

function uniqBy(a, key) {
  const seen = new Set();
  return a.filter(item => {
    const k = key(item);
    return seen.has(k) ? false : seen.add(k);
  });
}

const keyFn = (item) => {
  return item && item.track && item.track.track && item.track.track.id;
};

class Live extends Component {
  state = {
    isMounted: false,
    lastSeenId: null,
  }

  static async getInitialProps({ store, isServer, pathname, query }) {
    await store.dispatch(fetchLive());
    return {
      live: store.getState().live,
    };
  }

  componentDidMount() {
    this.intervalId = setInterval(async () => {
      const action = await this.props.dispatch(fetchLive());

      if (action.data.length) {
        this.setState({ lastSeenId: action.data.slice(-1)[0].id });
      }
    }, 7000);

    this.setState({ isMounted: true });
  }

  componentWillUnmount() {
    clearInterval(this.intervalId);
  }

  render() {
    const { isMounted, lastSeenId } = this.state;
    const { live } = this.props;

    return (
      <Layout navPrefix="TO" navSubtitle="Recently Played" navURL="/live">
        <Head>
          <title>Live | Relisten</title>
        </Head>
        <div className="page-container">
          <h1>Recently Played</h1>

          {uniqBy(live.data, keyFn).map(data =>
            <LiveTrack {...data} key={data.track.track.id} isFirstRender={!isMounted} isLastSeen={lastSeenId === data.id} />
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

export default connect(({ live }) => ({ live }))(Live);
