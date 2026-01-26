/**
 * OpenTelemetry instrumentation for Next.js
 *
 * This file is automatically loaded by Next.js for server-side instrumentation.
 * Traces are exported to Grafana Cloud via OTLP.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const otelResources = await import('@opentelemetry/resources');
    const semconv = await import('@opentelemetry/semantic-conventions');

    // Only initialize if Grafana credentials are configured
    const endpoint = process.env.GRAFANA_OTLP_ENDPOINT;
    const instanceId = process.env.GRAFANA_INSTANCE_ID;
    const apiKey = process.env.GRAFANA_API_KEY;

    if (!(endpoint && instanceId && apiKey)) {
      // biome-ignore lint/suspicious/noConsole: Intentional warning before logger is available
      console.warn('[instrumentation] Grafana credentials not configured, tracing disabled');
      return;
    }

    const exporter = new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
      headers: {
        Authorization: `Basic ${Buffer.from(`${instanceId}:${apiKey}`).toString('base64')}`,
      },
    });

    const sdk = new NodeSDK({
      resource: otelResources.resourceFromAttributes({
        [semconv.ATTR_SERVICE_NAME]: 'family-recipes',
        [semconv.ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
      }),
      traceExporter: exporter,
    });

    sdk.start();
  }
}
