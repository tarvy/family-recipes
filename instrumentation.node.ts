/**
 * Node.js-specific OpenTelemetry initialization
 *
 * Uses @vercel/otel for seamless Vercel integration.
 * Traces are exported to:
 * - Vercel's native observability (when deployed on Vercel)
 * - Grafana Cloud (when GRAFANA_* env vars are set)
 * - Any OTLP endpoint (when OTEL_EXPORTER_OTLP_* env vars are set)
 */

import { registerOTel } from '@vercel/otel';

/** Service name for trace attribution */
const SERVICE_NAME = 'family-recipes';

/**
 * Build OTLP headers for Grafana Cloud authentication
 */
function getGrafanaHeaders(): Record<string, string> | undefined {
  const instanceId = process.env.GRAFANA_INSTANCE_ID;
  const apiKey = process.env.GRAFANA_API_KEY;

  if (instanceId && apiKey) {
    const credentials = Buffer.from(`${instanceId}:${apiKey}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
    };
  }

  return undefined;
}

/**
 * Get OTLP endpoint configuration
 */
function getExporterConfig() {
  // Check for Grafana Cloud configuration
  const grafanaEndpoint = process.env.GRAFANA_OTLP_ENDPOINT;
  if (grafanaEndpoint) {
    return {
      url: `${grafanaEndpoint}/v1/traces`,
      headers: getGrafanaHeaders(),
    };
  }

  // Fall back to standard OTEL env vars (handled automatically by @vercel/otel)
  return undefined;
}

// Get exporter config before registering
const exporterConfig = getExporterConfig();

// Set OTLP env vars for Grafana if configured
// This allows @vercel/otel to pick them up
if (exporterConfig) {
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = exporterConfig.url;
  if (exporterConfig.headers) {
    process.env.OTEL_EXPORTER_OTLP_HEADERS = Object.entries(exporterConfig.headers)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }
}

// Initialize OpenTelemetry
registerOTel({
  serviceName: SERVICE_NAME,
  // Configure fetch instrumentation
  instrumentationConfig: {
    fetch: {
      // Don't trace internal Next.js requests or health checks
      ignoreUrls: [/^\/_next/, /^\/api\/health$/],
      // Propagate trace context to our own API routes
      propagateContextUrls: [/^\/api\//],
    },
  },
});
