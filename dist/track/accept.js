import { AddMarkStep, Mapping, RemoveMarkStep } from "prosemirror-transform";
import { deactivateAllSelectedChanges } from "../state_plugins/track/index.js";
import { deleteNode } from "./delete.js";
export const accept = (type, pos, view) => {
    const tr = view.state.tr.setMeta("track", true), map = new Mapping();
    let reachedEnd = false;
    const nodeAtPos = view.state.doc.nodeAt(pos);
    if (!nodeAtPos) {
        return;
    }
    const trackMark = nodeAtPos.marks.find(mark => mark.type.name === type);
    // Block level track changes are stored in the node's track attribute
    // rather than in marks (figures, tables, text blocks).
    const blockTrack = nodeAtPos.attrs.track?.find(track => track.type === type);
    if (!trackMark && !blockTrack) {
        return;
    }
    view.state.doc.nodesBetween(pos, view.state.doc.nodeSize - 2, (node, nodePos) => {
        if (nodePos < pos) {
            return true;
        }
        if (reachedEnd) {
            return false;
        }
        if (!node.isInline) {
            reachedEnd = true;
        }
        else if (trackMark &&
            !trackMark.isInSet(node.marks) &&
            !node.attrs.track?.some(track => track.type === type)) {
            reachedEnd = true;
            return false;
        }
        // Traverse only those nodes which have the track marks or
        // corresponding block level track entries.
        if (node.attrs.track?.some(track => track.type === type) ||
            (trackMark && trackMark.isInSet(node.marks))) {
            if (type === "deletion") {
                deleteNode(tr, node, nodePos, map, true);
            }
            else if (type === "insertion") {
                if (node.attrs.track) {
                    const track = node.attrs.track.filter(track => track.type !== "insertion");
                    if (node.attrs.track.length === track.length) {
                        return true;
                    }
                    tr.setNodeMarkup(map.map(nodePos), null, Object.assign({}, node.attrs, { track }), node.marks);
                    // Special case: first paragraph in list item by same user -- will also be accepted.
                    if (node.type.name === "list_item" &&
                        node.child(0) &&
                        node.child(0).type.name === "paragraph") {
                        reachedEnd = false;
                    }
                }
                else {
                    // The gate above guarantees the insertion mark is set
                    // on nodes without a track attribute.
                    if (!trackMark) {
                        return true;
                    }
                    tr.step(new AddMarkStep(map.map(nodePos), map.map(nodePos + node.nodeSize), view.state.schema.marks.insertion.create(Object.assign({}, trackMark.attrs, {
                        approved: true
                    }))));
                }
            }
            else if (type === "format_change") {
                // format_change only exists as a mark, so trackMark is
                // guaranteed to be set here (the guard above would have
                // returned otherwise).
                if (!trackMark) {
                    return;
                }
                tr.step(new RemoveMarkStep(map.map(nodePos), map.map(nodePos + node.nodeSize), trackMark));
            }
            else if (type === "block_change") {
                const track = node.attrs.track.filter(track => track.type !== "block_change");
                tr.setNodeMarkup(map.map(nodePos), null, Object.assign({}, node.attrs, { track }), node.marks);
            }
            return true;
        }
        return true;
    });
    deactivateAllSelectedChanges(tr);
    if (tr.steps.length) {
        view.dispatch(tr);
    }
};
//# sourceMappingURL=accept.js.map