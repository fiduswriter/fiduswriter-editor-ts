import {Window} from "happy-dom"

const window = new Window()
const document = window.document

globalThis.window = window
globalThis.document = document
globalThis.HTMLElement = window.HTMLElement
globalThis.HTMLInputElement = window.HTMLInputElement
globalThis.HTMLSelectElement = window.HTMLSelectElement
globalThis.HTMLTextAreaElement = window.HTMLTextAreaElement
globalThis.HTMLButtonElement = window.HTMLButtonElement
globalThis.HTMLDivElement = window.HTMLDivElement
globalThis.Node = window.Node
globalThis.Element = window.Element
globalThis.Event = window.Event
globalThis.CustomEvent = window.CustomEvent
globalThis.MouseEvent = window.MouseEvent
globalThis.KeyboardEvent = window.KeyboardEvent
globalThis.DOMParser = window.DOMParser
globalThis.XMLSerializer = window.XMLSerializer
globalThis.getComputedStyle = () => ({})
globalThis.URL = window.URL
globalThis.Blob = window.Blob
globalThis.File = window.File
globalThis.FileReader = window.FileReader
globalThis.MutationObserver = window.MutationObserver
globalThis.ResizeObserver = window.ResizeObserver
globalThis.IntersectionObserver = window.IntersectionObserver
globalThis.navigator = {userAgent: "node", language: "en-US", platform: "Linux"}
globalThis.location = {href: "http://localhost/", protocol: "http:", hostname: "localhost"}
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)

