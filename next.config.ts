import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
