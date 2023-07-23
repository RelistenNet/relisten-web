import { Component } from 'react';
import Head from 'next/head';
import { connect } from 'react-redux';

import Layout from '../layouts';

import { groupBy } from '../lib/utils';

import { fetchToday } from '../redux/modules/today';

import TodayTrack from '../components/TodayTrack';
import { wrapper } from '../redux';
import { Artist, Day } from '../types';

type TodayProps = {
  // TODO: Update type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  today: any;
};

class Today extends Component<TodayProps> {
  static getInitialProps = wrapper.getInitialPageProps((store) => async () => {
    await store.dispatch(fetchToday());

    return {
      today: store.getState().today,
    };
  });

  render() {
    const { today } = this.props;

    const artists: Artist[] = today.data.map((day: Day) => ({
      ...day,
      artistName: day.artist.name,
    }));
    const groupedBy: Day[][] = groupBy(artists, 'artistName');

    return (
      <Layout navPrefix="TO" navSubtitle="Today In History" navURL="/today">
        <div className="page-container">
          <Head>
            <title>Today | Relisten</title>
          </Head>
          <h1>Today in History</h1>
          {Object.entries(groupedBy).map(([artistName, days]) => (
            <div key={artistName}>
              <div className="artist-name">{artistName}</div>
              <div>
                {days.map((day: Day) => (
                  <TodayTrack day={day} key={day.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <style jsx>{`
          .page-container {
            flex: 1;
            max-width: 768px;
            width: 768px;
            margin: 0 auto;
          }

          .artist-name
            margin 12px 12px 0
            font-weight bold
            font-size 1.3em
        `}</style>
      </Layout>
    );
  }
}

export default connect(({ today }: any) => ({ today }))(Today);
