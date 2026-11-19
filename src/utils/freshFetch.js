// Reads a root/month/day file straight from the DigitalOcean Spaces CDN,
// bypassing its edge cache — not just the browser's. `cache: 'no-store'`
// only ever controlled the browser's own HTTP cache; the CDN in front of
// Spaces can keep serving a stale cached copy of an object for a while
// after it changes, since purge propagation isn't instant and isn't
// triggered by every code path that reads these files (only the ones that
// just published something). Appending a cache-busting query param makes
// the CDN see a different URL — and therefore a guaranteed cache miss —
// without needing a purge at all.
export function fetchFresh(url, options) {
  const bustedUrl = `${url}${url.includes('?') ? '&' : '?'}_cb=${Date.now()}`
  return fetch(bustedUrl, { cache: 'no-store', ...options })
}
