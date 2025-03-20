'use client';

import { useState } from 'react';
import Flex from '../../components/Flex';

export default function AndroidUpgradeNotification() {
  const androidUpgradeNotificationDismissed = localStorage.getItem(
    'relistenAndroidNotificationDismissed'
  );
  const [alertVisible, setAlertVisible] = useState(!androidUpgradeNotificationDismissed);

  const dismissAlert = () => {
    localStorage.setItem('relistenAndroidNotificationDismissed', 'true');
    setAlertVisible(false);
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
        <button className="absolute right-2 top-2 text-lg font-bold" onClick={dismissAlert}>
          X
        </button>
      </section>
    </Flex>
  ) : null;
}
