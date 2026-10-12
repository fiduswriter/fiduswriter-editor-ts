// Shared fast-check configuration for the fuzz harnesses in this directory.
//
// Every harness runs fc properties with a seed and a run count taken from the
// environment so that a failing run can be replayed exactly:
//
//   FC_SEED=123456 FC_RUNS=2000 node test/fuzz/collab.js
//
// When a property fails, fast-check prints its shrunk counterexample together
// with the seed it used. Reproduce with the printed seed, minimize further by
// raising the shrink level, and once understood, pin the input as a
// regression in test/fuzz/regressions/.
import fc from "fast-check"

const RUNS = Number.parseInt(process.env.FC_RUNS || "500", 10)
const SEED = Number.parseInt(process.env.FC_SEED || String(Date.now()), 10)
const SHRINK = process.env.FC_SHRINK === "0" ? 0 : 1000

const config = {
    seed: SEED,
    numRuns: RUNS,
    endOnFailure: true
}
if (process.env.FC_TIME_LIMIT) {
    config.interruptAfterTimeLimit =
        Number.parseInt(process.env.FC_TIME_LIMIT, 10) * 1000
}
fc.configureGlobal(config)

export {fc, RUNS, SEED, SHRINK}

// Run a list of named properties, print a summary and exit non-zero when any
// property fails. `prop` is an fc.IProperty; `label` names it in output and
// in the failure dump.
export function runHarness(name, properties) {
    let failed = 0
    for (const {label, prop} of properties) {
        try {
            fc.assert(prop, {seed: SEED, numRuns: RUNS})
            console.log(`ok ${label}`)
        } catch (error) {
            failed++
            console.log(`FAILED ${label}`)
            console.log(error.message)
            if (error.cause !== undefined) {
                console.log(
                    `underlying error: ${error.cause.message || error.cause}`
                )
                if (error.cause.stack && process.env.FC_STACK) {
                    console.log(error.cause.stack)
                }
            }
        }
    }
    console.log(
        `\n${name}: ${properties.length - failed} passed, ${failed} failed (seed=${SEED}, runs=${RUNS})`
    )
    if (failed) {
        process.exit(1)
    }
}
