import React from 'react';
import { Component, Fragment } from 'react';
import Link from 'next/link';
import { connect } from 'react-redux';

import Player from './Player';
import Modal from './Modal';
import InlinePopup from './InlinePopup';
import Menu from './Menu';

class Navigation extends Component {
  render() {
    return (
      <div className="navigation">
        <style jsx>{`
          .navigation
            display: flex;
            flex-direction: row;
            height: 50px;
            min-height: 50px;
            max-height: 50px;
            border-bottom: 1px solid #AEAEAE;
            position: relative;
            color: #333;
            background: #FFF;

          .navigation .relisten-mobile {
            display: none;
          }

          :global(.navigation a, .navigation > .left > span) {
            height: 100%;
            text-align: center;

            display: flex;
            flex-direction: row;
            align-items: center;
          }

          .relisten-title {
            margin-left: 4px;
          }

          .left {
            display: flex;
            flex: 2;
            font-weight: bold;
          }

          .player {
            min-width: 42vw;
            text-align: center;
          }

          .menu-button
            display flex
            align-items center

          @media (max-width: 980px) {
              .player {
                min-width: 60%;
              }
            }

          @media (max-width: 480px) {
              .player {
                min-width: 80%;
              }
            }

          .right {
            height: 100%;
            display: flex;
            flex: 2;
            justify-content: flex-end;
            text-align: center;
            font-weight: bold;
            align-items: center;
            cursor: pointer;
          }

          :global(.navigation a), .right > div {
            padding: 0 4px;
            height: 100%;
          }

          :global(.artist, .default) {
            width: auto;
            text-transform: uppercase;
          }

          a:active, .right > div:active {
            color: #333;
            position: relative;
            top: 1px;
          }

          i {
            font-size: 0.6em;
            margin-left: 4px;
            opacity: 0.8;
          }

          @media only screen and (max-width: 1024px) {
            .navigation .desktop {
              display: none;
            }

            .navigation .relisten-mobile {
              display: flex;
            }

            :global(.navigation .left > span.to), :global(.navigation .artist) {
              display: none;
            }
          }

        `}</style>
        <div className="left">
          <Link href="/" prefetch><a className="relisten-title desktop">RELISTEN</a></Link>
          <Link href="/" prefetch><a className="relisten-mobile">Re</a></Link>
          {this.secondaryNavTitle}
        </div>
        <div className="player">
          <Player />
        </div>
        <div className="right relisten-mobile" onClick={this.toggleMenu}>
          <div className="menu-button">MENU</div>
          <InlinePopup ref={ref => this.modal = ref}>
            <Menu />
          </InlinePopup>
        </div>
        <div className="right nav desktop">
          <div><Link href="/today" prefetch><a>TIH</a></Link></div>
          <div><Link href="/recent-streams" prefetch><a>RECENT STREAMS</a></Link></div>
          <div><Link href="/chat" prefetch><a>CHAT</a></Link></div>
          <div><Link href="/ios" prefetch><a>iOS</a></Link></div>
          <div><Link href="/sonos" prefetch><a>SONOS</a></Link></div>
          <div><Link href="/about" prefetch><a>ABOUT</a></Link></div>
        </div>
      </div>
    );
  }

  get secondaryNavTitle() {
    const { artists, app, navPrefix, navSubtitle, navURL } = this.props;

    if (navSubtitle) {
      return (
        <Fragment>
          <span className="to">{navPrefix}</span>
          <Link href="/" as={navURL}>
            <a className="artist">{navSubtitle}</a>
          </Link>
        </Fragment>
      );
    }

    return (
      <Fragment>
        {artists.data[app.artistSlug] && <span className="to">TO</span>}
        {artists.data[app.artistSlug] &&
          <Link href="/" as={`/${app.artistSlug}`}>
            <a className="artist">{artists.data[app.artistSlug].the ? 'THE ' : ''}{artists.data[app.artistSlug].name}</a>
          </Link>
          /*
          : <span className="default">1,028,334 songs on 60,888 tapes from 102 bands</span>
          */
        }
      </Fragment>
    );
  }

  toggleMenu = async () => {
    this.modal.toggleModal();
  }
}


const mapStateToProps = ({ app, artists }) => {
  return {
    app,
    artists,
  };
};

export default connect(mapStateToProps)(Navigation);
