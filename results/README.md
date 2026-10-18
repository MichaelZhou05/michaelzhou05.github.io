# Live Jev trials — 18 October 2026

These are real OpenRouter Decisions API calls, made locally on macOS with Node 24 (r5: v24.11.1, arm64).
The API key was loaded from the user's Bash configuration and is not stored here.
All trials requested `typesafe/jev-1.13`; the served snapshot is recorded per run.
Each was configured for 18 sectors with a 2,250-call cap, stopping on a failed
response or a sector budget exhausted before the gate. No hidden retries.

## Latest result: r5 (corrected protocol v2)

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

`jev-lap.js` now points to r5. The blue car remains active on the grid with no
garage message, replays the actual positions, stops at the recorded endpoint, and
is classified DNF. It is excluded from the finish-time ranking.

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
completion-rate estimate, or matched live Opus/GPT baseline. We retained the
failure without another paid attempt or tuning after seeing the result.

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
