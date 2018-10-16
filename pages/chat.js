import Router from 'next/router'
import Head from 'next/head'

import Layout from '../layouts'

const Chat = () => (
  <Layout navPrefix="WITH" navSubtitle="US" navURL="/sonos">
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

        color: #FFF;
        font-weight: 500;
        box-shadow: inset 0 0 0 1px rgba(16,22,26,.4), inset 0 -1px 0 rgba(16,22,26,.2);
        background-image: linear-gradient(180deg,hsla(0,0%,100%,.1),hsla(0,0%,100%,0));
        background-color: #0f9960;
      }

      a:active {
        box-shadow: inset 0 0 0 1px rgba(16,22,26,.4), inset 0 1px 2px rgba(16,22,26,.2);
        background-color: #0a6640;
      }
    `}</style>
    <Head>
      <title>Chat | Relisten</title>
    </Head>
    <div className="page-container">
      <h1>Chat</h1>

      <p>We have a chatroom for you to provide feedback, report bugs, or recommend a jam. Fukuoka Twist anyone?</p>

      <a className="button" href="https://discordapp.com/invite/73fdDSS" target="_blank">
        Join us!
      </a>

      <br />
      <br />

      <iframe src="https://titanembeds.com/embed/395033814008594436?theme=IceWyvern&user=relisten-guest" height="600" width="800" frameBorder="0" />
    </div>
  </Layout>
)

export default Chat
