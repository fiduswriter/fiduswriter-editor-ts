// Jest mock for lingotweaker-wasm/pack: decompressPack passes the fetched
// bytes through unchanged (the real one gunzips them) and records its input
// on globalThis.__lingotweakerDecompressCalls so tests can verify that the
// worker hands the HTTP response bytes to it.

export async function decompressPack(bytes) {
    ;(globalThis.__lingotweakerDecompressCalls ??= []).push(bytes)
    return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
}
