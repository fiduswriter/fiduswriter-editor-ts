import type {BibDB, ExportDoc, ImageDB} from "@fiduswriter/document"
import {ExportFidusFile as GenericExportFidusFile} from "@fiduswriter/document/exporter/native"
import {addProgress, gettext, shortFileTitle} from "fwtoolkit"
import {DocumentTemplateExporter} from "../../document_template/exporter.js"
import type {EditorDocumentApi} from "../../types.js"

interface ExportFidusFileApp {
    apiConnectors: {
        document: Pick<EditorDocumentApi, "getTemplateForDoc">
    }
}

export class ExportFidusFile extends GenericExportFidusFile {
    constructor(
        app: ExportFidusFileApp,
        doc: ExportDoc,
        bibDB: BibDB,
        imageDB: ImageDB,
        includeTemplate = true,
        token: string | boolean = false
    ) {
        const title = shortFileTitle(doc.title, doc.path || "")
        const task = addProgress(
            "info",
            `${title}: ${gettext("Exporting Fidus file...")}`,
            {autoClose: 6000}
        )
        const progressCallback = (message: string, percentage?: number | null) =>
            task.update(percentage ?? null, message)
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
        super(
            doc,
            bibDB,
            imageDB,
            includeTemplate,
            token,
            getTemplateFiles,
            progressCallback
        )
    }
}
