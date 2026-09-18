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
export const DEFAULT_POLLING_OPTIONS = {
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
};
/**
 * Compute the delay until the next save-or-check tick.
 *
 * The result includes ±{@link PollingOptions.jitterRatio} random jitter so
 * that several editors of the same document do not poll in lockstep. Pass
 * `random = () => 0.5` in tests to get the unjittered delay.
 */
export function computeNextDelayMs(state, options = {}, random = Math.random) {
    const opts = { ...DEFAULT_POLLING_OPTIONS, ...options };
    let delay;
    if (!state.online) {
        // No point in checking or saving while offline; a check is triggered
        // immediately when the `online` event fires.
        delay = opts.offlineDelayMs;
    }
    else if (!state.visible) {
        // Hidden tabs pause periodic checks; one safety probe remains in
        // case the browser never delivers `visibilitychange`.
        delay = state.dirty
            ? opts.hiddenDirtyDelayMs
            : opts.hiddenSafetyDelayMs;
    }
    else if (state.dirty) {
        delay =
            state.msSinceLastEdit <= opts.activeEditWindowMs
                ? opts.activeDelayMs
                : opts.idleDirtyDelayMs;
    }
    else if (state.msSinceLastEdit <= opts.activeEditWindowMs) {
        delay = opts.activeDelayMs;
    }
    else if (!state.focused) {
        // Visible but blurred: start slow and ramp to the cap.
        const streak = Math.min(state.noChangeStreak, 8);
        delay = Math.min(opts.blurredCapMs, opts.blurredDelayMs * 2 ** streak);
    }
    else {
        // Visible and focused idle: use the configured ramp.
        delay =
            state.noChangeStreak < opts.idleRampMs.length
                ? opts.idleRampMs[state.noChangeStreak]
                : opts.idleCapMs;
    }
    const jitter = 1 + (random() * 2 - 1) * opts.jitterRatio;
    return Math.max(1_000, Math.round(delay * jitter));
}
//# sourceMappingURL=scheduling.js.map