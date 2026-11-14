// When a page may start playback on its own.
//
// Crawlers render pages, and headless browsers allow autoplay, so the
// browser's autoplay policy can't tell a crawler from a listener who allowed
// sound (and Chrome can't be asked without calling play(), which downloads
// the audio). So a page autoplays only for someone who has interacted with it,
// or a returning listener: one who has started playback by interacting
// before, on this browser. Crawlers start with empty storage and can't set
// that without interacting.

export const LISTENED_KEY = 'relisten.listened';

const inIframe = () => window.self !== window.top;
const automated = () => navigator.webdriver === true;

/**
 * Whether a page may start playback without a click. Embedded players defer
 * to the host page, which grants autoplay through the iframe's `allow`
 * attribute. If the browser still blocks it, gapless reports it and the
 * "Autoplay blocked" prompt appears.
 */
export function canAutoplay(): boolean {
  if (typeof window === 'undefined') return false;
  if (inIframe()) return true;
  // No userActivation API: assume no interaction (crawlers mustn't autoplay).
  if (navigator.userActivation?.hasBeenActive) return true;
  return isReturningListener();
}

// navigator.getAutoplayPolicy: Firefox only, and not in TypeScript's DOM types yet.
type AutoplayPolicy = 'allowed' | 'allowed-muted' | 'disallowed';
type PolicyNavigator = Navigator & { getAutoplayPolicy?: (type: 'mediaelement') => AutoplayPolicy };

/**
 * Whether the browser says it would refuse playback with sound. Only Firefox
 * can be asked without calling play() (which starts the download); elsewhere
 * this is false, the attempt finds out, and gapless drops what it started.
 * 'allowed-muted' counts as refused: the player plays with sound.
 */
export function browserRefusesAutoplay(): boolean {
  if (typeof window === 'undefined') return false;
  const policy = (navigator as PolicyNavigator).getAutoplayPolicy?.('mediaelement');
  return policy === 'disallowed' || policy === 'allowed-muted';
}

function isReturningListener(): boolean {
  if (automated()) return false;
  try {
    return localStorage.getItem(LISTENED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Playback started. If the visitor interacted to start it, remember them, so
 * their next page loads can autoplay. Never in embeds (another site's page) or
 * automated browsers.
 */
export function rememberListener(): void {
  if (typeof window === 'undefined' || inIframe() || automated()) return;
  if (!navigator.userActivation?.hasBeenActive) return;
  try {
    localStorage.setItem(LISTENED_KEY, '1');
  } catch {
    // Best-effort: they'll see the prompt next time.
  }
}
