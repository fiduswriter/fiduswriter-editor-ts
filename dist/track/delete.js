import { Fragment, Slice } from "prosemirror-model";
import { liftListItem } from "prosemirror-schema-list";
import { EditorState, Selection, TextSelection } from "prosemirror-state";
import { ReplaceAroundStep, ReplaceStep, replaceStep } from "prosemirror-transform";
export const deleteNode = (tr, node, nodePos, map, accept) => {
    // Delete a node either because a deletion has been accepted or an insertion rejected.
    const newNodePos = map.map(nodePos), trackType = accept ? "deletion" : "insertion";
    // The node this decision was made on can already have been removed or
    // merged by an earlier step of the same run; its mapped position then
    // no longer points at it (or at anything). Nothing left to do.
    const stillThere = tr.doc.nodeAt(newNodePos);
    if (!stillThere || stillThere.type !== node.type) {
        return;
    }
    let delStep;
    if (node.isTextblock) {
        const selectionBefore = Selection.findFrom(tr.doc.resolve(newNodePos), -1);
        if (selectionBefore instanceof TextSelection) {
            const start = selectionBefore.$anchor.pos, end = newNodePos + 1;
            let allowMerge = true;
            // Make sure there is no isolating nodes inbetween.
            tr.doc.nodesBetween(start, end, (innerNode, pos) => {
                if (pos < start) {
                    return true;
                }
                if (innerNode.type.spec.isolating) {
                    allowMerge = false;
                }
                return false;
            });
            if (allowMerge) {
                delStep = replaceStep(tr.doc, start, end);
            }
            else {
                const track = node.attrs.track.filter(track => track.type !== trackType);
                tr.setNodeMarkup(newNodePos, null, Object.assign({}, node.attrs, { track }), node.marks);
            }
        }
        else {
            // There is a block node right in front of it that cannot be removed. Give up. (table/figure/etc.)
            const current = tr.doc.nodeAt(newNodePos);
            if (current && current.type === node.type) {
                const track = node.attrs.track.filter(track => track.type !== trackType);
                tr.setNodeMarkup(newNodePos, null, Object.assign({}, current.attrs, { track }), current.marks);
            }
        }
    }
    else if (node.isLeaf || ["figure", "table"].includes(node.type.name)) {
        delStep = new ReplaceStep(newNodePos, map.map(nodePos + node.nodeSize), Slice.empty);
    }
    else if (node.type === tr.doc.type.schema.nodes["list_item"]) {
        const state = EditorState.create({
            doc: tr.doc,
            selection: Selection.findFrom(tr.doc.resolve(newNodePos), 1) || undefined
        });
        liftListItem(node.type)(state, newTr => {
            newTr.steps.forEach(step => {
                tr.step(step);
                map.appendMap(step.getMap());
            });
        });
    }
    else {
        const end = map.map(nodePos + node.nodeSize);
        delStep = new ReplaceAroundStep(newNodePos, end, newNodePos + 1, end - 1, Slice.empty, 0, true);
    }
    if (delStep) {
        const result = tr.maybeStep(delStep);
        if (!result.failed) {
            map.appendMap(delStep.getMap());
            // The merge step can succeed as a near-no-op (e.g. across an
            // isolating parent boundary) while the tracked node survives
            // with its track entry — accepting would then never do
            // anything, on any number of clicks. Its exact position may
            // have shifted unpredictably, so look for a node of the same
            // type carrying the same track entry near the mapped position.
            const mappedPos = map.map(nodePos, -1);
            const trackSignature = JSON.stringify(node.attrs.track?.filter(track => track.type === trackType));
            let stuck = null;
            tr.doc.nodesBetween(Math.max(0, mappedPos - node.nodeSize - 6), Math.min(tr.doc.content.size, mappedPos + node.nodeSize + 6), (candidate, pos) => {
                if (stuck) {
                    return false;
                }
                const candidateTrack = candidate.attrs.track;
                if (candidate.type === node.type &&
                    candidateTrack?.some(track => track.type === trackType) &&
                    JSON.stringify(candidateTrack.filter(track => track.type === trackType)) === trackSignature) {
                    stuck = { pos, node: candidate };
                    return false;
                }
                return true;
            });
            const stuckNode = stuck;
            if (stuckNode) {
                const removal = new ReplaceStep(stuckNode.pos, stuckNode.pos + stuckNode.node.nodeSize, Slice.empty);
                const removalResult = tr.maybeStep(removal);
                if (!removalResult.failed) {
                    map.appendMap(removal.getMap());
                    return;
                }
                // The parent cannot lose the block (e.g. content "block+"):
                // keep the structure valid with an empty paragraph.
                const paragraph = tr.doc.type.schema.nodes.paragraph;
                const fill = paragraph && paragraph.createAndFill();
                if (fill) {
                    const fallbackStep = new ReplaceStep(stuckNode.pos, stuckNode.pos + stuckNode.node.nodeSize, new Slice(Fragment.from(fill), 0, 0));
                    const fallbackResult = tr.maybeStep(fallbackStep);
                    if (!fallbackResult.failed) {
                        map.appendMap(fallbackStep.getMap());
                    }
                }
            }
            return;
        }
        // Deleting a block can leave its parent (e.g. a richtext_part with
        // content "block+") below its minimum child count, which fails the
        // step and would abort the whole accept/reject run. Keep the
        // structure valid by replacing the node with an empty paragraph.
        const paragraph = tr.doc.type.schema.nodes.paragraph;
        const fill = paragraph && paragraph.createAndFill();
        if (fill) {
            const fallbackStep = new ReplaceStep(newNodePos, map.map(nodePos + node.nodeSize), new Slice(Fragment.from(fill), 0, 0));
            const fallbackResult = tr.maybeStep(fallbackStep);
            if (!fallbackResult.failed) {
                map.appendMap(fallbackStep.getMap());
                return;
            }
        }
        // Neither step fits (the parent forbids paragraphs): keep the node
        // and only strip the track entry instead of aborting the run.
        const current = tr.doc.nodeAt(newNodePos);
        if (current && current.type === node.type) {
            const track = node.attrs.track.filter(track => track.type !== trackType);
            tr.setNodeMarkup(newNodePos, null, Object.assign({}, current.attrs, { track }), current.marks);
        }
    }
    // The merge step can succeed without actually removing the tracked
    // node (the preceding textblock absorbs only part of the range). If
    // the node is still there with the track entry, strip the entry —
    // otherwise accepting or rejecting never converges.
    const remaining = tr.doc.nodeAt(map.map(nodePos));
    if (remaining &&
        remaining.type === node.type &&
        remaining.attrs.track?.some(track => track.type === trackType)) {
        const filtered = remaining.attrs.track.filter(track => track.type !== trackType);
        tr.setNodeMarkup(map.map(nodePos), null, Object.assign({}, remaining.attrs, { track: filtered }), remaining.marks);
    }
};
//# sourceMappingURL=delete.js.map