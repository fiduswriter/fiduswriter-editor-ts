/**
 * Timing computation for the direct-save (no-WebSocket) mode.
 *
 * The direct-save mode replaces the previous fixed 10 s interval with a
 * self-rescheduling timeout whose delay depends on local signals only:
 * visibility, focus, connectivity, whether there are unsaved changes, how
 * long ago the user last edited and how many consecutive remote checks
 * found no change (the "nobody wrote for a while" proxy).
 *
 * `computeNextDelayMs` is pure so it can be unit-tested without a DOM.
 */

export interface PollingState {
    /** Whether the tab is visible (`document.visibilityState !== "hidden"`). */
    visible: boolean
    /** Whether the window currently has focus (`document.hasFocus()`). */
    focused: boolean
    /** Whether the browser reports a network connection (`navigator.onLine`). */
    online: boolean
    /** Whether there are unsaved local changes. */
    dirty: boolean
    /** Milliseconds since the last local edit (document step or comment). */
    msSinceLastEdit: number
    /** Consecutive remote checks that found no server-side change. */
    noChangeStreak: number
}

export interface PollingOptions {
    /** After a local edit, keep the active cadence for this long. */
    activeEditWindowMs: number
    /** Cadence while editing recently (clean or dirty). */
    activeDelayMs: number
    /** Cadence for unsaved changes that have been idle for a while. */
    idleDirtyDelayMs: number
    /** Cadence for unsaved changes while the tab is hidden. */
    hiddenDirtyDelayMs: number
    /** Visible-and-focused idle ramp, indexed by the no-change streak. */
    idleRampMs: number[]
    /** Cap of the visible-and-focused idle ramp. */
    idleCapMs: number
    /** First delay when the window is visible but not focused. */
    blurredDelayMs: number
    /** Cap of the blurred ramp. */
    blurredCapMs: number
    /** Paused-tab safety probe (hidden clean editor). */
    hiddenSafetyDelayMs: number
    /** Delay while offline; the tick skips network access entirely. */
    offlineDelayMs: number
    /** Minimum spacing between checks triggered by focus/visibility events. */
    minEventCheckDelayMs: number
    /** Fraction of the delay added/subtracted randomly (±). */
    jitterRatio: number
}

export const DEFAULT_POLLING_OPTIONS: PollingOptions = {
    activeEditWindowMs: 60_000,
    activeDelayMs: 10_000,
    idleDirtyDelayMs: 30_000,
    hiddenDirtyDelayMs: 60_000,
    idleRampMs: [20_000, 40_000, 80_000],
    idleCapMs: 120_000,
    blurredDelayMs: 60_000,
    blurredCapMs: 300_000,
    hiddenSafetyDelayMs: 300_000,
    offlineDelayMs: 300_000,
    minEventCheckDelayMs: 2_000,
    jitterRatio: 0.15
}

/**
 * Compute the delay until the next save-or-check tick.
 *
 * The result includes ±{@link PollingOptions.jitterRatio} random jitter so
 * that several editors of the same document do not poll in lockstep. Pass
 * `random = () => 0.5` in tests to get the unjittered delay.
 */
export function computeNextDelayMs(
    state: PollingState,
    options: Partial<PollingOptions> = {},
    random: () => number = Math.random
): number {
    const opts: PollingOptions = {...DEFAULT_POLLING_OPTIONS, ...options}

    let delay: number
    if (!state.online) {
        // No point in checking or saving while offline; a check is triggered
        // immediately when the `online` event fires.
        delay = opts.offlineDelayMs
    } else if (!state.visible) {
        // Hidden tabs pause periodic checks; one safety probe remains in
        // case the browser never delivers `visibilitychange`.
        delay = state.dirty
            ? opts.hiddenDirtyDelayMs
            : opts.hiddenSafetyDelayMs
    } else if (state.dirty) {
        delay =
            state.msSinceLastEdit <= opts.activeEditWindowMs
                ? opts.activeDelayMs
                : opts.idleDirtyDelayMs
    } else if (state.msSinceLastEdit <= opts.activeEditWindowMs) {
        delay = opts.activeDelayMs
    } else if (!state.focused) {
        // Visible but blurred: start slow and ramp to the cap.
        const streak = Math.min(state.noChangeStreak, 8)
        delay = Math.min(
            opts.blurredCapMs,
            opts.blurredDelayMs * 2 ** streak
        )
    } else {
        // Visible and focused idle: use the configured ramp.
        delay =
            state.noChangeStreak < opts.idleRampMs.length
                ? opts.idleRampMs[state.noChangeStreak]
                : opts.idleCapMs
    }

    const jitter = 1 + (random() * 2 - 1) * opts.jitterRatio
    return Math.max(1_000, Math.round(delay * jitter))
}
