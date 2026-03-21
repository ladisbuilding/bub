# Cloudflare R2 Best Practices

This document outlines best practices for working with Cloudflare R2 object storage in our TanStack Start + Cloudflare Workers applications.

## Table of Contents

1. [R2 Overview](#r2-overview)
2. [Access Methods](#access-methods)
3. [Presigned URLs](#presigned-urls)
4. [Parallel Operations](#parallel-operations)
5. [Common Patterns](#common-patterns)
6. [Memory and Size Limits](#memory-and-size-limits)
7. [Error Handling](#error-handling)
8. [Cleanup and Maintenance](#cleanup-and-maintenance)

---

## R2 Overview

### Key Characteristics

- **S3-compatible API**: R2 uses the S3 API, so you can use AWS SDK
- **No egress fees**: Unlike S3, R2 doesn't charge for data transfer
- **Two access methods**: Worker bindings (internal) or S3 API (external/presigned)
- **Custom domains**: Use custom domains for public read access
- **Strong consistency**: Operations are immediately consistent

### When to Use Each Method

| Method | Use Case |
|--------|----------|
| Worker Binding | Server-side reads/writes within Workers |
| S3 API + Presigned URLs | Client-side uploads (browser → R2 directly) |
| Custom Domain | Public read access (CDN-like) |

---

## Access Methods

### Worker Binding (Direct Access)

For server-side operations within Workers, use the R2 binding directly:

```typescript
// wrangler.jsonc
{
  "r2_buckets": [
    { "binding": "TEMPLATES_BUCKET", "bucket_name": "my-bucket" }
  ]
}
```

```typescript
// Reading an object
const object = await env.TEMPLATES_BUCKET.get('images/photo.jpg')
if (!object || !object.body) {
  throw new Error('Object not found')
}
const arrayBuffer = await object.arrayBuffer()
const contentType = object.httpMetadata?.contentType || 'image/jpeg'

// Writing an object
await env.TEMPLATES_BUCKET.put('images/photo.jpg', imageData, {
  httpMetadata: { contentType: 'image/jpeg' },
  customMetadata: { uploadedBy: userId }
})

// Deleting an object
await env.TEMPLATES_BUCKET.delete('images/photo.jpg')

// Deleting multiple objects
await env.TEMPLATES_BUCKET.delete(['img1.jpg', 'img2.jpg', 'img3.jpg'])
```

### S3 API (For Presigned URLs and External Access)

Use the S3 API when you need presigned URLs or access from outside Workers. We use `aws4fetch` for a lighter, more Worker-friendly approach:

```typescript
import { AwsClient } from 'aws4fetch'
import { env } from 'cloudflare:workers'

// Create aws4fetch client for signing requests
const client = new AwsClient({
  service: 's3',
  region: 'auto',
  accessKeyId: env.R2_ACCESS_KEY_ID!,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
})

// R2 endpoint
const r2Endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
```

**Why aws4fetch over AWS SDK?**
- Lighter weight (single dependency vs multiple AWS SDK packages)
- No polyfills needed (AWS SDK requires DOMParser polyfill in Workers)
- No middleware workarounds required
- Better suited for Cloudflare Workers runtime

---

## Presigned URLs

### Client-Side Uploads with Presigned URLs

The recommended pattern for user uploads is presigned URLs, which lets the browser upload directly to R2:

```typescript
// Server: Generate presigned URL using aws4fetch
import { createServerFn } from '@tanstack/react-start'
import { AwsClient } from 'aws4fetch'
import { z } from 'zod'
import { env } from 'cloudflare:workers'
import { getBucketName, getPublicBaseUrl } from './r2'

export const getPresignedUploadUrl = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    filename: z.string(),
    contentType: z.string(),
    prefix: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { filename, contentType, prefix = 'items' } = data
    const bucket = getBucketName()

    // Generate unique key with timestamp to avoid collisions
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `${prefix}/${timestamp}-${sanitizedFilename}`

    // Create aws4fetch client for signing
    const client = new AwsClient({
      service: 's3',
      region: 'auto',
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    })

    // Build the R2 S3 API URL
    const r2Endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    const objectUrl = `${r2Endpoint}/${bucket}/${key}`

    // Sign the request with query string auth (presigned URL)
    // X-Amz-Expires sets expiration in seconds (60 seconds)
    const signedRequest = await client.sign(
      new Request(`${objectUrl}?X-Amz-Expires=60`, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
      }),
      { aws: { signQuery: true } }
    )

    const signedUrl = signedRequest.url.toString()

    // Construct public URL using custom domain
    const publicBaseUrl = getPublicBaseUrl().replace(/\/$/, '')
    const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/')
    const publicUrl = `${publicBaseUrl}/${encodedKey}`

    return {
      url: signedUrl,      // Client uploads to this URL
      key,
      publicUrl,           // Public read URL after upload
      method: 'PUT' as const,
      headers: { 'Content-Type': contentType },
    }
  })
```

```typescript
// Client: Upload using the presigned URL
async function uploadFile(file: File, prefix: string) {
  // 1. Get presigned URL from server
  const { url, publicUrl, headers } = await getPresignedUploadUrl({
    data: {
      filename: file.name,
      contentType: file.type,
      prefix,
    }
  })

  // 2. Upload directly to R2 (bypasses your server)
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: file,
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  // 3. Return public URL for database storage
  return publicUrl
}
```

### Benefits of Presigned URLs

1. **Reduced server load**: Files upload directly to R2, not through your Worker
2. **Larger file support**: Bypasses Worker memory limits
3. **Better UX**: Faster uploads with progress tracking possible
4. **Cost efficient**: No Worker CPU time for file transfers

---

## Parallel Operations

### R2 Supports True Parallelism

Unlike D1 (which has connection limits), R2 operations can run in parallel with `Promise.all`:

```typescript
// ✅ Good: Parallel R2 deletions
await Promise.all(
  imageUrls.map(url =>
    deleteObject(getKeyFromUrl(url)).catch(err => {
      console.error('Failed to delete:', url, err)
    })
  )
)

// ✅ Good: Parallel R2 reads
const images = await Promise.all(
  imageKeys.map(key => env.TEMPLATES_BUCKET.get(key))
)
```

### Collect URLs First, Then Delete in Parallel

```typescript
// ✅ Optimized pattern for bulk deletions
const imagesToDelete: string[] = []

// Collect all URLs from various sources
for (const product of products) {
  if (product.image) imagesToDelete.push(product.image)
}
for (const event of events) {
  if (event.image) imagesToDelete.push(event.image)
}

// Delete all in parallel
if (imagesToDelete.length > 0) {
  await Promise.all(
    imagesToDelete.map(url =>
      deleteObject(getKeyFromUrl(url)).catch(console.error)
    )
  )
}
```

### Anti-Pattern: Sequential R2 Operations

```typescript
// ❌ Bad: Sequential deletions
for (const url of imagesToDelete) {
  await deleteObject(getKeyFromUrl(url))
}

// ✅ Good: Parallel deletions
await Promise.all(imagesToDelete.map(url => deleteObject(getKeyFromUrl(url))))
```

---

## Common Patterns

### URL ↔ Key Conversion

```typescript
/**
 * Get public base URL (custom domain) based on environment
 */
export function getPublicBaseUrl() {
  return env.DEV === 'true'
    ? env.R2_DEV_PUBLIC_BASE_URL!
    : env.R2_PUBLIC_BASE_URL!
}

/**
 * Extract R2 key from public URL
 * Example: https://cdn.example.com/items/123-image.jpg -> items/123-image.jpg
 */
export function getKeyFromUrl(publicUrl: string): string {
  const publicBaseUrl = getPublicBaseUrl().replace(/\/$/, '')
  const encodedKey = publicUrl.replace(publicBaseUrl + '/', '')
  // Decode each part separately to handle special characters
  return encodedKey
    .split('/')
    .map(part => decodeURIComponent(part))
    .join('/')
}

/**
 * Construct public URL from R2 key
 */
export function getPublicUrl(key: string): string {
  const publicBaseUrl = getPublicBaseUrl().replace(/\/$/, '')
  const encodedKey = key
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/')
  return `${publicBaseUrl}/${encodedKey}`
}
```

### Rename Object (Copy + Delete)

R2 doesn't have a native rename operation. Copy then delete:

```typescript
export async function renameObject(oldKey: string, newKey: string): Promise<string> {
  // Check if destination exists
  const uniqueKey = await getUniqueKey(newKey)

  // Copy to new location
  await copyObject(oldKey, uniqueKey)

  // Delete old object
  await deleteObject(oldKey)

  // Return new public URL
  return getPublicUrl(uniqueKey)
}

export async function copyObject(sourceKey: string, destinationKey: string): Promise<void> {
  // Using S3 API with x-amz-copy-source header
  const url = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}/${destinationKey}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      ...signedHeaders,
      'x-amz-copy-source': `/${bucket}/${sourceKey}`,
    },
  })

  if (!response.ok) throw new Error('Copy failed')
}
```

### Check if Object Exists

```typescript
export async function objectExists(key: string): Promise<boolean> {
  // Use HEAD request - cheaper than GET
  const object = await env.TEMPLATES_BUCKET.head(key)
  return object !== null
}
```

### Unique Key Generation

Avoid overwriting files by generating unique keys:

```typescript
export async function getUniqueKey(baseKey: string): Promise<string> {
  const lastDotIndex = baseKey.lastIndexOf('.')
  const name = lastDotIndex > 0 ? baseKey.substring(0, lastDotIndex) : baseKey
  const ext = lastDotIndex > 0 ? baseKey.substring(lastDotIndex) : ''

  let key = baseKey
  let attempt = 0

  while (await objectExists(key)) {
    attempt++
    key = `${name}-${attempt}${ext}`
  }

  return key
}
```

---

## Memory and Size Limits

### Worker Memory Limit: 128MB

Workers have a 128MB memory limit. For large files:

```typescript
// ❌ Bad: Loading entire file into memory
const object = await env.BUCKET.get(key)
const data = await object.arrayBuffer() // May exceed 128MB!

// ✅ Good: Stream the response
const object = await env.BUCKET.get(key)
if (!object) throw new Error('Not found')

return new Response(object.body, {
  headers: {
    'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
  },
})
```

### Large File Uploads: Use Multipart

For files over 100MB, use multipart uploads:

```typescript
// Client-side multipart upload
const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunks

async function uploadLargeFile(file: File) {
  // 1. Create multipart upload
  const upload = await env.BUCKET.createMultipartUpload(key)

  // 2. Upload parts
  const parts: R2UploadedPart[] = []
  for (let i = 0; i * CHUNK_SIZE < file.size; i++) {
    const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
    const part = await upload.uploadPart(i + 1, chunk)
    parts.push(part)
  }

  // 3. Complete upload
  await upload.complete(parts)
}
```

---

## Error Handling

### Always Catch R2 Errors

R2 operations can fail for various reasons. Always wrap in try/catch:

```typescript
// ✅ Good: Catch individual errors, don't fail the whole batch
await Promise.all(
  imagesToDelete.map(url =>
    deleteObject(getKeyFromUrl(url)).catch(error => {
      console.error('Failed to delete image:', url, error)
      // Don't re-throw - allow other deletions to continue
    })
  )
)
```

### Check for Null Objects

```typescript
const object = await env.BUCKET.get(key)

// ✅ Always check for null
if (!object || !object.body) {
  throw new Error('Object not found')
}

const data = await object.arrayBuffer()
```

---

## Cleanup and Maintenance

### Orphaned Image Cleanup

Track images in your database and periodically clean up orphans:

```typescript
export async function cleanupOrphanedImages(): Promise<{ deleted: number }> {
  // 1. Get all image URLs from database
  const [items, products, events] = await Promise.all([
    env.DB.prepare('SELECT image_url FROM items WHERE image_url IS NOT NULL').all(),
    env.DB.prepare('SELECT image FROM products WHERE image IS NOT NULL').all(),
    env.DB.prepare('SELECT image FROM events WHERE image IS NOT NULL').all(),
  ])

  const dbImageUrls = new Set<string>()
  for (const row of items.results || []) {
    if (row.image_url) dbImageUrls.add(row.image_url as string)
  }
  // ... add from other tables

  // 2. List all objects in R2
  const allR2Keys: string[] = []
  for (const prefix of ['items/', 'products/', 'events/']) {
    const keys = await listObjects(prefix)
    allR2Keys.push(...keys)
  }

  // 3. Find orphans (in R2 but not in DB)
  const dbKeys = new Set(Array.from(dbImageUrls).map(url => getKeyFromUrl(url)))
  const orphanedKeys = allR2Keys.filter(key => !dbKeys.has(key))

  // 4. Delete orphans in parallel
  await Promise.all(
    orphanedKeys.map(key =>
      deleteObject(key).catch(console.error)
    )
  )

  return { deleted: orphanedKeys.length }
}
```

### Delete Images When Deleting Records

When deleting database records, also delete associated R2 objects:

```typescript
export const deleteProvider = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ providerId: z.string() }))
  .handler(async ({ data }) => {
    const database = db()

    // 1. Fetch provider with image URL
    const provider = await database.query.providers.findFirst({
      where: eq(providers.id, data.providerId),
    })

    if (!provider) throw new Error('Not found')

    // 2. Delete from database first
    await database.delete(providers).where(eq(providers.id, data.providerId))

    // 3. Delete R2 object (fire-and-forget, don't fail if R2 delete fails)
    if (provider.image) {
      deleteObject(getKeyFromUrl(provider.image)).catch(console.error)
    }

    return { success: true }
  })
```

---

## Environment Variables

Required environment variables for R2:

```
# wrangler.jsonc or .dev.vars
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key

# Production bucket
R2_BUCKET=my-app-production
R2_PUBLIC_BASE_URL=https://cdn.myapp.com

# Development bucket (optional)
R2_DEV_BUCKET=my-app-dev
R2_DEV_PUBLIC_BASE_URL=https://cdn-dev.myapp.com
```

---

## Quick Reference

| Operation | Method | Notes |
|-----------|--------|-------|
| Read object | `env.BUCKET.get(key)` | Returns `R2ObjectBody \| null` |
| Write object | `env.BUCKET.put(key, data, options)` | Set httpMetadata for Content-Type |
| Delete object | `env.BUCKET.delete(key)` | Also accepts array of keys |
| Check exists | `env.BUCKET.head(key)` | Returns `R2Object \| null` |
| List objects | `SignatureV4` + native fetch | Use prefix for filtering |
| Presigned upload | `aws4fetch` with `signQuery: true` | 60s expiry recommended |
| Parallel ops | `Promise.all()` | ✅ Safe for R2 (unlike D1 writes) |

## Dependencies

```json
{
  "dependencies": {
    "@aws-crypto/sha256-js": "^5.2.0",
    "@aws-sdk/signature-v4": "^3.370.0",
    "aws4fetch": "^1.0.20"
  }
}
```

**Note:** We no longer need `@aws-sdk/client-s3` or `@aws-sdk/s3-request-presigner` since `aws4fetch` handles presigned URL generation more efficiently.

---

## References

- [R2 Workers API Documentation](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)
- [R2 S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/)
- [Presigned URLs Guide](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [R2 Limits](https://developers.cloudflare.com/r2/reference/limits/)
