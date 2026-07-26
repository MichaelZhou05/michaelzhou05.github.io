/**
 * Draws `assets/mz-avatar.svg` — the sprite behind the dot-matrix glass.
 *
 * It is deliberately not a likeness. It is a small player caught at the top of
 * the backswing on a dusk fairway, with a power meter running along the bottom
 * of the frame, because the whole page is dressed as a handheld and this is
 * what the character select screen would look like.
 *
 * Everything is drawn on a 36x48 cell grid at 4 units a cell, so the art lands
 * on the same lattice as the `--matrix` overlay in `styles.css` and reads as an
 * LCD image rather than a picture behind one. The shapes are generated rather
 * than hand-typed: at this size a limb is a thick line and a head is a disc,
 * and maths keeps them round where typed rows never quite are.
 *
 *   npm run avatar
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const W = 36;
const H = 48;
const CELL = 4;

/* The console palette from `styles.css`, plus the grass, the skin and the two
   dusk tones. Nothing else is allowed in — the sprite has to sit inside the
   same colours the rest of the page is built from. */
const C = {
  ink: '#0b0a14',
  night: '#0e0b22',
  duskHigh: '#151032',
  duskMid: '#241a4a',
  duskLow: '#3a2f6e',
  ember: '#e85d04',

  grass: '#17683a',
  grassLit: '#1d7b46',
  grassEdge: '#0d3f27',

  amber: '#ffb000',
  cream: '#fff6de',
  teal: '#5eead4',
  red: '#e60012',
  redLit: '#ff5566',

  white: '#e8e4f4',
  plate: '#b0a8c8',
  grey: '#8a849f',
  greyDim: '#4a4560',

  skin: '#d7a97e',
  skinLit: '#f0c99c',
  skinDim: '#9a744f',
  hair: '#17141f',
};

const px = Array.from({ length: H }, () => Array(W).fill(C.night));
const set = (x, y, colour) => {
  const cx = Math.round(x);
  const cy = Math.round(y);
  if (colour && cx >= 0 && cx < W && cy >= 0 && cy < H) px[cy][cx] = colour;
};

const rect = (x, y, w, h, colour) => {
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) set(x + dx, y + dy, colour);
  }
};

const disc = (cx, cy, r, colour) => {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      if (Math.hypot(x - cx, y - cy) <= r) set(x, y, colour);
    }
  }
};

/** A limb: a line with width, drawn by walking discs along it. */
const limb = (x0, y0, x1, y1, thickness, colour) => {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) || 1;
  for (let n = 0; n <= steps; n += 1) {
    const t = n / steps;
    disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thickness / 2, colour);
  }
};

/** Filled polygon, scanline style — the torso and the shorts are trapezoids. */
const poly = (points, colour) => {
  const ys = points.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y += 1) {
    const hits = [];
    for (let i = 0; i < points.length; i += 1) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      if (ay === by) continue;
      if (y >= Math.min(ay, by) && y < Math.max(ay, by)) {
        hits.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      for (let x = Math.round(hits[i]); x <= Math.round(hits[i + 1]); x += 1) set(x, y, colour);
    }
  }
};

/* ---------------------------------------------------------------- 1. dusk */

// Five flat bands, indigo down to ember at the horizon. Flat, not a gradient:
// a smooth ramp across 36 cells would dither, and an LCD cannot dither.
[
  [0, 10, C.night],
  [10, 18, C.duskHigh],
  [18, 24, C.duskMid],
  [24, 29, C.duskLow],
  [29, 33, C.ember],
].forEach(([from, to, colour]) => rect(0, from, W, to - from, colour));

disc(27, 33, 6, C.amber); // the sun, half gone behind the horizon
disc(27, 33, 4.4, C.cream);

// A fixed-seed scatter, so the file regenerates byte-identical.
let seed = 20281105;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
for (let n = 0; n < 18; n += 1) {
  const x = Math.floor(rand() * W);
  const y = Math.floor(rand() * 16);
  set(x, y, rand() > 0.6 ? C.white : C.greyDim);
}

/* -------------------------------------------------------------- 2. fairway */

rect(0, 33, W, H - 33, C.grass);
for (let y = 33; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    if ((x + y * 2) % 8 < 4) set(x, y, C.grassLit); // mown stripes, running away
  }
}
rect(0, 33, W, 1, C.grassEdge);
set(7, 42, C.white); // the ball, teed up and still there
set(7, 43, C.plate);

