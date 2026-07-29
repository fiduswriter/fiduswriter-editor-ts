import {gettext} from "fwtoolkit"

export type StartupResult =
    | {mode: "import"; file: File}
    | {mode: "new"; templateFile?: File}

export interface StartupDialogResult {
    locale: string
    username: string
    preferences: Record<string, boolean>
    result: StartupResult
}

const LOCALES = [
    {code: "en", name: "English"},
    {code: "ar", name: "العربية"},
    {code: "bg", name: "Български"},
    {code: "cs", name: "Čeština"},
    {code: "da", name: "Dansk"},
    {code: "de", name: "Deutsch"},
    {code: "en_US", name: "English (US)"},
    {code: "es", name: "Español"},
    {code: "fr", name: "Français"},
    {code: "it", name: "Italiano"},
    {code: "ja", name: "日本語"},
    {code: "ko", name: "한국어"},
    {code: "nb", name: "Norsk bokmål"},
    {code: "nl", name: "Nederlands"},
    {code: "pl", name: "Polski"},
    {code: "pt_BR", name: "Português (Brasil)"},
    {code: "pt_PT", name: "Português (Portugal)"},
    {code: "ru", name: "Русский"},
    {code: "sv", name: "Svenska"},
    {code: "tr", name: "Türkçe"},
    {code: "zh_Hans", name: "简体中文"}
]

export function showStartupDialog(): Promise<StartupDialogResult> {
    return new Promise(resolve => {
        const overlay = document.createElement("div")
        overlay.className = "demo-startup-overlay"
        overlay.innerHTML = `
            <div class="demo-startup-dialog">
                <h1>${gettext("Fidus Writer Editor")}</h1>
                <p>${gettext("Open or create a document to start editing.")}</p>

                <label for="demo-username">${gettext("Username (optional)")}</label>
                <input type="text" id="demo-username" class="fw-input" placeholder="${gettext("Demo User")}" />

                <label for="demo-locale">${gettext("Language")}</label>
                <select id="demo-locale" class="fw-input"></select>

                <div class="demo-section">
                    <h2>${gettext("Editing preferences")}</h2>
                    <label class="checkable-label">
                        <input type="checkbox" id="demo-inline-references" />
                        ${gettext("Enable inline reference typing (@)")}
                    </label>
                    <label class="checkable-label">
                        <input type="checkbox" id="demo-inline-math" />
                        ${gettext("Enable inline math typing ($)")}
                    </label>
                </div>

                <div class="demo-section">
                    <h2>${gettext("Import existing document")}</h2>
                    <p>${gettext("Drop a file here or click to select.")}</p>
                    <div id="demo-import-dropzone" class="demo-dropzone">
                        ${gettext("Supported: .fidus, .docx, .odt, .json")}
                    </div>
                    <input type="file" id="demo-import-input" accept=".fidus,.docx,.odt,.json" hidden />
                </div>

                <div class="demo-section">
                    <h2>${gettext("Start new document")}</h2>
                    <button id="demo-new-doc" class="fw-button fw-dark" type="button">
                        ${gettext("Start new document")}
                    </button>
                </div>

                <div class="demo-section">
                    <h2>${gettext("Try a sample document")}</h2>
                    <button id="demo-load-sample" class="fw-button fw-light" type="button">
                        ${gettext("Load sample document")}
                    </button>
                </div>

                <div class="demo-section">
                    <h2>${gettext("Apply document template")}</h2>
                    <p>${gettext("Optional: select a .fidustemplate file to use with a new document.")}</p>
                    <input type="file" id="demo-template-input" accept=".fidustemplate" />
                </div>
            </div>
        `

        const select = overlay.querySelector(
            "#demo-locale"
        ) as HTMLSelectElement
        LOCALES.forEach(locale => {
            const option = document.createElement("option")
            option.value = locale.code
            option.textContent = locale.name
            select.appendChild(option)
        })
        select.value = "en"

        const importDropzone = overlay.querySelector("#demo-import-dropzone")!
        const importInput = overlay.querySelector(
            "#demo-import-input"
        ) as HTMLInputElement
        const templateInput = overlay.querySelector(
            "#demo-template-input"
        ) as HTMLInputElement
        const newDocButton = overlay.querySelector("#demo-new-doc")!
        const sampleButton = overlay.querySelector("#demo-load-sample")!
        const usernameInput = overlay.querySelector(
            "#demo-username"
        ) as HTMLInputElement
        const inlineReferencesInput = overlay.querySelector(
            "#demo-inline-references"
        ) as HTMLInputElement
        const inlineMathInput = overlay.querySelector(
            "#demo-inline-math"
        ) as HTMLInputElement

        const getPreferences = () => ({
            inline_references: inlineReferencesInput.checked,
            inline_math: inlineMathInput.checked
        })

        const close = () => overlay.remove()

        const loadSampleDocument = async () => {
            try {
                const response = await fetch("../static/demo.fidus")
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`)
                }
                const blob = await response.blob()
                const file = new File([blob], "demo.fidus", {
                    type: "application/fidus+zip"
                })
                handleImportFile(file)
            } catch (error) {
                console.error("Failed to load sample document:", error)
                window.alert(gettext("Could not load the sample document."))
            }
        }

        const getUsername = () => usernameInput.value.trim() || gettext("Demo User")

        const handleImportFile = (file: File) => {
            close()
            resolve({
                locale: select.value,
                username: getUsername(),
                preferences: getPreferences(),
                result: {mode: "import", file}
            })
        }

        const handleNewDocument = () => {
            const templateFile = templateInput.files?.[0]
            close()
            resolve({
                locale: select.value,
                username: getUsername(),
                preferences: getPreferences(),
                result: {mode: "new", templateFile}
            })
        }

        importDropzone.addEventListener("click", () => importInput.click())
        importDropzone.addEventListener("dragover", event => {
            event.preventDefault()
            importDropzone.classList.add("dragover")
        })
        importDropzone.addEventListener("dragleave", () =>
            importDropzone.classList.remove("dragover")
        )
        importDropzone.addEventListener("drop", event => {
            event.preventDefault()
            importDropzone.classList.remove("dragover")
            const file = event.dataTransfer?.files[0]
            if (file) {
                handleImportFile(file)
            }
        })
        importInput.addEventListener("change", () => {
            const file = importInput.files?.[0]
            if (file) {
                handleImportFile(file)
            }
        })

        newDocButton.addEventListener("click", handleNewDocument)
        sampleButton.addEventListener("click", loadSampleDocument)

        document.body.appendChild(overlay)
    })
}
