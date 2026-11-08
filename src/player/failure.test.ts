import { describe, expect, it } from 'vitest';
import { diagnose, parseGaplessError, sourceName } from './failure';

const archive = 'https://archive.org/download/gd77/gd77-05-08.s1t02.mp3';
const base = { mp3Url: archive, proxied: true, online: true };

describe('diagnose', () => {
  it('offline wins over everything', () => {
    expect(diagnose({ ...base, online: false, status: 404 }).description).toMatch(/offline/);
  });

  it('reads the download status', () => {
    expect(diagnose({ ...base, status: 404 }).description).toBe(
      'The file is missing from archive.org (HTTP 404).'
    );
    expect(diagnose({ ...base, status: 403 }).description).toMatch(/refused/);
    expect(diagnose({ ...base, status: 503 }).description).toBe(
      "archive.org or Relisten's audio server is having trouble (HTTP 503). Try again later."
    );
  });

  it('no readable response: unreachable or blocked', () => {
    expect(diagnose({ ...base, status: 0 }).description).toMatch(/didn't answer.*blocked/);
    expect(
      diagnose({ mp3Url: 'https://cdn.example.com/a.mp3', proxied: false, online: true, status: 0 })
        .description
    ).toMatch(/CORS/);
  });

  it('falls back to the media error code', () => {
    expect(diagnose({ ...base, mediaErrorCode: 3 }).description).toMatch(/damaged/);
    expect(diagnose({ ...base, mediaErrorCode: 2 }).description).toMatch(/dropped/);
    expect(diagnose({ ...base, mediaErrorCode: 4 }).description).toMatch(
      /missing, blocked, or down/
    );
  });

  it('prefers the status to the media error code', () => {
    expect(diagnose({ ...base, status: 404, mediaErrorCode: 4 }).description).toMatch(/missing/);
  });
});

describe('sourceName', () => {
  it('names known sources, else the host', () => {
    expect(sourceName(archive)).toBe('archive.org');
    expect(sourceName('https://phish.in/audio/1.mp3')).toBe('Phish.in');
    expect(sourceName('https://www.example.com/a.mp3')).toBe('example.com');
  });
});

describe('parseGaplessError', () => {
  it('reads the key and code from an HTML5 error', () => {
    expect(
      parseGaplessError(new Error('HTML5 audio error on track track_abc (code 4): Format error'))
    ).toEqual({ key: 'track_abc', mediaErrorCode: 4 });
  });

  it('a play() with no source is code 4 on the current track', () => {
    const e = new Error('Failed to load because no supported source was found.');
    e.name = 'NotSupportedError';
    expect(parseGaplessError(e)).toEqual({ mediaErrorCode: 4 });
  });
});
