import type {EditorState, Plugin, Transaction} from "prosemirror-state"
import {tableEditing} from "prosemirror-tables"

// Wrap prosemirror-tables' `tableEditing` so its table normalization does not
// run on transactions received from collaborators.
//
// `tableEditing`'s `appendTransaction` calls `fixTables`, which pads/trims any
// table that happens to lie inside the range a batch of transactions changed,
// keeping all rows rectangular. That fix-up is not commutative with
// collaborative rebasing: whether a table is inspected at all depends on how
// `changedDescendants` aligns the pre- and post-documents — i.e. on the
// *shape* of the triggering transaction (node identity, position shifts), not
// on its content. The fidus schema even allows schema-valid ragged tables
// (rows may have differing cell counts), and `table_body` carries
// `tableRole: "table"` (it is derived from prosemirror-tables' generated table
// node spec), so such tables are real fix-up candidates. If the fix-up fires
// on a transaction only one client applies — typically the revert/re-apply
// rebase dance of a remote merge — that client's table is padded while the
// others' stay ragged; the padding is ordinary replace steps, rebasing never
// undoes it, and the documents permanently diverge.
//
// Fidus marks every transaction it receives from collaborators with `remote`
// meta (`createRemoteTransaction` in no_collab_save/merge.ts, and the
// WebSocket receive path). The comments plugin already skips its
// `appendTransaction` when every triggering transaction is remote
// (state_plugins/comments.ts); apply the same discipline here. Local edits
// still normalize tables (the fix-up then reaches the other clients as normal
// sendable steps and converges); remote transactions never spawn divergent
// fix-ups.
export const tableEditingPlugin = (): Plugin => {
    const plugin = tableEditing()
    const appendTransaction = plugin.spec.appendTransaction
    if (appendTransaction) {
        plugin.spec.appendTransaction = function (
            this: Plugin,
            trs: readonly Transaction[],
            oldState: EditorState,
            state: EditorState
        ): Transaction | null | undefined {
            if (trs.every(tr => tr.getMeta("remote"))) {
                // All transactions come from collaborators. Table normalization
                // would only diverge between the clients; give up.
                return null
            }
            return appendTransaction.call(this, trs, oldState, state)
        }
    }
    return plugin
}
