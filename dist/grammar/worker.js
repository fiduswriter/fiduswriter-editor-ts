/**
 * Web Worker owning the spell/grammar checker engine. Loads the language
 * pack, instantiates the wasm engine, and checks texts on request so that
 * engine construction and checks never block the main thread. Ported from
 * the LingoTweaker demo worker.
 *
 * Message protocol:
 * in:  {type: "load", lang, packUrl, variant?, picky?}
 * in:  {type: "check", id, texts: string[]}
 * out: {type: "ready", lang}
 * out: {type: "error", message}
 * out: {type: "result", id, results: [{index, matches}]}
 */
import init, { LtEngine } from "lingotweaker-wasm";
import { decompressPack } from "lingotweaker-wasm/pack";
import { fetchPackCached } from "./pack_cache.js";
const workerScope = self;
let initPromise = null;
let engine = null;
let loadGeneration = 0;
// Per-text check results (text → matches): an edit burst re-checks every
// source, but only the edited ones changed; capped LRU-style by insertion
// and cleared on every engine (re)load.
const textCache = new Map();
const TEXT_CACHE_MAX = 200;
function post(message) {
    workerScope.postMessage(message);
}
function ensureInit() {
    initPromise ??= init();
    return initPromise;
}
/**
 * Fetch and inflate the gzipped pack at `packUrl` (served from the
 * persistent pack cache when a fresh entry exists). Hosts install the
 * `lingotweaker-data-<pack>` npm packages for the languages they support
 * and serve the contents of their `packs/` directories; the main thread
 * resolves the pack URL (through its `staticUrl`, which may append a
 * cache-busting query).
 */
async function loadPack(packUrl) {
    const bytes = await fetchPackCached(packUrl);
    // Some servers transparently gunzip .gz responses (Content-Encoding);
    // only inflate when the gzip magic bytes are actually present.
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
        return decompressPack(bytes);
    }
    return bytes;
}
async function load(message) {
    const generation = ++loadGeneration;
    engine?.free();
    engine = null;
    textCache.clear();
    await ensureInit();
    const packBytes = await loadPack(message.packUrl);
    if (generation !== loadGeneration) {
        return;
    }
    const options = JSON.stringify({
        variant: message.variant || undefined,
        // The wasm engine has no clock, so the date is passed in.
        today: new Date().toISOString().slice(0, 10),
        picky: message.picky === true
    });
    const newEngine = new LtEngine(message.lang, packBytes, options);
    if (generation !== loadGeneration) {
        // A newer load superseded this one; drop the stale engine.
        newEngine.free();
        return;
    }
    engine = newEngine;
    post({ type: "ready", lang: message.lang });
}
function check(message) {
    if (!engine) {
        post({ type: "error", message: "engine is not loaded" });
        return;
    }
    const results = message.texts.map((text, index) => {
        if (!text || text.trim().length === 0) {
            return { index, matches: [] };
        }
        const cached = textCache.get(text);
        if (cached) {
            return { index, matches: cached };
        }
        const matches = JSON.parse(engine.check_matches_json(text)).matches;
        if (textCache.size >= TEXT_CACHE_MAX) {
            textCache.delete(textCache.keys().next().value);
        }
        textCache.set(text, matches);
        return { index, matches };
    });
    post({ type: "result", id: message.id, results });
}
async function handleMessage(message) {
    if (message.type === "load") {
        await load(message);
    }
    else if (message.type === "check") {
        check(message);
    }
}
workerScope.onmessage = event => {
    handleMessage(event.data).catch(error => {
        post({
            type: "error",
            message: String(error?.message ?? error)
        });
    });
};
//# sourceMappingURL=worker.js.map