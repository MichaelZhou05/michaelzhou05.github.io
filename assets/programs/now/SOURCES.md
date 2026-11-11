# Building now sources

## External figure

`rekursiv-research-time.svg` is an unmodified copy of Figure 3b's fallback SVG from:
https://rekursiv.ai/blog/autoautoresearch/figures/wallclock-raw.svg

Article: https://rekursiv.ai/blog/autoautoresearch/
Title: “(auto)²-research: SoTA on Karpathy's NanoChat Benchmark”
Authors: Dan Kondratyuk, Junpeng Lao, Ming-Chang Chiu, Joshua V. Dillon.
Article date: September 14, 2026. Retrieved November 3, 2026.

Attribution: rekursiv.ai and the article authors. This is their NanoChat campaign,
not Michael Zhou's experiment, implementation, or measured performance.
The original SVG's accessible label explicitly says that two idle gaps are removed.
The original axes, annotations, points, and best-so-far line are preserved.
The page links both to the article and to this full-size local SVG.

## Local implementation evidence (read-only)

Local project: /Users/michaelzhou/Documents/Projects/AutoResearch
Reviewed scaffold commit: 335f2ed (feat: scaffold controlled search-dynamics benchmark).

- README.md and PROJECT.md: project scope, upstream lineage, current scaffold status.
- docs/architecture.md: shared interfaces and three topology-level policies.
- docs/study_protocol.md: draft controls, measurements, open decisions.
- docs/implementation_plan.md: delivered scaffold and production work remaining.
- docs/validation_and_protection.md: current path/hash checks versus planned isolation.
- src/autoresearch_bench/engine.py, loops/, providers/openai_responses.py: implemented boundaries.
- tests/test_dry_run.py and configs/studies/local_dry_run.toml: deterministic synthetic runs.

No local research-performance plot is published: mock deltas exercise control flow
and are not scientific results. The upstream progress.png was not used as evidence
of Michael's results. No hidden-test contents, credentials, private datasets, or
internal logs were read or copied.

Public fork verified: https://github.com/MichaelZhou05/autoresearch
The public default branch presents the upstream AutoResearch training setup.
Scaffold status on this page is grounded in the local checkout, not assumed
to be a published release. The local README remote note is stale: origin exists.
