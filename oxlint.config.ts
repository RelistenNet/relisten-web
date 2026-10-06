import { defineConfig, type OxlintConfig } from 'oxlint';
import base from '@switz/lint-config/oxlint' with { type: 'json' };
import react from '@switz/lint-config/oxlint/react' with { type: 'json' };
import tailwind from '@switz/lint-config/oxlint/tailwind' with { type: 'json' };

export default defineConfig({
  // JSON imports widen rule severities to strings; keep the shared runtime config intact.
  ...(base as unknown as OxlintConfig),
  extends: [react as OxlintConfig, tailwind as unknown as OxlintConfig],
  settings: {
    ...react.settings,
    tailwindcss: {
      entryPoint: './src/styles/globals.css',
    },
  },
});
