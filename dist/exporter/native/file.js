import { ExportFidusFile as GenericExportFidusFile } from "@fiduswriter/document/exporter/native";
import { addProgress, gettext, shortFileTitle } from "fwtoolkit";
import { DocumentTemplateExporter } from "../../document_template/exporter.js";
export class ExportFidusFile extends GenericExportFidusFile {
    constructor(app, doc, bibDB, imageDB, includeTemplate = true, token = false, download = true) {
        const title = shortFileTitle(doc.title, doc.path || "");
        const task = addProgress("info", `${title}: ${gettext("Exporting Fidus file...")}`, { autoClose: 6000 });
        const progressCallback = (message, percentage) => task.update(percentage ?? null, message);
        const getTemplateFiles = (docId, token) => {
            const templateExporter = new DocumentTemplateExporter(docId, app.apiConnectors.document.getTemplateForDoc, false, token);
            return templateExporter.init().then(() => ({
                textFiles: templateExporter.textFiles,
                httpFiles: templateExporter.httpFiles
            }));
        };
        super(doc, bibDB, imageDB, includeTemplate, token, getTemplateFiles, progressCallback, download);
    }
}
//# sourceMappingURL=file.js.map