import "../test/setup.js"
import assert from "node:assert"

import {docSchema} from "@fiduswriter/document/schema/document/index"
import {createCSL} from "@fiduswriter/document/citations/create_csl"
import {docClipboardSerializer} from "../dist/clipboard/copy/serializers.js"

const schema = docSchema
schema.cached = {bibDB: {db: {}}}

const csl = await createCSL()
// Restore prototype methods just like the demo does.
const cslProto = Object.getPrototypeOf(csl)
csl.getStyle = cslProto.getStyle
csl.getLocale = cslProto.getLocale
// Prime the CSL engine so the synchronous copy path can format citations.
const style = await csl.getStyle("chicago-notes-bibliography")
const locale = await csl.getLocale(style, "en-US")
csl.registerStyle("chicago-notes-bibliography", style)
csl.locales["en-US"] = locale
await csl.getCiteproc()

const editor = {
    view: {
        state: {
            doc: {
                attrs: {
                    citationstyle: "chicago-notes-bibliography",
                    language: "en-US",
                    bibliography_header: {
                        "en-US": "Bibliography"
                    }
                }
            }
        }
    },
    schema,
    mod: {
        db: {
            bibDB: {
                db: {
                    0: {
                        fields: {
                            date: "1982-03",
                            type: "techreport",
                            title: [
                                {text: "Economic Effects of the Oil Expansion in Mexico", type: "text"}
                            ],
                            author: [
                                {
                                    given: [{text: "Thomas", type: "text"}],
                                    family: [{text: "Sterner", type: "text"}]
                                }
                            ],
                            institution: [
                                [{text: "Department of Economics, University of Gothenburg", type: "text"}]
                            ]
                        },
                        bib_type: "report",
                        entry_key: "SternerThomas198203"
                    }
                }
            }
        }
    },
    app: {csl}
}

const serializer = docClipboardSerializer(editor)
const doc = schema.nodeFromJSON({
    type: "doc",
    attrs: editor.view.state.doc.attrs,
    content: [
        {type: "title", attrs: {id: "title"}, content: [{type: "text", text: "Title"}]},
        {
            type: "richtext_part",
            attrs: {id: "body", title: "Body"},
            content: [
                {
                    type: "paragraph",
                    content: [
                        {type: "text", text: "Hello "},
                        {
                            type: "citation",
                            attrs: {
                                format: "autocite",
                                references: [{id: 0}]
                            }
                        },
                        {type: "text", text: " world"}
                    ]
                }
            ]
        }
    ]
})

let caughtError = null
try {
    serializer.serializeFragment(doc.content)
} catch (error) {
    caughtError = error
}

assert.strictEqual(caughtError, null, `Copy serialization threw: ${caughtError}`)
console.log("copy serialization test passed")
