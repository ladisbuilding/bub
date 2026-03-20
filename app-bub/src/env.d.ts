declare module 'cloudflare:workers' {
  const env: {
    DATABASE_URL: string
    JWT_SECRET: string
    AI: any
    VECTORIZE: any
  }
  export { env }
}
