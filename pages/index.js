import React from 'react'
import Router from 'next/router'
import Head from 'next/head'
import UAParser from 'ua-parser-js'

import 'isomorphic-fetch';

import { fetchArtists } from '../redux/modules/artists'
import { fetchYears } from '../redux/modules/years'
import { fetchShows } from '../redux/modules/shows'
import { fetchTapes } from '../redux/modules/tapes'
import { updatePlayback, updatePlaybackTrack } from '../redux/modules/playback'

import { updateApp } from '../redux/modules/app'
import { createShowDate, splitShowDate, getParams, removeLeadingZero } from '../lib/utils'
import player, { isPlayerMounted, initGaplessPlayer } from '../lib/player'
import artistSlugs from '../lib/artistSlugs'
import '../lib/hotkeys'

import Layout from '../layouts'

import Column from '../components/Column'
import ArtistsColumn from '../components/ArtistsColumn'
import YearsColumn from '../components/YearsColumn'
import ShowsColumn from '../components/ShowsColumn'
import TapesColumn from '../components/TapesColumn'
import SongsColumn from '../components/SongsColumn'

const Root = ({ app = {}, playback, url, isMobile, artists, serverRenderedMP3, serverRenderedSongTitle }) => {
  let title = false;
  let activeColumn = 'artists'
  let activeSongURL;

  if (!url) url = window.location.pathname

  const [artistSlug, year, month, day, songSlug] = url.replace(/^\//, '').split('/')
  const bandTitle = artists.data[artistSlug] ? artists.data[artistSlug].name : '';

  if (artistSlug && year && month && day && songSlug) {
    // TODO: hook up actual title (this doesn't work on the server since playback.tracks hasn't been added yet)
    const track = playback.tracks.find(track => track.slug === songSlug)
    const trackTitle = track ? track.title : serverRenderedSongTitle;
    title = trackTitle ? `${trackTitle} ${removeLeadingZero(month)}/${removeLeadingZero(day)}/${year.slice(2)} ${bandTitle}` : ''
    activeColumn = 'songs'
  }

  else if (artistSlug && year && month && day) {
    title = `${removeLeadingZero(month)}/${removeLeadingZero(day)}/${year.slice(2)} ${bandTitle}`
    activeColumn = 'songs'
  }

  else if (artistSlug && year) {
    title = `${year} ${bandTitle}`
    activeColumn = 'shows'
  }

  else if (artistSlug) {
    title = bandTitle
    activeColumn = 'years'
  }

  return (
    <Layout>
      <style jsx>{`
        .page-container {
          flex: 1;
          display: flex;
          flex-direction: row;
        }
      `}</style>
      <div className="page-container">
        {title && (!player || !player.tracks.length) &&
          <Head>
            <title>{title} | Relisten</title>
            <meta property="og:title" content={title} />
            <meta property="og:image" content="https://cdn.rawgit.com/RelistenNet/relisten-ios/485488eb/Assets/RelistenAppIcon.png" />
            {serverRenderedMP3 && <meta property="og:type" content="music.song" />}
            {serverRenderedMP3 && <meta property="og:audio:url" content={serverRenderedMP3} />}
            {serverRenderedMP3 && <meta property="og:audio:secure_url" content={serverRenderedMP3} />}
            {serverRenderedMP3 && <meta property="og:audio:type" content="audio/mp3" />}
          </Head>
        }
        {(!isMobile || activeColumn === 'artists') && <ArtistsColumn />}
        {(!isMobile || activeColumn === 'years') && <YearsColumn />}
        {(!isMobile || activeColumn === 'shows') && <ShowsColumn />}
        {(!isMobile || activeColumn === 'songs') && <SongsColumn />}
        {(!isMobile || activeColumn === 'tapes') && <TapesColumn />}
      </div>
    </Layout>
  );
}

const handleRouteChange = (store, url, forceIsPaused) => {
  const dispatches = []
  const afterDispatches = []
  const { isMobile } = store.getState().app

  const [pathname, params] = url.split('?')

  const [artistSlug, year, month, day, songSlug] = pathname.replace(/^\//, '').split('/')
  const paramsObj = getParams(params)
  const { source } = paramsObj

  // if not a band, fallback
  if (artistSlugs.indexOf(artistSlug) === -1) {
    return [];
  }

  store.dispatch(
    updateApp({
      artistSlug,
      year,
      month,
      day,
      songSlug,
      source
    })
  )

  if (artistSlug) {
    dispatches.push(store.dispatch(fetchYears(artistSlug)))
  }

  // just artist slug, get random show
  if (artistSlug && !year && !month && !day && !isMobile) {
    dispatches.push(getRandomShow(artistSlug, store))
  }

  if (artistSlug && year) {
    dispatches.push(store.dispatch(fetchShows(artistSlug, year)))
  }

  if (artistSlug && year && month && day) {
    dispatches.push(store.dispatch(fetchTapes(artistSlug, year, createShowDate(year, month, day))))
  }

  if (artistSlug && year && month && day && songSlug) {
    dispatches.push(store.dispatch(updatePlayback({ artistSlug, year, showDate: createShowDate(year, month, day), songSlug, source, paused: false })))
    if (typeof window !== 'undefined') {
      afterDispatches.push(() => new Promise((resolve) => {
        playSong(window.store, forceIsPaused)
        resolve()
      }))
    }
  }

  if (pathname === '/' && !isMobile) {
    dispatches.push(
      new Promise(async (resolve) => {
        await store.dispatch(fetchArtists())

        const { artists } = store.getState()

        if (artists && artists.data && artists.data.length) {
          const randomArtist = artists.data[Math.floor(Math.random() * artists.data.length)]

          if (randomArtist) {
            await getRandomShow(randomArtist.slug, store)
          }
        }

        resolve()
      })
    )
  }

  return [dispatches, afterDispatches]
}

Root.getInitialProps = async ({ req, store }) => {
  const { type } = new UAParser(req ? req.headers['user-agent'] : navigator.userAgent).getDevice()
  const isMobile = type === 'mobile'

  let dispatches = [store.dispatch(fetchArtists()), store.dispatch(updateApp({ isMobile }))]

  const [nextDispatches = [], afterDispatches = []] = req ? handleRouteChange(store, req.url) : [[], []];

  if (req) dispatches = dispatches.concat(nextDispatches)

  await Promise.all(dispatches)
  await Promise.all(afterDispatches.map(f => f()))

  const { app, playback, artists, tapes } = store.getState()

  const { artistSlug, showDate, source, songSlug } = playback
  const activePlaybackSourceId = parseInt(source, 10)
  const showTapes = tapes[artistSlug] && tapes[artistSlug][showDate] ? tapes[artistSlug][showDate] : null
  let activeTrack;

  if (showTapes && showTapes.data && showTapes.data.sources && showTapes.data.sources.length) {
    const { sources } = showTapes.data

    const tape = sources.find(tape => tape.id === activePlaybackSourceId) || sources[0]

    if (tape) {
      let idx = 0
      let currentIdx = 0
      let activeTrackId;
      let tracks = []

      tape.sets.map((set, setIdx) =>
        set.tracks.map((track, trackIdx) => {
          if (track.slug === songSlug) {
            activeTrack = track;
          }
        })
      )
    }
  }

  return { app, playback, url: req ? req.url : null, isMobile, artists, serverRenderedMP3: activeTrack ? activeTrack.mp3_url : null, serverRenderedSongTitle: activeTrack ? activeTrack.title : null }
}

Router.onRouteChangeStart = async (url) => {
  if (typeof window !== 'undefined' && window.UPDATED_TRACK_VIA_GAPLESS) {
    window.UPDATED_TRACK_VIA_GAPLESS = false
    return 'nonsense'
  }
  const [nextDispatches = [], afterDispatches = []] = handleRouteChange(window.store, url)

  await Promise.all(nextDispatches)
  await Promise.all(afterDispatches.map(f => f()))
}

if (typeof window !== 'undefined') {
  setTimeout(async () => {
    const { currentTime, duration } = localStorage;
    const cachedUrl = window.location.pathname + window.location.search;
    const [artistSlug, year, month, day, songSlug] = window.location.pathname.replace(/^\//, '').split('/')

    if (!songSlug && localStorage.lastPlayedUrl) {
      const [nextDispatches = [], afterDispatches = []] = handleRouteChange(window.store, localStorage.lastPlayedUrl, true);

      await Promise.all(nextDispatches)
      await Promise.all(afterDispatches.map(f => f()))

      if (currentTime && player.currentTrack) {
        player.currentTrack.seek(currentTime);

        window.store.dispatch(updatePlaybackTrack({ currentTime: parseFloat(currentTime), duration: parseFloat(duration) }));
      }

      if (artistSlugs.indexOf(artistSlug) === -1) {
        Router.replace(cachedUrl);
      }
      else {
        Router.replace('/', cachedUrl);
      }

      return;
    }

    playSong(window.store)
      const paramsObj = getParams(window.location.search)
      if (paramsObj.t) {
        const [min, sec] = paramsObj.t.split('m')

        player.currentTrack && player.currentTrack.seek(parseInt(min, 10) * 60 + parseInt(sec, 10))
      }
  }, 0)
}

const playSong = (store, forceIsPaused) => {
  const { playback, tapes } = store.getState()
  const { artistSlug, showDate, source, songSlug } = playback
  const activePlaybackSourceId = parseInt(source, 10)
  const showTapes = tapes[artistSlug] && tapes[artistSlug][showDate] ? tapes[artistSlug][showDate] : null
  const playImmediately = forceIsPaused ? false : true
  let tape

  console.log('play song', playback, showTapes)
  if (!showTapes) return console.log('err showTapes')

  if (showTapes.data && showTapes.data.sources && showTapes.data.sources.length) {
    const { sources } = showTapes.data

    tape = sources.find(tape => tape.id === activePlaybackSourceId) || sources[0]
  }

  if (!tape) return console.log('err tape')

  let idx = 0
  let currentIdx = 0
  let activeTrackId;
  let tracks = []

  tape.sets.map((set, setIdx) =>
    set.tracks.map((track, trackIdx) => {
      tracks.push(track)
      if (track.slug === songSlug) {
        currentIdx = idx
        activeTrackId = track.id
      }
      idx++
    })
  )

  if (tracks.length && typeof window.Notification !== 'undefined') {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
  }

  if (!isPlayerMounted()) {
    initGaplessPlayer(store)
  }
  else {
    // check if track is already in queue, and re-use
    const prevFirstTrack = player.tracks[0];
    const nextFirstTrack = tracks[0];
    if (prevFirstTrack && nextFirstTrack && prevFirstTrack.metadata.trackId === nextFirstTrack.id) {
      player.gotoTrack(currentIdx, playImmediately)
      return;
    }
    else {
      player.pauseAll()
      player.tracks = []
    }
  }

  tracks.map((track, trackIdx) => {
    const url = window.FLAC ? track.flac_url || track.mp3_url : track.mp3_url;

    player.addTrack({
      trackUrl: url,
      skipHEAD: /phish\.in/.test(url), // skip phish from loading head due to cloudflare
      metadata: {
        trackId: track.id,
      }
    });
  })

  store.dispatch(updatePlayback({ tracks }))

  player.gotoTrack(currentIdx, playImmediately)
}

const getRandomShow = (artistSlug, store) => {
  return (
    fetch(`https://relistenapi.alecgorge.com/api/v2/artists/${artistSlug}/shows/random`)
      .then(res => res.json())
      .then(json => {
        if (!json) return;

        const { year, month, day } = splitShowDate(json.display_date)
        const [dispatches] = handleRouteChange(store, `/${artistSlug}/${year}/${month}/${day}`);

        return Promise.all(dispatches);
      })
    )
}

export default Root
