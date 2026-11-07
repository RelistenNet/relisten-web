// Writes src/api/generated/artistFeatures.ts from the swagger's
// ArtistResource.features.x-feature-flags map (flag name → decimal bit value).
// Runs after orval (see orval.config.ts), so the flags track the API spec.
import { readFileSync, writeFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync('src/api/swagger.json', 'utf8'));
const flags = spec.components.schemas.ArtistResource.properties.features['x-feature-flags'];
if (!flags || !Object.keys(flags).length) {
  throw new Error('swagger.json: ArtistResource.features has no x-feature-flags');
}

const entries = Object.entries(flags)
  .map(([name, value]) => `  ${name}: '${value}',`)
  .join('\n');

writeFileSync(
  'src/api/generated/artistFeatures.ts',
  `// Generated from ArtistResource.features.x-feature-flags by scripts/gen-artist-features.mjs. Do not edit.

/** Artist feature flags: each value is the flag's bit in the decimal-string \`features\` mask. */
export const ArtistFeature = {
${entries}
} as const;

export type ArtistFeatureName = keyof typeof ArtistFeature;
`
);
