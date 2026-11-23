import { setDefaultResultOrder } from 'node:dns';
import { setDefaultAutoSelectFamily } from 'node:net';

export async function register() {
  // Outbound connections use IPv4 alone. The cluster has no IPv6 route, and with
  // Node's default "happy eyeballs", an IPv4 connect slower than 250ms gave up and
  // fell to the host's IPv6 address, which can't be reached: the fetch failed
  // (UND_ERR_CONNECT_TIMEOUT, "attempted addresses: <v4>, <v6>") in about half a
  // second, though the IPv4 connect would have finished.
  setDefaultResultOrder('ipv4first');
  setDefaultAutoSelectFamily(false);

  // Don't gate on TIMBER_RUNTIME: the nitro entry sets it *after* register()
  // runs (top-level await ordering), so it's always undefined here.
  if (process.env.NODE_ENV === 'production') {
    const { initTracing } = await import('./lib/tracing');
    initTracing();
  }
}
