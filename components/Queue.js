import { Component } from 'react'
import Router from 'next/router'

import { splitShowDate } from '../lib/utils'
import bands from '../lib/bands'
import player from '../lib/player'

import Row from './Row'

export default class Queue extends Component {
  render() {
    const { playback, tapes } = this.props;

    const band = bands[playback.artistSlug]
    const tape = tapes[playback.artistSlug] ? tapes[playback.artistSlug][playback.showDate] : null

    return (
      <div className="queue">
        <style jsx>{`
          .queue {
            width: 33%;
            max-height: 188px;
            display: flex;
            flex-direction: column;
            overflow-y: scroll;
            cursor: pointer;
          }

          .queue .active {
            background: #333;
            color: #FFF;
          }

          .track {
            min-height: 32px;
            padding: 6px 0;
          }
        `}</style>
        {playback.tracks.map((track, idx) => {

          return (
            <Row
              onClick={() => player.gotoTrack(idx, true)}
              active={idx === playback.activeTrack.idx}
              key={idx}>
              <div>{track.title}</div>
              <div onClick={this.goToShow}>
                {band && <div>{band.name}</div>}
                {tape && <div>{tape.data.display_date}</div>}
              </div>
            </Row>
          );
        })}
      </div>
    )
  }

  goToShow = (e) => {
    e.stopPropagation()

    const { artistSlug, showDate, source } = this.props.playback
    const { year, month, day } = splitShowDate(showDate)

    Router.push('/', `/${artistSlug}/${year}/${month}/${day}?source=${source}`);
  }
}
