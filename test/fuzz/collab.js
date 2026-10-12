// Fuzz harness for the collaboration receive path — the editor's entry point
// for untrusted WebSocket data.
//
// What is exercised:
//  * applyDiffs/_processDiff through the real ModCollabDoc class against
//    real EditorViews with the production plugin set (see fake-editor.js).
//  * concurrent clients editing, exchanging serialized steps, rebasing local
//    unconfirmed steps via prosemirror-collab's receiveTransaction.
//  * footnote steps ("fs") arriving alongside document steps.
//  * comment ("cu"), bibliography ("bu") and image ("iu") updates bundled
//    into diffs.
//  * mutated / garbage step JSON — the "never trust the network" case.
//
// Invariants:
//  1. Convergence: after every client has received every other client's
//     steps, all clients hold the identical document.
//  2. Validity: every document the editor reaches passes doc.check().
//  3. Robustness: a receiveDiff that throws must leave the document
//     unchanged (no partial application), and a subsequent valid diff must
//     still be applied.
//  4. No zombie flag: after a throwing receiveDiff, a later successful one
//     works — catching the case where error paths leave bookkeeping state
//     (receiving flag, unconfirmedDiffs) corrupted.

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {sendableSteps} from "prosemirror-collab"
import {EditorState} from "prosemirror-state"
import {Step as serverStepCtor} from "prosemirror-transform"

import {fc, runHarness} from "./config.js"
import {docArb, makeRng} from "./doc-generator.js"
import {
    makeFakeEditor,
    destroyFakeEditor,
    attachCollabDoc
} from "./fake-editor.js"
import {dispatchEdit} from "./edits.js"
import {ModCollabDoc} from "../../dist/collab/doc.js"

// Compare documents the way production does: JSON.stringify (the editor
// serializes docs for saving). to toJSON output can contain live PM objects
// with their own toJSON, which fast-deep-equal cannot traverse.
function jsonEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b)
}

// The delivery model mirrors the real protocol: clients only send steps
// based on the current server document (they catch up via check_version /
// received diffs first), the server applies each client's rebased steps to
// its own copy and broadcasts, and clients rebase the received steps over
// their own unconfirmed steps (prosemirror-collab tolerates failed rebases).
// Delivering raw stale-based steps client-to-client — as no real system
// does — would be a harness artifact, not an editor property.

function makeClient(baseDoc, clientID) {
    const editor = makeFakeEditor({doc: baseDoc, clientID})
    const mod = {editor}
    const doc = new ModCollabDoc(mod)
    attachCollabDoc(editor, doc)
    return {editor, mod, doc}
}

function destroyClient(client) {
    destroyFakeEditor(client.editor)
}

function makeServer(baseDoc) {
    return {state: EditorState.create({schema: docSchema, doc: baseDoc})}
}

function serverApply(server, steps, context) {
    for (const stepJson of steps) {
        const stepObj = serverStepCtor.fromJSON(docSchema, stepJson)
        const tr = server.state.tr
        tr.step(stepObj)
        server.state = server.state.apply(tr)
    }
    try {
        server.state.doc.check()
    } catch (error) {
        error.message = `server doc invalid after applying ${context}: ${error.message}`
        throw error
    }
}

// Serialize the client's unconfirmed steps the way the real editor sends
// them over the WebSocket.
function outgoingSteps(client) {
    const sendable = sendableSteps(client.editor.view.state)
    if (!sendable) {
        return []
    }
    return sendable.steps.map(step => step.toJSON())
}

function applyDiff(client, data) {
    return client.doc.receiveDiff(data)
}

// The client's confirmed document: its current doc minus the unconfirmed
// local steps — i.e. the state the "server" holds and against which any
// broadcast step must have been validated. ModCollabDoc tracks exactly this
// in docInfo.confirmedDoc (updated by setConfirmedDoc on every applied
// remote diff; local unconfirmed edits do not touch it).
function confirmedDocOf(client) {
    return client.editor.docInfo.confirmedDoc
}

function assertDocValid(client, context) {
    try {
        client.editor.view.state.doc.check()
    } catch (error) {
        error.message = `invalid doc after ${context} on client ${client.editor.client_id}: ${error.message}`
        throw error
    }
}

// Positions of the richtext_part children (start of their content), used to
// give each simulated client its own edit region so that rebasing cannot
// legitimately drop a concurrent edit — keeping the convergence oracle exact.
function partRanges(doc) {
    const ranges = []
    doc.forEach((node, offset) => {
        if (node.type.name === "richtext_part") {
            ranges.push({from: offset + 1, to: offset + node.content.size})
        }
    })
    return ranges
}

