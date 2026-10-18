# Nordschleife: a decision-system experiment

The question is whether a cheap, low-latency decision interface can sustain useful
navigation quality. Do not assume the answer. The old laps demonstrate navigation,
not response speed. Do not combine their scores with matched runs into one ranking.

## Tracks and clocks

* **Matched reactive**: `--mode reactive`, all three providers. Same physics,
  observation fields, current state plus latest action feedback, nine directions,
  one 12-frame action, 125 calls and exactly 1,500 simulated frames per sector.
  Stateless requests. A missed gate or failed response ends the trial. The offline
  camera eases identically for all models. Their trajectories and inputs diverge;
  this is closed-loop navigation, not an identical-prompt latency microbenchmark.
* **Legacy plan**: existing Opus/GPT recordings, variable action sequences and
  resumed sessions. Retained for playable replays; no retroactive latency estimates.
* **Simulation seconds** measure executed physics frames only. **Response ms** span
  invocation through response parsing and action validation, including CLI startup
  or HTTP transport. **Wall ms** span setup after argument parsing through the
  in-memory result construction, including calls, simulation, logging and failures,
  excluding final recording serialization/write. Simulation runs faster than real
  time, so wall time is not simulation seconds plus inference seconds.

Latency quantiles use nearest rank on valid responses. The total includes failed
attempts; failed count stays visible. No harness retries; any internal CLI retries remain inside the measured invocation. Cold first calls are
included. No inference-overlap or real-time driving claim is supported.

## Reproduce without overwriting the garage

Node 20+ and the existing Claude/Codex CLIs are required. Jev uses
`TYPESAFE_API_KEY` from the environment. Never place credentials in an artifact.
Commands below make paid calls or consume subscription quota. Agree on a budget
before running them. `--max-calls` is a hard attempt cap, **not a dollar cap**.

```sh
node scripts/run-opus-racer.mjs --agent jev --model jev-1.13.0 --mode reactive --sectors 1 --max-calls 10 --out tmp/jev-r1.js
node scripts/run-opus-racer.mjs --agent opus --mode reactive --sectors 1 --max-calls 10 --out tmp/opus-r1.js
node scripts/run-opus-racer.mjs --agent sol --mode reactive --sectors 1 --max-calls 10 --out tmp/sol-r1.js
```

These are bounded smoke trials, unlikely to finish even one sector. For full laps,
use `--sectors 18 --max-calls 2250` only after pilot cost/quality review. Use unique
output names: an existing audit file is never overwritten. Every attempt is flushed
to `<out>.audit.jsonl`; a process crash may leave just that log. Normal provider or
validation failures produce an incomplete recording and stop reason. A trial that
exhausts its sector budget does not skip ahead to claim completion.

Pin Jev's version; aliases can move. The CLI model names are requested identifiers,
not verified resolved versions. Record CLI versions, host/region, date, subscription
or billing route, and reasoning settings alongside published runs. GPT uses xhigh;
this is deliberately the existing portfolio configuration, not its lowest-latency
setting. A lower-effort experiment must be separately labeled.

## Evidence and publication rule

Each recording has source hashes, clocks, cost basis, model/configuration metadata,
replay positions and completion status. The audit sidecar contains the system
prompt, each observation/feedback prompt, response, usage, per-attempt duration and
validation outcome. No raw CLI stderr or HTTP error body is published.

Run at least five repeats per configuration; rotate Jev/Opus/GPT order between
repeats, use the same machine and sector/call budgets, and retain every failure.
Report completion rate first, then simulated lap time among completions, grass,
wall hits, latency p50/p95 with sample counts, whole-run wall time and cost.
Do not select only the best lap. Report run-level spread; calls within a lap are
correlated and are not independent repeated experiments. Claim a speedup only
between equivalent configurations with adequate completion quality, and distinguish
per-call ratios from whole-workflow ratios. No such claim is currently supported.

To publish reviewed results, copy recordings **and audit sidecars** into `results/`
and import each recording in `race-results.js`, preserving failed replicates.
The methodology table reads that manifest. Existing `jev-lap.js` remains null until
a real completed run is separately chosen for the playable garage.

## Cost evidence (checked 2026-10-18)

* [TypeSafe models](https://docs.typesafe.ai/models): Jev 1.13/1.14 input
  $0.042/M tokens, output free. Estimate = reported input tokens × 0.042 / 1e6.
  Unsupported model versions or missing usage yield null. Failed requests make
  whole-run cost unknown because their billing cannot be inferred.
* [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing):
  Opus 5 standard input $5/M, output $25/M; cache writes/reads have separate rates.
  For fresh reactive sessions, this runner reports CLI `total_cost_usd` only when present for every attempt. Resumed legacy cost remains unknown to avoid summing potentially cumulative session totals.
  It is a provider-tool estimate, not verified cash expenditure.
* [OpenAI model](https://developers.openai.com/api/docs/models/gpt-5.6-sol):
  GPT-5.6 Sol input $4/M, cached input $0.40/M, output $20/M. The CLI's billing
  route and usage semantics are not established here, so cost stays null. Do not
  multiply the old recording's cumulative-looking token counters by current rates.

The price gap motivates the experiment; it does not establish cost per successful
lap. Different tokenizers, call counts, caching, reasoning tokens and failures matter.

## Offline validation

```sh
npm run check
npm run test:race
```

Tests use explicit mock providers, never credentials or billed calls. Their output
is temporary and must not be published as measured evidence.
