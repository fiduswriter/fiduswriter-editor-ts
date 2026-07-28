import type {EditorApp} from "@fiduswriter/editor"
import {createStaticApp, type StaticAppConfig} from "@fiduswriter/editor"

import templateData from "./document-template-data.json" assert {type: "json"}

function getDemoBasePath(): string {
    return window.location.pathname.replace(
        /\/(?:editor\/(?:index\.html)?|index\.html)$/,
        "/"
    )
}

function getAssetUrl(path: string): string {
    return `${getDemoBasePath()}static/${path}`
}

const documentStyles = templateData.documentStyles.map(style => ({
    title: style.title,
    slug: style.slug,
    contents: style.contents,
    documentstylefile_set: style.files.map(filename => [
        getAssetUrl(`style-files/${filename}`),
        filename
    ])
}))

const exportTemplates = templateData.exportTemplates.map(template => ({
    title: template.title,
    file_type: template.file_type,
    template_file: getAssetUrl(`export-templates/${template.file}`)
}))

const documentTemplates: Record<string, {title: string}> = {
    [templateData.documentTemplate.importId]: {
        title: templateData.documentTemplate.title
    }
}

export type DemoAppConfig = Omit<
    StaticAppConfig,
    "documentStyles" | "exportTemplates" | "documentTemplates" | "appName"
>

/**
 * Create the demo's static EditorApp, pre-configured with the bundled standard
 * article template styles and export templates.
 */
export async function createDemoApp(config: DemoAppConfig): Promise<EditorApp> {
    return createStaticApp({
        ...config,
        appName: "fiduswriter-editor-demo",
        documentStyles,
        exportTemplates,
        documentTemplates,
        routes: {
            "": {app: "document"},
            document: {app: "document"}
        }
    })
}

createDemoApp.documentStyles = documentStyles
createDemoApp.exportTemplates = exportTemplates
createDemoApp.documentTemplates = documentTemplates
