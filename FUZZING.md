# Fuzz testing

The editor is fuzz-tested with property-based harnesses under `test/fuzz/`.
Every harness runs the **compiled `dist/` code against real ProseMirror**
(views mounted under happy-dom) — the Jest suite mocks ProseMirror out, so
the fuzzers are where the real state machine gets exercised.

## Running

```bash
npm run build            # harnesses import dist/
npm run test:fuzz        # all harnesses, FC_RUNS iterations each (default 200)
FC_RUNS=2000 node test/fuzz/run-all.js          # longer campaign
FC_RUNS=1000 node test/fuzz/collab.js           # a single harness
FC_SEED=12345 FC_RUNS=1000 node test/fuzz/collab.js   # replay a specific seed
FC_STACK=1 ...                                  # print failure stack traces
```

Each harness prints `ok`/`FAILED` per property and exits non-zero on failure.
On failure fast-check prints the seed and the shrunk counterexample; replay
with the seed to reproduce.

For long campaigns, prefer `run-all.js` (process per harness): every fake
editor cycle retains ~0.5 MB through happy-dom, so single processes OOM at
roughly 3000+ editor creations. CI-scale runs (100–500) fit comfortably in
one process.

## Harnesses

| Harness                  | Target                                                                                                                      | Key invariants                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `collab.js`              | `ModCollabDoc` receive path (`applyDiffs`/`_processDiff`), footnote + cu/bu/iu updates, mutated/garbage step JSON           | convergence under concurrent edits, no partial application of bad diffs, doc.check() always passes                        |
| `random-transactions.js` | production dispatch path (amendTransaction → trackedTransaction → plugins), history                                         | doc validity, comment marks ↔ store consistency, track marks well-formed, undo/redo                                       |
| `recreate-merge.js`      | `recreate_transform.ts`, `no_collab_save/merge.ts`                                                                          | recreated steps land exactly on the target doc, JSON round-trip, covering-step exactness + fallback, rebase swap symmetry |
| `track-accept-reject.js` | accept/reject of tracked changes (inline + block level)                                                                     | no throw, doc valid, no open track changes after acceptAll/rejectAll                                                      |
| `comments.js`            | comment store lifecycle, remote `cu` batches, edits under comments                                                          | marks ↔ store consistency                                                                                                 |
| `paste.js`               | `clipboard/paste/*` handlers with adversarial HTML, output re-parsed through the schema                                     | no uncatchable throw, editor stays alive, output parses into a valid doc                                                  |
| `grammar-positions.js`   | grammar checker position mapping (`getText` → `byteToTextRanges` → `filterBadPos` → `translateMatches` → `filterPMMatches`) | surviving matches quote the document exactly, byte↔UTF-16 round-trip, hostile posMaps don't corrupt                       |
| `footnotes.js`           | real `ModFootnoteEditor` + production dispatch: main-doc markers ↔ footnote editor sync                                     | marker contents always equal footnote editor children                                                                     |

Shared infrastructure:

- `doc-generator.js` — structure-aware random Fidus document generator
  (all node/mark types, unicode-heavy text, comment/track marks).
- `edits.js` — random schema-valid edit transactions.
- `fake-editor.js` — headless editor shell: real `EditorView`s with a
  representative subset of the production plugin list, real comment store,
  bib/image DBs, and a footnote editor. No WebSocket, no workers.
- `config.js` — fast-check setup (`FC_RUNS`, `FC_SEED`, `FC_STACK`).
- `regressions/` — minimized repros of fixed bugs, run as part of `npm test`.

## Bugs found by fuzzing so far (all fixed)

1. **`docInfo.confirmedDoc` clobbered with `undefined`** — `setConfirmedDoc`
   indexed `tr.docs[NaN]` whenever `receiveDiff` carried an empty `ds` list
   or only echoed the client's own steps (`receiveTransaction` returns
   without the `rebased` meta in that case). `confirmedDoc` is the merge
   base for direct-save merges and the offline `getDoc()` source.
   Regression: `regressions/confirmed-doc.js`.
2. **`ModCollabDoc.receiving` stuck on failed diffs** — a diff that failed
   to parse or apply left the receiving flag set forever, silently blocking
   every outgoing diff until reload. Fixed with try/finally.
   Same regression file.
3. **Collaboration divergence from doc-wide random id assignment** — the
   links plugin assigned fresh random ids to _every_ id-less
   heading/figure/table/list in the document on any local edit. Two clients
   doing this concurrently assigned different ids to the same untouched
   nodes; the exchanged `setNodeMarkup` steps last-writer-win, so the
   documents permanently disagreed on node ids. Ids are now only assigned
   to nodes that the triggering transactions _created_ (absent in
   oldState) — a node that merely overlapped the changed range keeps its
   (possibly absent) id.
   Regression: `regressions/collab-id-assignment.js`.
4. **Track accept/reject crashed on structural edge cases** — a series of
   TransformErrors ("Invalid content for node richtext_part", "Inconsistent
   open depths", "No node at given position") aborted the whole
   acceptAll/rejectAll run whenever a deletion emptied a `block+` parent
   (part, blockquote, list) or a mapped position pointed at a node an
   earlier step had already removed; one merge path silently did nothing
   while reporting success, so accepting never converged. The delete path
   now falls back to structure-preserving steps (empty paragraph,
   track-entry strip), guards stale positions, verifies the merge actually
   removed the node, and the accept/reject walk iterates (bounded) until no
   handled entries remain.
   Regression: `regressions/track-accept-reject-robustness.js`.
