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

## Pilot result and full-course admission

The pilot cleared both gates: 2,258 m at 11.500 simulated seconds, 116 valid
requests, 0.02 seconds on grass, zero wall-hit frames. OpenRouter reported
$0.009506532 USD; wall time was 55.918 seconds. It served the same 1.13 snapshot.
It stopped at the requested two-sector limit, not a navigation failure. Its full
audit and replay match re-executed physics (JSON serialization normalizes -0 to 0).
The 80% asphalt threshold was exceeded: approximately 99.8%.

A single full-course attempt is therefore admitted as `jev-2026-10-18-r6.js`,
with 18 sectors and 2,250 maximum calls. The Jev request representation and action
question remain identical to the pilot. Named observations are now the default
for all reactive providers; `--observation-format v2-baseline` preserves the old
option. CLI prompts use only the shared structured state and action descriptions
(no extra prose feedback unavailable to Jev). Physics and six-frame cadence stay
unchanged. Stop on the first failure, missed gate, total call cap or finish.

## r6 failure and route-orientation diagnostic

r6 cleared six gates but oscillated at the entrance to sector 7. At 49.8 simulated
seconds it had a high-water distance of 7,127 m, 1.3 seconds of grass and no wall
hits. 500 decisions were valid; attempt 501 failed with an unclassified provider
or validation error. Its total charge is unknown; successful responses reported
$0.045261258. Preserve the failed trial. The final error cannot be reconstructed
from its audit; subsequent runs retain safe network/timeout/JSON categories.

v3 included an ordered polyline but no explicit local forward direction and no
signed route progress. The sector 7 finish lies right of the car while the road
initially goes up-left. Jev repeatedly reversed toward the finish instead of
following that bend. v4 adds raw local forward tangent, named road samples at
fixed forward arc distances, their car-relative positions, and signed previous
progress (including backward movement). It retains the whole road and gate.
No action scoring, selected waypoint or steering policy is sent to any model.

Before another lap: compare v3 and v4 once on the previous 16 cases plus six exact
r6 sector-7 observations (calls 3, 7, 13, 16, 31, 91): 44 requests maximum, rotated
format order. Require v4 >=20/22 useful moves and all six loop observations to
advance on asphalt. If admitted, run one diagnostic continuation from the exact
r6 sector-7 entry state, including the unsettled camera, for <=150 calls. Require
the gate within 12 simulation seconds, >=90% asphalt and zero walls. This is a
fixture experiment, never a ranked/resumed lap. Only after passing both checks,
admit one new full-course v4 attempt. Keep all outcomes, including failures.

The first orientation batch stopped at request 25 (30-second API timeout). Its
24 successful calls scored v3 12/12 and v4 10/12; v4 failed both sector-4 grass
recoveries. Source and partial audit are retained in commit `979d2a9`.
No pilot or lap was admitted from this partial batch.

Next candidate, `surface-focused` (v5), delivers the exact v3 state and question
when on grass and the v4 orientation state and question when on asphalt. This
switch uses only the observed surface; it chooses no direction or waypoint. The
44-call comparison repeats the same fixed cases with v3 as control. The earlier
20/22 and six-loop-case threshold, single sector-7 diagnostic, and full-course
admission criteria apply unchanged. Keep every attempt and stop on API failure.

v5 passed 22/22 fixed states, including all six loop observations; v3 passed
21/22. The 44 requests cost $0.004486818. The single sector-7 pilot then cleared
the gate in 7.0167 simulation seconds, with 0.5333 seconds grass (92.4% asphalt),
zero walls and 71 decisions; cost $0.007306698. All used the same 1.13 snapshot.
The saved requests, choices and pilot trajectory have been re-executed locally.

These thresholds admit exactly one new full-course attempt, r7, using
`--observation-format surface-focused --sectors 18 --max-calls 2250`. This format
is now the shared reactive default; older formats remain explicitly selectable.
No live Opus/GPT trial is implied. Their existing legacy times are contextual,
not matched comparisons. No hidden steering, action replacement or rescue retry.

## Transport interruption and bounded recovery

r7 kept the v5 driving interface unchanged. It stopped at attempt 83 on
`Jev request timed out`, after 82 valid decisions, 1,517 m and 8.183 simulation
seconds. There were no wall hits. The timeout occupied 598.623 wall-clock seconds
(despite a 30-second active-time abort); the evidence does not establish whether
the host was suspended. Successful calls reported $0.008432508; whole-run cost is
unknown. Preserve r7 as an incomplete trial, not a navigation-budget failure.

r8 is a separate transport-recovery attempt: identical v5 observations, model and
physics, with explicit `--network-retries 1`. Only network/timeout, HTTP 408/429,
and HTTP 500/502/503/504 failures can be retried once at the unchanged state.
Invalid choices/distributions/JSON and other HTTP statuses still stop immediately.
Every failed request and retry is audited; retries consume both sector and total
attempt limits. A second consecutive failure stops. Any failure keeps total cost
unknown; no successful action is replayed or replaced. The no-retry default stays
available. This differs from the original transport protocol and is labeled so.
The full-course cap remains 2,250 attempts and 250 attempts per sector.

r8 completed all 18 gates in 102.867 simulated seconds, with 8.88 seconds grass,
zero wall-hit frames, and 1,035 valid requests out of 1,035 attempts. No retry was
needed. Reported cost: $0.104299692. Wall time: 389.537 seconds; response median
332.892 ms and p95 612.458 ms. The model snapshot remained 1.13-20260917.
The driving source was committed in `9655e3e`. Its replay is now selected on the
site, and every r1-r8 recording remains in the results manifest. This is a working
full lap, not proof of completion reliability or superiority over GPT/Opus.
