import withRedux from 'next-redux-wrapper'
import Router from 'next/router'

import { initStore } from '../redux'

import Layout from '../layouts'

const About = () => (
  <Layout>
    <style jsx>{`
      .page-container {
        flex: 1;
        max-width: 768px;
        width: 768px;
        margin: 0 auto;
      }

      .italic {
        font-style: italic;
      }
    `}</style>
    <div className="page-container">
      <button onClick={() => window.FLAC = true}>FLAC</button>

      <p>
        Welcome to Relisten.
      </p>

      <p>
        Peruse the various bands and enjoy their extensive live catalogues for free.
      </p>

      <p>
        This site is powered by Archive.org, Phish.in, and PanicStream.
      </p>

      <p>
        Everything on our end is open source at <a href="https://github.com/relistennet" target="_blank">https://github.com/relistennet</a>
      </p>

      <p>
        Enjoy <br />
        - Daniel Saewitz and Alec Gorge, admin@relisten.net
      </p>

      <br />
      <br />

      <p>
        This site complies with Archive.org's <a href="https://archive.org/post/261115/hotlinking-allowed" target="_blank">policy</a>.
      </p>

      <p className="italic">
        The Grateful Dead and our managing organizations have long encouraged the purely non-commercial exchange of music taped at our concerts and those of our individual members. That a new medium of distribution has arisen - digital audio files being traded over the Internet - does not change our policy in this regard. Our stipulations regarding digital distribution are merely extensions of those long-standing principles and they are as follow: No commercial gain may be sought by websites offering digital files of our music, whether through advertising, exploiting databases compiled from their traffic, or any other means. All participants in such digital exchange acknowledge and respect the copyrights of the performers, writers and publishers of the music. This notice should be clearly posted on all sites engaged in this activity. We reserve the ability to withdraw our sanction of non-commercial digital music should circumstances arise that compromise our ability to protect and steward the integrity of our work.
      </p>
    </div>
  </Layout>
)

export default withRedux(initStore)(About)
