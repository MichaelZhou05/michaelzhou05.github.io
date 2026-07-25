# Michael Zhou — Personal Portfolio

A zero-dependency, retro-styled portfolio on a pure-black canvas, with a playable
top-down human-vs-agent race and a handful of pixel-art easter eggs.

## Run locally

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

## Race game

Inspired by [GBA Eval](https://gbaeval.com), which grades frontier models by
publishing the artifacts they produced and letting you play them rather than
asking you to trust a score. Same idea at a much smaller scale: the lap times on
the page are recordings of real runs, and you can drive the harness yourself.

Use the arrow keys or WASD to drive a hand-drawn Nürburgring Nordschleife
one sector at a time, and beat the two USV models to the line. The page itself runs
entirely in the browser with no backend or API key.

The track is not the real circuit. `nordschleife.js` is a spline through 84
control points placed by eye; it follows the real Nordschleife's order of named
corners and is rescaled so the centreline totals the real 20.832 km, but corner
shapes, the gaps between them, and the road width are all approximations.

### Both model racers are real laps

`USV OPUS 5` is not a pace multiplier. `opus-lap.js` is a recording of a lap that
**claude-opus-5** actually drove: it was shown each sector window the way the page
draws it for you — the road as a screen-space polyline, its car's position in it,
the gate it has to cross — and it replied with arrow-key programmes. Those key
presses were run through `stepDriver` in `race-sim.js`, which is the same function
the browser calls on your keyboard. Same four keys, same grass penalty, same
treeline. Whatever it did with them is the line you race against.

`race-sim.js` exists so there is exactly one copy of that physics: the browser and
the offline harness import it rather than each keeping their own.

To make it drive a fresh lap:

```bash
npm run opus-lap
```

Inference goes through the local Claude Code CLI in headless mode, so no API key is
needed — but it is real inference, and a full lap costs a few dollars. The whole lap
is one resumed session, so the model carries what it learns from sector to sector.
Pass `--sectors 2` to try a short run first.

`USV 5.6 SOL XHIGH` works the same way. It runs `gpt-5.6-sol` through the local
Codex CLI with `model_reasoning_effort="xhigh"`, gives the agent the same sector
window, car position, road polyline, and gate as Opus, and records the resulting
four-key input through the shared physics. Regenerate it with:

```bash
npm run sol-lap
```

## Easter eggs

Six secrets are scattered across the page; the sidebar tracks how many you've found
(progress is kept in `localStorage`).

| Secret | Where |
| --- | --- |
| The cat purrs | A pixel cat follows your cursor — click it |
| Lights out, stars on | The moon beside the hero kicker toggles the starfield |
| Wish granted | One doodle, on the contact panel, is clickable |
| Caught a ghost | A ghost drifts in every so often — catch it before it fades |
| Secret boot log | Click the blinking cursor block in the wordmark three times |
| Arcade mode | ↑ ↑ ↓ ↓ ← → ← → B A |

Sprites live in `sprites.js` (authored as silhouettes; outlines are drawn by the
renderer) and the behaviour lives in `friends.js`. All of it respects
`prefers-reduced-motion`, and the cursor cat is skipped on touch devices.
