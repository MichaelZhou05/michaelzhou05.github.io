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
} from './race-sim.js';
import { opusLap } from './opus-lap.js';
import { solLap } from './sol-lap.js';

const $ = (selector) => document.querySelector(selector);

$('#notice-close')?.addEventListener('click', () => {
  $('#site-notice')?.setAttribute('hidden', '');
});

const clock = $('#local-time');
const updateClock = () => {
  if (!clock) return;
  clock.textContent = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date());
};
updateClock();
setInterval(updateClock, 1000);

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

const canvas = $('#race-canvas');
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;
const retroFont = getComputedStyle(document.body).fontFamily;

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

const course = buildCourse(canvas.width, canvas.height);
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

/* Fixed twinkle positions so the night sky does not strobe between frames. */
const NIGHT_STARS = Array.from({ length: 70 }, (_, index) => ({
  x: ((index * 137.5) % 89) / 89 * 900,
  y: ((index * 71.3) % 61) / 61 * 600,
  size: index % 7 === 0 ? 2 : 1,
  phase: (index % 11) / 11,
}));

/* ---------------------------------- racers ---------------------------------- */

/**
 * USV OPUS 5 is not a pace multiplier. `opus-lap.js` is a recording of a lap
 * that claude-opus-5 actually drove, offline, through the physics in
 * `race-sim.js` — same four keys, same corridor, same grass penalty as you.
 * `scripts/run-opus-racer.mjs` regenerates it. USV 5.6 SOL is a second real
 * replay, driven by gpt-5.6-sol at xhigh reasoning through the same harness.
 */
const RACERS = [
  {
    id: 'opus',
    label: 'USV OPUS 5',
    color: '#f1c75b',
    kind: 'replay',
    lap: opusLap,
  },
  {
    id: 'gpt',
    label: 'USV 5.6 SOL XHIGH',
    color: '#b79cff',
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
  setLog('USV OPUS 5 and USV 5.6 SOL XHIGH are waiting on the grid.');
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
    x: canvas.width / 2 + (dx * cos + dy * sin) * camera.scale,
    y: canvas.height / 2 - (dy * cos - dx * sin) * camera.scale,
  };
}

function applyCamera() {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.scale(camera.scale, -camera.scale);
  context.rotate(-camera.angle);
  context.translate(-camera.x, -camera.y);
}

function visibleWorldRadius() {
  return Math.hypot(canvas.width, canvas.height) / (2 * camera.scale) + 180;
}

function drawNightGround() {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#050505';
  context.fillRect(0, 0, canvas.width, canvas.height);

  NIGHT_STARS.forEach((star) => {
    const twinkle = 0.18 + 0.4 * Math.abs(Math.sin(performance.now() / 1400 + star.phase * 6.28));
    context.fillStyle = `rgba(255, 255, 255, ${twinkle.toFixed(2)})`;
    context.fillRect(star.x, star.y, star.size, star.size);
  });

  applyCamera();
  const cell = 150;
  const radius = visibleWorldRadius();
  const startX = Math.floor((camera.x - radius) / cell) * cell;
  const startY = Math.floor((camera.y - radius) / cell) * cell;

  context.fillStyle = 'rgba(255, 255, 255, .012)';
  for (let x = startX; x < camera.x + radius; x += cell) {
    for (let y = startY; y < camera.y + radius; y += cell) {
      if (((Math.round(x / cell) + Math.round(y / cell)) & 1) === 0) continue;
      context.fillRect(x, y, cell, cell);
    }
  }
}

