export class Dialog {}
export class Datatable {}
export const get = () => {}
export const post = () => {}
export const baseBodyTemplate = () => ""
export const FeedbackTab = class {}
export const SiteMenu = class {}
export const escapeText = (s) => s
export const shortFileTitle = (s) => s
export const gettext = (s) => s
export const interpolate = (fmt, args) => {
    let index = 0
    return fmt.replace(/%s/g, () => {
        const value = args[index++]
        return value !== undefined ? String(value) : ""
    })
}
export const localizeDate = () => ""
export const addDropdown = () => {}
export const whenReady = () => Promise.resolve()
export const addAlert = () => {}
export const showSystemMessage = () => {}
export const activateWait = () => {}
export const deactivateWait = () => {}
export const ensureCSS = () => {}
export const addProgress = (_type, _message, _options) => ({
    update: () => {},
    close: () => {}
})
export const noSpaceTmp = (strings, ...values) =>
    strings.reduce(
        (acc, part, index) =>
            acc + part + (index < values.length ? String(values[index]) : ""),
        ""
    )
export const findTarget = (_event, _selector, _el) => false
