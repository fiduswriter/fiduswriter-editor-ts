// Tests for the pure scheduling helper used by the direct-save mode
// (dist/no_collab_save/scheduling.js). Run as a plain node script, like
// no-collab-save-merge.js, because the module has no DOM dependencies.
import assert from "node:assert"

import {
    computeNextDelayMs,
    DEFAULT_POLLING_OPTIONS
} from "../dist/no_collab_save/scheduling.js"

// No jitter: `random()` returning 0.5 yields a factor of exactly 1.
const noJitter = () => 0.5
const fixed = options => () => options

function state(overrides) {
    return {
        visible: true,
        focused: true,
        online: true,
        dirty: false,
        msSinceLastEdit: Number.MAX_SAFE_INTEGER,
        noChangeStreak: 0,
        ...overrides
    }
}

function delay(pollingState, options) {
    return computeNextDelayMs(pollingState, options, noJitter)
}

// 1. Active editing keeps today's cadence, clean or dirty.
{
    assert.strictEqual(
        delay(state({dirty: true, msSinceLastEdit: 0})),
        DEFAULT_POLLING_OPTIONS.activeDelayMs
    )
    assert.strictEqual(
        delay(
            state({
                dirty: false,
                msSinceLastEdit: DEFAULT_POLLING_OPTIONS.activeEditWindowMs
            })
        ),
        DEFAULT_POLLING_OPTIONS.activeDelayMs
    )
    console.log("ok 1 - active editing cadence")
}

// 2. Dirty but idle slows down (30 s), hidden dirty keeps 60 s.
{
    assert.strictEqual(
        delay(
            state({
                dirty: true,
                msSinceLastEdit: DEFAULT_POLLING_OPTIONS.activeEditWindowMs + 1
            })
        ),
        DEFAULT_POLLING_OPTIONS.idleDirtyDelayMs
    )
    assert.strictEqual(
        delay(state({dirty: true, visible: false})),
        DEFAULT_POLLING_OPTIONS.hiddenDirtyDelayMs
    )
    console.log("ok 2 - dirty idle/hidden cadence")
}

// 3. Visible, focused, clean: 20 -> 40 -> 80 -> cap 120 s.
{
    const ramp = DEFAULT_POLLING_OPTIONS.idleRampMs
    assert.deepStrictEqual(
        [0, 1, 2].map(streak => delay(state({noChangeStreak: streak}))),
        ramp
    )
    assert.strictEqual(
        delay(state({noChangeStreak: ramp.length})),
        DEFAULT_POLLING_OPTIONS.idleCapMs
    )
    assert.strictEqual(
        delay(state({noChangeStreak: 99})),
        DEFAULT_POLLING_OPTIONS.idleCapMs
    )
    console.log("ok 3 - focused idle ramp")
}

// 4. Visible but blurred: starts at 60 s and is capped at 300 s.
{
    assert.strictEqual(
        delay(state({focused: false})),
        DEFAULT_POLLING_OPTIONS.blurredDelayMs
    )
    assert.strictEqual(
        delay(state({focused: false, noChangeStreak: 3})),
        DEFAULT_POLLING_OPTIONS.blurredCapMs
    )
    assert.strictEqual(
        delay(state({focused: false, noChangeStreak: 99})),
        DEFAULT_POLLING_OPTIONS.blurredCapMs
    )
    console.log("ok 4 - blurred ramp and cap")
}

// 5. Hidden clean editors only schedule the safety probe; offline pauses.
{
    assert.strictEqual(
        delay(state({visible: false})),
        DEFAULT_POLLING_OPTIONS.hiddenSafetyDelayMs
    )
    assert.strictEqual(
        delay(state({online: false})),
        DEFAULT_POLLING_OPTIONS.offlineDelayMs
    )
    // Offline wins over every other signal.
    assert.strictEqual(
        delay(
            state({
                online: false,
                visible: false,
                dirty: true,
                msSinceLastEdit: 0
            })
        ),
        DEFAULT_POLLING_OPTIONS.offlineDelayMs
    )
    console.log("ok 5 - hidden safety probe and offline pause")
}

// 6. Jitter stays within ±15 % and never reaches zero.
{
    const base = delay(state({dirty: true, msSinceLastEdit: 0}))
    const low = computeNextDelayMs(
        state({dirty: true, msSinceLastEdit: 0}),
        {},
        () => 0
    )
    const high = computeNextDelayMs(
        state({dirty: true, msSinceLastEdit: 0}),
        {},
        () => 1
    )
    assert.ok(low < base && base < high, `${low} < ${base} < ${high}`)
    assert.ok(
        Math.abs(low - base * 0.85) <= 1,
        `low ${low} should be ~85% of ${base}`
    )
    assert.ok(
        Math.abs(high - base * 1.15) <= 1,
        `high ${high} should be ~115% of ${base}`
    )
    assert.ok(
        computeNextDelayMs(
            state({dirty: true, msSinceLastEdit: 0}),
            {activeDelayMs: 100},
            fixed(0)
        ) >= 1
    )
    console.log("ok 6 - jitter bounds")
}

// 7. Host overrides win over the defaults.
{
    assert.strictEqual(
        delay(state({dirty: true, msSinceLastEdit: 0}), {
            activeDelayMs: 1_234,
            activeEditWindowMs: 5
        }),
        1_234
    )
    assert.strictEqual(
        delay(state({visible: false}), {hiddenSafetyDelayMs: 9_000}),
        9_000
    )
    assert.deepStrictEqual(
        [0, 1].map(streak =>
            delay(state({noChangeStreak: streak}), {
                idleRampMs: [1_500, 2_500]
            })
        ),
        [1_500, 2_500]
    )
    console.log("ok 7 - option overrides")
}

console.log("no-collab-save-scheduling tests passed")