/* --------------------------------------------------------------- 3. player */

/* Chibi proportions — a head roughly a third of the body, because a realistic
   one leaves four cells for a face and a face is the whole ask. He is at the
   top of the backswing, turned down the target line to the left. */

limb(17, 30, 13, 41, 3, C.duskMid); // trail leg
limb(17, 30, 21, 41, 3, C.duskMid); // lead leg
rect(11, 41, 4, 2, C.white); // shoes
rect(20, 41, 4, 2, C.white);
rect(11, 42, 4, 1, C.plate);
rect(20, 42, 4, 1, C.plate);

poly([[13, 22], [22, 22], [23, 31], [12, 31]], C.white); // polo
rect(12, 29, 12, 2, C.teal); // hem stripe
limb(20, 24, 25, 16, 2.2, C.white); // arms, cocked high
rect(24, 15, 3, 2, C.greyDim); // glove
limb(25.5, 16, 33, 5, 1.2, C.plate); // shaft
rect(32, 3, 3, 2, C.grey); // clubhead

// Head. The light is the sunset behind his trail shoulder, so the lit tone
// sits low and left and the plain skin tone is the shadow side.
disc(16, 17, 5, C.skin);
disc(15.6, 17.6, 4.1, C.skinLit);
rect(20, 14, 2, 4, C.hair); // hair at the back of the head
set(21, 18, C.skin); // ear

/* The face gets eight rows under the cap, which is the whole reason the head
   is a third of the body. Two rules hold it together at this size: a clear row
   of skin between brows and eyes, or they merge into sunglasses; and a clear
   column between the trailing eye and the hair, or they merge into a bruise. */
rect(13, 16, 2, 1, C.hair); // brows, set
rect(17, 16, 2, 1, C.hair);
rect(13, 18, 2, 2, C.ink); // eyes, both left down the target line
rect(17, 18, 2, 2, C.ink);
set(13, 18, C.white); // catchlights
set(17, 18, C.white);
// No nose. A nose and a mouth in the same warm brown, three rows apart, read
// together as a goatee at the size this actually renders at.
rect(15, 21, 2, 1, C.hair); // mouth, shut

rect(12, 11, 9, 1, C.redLit); // cap crown
rect(11, 12, 11, 3, C.red);
rect(11, 12, 11, 1, C.redLit);
rect(6, 14, 6, 2, C.red); // brim, pointing down the target line
rect(6, 14, 6, 1, C.redLit);

/* ------------------------------------------------------------ 4. the meter */

// A power meter, because this is a character select screen for a person.
rect(3, 44, 30, 2, C.ink);
rect(3, 44, 22, 2, C.amber);
rect(3, 44, 8, 2, C.teal);

/* ------------------------------------------------------------- 5. the frame */

for (let n = 0; n < W; n += 1) {
  set(n, 0, C.ink);
  set(n, H - 1, C.ink);
}
for (let n = 0; n < H; n += 1) {
  set(0, n, C.ink);
  set(W - 1, n, C.ink);
}
// Corner brackets, the way a viewfinder marks its own corners.
[[1, 1, 1, 1], [W - 2, 1, -1, 1], [1, H - 2, 1, -1], [W - 2, H - 2, -1, -1]].forEach(
  ([x, y, dx, dy]) => {
    for (let n = 0; n < 4; n += 1) {
      set(x + dx * n, y, C.amber);
      set(x, y + dy * n, C.amber);
    }
  },
);

/* -------------------------------------------------------------- 6. write */

/** Runs of one colour collapse into a single rect — 36x48 cells, ~300 rects. */
let rects = '';
for (let y = 0; y < H; y += 1) {
  let runStart = 0;
  for (let x = 1; x <= W; x += 1) {
    if (x < W && px[y][x] === px[y][runStart]) continue;
    rects += `<rect x="${runStart * CELL}" y="${y * CELL}" width="${(x - runStart) * CELL}" height="${CELL}" fill="${px[y][runStart]}"/>`;
    runStart = x;
  }
  rects += '\n  ';
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W * CELL} ${H * CELL}" shape-rendering="crispEdges">
  <title>A small player at the top of the backswing on a dusk fairway</title>
  ${rects.trimEnd()}
</svg>
`;

const out = fileURLToPath(new URL('../assets/mz-avatar.svg', import.meta.url));
writeFileSync(out, svg);
console.log(`wrote ${out} (${svg.length} bytes)`);
