#!/usr/bin/env node
// Build the demo site the same way Codeberg Pages does and serve it locally.
import {spawn} from "node:child_process"
import {createServer} from "node:http"
import * as fs from "node:fs/promises"
import {existsSync} from "node:fs"
import {extname, join, resolve} from "node:path"
import {fileURLToPath} from "node:url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const ROOT = resolve(__dirname, "..")
const BUILD_DIR = join(ROOT, ".pages-build")

const MIME_TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
    ".ogg": "audio/ogg",
    ".webmanifest": "application/manifest+json"
}

function run(command, args, env = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: "inherit",
            env: {...process.env, ...env},
            cwd: ROOT
        })
        child.on("close", code => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`Command failed with exit code ${code}`))
            }
        })
    })
}

async function ensureDir(dir) {
    await fs.mkdir(dir, {recursive: true})
}

async function copyCssFiles(sourceDir, destDir) {
    const entries = await fs.readdir(sourceDir)
    await Promise.all(
        entries
            .filter(name => name.endsWith(".css"))
            .map(name => fs.copyFile(join(sourceDir, name), join(destDir, name)))
    )
}

async function buildDemo() {
    console.log("Cleaning build directory...")
    await fs.rm(BUILD_DIR, {recursive: true, force: true})
    await ensureDir(BUILD_DIR)

    console.log("Copying demo files...")
    await fs.cp(join(ROOT, "demo"), BUILD_DIR, {recursive: true})

    console.log("Bundling demos...")
    await run("node", [join(ROOT, "scripts", "build-demo.js")], {
        PAGES_BUILD_DIR: BUILD_DIR
    })

    console.log("Copying styles...")
    const cssDir = join(BUILD_DIR, "css")
    await ensureDir(cssDir)
    await copyCssFiles(join(ROOT, "node_modules", "fwtoolkit", "css"), cssDir)
    await fs.copyFile(
        join(ROOT, "node_modules", "prosemirror-view", "style", "prosemirror.css"),
        join(cssDir, "prosemirror.css")
    )
    await fs.copyFile(
        join(ROOT, "node_modules", "cropperjs", "dist", "cropper.min.css"),
        join(cssDir, "cropper.min.css")
    )
    await copyCssFiles(join(ROOT, "css"), cssDir)
    await fs.copyFile(
        join(ROOT, "node_modules", "@fiduswriter", "bibliography-manager", "css", "bibliography.css"),
        join(cssDir, "bibliography.css")
    )

    console.log("Copying static assets...")
    await fs.cp(join(ROOT, "static"), join(BUILD_DIR, "static"), {recursive: true})

    console.log("Copying Font Awesome...")
    const faCssDir = join(BUILD_DIR, "css", "fontawesome", "css")
    const faFontsDir = join(BUILD_DIR, "css", "fontawesome", "webfonts")
    await ensureDir(faCssDir)
    await ensureDir(faFontsDir)
    await fs.copyFile(
        join(ROOT, "node_modules", "@fortawesome", "fontawesome-free", "css", "all.css"),
        join(faCssDir, "all.css")
    )
    await fs.cp(
        join(ROOT, "node_modules", "@fortawesome", "fontawesome-free", "webfonts"),
        faFontsDir,
        {recursive: true}
    )

    console.log("Copying MathLive assets...")
    const libsDir = join(BUILD_DIR, "css", "libs")
    await ensureDir(libsDir)
    await fs.cp(
        join(ROOT, "node_modules", "@fiduswriter", "document", "static-libs", "css", "libs"),
        libsDir,
        {recursive: true}
    )

    console.log("Copying locales...")
    await fs.cp(join(ROOT, "locale"), join(BUILD_DIR, "locale"), {recursive: true})

    console.log("Copying logo...")
    await fs.copyFile(join(ROOT, "logo.svg"), join(BUILD_DIR, "logo.svg"))
}

function serve() {
    const port = Number(process.env.PORT) || 8080

    const server = createServer(async (req, res) => {
        let url = new URL(req.url, `http://${req.headers.host}`).pathname
        if (url.endsWith("/")) {
            url += "index.html"
        }
        const filePath = join(BUILD_DIR, url)
        if (!filePath.startsWith(BUILD_DIR)) {
            res.writeHead(403)
            res.end("Forbidden")
            return
        }

        try {
            if (!existsSync(filePath)) {
                throw new Error("Not found")
            }
            const stat = await fs.stat(filePath)
            if (!stat.isFile()) {
                throw new Error("Not a file")
            }
            const file = await fs.open(filePath)
            const ext = extname(filePath)
            res.writeHead(200, {
                "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
            })
            for await (const chunk of file.createReadStream()) {
                res.write(chunk)
            }
            res.end()
        } catch {
            res.writeHead(404)
            res.end("Not found")
        }
    })

    server.listen(port, () => {
        console.log(`Demo server running at http://localhost:${port}/editor/`)
        console.log("Press Ctrl+C to stop")
    })
}

await buildDemo()
serve()