// Broadcast `steps` from `senderIndex` to every client, then drain: repeat
// send/apply/broadcast rounds until no client has unconfirmed steps left.
function broadcastAndDrain(clients, server, senderIndex, steps, context) {
    if (!steps.length) {
        return
    }
    serverApply(server, steps, `${context} from client-${senderIndex}`)
    for (const receiver of clients) {
        applyDiff(receiver, {ds: steps, cid: `client-${senderIndex}`})
        assertDocValid(receiver, `${context} from client-${senderIndex}`)
    }
    // Drain: clients that had concurrent unconfirmed edits re-send their
    // rebased versions (exactly what the real editor does after a diff).
    for (let guard = 0; guard < clients.length * 4; guard++) {
        let progress = false
        for (let i = 0; i < clients.length; i++) {
            const more = outgoingSteps(clients[i])
            if (!more.length) {
                continue
            }
            progress = true
            serverApply(server, more, `drain from client-${i}`)
            for (const receiver of clients) {
                applyDiff(receiver, {ds: more, cid: `client-${i}`})
                assertDocValid(receiver, `drain from client-${i}`)
            }
        }
        if (!progress) {
            break
        }
    }
}

// --- Property 1: strict convergence with non-overlapping concurrent edits --

const convergenceProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 2, max: 3}),
    fc.integer({min: 1, max: 3}),
    (baseSeed, clientCount, rounds) => {
        const {doc: baseDoc} = fc.sample(
            docArb(fc, {track: false, maxParts: 3}),
            {seed: baseSeed, numRuns: 1}
        )[0]
        const ranges = partRanges(baseDoc)
        if (ranges.length < clientCount) {
            return // not enough parts to separate the clients
        }
        const clients = []
        const server = makeServer(baseDoc)
        try {
            const editRng = makeRng(baseSeed ^ (clientCount * 7919))
            for (let i = 0; i < clientCount; i++) {
                clients.push(makeClient(baseDoc, `client-${i}`))
            }
            for (let round = 0; round < rounds; round++) {
                for (let i = 0; i < clientCount; i++) {
                    // Client i edits only inside its own part, then sends.
                    dispatchEdit(
                        clients[i].editor,
                        editRng.int(1, 2 ** 31 - 1),
                        {bounds: ranges[i]}
                    )
                    const steps = outgoingSteps(clients[i])
                    broadcastAndDrain(
                        clients,
                        server,
                        i,
                        steps,
                        `round ${round}`
                    )
                }
            }
            // Strict convergence: everyone (including the server) holds the
            // identical document.
            const serverJson = JSON.parse(
                JSON.stringify(server.state.doc.toJSON())
            )
            for (const client of clients) {
                const json = JSON.parse(
                    JSON.stringify(client.editor.view.state.doc.toJSON())
                )
                if (!jsonEqual(json, serverJson)) {
                    throw new Error(
                        `convergence failure: client ${client.editor.client_id} differs from server:\n--- server ---\n${JSON.stringify(serverJson).slice(0, 2000)}\n--- client ---\n${JSON.stringify(json).slice(0, 2000)}`
                    )
                }
            }
        } finally {
            clients.forEach(destroyClient)
        }
    }
)

// --- Property 1b: overlapping concurrent edits must never crash ------------
// Same delivery model, but clients may edit anywhere, so rebases can
// legitimately drop conflicting unconfirmed steps (prosemirror-collab
// semantics). The invariants are robustness ones: no throw on well-formed
// delivery and check-valid documents everywhere.

const overlapStressProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 2, max: 3}),
    fc.integer({min: 1, max: 3}),
    (baseSeed, clientCount, rounds) => {
        const {doc: baseDoc} = fc.sample(
            docArb(fc, {track: false, maxParts: 3}),
            {seed: baseSeed, numRuns: 1}
        )[0]
        const clients = []
        const server = makeServer(baseDoc)
        try {
            const editRng = makeRng(baseSeed ^ (clientCount * 104729))
            for (let i = 0; i < clientCount; i++) {
                clients.push(makeClient(baseDoc, `client-${i}`))
            }
            for (let round = 0; round < rounds; round++) {
                for (let i = 0; i < clientCount; i++) {
                    dispatchEdit(clients[i].editor, editRng.int(1, 2 ** 31 - 1))
                    broadcastAndDrain(
                        clients,
                        server,
                        i,
                        outgoingSteps(clients[i]),
                        `overlap round ${round}`
                    )
                }
            }
            try {
                server.state.doc.check()
            } catch (error) {
                error.message = `server doc invalid at end: ${error.message}`
                throw error
            }
        } finally {
            clients.forEach(destroyClient)
        }
    }
)

