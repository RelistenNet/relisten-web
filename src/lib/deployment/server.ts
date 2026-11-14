import 'server-only';
import { parseDeploymentEnvironment } from './environment';

/** Read at request time so one image can serve production or any preview. */
export function getDeploymentEnvironment() {
  return parseDeploymentEnvironment(process.env);
}