function drawForest() {
  const radius = visibleWorldRadius();
  for (const item of scenery) {
    if (Math.abs(item.x - camera.x) > radius || Math.abs(item.y - camera.y) > radius) continue;

    if (item.kind === 'rock') {
      context.fillStyle = '#1a1a1a';
      context.beginPath();
      context.arc(item.x, item.y, item.size * 0.36, 0, Math.PI * 2);
      context.fill();
      continue;
    }

    context.fillStyle = item.tint > 0.5 ? '#0b1f1a' : '#0a1a16';
    context.beginPath();
    context.arc(item.x, item.y, item.size * 0.6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = item.tint > 0.5 ? '#12362c' : '#0f2b23';
    context.beginPath();
    context.arc(item.x - item.size * 0.19, item.y + item.size * 0.19, item.size * 0.32, 0, Math.PI * 2);
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

const ASPHALT_COLOR = '#1c1c1c';
const KERB_WIDTH = 8;
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
    band(start, end, ROAD_HALF_WIDTH * 2, '#c8493c', 0);
    band(start, end, ROAD_HALF_WIDTH * 2, '#d8d8d8', KERB_BLOCK);
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
      context.fillStyle = ((column + row) & 1) === 0 ? '#e9e9e9' : '#111111';
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
  context.lineWidth = 5;
  context.setLineDash([15, 13]);
  context.beginPath();
  context.moveTo(point.x - nx * ROAD_HALF_WIDTH, point.y - ny * ROAD_HALF_WIDTH);
  context.lineTo(point.x + nx * ROAD_HALF_WIDTH, point.y + ny * ROAD_HALF_WIDTH);
  context.stroke();
  context.setLineDash([]);
}

function drawCar(worldX, worldY, worldHeading, color, label) {
  const screen = worldToScreen(worldX, worldY);
  if (screen.x < -70 || screen.x > canvas.width + 70) return;
  if (screen.y < -70 || screen.y > canvas.height + 70) return;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.save();
  context.translate(screen.x, screen.y);
  context.rotate(camera.angle - worldHeading + Math.PI / 2);

  context.fillStyle = 'rgba(0, 0, 0, .5)';
  context.fillRect(-8, -12, 16, 26);
  context.fillStyle = '#0a0a0a';
  context.fillRect(-10, -9, 3, 7);
  context.fillRect(7, -9, 3, 7);
  context.fillRect(-10, 4, 3, 7);
  context.fillRect(7, 4, 3, 7);
  context.fillStyle = color;
  context.fillRect(-7, -13, 14, 25);
  context.fillStyle = '#1c1c1c';
  context.fillRect(-5, -8, 10, 6);
  context.fillRect(-5, 2, 10, 6);
  context.fillStyle = '#fff1b1';
  context.fillRect(-5, -15, 3, 2);
  context.fillRect(2, -15, 3, 2);
  context.restore();

  context.font = `400 8px ${retroFont}`;
  context.textAlign = 'center';
  const width = context.measureText(label).width + 10;
  context.fillStyle = 'rgba(0, 0, 0, .78)';
  context.fillRect(screen.x - width / 2, screen.y - 31, width, 12);
  context.fillStyle = color;
  context.fillText(label, screen.x, screen.y - 22);
}

function drawHud() {
  context.setTransform(1, 0, 0, 1, 0, 0);
  const sector = track.sectors[activeSector];

  context.fillStyle = 'rgba(0, 0, 0, .82)';
  context.fillRect(13, 13, 272, 44);
  context.fillStyle = '#e6e6e6';
  context.font = `400 11px ${retroFont}`;
  context.textAlign = 'left';
  context.fillText(`SECTOR ${String(activeSector + 1).padStart(2, '0')}/${track.sectors.length}  ${sector.name}`, 24, 32);

  context.font = `400 8px ${retroFont}`;
  context.fillStyle = '#8d8d8d';
  context.fillText(`${(player.distance / 1000).toFixed(2)} / 20.83 KM`, 24, 48);
  context.fillStyle = player.offTrack ? '#ff6b6b' : '#5eead4';
  context.textAlign = 'right';
  context.fillText(player.offTrack ? 'OFF TRACK' : 'ON TRACK', 274, 48);

  if (sectorFlash > 0) {
    context.globalAlpha = Math.min(1, sectorFlash / 0.85);
    context.textAlign = 'center';
    context.fillStyle = '#5eead4';
    context.font = `400 20px ${retroFont}`;
    context.fillText(sector.name, canvas.width / 2, 96);
    context.fillStyle = '#a8a8a8';
    context.font = `400 9px ${retroFont}`;
    context.fillText(sector.note.toUpperCase(), canvas.width / 2, 116);
    context.globalAlpha = 1;
  }

  if (grassFlash > 0) {
    context.fillStyle = `rgba(255, 107, 107, ${grassFlash * 0.3})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawScene() {
  drawNightGround();
  drawForest();

  const sector = track.sectors[activeSector];
  const from = Math.max(0, sector.startSample - 150);
  const to = Math.min(track.points.length - 1, sector.endSample + 150);

  context.save();
  context.shadowColor = 'rgba(94, 234, 212, .5)';
  context.shadowBlur = 14;
  strokeCentreline(from, to, ROAD_HALF_WIDTH * 2 + 12, '#2a9d8f');
  context.restore();
  strokeCentreline(from, to, ROAD_HALF_WIDTH * 2 + 6, '#0a0a0a');
  strokeCentreline(from, to, ROAD_HALF_WIDTH * 2, ASPHALT_COLOR);
  // Kerbs repaint the middle of the road, so the lane dashes go on top.
  drawKerbs(from, to);
  strokeCentreline(from, to, 3.5, 'rgba(255, 255, 255, .16)', [26, 30]);

  track.sectors.forEach((entry, index) => {
    if (index === track.sectors.length - 1) return;
    if (entry.endSample < from || entry.endSample > to) return;
    drawSectorGate(entry, index < activeSector ? 'rgba(94, 234, 212, .5)' : 'rgba(255, 255, 255, .22)');
  });

  if (from === 0 || to >= track.points.length - 2) drawFinishLine();

  RACERS.forEach((racer) => {
    if (racer.kind === 'replay') {
      drawCar(racer.pose.x, racer.pose.y, racer.pose.heading, racer.color, racer.label);
      return;
    }
    const point = pointAtDistance(racer.distance);
    drawCar(
      point.x - Math.sin(point.angle) * racer.lateral,
      point.y + Math.cos(point.angle) * racer.lateral,
      point.angle,
      racer.color,
      racer.label,
    );
  });

  drawCar(player.x, player.y, player.heading, '#ff6b6b', 'YOU');
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
