/**
 * Type declarations for environment variables
 *
 * This allows using process.env.VAR_NAME with TypeScript strict mode
 * while maintaining type safety.
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Runtime
      NODE_ENV: 'development' | 'production' | 'test';
      NEXT_RUNTIME?: 'nodejs' | 'edge';

      // Database
      DATABASE_URL?: string;

      // Authentication
      JWT_SECRET?: string;
      OWNER_EMAIL?: string;
      RESEND_API_KEY?: string;

      // Observability
      GRAFANA_OTLP_ENDPOINT?: string;
      GRAFANA_INSTANCE_ID?: string;
      GRAFANA_API_KEY?: string;
      LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';

      // File Storage
      BLOB_READ_WRITE_TOKEN?: string;

      // MCP Server
      MCP_API_KEY?: string;

      // External Tools
      VERCEL_TOKEN?: string;
      GITHUB_TOKEN?: string;

      // Application URLs
      NEXT_PUBLIC_APP_URL?: string;
      WEBAUTHN_RP_ID?: string;

      // Package info (set by npm)
      npm_package_version?: string;
    }
  }
}

export {};
