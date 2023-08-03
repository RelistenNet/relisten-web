import { combineReducers } from 'redux';

import years from './years';
import shows from './shows';
import tapes from './tapes';

import app from './app';
import playback from './playback';
import live from './live';

export default combineReducers({
  years,
  shows,
  tapes,
  playback,
  app,
  live,
});
