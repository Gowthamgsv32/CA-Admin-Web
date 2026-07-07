// Minimal AWS SigV4-signed PUT for DigitalOcean Spaces (S3-compatible),
// implemented with Web Crypto so it runs in the Workers runtime without the AWS SDK.

const REGION = 'ams3'
const HOST = 'ams3.digitaloceanspaces.com'
const BUCKET = 'healthappobjects'
const SERVICE = 's3'

async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

async function sha256Hex(data) {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return toHex(hash)
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function putObjectToSpaces({ accessKey, secretKey, key, body }) {
  const path = `/${BUCKET}/${key}`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const payloadHash = await sha256Hex(body)

  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${HOST}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = ['PUT', path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n')

  const kDate = await hmac(`AWS4${secretKey}`, dateStamp)
  const kRegion = await hmac(kDate, REGION)
  const kService = await hmac(kRegion, SERVICE)
  const kSigning = await hmac(kService, 'aws4_request')
  const signature = toHex(await hmac(kSigning, stringToSign))

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(`https://${HOST}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Amz-Content-Sha256': payloadHash,
      'X-Amz-Date': amzDate,
      Authorization: authorization,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Spaces upload failed (${res.status}): ${text}`)
  }
}
