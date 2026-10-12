// Fuzz harness for the paste pipeline: arbitrary clipboard HTML is sniffed
// by HTMLPaste (Word / LibreOffice / Google Docs / Fidus Writer / general
// handlers) and the normalized output is then parsed into the document by
// the ProseMirror DOM parser — exactly what a paste from an untrusted
// source does.
//
// Invariants:
//  1. No handler throws an uncatchable error (throw = bug: pasted content
//     from a hostile source would break pasting until reload).
//  2. Whatever HTML the handlers emit must parse into a check-valid
//     document through the schema's DOM parser.

import "../setup.js"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {DOMParser as PMDOMParser} from "prosemirror-model"

import {fc, runHarness} from "./config.js"
import {makeRng, docArb} from "./doc-generator.js"
import {makeFakeEditor, destroyFakeEditor} from "./fake-editor.js"
import {HTMLPaste} from "../../dist/clipboard/paste/index.js"

// Seed snippets exercising the handler sniffing paths.
const SEEDS = [
    // Word
    '<html><head><meta name=generator content="Microsoft Word 15"><style>mso-styles</style></head><body><!--[if gte mso 9]><xml><w:WordDocument></w:WordDocument></xml><![endif]--><p class=MsoNormal>Hello <b>world</b></p><table><tr><td>a</td></tr></table></body></html>',
    // LibreOffice
    '<html><head><meta name=generator content="LibreOffice 24"><style>p.P1 {color: red}</style></head><body><p class="P1">Styled</p><ol><li>one</li></ol></body></html>',
    // Google Docs
    '<html><head><meta name=generator content="Google Docs"><style>.lst-kix-list-1 {list-style-type: none}</style></head><body class="doc-body"><ul class="lst-kix-list-1"><li>item</li></ul><p class="c1">Text</p></body></html>',
    // Fidus Writer
    '<html><head><meta name=generator content="Fidus Writer"></head><body><div class="doc"><div class="doc-part doc-title">Title</div><div class="doc-part doc-richtext"><p class="doc-paragraph">Content</p></div></div></body></html>',
    // Generic messy web content
    '<html><body><div><span>mixed <a href="#">links</a> and <img src=x onerror=alert(1)> images</span><h1>H1</h1><script>alert("xss")</script><style>*{color:red}</style><math><mi>x</mi></math></div></body></html>',
    "<p>plain fragment</p>",
    "<table><tbody><tr><td colspan=2><p>cell</p></td></tr></tbody></table>"
]

const ATTACK_FRAGMENTS = [
    "<div>",
    "</div>",
    "<table><tr><td>",
    "<![CDATA[x]]>",
    "<?php echo 1; ?>",
    "<p style=",
    '"mso-list:l0 level1 lfo1"',
    'class="lst-kix-list-',
    "\x00",
    "\uFFFF",
    "<b>bold</b>",
    "id=",
    "<!--",
    "-->",
    "<math>",
    "<span dir=rtl>",
    "<img src=x>",
    "<li>",
    "<h",
    '="'
]

function adversarialHtml(rng) {
    const seed = SEEDS[rng.int(0, SEEDS.length - 1)]
    if (rng.bool()) {
        return seed
    }
    // Mutate: splice attack fragments into the seed at random positions.
    const mutations = rng.int(1, 4)
    let html = seed
    for (let i = 0; i < mutations; i++) {
        const pos = rng.int(0, html.length)
        const fragment =
            ATTACK_FRAGMENTS[rng.int(0, ATTACK_FRAGMENTS.length - 1)]
        html = html.slice(0, pos) + fragment + html.slice(pos)
    }
    return html
}

function parseThroughSchema(editor, html, context) {
    const dom = new window.DOMParser().parseFromString(html, "text/html")
    const container = dom.body
    try {
        const doc = PMDOMParser.fromSchema(docSchema).parse(container)
        doc.check()
        return doc
    } catch (error) {
        error.message = `schema parse of handler output failed for ${context}: ${error.message}\noutput: ${html.slice(0, 300)}`
        throw error
    }
}

const pasteProp = fc.asyncProperty(
    fc.integer({min: 1, max: 2 ** 31 - 1}),
    async baseSeed => {
        const rng = makeRng(baseSeed)
        const {doc} = fc.sample(docArb(fc), {seed: baseSeed, numRuns: 1})[0]
        const editor = makeFakeEditor({doc, clientID: "paste"})
        try {
            const html = adversarialHtml(rng)
            let output
            try {
                output = new HTMLPaste(
                    editor,
                    html,
                    "html",
                    editor.view
                ).getOutput()
            } catch (error) {
                if (error instanceof RangeError || error instanceof TypeError) {
                    // Structural errors on hostile input are tolerated only
                    // if they are catchable and leave the editor alive.
                    return
                }
                error.message = `HTMLPaste threw non-RangeError for input ${html.slice(0, 200)}: ${error.message}`
                throw error
            }
            // The editor must stay usable after the paste.
            try {
                editor.view.state.doc.check()
            } catch (error) {
                error.message = `editor doc invalid after paste handling: ${error.message}`
                throw error
            }
            if (typeof output === "string" && output.length) {
                parseThroughSchema(
                    editor,
                    output,
                    `paste of ${html.slice(0, 80)}`
                )
            }
            // HTMLPaste schedules a deferred resetPasteRange — let it run
            // while the editor is still alive.
            await new Promise(resolve => setTimeout(resolve, 5))
        } finally {
            destroyFakeEditor(editor)
        }
    }
)

runHarness("paste", [
    {label: "adversarial HTML through paste handlers", prop: pasteProp}
])
