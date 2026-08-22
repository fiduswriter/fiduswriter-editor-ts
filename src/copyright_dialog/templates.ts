import {escapeText, InfoRow} from "fwtoolkit"
import {LICENSE_URLS} from "./index.js"

interface LicenseSelectParams {
    url: string
}

interface LicenseInputParams {
    url: string
    title: string
}

export interface CopyrightParams {
    holder?: string
    year?: number
    freeToRead?: boolean
}

export const licenseSelectTemplate = ({url}: LicenseSelectParams) =>
    `<select class="license">
        <option value=""></option>
        ${LICENSE_URLS.map(
            licenseUrl =>
                `<option value="${licenseUrl[1]}"${url === licenseUrl[1] ? " selected" : ""}>${licenseUrl[0]}</option>`
        ).join("")}
    </select>
    <div class="fw-select-arrow fa fa-caret-down"></div>`

export const licenseInputTemplate = ({url, title}: LicenseInputParams) =>
    `<div class="field-part field-part-huge">
        <input type='text' class='license' value="${escapeText(url)}" placeholder="${gettext("License URL")}">
    </div>
    <div class="field-part field-part-huge">
        <input type='text' class='license-title' value="${escapeText(title)}" placeholder="${gettext("License Title")}">
    </div>`

const copyrightRow = (
    label: string,
    helpText: string,
    field: string,
    fieldClass = ""
): string =>
    new InfoRow({
        label,
        helpText,
        field,
        fieldClass
    }).html()

export const copyrightTemplate = ({holder, year, freeToRead}: CopyrightParams) =>
    `<table class="fw-dialog-table">
        <tbody>
            ${copyrightRow(
                gettext("Copyright holder"),
                gettext("If the work is not in the public domain, specify who the copyright holder is."),
                `<input type="text" class="holder" value="${holder ? escapeText(holder) : ""}">`
            )}
            ${copyrightRow(
                gettext("Copyright year"),
                gettext("If the work is not in the public domain, specify the year of the copyright."),
                `<input type="number" class="year" min=0 max=2100 value="${year ? year : ""}">`
            )}
            ${copyrightRow(
                gettext("Available to read for free?"),
                gettext("Specify whether the work can be accessed without paying a fee."),
                `<input type="checkbox" class="free-to-read"${freeToRead ? " checked" : ""}>`
            )}
            ${copyrightRow(
                gettext("License(s)"),
                gettext('List any licenses the work is available under. If the license only applies from a given date, please specify the date in the ISO8601 format (such as "2012-10-15").'),
                `<div class="copyright-licenses-list"></div>`,
                "licenses"
            )}
        </tbody>
    </table>`
