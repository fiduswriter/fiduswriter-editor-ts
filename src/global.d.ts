/**
 * Global functions and values provided by Fidus Writer's runtime environment.
 * These are injected by the Django JavaScript catalog and other runtime scripts.
 */

declare global {
    function gettext(msgid: string): string

    function interpolate(
        fmt: string,
        args: Array<string | number>,
        named?: boolean
    ): string

    function staticUrl(path: string): string

    const csrfToken: string

    interface MathVirtualKeyboard {
        show(): void
        hide(): void
    }

    interface Window {
        mathVirtualKeyboard?: MathVirtualKeyboard
    }
}

export {}
