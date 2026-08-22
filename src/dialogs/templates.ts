import {CATS} from "@fiduswriter/document/schema/i18n"
import {escapeText, infoTooltip} from "fwtoolkit"

interface InternalTarget {
    id: string
    text: string
}

interface AllowedContent {
    cross_reference?: boolean
    link?: boolean
}

interface LinkDialogOptions {
    defaultLink: string
    internalTargets: InternalTarget[]
    linkType: string
    title: string
    target: string
    allowedContent: AllowedContent
}

export const linkDialogTemplate = ({
    defaultLink,
    internalTargets,
    linkType,
    title,
    target,
    allowedContent
}: LinkDialogOptions): string =>
    `${
        allowedContent.cross_reference && internalTargets.length
            ? `<div class="fw-radio">
            <input type="radio" name="link-type" value="cross_reference" class="cross-reference-check">
            <label class="cross-reference-label">${gettext("Cross reference")}</label>
        </div>
        <div class="fw-select-container">
            <select class="cross-reference-selector fw-button fw-light fw-large" required="">
                <option class="fw-placeholder" selected="" disabled="" value="">
                    ${gettext("Select Target")}
                </option>
                ${internalTargets
                    .map(
                        iTarget =>
                            `<option class="cross-reference-item" type="text" value="${iTarget.id}" ${target === iTarget.id ? "selected" : ""}>
                            ${escapeText(iTarget.text)}
                        </option>`
                    )
                    .join("")}
            </select>
            <div class="fw-select-arrow fa-solid fa-caret-down"></div>
        </div><p></p>`
            : ""
    }${
        allowedContent.link && internalTargets.length
            ? `<div class="fw-radio">
            <input type="radio" name="link-type" value="internal" class="link-internal-check">
            <label class="link-internal-label">${gettext("Internal")}</label>
        </div>
        <div class="fw-select-container">
            <select class="internal-link-selector fw-button fw-light fw-large" required="">
                <option class="fw-placeholder" selected="" disabled="" value="">
                    ${gettext("Select Target")}
                </option>
                ${internalTargets
                    .map(
                        iTarget =>
                            `<option class="link-item" type="text" value="${iTarget.id}" ${target === iTarget.id ? "selected" : ""}>
                            ${escapeText(iTarget.text)}
                        </option>`
                    )
                    .join("")}
            </select>
            <div class="fw-select-arrow fa-solid fa-caret-down"></div>
        </div>
        <p></p>
        <div class="fw-radio">
            <input type="radio" name="link-type" value="external" class="link-external-check">
            <label class="link-external-label">${gettext("External")}</label>
        </div>`
            : ""
    }${
        allowedContent.link
            ? `<input class="link-title" type="text" value="${escapeText(title)}" placeholder="${gettext("Link title")}"/>
        <p></p>
        <input class="link" type="text" value="${target && linkType === "external" ? target : defaultLink}" placeholder="${gettext("URL")}"/>`
            : ""
    }`

/** Dialog to add a note to a revision before saving. */
export const revisionDialogTemplate = ({dir}: {dir: string}): string =>
    `<p>
        <input type="text" class="revision-note" placeholder="${gettext("Description (optional)")}" dir="${dir}">
    </p>`

