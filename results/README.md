# Live Jev trials — 18 October 2026

These are real OpenRouter Decisions API calls, made locally on macOS with Node 24 (r5: v24.11.1, arm64).
The API key was loaded from the user's Bash configuration and is not stored here.
All trials requested `typesafe/jev-1.13`; the served snapshot is recorded per run.
Each full-course trial was configured for 18 sectors with a 2,250-call cap, stopping on a failed
response or a sector budget exhausted before the gate. r1-r7 had no retries;
r8 explicitly permits one logged transient-network retry at an unchanged state.
Preflight and short-pilot files are diagnostics, not full-course trials.

## Latest result: r8 (route orientation v5)

**Completed all 18 sectors: 102.867 simulated seconds, 20,827 m scored distance.**
The blue car now replays this complete run from `jev-lap.js`.

- 8.88 seconds on grass (8.6% of the lap); zero wall-hit frames.
- 1,035 valid requests / 1,035 attempts. One transient retry was permitted but
  none was needed. No choice was replaced or overridden.
- Response p50 332.892 ms, p95 612.458 ms, mean 374.689 ms.
- Whole-run wall time 389.537 seconds (about 6 minutes 30 seconds).
- OpenRouter-reported cost $0.104299692 USD.
- 2,483,326 input tokens and 92,648 output tokens.
- Same model snapshot as the earlier trials: `typesafe/jev-1.13-20260917`.
- Driving source at commit `9655e3e`; artifact/audit contain exact source hashes.

For context, the saved legacy Opus lap is 114.117 seconds and GPT/Sol is 95.933
seconds. This run is 11.250 seconds faster than that Opus recording and 6.934
seconds slower than GPT. Their different action durations, session history and
control protocols prevent treating this as a matched cross-model benchmark.
This is one successful development attempt, not a measured completion rate.
All earlier failures and timeout-interrupted runs remain below and in the manifest.

## Input investigation after r5

The original input comparison passed 10/16 fixed driving/recovery cases with v2
and 16/16 with direct structured geometry (v3). Its two-sector pilot cleared both
gates in 11.500 simulated seconds with 0.02 seconds on grass and no walls.

r6 then cleared six sectors but oscillated at the start of sector 7. Its scored
high-water distance was 7,127 m at 49.800 seconds, with 1.3 seconds grass and zero
walls. The finish lay to the right while the nearby road first went up-left;
the model repeatedly reversed along that road. Attempt 501 failed with an
unclassified error. Successful calls reported $0.045261258; total cost is unknown.

Adding forward orientation everywhere (v4) regressed two grass-recovery states.
That 24-response diagnostic also ended on a timeout. v5 preserves the v3 recovery
input on grass and adds forward geometry and signed progress on asphalt. It passed
22/22 fixed cases, including six exact r6 loop observations. Its single sector-7
continuation pilot cleared the gate in 7.0167 seconds, with 0.5333 seconds grass
and no walls. This fixture continuation is not a ranked lap.

r7 used v5 and stopped on an API timeout after 82 valid decisions: 1,517 m,
8.183 simulated seconds, no walls. The failed attempt took 598.623 wall seconds;
the trace cannot determine why the active-time timeout differed from wall time.
Successful calls reported $0.008432508; whole-run cost is unknown. r8 tests the
same driving input with one explicitly logged transient retry; all attempt caps
and physics remain unchanged. See the [experiment protocol](jev-preflight-protocol.md)
for admission criteria, complete diagnostic results and exact audit artifacts.

These observations support an input-quality problem and an improvement on the
sampled cases. They do not establish parity with Opus/GPT or a completion rate.

## Historical result: r5 (corrected protocol v2)

- **DNF at 237 m:** cleared no sectors; exhausted the sector-1 (START · T13)
  250-call / 25-second budget. The command requested all 18 sectors; later sectors
  were not attempted. This is scored distance from the lap origin (the grid starts
  at 14 m), not a completed lap or cumulative path length.
- 25.000 simulated seconds; 23.72 seconds on grass (94.9%); 146 wall-hit frames.
- 250 valid responses / 250 attempts; zero request failures and no retries.
- Response p50 **428.764 ms**, p95 **832.956 ms**, mean **496.568 ms**.
- Total wall time **124.407 seconds** (about 2 minutes 4 seconds).
- OpenRouter-reported run cost **$0.019521978 USD**.
- 464,809 input tokens; 22,500 output tokens.
- Served model: `typesafe/jev-1.13-20260917`, same as r4.
- Two legal returned choices differed from the published probability argmax; both
  were executed unchanged. Probabilities and confidence are retained.

r5 remains available in its original artifact and audit. Its recorded endpoint
is classified DNF and excluded from completed-lap rankings.

