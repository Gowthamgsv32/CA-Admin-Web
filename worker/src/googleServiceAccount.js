// Exchanges a Google service-account key for a short-lived OAuth access
// token via the JWT-bearer flow — scoped for both Sheets (read/write) and
// Cloud Translation, so CA Translate only needs one credential instead of a
// separate Sheets OAuth setup plus a standalone Translate API key.
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/cloud-translation'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

function base64UrlFromBytes(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlFromString(str) {
  return base64UrlFromBytes(new TextEncoder().encode(str))
}

// Accepts the PEM exactly as it appears in the downloaded service-account
// JSON key (including literal "\n" escapes, in case it was pasted as a
// single-line secret) and returns the raw DER bytes importKey needs.
function pemToDer(pem) {
  const normalized = pem.replace(/\\n/g, '\n')
  const base64Body = normalized
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')
  const binary = atob(base64Body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function importSigningKey(privateKeyPem) {
  const der = pemToDer(privateKeyPem)
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
}

export async function getGoogleAccessToken(env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !privateKey) {
    throw new Error(
      'Google service account not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).'
    )
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = { iss: email, scope: SCOPES, aud: TOKEN_URL, iat: now, exp: now + 3600 }
  const signingInput = `${base64UrlFromString(JSON.stringify(header))}.${base64UrlFromString(JSON.stringify(claims))}`

  const key = await importSigningKey(privateKey)
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput))
  const jwt = `${signingInput}.${base64UrlFromBytes(new Uint8Array(signature))}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.error_description || body.error || `Google token exchange failed (${res.status})`)
  }
  return body.access_token
}
