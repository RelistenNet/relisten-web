/**
 * Whether a page may start playback without a click. Requires that the visitor
 * has interacted with this document: crawlers that render pages never do, and
 * headless browsers often allow autoplay, so the browser's own autoplay policy
 * would still let them stream audio. Embedded players defer to the host page,
 * which grants autoplay through the iframe's `allow` attribute.
 */
export function canAutoplay(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.self !== window.top) return true;
  return navigator.userActivation?.hasBeenActive ?? true;
}
