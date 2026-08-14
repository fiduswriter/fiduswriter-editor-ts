<p align="center">
  <img src="https://codeberg.org/fiduswriter/fiduswriter-editor-ts/raw/branch/main/logo.svg" alt="@fiduswriter/editor" width="100" height="100">
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

**<https://fiduswriter.codeberg.page/fiduswriter-editor-ts/>**

## Demo

A standalone browser demo is published on Codeberg Pages:

**<https://fiduswriter.codeberg.page/fiduswriter-editor-ts/editor/>**

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
