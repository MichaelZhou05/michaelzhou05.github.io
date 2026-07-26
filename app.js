import {
  buildCourse,
  createCamera,
  createDriver,
  FINISH_MARGIN,
  LAP_LENGTH_METERS,
  locate,
  pointAtDistance as pointAtDistanceOn,
  ROAD_HALF_WIDTH,
  stepDriver,
  updateCamera as easeCamera,
  VIEW_WIDTH,
  VIEW_HEIGHT,
} from './race-sim.js';
import { opusLap } from './opus-lap.js';
import { solLap } from './sol-lap.js';

const $ = (selector) => document.querySelector(selector);

/* The clock moved to `location.js`, which owns the zone it has to run in — it
   is Michael's time under the map, not the reader's. */

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  });
}, { threshold: 0.07 });

document.querySelectorAll('.log, .work').forEach((element) => {
  element.classList.add('reveal-item');
  revealObserver.observe(element);
});

/* ------------------------------------------------------------------ *
 * Nordschleife night lap
 * ------------------------------------------------------------------ */

/**
 * The screen is a dot-matrix panel, not a monitor. Everything below is authored
 * in the 900×600 world the sector windows and both recorded laps were fitted to
 * — change that and the replays no longer line up — but the canvas that
 * actually receives it is a third of the size. One game pixel is a 3×3 block of
 * layout pixels, `image-rendering: pixelated` blows it back up with no
 * resampling, and nothing on the screen can be finer than that block.
 */
const PIXEL = 3;
const VIEW_W = VIEW_WIDTH;
const VIEW_H = VIEW_HEIGHT;
const SCREEN_W = VIEW_W / PIXEL;
const SCREEN_H = VIEW_H / PIXEL;

const canvas = $('#race-canvas');
canvas.width = SCREEN_W;
canvas.height = SCREEN_H;
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;

/** Press Start 2P, so canvas type is cut from the same 8×8 grid as the page. */
const retroFont = getComputedStyle(document.documentElement)
  .getPropertyValue('--display').trim() || '"Press Start 2P", monospace';
if (document.fonts) document.fonts.load(`${8 * PIXEL}px ${retroFont}`).catch(() => {});

/** Screen space, in world units: the 1/3 squeeze onto the panel and nothing else. */
function resetView() {
  context.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0);
}

/** Snap a screen-space length or coordinate onto the dot grid. */
const snap = (value) => Math.round(value / PIXEL) * PIXEL;

/** `size` is in game pixels — the only sizes that land on the grid cleanly. */
const pixelFont = (size) => `400 ${size * PIXEL}px ${retroFont}`;

/**
 * 50% checkerboard, one game pixel per cell. A handheld with four shades tints
 * the screen by dropping every other dot, not by blending — so does the
 * off-track flash. Painted under the identity transform so the cells stay
 * exactly one panel pixel wide.
 */
function ditherFill(color, alpha = 1) {
  const tile = document.createElement('canvas');
  tile.width = 2;
  tile.height = 2;
  const tileContext = tile.getContext('2d');
  tileContext.fillStyle = color;
  tileContext.fillRect(0, 0, 1, 1);
  tileContext.fillRect(1, 1, 1, 1);
  const pattern = context.createPattern(tile, 'repeat');
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalAlpha = alpha;
  context.fillStyle = pattern;
  context.fillRect(0, 0, SCREEN_W, SCREEN_H);
  context.globalAlpha = 1;
}

const ui = {
  overlay: $('#game-overlay'),
  start: $('#start-race'),
  restart: $('#restart-race'),
  sector: $('#sector-name'),
  playerDistance: $('#player-distance'),
  playerProgress: $('#player-progress'),
  playerTime: $('#player-time'),
  playerHits: $('#player-hits'),
  opusLapNote: $('#opus-lap-note'),
  solLapNote: $('#sol-lap-note'),
  log: $('#race-log'),
};

const course = buildCourse(VIEW_W, VIEW_H);
const { track, sectorViews } = course;
const pointAtDistance = (distance) => pointAtDistanceOn(course, distance);

/* ---------------------------------- scenery ---------------------------------- */

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Eifel forest either side of the ribbon, laid out once and kept stable.
 * Candidates are seeded off the centreline rather than sprinkled across the
 * whole bounding box, then rejected if the circuit loops back near them —
 * Kesselchen and Klostertal run close enough together to matter.
 */
