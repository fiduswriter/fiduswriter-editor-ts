#!/usr/bin/env bash
# Batched fuzz campaign runner for the memory-bound editor-ts harnesses.
#
# Every fake editor cycle retains ~0.5 MB through happy-dom (the citation
# render, code block and equation node views keep cycles through the mounted
# DOM; see FUZZING.md). A single process OOMs after a few thousand editor
# creations, which collab.js — three clients plus a server copy per iteration,
# five properties — reaches far sooner than the other harnesses. So collab.js
# runs in $COLLAB_CHUNK-run windows, each window a separate process with a
# raised old-space limit and a derived seed (different chunk => different
# seed => extra path coverage); the remaining harnesses run in one process
# per (seed, harness) at $RUNS iterations.
#
# Usage:
#   test/fuzz/campaign.sh [total-runs] [seed ...]
#   defaults: 2000 runs, seeds 991001 991002 991003 991004
#
# Exits non-zero if any harness run failed.
set -uo pipefail

cd "$(dirname "$0")/../.."

RUNS="${1:-2000}"
shift || true
if [ $# -gt 0 ]; then
    SEEDS=("$@")
else
    SEEDS=(991001 991002 991003 991004)
fi

COLLAB_CHUNK="${COLLAB_CHUNK:-600}"
HARNESSES=(comments recreate-merge random-transactions track-accept-reject footnotes paste grammar-positions)

npm run build

FAILED=0
for SEED in "${SEEDS[@]}"; do
    echo "== seed $SEED =="

    # collab.js is the heavy one: chunked, one process per chunk.
    for ((off = 0; off < RUNS; off += COLLAB_CHUNK)); do
        CHUNK=$((RUNS - off < COLLAB_CHUNK ? RUNS - off : COLLAB_CHUNK))
        echo "-- collab chunk runs=$CHUNK seed=$((SEED + off))"
        FC_RUNS=$CHUNK FC_SEED=$((SEED + off)) node --max-old-space-size=4096 test/fuzz/collab.js || FAILED=1
    done

    for harness in "${HARNESSES[@]}"; do
        echo "-- $harness runs=$RUNS seed=$SEED"
        FC_RUNS=$RUNS FC_SEED=$SEED "node" "test/fuzz/$harness.js" || FAILED=1
    done
done

if [ "$FAILED" -ne 0 ]; then
    echo "campaign: at least one harness run FAILED (replay with FC_SEED)"
    exit 1
fi
echo "campaign: all harness runs passed (seeds: ${SEEDS[*]}, runs/seed: $RUNS)"
