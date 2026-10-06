import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';

// Dependency-only installs and source archives do not need developer Git hooks.
if (
  process.env.HUSKY === '0' ||
  (process.env.CI && process.env.CI !== 'false') ||
  process.env.NODE_ENV === 'production' ||
  !existsSync('.git') ||
  !existsSync('node_modules/husky')
) {
  process.exit(0);
}

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' });
const configured = git('config', '--get', 'core.hooksPath');
if (configured.error || ![0, 1].includes(configured.status)) {
  throw new Error('Unable to inspect Git hooks configuration.');
}

// Respect an existing hook manager, including inherited/global configuration.
const hooksPath = configured.stdout.trim();
if (configured.status === 0 && hooksPath !== '.husky/_') {
  process.stderr.write('Skipping Husky: core.hooksPath is already configured.\n');
  process.exit(0);
}
if (!hooksPath) {
  const hooks = git('rev-parse', '--git-path', 'hooks').stdout.trim();
  if (existsSync(hooks) && readdirSync(hooks).some((name) => !name.endsWith('.sample'))) {
    process.stderr.write('Skipping Husky: existing Git hooks need to be reviewed first.\n');
    process.exit(0);
  }
}

const husky = (await import('husky')).default;
const error = husky();
if (error) throw new Error(error);
