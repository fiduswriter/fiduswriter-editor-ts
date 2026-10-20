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
- Spell/grammar checking (`src/grammar/`).
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
│   ├── grammar/          # Built-in spell/grammar checker
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

## Fuzz testing

Property-based fuzz harnesses live in `test/fuzz/` (see `FUZZING.md` for
details): `npm run test:fuzz` runs them all against the compiled `dist/`
code with real ProseMirror. `FC_RUNS`/`FC_SEED` control iterations and
replay; minimized repros of fixed bugs live in `test/fuzz/regressions/` and
run as part of `npm test`. After changing collab, track changes, comments,
paste handling, grammar checking or footnote sync, run the relevant harness
with a few hundred iterations — the Jest suite alone does not cover those
state machines.

## Consumers

- `fiduswriter-server-backend/` (the main Fidus Writer Django app).
- Statically served pages and browser demos that use `createStaticEditor` or
  `createStaticApp` without a backend server.

## Host-provided menu entries

`StaticAppConfig.extraMenuItems` lets a host extend **any** of the editor's
menus, or add a top-level menu of its own. A host without a Fidus Writer
backend owns the document lifecycle — which file is open, where it is saved,
what "New" means — so the editor cannot supply Open, Save as or New itself.
Supplying them this way keeps one menu and one look, instead of the host
bolting a separate toolbar onto the page. Hosts use the same mechanism for
their own entries elsewhere: the desktop application puts "User preferences"
at the end of the Settings menu this way.

Each contribution is a `HostMenuContribution` (`src/types.ts`): a `menuId`
naming an existing menu ("file", "export", "settings", "tools", "help") or a
new unique one, an optional `menuTitle` (which turns a missing id into a new
top-level menu, appended at the far right), an optional `position` of
`"start"` (default) or `"end"` for where new entries go, and the
`HostFileMenuItem` entries themselves.

The splicing is `addHostMenuItems` in `src/menus/headerbar/host_items.ts`,
applied by the `Editor` constructor the same way `document_template` adds its
own "Create copy as ..." entry. Entries are matched by `id`: an entry whose id matches an
existing one replaces it **in place**, so overriding cannot reorder the menu
and rebuilding cannot accumulate duplicates. Give entries ids.

The view renders `content` in array order, so new entries go to the start or
end of their menu per `position`. `order` is not consulted for ordering.

## The Help menu

The headerbar model ends with a built-in **Help** menu (`id: "help"`,
`Alt-h`) holding:

- **About Fidus Writer** — version, copyright, license and website. The
  version comes from `app.settings.VERSION`; the Fidus Writer server supplies
  it through the page settings, and static hosts pass
  `StaticAppConfig.version`.
- **Technical support** — a feedback form posting through
  `app.apiConnectors.feedback`. The entry (and its separator) is hidden when
  the host supplies no such connector — standalone hosts don't.
- **Documentation** (`https://fiduswriter.github.io/manual/`) and **Forum**
  (`https://forum.fiduswriter.org/`), each opened in a new tab.

Hosts can add their own entries to the Help menu through
`extraMenuItems` with `menuId: "help"`.

## Host-supplied branding

The editor carries no branding: the Django backend renders its logo in the page
chrome around the editor, and a standalone or embedded host supplies its own.
`StaticAppConfig.logoUrl` puts an `<img id="document-logo">` at the head of
`#document-top`, before the document title, and nothing is rendered when it is
unset. `LOGO_URL` is a declared member of `EditorApp.settings` — read it
directly, no cast.

`#document-top > h1` draws a small fox face as a CSS background
(`static/img/fidus_face.avif`); a container query drops it below 1023px of
editor width, where `#document-logo` is hidden too. **The two are alternatives,
never both**: when a logo is supplied the view adds `.host-logo` to the title
and `#document-top > h1.host-logo {background: initial}` drops the fox face —
they share the 42px (14px compact) left offset but differ in size and vertical
placement, so rendering both stacks _two foxes_ in the corner of the header.
`test/headerbar-logo.test.ts` pins both halves (the emitted class and the CSS
rule keyed to it).

## Notes

