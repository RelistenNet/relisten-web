import { Component } from 'react'
import Router from 'next/router'

import { splitShowDate, durationToHHMMSS } from '../lib/utils'
import bands from '../lib/bands'
import player from '../lib/player'

import Row from './Row'

export default class Queue extends Component {
  componentWillReceiveProps(nextProps) {
    const { playback } = this.props;

    if (playback.activeTrack.idx !== nextProps.playback.activeTrack.idx && this.queue) {
      const nextTrack = this.queue.querySelector(`[data-idx="${nextProps.playback.activeTrack.idx}"`)
      if (nextTrack) this.scrollToPos(this.queue, nextTrack.offsetTop - this.queue.offsetTop - 16, 600)
    }
  }

  render() {
    const { playback, tapes } = this.props;

    const band = bands[playback.artistSlug]
    const tape = tapes[playback.artistSlug] ? tapes[playback.artistSlug][playback.showDate] : null

    return (
      <div className="queue" ref={ref => this.queue = ref}>
        <style jsx>{`
          .queue {
            width: 33%;
            max-height: 188px;
            display: flex;
            flex-direction: column;
            overflow-y: scroll;
            cursor: pointer;
            transition: scroll
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
              data-idx={idx}
              key={idx}>
              <div>
                <div>{track.title}</div>
                <div>{durationToHHMMSS(track.duration)}</div>
              </div>
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

  scrollToPos = (element, to, duration) => {
    var start = element.scrollTop,
        change = to - start,
        currentTime = 0,
        increment = 16;

    //t = current time
    //b = start value
    //c = change in value
    //d = duration
    const easeInOutQuad = function (t, b, c, d) {
      t /= d/2;
      if (t < 1) return c/2*t*t + b;
      t--;
      return -c/2 * (t*(t-2) - 1) + b;
    };

    var animateScroll = function(){
        currentTime += increment;
        element.scrollTop = easeInOutQuad(currentTime, start, change, duration);

        if (currentTime < duration) {
            window.requestAnimationFrame(animateScroll);
        }
    };

    window.requestAnimationFrame(animateScroll);
  }

  goToShow = (e) => {
    e.stopPropagation()

    const { artistSlug, showDate, source } = this.props.playback
    const { year, month, day } = splitShowDate(showDate)

    Router.push('/', `/${artistSlug}/${year}/${month}/${day}?source=${source}`);
  }
}