Protocol `local-road-v2-six-frames` corrects the world-unit/pixel width mismatch,
counterclockwise camera convention, speed during zoom transitions, and typed
Choice instructions. It supplies up to 18 local car-relative road samples, all
nine movement vectors and previous executed action feedback to every provider.
The harness performs geometric transforms, never route optimization or action
selection. The action interval is six frames (0.1 seconds, about 17 settled
asphalt pixels). All new reactive providers share it. The sector still permits
1,500 frames, now up to 250 calls; the retained 2,250 total-call cap means at most
225 simulated seconds, versus r4's 450. See [the complete protocol](../scripts/RACE-BENCHMARK.md).

| Measurement | r4: previous protocol | r5: corrected protocol |
| --- | ---: | ---: |
| Completed lap | No | No |
| Scored distance | 4,991 m | 237 m |
| Sectors cleared | 4 | 0 |
| Simulation time | 101.700 s | 25.000 s |
| On grass | 73.62 s (72.4%) | 23.72 s (94.9%) |
| Wall-hit frames | 72 | 146 |
| Valid / attempted calls | 509 / 509 | 250 / 250 |
| Action interval | 12 frames | 6 frames |
| Response p50 / p95 | 409.059 / 652.335 ms | 428.764 / 832.956 ms |
| Whole-run wall time | 226.933 s | 124.407 s |
| Reported cost | $0.034198332 | $0.019521978 |

**The corrected run navigated worse.** Lower whole-run cost and wall time reflect
its earlier stop, not improved efficiency or cost per successful lap. It spent
most of sector 1 on grass, repeatedly alternating directions without recovering.
All 250 delivered observations and the entire recorded trajectory were independently
re-executed from the audited choices with the shared physics; they match the
saved positions, grass time, wall hits and endpoint. This supports fidelity of
the harness, not adequacy of the model's geometric reasoning or the new prompt.

One before/after run with simultaneous geometry, wording and cadence changes
cannot identify which change affected behavior. There is no controlled ablation,
completion-rate estimate, or matched live Opus/GPT baseline. The failure was retained. Subsequent input experiments are documented separately
above; they are not repeats of this configuration.

## Previous result: r4 (corrected adapter)

- **Incomplete:** 4,991 m; cleared sectors 1–4, exhausted the 125-call / 25-second
  limit in sector 5 (Fuchsröhre). No completed lap time is reported.
- 101.700 simulated seconds; 73.62 seconds on grass; 72 wall-hit frames.
- 509 valid responses / 509 attempts; zero request failures.
- Response p50 **409.059 ms**, p95 **652.335 ms**, mean **444.617 ms**.
- Total wall time **226.933 seconds** (about 3 minutes 47 seconds).
- OpenRouter-reported run cost **$0.034198332 USD**.
- 814,246 input tokens; 45,654 output tokens.
- Served model: `typesafe/jev-1.13-20260917`.
- Three returned choices differed from the published probability argmax; they were
  executed unchanged and flagged in the recording.

`results/jev-2026-10-18-r4.js` preserves the earlier replay. Because
`finished` is false, it is classified DNF and excluded from the finish-time ranking. This is one navigation failure, not a measured completion rate or proof of
an advantage over another model. The command requested all 18 sectors; the stop
rule ended the run at sector 5. Later sectors were not attempted.

Verify published results against their audit sidecars with `npm run test:race-results`.

## Adapter investigation

Trials r1–r3 stopped during validation and must not be pooled with r4 as repeated
measurements of one fixed configuration. Their original recordings and audit logs
are retained. r1 predates safe error detail logging. r2 identified probability
validation as the reason. r3 captured the rejected probability vector: the API
returned `up+right` at 0.19 while `up+left` had 0.20. The nine probabilities summed
to 1. This contradicted the adapter's argmax assumption, not the allowed action set.

The corrected adapter executes the API's returned legal choice unchanged and records
`choiceMatchesArgmax`. It still validates the allowed action, distribution keys,
probability ranges/sum and confidence. It does not substitute the maximum-probability
action or change movement physics. A regression test uses the observed vector.

The diagnostic JSON is a single replayed observation, not a race. An earlier
unsuccessful diagnostic request yielded no preserved HTTP/usage evidence. Its
charge is unknown; the retained diagnostic JSON does not represent total spend.
Run costs are not a total invoice for this investigation.

The audit config holds source hashes and prompts. The original adapter for r1 is
in commit 364a7d8; r2 adds safe error labels, r3 adds a numeric validation summary,
and r4 includes the legal-choice fix. No route heuristic or model prompt was tuned
between these trials. Earlier failures do not establish a model completion rate.

## Interpretation

The results demonstrate measured response latency and reported request cost for
this Jev configuration. They cannot establish a speed/cost advantage over Opus or
GPT because those configurations have not been measured under the same controls.
A full-lap command is an attempt, not evidence of a completed lap. Check `finished`
and `stopReason` in each artifact; incomplete replays stop at their recorded endpoint and are classified DNF.
