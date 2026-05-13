'use client';

import { useEffect, useRef, useState } from 'react';
import cn from '@/lib/cn';
import { clipAudio } from './clipAudio';

type Props = {
  url: string;
  title: string;
  duration: number;
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const SHORTID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
function shortid(len = 8) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) out += SHORTID_ALPHABET[bytes[i] % SHORTID_ALPHABET.length];
  return out;
}

export default function ClipEditor({ url, title, duration }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(30);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [stopAt, setStopAt] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [clip, setClip] = useState<{ url: string; filename: string; sizeKB: number } | null>(null);

  useEffect(() => {
    return () => {
      if (clip) URL.revokeObjectURL(clip.url);
    };
  }, [clip]);

  const setStartToPlayhead = () => {
    if (audioRef.current) setStart(Math.floor(audioRef.current.currentTime));
  };

  const previewClip = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = start;
    setStopAt(start + length);
    a.play();
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrentTime(a.currentTime);
    if (stopAt != null && a.currentTime >= stopAt) {
      a.pause();
      setStopAt(null);
    }
  };

  const delta = currentTime - start;
  const absDelta = Math.abs(delta);
  const driftWarn = absDelta >= 2;

  const prepareClip = async () => {
    setBusy(true);
    setStatus('Encoding…');
    if (clip) {
      URL.revokeObjectURL(clip.url);
      setClip(null);
    }
    try {
      const { blob, ext } = await clipAudio({ url, startSec: start, lengthSec: length });
      setClip({
        url: URL.createObjectURL(blob),
        filename: `${shortid()}.${ext}`,
        sizeKB: blob.size / 1024,
      });
      setStatus(null);
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="text-sm text-foreground-muted">
        {title} — duration {fmt(duration)}
      </div>

      <audio
        ref={audioRef}
        src={url}
        controls
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        crossOrigin="anonymous"
        className="w-full"
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Start (s)
          <input
            type="number"
            min={0}
            value={start}
            onChange={(e) => setStart(Math.max(0, Number(e.target.value)))}
            className="w-24 rounded border border-hairline bg-surface px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          Length (s)
          <input
            type="number"
            min={1}
            max={300}
            value={length}
            onChange={(e) => setLength(Math.max(1, Number(e.target.value)))}
            className="w-24 rounded border border-hairline bg-surface px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={setStartToPlayhead}
          className="rounded bg-surface px-3 py-1 text-sm hover:bg-surface-hover"
        >
          Set start to playhead
        </button>
        <button
          type="button"
          onClick={previewClip}
          className="rounded bg-surface px-3 py-1 text-sm hover:bg-surface-hover"
        >
          Preview clip
        </button>
        <button
          type="button"
          onClick={prepareClip}
          disabled={busy}
          className="rounded bg-accent px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Encoding…' : clip ? 'Re-encode clip' : 'Prepare clip'}
        </button>
        {clip && (
          <a
            href={clip.url}
            download={clip.filename}
            className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Save {clip.filename} ({clip.sizeKB.toFixed(1)} KB)
          </a>
        )}
      </div>

      <div
        className={cn('text-sm', {
          'text-foreground-muted': !driftWarn,
          'font-medium text-amber-600': driftWarn,
        })}
      >
        Playhead {fmt(currentTime)} · clip start {fmt(start)} ·{' '}
        {absDelta < 0.5
          ? 'aligned with playhead'
          : `${delta >= 0 ? 'playhead is ' : 'start is '}${absDelta.toFixed(1)}s ${delta >= 0 ? 'past clip start' : 'past playhead'}`}
        {driftWarn && ' — click "Set start to playhead" if you wanted them aligned.'}
      </div>

      {status && <div className="text-sm text-foreground-muted">{status}</div>}
    </div>
  );
}
