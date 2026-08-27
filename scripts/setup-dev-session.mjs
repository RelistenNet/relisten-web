// One-time setup for `pnpm dev:session`:
//  1. mkcert: trust a local CA and issue one cert for the local web/auth/accounts hosts.
//  2. Point the local RelistenUserService at that cert and a stable OpenIddict client secret
//     via `dotnet user-secrets` (nothing is printed or passed as an argument).
//
// Only step 1 is strictly this repo's concern; step 2 is here for convenience until
// RelistenApi grows its own bootstrap script.
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOSTS = [
  'localhost',
  'web.relisten.localhost',
  'auth.relisten.localhost',
  'accounts.relisten.localhost',
];

const webCheckout = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiProject = join(
  resolve(process.env.RELISTEN_API_CHECKOUT ?? join(webCheckout, '..', 'RelistenApi')),
  'RelistenUserService',
  'RelistenUserService.csproj'
);
const tlsDir =
  process.env.RELISTEN_LOCAL_TLS_DIR ??
  join(homedir(), 'Library', 'Application Support', 'Relisten', 'dev-tls');
const certPath = join(tlsDir, 'relisten-local.pem');
const keyPath = join(tlsDir, 'relisten-local-key.pem');
const secretPath = join(tlsDir, 'web-client-secret');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.error?.code === 'ENOENT') fail(`${cmd} is not installed.`);
  if (r.error || r.status !== 0) fail(`${cmd} ${args[0]} failed.`);
  return r;
}
function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (spawnSync('mkcert', ['-version'], { stdio: 'ignore' }).error) {
  fail('mkcert is required: brew install mkcert');
}

if (spawnSync('certutil', ['-H'], { stdio: 'ignore' }).error) {
  console.warn(
    'certutil not found: Firefox will not trust the local CA. brew install nss, then rerun.'
  );
}

mkdirSync(tlsDir, { recursive: true, mode: 0o700 });
run('mkcert', ['-install']);
run('mkcert', ['-cert-file', certPath, '-key-file', keyPath, ...HOSTS]);
chmodSync(keyPath, 0o600);

// Reused across runs: the local OpenIddict client stores a hash of this value,
// so rotating it would break an existing local database.
if (!existsSync(secretPath)) {
  writeFileSync(secretPath, randomBytes(32).toString('base64url') + '\n', { mode: 0o600 });
}
const clientSecret = readFileSync(secretPath, 'utf8').trim();

if (!existsSync(apiProject)) {
  console.warn(
    `RelistenUserService project not found at ${apiProject}; skipping dotnet user-secrets.`
  );
  console.warn('Set RELISTEN_API_CHECKOUT and rerun to configure the User Service.');
} else {
  const secrets = {
    'Accounts:WebClientSecret': clientSecret,
    'Kestrel:Certificates:Default:Path': certPath,
    'Kestrel:Certificates:Default:KeyPath': keyPath,
  };
  run('dotnet', ['user-secrets', 'set', '--project', apiProject], {
    input: JSON.stringify(secrets),
    stdio: ['pipe', 'ignore', 'inherit'],
  });
}

console.log(`Dev session TLS ready in ${tlsDir}. Start with: pnpm dev:session`);