const scenery = (() => {
  const minimumClearance = (ROAD_HALF_WIDTH * 1.9) ** 2;
  const random = mulberry32(0x4e6f7264);
  const items = [];

  const clearsTrack = (x, y) => {
    for (let index = 0; index < track.points.length; index += 4) {
      const point = track.points[index];
      const dx = x - point.x;
      const dy = y - point.y;
      if (dx * dx + dy * dy < minimumClearance) return false;
    }
    return true;
  };

  for (let index = 0; index < track.points.length; index += 2) {
    const point = track.points[index];
    const nx = -Math.sin(point.angle);
    const ny = Math.cos(point.angle);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const side = random() < 0.5 ? -1 : 1;
      const across = side * (ROAD_HALF_WIDTH * 2.2 + random() * 480);
      const along = (random() - 0.5) * 90;
      const x = point.x + nx * across + Math.cos(point.angle) * along;
      const y = point.y + ny * across + Math.sin(point.angle) * along;
      if (!clearsTrack(x, y)) continue;

      items.push({
        x,
        y,
        size: 22 + random() * 24,
        kind: random() < 0.88 ? 'tree' : 'rock',
        tint: random(),
      });
    }
  }
  return items;
})();

/**
 * Fixed twinkle positions so the night sky does not strobe between frames, and
 * fixed to the dot grid so a star is a whole lit pixel rather than a smear
 * across two of them.
 */
const NIGHT_STARS = Array.from({ length: 70 }, (_, index) => ({
  x: snap(((index * 137.5) % 89) / 89 * VIEW_W),
  y: snap(((index * 71.3) % 61) / 61 * VIEW_H),
  size: index % 7 === 0 ? 2 : 1,
  phase: (index % 11) / 11,
}));

/* --------------------------------- minimap --------------------------------- */

/**
 * The whole lap, in the top-right corner. The camera only ever shows you one
 * sector window — a few hundred metres of a 20.8 km circuit — which is enough
 * to drive by and tells you nothing about where on the Nordschleife you
 * actually are. So the full centreline is rasterised once, here, onto the same
 * dot grid as everything else; the frame only repaints those cells and the
 * markers that sit on top of them.
 */
const MINIMAP_SPAN = 50; // game pixels across the drawn circuit
const MINIMAP_PAD = 4; // game pixels of quiet border inside the frame

const minimap = (() => {
  const size = (MINIMAP_SPAN + MINIMAP_PAD * 2) * PIXEL;
  const left = snap(VIEW_W - size - 5 * PIXEL);
  const top = 5 * PIXEL;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  track.points.forEach((point) => {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  });

  // One scale for both axes so the circuit keeps its shape; the shorter span
  // just sits centred in the frame.
  const scale = (MINIMAP_SPAN * PIXEL) / Math.max(maxX - minX, maxY - minY);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const centreX = left + size / 2;
  const centreY = top + size / 2;

  // North stays up: world y climbs north, screen y climbs down.
  const project = (x, y) => ({
    x: snap(centreX + (x - midX) * scale),
    y: snap(centreY - (y - midY) * scale),
  });

  return {
    left,
    top,
    size,
    project,
    cells: track.points.map((point) => project(point.x, point.y)),
  };
})();

/* ---------------------------------- racers ---------------------------------- */

/**
 * USV OPUS 5 is not a pace multiplier. `opus-lap.js` is a recording of a lap
 * that claude-opus-5 actually drove, offline, through the physics in
 * `race-sim.js` — same four keys, same corridor, same grass penalty as you.
 * `scripts/run-opus-racer.mjs` regenerates it. USV GPT 5.6 is a second real
 * replay, driven by gpt-5.6-sol at xhigh reasoning through the same harness.
 */
const RACERS = [
  {
    id: 'opus',
    label: 'USV OPUS 5',
    // Nameplates on the canvas are 8×8 tiles wide apiece, so they get the short
    // form; the telemetry strip under the screen carries the full name.
    tag: 'OPUS',
    color: '#ffb000',
    kind: 'replay',
    lap: opusLap,
  },
  {
    id: 'gpt',
    label: 'USV GPT 5.6 SOL XHIGH',
    tag: 'GPT',
    color: '#2ed573',
    kind: 'replay',
    lap: solLap,
  },
];

RACERS.forEach((racer) => {
  racer.readout = $(`#${racer.id}-distance`);
  racer.bar = $(`#${racer.id}-progress`);
});

/**
 * Sample the recorded lap at `time`, interpolating between the stored frames.
 * Frames are `[time, x, y, heading]`, so a full lap stays a small payload.
 */
