declare module 'cloudflare:workers' {
  const env: {
    DEV: string
    DEV_DATABASE_URL: string
    PROD_DATABASE_URL: string
    DEV_JWT_SECRET: string
    PROD_JWT_SECRET: string
    ANTHROPIC_API_KEY: string
    AI: any
    VECTORIZE: any
    R2: any
  }
  export { env }
}
