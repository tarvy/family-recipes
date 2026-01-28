import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable server minification to fix instrumentation hook ESM loading issue on Vercel
  // See: https://github.com/vercel/next.js/issues/64371
  experimental: {
    serverMinification: false,
  },
  // Externalize OpenTelemetry packages to avoid bundling issues
  serverExternalPackages: [
    '@opentelemetry/sdk-node',
    '@opentelemetry/exporter-trace-otlp-http',
    '@opentelemetry/resources',
    '@opentelemetry/semantic-conventions',
    '@opentelemetry/api',
  ],
  // Include recipes directory in serverless function bundles for Vercel
  outputFileTracingIncludes: {
    '/api/shopping-list': ['./recipes/**/*'],
    '/api/shopping-list/[id]': ['./recipes/**/*'],
    '/api/recipes': ['./recipes/**/*'],
    '/api/recipes/[slug]': ['./recipes/**/*'],
    '/mcp': ['./recipes/**/*'],
  },
};

export default nextConfig;