- This package depends on `@fiduswriter/document` for the document model and
  import/export helpers. It no longer depends on `@fiduswriter/common` — the
  `App`/`User` types and `FeedbackTab` have been removed or inlined.
- Spell/grammar checking is built in (`src/grammar/`, `editor.mod.grammar`)
  and runs the `lingotweaker-wasm` engine in a Web Worker. The worker
  fetches the per-language data packs from the host's static tree at
  `staticUrl("lingotweaker-packs/<pack>.pack.gz")`: hosts must install the
  `lingotweaker-data-<pack>` npm packages for the languages they want to
  support and serve the contents of their `packs/` directories under the
  static root. The app config key `grammar_check_pack_base_url` (a URL
  ending in `/`) overrides that location. The user preference
  `grammar_check_continuous` sets the default for the per-document
  "Continuous checking" toggle (Tools → Spell/grammar checker); when on,
  the engine pack loads right after the document and the first check runs
  without user intervention. Fetched packs are persisted client-side
  (`src/grammar/pack_cache.ts`, Cache Storage — usable from the worker):
  keyed by pack URL, with a freshness TTL taken from the response's HTTP
  cache headers (`max-age` capped at a year, `immutable` and `no-store`
  honored, 7-day default without headers) and a small LRU cap, so repeat
  loads are fast even on hosts with weak cache headers while
  versioned-URL hosts keep their normal upgrade invalidation.
- esbuild does not bundle `new Worker(new URL("./worker.js", import.meta.url))`
  worker spawns or `new URL('lt_wasm_bg.wasm', import.meta.url)` asset
  references — bundlers that build on esbuild (the demo's `build-demo.js`,
  fiduswriter-nextcloud, fiduswriter-wordpress) must emit the compiled
  `dist/grammar/worker.js` as their own entry at the URL the client resolves
  against its chunks and copy `lt_wasm_bg.wasm` next to those chunks
  (rspack, used by the main app, handles both automatically). The same
  applies to the bibliography manager's import worker. All three esbuild
  builds end with a guard that scans the emitted chunks and fails the build
  when a surviving `new Worker(new URL(...))` reference does not resolve to
  an emitted file — without it the browser 404s the worker and the feature
  hangs with no console error.
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
- Direct (non-WebSocket) saving is handled by `src/no_collab_save/`. It keeps
  `_savedBaseDoc` (last server-confirmed document) plus the collab plugin's
  unconfirmed queue as the local diff, and merges third-party changes on 409
  or during the periodic remote check by rebasing with
  `prosemirror-collab`'s `receiveTransaction` (helpers in
  `src/no_collab_save/merge.ts`). Server-provided covering steps (`m`) are
  only used when replaying them from `_savedBaseDoc` reproduces the server
  document exactly; otherwise `recreateTransform` recreates them. After a
  successful save exactly the sent steps/events are confirmed
  (`createConfirmTransaction`, `eventsSent`) — never blanket-clear the
  queues, or edits made while the request was in flight would be marked as
  saved. Hosts can provide an optional
  `apiConnectors.document.getDocumentVersion()` probe so the periodic check
  does not need to download the full document; see the tests in
  `test/no-collab-save-merge.js`.
- The direct-save cadence is adaptive, computed by the pure
  `computeNextDelayMs()` in `src/no_collab_save/scheduling.ts`: ~10 s while
  the user is editing (also the base cadence after a save), a 20/40/80 s
  ramp up to 120 s while idle, slower ramps while the window is blurred,
  a 5-minute safety probe while hidden, and no periodic network access
  while offline. Focus/visibility/online events trigger an immediate
  (throttled to ≥2 s) check or save, hidden tabs flush-save on hide, and
  every delay gets ±15 % jitter so editors do not poll in lockstep. The
  editor calls `NoCollabSave.notifyEdit()` from `dispatchTransaction` for
  local doc changes (remote merges and save confirmations set
  `remote`/`noCollabConfirm` meta and are excluded). Hosts can override
  timing constants with `StaticAppConfig.savePolling`; the DAV mount
  forwards it as `MountFidusEditorConfig.savePolling`. Scheduling tests are
  in `test/no-collab-save-scheduling.js`.