export const pdfExportDialogTemplate = (): string => `
    <h4>${gettext("Tracked changes")}</h4>
    <div class="fw-radio">
        <input type="radio" name="pdf-track-changes" value="resolve" class="pdf-track-resolve" checked="" aria-describedby="pdf-track-resolve-help">
        <label class="pdf-track-resolve-label">${gettext("Resolve tracked changes (accept all)")}</label>
        ${infoTooltip(
            gettext(
                "Applies all tracked changes so the PDF shows the document as if every change had already been accepted."
            ),
            "pdf-track-resolve-help"
        )}
    </div>
    <div class="fw-radio">
        <input type="radio" name="pdf-track-changes" value="include" class="pdf-track-include" aria-describedby="pdf-track-include-help">
        <label class="pdf-track-include-label">${gettext("Include tracked changes in the PDF")}</label>
        ${infoTooltip(
            gettext(
                "Prints the tracked changes so reviewers can see what was added, removed or altered."
            ),
            "pdf-track-include-help"
        )}
    </div>
    <p>
        <label>
            <input type="checkbox" class="pdf-embed-fidus" aria-describedby="pdf-embed-fidus-help">
            ${gettext("Embed a Fidus Writer file of this document in the PDF")}
        </label>
        ${infoTooltip(
            gettext(
                "Embeds the editable Fidus Writer document inside the PDF so it can be reopened for editing."
            ),
            "pdf-embed-fidus-help"
        )}
    </p>
    <h4>${gettext("Print production")}</h4>
    <p>
        <label><input type="checkbox" class="pdf-crop-marks" aria-describedby="pdf-crop-marks-help"> ${gettext("Crop marks")}</label>
        ${infoTooltip(
            gettext("Small lines at the corners of the page that show printers where to cut the paper."),
            "pdf-crop-marks-help"
        )}<br>
        <label><input type="checkbox" class="pdf-trim-box" aria-describedby="pdf-trim-box-help"> ${gettext("Trim box")}</label>
        ${infoTooltip(
            gettext("Marks the final size of the page after it has been cut."),
            "pdf-trim-box-help"
        )}<br>
        <label><input type="checkbox" class="pdf-bleed-box" aria-describedby="pdf-bleed-box-help"> ${gettext("Bleed box")}</label>
        ${infoTooltip(
            gettext("Marks the area beyond the final page size where images and colors must extend so no white edges appear after cutting."),
            "pdf-bleed-box-help"
        )}<br>
        <label>${gettext("Bleed")}: <input type="number" class="pdf-bleed-mm" value="3" min="0" step="0.5" aria-describedby="pdf-bleed-mm-help"> ${gettext("mm")}</label>
        ${infoTooltip(
            gettext("How far, in millimeters, images and colors extend beyond the edge of the page."),
            "pdf-bleed-mm-help"
        )}<br>
        <label><input type="checkbox" class="pdf-link-borders" aria-describedby="pdf-link-borders-help"> ${gettext("Show link annotation borders")}</label>
        ${infoTooltip(
            gettext("Draws a visible border around hyperlinks in the PDF so they are easier to find."),
            "pdf-link-borders-help"
        )}<br>
        <label><input type="checkbox" class="pdf-rasterize-svgs" aria-describedby="pdf-rasterize-svgs-help"> ${gettext("Rasterize SVG images")}</label>
        ${infoTooltip(
            gettext("Converts SVG images to bitmap images in the PDF, which can help when PDF viewers or printers do not render SVG images correctly."),
            "pdf-rasterize-svgs-help"
        )}
    </p>
`

/**
 * Radio group for choosing whether tracked changes are resolved (accepted) or
 * kept in the exported file. `name` must be unique per dialog; the chosen value
 * is read back with {@link getExportTrackChangesValue}.
 */
export const exportTrackChangesTemplate = (name: string): string => `
    <h4>${gettext("Tracked changes")}</h4>
    <div class="fw-radio">
        <input type="radio" name="${name}" value="resolve" class="export-track-resolve" checked="" aria-describedby="${name}-resolve-help">
        <label class="export-track-resolve-label">${gettext("Resolve tracked changes (accept all)")}</label>
        ${infoTooltip(
            gettext(
                "Applies all tracked changes so the exported file shows the document as if every change had already been accepted."
            ),
            `${name}-resolve-help`
        )}
    </div>
    <div class="fw-radio">
        <input type="radio" name="${name}" value="include" class="export-track-include" aria-describedby="${name}-include-help">
        <label class="export-track-include-label">${gettext("Include tracked changes in the export")}</label>
        ${infoTooltip(
            gettext(
                "Keeps the tracked changes so reviewers can see what was added, removed or altered."
            ),
            `${name}-include-help`
        )}
    </div>
`

/** Read the tracked-changes radio group value ("resolve" or "include"). */
export const getExportTrackChangesValue = (
    dialogEl: Element,
    name: string
): string => {
    return (
        dialogEl.querySelector(
            `input[name="${name}"]:checked`
        ) as HTMLInputElement | null
    )?.value || "resolve"
}

export const htmlExportDialogTemplate = (): string => `
    ${exportTrackChangesTemplate("html-track-changes")}
    <p>
        <label>
            <input type="checkbox" class="html-svg-math" aria-describedby="html-svg-math-help">
            ${gettext("Render formulas as SVG images instead of MathML")}
        </label>
        ${infoTooltip(
            gettext(
                "SVG renders consistently across browsers; MathML keeps formulas as text that can be searched and copied, but only newer browsers support it."
            ),
            "html-svg-math-help"
        )}
    </p>
`

