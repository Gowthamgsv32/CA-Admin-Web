// DigitalOcean CDN cache purging for the Spaces bucket. Uses the account's
// Personal Access Token — a different credential than the Spaces
// access/secret key pair used for S3-style uploads, since cache purging is
// a DigitalOcean-account-level API rather than part of the S3-compatible
// surface spaces.js talks to.
const DO_API_BASE = 'https://api.digitalocean.com/v2'
const SPACES_ORIGIN = 'healthappobjects.ams3.digitaloceanspaces.com'

async function findCdnEndpointId(apiToken) {
  const res = await fetch(`${DO_API_BASE}/cdn/endpoints`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.message || `Failed to list CDN endpoints (${res.status})`)
  }

  const endpoint = (body.endpoints || []).find((e) => e.origin === SPACES_ORIGIN)
  if (!endpoint) {
    throw new Error(`No CDN endpoint found for origin "${SPACES_ORIGIN}".`)
  }
  return endpoint.id
}

// files: object keys as already used for upload (e.g. "CurrentAffairs/root.json"),
// or ["*"] to purge everything under this CDN endpoint.
export async function purgeCdnCache(apiToken, files) {
  const endpointId = await findCdnEndpointId(apiToken)

  const res = await fetch(`${DO_API_BASE}/cdn/endpoints/${endpointId}/cache`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `CDN purge failed (${res.status})`)
  }
}
