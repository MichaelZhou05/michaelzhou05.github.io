# Live Jev trials — 18 October 2026

These are real OpenRouter Decisions API calls, made locally on macOS with Node 24.
The API key was loaded from the user's Bash configuration and is not stored here.
All trials requested `typesafe/jev-1.13`; the served snapshot is recorded per run.
Each was configured for 18 sectors with a 2,250-call cap, stopping on a failed
response or a sector budget exhausted before the gate. No hidden retries.

## Latest result: r4 (corrected adapter)

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

`jev-lap.js` points to r4. Because `finished` is false, it does not enter the replay
grid. This is one navigation failure, not a measured completion rate or proof of
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
and `stopReason` in each artifact; incomplete runs never enable the race replay.
