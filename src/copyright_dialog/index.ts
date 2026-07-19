import {edtfParse} from "@fiduswriter/document/bibliojson"
import deepEqual from "fast-deep-equal"
import {Dialog, InputList, TypeSwitch, escapeText} from "fwtoolkit"
import {
    copyrightTemplate,
    licenseInputTemplate,
    licenseSelectTemplate,
    type CopyrightParams
} from "./templates.js"

interface License {
    url: string
    title: string
    start?: string | false
}

export interface Copyright {
    holder?: string | false
    year?: number | false
    freeToRead?: boolean
    licenses?: License[]
}

export const LICENSE_URLS: Array<[string, string]> = [
    ["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"],
    ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"],
    ["CC BY-ND 4.0", "https://creativecommons.org/licenses/by-nd/4.0/"],
    ["CC BY-NC 4.0", "https://creativecommons.org/licenses/by-nc/4.0/"],
    ["CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/"],
    ["CC BY-NC-ND 4.0", "https://creativecommons.org/licenses/by-nc-nd/4.0/"],
    ["CC0", "https://creativecommons.org/publicdomain/zero/1.0/"]
]

function getLicenseTitle(url: string): string {
    const license = LICENSE_URLS.find(license => license[1] === url)
    return license ? license[0] : ""
}

export class CopyrightDialog {
    copyright: Copyright
    origCopyright: Copyright
    dialog: Dialog | false
    licensesList?: InputList<License>

    constructor(copyright: Copyright) {
        this.copyright = copyright
        this.origCopyright = copyright
        this.dialog = false
    }

    getCurrentValue(): void {
        this.copyright = {}
        const holder = (
            this.dialog as Dialog
        ).dialogEl.querySelector(".holder") as HTMLInputElement
        this.copyright.holder = holder.value.length ? holder.value : false
        const year = (
            this.dialog as Dialog
        ).dialogEl.querySelector(".year") as HTMLInputElement
        this.copyright.year = year.value.length
            ? Math.max(0, Math.min(Number.parseInt(year.value) || 0, 2100))
            : false
        this.copyright.freeToRead = (
            this.dialog as Dialog
        ).dialogEl.querySelector(".free-to-read:checked")
            ? true
            : false
        const licenseStartDates = Array.from(
            (this.dialog as Dialog).dialogEl.querySelectorAll(".license-start")
        ).map(el => (el as HTMLInputElement).value)
        this.copyright.licenses = (this.licensesList as InputList<License>).values
            .map((license: License, index: number) => {
                if (!license.url.length) {
                    return false
                }
                const returnValue: License = {
                    url: license.url,
                    title: license.title
                }
                const startDate = edtfParse(licenseStartDates[index])
                if (
                    startDate.valid &&
                    (startDate.type === "Date" ||
                        startDate.type === "YearMonth" ||
                        startDate.type === "Year") &&
                    !startDate.uncertain &&
                    !startDate.approximate
                ) {
                    returnValue.start = startDate.cleanedString
                }
                return returnValue
            })
            .filter((license): license is License => Boolean(license))
    }

    init(): Promise<Copyright | false> {
        return new Promise(resolve => {
            const buttons = [
                {
                    text: gettext("Change"),
                    classes: "fw-dark",
                    click: () => {
                        ;(this.dialog as Dialog).close()
                        this.getCurrentValue()
                        if (deepEqual(this.copyright, this.origCopyright)) {
                            // No change.
                            resolve(false)
                        }
                        resolve(this.copyright)
                    }
                },
                {
                    type: "cancel" as const
                }
            ]

            this.dialog = new Dialog({
                width: 940,
                height: 300,
                id: "configure-copyright",
                title: gettext("Set copyright information"),
                body: copyrightTemplate(this.copyright as CopyrightParams),
                buttons
            })

            this.dialog.open()
            this.bind()
        })
    }

    bind(): void {
        this.licensesList = new InputList<License>({
            dom: (this.dialog as Dialog).dialogEl.querySelector(
                ".copyright-licenses-list"
            ) as HTMLElement,
            initialValues: this.copyright.licenses || [],
            emptyValue: {url: "", title: "", start: false},
            renderItem: (license: License) => ({
                html: `<div class="copyright-license-switch"></div>
                    <div class="field-part field-part-small">
                        <input type="text" class="license-start" value="${license.start ? escapeText(license.start) : ""}" placeholder="${gettext("Start date")}">
                    </div>`,
                bind: el => {
                    const licenseContainer = el.closest("tr") as HTMLElement
                    const startInput =
                        licenseContainer.querySelector(".license-start")
                    if (license.start) {
                        ;(startInput as HTMLInputElement).value = license.start
                    }

                    const mode =
                        license.url === "" ||
                        LICENSE_URLS.find(
                            licenseUrl => licenseUrl[1] === license.url
                        )
                            ? 1
                            : 2
                    new TypeSwitch({
                        dom: el.querySelector(
                            ".copyright-license-switch"
                        ) as HTMLElement,
                        label1: gettext("From list"),
                        label2: gettext("Custom"),
                        initialMode: mode,
                        render1: () => licenseSelectTemplate({url: license.url}),
                        render2: () =>
                            licenseInputTemplate({
                                url: license.url,
                                title: license.title
                            }),
                        onChange: () => {
                            // Restore focus to the license input after switching.
                            const focusable = el.querySelector(
                                ".fw-type-switch-input-inner input, .fw-type-switch-input-inner select"
                            )
                            if (focusable) {
                                ;(focusable as HTMLElement).focus()
                            }
                        }
                    })
                }
            }),
            getValue: (el): License => {
                const licenseInput = el.querySelector(
                    ".fw-type-switch-input-inner"
                ) as HTMLElement
                const selectEl = licenseInput.querySelector("select.license")
                let url: string, title: string
                if (selectEl) {
                    url = (selectEl as HTMLSelectElement).value
                    title = getLicenseTitle(url)
                } else {
                    url = (
                        licenseInput.querySelector("input.license") as
                            | HTMLInputElement
                            | undefined
                    )?.value as string
                    title = (
                        licenseInput.querySelector(
                            "input.license-title"
                        ) as HTMLInputElement
                    ).value
                }
                const startValue =
                    (el.closest("tr")?.querySelector(".license-start") as
                        | HTMLInputElement
                        | undefined
                    )?.value
                const start: string | false = startValue || false
                return {url, title, start}
            }
        })
    }
}
