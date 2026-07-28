<p align="center">
  <img src="https://codeberg.org/fiduswriter/fiduswriter-editor-js/raw/branch/main/logo.svg" alt="@fiduswriter/editor" width="100" height="100">
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
- **Tables** — Full table editing with column/row operations
- **Figures & equations** — Image and math formula editing with captions
- **Code blocks** — Syntax-highlighted code block editing

## Exports

| Export | Description |
|--------|-------------|
| `Editor` | Main editor class — orchestrates ProseMirror, collaboration, and all subsystems |
| `createStaticEditor` | High-level helper that creates and initializes an editor without a backend server |
| `createStaticApp` | Lower-level helper that builds an in-memory `EditorApp` for static deployments |

Additional modules are exported under subpaths:
- `./state_plugins` — ProseMirror state plugins
- `./state_plugins/*` — Individual plugins (inline math, references, links, etc.)
- `./menus` — Editor menus and toolbar
- `./dialogs` — Editor dialogs (figure, citation, link, table, etc.)
- `./keymap` — Keyboard shortcut bindings
- `./exporter/native/file` — Download the current document as a `.fidus` file

## Installation

```bash
npm install @fiduswriter/editor
```

## Usage

The library can be used in two modes: **static** (no backend server, like the
standalone demo) or **server-backed** (the classic Fidus Writer Django setup).

### Static usage

For a statically served editor, use `createStaticEditor`. It sets up the runtime
globals, loads locale strings, creates the in-memory app shell, and initializes
the editor.

```ts
import {createStaticEditor} from "@fiduswriter/editor/static_editor"
import {ExportFidusFile} from "@fiduswriter/editor/exporter/native/file"

const editor = await createStaticEditor({
    locale: "en",
    username: "Demo User",
    documentData: async () => ({
        doc: {
            v: 0,
            content: { /* ProseMirror document JSON */ },
            comments: {},
            bibliography: {},
            images: {}
        },
        doc_info: {
            id: 1,
            rights: "write",
            is_owner: true,
            path: "",
            updated: new Date(),
            dir: "ltr",
            access_rights: "write",
            e2ee: false,
            owner: {id: 1, name: "Demo User", type: "user", contacts: []}
        },
        time: Date.now()
    }),
    documentStyles: [
        {
            title: "Standard article",
            slug: "standard-article",
            contents: "",
            documentstylefile_set: []
        }
    ],
    exportTemplates: [
        {
            title: "Fidus Writer",
            file_type: "fidus",
            template_file: "/static/export-templates/template.fidus"
        }
    ],
    documentTemplates: {
        "1": {title: "Standard article"}
    }
})

// Download the document as a .fidus file.
const doc = editor.getDoc({use_current_view: true})
new ExportFidusFile(
    editor.app,
    doc,
    editor.mod.db.bibDB,
    editor.mod.db.imageDB,
    false
)
```

`createStaticEditor` accepts a `StaticEditorConfig`. The most important options
are:

- `locale` — locale code, e.g. `"en"`.
- `username` / `user` — either a display name or a complete `EditorUser` object.
- `documentData` — async function returning `{doc, doc_info, time}`.
- `documentStyles`, `exportTemplates`, `documentTemplates` — template/style
  fixtures used by the document template and export dialogs.
- `initialImages` — optional map of image entries to prime the image database.
- `getDocContent` — optional callback returning the current document content;
  used to derive the correct document template for downloads.
- `onSaveDocument` — optional callback invoked when the editor tries to save.
- `staticBasePath` — base URL for resolving CSS and static assets.
- `plugins` — extra editor plugins, e.g. `[["demo", {MyPlugin}]]`.

> **Note:** Import `createStaticEditor` from `@fiduswriter/editor/static_editor`
> rather than the main package entry. This keeps the `Editor` class out of the
> initial bundle and ensures the runtime globals (`gettext`, `interpolate`,
> `staticUrl`) are set before any editor module is evaluated.
>
> If you bundle a static page with esbuild, configure a loader for `.gz` assets
> — `citeproc-plus` loads compressed style and locale files:
>
> ```js
> loader: { ".gz": "file" }
> ```

For more control, build the app shell manually with `createStaticApp` and then
instantiate the `Editor` class yourself:

```ts
import {Editor, createStaticApp} from "@fiduswriter/editor"

const app = await createStaticApp({
    locale: "en",
    gettext: msgid => msgid,
    csl,
    documentData: async () => ({doc, doc_info, time: Date.now()})
})

const editor = new Editor({app, user}, "", "1", [])
await editor.init()
```

### Server-backed usage

When a backend server is available, construct `Editor` directly with an
`EditorApp` object that provides API connectors, settings, and the CSL engine.
This is how the main Fidus Writer Django application uses the library.

```ts
import {Editor} from "@fiduswriter/editor"

const editor = new Editor(
    {app, user},
    "/documents/123",
    "123",
    [["my-plugin", {MyPlugin}]]
)
await editor.init()
```

The `app` object must satisfy the `EditorApp` interface:

- `name` — application name.
- `routes` — route table used by the editor router.
- `goTo(url)` — navigate to a different route.
- `isOffline()` — return whether the browser is offline.
- `settings` — editor settings such as `EDITOR_SAVE_MODE`, `LANGUAGE`,
  `E2EE_MODE`, and `APPS`.
- `csl` — a CSL engine instance.
- `apiConnectors` — connectors for `document`, `documentImport`, `image`,
  `bibliography`, and `contacts` APIs.
- `bibDB` and `imageDB` — database instances for bibliography and images.

## Demo

A standalone browser demo is published on Codeberg Pages:

**https://fiduswriter.codeberg.page/fiduswriter-editor-js/**

The demo loads the editor without a Django backend. On startup it shows a
dialog where you can:

- Choose a language from the bundled `locale/*/messages.json` catalogs
  (defaults to English).
- Import an existing document in `.fidus`, `.docx`, `.odt`, or Pandoc `.json`
  format, with drag-and-drop support.
- Start a new document from a built-in default template.
- Optionally apply a `.fidustemplate` document template to a new document.

Changes are saved locally and can be downloaded as a `.fidus` file.

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
