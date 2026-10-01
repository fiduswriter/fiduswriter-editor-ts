import { defineConfig } from "@playwright/test"

// The demo server (scripts/serve-demo.js) serves on $PORT (default 8080,
// like Forgejo Pages). Override PORT to run the tests beside other
// services that occupy the default port.
const port = Number(process.env.PORT) || 8080

export default defineConfig({
    testDir: "test/e2e",
    timeout: 180000,
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [["list"]],
    use: {
        baseURL: `http://localhost:${port}`
    },
    webServer: {
        // Builds .pages-build/ (esbuild bundle + static assets) and serves the
        // demo, exactly like Forgejo Pages does.
        command: "node scripts/serve-demo.js",
        url: `http://localhost:${port}/editor/`,
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
