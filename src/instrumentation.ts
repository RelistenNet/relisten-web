export async function register() {
  const { initTracing } = await import('./lib/tracing');
  initTracing();
}
