'use client';

import { themeCookie, type ThemeMode } from '@/lib/themeCookie';

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function ThemeToggle() {
  const [mode, setMode] = themeCookie.useCookie();

  const handleSelect = (value: ThemeMode) => {
    setMode(value);
    if (value === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.dataset.theme = value;
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span id="theme-toggle-label" className="text-sm text-text-secondary">
        Theme:
      </span>
      <div
        role="radiogroup"
        aria-labelledby="theme-toggle-label"
        className="inline-flex rounded-md border border-hairline bg-surface-elevated p-0.5"
      >
        {OPTIONS.map(({ value, label }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => handleSelect(value)}
              className={`rounded-sm px-3 py-1 text-sm transition-colors cursor-pointer ${
                active
                  ? 'bg-surface-raised text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
