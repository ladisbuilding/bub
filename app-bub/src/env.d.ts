declare module 'cloudflare:workers' {
  const env: {
    DEV: string
    DEV_DATABASE_URL: string
    PROD_DATABASE_URL: string
    DEV_JWT_SECRET: string
    PROD_JWT_SECRET: string
    AI: any
    VECTORIZE: any
  }
  export { env }
}