export const epubExportDialogTemplate = (): string => `
    ${exportTrackChangesTemplate("epub-track-changes")}
    <p>
        <label>
            <input type="checkbox" class="epub-svg-math" aria-describedby="epub-svg-math-help">
            ${gettext("Render formulas as SVG images instead of MathML")}
        </label>
        ${infoTooltip(
            gettext(
                "SVG renders consistently across browsers; MathML keeps formulas as text that can be searched and copied, but only newer browsers support it."
            ),
            "epub-svg-math-help"
        )}
    </p>
`

export const tableInsertTemplate = (): string => `
    <table class="insert-table-selection">
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
    </table>`

export const tableConfigurationTemplate = ({
    language
}: {
    language: string
}): string =>
    `<table class="fw-dialog-table">
        <tbody>
            <tr>
                <th><h4 class="fw-tablerow-title">${gettext("Alignment")}</h4></th>
                <td>
                    <select class="table-alignment">
                        <option value="left">${gettext("Left")}</option>
                        <option value="center">${gettext("Center")}</option>
                        <option value="right">${gettext("Right")}</option>
                    </select>
                </td>
            </tr>
            <tr>
                <th><h4 class="fw-tablerow-title">${gettext("Width")}</h4></th>
                <td>
                    <select class="table-width">
                        <option value="100">${gettext("100 %")}</option>
                        <option value="75">${gettext("75 %")}</option>
                        <option value="50">${gettext("50 %")}</option>
                        <option value="25">${gettext("25 %")}</option>
                    </select>
                </td>
            </tr>
            <tr>
                <th><h4 class="fw-tablerow-title">${gettext("Column style")}</h4></th>
                <td>
                    <select class="table-layout">
                        <option value="fixed">${gettext("Fixed width")}</option>
                        <option value="auto">${gettext("Fit content")}</option>
                    </select>
                </td>
            </tr>
            <tr>
                <th><h4 class="fw-tablerow-title">${gettext("Listed as")}</h4></th>
                <td>
                    <select class="table-category">
                        <option value="none">${gettext("None")}</option>
                        <option value="table">${CATS["table"][language]}</option>
                    </select>
                </td>
            </tr>
            <tr>
                <th><h4 class="fw-tablerow-title">${gettext("Caption")}</h4></th>
                <td>
                    <select class="table-caption">
                        <option value="true">${gettext("Enable")}</option>
                        <option value="false">${gettext("Disable")}</option>
                    </select>
                </td>
            </tr>
        </tbody>
    </table>`

export const orderedListStartTemplate = ({order}: {order: number}): string =>
    `<div title="${gettext("List start")}">
        <p><input class="list-start" type="number" name="list-start" min="1" value="${order}"></p>
    </div>`

export const mathDialogTemplate = (): string =>
    `<div class="math-field-outer">
        <div class="math-field" type="text" name="math" ></div>
    </div>`

interface FigureImageItem {
    id: number | string
    cats: string[]
    image: string
    thumbnail?: string
    title: string
}

export const figureImageItemTemplate = ({
    id,
    cats,
    image,
    thumbnail,
    title
}: FigureImageItem): string =>
    `<tr id="Image_${id}" class="${cats.map(cat => `cat_${escapeText(cat)} `).join("")}" >
         <td class="type" style="width:100px;">
            ${
                thumbnail === undefined
                    ? `<img src="${image}" style="max-heigth:30px;max-width:30px;">`
                    : `<img src="${thumbnail}" style="max-heigth:30px;max-width:30px;">`
            }
        </td>
        <td class="title" style="width:212px;">
            <span class="fw-inline">
                <span class="edit-image fw-link-text fa-solid fa-image" data-id="${id}">
                    ${escapeText(title)}
                </span>
            </span>
        </td>
        <td class="checkable" style="width:30px;">
        </td>
    </tr>`

interface ImageDB {
    [id: number]: FigureImageItem
}

