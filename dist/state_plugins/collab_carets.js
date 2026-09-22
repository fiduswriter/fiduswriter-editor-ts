import { sendableSteps } from "prosemirror-collab";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
const key = new PluginKey("collabCarets");
export const getSelectionUpdate = (state) => {
    const pluginState = key.getState(state);
    return pluginState?.caretUpdate || false;
};
export const updateCollaboratorSelection = (state, collaborator, data) => {
    const pluginState = key.getState(state);
    if (!pluginState) {
        return state.tr.setMeta(key, { decos: DecorationSet.empty, caretPositions: [], caretUpdate: false });
    }
    let { decos, caretPositions } = pluginState;
    const oldCarPos = caretPositions.find(carPos => carPos.sessionId === data.session_id);
    if (oldCarPos) {
        caretPositions = caretPositions.filter(carPos => carPos !== oldCarPos);
        const removeDecos = decos
            .find()
            .filter(deco => deco.spec === oldCarPos.decoSpec);
        decos = decos.remove(removeDecos);
    }
    const widgetDom = document.createElement("div");
    const className = `user-${collaborator.id}`;
    widgetDom.classList.add("caret");
    widgetDom.classList.add(className);
    widgetDom.innerHTML = '<div class="caret-head"></div>';
    widgetDom.firstChild.classList.add(className);
    const tooltip = collaborator.name;
    widgetDom.title = tooltip;
    widgetDom.firstChild.title = tooltip;
    const decoSpec = { id: data.session_id }; // We will compare the decoSpec object. Id not really needed.
    const newCarPos = {
        sessionId: data.session_id,
        userId: collaborator.id,
        decoSpec,
        anchor: data.anchor,
        head: data.head
    };
    caretPositions.push(newCarPos);
    const widgetDeco = Decoration.widget(data.head, widgetDom, decoSpec), addDecos = [widgetDeco];
    if (data.anchor !== data.head) {
        const from = data.head > data.anchor ? data.anchor : data.head, to = data.anchor > data.head ? data.anchor : data.head, inlineDeco = Decoration.inline(from, to, {
            class: `user-bg-${collaborator.id}`
        }, decoSpec);
        addDecos.push(inlineDeco);
    }
    decos = decos.add(state.doc, addDecos);
    const tr = state.tr.setMeta(key, {
        decos,
        caretPositions,
        caretUpdate: false
    });
    return tr;
};
export const removeCollaboratorSelection = (state, data) => {
    const pluginState = key.getState(state);
    if (!pluginState) {
        return false;
    }
    let { decos, caretPositions } = pluginState;
    const caretPosition = caretPositions.find(carPos => carPos.sessionId === data.session_id);
    if (caretPosition) {
        caretPositions = caretPositions.filter(carPos => carPos !== caretPosition);
        const removeDecos = decos
            .find()
            .filter(deco => deco.spec === caretPosition.decoSpec);
        decos = decos.remove(removeDecos);
        const tr = state.tr.setMeta(key, {
            decos,
            caretPositions,
            caretUpdate: false
        });
        return tr;
    }
    return false;
};
export const collabCaretsPlugin = (_options) => new Plugin({
    key,
    state: {
        init() {
            return {
                caretPositions: [],
                decos: DecorationSet.empty,
                caretUpdate: false
            };
        },
        apply(tr, _prev, oldState, state) {
            const meta = tr.getMeta(key);
            if (meta) {
                // There has been an update, return values from meta instead
                // of previous values
                return meta;
            }
            const pluginState = key.getState(oldState);
            if (!pluginState) {
                return { decos: DecorationSet.empty, caretPositions: [], caretUpdate: false };
            }
            let { decos, caretPositions } = pluginState, caretUpdate = false;
            decos = decos.map(tr.mapping, tr.doc, {
                onRemove: decoSpec => {
                    caretPositions = caretPositions.filter(carPos => carPos.decoSpec !== decoSpec);
                }
            });
            const sendable = sendableSteps(state);
            if (sendable) {
                const steps = sendable.steps;
                const step = steps[steps.length - 1];
                if (step &&
                    typeof step === "object" &&
                    "clientID" in step) {
                    // There is a local selection update. Send it to collaborators.
                    caretUpdate = {
                        anchor: state.selection.anchor,
                        head: state.selection.head
                    };
                }
            }
            return {
                decos,
                caretPositions,
                caretUpdate
            };
        }
    },
    props: {
        decorations(state) {
            const pluginState = this.getState(state);
            return pluginState.decos;
        }
    }
});
//# sourceMappingURL=collab_carets.js.map