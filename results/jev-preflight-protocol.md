# Jev input investigation: fixed-state preflight, 18 October 2026

The goal is to establish whether a clearer input fixes basic road-following and
recovery decisions before another full lap. Existing r1–r5 artifacts are immutable.
No Opus or GPT live racing calls are authorized by this experiment.

First batch: exactly 16 fixed states × 3 representations = at most 48 calls to
`typesafe/jev-1.13`. Rotate representation order per state. No retries; HTTP or
validation failure stops the batch. Save every request, answer, usage, latency,
model snapshot and score in a new JSONL file. Load the existing credential from
Bash; never record it. This is a diagnostic sample, not independent lap repeats.

States: sectors 1, 4, 9, 15 at 150 m after entry, each on-centre and at both signed
70-world-unit lateral offsets (12 cases); sector 9 includes 0.6-radian camera
rotation and 1.2× zoom. Four exact replayed r5 states at calls 3, 16, 66 and 201
complete the set. Same six-frame action duration and physics for all formats.

Representations, fixed before seeing answers:

- `v2-baseline`: the r5 prose/tuple input and old question.
- `absolute-named`: direct structured state, named x/y points, actual car position,
  nearest road centre with plain-language relative position, continuous road
  centreline through the sector gate, and self-contained movement descriptions.
- `relative-named`: the same new representation translated so the car is at zero.

The new formats differ from baseline in multiple details; this batch compares
complete interfaces, not the isolated causal effect of each wording change.

The evaluator separately executes each chosen action through the actual physics.
On asphalt, a useful action stays on asphalt and advances more than 0.25 m along
the route. On grass, it reduces nearest-road distance by more than 1 m without a
wall collision. All legal actions are also evaluated offline to ensure each case
admits a useful move. **Neither these scores nor recommended actions enter any
model request.** A one-step pass does not establish good cornering or a fast lap.

A candidate must pass at least 14/16 cases and all three r5 grass-recovery cases
before a bounded two-sector pilot (at most 500 calls). Prefer the higher-scoring
candidate; break a tie in favour of absolute coordinates, which preserve the
screen-position convention of the legacy racers. The pilot must clear both gates
and spend at least 80% of its simulation time on asphalt before a full-course
attempt. Retain failed pilots. No repeated full laps to select a lucky result.

## First batch result

All 48 requests succeeded and served `typesafe/jev-1.13-20260917`. The reported
charge was $0.004104912 USD. Baseline passed 10/16; absolute-named and relative-named
each passed 16/16, including all three r5 grass-recovery states. The absolute
format was selected by the prespecified tie-break. This shows improved actions
on these fixed observations, not a completion-rate or lap-time result.

The baseline again failed all four r5 cases and two synthetic recovery cases.
Neither candidate did. No scores, ranked actions, selected waypoint or computed
route policy were sent to Jev. The fixtures, exact requests and responses are in
`jev-2026-10-18-input-preflight-1.jsonl`, originally committed with experiment
source in `6b8a4a1`. `npm run test:race-results` rechecks all scores and requests.

The next prespecified pilot uses `--observation-format absolute-named --sectors 2
--max-calls 500` and writes `jev-2026-10-18-v3-pilot.js` plus its audit. It shares
the same `candidateState` and `candidateQuestion` functions as the preflight.
All providers can receive the same geometry and action descriptions in reactive
mode. Only Jev receives its request through the typed Choice interface.