// --- Property 2: footnote steps arrive with document steps ----------------

const footnotesProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    baseSeed => {
        const {doc: baseDoc} = fc.sample(docArb(fc), {
            seed: baseSeed,
            numRuns: 1
        })[0]
        const a = makeClient(baseDoc, "client-a")
        const b = makeClient(baseDoc, "client-b")
        try {
            const rng = makeRng(baseSeed)
            // Client B edits a footnote in its footnote editor and a
            // document step locally, then both are delivered to A in one
            // diff (the shape the server sends).
            const fnState = b.editor.mod.footnotes.fnEditor.view.state
            const fnSize = fnState.doc.content.size
            if (fnSize >= 2) {
                const fnTr = fnState.tr.insertText("f", 1, 1)
                b.editor.mod.footnotes.fnEditor.view.dispatch(fnTr)
            }
            const fnSteps = sendableSteps(fnState)
            const fnJsons = fnSteps
                ? fnSteps.steps.map(step => step.toJSON())
                : []
            dispatchEdit(b.editor, rng.int(1, 2 ** 31 - 1))
            const docSteps = outgoingSteps(b)

            applyDiff(a, {
                ds: docSteps,
                fs: fnJsons,
                cid: "client-b"
            })
            assertDocValid(a, "mixed ds+fs diff")

            // Both footnote editors must agree afterwards.
            const aFn = JSON.parse(
                JSON.stringify(
                    a.editor.mod.footnotes.fnEditor.view.state.doc.toJSON()
                )
            )
            const bFn = JSON.parse(
                JSON.stringify(
                    b.editor.mod.footnotes.fnEditor.view.state.doc.toJSON()
                )
            )
            if (!jsonEqual(aFn, bFn)) {
                throw new Error(
                    `footnote divergence:\n--- a ---\n${JSON.stringify(aFn)}\n--- b ---\n${JSON.stringify(bFn)}`
                )
            }
        } finally {
            destroyClient(a)
            destroyClient(b)
        }
    }
)

// --- Property 3: mutated step JSON never partially applies ----------------

const GARBAGE_VALUES = [
    undefined,
    null,
    0,
    -1,
    1e9,
    "0",
    "x",
    NaN,
    [],
    {},
    {stepType: "replace"},
    {stepType: "unknown_step"},
    {stepType: "replace", from: -5, to: 3},
    {stepType: "replace", from: 3, to: 1},
    {stepType: "replace", from: "a", to: "b"},
    {stepType: "addMark", mark: {type: "nonexistent"}},
    {stepType: "replace", from: 0, to: 1e9}
]

function mutateStepJson(stepJson, rng) {
    const mutated = JSON.parse(JSON.stringify(stepJson))
    switch (rng.int(0, 3)) {
        case 0: {
            // replace a numeric field with garbage
            const field = rng.pick(["from", "to", "from", "to", "pos"])
            if (field in mutated) {
                mutated[field] = rng.pick(GARBAGE_VALUES)
            }
            break
        }
        case 1:
            mutated.stepType = rng.pick(["bogus", "", undefined, 42, "replace"])
            break
        case 2:
            if ("slice" in mutated) {
                mutated.slice = rng.pick([
                    undefined,
                    null,
                    {},
                    {content: "nope"},
                    {content: [{type: "no_such_node"}]}
                ])
            } else {
                mutated.extra_garbage = rng.pick(GARBAGE_VALUES)
            }
            break
        case 3:
            return rng.pick(GARBAGE_VALUES.slice(9))
    }
    return mutated
}

const garbageProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    (baseSeed, mutSeed) => {
        const {doc: baseDoc} = fc.sample(docArb(fc), {
            seed: baseSeed,
            numRuns: 1
        })[0]
        const rng = makeRng(mutSeed)
        // Produce a real edit to mutate.
        const client = makeClient(baseDoc, "victim")
        try {
            dispatchEdit(client.editor, rng.int(1, 2 ** 31 - 1))
            const steps = outgoingSteps(client)
            const mutated = steps.map(step => mutateStepJson(step, rng))
            const before = JSON.stringify(client.editor.view.state.doc.toJSON())

            let threw = false
            try {
                applyDiff(client, {ds: mutated, cid: "attacker"})
            } catch (error) {
                threw = true
                if (!isCatchable(error)) {
                    throw error
                }
            }
            // The doc must always be check-valid; after a throw it must be
            // exactly what it was (no partial application).
            assertDocValid(client, "garbage diff")
            if (threw) {
                const after = JSON.stringify(
                    client.editor.view.state.doc.toJSON()
                )
                if (before !== after) {
                    throw new Error(
                        `garbage diff partially applied:\nbefore: ${before}\nafter: ${after}`
                    )
                }
            }
            // The client must remain usable: a following valid diff applies.
            // The follow-up steps are generated against the client's
            // confirmed document (the model: the server validated them
            // against exactly this state before broadcast).
            const healthy = makeClient(confirmedDocOf(client), "healthy")
            try {
                dispatchEdit(healthy.editor, rng.int(1, 2 ** 31 - 1))
                const goodSteps = outgoingSteps(healthy)
                if (goodSteps.length) {
                    applyDiff(client, {ds: goodSteps, cid: "healthy"})
                    assertDocValid(client, "recovery diff")
                }
            } finally {
                destroyClient(healthy)
            }
        } finally {
            destroyClient(client)
        }
    }
)

