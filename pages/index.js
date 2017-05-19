import withRedux from 'next-redux-wrapper'
import Router from 'next/router'

import { initStore } from '../redux'
import { fetchArtists } from '../redux/modules/artists'
import { fetchYears } from '../redux/modules/years'
import { fetchShows } from '../redux/modules/shows'
import { fetchTapes } from '../redux/modules/tapes'
import { updatePlayback, updatePlaybackTrack } from '../redux/modules/playback'

import { updateApp } from '../redux/modules/app'
import { createShowDate, splitShowDate, getParams } from '../lib/utils'
import player, { isPlayerMounted, initGaplessPlayer } from '../lib/player'
import routesRegex from '../lib/customRoutes'
import '../lib/hotkeys'

import Layout from '../layouts'

import Column from '../components/Column'
import ArtistsColumn from '../components/ArtistsColumn'
import YearsColumn from '../components/YearsColumn'
import ShowsColumn from '../components/ShowsColumn'
import TapesColumn from '../components/TapesColumn'
import SongsColumn from '../components/SongsColumn'

const Root = ({ app }) => (
  <Layout>
    <style jsx>{`
      .content {
        flex: 1;
        display: flex;
        flex-direction: row;
      }
    `}</style>
    <div className="content">
      <ArtistsColumn />
      <YearsColumn />
      <ShowsColumn />
      <SongsColumn />
      <TapesColumn />
    </div>
  </Layout>
)

const handleRouteChange = (store, url) => {
  console.log('handleRouteChange', url)
  const dispatches = []

  const [pathname, params] = url.split('?')

  if (routesRegex.test(pathname)) return;

  const [artistSlug, year, month, day, songSlug] = pathname.replace(/^\//, '').split('/')
  const paramsObj = getParams(params)
  const { source } = paramsObj

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

  if (artistSlug && !year && !month && !day) {
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
    if (typeof window !== 'undefined') playSong(store)
  }

  if (pathname === '/') {
    dispatches.push(
      new Promise(async (resolve) => {
        await store.dispatch(fetchArtists())
        const artists = store.getState().artists
        if (artists && artists.data.length) {
          const randomArtist = artists.data[Math.floor(Math.random() * artists.data.length)]

          if (randomArtist) {
            await getRandomShow(randomArtist.slug, store)
          }
        }

        resolve()
      })
    )
  }

  return dispatches
}

Root.getInitialProps = async ({ req, store }) => {
  let dispatches = [store.dispatch(fetchArtists())]

  if (req) dispatches = dispatches.concat(handleRouteChange(store, req.url))

  await Promise.all(dispatches)

  return {}
}

Router.onRouteChangeStart = (url) => {
  handleRouteChange(window.store, url)
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    playSong(window.store)
  }, 0)
}

const playSong = (store) => {
  const { playback, tapes } = store.getState()
  const { artistSlug, showDate, source, songSlug } = playback
  const activePlaybackSourceId = parseInt(source, 10)
  const showTapes = tapes[artistSlug] && tapes[artistSlug][showDate] ? tapes[artistSlug][showDate] : null
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
  let tracks = []

  tape.sets.map((set, setIdx) =>
    set.tracks.map((track, trackIdx) => {
      tracks.push(track)
      if (track.slug === songSlug) currentIdx = idx
      idx++
    })
  )

  if (!isPlayerMounted()) {
    initGaplessPlayer(store)
  }
  else {
    player.pauseAll()
    player.tracks = []
  }

  tracks.map((track, trackIdx) => {
    player.addTrack(window.FLAC ? track.flac_url || track.mp3_url : track.mp3_url)
  })

  store.dispatch(updatePlayback({ tracks }))

  player.gotoTrack(currentIdx)
  player.play()
}

const getRandomShow = (artistSlug, store) => {
  return (
    fetch(`https://relistenapi.alecgorge.com/api/v2/artists/${artistSlug}/shows/random`)
      .then(res => res.json())
      .then(json => {
        if (!json || !json.data) return;

        const { year, month, day } = splitShowDate(json.data.display_date)
        return Promise.all(handleRouteChange(store, `/${artistSlug}/${year}/${month}/${day}`))
      })
    )
}

export default withRedux(initStore)(Root)
