#!/usr/bin/env node
// Bundle each demo entry point into .pages-build/ so the pages can be served
// without relying on a CDN or an import map.
import {build} from "esbuild"
import {existsSync, readdirSync, statSync} from "node:fs"
import {createRequire} from "node:module"
import {join, resolve} from "node:path"

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
    sourcemap: false,
    minify: true,
    target: ["es2020"],
    publicPath: "/",
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
    // them for the browser.  The create_csl.ts Node.js locale-loader path is
    // guarded by a `process.versions?.node` check and is never reached at
    // runtime in the browser, so leaving these as unresolved dynamic imports
    // is safe.
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
