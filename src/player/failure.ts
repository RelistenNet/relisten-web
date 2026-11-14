// ---------------------------------------------------------------------------
// Why a track failed to play: a best guess from what the browser already
// knows, with no extra requests.
//
//   - navigator.onLine
//   - the HTTP status of gapless's own download of the file, read from its
//     Resource Timing entry. A response the page may read (CORS allowed) has
//     its real status; a blocked or unanswered request reads 0. Browsers
//     without responseStatus (Safari), and HTML5-only playback (no download),
//     give nothing.
//   - the <audio> element's MediaError code. Code 4 covers a missing file, a
//     blocked one and a bad format alike, so it's the weakest signal.
// ---------------------------------------------------------------------------

export type FailureInput = {
  /** The file as the API gives it (archive.org, phish.in, …), to name the source. */
  mp3Url: string;
  /** Whether it was fetched through Relisten's audio proxy. */
  proxied: boolean;
  online: boolean;
  /** HTTP status of the download: 0 = no readable response; undefined = unknown. */
  status?: number;
  /** The <audio> element's MediaError code (2 network, 3 decode, 4 source). */
  mediaErrorCode?: number;
};

export type Failure = { description: string };

const SOURCE_NAMES: Record<string, string> = {
  'archive.org': 'archive.org',
  'phish.in': 'Phish.in',
};

/** "archive.org", "Phish.in", or the file's host. */
export function sourceName(mp3Url: string): string {
  try {
    const host = new URL(mp3Url).hostname.replace(/^www\./, '');
    return SOURCE_NAMES[host] ?? host;
  } catch {
    return 'the audio source';
  }
}

export function diagnose({
  mp3Url,
  proxied,
  online,
  status,
  mediaErrorCode,
}: FailureInput): Failure {
  const source = sourceName(mp3Url);
  // Through the proxy, a failure can be the proxy's or the source's.
  const servers = proxied ? `${source} or Relisten's audio server` : source;

  // Pressing play can't retry (gapless can't reload an entry's audio): a reload can.
  if (!online) return { description: "You're offline. Reconnect, then reload the page." };

  if (status === 404 || status === 410) {
    return { description: `The file is missing from ${source} (HTTP ${status}).` };
  }
  if (status === 401 || status === 403) {
    return { description: `${source} refused the file (HTTP ${status}). It may be restricted.` };
  }
  if (status === 429) {
    return { description: `${servers} is limiting requests (HTTP 429). Try again in a minute.` };
  }
  if (status !== undefined && status >= 500) {
    return { description: `${servers} is having trouble (HTTP ${status}). Try again later.` };
  }
  if (status !== undefined && status >= 400) {
    return { description: `${servers} couldn't serve the file (HTTP ${status}).` };
  }
  if (status === 0) {
    return {
      description: proxied
        ? `Relisten's audio server didn't answer, or the browser blocked its response. It may be down.`
        : `${source} didn't answer, or doesn't allow playback from other sites (CORS).`,
    };
  }

  if (mediaErrorCode === 2) {
    return { description: `The connection to ${servers} dropped while loading.` };
  }
  if (mediaErrorCode === 3) return { description: "The file is damaged, or isn't audio." };
  if (mediaErrorCode === 4) {
    return {
      description: `${servers} didn't serve a playable file: it may be missing, blocked, or down.`,
    };
  }
  return { description: `Something went wrong loading it from ${servers}.` };
}

/** A gapless error: "HTML5 audio error on track KEY (code N): …", or a play() rejection. */
export function parseGaplessError(error: Error): { key?: string; mediaErrorCode?: number } {
  const html5 = /HTML5 audio error on track (\S+) \(code (\d+|undefined)\)/.exec(error.message);
  if (html5) {
    const code = Number(html5[2]);
    return { key: html5[1], ...(Number.isFinite(code) ? { mediaErrorCode: code } : {}) };
  }
  // play() with no playable source.
  if (error.name === 'NotSupportedError') return { mediaErrorCode: 4 };
  return {};
}

/** Slow, not failed: playing, but the position hasn't moved. */
export function diagnoseStall(mp3Url: string, proxied: boolean, online: boolean): Failure {
  if (!online) return { description: "You're offline. It'll play once you reconnect." };
  const source = sourceName(mp3Url);
  return {
    description: proxied
      ? `${source} or Relisten's audio server is slow to respond.`
      : `${source} is slow to respond.`,
  };
}
