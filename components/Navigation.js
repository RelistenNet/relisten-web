import { Component } from 'react'
import Link from 'next/link'
import { connect } from 'react-redux'

import bands from '../lib/bands'

import Player from './Player'

class Navigation extends Component {
  constructor(props, ctx) {
    super(props, ctx)

    this.state = {
      showMobileMenu: false
    }
  }

  render() {
    const { app } = this.props;

    return (
      <div className="navigation">
        <style jsx>{`
          .navigation {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            height: 50px;
            border-bottom: 1px solid #AEAEAE;
          }

          .navigation .relisten-mobile, .navigation .right-mobile {
            display: none;
          }

          .navigation .left > span, .navigation a {
            height: 100%;
            font-size: 1.4em;
            text-align: center;
            font-weight: bold;

            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .left {
            display: flex;
          }

          .right {
            height: 100%;
            display: flex;
          }

          .right a {
            width: 100px;
          }

          a {
            padding: 0 8px;
          }

          .artist, .default {
            padding: 0 8px;
            width: auto;
            text-transform: uppercase;
          }

          a:hover {
            background: #333;
            color: #FFF;
          }

          .player {
            flex: 1;
            text-align: center;
          }

          .navigation .right-mobile-menu a {
            font-size: 1em;
            height: auto;
          }

          @media only screen and (max-width: 1024px) {
            .navigation .relisten {
              display: none;
            }

            .navigation .relisten-mobile {
              display: flex;
            }

            .navigation .right-mobile {
              display: flex;
              padding: 0 8px;
            }

            .navigation .right-mobile .fa-bars {
              align-self: center;
            }

            .navigation .left > span.to, .navigation .artist {
              display: none;
            }

            .navigation .right {
              display: none;
            }
          }

        `}</style>
        <div className="left">
          <Link href="/" prefetch><a className="relisten">RELISTEN</a></Link>
          <Link href="/" prefetch><a className="relisten-mobile">R</a></Link>
          {bands[app.artistSlug] && <span className="to">TO</span>}
          {bands[app.artistSlug] &&
            <Link href="/" as={`/${app.artistSlug}`}>
              <a className="artist">{bands[app.artistSlug].the ? 'THE ' : ''}{bands[app.artistSlug].name}</a>
            </Link>
            /*
            : <span className="default">1,028,334 songs on 60,888 tapes from 102 bands</span>
            */
          }
        </div>
        <div className="player">
          <Player />
        </div>
        <div className="right-mobile">
          {this.state.showMobileMenu && <div className="right-mobile-menu">
            <Link href="/today" prefetch><a>TODAY</a></Link>
            <Link href="/live" prefetch><a>LIVE</a></Link>
            <Link href="/ios" prefetch><a>iOS</a></Link>
            <Link href="/about" prefetch><a>ABOUT</a></Link>
          </div>}
          <i className="fa fa-bars" onClick={this.toggleMobileMenu} />
        </div>
        <div className="right">
          <Link href="/today" prefetch><a>TODAY</a></Link>
          <Link href="/live" prefetch><a>LIVE</a></Link>
          <Link href="/ios" prefetch><a>iOS</a></Link>
          <Link href="/about" prefetch><a>ABOUT</a></Link>
        </div>
      </div>
    )
  }

  toggleMobileMenu = () => {
    this.setState({ showMobileMenu: !this.state.showMobileMenu })
  }
}


const mapStateToProps = ({ app }) => {
  return {
    app
  }
}

export default connect(mapStateToProps)(Navigation)
