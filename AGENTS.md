# AGENTS.md — @fiduswriter/editor

## Project overview

`@fiduswriter/editor` is a JavaScript/TypeScript library that implements the
browser-based Fidus Writer ProseMirror editor: collaborative editing, comments,
tracked changes, footnotes, citations, dialogs, menus, and end-to-end
encryption.

- Package name: `@fiduswriter/editor`
- License: `AGPL-3.0`
- Repository: `https://codeberg.org/fiduswriter/fiduswriter-editor.git`
- Author: Johannes Wilm

## Scope

Code in this repository should be limited to:

- Editor bootstrap and lifecycle (`src/index.js`).
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

- `fiduswriter/` (the main Fidus Writer Django app).

## Notes

- This package depends on `@fiduswriter/document` for the document model and
  import/export helpers. It no longer depends on `@fiduswriter/common` — the
  `App`/`User` types and `FeedbackTab` have been removed or inlined.
- The `bibliojson` dependency used indirectly via `@fiduswriter/document` and
  `@fiduswriter/bibliography-manager` was previously published as
  `biblatex-csl-converter`. Its JSON format is referred to as the BiblioJSON
  format.
