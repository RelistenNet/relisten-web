import { sourceSearchParamsLoader } from './sourceSearchParam';
import { tSearchParamsLoader } from './tSearchParam';

/** A track page's query: the tape (`?source=`) and a start time (`?t=`). */
export const trackSearchParams = sourceSearchParamsLoader.extend(tSearchParamsLoader.codecs);