/** A template to select images inside the figure configuration dialog in the editor. */
export const figureImageTemplate = ({imageDB}: {imageDB: ImageDB}): string =>
    `<div>
        <table id="imagelist" class="tablesorter fw-data-table" style="width:342px;">
            <thead class="fw-data-table-header">
                <tr>
                    <th width="50">${gettext("Image")}</th>
                    <th width="150">${gettext("Title")}</th>
                </tr>
            </thead>
            <tbody class="fw-data-table-body fw-small">
                ${Object.values(imageDB).map(image => figureImageItemTemplate(image)).join("")}
            </tbody>
        </table>
        <div class="dialogSubmit">
            <button class="edit-image createNew fw-button fw-light">
                ${gettext("Upload")}
                <span class="fa-solid fa-plus-circle"></span>
            </button>
            <button type="button" id="selectImageFigureButton" class="fw-button fw-dark">
                ${gettext("Insert")}
            </button>
            <button type="button" id="cancelImageFigureButton" class="fw-button fw-orange">
                ${gettext("Cancel")}
            </button>
        </div>
    </div>`

/** A template to configure the display of a figure in the editor. */
export const configureFigureTemplate = ({language}: {language: string}): string =>
    `<div class="fw-media-uploader">
            <input type="hidden" id="figure-category">
            <div class="figure-preview">
                <div class="inner-figure-preview"></div>
            </div>
            <table class="fw-dialog-table">
                <tbody>
                    <tr>
                        <th><h4 class="fw-tablerow-title">${gettext("Alignment")}</h4></th>
                        <td>
                            <select class="figure-alignment">
                                <option value="left">${gettext("Left")}</option>
                                <option value="center">${gettext("Center")}</option>
                                <option value="right">${gettext("Right")}</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th><h4 class="fw-tablerow-title">${gettext("Width")}</h4></th>
                        <td>
                            <div class="figure-width fw-dropdown fw-large fw-light fw-button"><label></label>&nbsp;<span class="fa-solid fa-caret-down"></span></div>
                        </td>
                    </tr>
                    <tr>
                        <th><h4 class="fw-tablerow-title">${gettext("Listed as")}</h4></th>
                        <td>
                            <select class="figure-category">
                                <option value="none">${gettext("None")}</option>
                                ${Object.entries(CATS)
                                    .map(
                                        ([id, titleObject]) =>
                                            `<option value="${id}">${(titleObject as Record<string, string>)[language]}</option>`
                                    )
                                    .join("")}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th><h4 class="fw-tablerow-title">${gettext("Caption")}</h4></th>
                        <td>
                            <select class="figure-caption">
                                <option value="true">${gettext("Enable")}</option>
                                <option value="false">${gettext("Disable")}</option>
                            </select>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>`

/** A template to configure citations in the editor */
export const configureCitationTemplate = ({
    citedItemsHTML,
    citeFormat
}: {
    citedItemsHTML: string
    citeFormat: string
}): string =>
    `<div id="my-sources" class="fw-ar-container">
            <h3 class="fw-green-title">${gettext("My sources")}</h3>
        </div>
        <span id="add-cite-source" class="fw-button fw-large fw-square fw-light fw-ar-button"><i class="fa-solid fa-caret-right"></i></span>
        <div id="cited-items" class="fw-ar-container">
            <h3 class="fw-green-title">${gettext("Citation format")}</h3>
            <div class="fw-select-container">
                <select id="citation-style-selector" class="fw-button fw-light fw-large" required="">
                    <option value="autocite" ${citeFormat === "autocite" ? "selected" : ""}>${gettext("(Author, 1998)")}</option>
                    <option value="textcite" ${citeFormat === "textcite" ? "selected" : ""}>${gettext("Author (1998)")}</option>
                </select>
                <div class="fw-select-arrow fa-solid fa-caret-down"></div>
            </div>
            <table id="selected-cite-source-table" class="fw-data-table tablesorter">
                <thead class="fw-data-table-header"><tr>
                    <th width="110">${gettext("Title")}</th>
                    <th width="110">${gettext("Author")}</th>
                    <th width="50">${gettext("Year")}</th>
                    <th width="50" align="center">${gettext("Order")}</th>
                    <th width="50" align="center">${gettext("Remove")}</th>
                </tr></thead>
                <tbody class="fw-data-table-body fw-min">
                  ${citedItemsHTML}
                </tbody>
            </table>
        </div>`

/** A template for each selected citation item inside the citation configuration
    dialog of the editor. */
