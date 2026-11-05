export async function register() {
  // Don't gate on TIMBER_RUNTIME: the nitro entry sets it *after* register()
  // runs (top-level await ordering), so it's always undefined here.
  if (process.env.NODE_ENV === 'production') {
    const { initTracing } = await import('./lib/tracing');
    initTracing();
  }
}
