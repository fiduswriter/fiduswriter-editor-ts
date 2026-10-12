// Fuzz harness for the offline-merge machinery:
//  * recreate_transform.ts (vendored prosemirror-recreate-steps): turning two
//    document versions into a step list — pure position/JSON arithmetic.
//  * no_collab_save/merge.ts: getRemoteSteps (covering-step exactness check +
//    recreate fallback), createRemoteTransaction (rebase of unconfirmed local
//    steps over remote steps), createConfirmTransaction.
//
// Invariants:
//  1. recreateTransform(fromDoc, toDoc) applied to fromDoc yields toDoc —
//     for related documents (doc + random edits) and for unrelated random
//     documents.
//  2. The recreated steps survive JSON round-tripping (the server stores
//     them as `m` covering steps).
//  3. getRemoteSteps prefers exact covering steps and falls back to
//     recreation for garbage `m`; both paths must land exactly on serverDoc.
//  4. Rebase swap symmetry: with disjoint local edits, merging A into B
//     gives the same document as merging B into A.

import "../setup.js"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {ModCollabDoc} from "../../dist/collab/doc.js"
import {
    createRemoteTransaction,
    createConfirmTransaction,
    getRemoteSteps
} from "../../dist/no_collab_save/merge.js"
import {recreateTransform} from "../../dist/collab/merge/recreate_transform.js"
import {collab, sendableSteps} from "prosemirror-collab"
import {EditorState} from "prosemirror-state"
import {Step as stepCtor, Transform} from "prosemirror-transform"

import {fc, runHarness} from "./config.js"
import {docArb, makeRng} from "./doc-generator.js"
import {
    makeFakeEditor,
    destroyFakeEditor,
    attachCollabDoc
} from "./fake-editor.js"
import {randomEdit} from "./edits.js"

function applyStepsJson(fromDoc, stepJsons, context) {
    const tr = new Transform(fromDoc)
    for (const json of stepJsons) {
        tr.step(stepCtor.fromJSON(docSchema, json))
    }
    try {
        tr.doc.check()
    } catch (error) {
        error.message = `invalid doc after ${context}: ${error.message}`
        throw error
    }
    return tr.doc
}

function jsonEq(a, b) {
    return JSON.stringify(a) === JSON.stringify(b)
}

// Produce a related (fromDoc, toDoc) pair: toDoc = fromDoc + random edits,
// together with the exact step JSONs and client id, usable as covering
// messages.
function relatedDocs(fcArb, baseSeed, editCount) {
    const {doc: baseDoc} = fc.sample(docArb(fcArb), {
        seed: baseSeed,
        numRuns: 1
    })[0]
    const rng = makeRng(baseSeed ^ (editCount * 6151))
    const state = EditorState.create({
        doc: baseDoc,
        plugins: [collab({clientID: "editor-x"})]
    })
    const stepJsons = []
    for (let i = 0; i < editCount; i++) {
        const edit = randomEdit(state, rng.int(1, 2 ** 31 - 1))
        if (!edit) {
            continue
        }
        state.apply(edit.tr)
        edit.tr.steps.forEach(step => stepJsons.push(step.toJSON()))
    }
    return {baseDoc, toDoc: state.doc, stepJsons}
}

// --- Property 1: recreateTransform lands exactly on the target doc ----------

const recreateRelatedProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 4}),
    (baseSeed, editCount) => {
        const {baseDoc, toDoc, stepJsons} = relatedDocs(fc, baseSeed, editCount)
        if (!stepJsons.length) {
            return
        }
        const recreated = recreateTransform(baseDoc, toDoc)
        try {
            recreated.doc.check()
        } catch (error) {
            error.message = `recreateTransform produced an invalid doc: ${error.message}`
            throw error
        }
        if (!jsonEq(recreated.doc.toJSON(), toDoc.toJSON())) {
            throw new Error(
                `recreateTransform did not reach target doc (related docs, ${stepJsons.length} source steps):\n--- target ---\n${JSON.stringify(toDoc.toJSON()).slice(0, 1500)}\n--- recreated ---\n${JSON.stringify(recreated.doc.toJSON()).slice(0, 1500)}`
            )
        }
        // The recreated steps must survive JSON round-tripping.
        const jsons = recreated.steps.map(step => step.toJSON())
        const roundTripped = applyStepsJson(
            baseDoc,
            JSON.parse(JSON.stringify(jsons)),
            "JSON round-trip of recreated steps"
        )
        if (!jsonEq(roundTripped.toJSON(), toDoc.toJSON())) {
            throw new Error(
                "recreated steps changed meaning after JSON round-trip"
            )
        }
    }
)

// --- Property 2: recreateTransform between unrelated documents --------------

const recreateUnrelatedProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    (seedA, seedB) => {
        const {doc: docA} = fc.sample(docArb(fc), {seed: seedA, numRuns: 1})[0]
        const {doc: docB} = fc.sample(docArb(fc), {seed: seedB, numRuns: 1})[0]
        const recreated = recreateTransform(docA, docB)
        try {
            recreated.doc.check()
        } catch (error) {
            error.message = `recreateTransform produced an invalid doc: ${error.message}`
            throw error
        }
        if (!jsonEq(recreated.doc.toJSON(), docB.toJSON())) {
            throw new Error(
                `recreateTransform did not reach target doc (unrelated docs):\n--- target ---\n${JSON.stringify(docB.toJSON()).slice(0, 1500)}\n--- recreated ---\n${JSON.stringify(recreated.doc.toJSON()).slice(0, 1500)}`
            )
        }
    }
)

// --- Property 3: getRemoteSteps covering-step exactness and fallback --------

const coveringStepsProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 3}),
    fc.integer({min: 0, max: 2}),
    (baseSeed, editCount, corruption) => {
        const {baseDoc, toDoc, stepJsons} = relatedDocs(fc, baseSeed, editCount)
        if (!stepJsons.length) {
            return
        }
        const m = [{ds: stepJsons, cid: "remote-x"}]

        // Exact path: intact covering steps must replay to serverDoc.
        const exact = getRemoteSteps(docSchema, baseDoc, toDoc, m)
        const exactDoc = applyStepsJson(
            baseDoc,
            exact.steps.map(step => step.toJSON()),
            "exact covering steps"
        )
        if (!jsonEq(exactDoc.toJSON(), toDoc.toJSON())) {
            throw new Error("intact covering steps did not replay to serverDoc")
        }

        // Corrupted path: garbage `m` must fall back to recreation and
        // still land exactly on serverDoc.
        const rng = makeRng(baseSeed ^ corruption)
        const corrupted = {ds: [...stepJsons], cid: "remote-x"}
        if (corruption === 0) {
            corrupted.ds = [{stepType: "bogus"}]
        } else if (corruption === 1) {
            // valid-looking steps that do not reach the server doc
            corrupted.ds = stepJsons.slice(0, Math.max(1, stepJsons.length - 1))
        } else {
            corrupted.ds = stepJsons.map(json => ({
                ...json,
                from: rng.pick([-10, 1e9, "x"])
            }))
        }
        const fallback = getRemoteSteps(docSchema, baseDoc, toDoc, [corrupted])
        const fallbackDoc = applyStepsJson(
            baseDoc,
            fallback.steps.map(step => step.toJSON()),
            "recreated fallback steps"
        )
        if (!jsonEq(fallbackDoc.toJSON(), toDoc.toJSON())) {
            throw new Error(
                "fallback recreation after corrupted covering steps did not reach serverDoc"
            )
        }
    }
)

// --- Property 4: rebase swap symmetry with disjoint edits -------------------

function partRanges(doc) {
    const ranges = []
    doc.forEach((node, offset) => {
        if (node.type.name === "richtext_part") {
            ranges.push({from: offset + 1, to: offset + node.content.size})
        }
    })
    return ranges
}

function makeCollabClient(baseDoc, clientID) {
    const editor = makeFakeEditor({doc: baseDoc, clientID})
    const mod = {editor}
    const doc = new ModCollabDoc(mod)
    attachCollabDoc(editor, doc)
    return {editor, mod, doc}
}

const swapSymmetryProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    (baseSeed, editSeed) => {
        const {doc: baseDoc} = fc.sample(
            docArb(fc, {track: false, maxParts: 2}),
            {seed: baseSeed, numRuns: 1}
        )[0]
        const ranges = partRanges(baseDoc)
        if (ranges.length < 2) {
            return
        }
        // Client A edits part 0, client B edits part 1 — both starting from
        // baseDoc, then B merges A's saved document and A merges B's.
        const clientA = makeCollabClient(baseDoc, "client-a")
        const clientB = makeCollabClient(baseDoc, "client-b")
        try {
            const rng = makeRng(editSeed)
            const aEdit = randomEdit(
                clientA.editor.view.state,
                rng.int(1, 2 ** 31 - 1),
                {
                    bounds: ranges[0]
                }
            )
            const bEdit = randomEdit(
                clientB.editor.view.state,
                rng.int(1, 2 ** 31 - 1),
                {
                    bounds: ranges[1]
                }
            )
            if (!aEdit || !bEdit) {
                return
            }
            clientA.editor.view.dispatch(aEdit.tr)
            clientB.editor.view.dispatch(bEdit.tr)

            // Capture both clients' original steps (based on baseDoc) before
            // any merge — the symmetric "what each client saved" payloads.
            const aStepJsons = sendableSteps(
                clientA.editor.view.state
            ).steps.map(step => step.toJSON())
            const bStepJsons = sendableSteps(
                clientB.editor.view.state
            ).steps.map(step => step.toJSON())

            const serverDocA = applyStepsJson(
                baseDoc,
                aStepJsons,
                "server application of A's steps"
            )
            const serverDocB = applyStepsJson(
                baseDoc,
                bStepJsons,
                "server application of B's steps"
            )

            // B merges A's saved document; A merges B's saved document.
            const remoteForB = getRemoteSteps(
                docSchema,
                baseDoc,
                serverDocA,
                aStepJsons.map(json => ({ds: [json], cid: "client-a"}))
            )
            clientB.editor.view.dispatch(
                createRemoteTransaction(
                    clientB.editor.view.state,
                    remoteForB.steps,
                    remoteForB.clientIds
                )
            )
            try {
                clientB.editor.view.state.doc.check()
            } catch (error) {
                error.message = `invalid doc after B merged A: ${error.message}`
                throw error
            }

            const remoteForA = getRemoteSteps(
                docSchema,
                baseDoc,
                serverDocB,
                bStepJsons.map(json => ({ds: [json], cid: "client-b"}))
            )
            clientA.editor.view.dispatch(
                createRemoteTransaction(
                    clientA.editor.view.state,
                    remoteForA.steps,
                    remoteForA.clientIds
                )
            )
            try {
                clientA.editor.view.state.doc.check()
            } catch (error) {
                error.message = `invalid doc after A merged B: ${error.message}`
                throw error
            }

            const docA = clientA.editor.view.state.doc
            const docB = clientB.editor.view.state.doc
            // doc.eq() is the editor's own document equality (used e.g. by
            // getRemoteSteps) — JSON.stringify can differ in attribute key
            // order for equal documents built through different paths.
            if (!docA.eq(docB)) {
                if (process.env.SWAP_DEBUG) {
                    console.log(
                        "DEBUG aEdit",
                        aEdit.label,
                        "bEdit",
                        bEdit.label
                    )
                    console.log(
                        "DEBUG aSteps",
                        JSON.stringify(aStepJsons).slice(0, 400)
                    )
                    console.log(
                        "DEBUG bSteps",
                        JSON.stringify(bStepJsons).slice(0, 400)
                    )
                    const max = Math.max(docA.childCount, docB.childCount)
                    for (let i = 0; i < max; i++) {
                        const a = docA.child(i)
                        const b = docB.maybeChild(i)
                        if (!b || !a.eq(b)) {
                            console.log(
                                "DEBUG DIFF child",
                                i,
                                a.type.name,
                                b ? b.type.name : "missing"
                            )
                            console.log(
                                "DEBUG A:",
                                JSON.stringify(a.toJSON()).slice(0, 700)
                            )
                            console.log(
                                "DEBUG B:",
                                b
                                    ? JSON.stringify(b.toJSON()).slice(0, 700)
                                    : "missing"
                            )
                            break
                        }
                    }
                    console.log(
                        "DEBUG A text:",
                        JSON.stringify(docA.textContent)
                    )
                    console.log(
                        "DEBUG B text:",
                        JSON.stringify(docB.textContent)
                    )
                }
                throw new Error(
                    `swap symmetry violated:\n--- A (merged B) ---\n${JSON.stringify(docA.toJSON()).slice(0, 1500)}\n--- B (merged A) ---\n${JSON.stringify(docB.toJSON()).slice(0, 1500)}`
                )
            }

            // Confirming the exact saved steps clears the unconfirmed queue
            // (steps created during the save stay — here there are none).
            const remaining = sendableSteps(clientB.editor.view.state)
            if (remaining) {
                const confirmTr = createConfirmTransaction(
                    clientB.editor.view.state,
                    remaining.steps,
                    "client-b"
                )
                if (confirmTr) {
                    clientB.editor.view.dispatch(confirmTr)
                }
                if (sendableSteps(clientB.editor.view.state)) {
                    throw new Error(
                        "createConfirmTransaction left unconfirmed steps behind"
                    )
                }
            }
        } finally {
            destroyFakeEditor(clientA.editor)
            destroyFakeEditor(clientB.editor)
        }
    }
)

runHarness("recreate-merge", [
    {
        label: "recreateTransform related docs",
        prop: recreateRelatedProp
    },
    {
        label: "recreateTransform unrelated docs",
        prop: recreateUnrelatedProp
    },
    {
        label: "getRemoteSteps covering exactness + fallback",
        prop: coveringStepsProp
    },
    {label: "rebase swap symmetry", prop: swapSymmetryProp}
])
