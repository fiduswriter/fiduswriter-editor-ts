import fixUTF8 from "fix-utf8";
import { Fragment, Slice } from "prosemirror-model";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { ReplaceStep } from "prosemirror-transform";
import { docClipboardSerializer, fnClipboardSerializer } from "../clipboard/copy/index.js";
import { HTMLPaste, TextPaste } from "../clipboard/paste/index.js";
import { getAllowedElementsAndMarks } from "./document_template.js";
const key = new PluginKey("clipboard");
export const getPasteRange = (state) => {
    const pluginState = key.getState(state);
    return pluginState.pasteRange;
};
export const resetPasteRange = (tr) => {
    tr.setMeta(key, { pasteRange: null });
};
// Document section nodes. When content is copied from within the same editor,
// prosemirror-view records these in the data-pm-slice attribute of the
// clipboard HTML and wraps the pasted content in them again while parsing it.
const sectionNodeTypes = new Set([
    "richtext_part",
    "heading_part",
    "table_part",
    "contributors_part",
    "tags_part",
    "table_of_contents",
    "separator_part"
]);
// Remove a section node wrapper from pasted content when it corresponds to an
// ancestor node at the paste position. Content copied within the same document
// arrives wrapped in such a wrapper. If it was not removed, the wrapper would
// be treated like foreign content and be flattened during filtering below,
// losing the structure and formatting of the copied content.
const unwrapSectionWrapper = (slice, $pos) => {
    let { content, openStart, openEnd } = slice;
    // The outermost wrapper node corresponds to this ancestor of the position.
    let wrapperDepth = $pos.depth - openStart + 1;
    while (openStart > 0 &&
        openEnd > 0 &&
        wrapperDepth >= 1 &&
        wrapperDepth <= $pos.depth &&
        content.childCount === 1 &&
        sectionNodeTypes.has(content.firstChild.type.name) &&
        content.firstChild.type.name === $pos.node(wrapperDepth).type.name) {
        content = content.firstChild.content;
        openStart -= 1;
        openEnd -= 1;
        wrapperDepth += 1;
    }
    return new Slice(content, openStart, openEnd);
};
// The number of node levels that are actually traversable openly at one side
// of a fragment, limited to maxDepth. Filtering removes nodes from slices,
// which can make their openStart/openEnd exceed the nesting depth of the
// remaining content. Slices violating that constraint crash ProseMirror's
// Selection.replace (it walks into non-existing child nodes when calculating
// the insertion end position), so the open depths have to be reduced to fit.
const openChainDepth = (fragment, maxDepth, side) => {
    let depth = 0;
    let node = side === "start" ? fragment.firstChild : fragment.lastChild;
    while (node &&
        !node.isLeaf &&
        !node.type.spec.isolating &&
        depth < maxDepth) {
        depth += 1;
        node = side === "start" ? node.firstChild : node.lastChild;
    }
    return depth;
};
// Filter a fragment to only include allowed nodes and marks
// parentNode is optional - used to check if converted nodes are valid children
const filterFragment = (fragment, allowedElements, allowedMarks, schema, parentNode = null) => {
    const nodes = [];
    fragment.forEach(node => {
        // Check if this node type is allowed
        const nodeTypeAllowed = !allowedElements || allowedElements.includes(node.type.name);
        if (!nodeTypeAllowed) {
            // Try to convert to paragraph if allowed
            if (allowedElements &&
                allowedElements.includes("paragraph") &&
                node.isBlock) {
                const paragraph = schema.nodes.paragraph;
                if (paragraph) {
                    // Check if paragraph can be a child of the parent node
                    const canUseParagraph = !parentNode ||
                        parentNode.type.contentMatch.matchType(paragraph);
                    if (canUseParagraph) {
                        // Convert the node to a paragraph, recursively filtering its content
                        const filteredContent = node.content.size > 0
                            ? filterFragment(node.content, allowedElements, allowedMarks, schema, node)
                            : Fragment.empty;
                        nodes.push(paragraph.create(null, filteredContent));
                    }
                    else if (parentNode && parentNode.isTextblock) {
                        // Parent is a text block but doesn't allow paragraphs
                        // Extract text content and add as plain text
                        const textContent = node.textContent;
                        if (textContent) {
                            nodes.push(schema.text(textContent));
                        }
                    }
                    else {
                        // Can't convert to paragraph, extract and process children
                        const filteredContent = filterFragment(node.content, allowedElements, allowedMarks, schema, parentNode);
                        filteredContent.forEach(child => nodes.push(child));
                    }
                }
            }
            else if (node.isBlock) {
                // Extract content from disallowed block nodes
                const filteredContent = filterFragment(node.content, allowedElements, allowedMarks, schema, parentNode);
                filteredContent.forEach(child => nodes.push(child));
            }
            else {
                // For inline nodes, just skip them
            }
            return;
        }
        // Node type is allowed, but filter marks
        let filteredNode = node;
        if (allowedMarks !== false && node.marks.length > 0) {
            const filteredMarks = node.marks.filter(mark => allowedMarks.includes(mark.type.name));
            if (filteredMarks.length !== node.marks.length) {
                filteredNode = node.mark(filteredMarks);
            }
        }
        // Recursively filter content
        if (filteredNode.content.size > 0) {
            const filteredContent = filterFragment(filteredNode.content, allowedElements, allowedMarks, schema, filteredNode);
            filteredNode = filteredNode.copy(filteredContent);
        }
        nodes.push(filteredNode);
    });
    return Fragment.from(nodes);
};
export const clipboardPlugin = (options) => {
    let shiftPressed = false;
    return new Plugin({
        key,
        state: {
            init() {
                return {
                    pasteRange: null
                };
            },
            apply(tr, _prev, oldState) {
                const meta = tr.getMeta(key);
                if (meta) {
                    // There has been an update, return values from meta instead
                    // of previous values
                    return meta;
                }
                const uiEventMeta = tr.getMeta("uiEvent");
                let pasteRange;
                if (uiEventMeta && ["paste", "drop"].includes(uiEventMeta)) {
                    pasteRange = [
                        oldState.selection.from,
                        oldState.selection.to
                    ];
                    tr.steps.forEach(step => {
                        if (step instanceof ReplaceStep) {
                            // paste and drop TRs will usually just consist of a single ReplaceStep
                            pasteRange = [step.from, step.to];
                        }
                        const stepMap = step.getMap();
                        pasteRange = [
                            stepMap.map(pasteRange[0], -1),
                            stepMap.map(pasteRange[1], 1)
                        ]; // map through step
                    });
                }
                else {
                    pasteRange = key.getState(oldState)?.pasteRange;
                    if (pasteRange && tr.docChanged) {
                        const from = tr.mapping.mapResult(pasteRange[0], -1);
                        const to = tr.mapping.mapResult(pasteRange[1], 1);
                        if (from.deleted || to.deleted) {
                            pasteRange = null;
                        }
                        else {
                            pasteRange = [from.pos, to.pos];
                        }
                    }
                }
                return {
                    pasteRange
                };
            }
        },
        props: {
            handleKeyDown: (_view, event) => {
                shiftPressed = event.shiftKey;
                return false;
            },
            handleDrop: (view, event, slice, moved) => {
                shiftPressed = event.shiftKey;
                if (moved || (slice && slice.size)) {
                    return false; // Something other than en empty plain text string from outside. Handled by PM already.
                }
                const eventPos = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY
                });
                if (!eventPos) {
                    return false;
                }
                const $mouse = view.state.doc.resolve(eventPos.pos);
                if (!$mouse) {
                    return false;
                }
                const tr = view.state.tr;
                tr.setSelection(new TextSelection($mouse));
                view.dispatch(tr);
                return true;
            },
            transformPastedHTML: (inHTML, view) => {
                const pluginState = key.getState(view.state);
                const { pasteRange } = pluginState;
                if (pasteRange) {
                    // a previous paste operation has been interrupted by a new one. Cancel.
                    return "";
                }
                if (shiftPressed) {
                    return inHTML;
                }
                const ph = new HTMLPaste(options.editor, inHTML, options.viewType, view);
                return ph.getOutput();
            },
            transformPastedText: (inText, _plain, view) => {
                const pluginState = key.getState(view.state);
                const { pasteRange } = pluginState;
                if (pasteRange) {
                    // a previous paste operation has been interrupted by a new one. Cancel.
                    return "";
                }
                if (shiftPressed) {
                    return inText;
                }
                // Chrome on Linux has an encoding problem:
                // it recognizes UTF as Windows 1252. Bug has been filed. This is a temp
                // solution for western European languages.
                // https://bugs.chromium.org/p/chromium/issues/detail?id=760613
                const fixedText = fixUTF8(inText);
                const ph = new TextPaste(options.editor, fixedText, options.editor.currentView);
                ph.init();
                return fixedText; // We need to analyze it asynchronously, so we always need to turn this into an empty string for now.
            },
            clipboardSerializer: (options.viewType === "main"
                ? docClipboardSerializer(options.editor)
                : fnClipboardSerializer(options.editor)),
            transformPasted: (slice, view, plain) => {
                // Only filter if not plain text paste
                if (plain) {
                    return slice;
                }
                const $pos = view.state.selection.$from;
                // Content copied within the same editor arrives wrapped in a
                // section node corresponding to an ancestor of the paste
                // position. Unwrap it so that it is handled like other pasted
                // content rather than being flattened during filtering.
                slice = unwrapSectionWrapper(slice, $pos);
                // Get allowed elements and marks at the current selection position
                const { elements, marks } = getAllowedElementsAndMarks(view.state);
                // If no restrictions, return slice unchanged
                if (elements === false && marks === false) {
                    return slice;
                }
                // Get the parent node at the selection position to check compatibility
                const parentNode = $pos.parent;
                // Filter the slice content
                const filteredContent = filterFragment(slice.content, elements, marks, view.state.schema, parentNode);
                // All content may have been removed by the filtering.
                if (!filteredContent.size) {
                    return Slice.empty;
                }
                // Return a new slice with the filtered content. Reduce the
                // open depths to what the filtered content can actually
                // provide, so that the slice remains insertable.
                return new Slice(filteredContent, Math.min(slice.openStart, openChainDepth(filteredContent, slice.openStart, "start")), Math.min(slice.openEnd, openChainDepth(filteredContent, slice.openEnd, "end")));
            }
        }
    });
};
//# sourceMappingURL=clipboard.js.map