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
        <div className="mx-auto w-full max-w-screen-md flex-1">
          <Head>
            <title>Today | Relisten</title>
          </Head>
          <h1 className="my-4 text-4xl font-semibold">Today in History</h1>
          {Object.entries(groupedBy).map(([artistName, days]) => (
            <div key={artistName}>
              <div className="p-4 pl-0 text-2xl font-semibold">{artistName}</div>
              <div>
                {days.map((day: Day) => (
                  <TodayTrack day={day} key={day.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Layout>
    );
  }
}

export default connect(({ today }: any) => ({ today }))(Today);
