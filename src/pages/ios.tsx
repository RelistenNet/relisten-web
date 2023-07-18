import React from 'react';
import Head from 'next/head';

import Layout from '../layouts';

const IOS = (): JSX.Element => (
  <Layout navPrefix="ON" navSubtitle="iOS" navURL="/ios">
    <style jsx>{`
      .page-container {
        flex: 1;
        margin: 0 auto;
        max-width: 800px;
      }

      img {
        max-width: 320px;
      }

      a.button {
        padding: 5px 10px;
        border-radius: 3px;

        color: #fff;
        font-weight: 500;
        box-shadow: inset 0 0 0 1px rgba(16, 22, 26, 0.4), inset 0 -1px 0 rgba(16, 22, 26, 0.2);
        background-image: linear-gradient(180deg, hsla(0, 0%, 100%, 0.1), hsla(0, 0%, 100%, 0));
        background-color: #0f9960;
      }

      a:active {
        box-shadow: inset 0 0 0 1px rgba(16, 22, 26, 0.4), inset 0 1px 2px rgba(16, 22, 26, 0.2);
        background-color: #0a6640;
      }
    `}</style>
    <Head>
      <title>iOS | Relisten</title>
    </Head>
    <div className="page-container">
      <h1>iOS</h1>

      <p>Relisten is available for download on iOS. Take all of your live recordings on the go.</p>

      <a
        className="button"
        href="https://itunes.apple.com/us/app/relisten-all-live-music/id715886886?mt=8"
        target="_blank"
        rel="noreferrer"
      >
        Download it here!
      </a>

      <h3>Screenshots</h3>
      <a
        href="https://itunes.apple.com/us/app/relisten-all-live-music/id715886886?mt=8"
        target="_blank"
        rel="noreferrer"
      >
        <img src="https://i.imgur.com/mevPKDB.png" alt="relisten for ios" />
      </a>
    </div>
  </Layout>
);

export default IOS;
