import withRedux from 'next-redux-wrapper'
import Router from 'next/router'

import { initStore } from '../redux'
import { fetchArtists } from '../redux/modules/artists'
import { fetchYears } from '../redux/modules/years'
import { fetchShows } from '../redux/modules/shows'
import { fetchTapes } from '../redux/modules/tapes'
import { updatePlayback } from '../redux/modules/playback'

import { updateApp } from '../redux/modules/app'
import { createShowDate, getParams } from '../lib/utils'

import Layout from '../layouts'

import Column from '../components/Column'
import ArtistsColumn from '../components/ArtistsColumn'
import YearsColumn from '../components/YearsColumn'
import ShowsColumn from '../components/ShowsColumn'
import TapesColumn from '../components/TapesColumn'
import SongsColumn from '../components/SongsColumn'

const Root = ({ app }) => (
  <Layout className="root">
    <style jsx>{`
      .content {
        display: flex;
        flex-direction: row;
        height: 100vh;
      }
    `}</style>
    <div className="content">
      <ArtistsColumn />
      <YearsColumn />
      <ShowsColumn />
      <TapesColumn />
      <SongsColumn />
    </div>
  </Layout>
)

const handleRouteChange = (store, url) => {
  console.log('handleRouteChange', url)
  const dispatches = []

  const [pathname, params] = url.split('?')

  const [artistSlug, year, month, day, songSlug] = pathname.replace(/^\//, '').split('/')
  const paramsObj = getParams(params)
  const { source } = paramsObj

  store.dispatch(
    updateApp({
      artistSlug,
      year,
      month,
      day,
      songSlug
    })
  )

  if (artistSlug) {
    dispatches.push(store.dispatch(fetchYears(artistSlug)))
  }

  if (artistSlug && year) {
    dispatches.push(store.dispatch(fetchShows(artistSlug, year)))
  }

  if (artistSlug && year && month && day) {
    dispatches.push(store.dispatch(fetchTapes(artistSlug, year, createShowDate(year, month, day))))
  }

  if (artistSlug && year && month && day && songSlug) {
    dispatches.push(store.dispatch(updatePlayback({ artistSlug, year, showDate: createShowDate(year, month, day), songSlug, source, paused: false })))
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

export default withRedux(initStore)(Root)