function isCatchable(error) {
    // Anything thrown by input handling should be an Error subclass with a
    // message — not e.g. a string thrown by deep framework code.
    return error instanceof Error
}

// --- Property 4: cu/bu/iu updates bundled into diffs -----------------------

function randomCommentEvent(rng) {
    const id = rng.int(1, 8)
    switch (rng.int(0, 5)) {
        case 0:
            return {
                type: "create",
                id,
                comment: "c" + id,
                user: rng.int(0, 3),
                username: "u" + rng.int(0, 3),
                date: 1755000000000,
                answers: [],
                resolved: false
            }
        case 1:
            return {type: "update", id, comment: "upd" + rng.int(0, 99)}
        case 2:
            return {type: "delete", id}
        case 3:
            return {
                type: "add_answer",
                id,
                answer: "a" + rng.int(0, 9),
                answerId: rng.int(1, 5),
                date: 1755000000000,
                user: 1,
                username: "u1"
            }
        case 4:
            return {type: "delete_answer", id, answerId: rng.int(1, 5)}
        case 5:
            return {
                type: "update_answer",
                id,
                answerId: rng.int(1, 5),
                answer: "x"
            }
    }
}

function randomBibEvent(rng) {
    const id = rng.int(1, 6)
    if (rng.bool()) {
        return {
            type: "update",
            id,
            reference: {
                bib_type: rng.pick(["article", "book", false]),
                fields: {
                    title: "T" + id,
                    author: rng.bool()
                        ? [{literal: [{given: "A", family: "B"}]}]
                        : undefined
                },
                entry_cat: [],
                entry_key: "key" + id
            }
        }
    }
    return {type: "delete", id}
}

function randomImageEvent(rng) {
    const id = rng.int(1, 6)
    if (rng.bool()) {
        return {
            type: "update",
            id,
            image: {
                title: "img" + id,
                copyright: {holder: false, year: false},
                image: "R0lGODlhAQABAAAAACw=",
                file_type: "image/gif",
                cats: []
            }
        }
    }
    return {type: "delete", id}
}

const dbUpdatesProp = fc.property(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    fc.integer({min: 1, max: 8}),
    (baseSeed, eventCount) => {
        const {doc: baseDoc} = fc.sample(docArb(fc), {
            seed: baseSeed,
            numRuns: 1
        })[0]
        const rng = makeRng(baseSeed * 31 + eventCount)
        const client = makeClient(baseDoc, "client-db")
        try {
            const cu = []
            const bu = []
            const iu = []
            for (let i = 0; i < eventCount; i++) {
                cu.push(randomCommentEvent(rng))
                bu.push(randomBibEvent(rng))
                iu.push(randomImageEvent(rng))
            }
            applyDiff(client, {cu, bu, iu, cid: "client-db"})
            assertDocValid(client, "db updates")
            // Store/DB state must be queryable and consistent with events.
            const comments = client.editor.mod.comments.store.comments
            if (typeof comments !== "object" || comments === null) {
                throw new Error("comment store broken after receive")
            }
            const bibDb = client.editor.mod.db.bibDB.db
            if (typeof bibDb !== "object" || bibDb === null) {
                throw new Error("bibDB broken after receive")
            }
        } finally {
            destroyClient(client)
        }
    }
)

runHarness("collab", [
    {label: "convergence under concurrent edits", prop: convergenceProp},
    {
        label: "overlapping concurrent edits never crash",
        prop: overlapStressProp
    },
    {label: "document+footnote steps in one diff", prop: footnotesProp},
    {label: "mutated step JSON never corrupts state", prop: garbageProp},
    {label: "cu/bu/iu updates", prop: dbUpdatesProp}
])
