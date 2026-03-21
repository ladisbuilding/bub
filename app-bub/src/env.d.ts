declare module 'cloudflare:workers' {
  const env: {
    DEV: string
    ADMIN_EMAIL: string
    DEV_DATABASE_URL: string
    PROD_DATABASE_URL: string
    DEV_JWT_SECRET: string
    PROD_JWT_SECRET: string
    ANTHROPIC_API_KEY: string
    CF_ACCOUNT_ID: string
    CF_API_TOKEN: string
    CF_ZONE_ID: string
    AI: any
    VECTORIZE: any
    R2: any
  }
  export { env }
}
