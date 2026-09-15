# AGENTS.md — @fiduswriter/editor

## Project overview

`@fiduswriter/editor` is a JavaScript/TypeScript library that implements the
browser-based Fidus Writer ProseMirror editor: collaborative editing, comments,
tracked changes, footnotes, citations, dialogs, menus, and end-to-end
encryption.

- Package name: `@fiduswriter/editor`
- License: `AGPL-3.0`
- Repository: `https://git.fiduswriter.org/fiduswriter/fiduswriter-editor-ts.git`
- Author: Johannes Wilm

## Scope

Code in this repository should be limited to:

- Editor bootstrap and lifecycle (`src/index.js`).
- Static editor bootstrap (`src/static_editor.ts`, `src/static_app.ts`).
- ProseMirror state plugins (`src/state_plugins/`).
- Editor menus and toolbar (`src/menus/`).
- Editor dialogs (`src/dialogs/`).
- Citations (`src/citations/`).
- Comments (`src/comments/`).
- Real-time collaboration (`src/collab/`).
- Footnotes (`src/footnotes/`).
- Track changes (`src/track/`).
- Clipboard handling (`src/clipboard/`).
- End-to-end encryption (`src/e2ee/`).
- Editor tools (`src/tools/`).

Do **not** put in this repository:

- Generic UI primitives (those belong in `fwtoolkit`).
- Fidus-Writer-specific shared chrome (use `@fiduswriter/common`).
- The document schema or import/export filters (use `@fiduswriter/document`).
- The main SPA router (`App` in the Django `base` app).

## Candidates for `fwtoolkit`

The following UI patterns are currently here but may be generic enough for
`fwtoolkit` after evaluation:

- Generic dialog patterns beyond Fidus-Writer-specific content.
- Generic menu/toolbar model/view abstractions.

## Technology stack

- **Language:** TypeScript 6.0+ (currently still mostly JavaScript).
- **Module system:** ESM (`"type": "module"`).
- **Build tool:** `tsc` only; no bundler is used.

## Directory layout

```
.
├── src/                  # Source files
│   ├── index.js          # Editor class and public entry point
│   ├── citations/        # Citation handling
│   ├── clipboard/        # Copy/paste handling
│   ├── collab/           # Real-time collaboration
│   ├── comments/         # Comments
│   ├── databases/        # Editor-side bibliography/image DB caches
│   ├── dialogs/          # Editor dialogs
│   ├── document_template/# Document template handling
│   ├── e2ee/             # End-to-end encryption
│   ├── footnotes/        # Footnote editor
│   ├── keymap.js         # Editor keymap
│   ├── marginboxes/      # Margin boxes
│   ├── menus/            # Menus and toolbar
│   ├── navigator/        # Document navigator
│   ├── no_collab_save/   # Non-collaborative save
│   ├── plugins/editor/   # Plugin placeholder
│   ├── state_plugins/    # ProseMirror state plugins
│   ├── static_app.ts     # In-memory app shell for static deployments
│   ├── static_editor.ts  # High-level static editor initializer
│   ├── tools/            # Editor tools
│   └── track/            # Track changes
├── dist/                 # Compiled JS, .d.ts and source maps (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Build commands

```bash
npm install
npm run build
npm run typecheck
```

## Consumers

- `fiduswriter-server-backend/` (the main Fidus Writer Django app).
- Statically served pages and browser demos that use `createStaticEditor` or
  `createStaticApp` without a backend server.

## Notes

- This package depends on `@fiduswriter/document` for the document model and
  import/export helpers. It no longer depends on `@fiduswriter/common` — the
  `App`/`User` types and `FeedbackTab` have been removed or inlined.
- The `bibliojson` dependency used indirectly via `@fiduswriter/document` and
  `@fiduswriter/bibliography-manager` was previously published as
  `biblatex-csl-converter`. Its JSON format is referred to as the BiblioJSON
  format.
- `static_editor.ts` installs a `window.fetch` interceptor at module load
  that resolves citeproc-plus's relative CSL style/locale asset URLs
  (`./assets/…` and, for citeproc-plus 2.x, co-located `./<id>.gz`) against
  the module URL — embedded hosts (e.g. the Nextcloud app) serve the page
  from a URL that is not the bundle directory, and their server may refuse
  to serve `.gz` statically. Hosts whose entry chunk lives one directory
  above the assets (esbuild `assetNames: "assets/[name]-[hash]"`) need a
  second rewrite pass on top; see `src/fetch-shim.ts` in fiduswriter-nextcloud.
- The static session image store (`static_app.ts`) ids must not collide with
  document image ids: `nextImageId` starts above any `initialImages` entries,
  and the image selection dialog only treats a user-DB image as a duplicate
  of a document-DB image when id AND image payload match (the two DBs use
  independent id namespaces).
- `createStaticEditor` accepts an optional `staticUrl` override for
  resolving asset URLs (default mapping derived from `staticBasePath`).
  Embedded hosts should use it to append their cache buster: the editor
  loads its stylesheets at runtime via fwtoolkit `ensureCSS`, which only
  skips a stylesheet when the href matches exactly, so un-bustered runtime
  URLs both duplicate host-linked stylesheets and can be served stale from
  a platform's long-lived static cache after an upgrade. `ensureResetCSS`
  uses the same resolver and also matches host links that differ only by a
  `?v=` query.
