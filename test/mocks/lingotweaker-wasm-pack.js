export async function fetchPack(lang, _options = {}) {
    if (lang === "unknown") {
        throw new Error(`cannot load pack: HTTP 404`)
    }
    return new Uint8Array([1, 2, 3])
}

export function packUrl(lang, baseUrl = "") {
    return `${baseUrl}/packs/${lang}.pack.gz`
}

export function manifestUrl(baseUrl = "") {
    return `${baseUrl}/manifest.json`
}

export async function decompressPack(bytes) {
    return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
}
