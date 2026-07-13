# @fiduswriter/editor

Fidus Writer browser editor.

This package implements the browser-based ProseMirror editor used by Fidus
Writer, including real-time collaboration, comments, tracked changes,
footnotes, citations, dialogs, menus, and end-to-end encryption.

## Build

```bash
npm install
npm run build
```

## Status

This is an initial extraction from the main Fidus Writer Django app. The code is
still JavaScript and will be migrated to TypeScript over time. Some
functionality that was previously spread across Django apps (image editing,
contacts, access rights) has been copied into this package for the first pass
and may be reorganized later.
