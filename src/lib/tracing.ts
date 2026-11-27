import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import {
  Sampler,
  SamplingDecision,
  SamplingResult,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-node';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import type { Context, SpanKind, Attributes, Link } from '@opentelemetry/api';
import { parseDeploymentEnvironment } from './deployment/environment';

const staticExtensions = ['.js', '.css', '.map', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2'];
// HTTP server spans come from timber itself (`http.server.request`), not
// @opentelemetry/instrumentation-http: that can't patch node:http inside the
// bundled ESM server, and its createRequire('forwarded-parse') breaks the bundle.
const ignorePaths = ['/api/health', '/api/status'];

function shouldIgnorePath(path: string): boolean {
  if (ignorePaths.some((p) => path.startsWith(p))) return true;
  const pathWithoutQuery = path.split('?')[0];
  return staticExtensions.some((ext) => pathWithoutQuery.endsWith(ext));
}

class NoiseFilterSampler implements Sampler {
  constructor(private readonly baseSampler: Sampler) {}

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    const path = (attributes['http.target'] ?? attributes['url.path']) as string | undefined;
    if (path && shouldIgnorePath(path)) return { decision: SamplingDecision.NOT_RECORD };
    return this.baseSampler.shouldSample(context, traceId, spanName, spanKind, attributes, links);
  }

  toString(): string {
    return `NoiseFilterSampler{${this.baseSampler.toString()}}`;
  }
}

function parseHeaders(env?: string): Record<string, string> {
  if (!env) return {};
  const headers: Record<string, string> = {};
  for (const pair of env.split(',')) {
    const [key, ...val] = pair.split('=');
    if (key && val.length) headers[key.trim()] = val.join('=').trim();
  }
  return headers;
}

export function initTracing() {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

  const headers = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);
  const baseUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'https://otlp.myfountain.io';
  const tracesUrl = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? `${baseUrl}/v1/traces`;
  // Metrics go wherever traces do (the in-cluster collector, which holds the
  // Fountain token) unless told otherwise; straight to Fountain they're refused.
  const metricsUrl =
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
    (tracesUrl.endsWith('/v1/traces')
      ? tracesUrl.replace(/\/v1\/traces$/, '/v1/metrics')
      : `${baseUrl}/v1/metrics`);
  // Staging is the reviewers alone: keep every trace, so a slow request is there to look up.
  const staging = parseDeploymentEnvironment(process.env).kind === 'staging';

  const sdk = new NodeSDK({
    // The deployment names itself (relisten-web-staging), so its traces aren't production's.
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'relisten-web',
    }),
    traceExporter: new OTLPTraceExporter({ url: tracesUrl, headers }),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: metricsUrl, headers }),
      }),
    ],
    sampler: new NoiseFilterSampler(
      new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(staging ? 1 : 0.05) })
    ),
    // Outgoing fetch() (the v4 client in src/api) runs on undici, which publishes to
    // diagnostics_channel, so this works inside the bundled server. It also
    // injects traceparent so relistenapi spans join the same trace.
    instrumentations: [new UndiciInstrumentation({ requireParentforSpans: true })],
  });

  sdk.start();
  process.on('SIGTERM', () => sdk.shutdown().catch(console.error));
}
