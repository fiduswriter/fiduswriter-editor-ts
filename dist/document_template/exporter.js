import download from "downloadjs";
import { createSlug } from "@fiduswriter/document/exporter/tools/file";
import { ZipFileCreator } from "fwtoolkit/file/zip";
export class DocumentTemplateExporter {
    id;
    getTemplateForDoc;
    download;
    token;
    zipFileName;
    docVersion;
    textFiles;
    httpFiles;
    constructor(id, getTemplateForDoc, download = true, token = false) {
        this.id = id;
        this.getTemplateForDoc = getTemplateForDoc;
        this.download = download;
        this.token = token;
        this.zipFileName = false;
        this.docVersion = false;
        this.textFiles = [];
        this.httpFiles = [];
    }
    init() {
        return this.getTemplateForDoc(this.id, this.token).then(({ json }) => {
            const data = json;
            this.docVersion = data.doc_version;
            this.zipFileName = `${createSlug(data.title)}.fidustemplate`;
            this.textFiles.push({
                filename: "template.json",
                contents: JSON.stringify(data.content)
            });
            const exportTemplates = [];
            (data.export_templates || []).forEach((template) => {
                const filename = `exporttemplates/${template.fields.template_file.split("/").slice(-1)[0]}`;
                this.httpFiles.push({
                    filename,
                    url: template.fields.template_file
                });
                exportTemplates.push({
                    file: filename,
                    file_type: template.fields.file_type,
                    title: template.fields.title
                });
            });
            this.textFiles.push({
                filename: "exporttemplates.json",
                contents: JSON.stringify(exportTemplates)
            });
            const documentStyles = [];
            (data.document_styles || []).forEach((docStyle) => {
                const style = {
                    contents: docStyle.fields.contents,
                    slug: docStyle.fields.slug,
                    title: docStyle.fields.title,
                    files: []
                };
                docStyle.fields.documentstylefile_set.forEach(docstyleFile => {
                    const filename = `documentstyles/${docstyleFile[1]}`;
                    this.httpFiles.push({
                        filename,
                        url: docstyleFile[0]
                    });
                    style.files.push(filename);
                });
                documentStyles.push(style);
            });
            this.textFiles.push({
                filename: "documentstyles.json",
                contents: JSON.stringify(documentStyles)
            });
            if (this.download) {
                return this.createZip();
            }
            return Promise.resolve();
        });
    }
    createZip() {
        this.textFiles.push({
            filename: "filetype-version",
            contents: this.docVersion
        });
        const zipper = new ZipFileCreator(this.textFiles, this.httpFiles, undefined, "application/vnd.fiduswriter.template+zip");
        return zipper
            .init()
            .then(blob => download(blob, this.zipFileName, "application/vnd.fiduswriter.template+zip"));
    }
}
//# sourceMappingURL=exporter.js.map