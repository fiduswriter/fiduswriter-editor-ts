import download from "downloadjs"

import {createSlug} from "@fiduswriter/document/exporter/tools/file"
import {ZipFileCreator} from "fwtoolkit/file/zip"
import {postJson} from "fwtoolkit"

interface HttpFile {
    filename: string
    url: string
}

interface TextFile {
    filename: string
    contents: string
}

interface TemplateResponse {
    doc_version: string
    title: string
    content: Record<string, unknown>
    export_templates: Array<{
        fields: {template_file: string; file_type: string; title: string}
    }>
    document_styles: Array<{
        fields: {
            contents: string
            slug: string
            title: string
            documentstylefile_set: Array<[string, string]>
        }
    }>
}

export class DocumentTemplateExporter {
    id: number | string
    getUrl: string
    download: boolean
    token: string | false
    zipFileName: string | false
    docVersion: string | false
    textFiles: TextFile[]
    httpFiles: HttpFile[]

    constructor(
        id: number | string,
        getUrl = "/api/document/admin/get_template/",
        download = true,
        token: string | false = false
    ) {
        this.id = id
        this.getUrl = getUrl
        this.download = download
        this.token = token

        this.zipFileName = false
        this.docVersion = false
        this.textFiles = []
        this.httpFiles = []
    }

    init(): Promise<void> {
        const params = this.token
            ? {id: this.id, token: this.token}
            : {id: this.id}
        return postJson(this.getUrl, params).then(({json}) => {
            const data = json as TemplateResponse
            this.docVersion = data.doc_version
            this.zipFileName = `${createSlug(data.title)}.fidustemplate`
            this.textFiles.push({
                filename: "template.json",
                contents: JSON.stringify(data.content)
            })
            const exportTemplates: Array<{
                file: string
                file_type: string
                title: string
            }> = []
            data.export_templates.forEach(
                (template: {
                    fields: {template_file: string; file_type: string; title: string}
                }) => {
                    const filename = `exporttemplates/${template.fields.template_file.split("/").slice(-1)[0]}`
                    this.httpFiles.push({
                        filename,
                        url: template.fields.template_file
                    })
                    exportTemplates.push({
                        file: filename,
                        file_type: template.fields.file_type,
                        title: template.fields.title
                    })
                }
            )
            this.textFiles.push({
                filename: "exporttemplates.json",
                contents: JSON.stringify(exportTemplates)
            })
            const documentStyles: Array<{
                contents: string
                slug: string
                title: string
                files: string[]
            }> = []
            data.document_styles.forEach(
                (docStyle: {
                    fields: {
                        contents: string
                        slug: string
                        title: string
                        documentstylefile_set: Array<[string, string]>
                    }
                }) => {
                    const style = {
                        contents: docStyle.fields.contents,
                        slug: docStyle.fields.slug,
                        title: docStyle.fields.title,
                        files: [] as string[]
                    }
                    docStyle.fields.documentstylefile_set.forEach(docstyleFile => {
                        const filename = `documentstyles/${docstyleFile[1]}`
                        this.httpFiles.push({
                            filename,
                            url: docstyleFile[0]
                        })
                        style.files.push(filename)
                    })
                    documentStyles.push(style)
                }
            )
            this.textFiles.push({
                filename: "documentstyles.json",
                contents: JSON.stringify(documentStyles)
            })
            if (this.download) {
                return this.createZip()
            }
            return Promise.resolve()
        })
    }

    createZip(): Promise<void> {
        this.textFiles.push({
            filename: "filetype-version",
            contents: this.docVersion as string
        })
        const zipper = new ZipFileCreator(
            this.textFiles,
            this.httpFiles,
            undefined,
            "application/fidustemplate+zip"
        )
        return zipper
            .init()
            .then(blob =>
                download(blob, this.zipFileName as string, "application/zip")
            )
    }
}
