import { defineConfig, type OxlintConfig } from 'oxlint';
import base from '@switz/lint-config/oxlint' with { type: 'json' };
import react from '@switz/lint-config/oxlint/react' with { type: 'json' };
import tailwind from '@switz/lint-config/oxlint/tailwind' with { type: 'json' };

export default defineConfig({
  // JSON imports widen rule severities to strings; keep the shared runtime config intact.
  ...(base as unknown as OxlintConfig),
  extends: [react as OxlintConfig, tailwind as unknown as OxlintConfig],
  overrides: [
    ...((base as unknown as OxlintConfig).overrides ?? []),
    {
      // Project rule settings live in an override: the presets in `extends` win over top-level rules.
      files: ['**/*.{ts,tsx}'],
      rules: {
        'no-console': ['warn', { allow: ['error', 'warn', 'info', 'debug'] }],
        // Let `oxlint --fix` wrap long class strings (JSX attributes and JS strings).
        'tailwindcss/enforce-consistent-line-wrapping': [
          'warn',
          { printWidth: 100, wrapLines: 'overWidth', wrapStrings: 'all' },
        ],
      },
    },
    {
      // takumi (ImageResponse) renders JSX with a `tw` prop for Tailwind classes.
      files: ['src/app/album-art/**/*.tsx', 'src/app/**/opengraph-image.tsx'],
      rules: { 'react/no-unknown-property': ['error', { ignore: ['tw'] }] },
    },
  ],
  settings: {
    ...react.settings,
    tailwindcss: {
      entryPoint: './src/styles/globals.css',
    },
  },
});
