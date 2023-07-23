import { Component } from 'react';
import Head from 'next/head';
import { connect } from 'react-redux';

import Layout from '../layouts';

import { fetchLive } from '../redux/modules/live';

import LiveTrack from '../components/LiveTrack';
import { wrapper } from '../redux';

// TODO: Update types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function uniqBy(a, key: (item: any) => boolean) {
  const seen = new Set();
  return a.filter((item) => {
    const k = key(item);
    return seen.has(k) ? false : seen.add(k);
  });
}

// TODO: Update types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const keyFn = (item: any): boolean => {
  return item && item.track && item.track.track && item.track.track.id;
};

type LiveProps = {
  // TODO: Update types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  live: any;
};

class Live extends Component<LiveProps> {
  state = {
    isMounted: false,
    lastSeenId: null,
  };
  intervalId: NodeJS.Timer;

  static getInitialProps = wrapper.getInitialPageProps((store) => () => {
    store.dispatch(fetchLive());

    return {
      live: store.getState().live,
      store,
    };
  });

  componentDidMount() {
    const get = async () => {
      const action = await this.props.store.dispatch(fetchLive());

      if (action.data.length) {
        this.setState({ lastSeenId: action.data.slice(-1)[0].id });
      }
    };

    this.intervalId = setInterval(get, 7000);
    get();

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

          {uniqBy(live.data, keyFn).map((data) => (
            <LiveTrack
              {...data}
              key={data.track.track.id}
              isFirstRender={!isMounted}
              isLastSeen={lastSeenId === data.id}
            />
          ))}
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

export default connect((live) => ({ live }))(Live);
