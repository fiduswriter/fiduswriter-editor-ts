import { defineConfig } from "@playwright/test"

export default defineConfig({
    testDir: "test/e2e",
    timeout: 180000,
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [["list"]],
    use: {
        baseURL: "http://localhost:8080"
    },
    webServer: {
        // Builds .pages-build/ (esbuild bundle + static assets) and serves the
        // demo on port 8080, exactly like Forgejo Pages does.
        command: "node scripts/serve-demo.js",
        url: "http://localhost:8080/editor/",
        timeout: 180000,
        reuseExistingServer: !process.env.CI
    },
    projects: [
        {
            name: "chromium",
            use: { browserName: "chromium" }
        }
    ]
})
