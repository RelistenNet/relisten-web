import React from 'react';
import Head from 'next/head';

import Layout from '../layouts';

const Sonos = () => (
  <Layout navPrefix="ON" navSubtitle="Sonos" navURL="/sonos">
    <style jsx>{`
      .page-container {
        flex: 1;
        margin: 0 auto;
        max-width: 800px;
      }

      img {
        max-width: 320px;
      }
    `}</style>
    <Head>
      <title>Sonos | Relisten</title>
    </Head>
    <div className="page-container">
      <h1>Sonos</h1>

      <p>
        Relisten is available for use on all Sonos devices. Enjoy your concertos in the comfort of
        your home.
      </p>

      <h3>Installation</h3>

      <p>
        Open your Sonos application and go to <strong>Add Music Services</strong> and search for{' '}
        <strong>Relisten</strong>. Easy as pie.
      </p>

      <div>
        <img src="https://i.imgur.com/Qe7lMlf.jpg" alt="add music service" />
      </div>

      <h3>Screenshots</h3>

      <div>
        <img src="https://i.imgur.com/q1LbjJ6.png" alt="screenshot" />
      </div>
    </div>
  </Layout>
);

export default Sonos;
