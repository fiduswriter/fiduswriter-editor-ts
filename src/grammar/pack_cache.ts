/**
 * Persistent cache for gzipped language packs, shared by the checker's
 * Web Worker and its main-thread fallback. Uses the Cache Storage API
 * (available in dedicated workers), keyed by the pack URL, so a pack
 * downloaded once survives page reloads and later sessions without any
 * server-side support — relevant for hosts that send weak cache headers.
 *
 * Lookups are cache-first: a fresh stored entry is returned without any
 * network traffic; otherwise the pack is fetched and stored. Entries
 * honor the response's HTTP cache semantics — `max-age` (capped),
 * `immutable`, and `no-store`/`no-cache` (not cached); without cache
 * headers a default TTL applies, so hosts that version their static
 * URLs (the main app's `?v=`) keep working exactly as before. At most
 * MAX_ENTRIES packs are kept (oldest evicted first) — a user typically
 * loads one or two languages, so the footprint stays in the tens of
 * MB. Any Cache Storage failure (unsupported, disabled, quota) falls
 * back to a plain network fetch so checking keeps working.
 */

const CACHE_NAME = "fiduswriter-lingotweaker-packs-v1"
const MAX_ENTRIES = 10
const DEFAULT_MAX_AGE_S = 7 * 24 * 60 * 60
const MAX_MAX_AGE_S = 365 * 24 * 60 * 60
const EXPIRES_HEADER = "x-fidus-pack-expires"

/** Cache TTL in seconds for a response, or null when it must not be cached. */
function ttlFromHeaders(headers: Headers): number | null {
    const cacheControl = headers.get("cache-control") || ""
    if (
        /\bno-store\b/.test(cacheControl) ||
        /\bno-cache\b/.test(cacheControl)
    ) {
        return null
    }
    if (/\bimmutable\b/.test(cacheControl)) {
        return MAX_MAX_AGE_S
    }
    const maxAge = cacheControl.match(/\bmax-age=(\d+)/)
    if (maxAge) {
        return Math.min(Number(maxAge[1]), MAX_MAX_AGE_S)
    }
    return DEFAULT_MAX_AGE_S
}

/**
 * Fetch the gzipped pack at `packUrl`, serving it from the persistent
 * cache when a fresh entry exists.
 */
export async function fetchPackCached(packUrl: string): Promise<Uint8Array> {
    if (typeof caches !== "undefined") {
        try {
            const cache = await caches.open(CACHE_NAME)
            const cached = await cache.match(packUrl)
            if (cached) {
                const expires = Number(cached.headers.get(EXPIRES_HEADER) || 0)
                if (expires > Date.now()) {
                    return new Uint8Array(await cached.arrayBuffer())
                }
                await cache.delete(packUrl)
            }
        } catch (_error) {
            // Cache Storage unavailable or failing: use the network.
        }
    }
    const response = await fetch(packUrl)
    if (!response.ok) {
        throw new Error(`cannot load ${packUrl}: HTTP ${response.status}`)
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (typeof caches === "undefined") {
        return bytes
    }
    try {
        const ttl = ttlFromHeaders(response.headers)
        if (ttl === null) {
            return bytes
        }
        const cache = await caches.open(CACHE_NAME)
        const keys = [...(await cache.keys())]
        while (keys.length >= MAX_ENTRIES) {
            const oldest = keys.shift()
            if (!oldest) {
                break
            }
            await cache.delete(oldest)
        }
        await cache.put(
            packUrl,
            new Response(bytes.slice(), {
                headers: {
                    [EXPIRES_HEADER]: String(Date.now() + ttl * 1000),
                    "Content-Type": "application/octet-stream"
                }
            })
        )
    } catch (_error) {
        // Storing failed (quota, permissions): the bytes are still good.
    }
    return bytes
}
