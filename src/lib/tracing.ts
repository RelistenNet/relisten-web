import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import {
  Sampler,
  SamplingDecision,
  SamplingResult,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import type { Context, SpanKind, Attributes, Link } from '@opentelemetry/api';

const staticExtensions = ['.js', '.css', '.map', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2'];
const ignorePaths = ['/api/health', '/api/status', '/_next/static/', '/_next/image'];

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

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'relisten-web' }),
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? 'https://otlp.myfountain.io/v1/traces',
      headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
    }),
    sampler: new NoiseFilterSampler(
      new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(0.05) })
    ),
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req) => shouldIgnorePath(req.url ?? ''),
      }),
    ],
  });

  sdk.start();
  process.on('SIGTERM', () => sdk.shutdown().catch(console.error));
}
