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
      // Layering: only the data layer talks to the API. Everything else goes
      // through src/data (or the RelistenAPI facade) and uses src/domain types.
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/api', '@/api/**'],
                message: 'Only src/data imports the API client; use src/data and src/domain types.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/data/**', 'src/api/**'],
      rules: { 'no-restricted-imports': 'off' },
    },
    {
      // A feature never imports another feature (it imports its own files
      // relatively). Shared code moves down into src/ui or src/domain; a page
      // showing two features composes them in its route.
      files: ['src/features/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/api', '@/api/**'],
                message: 'Only src/data imports the API client; use src/data and src/domain types.',
              },
              {
                group: ['@/features/**', '../**'],
                message:
                  'Features do not import other features: move shared code to src/ui or src/domain, or compose in the route.',
              },
            ],
          },
        ],
      },
    },
    {
      // Shared UI stays independent of any feature or data source.
      files: ['src/ui/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/api', '@/api/**'],
                message: 'Only src/data imports the API client; use src/data and src/domain types.',
              },
              {
                group: ['@/features/**', '@/data/**', '@/shell/**', '@/player/**'],
                message:
                  'src/ui is shared: it takes data as props and never imports features, src/data, the shell, or the player.',
              },
            ],
          },
        ],
      },
    },
    {
      // The player is a service features use; it never depends on a feature or the shell.
      files: ['src/player/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/api', '@/api/**'],
                message: 'Only src/data imports the API client; use src/data and src/domain types.',
              },
              {
                group: ['@/features/**', '@/shell/**'],
                message: 'The player is a service: it never imports features or the shell.',
              },
            ],
          },
        ],
      },
    },
    {
      // Tests assemble fixtures across layers (API responses → domain → rows).
      files: ['src/**/*.test.ts', 'src/**/__fixtures__/**'],
      rules: { 'no-restricted-imports': 'off' },
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
