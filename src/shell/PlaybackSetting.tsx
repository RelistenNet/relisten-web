'use client';

import { useId, useState } from 'react';
import cn from '@/lib/cn';
import {
  isMobileDevice,
  playbackSettingsAtLoad,
  savedPlaybackSettings,
  savePlaybackSettings,
  type PlaybackMode,
  type PlaybackSettings,
} from '@/player/playbackMode';
import SegmentedControl from '@/ui/base/SegmentedControl';

const OPTIONS: { value: PlaybackMode; label: string; description: string }[] = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'Gapless, preloading the next track.',
  },
  {
    value: 'preload-2',
    label: 'Preload 2',
    description:
      'Gapless, preloading the next 2 tracks. Rides out a flaky connection, but uses more data and memory.',
  },
  {
    value: 'no-gapless',
    label: 'Disable Gapless',
    description: 'Plays as it streams and preloads nothing. Short gaps between tracks.',
  },
];

/** The player's playback settings. Mounted only while its popover is open (client only). */
export default function PlaybackSetting() {
  const [settings, setSettings] = useState(savedPlaybackSettings);
  const [mobile] = useState(isMobileDevice);
  const switchId = useId();
  const current = OPTIONS.find((option) => option.value === settings.mode) ?? OPTIONS[0];

  const update = (next: Partial<PlaybackSettings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    savePlaybackSettings(merged);
  };

  const atLoad = playbackSettingsAtLoad();
  const changed =
    settings.mode !== atLoad.mode ||
    (mobile && settings.forceGaplessOnMobile !== atLoad.forceGaplessOnMobile);
  const forceDisabled = settings.mode === 'no-gapless';

  return (
    <div className="flex flex-col gap-1.5">
      <SegmentedControl
        label="Playback"
        options={OPTIONS}
        value={settings.mode}
        onChange={(mode) => update({ mode })}
      />
      <p className="text-xs leading-snug text-text-secondary">
        {current.description}
        {mobile &&
          !forceDisabled &&
          !settings.forceGaplessOnMobile &&
          ' On this device, streams instead.'}
      </p>

      {mobile && (
        <label
          htmlFor={switchId}
          className={cn(
            'mt-1 flex cursor-pointer items-start justify-between gap-3',
            forceDisabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-sm text-text-primary">Force gapless on this device</span>
            <span className="text-xs leading-snug text-text-secondary">
              Phones pause Web Audio in the background, so playback may stop when the screen locks.
            </span>
          </span>
          <button
            id={switchId}
            type="button"
            role="switch"
            aria-checked={settings.forceGaplessOnMobile}
            disabled={forceDisabled}
            onClick={() => update({ forceGaplessOnMobile: !settings.forceGaplessOnMobile })}
            className={cn(
              'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed',
              settings.forceGaplessOnMobile
                ? 'bg-relisten-500'
                : 'bg-surface-hover ring-1 ring-hairline'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform',
                settings.forceGaplessOnMobile && 'translate-x-4'
              )}
            />
          </button>
        </label>
      )}

      {changed && (
        <p className="text-xs leading-snug text-text-primary">
          Takes effect when you reload the page.
        </p>
      )}
    </div>
  );
}
