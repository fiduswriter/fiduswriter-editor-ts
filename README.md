<p align="center">
  <img src="https://git.fiduswriter.org/fiduswriter/fiduswriter-editor-ts/raw/branch/main/logo.svg" alt="@fiduswriter/editor" width="100" height="100">
</p>

<h1 align="center">@fiduswriter/editor</h1>

<p align="center">The ProseMirror-based editor component of Fidus Writer</p>

---

## What it does

The main browser-based collaborative editor for Fidus Writer. Built on
ProseMirror, it provides real-time collaboration, comments, tracked changes,
footnotes, citations, end-to-end encryption (E2EE), menus, dialogs, and
clipboard import/export.

### Key features

- **Real-time collaboration** — WebSocket-based collaborative editing with
  participant carets, diffs, and versioning
- **Track changes** — Accept/reject individual changes with full change history
- **Comments** — Threaded commenting with annotation marks and resolution
- **Footnotes** — Inline footnote editing with proper layout
- **Citations** — Citeproc-js based citation rendering with bibliography
  generation
- **E2EE** — End-to-end encryption with key management and passphrase support
- **Clipboard** — Paste from Word, LibreOffice, Google Docs with format
  preservation
- **Tables, figures & equations** — Full editing support for tables, images,
  math formulas, and code blocks

## Installation

```bash
npm install @fiduswriter/editor
```

## Usage

The library can be used in two modes: **static** (no backend server, like the
standalone demo) or **server-backed** (the classic Fidus Writer Django setup).

For a quick start without a backend, import `createStaticEditor` from the
`@fiduswriter/editor/static_editor` subpath:

```ts
import {createStaticEditor} from "@fiduswriter/editor/static_editor"

const editor = await createStaticEditor({
    locale: "en",
    username: "Demo User",
    documentData: async () => ({doc, doc_info, time: Date.now()}),
    documentStyles: [ /* style fixtures */ ],
    exportTemplates: [ /* export template fixtures */ ],
    documentTemplates: { /* document template fixtures */ }
})
```

Full API documentation, configuration options, and a complete server-backed
usage example are available on the project site:

**<https://fiduswriter.pages.fiduswriter.org/fiduswriter-editor-ts/>**

## Embedding in another application

The editor can be embedded directly into a host page (a CMS, a plugin, another
application) — no iframe required:

1. Mount the editor into a container element with the `mount` option. The
   editor renders its UI inside a `div.fw-editor` container (in full-page mode
   it replaces `document.body` instead, and that body carries the `fw-editor`
   class).
2. Load the editor's own stylesheets as-is: they are container-safe
   (`fw-`-prefixed classes, and the editor root targets `.fw-editor`).
3. Load fwtoolkit's **scoped** stylesheets for the host page. fwtoolkit ships
   `scripts/build-scoped-css.js` which writes `css-scoped/` — copies of its
   sheets with the page-context `body`/`html` rules scoped to a container
   selector:
   `node node_modules/fwtoolkit/scripts/build-scoped-css.js --prefix "#my-app .fw-editor"`
4. Add an inert reset link (`<link rel="stylesheet" href=".../css/reset.css" disabled />`)
   so the editor does not inject the global (unscoped) reset.
5. If the editor opens dialogs that should stay inside the container, the
   host can additionally scope stylesheets with bare element selectors
   (`document.css`) via `scopeCss(css, {prefix, elements: true})` (exported by
   `fwtoolkit`).

A working reference implementation is the **embedded demo**:

**<https://fiduswriter.pages.fiduswriter.org/fiduswriter-editor-ts/embedded/>**

`demo/embedded/` shows the editor running inside a page that has its own
header and content — the pattern that a WordPress/Drupal/Joomla plugin or any
other host would use.

## Demo

A standalone browser demo is published on Forgejo Pages:

**<https://fiduswriter.pages.fiduswriter.org/fiduswriter-editor-ts/editor/>**

The demo loads the editor without a Django backend. On startup it lets you
choose a language, import an existing document, or start from a default
template. Changes are saved locally and can be downloaded as a `.fidus` file.

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run typecheck    # Check types without emitting
npm run lint         # Lint with ESLint
npm run format:check # Check formatting with Prettier
npm test             # Run the test suite
```

## License

AGPL-3.0 — see [LICENSE](LICENSE) for details.
