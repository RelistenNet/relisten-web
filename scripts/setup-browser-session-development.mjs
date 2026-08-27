import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const minimumNode = { major: 22, minor: 18 };
const localHosts = [
  'web.relisten.localhost',
  'auth.relisten.localhost',
  'accounts.relisten.localhost',
];

const webCheckout = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiCheckout = resolve(
  process.env.RELISTEN_API_CHECKOUT ?? join(webCheckout, '..', 'RelistenApi')
);
const apiProject = join(apiCheckout, 'RelistenUserService', 'RelistenUserService.csproj');
const tlsDirectory = configuredTlsDirectory();
const certificatePath = join(tlsDirectory, 'relisten-local.pem');
const certificateKeyPath = join(tlsDirectory, 'relisten-local-key.pem');
const certificateAuthorityPath = join(tlsDirectory, 'ca.pem');
const clientSecretPath = join(tlsDirectory, 'web-client-secret');

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Browser-session setup failed.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function main() {
  requireSupportedNode();
  requireCommand('mkcert', ['-version'], missingMkcertMessage());
  requireCommand('dotnet', ['--version'], 'Install the .NET SDK and rerun setup.');
  if (!existsSync(apiProject)) {
    throw new Error(
      `The User Service project was not found at ${apiProject}. ` +
        'Set RELISTEN_API_CHECKOUT to the RelistenApi checkout and rerun setup.'
    );
  }

  mkdirSync(tlsDirectory, { recursive: true, mode: 0o700 });
  chmodSync(tlsDirectory, 0o700);
  const clientSecret = loadOrCreateClientSecret();

  run('mkcert', ['-install']);
  run('mkcert', ['-cert-file', certificatePath, '-key-file', certificateKeyPath, ...localHosts]);
  chmodSync(certificatePath, 0o644);
  chmodSync(certificateKeyPath, 0o600);

  const certificateAuthorityRoot = capture('mkcert', ['-CAROOT']);
  // Node trusts the copied public CA for the local API connection. The mkcert root private key stays in mkcert's protected store.
  copyFileSync(join(certificateAuthorityRoot, 'rootCA.pem'), certificateAuthorityPath);
  chmodSync(certificateAuthorityPath, 0o644);

  setUserSecrets(clientSecret);
  process.stdout.write('Relisten browser-session development setup is ready.\n');
}

function configuredTlsDirectory() {
  const configured = process.env.RELISTEN_LOCAL_TLS_DIR;
  if (configured !== undefined && !isAbsolute(configured)) {
    throw new Error('RELISTEN_LOCAL_TLS_DIR must be an absolute path.');
  }
  return (
    configured ??
    join(homedir(), 'Library', 'Application Support', 'Relisten', 'local-browser-session-tls')
  );
}

function loadOrCreateClientSecret() {
  if (!existsSync(clientSecretPath)) {
    const value = randomBytes(32).toString('base64url');
    writeFileSync(clientSecretPath, `${value}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    return value;
  }

  const metadata = statSync(clientSecretPath);
  if (!metadata.isFile() || (process.platform !== 'win32' && (metadata.mode & 0o077) !== 0)) {
    throw new Error('The existing local web-client secret must be a mode-0600 regular file.');
  }

  // The persisted OpenIddict client hashes this secret. Replacing the secret would make an existing local database refuse startup.
  const value = readFileSync(clientSecretPath, 'utf8').replace(/\r?\n$/, '');
  if (value.length < 43 || value.length > 256 || !/^[\x21-\x7e]+$/.test(value)) {
    throw new Error('The existing local web-client secret is malformed.');
  }
  return value;
}

function setUserSecrets(clientSecret) {
  const values = {
    'Accounts:WebClientSecret': clientSecret,
    'Accounts:DevelopmentCertificateAuthorityPath': certificateAuthorityPath,
    'Kestrel:Certificates:Default:Path': certificatePath,
    'Kestrel:Certificates:Default:KeyPath': certificateKeyPath,
  };
  const result = spawnSync('dotnet', ['user-secrets', 'set', '--project', apiProject], {
    input: JSON.stringify(values),
    encoding: 'utf8',
    stdio: ['pipe', 'ignore', 'ignore'],
  });
  if (result.error || result.status !== 0) {
    throw new Error('The .NET Secret Manager could not configure the local User Service.');
  }
}

function requireSupportedNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < minimumNode.major || (major === minimumNode.major && minor < minimumNode.minor)) {
    throw new Error('Relisten browser-session setup requires Node.js 22.18 or newer.');
  }
}

function requireCommand(command, args, message) {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  if (result.error?.code === 'ENOENT') throw new Error(message);
  if (result.error || result.status !== 0) {
    throw new Error(`${command} is installed but unavailable. ${message}`);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed. Correct the reported error and rerun setup.`);
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.error || result.status !== 0 || result.stdout.trim().length === 0) {
    throw new Error(`${command} did not return the expected local certificate path.`);
  }
  return result.stdout.trim();
}

function missingMkcertMessage() {
  return process.platform === 'darwin'
    ? 'Install mkcert with "brew install mkcert", then rerun setup.'
    : 'Install mkcert from https://github.com/FiloSottile/mkcert, then rerun setup.';
}
