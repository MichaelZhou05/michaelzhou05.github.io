# Portfolio prototype lab

Three working alternatives for project discovery, designed for quick engineering/team-match review. These are additive experiments: the production entry point, race/benchmark internals, espresso and easter eggs are unchanged. Nothing has been selected as the final design.

## Preview

```sh
npm run dev
# If another worktree uses 4173:
PORT=4174 npm run dev
```

Open `/prototypes/` on the printed local address. The persistent direction switcher links to:

- `/prototypes/?view=arcade` — cartridge shelf, filterable project covers, native dialog case studies.
- `/prototypes/?view=terminal` — functional local commands, clickable project shortcuts, command history.
- `/prototypes/?view=workbench` — project selector beside the full engineering story; horizontal selector on phones.

No build step or new runtime dependencies. Existing portrait and pixel fonts are reused. Fonts fall back to monospace offline. The lab is marked `noindex`; the root homepage is untouched.

## Compare the directions

| Direction | Strength | Tradeoff |
| --- | --- | --- |
| Cartridge shelf | Most playful, visual scanning; demos and case studies clearly distinguished | A second click is needed for engineering detail; illustrative covers are not product screenshots |
| Terminal | Personal, exploratory; useful commands rather than a fake typing animation | Less immediate on a phone, so every project also has a normal button |
| Workbench | Fastest access to ownership, design choices, evidence and limitations | Denser and less surprising; selected details run longer on mobile |

Shared filters organize projects by technical interest. Case studies explain contribution, a decision, evidence/impact and limits. Direct demo/source actions let reviewers inspect the work. Existing work history remains a secondary link rather than a chronological wall. Race, Vim, coffee and the original secrets remain one link away; no iframe or copied benchmark implementation.

Terminal commands: `help`, `ls`, `open race`, `demo vim`, `source race`, `filter all|ai|tools|data`, `coffee`, `clear`. Project IDs: `race`, `vim`, `playground`, `benchmark`, `amdahl`. Arrow up/down recalls commands. Commands never execute a shell. Output uses `textContent`; unknown commands are displayed safely. Demo/source commands return explicit links rather than navigating unexpectedly.

## Concrete design references

Browsed October 18, 2026:

- [Bruno Simon](https://bruno-simon.com/), including his [HTML project index](https://bruno-simon.com/html/): playful exploration can coexist with a straightforward path to projects. The cartridge direction borrows that principle, not his 3D driving interface.
- [Brittany Chiang](https://brittanychiang.com/): compact project summaries, visible technology context and direct artifact links. The workbench extends that quick scan into explicit decisions and evidence.
- [Josh W. Comeau](https://www.joshwcomeau.com/) and [Building an Effective Developer Portfolio](https://storage.googleapis.com/joshwcomeau/building-an-effective-dev-portfolio.pdf): explorable explanations and deeper project detail. All directions expose small system-flow diagrams and link to real playable work rather than making a résumé the main experience.

The terminal is an original fit for this site's existing Vim/retro personality, not a reproduction of these references.

## Content evidence and boundaries

`projects.js` is the shared authored content source. No new success metrics were invented.

| Project | Evidence inspected | Boundary |
| --- | --- | --- |
| Nordschleife | Root README, `app.js`, `race-sim.js`, `race-method.html` | Describes shared physics/replays, not new race results. Notes approximate track and unmatched controls. No Jev internals changed. |
| learn NvChad | Root Vim entry, `vim-game.js`; [linked repository README](https://github.com/MichaelZhou05/learnNvim) fetched through GitHub API | Trainer state/drill behavior comes from the README. Browser simulation is not the real Neovim runtime. |
| Playground AI | Existing `index.html` project entry | 1,000+ is a design target, not adoption. The old GitHub link only targets a profile, so no project repository or demo is implied. |
| Everyday dev benchmark | Existing `index.html` project entry | Eight categories/three in-house are portfolio-reported. No fabricated scores or decorative chart bars presented as results. Repository remains private. |
| Amdahl | Existing `index.html` project entry | 10,000+ pages / 85% are explicitly portfolio-reported; no independent measurement artifact available. |

Ownership is described only at the level supported by current materials. Private projects need project-specific artifacts and more detailed authorship/architecture evidence before a final public case study can go further. This prototype makes those gaps visible rather than filling them with invented details.

## Verification

```sh
npm run check
node --check prototypes/lab.js
node --test scripts/portfolio-prototypes.test.mjs scripts/vim-game.test.mjs
# With Playwright installed in your environment and the preview server running:
PORTFOLIO_URL=http://127.0.0.1:4174 node scripts/check-portfolio-prototypes.cjs
```

The browser smoke script checks all three directions at 1280px and 390px, page overflow, filtering, dialog dismissal, command errors/history, terminal focus restoration, reduced-motion styling, original game elements and JavaScript errors. It saves screenshots in the OS temporary directory for visual inspection. `NODE_PATH` may point to an existing Playwright installation; no project dependency is required.

Manual visual inspection covers desktop and mobile layouts plus the case-study treatment. Native links/buttons, labelled input, skip link, visible focus, native modal focus trapping/Escape and reduced-motion CSS are implemented. This is not a full screen-reader audit. Touch project navigation is available; the original Vim race still requires a keyboard.
