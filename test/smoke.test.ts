import {describe, test, expect} from "@jest/globals"
import {readFileSync, existsSync} from "fs"
import {fileURLToPath} from "url"
import {dirname, join} from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkgDir = join(__dirname, "..")
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf-8"))
const distDir = join(pkgDir, "dist")
const distExists = existsSync(join(distDir, "index.js"))

describe("@fiduswriter/editor", () => {
    test("package.json has name and version", () => {
        expect(pkg.name).toBe("@fiduswriter/editor")
        expect(pkg.version).toBeTruthy()
        expect(typeof pkg.version).toBe("string")
    })

    test("package.json has exports field", () => {
        expect(pkg.exports).toBeDefined()
    })

    test("has build, typecheck, lint, test scripts", () => {
        expect(pkg.scripts.build).toBeDefined()
        expect(pkg.scripts.typecheck).toBeDefined()
        expect(pkg.scripts.lint).toBeDefined()
        expect(pkg.scripts.test).toBeDefined()
    })

    test("dist/index.js exists (run npm run build first)", () => {
        expect(distExists).toBe(true)
    })

    test("dist/index.d.ts exists", () => {
        expect(existsSync(join(distDir, "index.d.ts"))).toBe(true)
    })

    test("logo.svg exists", () => {
        expect(existsSync(join(pkgDir, "logo.svg"))).toBe(true)
    })

    test("README.md exists", () => {
        expect(existsSync(join(pkgDir, "README.md"))).toBe(true)
    })

    test("pre-commit hook exists", () => {
        expect(existsSync(join(pkgDir, ".husky", "pre-commit"))).toBe(true)
    })

    test("AGENTS.md exists", () => {
        expect(existsSync(join(pkgDir, "AGENTS.md"))).toBe(true)
    })
})
