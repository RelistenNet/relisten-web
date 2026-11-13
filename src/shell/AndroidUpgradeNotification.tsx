'use client';

import { useSyncExternalStore } from 'react';
import Flex from '@/ui/base/Flex';

const DISMISSED_KEY = 'relistenAndroidNotificationDismissed';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isAndroid() {
  // Chromium exposes the platform as a structured client hint; others only have the UA string.
  const platform = (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData
    ?.platform;
  return platform ? platform === 'Android' : /\bAndroid\b/i.test(navigator.userAgent);
}

export default function AndroidUpgradeNotification() {
  // Hidden on the server, and on the client unless this is Android and
  // localStorage says it hasn't been dismissed.
  const alertVisible = useSyncExternalStore(
    subscribe,
    () => isAndroid() && !localStorage.getItem(DISMISSED_KEY),
    () => false
  );

  const dismissAlert = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    listeners.forEach((listener) => listener());
  };

  return alertVisible ? (
    <Flex column className="border-b-[1px] border-b-[#aeaeae]">
      <section className="relative my-2 flex flex-col justify-center">
        <div className="text-center">RELISTEN is now available on the Play Store!</div>
        <div className="text-center">
          Check it out{' '}
          <a
            href="https://play.google.com/store/apps/details?id=net.relisten.android&hl=en_US"
            className="text-blue-500"
          >
            here
          </a>
          .
        </div>
        <button className="absolute top-2 right-2 text-lg font-bold" onClick={dismissAlert}>
          X
        </button>
      </section>
    </Flex>
  ) : null;
}