function sampleLap(lap, time) {
  const frames = lap.frames;
  const last = frames[frames.length - 1];
  if (time >= last[0]) return { x: last[1], y: last[2], heading: last[3], done: true };

  let low = 0;
  let high = frames.length - 1;
  while (low < high - 1) {
    const middle = (low + high) >> 1;
    if (frames[middle][0] <= time) low = middle;
    else high = middle;
  }
  const a = frames[low];
  const b = frames[high];
  const mix = (time - a[0]) / Math.max(0.0001, b[0] - a[0]);

  let turn = b[3] - a[3];
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;

  return {
    x: a[1] + (b[1] - a[1]) * mix,
    y: a[2] + (b[2] - a[2]) * mix,
    heading: a[3] + turn * mix,
    done: false,
  };
}

/* ---------------------------------- state ---------------------------------- */

const keys = { up: false, down: false, left: false, right: false };
const keyMap = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};

let phase = 'idle';
let player;
let camera;
let activeSector = 0;
let raceTime = 0;
let previousFrame = performance.now();
let grassFlash = 0;
let sectorFlash = 0;

function resetRacers() {
  RACERS.forEach((racer) => {
    racer.pixels = 0;
    racer.distance = 0;
    racer.lateral = 0;
    racer.finished = false;
    racer.finishTime = null;

    if (racer.kind === 'replay') {
      const first = racer.lap.frames[0];
      racer.pose = { x: first[1], y: first[2], heading: first[3] };
      // `locate` only searches near this hint, so it has to go back to the grid
      // with everything else or a rerun would fail to place the car.
      racer.pointIndex = 0;
    }
  });
}

function snapCamera(index) {
  camera = createCamera(course, index);
}

function formatTime(value) {
  const minutes = Math.floor(value / 60);
  return `${minutes}:${(value - minutes * 60).toFixed(2).padStart(5, '0')}`;
}

function setLog(text) {
  if (ui.log) ui.log.textContent = text;
}

function setSectorBanner() {
  if (!ui.sector) return;
  const sector = track.sectors[activeSector];
  ui.sector.textContent = `SECTOR ${String(activeSector + 1).padStart(2, '0')}/${track.sectors.length} · ${sector.name}`;
}

/* ---------------------------------- input ---------------------------------- */

