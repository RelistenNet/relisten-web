import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Where `pnpm setup:browser-session` writes the local certificate, CA and client
 * secret, and where `pnpm dev:session` reads them.
 */
export function localTlsDir(env = process.env) {
  if (env.RELISTEN_LOCAL_TLS_DIR) return env.RELISTEN_LOCAL_TLS_DIR;
  if (process.platform === 'darwin') {
    return join(
      homedir(),
      'Library',
      'Application Support',
      'Relisten',
      'local-browser-session-tls'
    );
  }
  const dataHome = env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
  return join(dataHome, 'relisten', 'local-browser-session-tls');
}
