#!/usr/bin/env node
// Bundle each demo entry point into .pages-build/ so the pages can be served
// without relying on a CDN or an import map.
import {build} from "esbuild"
import {existsSync, readdirSync, readFileSync, statSync} from "node:fs"
import {copyFileSync, mkdirSync} from "node:fs"
import {createRequire} from "node:module"
import {dirname, join, resolve} from "node:path"

const ROOT = resolve(import.meta.dirname, "..")
const DEMO_DIR = join(ROOT, "demo")
const BUILD_DIR = process.env.PAGES_BUILD_DIR || join(ROOT, ".pages-build")

const entries = readdirSync(DEMO_DIR)
    .filter(name => {
        const dir = join(DEMO_DIR, name)
        const indexFile = join(dir, "index.ts")
        return (
            existsSync(dir) &&
            statSync(dir).isDirectory() &&
            existsSync(indexFile) &&
            statSync(indexFile).isFile()
        )
    })
    .map(name => ({
        in: join(DEMO_DIR, name, "index.ts"),
        out: `${name}/index`
    }))

// esbuild does not bundle `new Worker(new URL("./worker.js", import.meta.url))`
// patterns — the grammar checker's client resolves that URL against its chunk
// (editor/), so emit the compiled worker as its own entry at exactly that
// location. The worker (and the inline fallback) fetch the engine's
// lt_wasm_bg.wasm relative to the shared chunk URL, so it is copied next to
// the chunks below.
const grammarWorker = join(ROOT, "dist", "grammar", "worker.js")
if (existsSync(grammarWorker)) {
    entries.push({
        in: grammarWorker,
        out: "editor/worker"
    })
} else {
    console.warn(
        "dist/grammar/worker.js not found — run `npm run build` first; " +
            "spell/grammar checking will not work in the demo."
    )
}

if (entries.length === 0) {
    console.log("No demo entry points found.")
    process.exit(0)
}

console.log("Bundling demos:", entries.map(e => e.out).join(", "))

// tokenfield (pulled in by the bibliography form) imports Node's `events`
// built-in.  Alias it to the browser-compatible `events` npm package so the
// demo bundle works in the browser.
const eventsPath = createRequire(import.meta.url).resolve("events/events.js")

await build({
    entryPoints: entries,
    bundle: true,
    format: "esm",
    splitting: true,
    outdir: BUILD_DIR,
    sourcemap: true,
    minify: true,
    target: ["es2020"],
    // Keep all split chunks and file-loader assets next to the editor page so
    // relative URLs resolve correctly both locally and on Forgejo Pages.
    // Include the content hash in the names so esbuild does not collide when
    // multiple chunks share the same basename.
    chunkNames: "editor/[name]-[hash]",
    assetNames: "editor/[name]-[hash]",
    loader: {
        ".png": "file",
        ".svg": "file",
        ".woff2": "file",
        ".csljson": "json",
        ".gz": "file"
    },
    define: {
        "process.env.NODE_ENV": '"production"'
    },
    alias: {
        events: eventsPath
    },
    // Mark Node.js built-ins as external so esbuild does not try to bundle
    // them for the browser.  citeproc-plus guards its Node.js paths with a
    // `process.versions?.node` check and they are never reached at runtime in
    // the browser, so leaving these as unresolved dynamic imports is safe.
    external: [
        "fs",
        "fs/promises",
        "path",
        "url",
        "module",
        "node:fs",
        "node:fs/promises",
        "node:path",
        "node:url",
        "node:module",
        "node:zlib"
    ]
})

console.log("Demo bundles written to", BUILD_DIR)

// The bibliography manager's file importer spawns a Web Worker via
// new Worker(new URL("./workers/bibliography_import_worker.js", import.meta.url)),
// which esbuild leaves untouched; the browser resolves it against the
// importer chunk (editor/), so bundle the shipped worker (bibliojson and
// all) as an iife entry at exactly that location — same approach as the
// fiduswriter-nextcloud and fiduswriter-wordpress builds.
const bibliographyWorker = join(
    ROOT,
    "node_modules",
    "@fiduswriter",
    "bibliography-manager",
    "dist",
    "import",
    "workers",
    "bibliography_import_worker.js"
)
if (existsSync(bibliographyWorker)) {
    const workersDest = join(BUILD_DIR, "editor", "workers")
    mkdirSync(workersDest, {recursive: true})
    await build({
        entryPoints: [bibliographyWorker],
        bundle: true,
        format: "iife",
        outfile: join(workersDest, "bibliography_import_worker.js"),
        minify: true,
        target: ["es2020"],
        define: {
            "process.env.NODE_ENV": '"production"'
        },
        alias: {
            events: eventsPath
        }
    })
} else {
    console.warn(
        "bibliography_import_worker.js not found — run `pnpm install` first; " +
            "bibliography file import will not work in the demo."
    )
}

// The lingotweaker-wasm engine fetches its lt_wasm_bg.wasm relative to the
// module URL of the bundled glue (a shared chunk in editor/), and esbuild
// does not rewrite `new URL('lt_wasm_bg.wasm', import.meta.url)` references —
// copy the file next to the chunks.
try {
    const require = createRequire(import.meta.url)
    const wasmPath = join(
        dirname(require.resolve("lingotweaker-wasm/package.json")),
        "web",
        "lt_wasm_bg.wasm"
    )
    const wasmDest = join(BUILD_DIR, "editor")
    mkdirSync(wasmDest, {recursive: true})
    copyFileSync(wasmPath, join(wasmDest, "lt_wasm_bg.wasm"))
    console.log("Copied lt_wasm_bg.wasm →", wasmDest)
} catch (error) {
    console.warn("Could not copy lt_wasm_bg.wasm:", error.message)
}

// esbuild leaves `new Worker(new URL("...", import.meta.url))` untouched, so
// after the build every surviving reference must resolve to a file this
// script emitted — otherwise the browser 404s the worker and the feature
// hangs with no console error (the spawn failure only shows as a promise
// that never settles).
function assertWorkerScriptsEmitted() {
    const chunkDir = join(BUILD_DIR, "editor")
    const pattern = /new Worker\(\s*new URL\("([^"]+)",\s*import\.meta\.url\)/g
    const missing = []
    for (const name of readdirSync(chunkDir)) {
        if (!name.endsWith(".js")) {
            continue
        }
        const file = join(chunkDir, name)
        const source = readFileSync(file, "utf8")
        for (const match of source.matchAll(pattern)) {
            const target = resolve(dirname(file), match[1])
            if (!existsSync(target)) {
                missing.push(`${target} (referenced from ${name})`)
            }
        }
    }
    if (missing.length > 0) {
        throw new Error(
            `Worker scripts referenced but not emitted:\n  ${missing.join("\n  ")}`
        )
    }
    console.log("Verified all new Worker(new URL(...)) references resolve")
}

assertWorkerScriptsEmitted()
