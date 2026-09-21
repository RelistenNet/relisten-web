export async function register() {
  if (process.env.TIMBER_RUNTIME === 'node-server') {
    const { initTracing } = await import('./lib/tracing');
    initTracing();
  }
}
