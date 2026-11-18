'use client';

import { themeCookie, type ThemeMode } from '@/lib/themeCookie';
import SegmentedControl from '@/ui/base/SegmentedControl';

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** The theme, applied at once: the cookie for the next document, data-theme for this one. */
export default function ThemeToggle() {
  const [mode, setMode] = themeCookie.useCookie();

  const handleSelect = (value: ThemeMode) => {
    setMode(value);
    if (value === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', value);
    }
  };

  return <SegmentedControl label="Theme" options={OPTIONS} value={mode} onChange={handleSelect} />;
}
