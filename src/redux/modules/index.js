import { combineReducers } from 'redux';

import playback from './playback';
import live from './live';

export default combineReducers({
  playback,
  live,
});