window.addEventListener('keydown', (event) => {
  const control = keyMap[event.code];
  if (control) {
    keys[control] = true;
    event.preventDefault();
  }
  if ((event.code === 'Space' || event.code === 'Enter') && phase !== 'running') {
    startRace();
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  const control = keyMap[event.code];
  if (control) keys[control] = false;
});

window.addEventListener('blur', () => Object.keys(keys).forEach((key) => { keys[key] = false; }));

/* ---------------------------------- flow ---------------------------------- */

function primeRace() {
  player = createDriver(course);
  activeSector = 0;
  raceTime = 0;
  grassFlash = 0;
  sectorFlash = 0;
  resetRacers();
  snapCamera(0);
  Object.keys(keys).forEach((key) => { keys[key] = false; });
  setSectorBanner();
}

function resetRace() {
  phase = 'idle';
  primeRace();

  ui.overlay.querySelector('.overlay-title').textContent = 'NORDSCHLEIFE';
  const lines = ui.overlay.querySelectorAll('p:not(.overlay-title)');
  lines[0].textContent = `20.832 KM · ${track.sectors.length} SECTORS · ARROW KEYS OR WASD`;
  lines[1].textContent = 'THE WINDOW SHIFTS EACH SECTOR · GRASS COSTS YOU';
  ui.start.textContent = 'START LAP';
  ui.overlay.classList.remove('hidden');
  setLog('USV OPUS 5 and USV GPT 5.6 SOL XHIGH are waiting on the grid.');
  updateUi();
}

function startRace() {
  primeRace();
  phase = 'running';
  ui.overlay.classList.add('hidden');
  setLog('Lap live. Both USV models are running their own lines.');
  previousFrame = performance.now();
  canvas.focus({ preventScroll: true });
}

function finishRace() {
  phase = 'finished';

  const board = [
    { name: 'YOU', time: player.finishTime, projected: player.finishTime },
    ...RACERS.map((racer) => ({
      name: racer.label,
      // The recorded lap already knows its own finish time, even if the player
      // beat it to the line.
      time: racer.lap.finishTime,
      projected: racer.lap.finishTime,
    })),
  ];
  board.sort((a, b) => a.projected - b.projected);

  const place = board.findIndex((entry) => entry.name === 'YOU') + 1;
  const title = ui.overlay.querySelector('.overlay-title');
  const lines = ui.overlay.querySelectorAll('p:not(.overlay-title)');

  title.textContent = place === 1 ? 'P1 · LAP RECORD' : `P${place} OF 3`;
  lines[0].textContent = `${formatTime(player.finishTime)} · ${player.offTrackCount} OFF-TRACK MOMENTS`;
  lines[1].textContent = board
    .map((entry, index) => `${index + 1}. ${entry.name} ${entry.time ? formatTime(entry.time) : `~${formatTime(entry.projected)}`}`)
    .join('    ');
  ui.start.textContent = 'RUN IT AGAIN';
  ui.overlay.classList.remove('hidden');

  setLog(place === 1
    ? `Full lap in ${formatTime(player.finishTime)} — you beat both USV models around the Ring.`
    : `${board[0].name} took it. You finished P${place} in ${formatTime(player.finishTime)}.`);
}

/* ---------------------------------- update ---------------------------------- */

function updateRacers(delta) {
  RACERS.forEach((racer) => {
    if (racer.kind === 'replay') {
      // Play back the lap the model actually drove: its own world position and
      // heading, frame by frame. Nothing is re-simulated or re-paced here.
      const pose = sampleLap(racer.lap, raceTime);
      racer.pose = pose;
      const found = locate(course, pose.x, pose.y, racer.pointIndex);
      racer.pointIndex = found.index;
      racer.distance = Math.max(racer.distance, found.distance);

      if (!racer.finished && pose.done) {
        racer.finished = true;
        racer.finishTime = racer.lap.finishTime;
        racer.distance = LAP_LENGTH_METERS;
      }
      return;
    }

  });
}

function updateRace(delta) {
  raceTime += delta;
  updateRacers(delta);

  // Exactly the step the model drove offline — see race-sim.js.
  const report = stepDriver(course, player, keys, camera, delta);

  if (report.leftTrack && raceTime > 0.4) {
    player.offTrackCount += 1;
    grassFlash = 0.4;
    setLog('Off the asphalt. The grass halves your speed — get back on the black stuff.');
  }

  if (player.distance >= track.sectors[activeSector].endDistance
    && activeSector < track.sectors.length - 1) {
    activeSector += 1;
    sectorFlash = 0.85;
    /**
     * Cut to the new window rather than swinging into it. Every sector is
     * framed along its own axis, so easing between two of them rotates the
     * whole world under the car — and because steering is screen-relative,
     * your controls rotate with it, mid-corner. A hard cut is what a machine
     * that draws one screen at a time would do anyway: the screen changes, the
     * controls are immediately whatever the new screen says they are.
     */
    snapCamera(activeSector);
    setSectorBanner();
    setLog(`Window shifts to sector ${activeSector + 1} — ${track.sectors[activeSector].note}.`);
  }

  if (player.distance >= LAP_LENGTH_METERS - FINISH_MARGIN) {
    player.finishTime = raceTime;
    finishRace();
  }
}

function updateCamera(delta) {
  easeCamera(course, camera, activeSector, delta);
}

function updateUi() {
  const percent = Math.round((player.distance / LAP_LENGTH_METERS) * 100);
  ui.playerDistance.textContent = String(percent).padStart(2, '0');
  ui.playerProgress.style.width = `${percent}%`;
  ui.playerTime.textContent = formatTime(raceTime);
  ui.playerHits.textContent = String(player.offTrackCount);

  RACERS.forEach((racer) => {
    const value = Math.round((racer.distance / LAP_LENGTH_METERS) * 100);
    if (racer.readout) racer.readout.textContent = String(value).padStart(2, '0');
    if (racer.bar) racer.bar.style.width = `${value}%`;
  });
}

/* ---------------------------------- render ---------------------------------- */

function worldToScreen(x, y) {
  const dx = x - camera.x;
  const dy = y - camera.y;
  const cos = Math.cos(camera.angle);
  const sin = Math.sin(camera.angle);
  return {
    x: VIEW_W / 2 + (dx * cos + dy * sin) * camera.scale,
    y: VIEW_H / 2 - (dy * cos - dx * sin) * camera.scale,
  };
}

function applyCamera() {
  resetView();
  context.translate(VIEW_W / 2, VIEW_H / 2);
  context.scale(camera.scale, -camera.scale);
  context.rotate(-camera.angle);
  context.translate(-camera.x, -camera.y);
}

function visibleWorldRadius() {
  return Math.hypot(VIEW_W, VIEW_H) / (2 * camera.scale) + 180;
}

/**
 * Night, in four flat shades. No gradients: the sky is one colour, the field
 * behind the circuit is a hard chequer of two more, and the stars are single
 * lit dots whose twinkle steps between three levels rather than fading.
 */
function drawNightGround() {
  resetView();
  context.fillStyle = '#07060c';
  context.fillRect(0, 0, VIEW_W, VIEW_H);

  const now = performance.now();
  NIGHT_STARS.forEach((star) => {
    const wave = Math.abs(Math.sin(now / 1400 + star.phase * 6.28));
    const shade = wave > 0.72 ? '#e8e4f4' : wave > 0.36 ? '#5b4a9e' : '#241d3f';
    context.fillStyle = shade;
    context.fillRect(star.x, star.y, star.size * PIXEL, star.size * PIXEL);
  });

  applyCamera();
  const cell = 150;
  const radius = visibleWorldRadius();
  const startX = Math.floor((camera.x - radius) / cell) * cell;
  const startY = Math.floor((camera.y - radius) / cell) * cell;

  context.fillStyle = '#0c0a18';
  for (let x = startX; x < camera.x + radius; x += cell) {
    for (let y = startY; y < camera.y + radius; y += cell) {
      if (((Math.round(x / cell) + Math.round(y / cell)) & 1) === 0) continue;
      context.fillRect(x, y, cell, cell);
    }
  }
}

/**
 * The Eifel treeline as sprites rather than shading: a flat canopy square, one
 * lighter square catching the moon on the same side every time, and a trunk.
 * Two tints, three shades, no anti-aliased rim — the same trees a handheld
 * would have had in ROM.
 */
function drawForest() {
  const radius = visibleWorldRadius();
  for (const item of scenery) {
    if (Math.abs(item.x - camera.x) > radius || Math.abs(item.y - camera.y) > radius) continue;

    if (item.kind === 'rock') {
      const size = item.size * 0.42;
      context.fillStyle = '#252230';
      context.fillRect(item.x - size, item.y - size * 0.7, size * 2, size * 1.4);
      context.fillStyle = '#3a3548';
      context.fillRect(item.x - size, item.y, size, size * 0.7);
      continue;
    }

    // A canopy and one lit crescent on the moon side, both flat. Two shades
    // apart from the ground and no more: the treeline is texture, not scenery
    // that competes with the road.
    const canopy = item.size * 0.6;
    const light = item.tint > 0.5;
    context.fillStyle = light ? '#131029' : '#0f0c20';
    context.beginPath();
    context.arc(item.x, item.y, canopy, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = light ? '#1d1840' : '#171234';
    context.beginPath();
    context.arc(item.x - canopy * 0.22, item.y + canopy * 0.22, canopy * 0.52, 0, Math.PI * 2);
    context.fill();
  }
}

function strokeCentreline(from, to, width, color, dash = null) {
  context.beginPath();
  context.moveTo(track.points[from].x, track.points[from].y);
  for (let index = from + 1; index <= to; index += 1) {
    context.lineTo(track.points[index].x, track.points[index].y);
  }
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = width;
  context.strokeStyle = color;
  if (dash) context.setLineDash(dash);
  context.stroke();
  if (dash) context.setLineDash([]);
}

const ASPHALT_COLOR = '#1a1820';
/**
 * Kerb and lane widths are in world units and the widest sector windows squeeze
 * the circuit to about a third scale, so both are sized to survive that trip
 * down onto the dot grid: anything thinner than a game pixel there stops
 * existing at all.
 */
const KERB_WIDTH = 11;
const KERB_BLOCK = 17;
const KERB_ENTER = 0.0024;
const KERB_EXIT = 0.0014;

/** Contiguous sample ranges that are cornering hard enough to earn kerbs. */
function kerbRuns(from, to) {
  const runs = [];
  let start = -1;
  for (let index = from; index <= to; index += 1) {
    const curvature = Math.abs(track.points[index].smoothCurvature);
    // Hysteresis: once a run opens it stays open until the corner really ends.
    const cornering = curvature >= (start < 0 ? KERB_ENTER : KERB_EXIT);
    if (cornering) {
      if (start < 0) start = index;
    } else if (start >= 0) {
      if (index - start >= 3) runs.push([start, index]);
      start = -1;
    }
  }
  if (start >= 0 && to - start >= 3) runs.push([start, to]);
  return runs;
}

/**
 * Kerbs are painted as full-width bands along the centreline and then cut back
 * to the edges by re-laying the asphalt over the middle. Offsetting the
 * centreline by hand would fold back through the road at tight apexes; this
 * shares the asphalt's own stroke, so both edges line up exactly by definition.
 */
function drawKerbs(from, to) {
  const band = (start, end, width, color, dashOffset) => {
    context.beginPath();
    context.moveTo(track.points[start].x, track.points[start].y);
    for (let index = start + 1; index <= end; index += 1) {
      context.lineTo(track.points[index].x, track.points[index].y);
    }
    // Butt caps: round ones are half the band wide and would smear the blocks
    // into one another.
    context.lineCap = 'butt';
    context.lineJoin = 'round';
    context.lineWidth = width;
    context.strokeStyle = color;
    context.lineDashOffset = dashOffset;
    context.stroke();
  };

  for (const [start, end] of kerbRuns(from, to)) {
    // Red and white run the same dashed path a block out of phase, so they
    // interlock into one continuous kerb.
    context.setLineDash([KERB_BLOCK, KERB_BLOCK]);
    band(start, end, ROAD_HALF_WIDTH * 2, '#e60012', 0);
    band(start, end, ROAD_HALF_WIDTH * 2, '#e8e4f4', KERB_BLOCK);
    context.setLineDash([]);
    // Overrun by a sample at each end: sharing the band's cap plane would leave
    // a half-covered hairline of kerb colour drawn across the road.
    band(
      Math.max(0, start - 1),
      Math.min(track.points.length - 1, end + 1),
      (ROAD_HALF_WIDTH - KERB_WIDTH) * 2,
      ASPHALT_COLOR,
      0,
    );
  }

  context.lineDashOffset = 0;
}

function drawFinishLine() {
  const point = pointAtDistance(6);
  const nx = -Math.sin(point.angle);
  const ny = Math.cos(point.angle);
  const tx = Math.cos(point.angle);
  const ty = Math.sin(point.angle);
  const squares = 10;
  const step = (ROAD_HALF_WIDTH * 2) / squares;

  for (let column = 0; column < squares; column += 1) {
    for (let row = 0; row < 2; row += 1) {
      context.fillStyle = ((column + row) & 1) === 0 ? '#e8e4f4' : '#0a0a0d';
      const across = -ROAD_HALF_WIDTH + column * step;
      const along = row * step;
      context.beginPath();
      context.moveTo(point.x + nx * across + tx * along, point.y + ny * across + ty * along);
      context.lineTo(point.x + nx * (across + step) + tx * along, point.y + ny * (across + step) + ty * along);
      context.lineTo(point.x + nx * (across + step) + tx * (along + step), point.y + ny * (across + step) + ty * (along + step));
      context.lineTo(point.x + nx * across + tx * (along + step), point.y + ny * across + ty * (along + step));
      context.closePath();
      context.fill();
    }
  }
}

function drawSectorGate(sector, color) {
  const point = pointAtDistance(sector.endDistance);
  const nx = -Math.sin(point.angle);
  const ny = Math.cos(point.angle);
  context.strokeStyle = color;
  context.lineWidth = 9;
  context.setLineDash([15, 13]);
  context.beginPath();
  context.moveTo(point.x - nx * ROAD_HALF_WIDTH, point.y - ny * ROAD_HALF_WIDTH);
  context.lineTo(point.x + nx * ROAD_HALF_WIDTH, point.y + ny * ROAD_HALF_WIDTH);
  context.stroke();
  context.setLineDash([]);
}

/**
 * The car is a sprite, so it is authored as one: a grid of whole game pixels,
 * six across and ten down, laid out from the middle. Nothing here is allowed a
 * fractional coordinate.
 */
const CAR_SPRITE = [
  ['#07060c', -3, -3, 1, 3], // wheels
  ['#07060c', 2, -3, 1, 3],
  ['#07060c', -3, 1, 1, 3],
  ['#07060c', 2, 1, 1, 3],
  ['body', -2, -5, 4, 10], // shell
  ['#0f0d18', -2, -3, 4, 2], // glass
  ['#0f0d18', -2, 2, 4, 2],
  ['#ffd98a', -2, -6, 1, 1], // headlamps
  ['#ffd98a', 1, -6, 1, 1],
];

/**
 * A handheld held a fixed number of frames of a rotating car, so the heading is
 * quantised to 32 of them. It also stops a sprite this small shimmering as the
 * camera swings between sectors.
 */
const CAR_ANGLE_STEPS = 32;

function drawCar(worldX, worldY, worldHeading, color, label) {
  const screen = worldToScreen(worldX, worldY);
  if (screen.x < -70 || screen.x > VIEW_W + 70) return;
  if (screen.y < -70 || screen.y > VIEW_H + 70) return;

  const step = (Math.PI * 2) / CAR_ANGLE_STEPS;
  const angle = Math.round((camera.angle - worldHeading + Math.PI / 2) / step) * step;
  const x = snap(screen.x);
  const y = snap(screen.y);

  resetView();
  context.save();
  context.translate(x, y);
  context.rotate(angle);

  // Body under-shadow first, one pixel out on every side.
  context.fillStyle = '#000000';
  context.fillRect(-3 * PIXEL, -5 * PIXEL, 6 * PIXEL, 11 * PIXEL);
  for (const [shade, left, top, width, height] of CAR_SPRITE) {
    context.fillStyle = shade === 'body' ? color : shade;
    context.fillRect(left * PIXEL, top * PIXEL, width * PIXEL, height * PIXEL);
  }
  context.restore();

  // Nameplate: a solid tile box on the grid, clear of the sprite, with a single
  // lit pixel row under it pointing back down at the car.
  context.font = pixelFont(6);
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const width = snap(context.measureText(label).width + 4 * PIXEL);
  const boxX = snap(x - width / 2);
  const boxY = y - 19 * PIXEL;
  context.fillStyle = '#000000';
  context.fillRect(boxX, boxY, width, 9 * PIXEL);
  context.fillStyle = color;
  context.fillRect(boxX, boxY + 9 * PIXEL, width, PIXEL);
  context.fillText(label, boxX + width / 2, boxY + 7 * PIXEL);
}

/**
 * The status panel is a tile box: a hard one-pixel frame on flat black, type on
 * the 8×8 grid, and a shadow that is a solid offset block rather than a blur.
 */
function drawPanel(x, y, width, height, accent) {
  context.fillStyle = '#000000';
  context.fillRect(x + PIXEL, y + PIXEL, width, height);
  context.fillStyle = accent;
  context.fillRect(x, y, width, height);
  context.fillStyle = '#000000';
  context.fillRect(x + PIXEL, y + PIXEL, width - 2 * PIXEL, height - 2 * PIXEL);
}

/**
 * Paint the corner map: the lap as a dim dot trace, the sector you are being
 * shown lit on top of it, then one blip per car. A blip is drawn on a black
 * pad so it can never be lost inside the trace it is sitting on.
 */
function drawMinimap() {
  const sector = track.sectors[activeSector];
  drawPanel(minimap.left, minimap.top, minimap.size, minimap.size, '#5b4a9e');

  context.fillStyle = '#3a3548';
  minimap.cells.forEach((cell) => context.fillRect(cell.x, cell.y, PIXEL, PIXEL));

  context.fillStyle = '#7b68ee';
  for (let index = sector.startSample; index <= sector.endSample; index += 1) {
    const cell = minimap.cells[index];
    context.fillRect(cell.x, cell.y, PIXEL, PIXEL);
  }

  const line = minimap.cells[0];
  context.fillStyle = '#e8e4f4';
  context.fillRect(line.x, line.y, PIXEL, PIXEL);

  const blips = RACERS.map((racer) => {
    const pose = racer.kind === 'replay' ? racer.pose : pointAtDistance(racer.distance);
    return { cell: minimap.project(pose.x, pose.y), color: racer.color };
  });
  // Yours blinks, so it reads as the live one among three otherwise equal dots.
  blips.push({
    cell: minimap.project(player.x, player.y),
    color: Math.sin(performance.now() / 220) > 0 ? '#e60012' : '#e8e4f4',
  });

  // Every pad first, then every dot: on the grid three cars start a metre apart,
  // and a pad laid down after a neighbour's dot would swallow it.
  context.fillStyle = '#07060c';
  blips.forEach(({ cell }) => context.fillRect(cell.x - PIXEL, cell.y - PIXEL, 4 * PIXEL, 4 * PIXEL));
  blips.forEach(({ cell, color }) => {
    context.fillStyle = color;
    context.fillRect(cell.x, cell.y, 2 * PIXEL, 2 * PIXEL);
  });
}

function drawHud() {
  resetView();
  const sector = track.sectors[activeSector];
  const lines = [
    ['#ffb000', `SECTOR ${String(activeSector + 1).padStart(2, '0')}/${track.sectors.length}`],
    ['#8a849f', `${(player.distance / 1000).toFixed(2)}/20.83KM`],
    [player.offTrack ? '#e60012' : '#2ed573', player.offTrack ? 'OFF TRACK' : 'ON TRACK'],
  ];

  // Three short lines stacked rather than one wide row: on a panel this small,
  // a status box that runs half the width of the screen is the screen.
  context.font = pixelFont(6);
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';

  const inner = Math.max(...lines.map(([, text]) => context.measureText(text).width));
  const boxWidth = snap(inner + 10 * PIXEL);
  const boxHeight = 33 * PIXEL;
  const left = 5 * PIXEL;
  const top = 5 * PIXEL;

  drawPanel(left, top, boxWidth, boxHeight, '#5b4a9e');

  lines.forEach(([shade, text], index) => {
    context.fillStyle = shade;
    context.fillText(text, left + 5 * PIXEL, top + (11 + index * 9) * PIXEL);
  });

  /**
   * Sector call-out. It used to be set across the middle of the screen, which
   * is exactly where you are driving — so it now sits in the bottom-left corner
   * as a text box, the way a handheld names a stage without taking the road
   * away from you. Same panel, same 6px type as the status box.
   */
  if (sectorFlash > 0) {
    const note = sector.note.toUpperCase();
    const boxWidth = snap(Math.max(
      context.measureText(sector.name).width,
      context.measureText(note).width,
    ) + 10 * PIXEL);
    const boxHeight = 24 * PIXEL;
    const boxTop = VIEW_H - boxHeight - 5 * PIXEL;

    drawPanel(5 * PIXEL, boxTop, boxWidth, boxHeight, '#7b68ee');
    context.fillStyle = '#7b68ee';
    context.fillText(sector.name, 10 * PIXEL, boxTop + 10 * PIXEL);
    context.fillStyle = '#8a849f';
    context.fillText(note, 10 * PIXEL, boxTop + 19 * PIXEL);
  }

  drawMinimap();

  // Off the asphalt: the panel is tinted by dropping every other dot to red.
  if (grassFlash > 0) ditherFill('#e60012', Math.min(1, grassFlash / 0.4) * 0.55);
}

function drawScene() {
  drawNightGround();
  drawForest();

  const sector = track.sectors[activeSector];
  const from = Math.max(0, sector.startSample - 150);
  const to = Math.min(track.points.length - 1, sector.endSample + 150);

  /**
   * The road is stacked bands, not a glow. A blurred shadow would resolve to a
   * smear of in-between colours the panel cannot hold, so the light spilling
   * off the circuit is spelled out as three hard rings that step down in
   * brightness — dark verge, lit rim, black gutter — and then the asphalt.
   */
  strokeCentreline(from, to, ROAD_HALF_WIDTH * 2 + 34, '#0e0b1e');
  strokeCentreline(from, to, ROAD_HALF_WIDTH * 2 + 22, '#241d3f');
  strokeCentreline(from, to, ROAD_HALF_WIDTH * 2 + 13, '#5b4a9e');
  strokeCentreline(from, to, ROAD_HALF_WIDTH * 2 + 6, '#07060c');
  strokeCentreline(from, to, ROAD_HALF_WIDTH * 2, ASPHALT_COLOR);
  // Kerbs repaint the middle of the road, so the lane dashes go on top.
  drawKerbs(from, to);
  strokeCentreline(from, to, 6, '#3a3548', [26, 30]);

  track.sectors.forEach((entry, index) => {
    if (index === track.sectors.length - 1) return;
    if (entry.endSample < from || entry.endSample > to) return;
    drawSectorGate(entry, index < activeSector ? 'rgba(123, 104, 238, .55)' : 'rgba(255, 255, 255, .22)');
  });

  if (from === 0 || to >= track.points.length - 2) drawFinishLine();

  RACERS.forEach((racer) => {
    if (racer.kind === 'replay') {
      drawCar(racer.pose.x, racer.pose.y, racer.pose.heading, racer.color, racer.tag);
      return;
    }
    const point = pointAtDistance(racer.distance);
    drawCar(
      point.x - Math.sin(point.angle) * racer.lateral,
      point.y + Math.cos(point.angle) * racer.lateral,
      point.angle,
      racer.color,
      racer.tag,
    );
  });

  drawCar(player.x, player.y, player.heading, '#e60012', 'YOU');
  drawHud();
}

/* ---------------------------------- loop ---------------------------------- */

function frame(timestamp) {
  const delta = Math.min(0.04, (timestamp - previousFrame) / 1000);
  previousFrame = timestamp;
  grassFlash = Math.max(0, grassFlash - delta);
  sectorFlash = Math.max(0, sectorFlash - delta);

  if (phase === 'running') updateRace(delta);
  updateCamera(delta);
  updateUi();
  drawScene();
  requestAnimationFrame(frame);
}

ui.start.addEventListener('click', startRace);
ui.restart.addEventListener('click', resetRace);

// Recorded laps know their times before you turn a wheel.
if (ui.opusLapNote) ui.opusLapNote.textContent = `${formatTime(opusLap.finishTime)} recorded`;
if (ui.solLapNote) ui.solLapNote.textContent = `${formatTime(solLap.finishTime)} recorded`;

resetRace();
requestAnimationFrame(frame);
