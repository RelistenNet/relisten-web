import Link from 'next/link'
import { connect } from 'react-redux'

import bands from '../lib/bands'

const Navigation = ({ app }) => (
  <div className="navigation">
    <style jsx>{`
      .navigation {
        display: flex;
        flex-direction: row;
        height: 50px;
        border-bottom: 1px solid #bbb;
      }

      .navigation > span, .navigation a {
        height: 100%;
        font-size: 1.4em;
        text-align: center;
        text-transform: uppercase;
        font-weight: bold;

        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .right {
        height: 100%;
        margin-left: auto;
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
      }

      a:hover {
        background: #333;
        color: #FFF;
      }

    `}</style>
    <Link href="/" prefetch><a>Relisten</a></Link>
    {bands[app.artistSlug] && <span>to</span>}
    {bands[app.artistSlug] &&
      <Link href="/" as={`/${app.artistSlug}`}>
        <a className="artist">{bands[app.artistSlug].the ? 'the ' : ''}{bands[app.artistSlug].name}</a>
      </Link>
      /*
      : <span className="default">1,028,334 songs on 60,888 tapes from 102 bands</span>
      */
    }
    <div className="right">
      <Link href="/about" prefetch><a>About</a></Link>
      <Link href="/ios" prefetch><a>iOS</a></Link>
    </div>
  </div>
)


const mapStateToProps = ({ app }) => {
  return {
    app
  }
}

export default connect(mapStateToProps)(Navigation)
