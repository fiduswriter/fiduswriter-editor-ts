import { Step, Transform } from "prosemirror-transform";
import { receiveTransaction } from "prosemirror-collab";
import { recreateTransform } from "../collab/merge/recreate_transform.js";
/**
 * Compute the steps that turn `baseDoc` into `serverDoc`.
 *
 * Prefers the server-provided covering steps when they replay from `baseDoc`
 * to exactly `serverDoc` (so partial/stale step histories are detected and
 * discarded). Otherwise the steps are recreated with `recreateTransform`.
 */
export function getRemoteSteps(schema, baseDoc, serverDoc, m) {
    if (m?.length) {
        try {
            const tr = new Transform(baseDoc);
            const clientIds = [];
            m.forEach(message => {
                ;
                (message.ds ?? []).forEach(json => {
                    const step = Step.fromJSON(schema, json);
                    const result = tr.maybeStep(step);
                    if (!result.failed) {
                        clientIds.push(message.cid ?? "remote");
                    }
                });
            });
            if (tr.doc.eq(serverDoc)) {
                return { steps: tr.steps.slice(), clientIds };
            }
        }
        catch (_error) {
            // Malformed/unknown steps: fall back to recreating the steps
            // from the two documents below.
        }
    }
    const remoteTr = recreateTransform(baseDoc, serverDoc);
    return {
        steps: remoteTr.steps.slice(),
        clientIds: remoteTr.steps.map(() => "remote")
    };
}
/**
 * Create a transaction that applies third-party steps and rebases the
 * editor's unconfirmed local steps on top of them.
 *
 * This relies on `prosemirror-collab`'s `receiveTransaction`, which undoes
 * the unconfirmed steps, applies the supplied steps to that base, and then
 * re-applies the unconfirmed steps mapped over the new steps. The supplied
 * steps must therefore be based on the document state the unconfirmed queue
 * starts at (see {@link getRemoteSteps} and the `_savedBaseDoc` bookkeeping
 * in `NoCollabSave`).
 */
export function createRemoteTransaction(state, steps, clientIds) {
    const tr = receiveTransaction(state, steps, clientIds);
    tr.setMeta("remote", true);
    return tr;
}
/**
 * Create a transaction that drops the given already-saved steps from the
 * collab plugin's unconfirmed queue without modifying the document.
 *
 * `receiveTransaction`, when the client ids all match the local client,
 * only updates the plugin state (confirming the prefix of the queue), which
 * is exactly what we need after a save: the saved steps are confirmed while
 * steps created while the save request was in flight stay unconfirmed.
 */
export function createConfirmTransaction(state, steps, clientId) {
    if (!steps.length) {
        return null;
    }
    const tr = receiveTransaction(state, steps, steps.map(() => clientId));
    // Mark the transaction so the editor does not treat a save confirmation
    // as new local editing activity (see the dispatchTransaction hook).
    tr.setMeta("noCollabConfirm", true);
    return tr;
}
//# sourceMappingURL=merge.js.map