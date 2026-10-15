import { Slice } from "prosemirror-model";
import { AddMarkStep, Mapping, RemoveMarkStep, ReplaceStep } from "prosemirror-transform";
import { deactivateAllSelectedChanges } from "../state_plugins/track/index.js";
import { deleteNode } from "./delete.js";
// True while the document still holds entries this function handles. A
// deletion can merge or remove nodes later in the walk whose track entries
// then escape the single pass (their mapped positions no longer point at
// the node); iterating clears any leftovers.
const hasHandledEntries = (doc, from, to) => {
    let found = false;
    doc.nodesBetween(from, to, (node) => {
        if (found) {
            return false;
        }
        if (node.attrs.track?.some(track => ["deletion", "insertion", "block_change"].includes(track.type))) {
            found = true;
            return false;
        }
        if (node.marks?.some(mark => mark.type.name === "deletion" ||
            mark.type.name === "format_change" ||
            (mark.type.name === "insertion" && !mark.attrs.approved))) {
            found = true;
            return false;
        }
        return true;
    });
    return found;
};
export const acceptAll = (view, from = 0, to = false, pass = 0) => {
    if (!to) {
        to = view.state.doc.content.size;
    }
    const tr = view.state.tr.setMeta("track", true), map = new Mapping();
    view.state.doc.nodesBetween(from, to, (node, pos) => {
        if (pos < from && !node.isInline) {
            return true;
        }
        let deletedNode = false;
        if (node.attrs.track?.find(track => track.type === "deletion")) {
            deleteNode(tr, node, pos, map, true);
            deletedNode = true;
        }
        else if (node.marks?.find(mark => mark.type.name === "deletion")) {
            const delStep = new ReplaceStep(map.map(Math.max(pos, from)), map.map(Math.min(pos + node.nodeSize, to)), Slice.empty);
            tr.step(delStep);
            map.appendMap(delStep.getMap());
            deletedNode = true;
        }
        else if (node.attrs.track?.find(track => track.type === "insertion")) {
            const track = node.attrs.track.filter(track => track.type !== "insertion");
            const mappedPos = map.map(pos);
            // Earlier deletion steps in this run can have removed or merged
            // the node this decision was made on. Only retag it while it
            // still exists at the mapped position.
            const current = tr.doc.nodeAt(mappedPos);
            if (current && current.type === node.type) {
                tr.setNodeMarkup(mappedPos, null, Object.assign({}, current.attrs, { track }), current.marks);
            }
        }
        else if (node.marks?.find(mark => mark.type.name === "insertion" && !mark.attrs.approved)) {
            const mark = node.marks.find(mark => mark.type.name === "insertion"), attrs = Object.assign({}, mark?.attrs, { approved: true });
            tr.step(new AddMarkStep(map.map(Math.max(pos, from)), map.map(Math.min(pos + node.nodeSize, to)), view.state.schema.marks.insertion.create(attrs)));
        }
        const formatChangeMark = node.marks.find(mark => mark.type.name === "format_change");
        if (node.isInline && !deletedNode && formatChangeMark) {
            tr.step(new RemoveMarkStep(map.map(Math.max(pos, from)), map.map(Math.min(pos + node.nodeSize, to)), formatChangeMark));
        }
        if (!node.isInline && !deletedNode && node.attrs.track) {
            const blockChangeTrack = node.attrs.track.find(track => track.type === "block_change");
            if (blockChangeTrack) {
                const track = node.attrs.track.filter(track => track !== blockChangeTrack);
                const mappedPos = map.map(pos);
                const current = tr.doc.nodeAt(mappedPos);
                if (current && current.type === node.type) {
                    tr.setNodeMarkup(mappedPos, null, Object.assign({}, current.attrs, { track }), current.marks);
                }
            }
        }
        return true;
    });
    deactivateAllSelectedChanges(tr);
    if (tr.steps.length) {
        view.dispatch(tr);
        // The pass may have shrunk the document; clamp the range before
        // checking for (and clearing) leftover entries in a second pass.
        const docSize = view.state.doc.content.size;
        const end = to === false
            ? docSize
            : Math.min(to, docSize);
        // A pass can leave entries it could not clear (a merge step that
        // no-ops); iterating usually converges in one or two extra passes,
        // but the bound guarantees termination.
        if (pass < 10 &&
            end >= from &&
            hasHandledEntries(view.state.doc, from, end)) {
            acceptAll(view, from, end, pass + 1);
        }
    }
};
//# sourceMappingURL=accept_all.js.map