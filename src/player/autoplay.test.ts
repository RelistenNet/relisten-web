import { afterEach, describe, expect, it, vi } from 'vitest';
import { canAutoplay, LISTENED_KEY, rememberListener } from './autoplay';

function browser({
  activated = false,
  webdriver = false,
  iframe = false,
  listened = false,
}: { activated?: boolean; webdriver?: boolean; iframe?: boolean; listened?: boolean } = {}) {
  const data = new Map<string, string>(listened ? [[LISTENED_KEY, '1']] : []);
  const win = {} as { self: unknown; top: unknown };
  win.self = win;
  win.top = iframe ? {} : win;
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', { webdriver, userActivation: { hasBeenActive: activated } });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

describe('canAutoplay', () => {
  it('a first visit without interaction (or a crawler) may not', () => {
    browser();
    expect(canAutoplay()).toBe(false);
  });

  it('after an interaction it may', () => {
    browser({ activated: true });
    expect(canAutoplay()).toBe(true);
  });

  it('a returning listener may, without interacting', () => {
    browser({ listened: true });
    expect(canAutoplay()).toBe(true);
  });

  it('an automated browser with the flag may not', () => {
    browser({ listened: true, webdriver: true });
    expect(canAutoplay()).toBe(false);
  });

  it('an embed defers to the host page', () => {
    browser({ iframe: true });
    expect(canAutoplay()).toBe(true);
  });

  it('is false on the server', () => {
    expect(canAutoplay()).toBe(false);
  });
});

describe('rememberListener', () => {
  it('remembers a listener who interacted to start playback', () => {
    const data = browser({ activated: true });
    rememberListener();
    expect(data.get(LISTENED_KEY)).toBe('1');
  });

  it("doesn't remember playback that started without an interaction", () => {
    const data = browser({ listened: false });
    rememberListener();
    expect(data.has(LISTENED_KEY)).toBe(false);
  });

  it('never in embeds or automated browsers', () => {
    const embed = browser({ activated: true, iframe: true });
    rememberListener();
    expect(embed.has(LISTENED_KEY)).toBe(false);
    const bot = browser({ activated: true, webdriver: true });
    rememberListener();
    expect(bot.has(LISTENED_KEY)).toBe(false);
  });
});
