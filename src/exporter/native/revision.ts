import type {BibDB, ExportDoc, ImageDB, UploadRevision} from "@fiduswriter/document"
import {SaveRevision as GenericSaveRevision} from "@fiduswriter/document/exporter/native"
import {createSlug} from "@fiduswriter/document/exporter/tools/file"
import {addAlert, addProgress, gettext, shortFileTitle} from "fwtoolkit"
import type {EditorApp} from "../../types.js"
import {DocumentTemplateExporter} from "../../document_template/exporter.js"

export class SaveRevision extends GenericSaveRevision {
    constructor(
        doc: ExportDoc,
        imageDB: ImageDB,
        bibDB: BibDB,
        note: string,
        app: EditorApp
    ) {
        const title = shortFileTitle(doc.title, doc.path || "")
        const task = addProgress(
            "info",
            `${title}: ${gettext("Saving revision...")}`,
            {autoClose: 6000}
        )
        const progressCallback = (message: string, percentage?: number | null) =>
            task.update(percentage ?? null, message)

        const onError = (error: unknown) => {
            task.close()
            addAlert("error", gettext("Revision file could not be generated."))
            if (app.isOffline()) {
                addAlert(
                    "info",
                    gettext(
                        "You are currently offline. Please try again when you are back online."
                    )
                )
            } else {
                throw error
            }
        }

        const getTemplateFiles = (docId: number | string, token: string | boolean) => {
            const templateExporter = new DocumentTemplateExporter(
                docId,
                app.apiConnectors.document.getTemplateForDoc,
                false,
                token as string | false
            )
            return templateExporter.init().then(() => ({
                textFiles: templateExporter.textFiles,
                httpFiles: templateExporter.httpFiles
            }))
        }

        const uploadRevision: UploadRevision = (blob, doc) => {
            return app.apiConnectors.document
                .uploadRevision(
                    {
                        note,
                        document_id: doc.id as number
                    },
                    {
                        file: {
                            file: blob,
                            filename: `${createSlug(
                                shortFileTitle(doc.title as string, doc.path as string)
                            )}.fidus`
                        }
                    }
                )
                .then(
                    () => {},
                    () => {
                        if (app.isOffline()) {
                            addAlert(
                                "info",
                                gettext(
                                    "You are currently offline. Please try again when you are back online."
                                )
                            )
                        }
                        throw new Error(gettext("Revision could not be saved."))
                    }
                )
                .catch(error => {
                    throw error
                })
        }

        super(doc, imageDB, bibDB, note, uploadRevision, {
            getTemplateFiles,
            onError,
            progressCallback
        })
    }

    init(): Promise<unknown> {
        return super.init().then(result => {
            addAlert("success", gettext("Revision saved."))
            return result
        })
    }
}