export const selectedCitationTemplate = ({
    title,
    author,
    year,
    id,
    db,
    prefix,
    locator
}: {
    title: string
    author: string
    year: string
    id: number | string
    db: string
    prefix: string
    locator: string
}): string =>
    `<tr id="selected-source-${db}-${id}" class="selected-source">
        <td colspan="5" width="470">
          <table class="fw-cite-parts-table">
              <tr>
                  <td width="110">
                      <span class="fw-data-table-title fw-inline">
                          <i class="fa-solid fa-book"></i>
                          <span data-id="${id}">
                              ${escapeText(title)}
                          </span>
                      </span>
                  </td>
                  <td width="110">
                      <span class="fw-inline">
                          ${escapeText(author)}
                      </span>
                  </td>
                  <td width="50">
                      <span class="fw-inline">
                          ${escapeText(year)}
                      </span>
                  </td>
                  <td width="50" align="center">
                      <span class="order-down fw-inline fw-link-text" data-id="${id}" data-db="${db}">
                          <i class="fa-solid fa-sort-down"></i>
                      </span>
                      <span class="order-up fw-inline fw-link-text" data-id="${id}" data-db="${db}">
                          <i class="fa-solid fa-sort-up"></i>
                      </span>
                  </td>
                  <td width="50" align="center">
                      <span class="delete fw-inline fw-link-text" data-id="${id}" data-db="${db}">
                          <i class="fa-solid fa-trash-alt"></i>
                      </span>
                  </td>
              </tr>
              <tr>
                  <td class="cite-extra-fields" colspan="3" width="270">
                      <div>
                          <label>${gettext("Page")}</label>
                          <input class="fw-cite-page" type="text" value="${escapeText(locator)}" />
                      </div>
                      <div>
                          <label>${gettext("Text before")}</label>
                          <input class="fw-cite-text" type="text" value="${escapeText(prefix)}" />
                      </div>
                  </td>
              </tr>
          </table>
      </td>
    </tr>`

interface Contributor {
    firstname?: string
    lastname?: string
    email?: string
    institution?: string
    id_type?: string
    id_value?: string
}

interface IdType {
    label: string
}

export const contributorTemplate = ({
    contributor,
    idTypes = []
}: {
    contributor: Contributor
    idTypes?: IdType[]
}): string => {
    const showIdFields = idTypes && idTypes.length > 0
    let idTypeField = ""
    if (showIdFields) {
        if (idTypes.length === 1) {
            const type = idTypes[0]
            idTypeField = `<span class="id-type-label">${escapeText(type.label)}:</span><input type="hidden" name="id_type" value="${escapeText(type.label)}">`
        } else {
            idTypeField = `<select name="id_type">
                <option value="">${gettext("Select ID Type")}</option>
                ${idTypes.map(t => `<option value="${escapeText(t.label)}" ${contributor.id_type === t.label ? "selected" : ""}>${escapeText(t.label)}</option>`).join("")}
            </select>`
        }
    }

    return `<input type="text" name="firstname" value="${contributor.firstname ? escapeText(contributor.firstname) : ""}" placeholder="${gettext("Firstname")}"/>
    <input type="text" name="lastname" value="${contributor.lastname ? escapeText(contributor.lastname) : ""}" placeholder="${gettext("Lastname")}"/>
    <input type="text" name="email" value="${contributor.email ? escapeText(contributor.email) : ""}" placeholder="${gettext("Email")}"/>
    <input type="text" name="institution" value="${contributor.institution ? escapeText(contributor.institution) : ""}" placeholder="${gettext("Institution")}"/>
    ${
        showIdFields
            ? `<div class="id-fields">
        ${idTypeField}
        <input type="text" name="id_value" value="${contributor.id_value ? escapeText(contributor.id_value) : ""}" placeholder="${gettext("ID Value")}" class="id-value-input"/>
    </div>`
            : ""
    }
    `
}

export const languageTemplate = ({
    currentLanguage,
    allowedLanguages
}: {
    currentLanguage: string
    allowedLanguages: [string, string, string][]
}): string =>
    `<select class="fw-button fw-light fw-large">
        ${allowedLanguages
            .map(
                language =>
                    `<option value="${language[0]}" ${language[0] === currentLanguage ? "selected" : ""}>
                    ${language[1]}
                </option>`
            )
            .join("")}
    </select>`
