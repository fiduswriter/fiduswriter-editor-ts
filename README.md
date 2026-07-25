<p align="center">
  <img src="https://codeberg.org/fiduswriter/fiduswriter-editor-js/raw/branch/main/logo.svg" alt="@fiduswriter/editor" width="100" height="100">
</p>

<h1 align="center">@fiduswriter/editor</h1>

<p align="center">Browser-based ProseMirror editor for Fidus Writer</p>

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
- **Tables** — Full table editing with column/row operations
- **Figures & equations** — Image and math formula editing with captions
- **Code blocks** — Syntax-highlighted code block editing

## Exports

| Export | Description |
|--------|-------------|
| `Editor` | Main editor class — orchestrates ProseMirror, collaboration, and all subsystems |

Additional modules are exported under subpaths:
- `./state_plugins` — ProseMirror state plugins
- `./state_plugins/*` — Individual plugins (inline math, references, links, etc.)
- `./menus` — Editor menus and toolbar
- `./dialogs` — Editor dialogs (figure, citation, link, table, etc.)
- `./keymap` — Keyboard shortcut bindings

## Installation

```bash
npm install @fiduswriter/editor
```

## Usage

```ts
import {Editor} from "@fiduswriter/editor"

const editor = new Editor({
    user: {id: 1, username: "author"},
    documentId: 123,
    websocketUrl: "wss://example.com/ws/"
})
```

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run typecheck    # Check types without emitting
npm run lint         # Lint with ESLint
npm run format:check # Check formatting with Prettier
```

## License

AGPL-3.0 — see [LICENSE](LICENSE) for details.
