# Current direction: keep the original website

The latest previews modify only navigation and main-column information disclosure on the original page:

- `http://127.0.0.1:4174/?nav=ui` — clickable sections.
- `http://127.0.0.1:4174/?nav=shell` — the same sections plus a functional navigation shell.
- Without `?nav=`, the original long page still works as before.

Run `PORT=4174 npm run dev`. About me is the starting section. The original sidebar, espresso, map, secrets, portrait and games remain mounted. Only the selected main section is shown. Project articles open as native disclosures; work experience retains its original expandable work logs, with shorter closed summaries. The Playground entry uses the supplied demo URL.

Shell commands: `cd projects`, `cd experience`, `cd race`, `cd contact`, `cd about`, `cd ..`, `cd /`, `ls`, `pwd`, `help`, `clear`. Nested paths include `projects/playground` and `experience/duke`; `ls` lists available children. Relative and absolute paths work, with top-level section names accepted from anywhere. Up/down recalls commands. This is a portfolio navigator, not an operating-system shell.

Links preserve browser history and reload state. Switching between the two navigation modes keeps the selected directory. Inputs do not propagate keyboard events to the games. Native section links remain the fallback if JavaScript is unavailable. The race harness and benchmark internals are untouched.

Validation: `npm run check`, `node --check section-navigation.js`, and `NODE_PATH=<your Playwright node_modules> node scripts/check-section-navigation.cjs` with the local server running. The smoke test covers both modes at 1280px/390px, folder navigation, back/forward/reload, sidebar preservation, starting the race, missing folders, command history, overflow, runtime errors, and the unchanged default page. Desktop and mobile screenshots inspected. Not a full screen-reader audit.

The earlier standalone experiments below remain available for comparison; they are no longer the proposed overall direction.

---

# Portfolio prototype lab

Three working alternatives for project discovery, designed for quick engineering/team-match review. These are additive experiments: the production entry point, race/benchmark internals, espresso and easter eggs are unchanged. Nothing has been selected as the final design.

## Preview

```sh
npm run dev
# If another worktree uses 4173:
PORT=4174 npm run dev
```

Open `/prototypes/` on the printed local address. The persistent direction switcher links to:

- `/prototypes/?view=arcade` — compact cartridge shelf, direct demo links, native dialog case studies.
- `/prototypes/?view=terminal` — functional local commands, clickable project shortcuts, command history.
- `/prototypes/?view=workbench` — compact project index with Demo and Read more actions; stories open on demand.

No build step or new runtime dependencies. Existing portrait and pixel fonts are reused. Fonts fall back to monospace offline. The lab is marked `noindex`; the root homepage is untouched.

## Compare the directions

| Direction | Strength | Tradeoff |
| --- | --- | --- |
| Cartridge shelf | Small pixel cartridges; direct Demo and Read more actions | Engineering details stay behind Read more; compact glyphs replace large covers |
| Terminal | Personal, exploratory; useful commands rather than a fake typing animation | Less immediate on a phone, so every project also has a normal button |
| Workbench | Densest project scan with direct demo links and on-demand case studies | Less playful; a click is needed for the engineering story |

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
| Playground AI | Existing `index.html` project entry and owner-provided demo URL | 1,000+ is a design target, not adoption. The old GitHub link only targets a profile, so no project repository is implied. The owner supplied a development workspace demo on October 18; its exact URL is linked without claiming unauthenticated access. |
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

## Compact discovery revision

All directions now keep full case studies closed until requested. The shelf replaces large cover illustrations with small glyphs, the workbench becomes a dense project index, and terminal shortcuts expose the same Demo / Read more choices. The shorter intro puts projects closer to the top. Playground links directly to the owner-provided development workspace; the research browser could not inspect that URL, so demo availability/login requirements remain unverified.
