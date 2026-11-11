# Portfolio navigation prototypes

Six complete HTML pages, isolated from the existing homepage:

- `cartridges.html` — Cartridge Library
- `workbench.html` — Workbench OS, file browser and terminal
- `overworld.html` — Top-down pixel world, clickable destinations and keyboard movement
- `room.html` — Isometric pixel room, books, computer, project notes, lamp and cat
- `bookshelf.html` — Books and chapter navigation
- `fieldboard.html` — Draggable pinned notes and project dossiers

Run `npm run dev` from the repository root, then open
`http://127.0.0.1:4173/prototypes/`.

The gallery opens a focused view of each concept. “View in the full site” shows
the complete page with a copy of the current intro, sidebar, coffee game, map,
easter eggs, and contact section. The original `index.html` and `styles.css`
are not edited. Generated pages load the shared existing assets via `../`.

`content.js` is the shared editorial source. Auto Research is deliberately a
placeholder for later details; other content comes from the existing site.
The terminal is a browser-local portfolio filesystem. It never invokes a real
shell, reads your disk, or sends commands to a server. Supported commands:
`help`, `ls`, `cd`, `pwd`, `cat`, `tree`, `open`, `whoami`, `uname`, `date`,
`echo`, `history`, `clear`, `exit`, `neofetch`, and `man`. Arrow keys navigate
history; Tab completes paths. The terminal and all scenes work with touch and
keyboard access, with labeled alternatives to the canvas hotspots.

The existing racing and Vim games are loaded into same-origin frames when
requested. `race.html` and `vim.html` reuse their original markup and modules.

Regenerate complete pages after updating the original page or concept names:

```sh
node prototypes/build.mjs
```

No dependencies or build step are required to run the generated pages.

## Floppy-disk laptop studies

Open `disks.html` to compare Graphite, Platinum, and Night Shift. Each design
has four square floppy disks, a selectable shelf, an insert button and drive
slot, animated insertion and ejection, swapping, and desktop drag-and-drop.
Keyboard and touch users can select a disk and press Insert. Escape ejects a
mounted disk while focus is within the study. Reduced motion skips the flight
animation. These studies stop at a mounted volume placeholder; they do not
implement any of the per-disk programs.

`disk-graphite.html`, `disk-platinum.html`, and `disk-studio.html` place the
respective design into a copy of the full homepage. Regenerate them with:

```sh
node prototypes/build-disks.mjs
```
