import PlaybackSetting from './PlaybackSetting';
import ThemeToggle from './ThemeToggle';

/** The site settings: in the nav bar's settings popover at xl, and in the menu below it. */
export default function SettingsPanel() {
  return (
    <div className="flex flex-col gap-4">
      <ThemeToggle />
      <PlaybackSetting />
    </div>
  );
}
