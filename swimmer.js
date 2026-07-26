/**
 * The dot-matrix screen holds water. Click the portrait and a creature of ten
 * thousand points swims across the page behind the cards, bottom-left corner
 * to top-right, then it's gone.
 *
 * The creature is yuruyurau's #つぶやきProcessing piece, transcribed from the
 * tweet-sized p5 source (https://x.com/yuruyurau/status/2080977918914969636):
 *
 *   a=(y,d=mag(k=(4+cos(i/9-t*2))*cos(i/35),e=y/7-13)+sin(e/9+t/2)-4)=>
 *     point((q=2*sin(k*3)-y/35*k*(9+k*sin(cos(e)*9-d*2+t)))+40*cos(c=d-t)+200,
 *           q*sin(c)+d*35)
 *   t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,96);
 *     for(t+=PI/80,i=1e4;i--;)a(i/235)}
 *
 * The math is kept verbatim on its original 400×400 grid; each point lands in
 * an ImageData buffer (10k fill-rects a frame would hurt) and the finished
 * frame is stamped onto a fixed full-viewport canvas, rotated to face where
 * it's headed. The layer only exists while something is swimming.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const GRID = 400;           // the creature's native canvas size
const POINTS = 1e4;
const PHASE_STEP = Math.PI / 80;   // per 60Hz-frame, scaled by real dt below
const MAX_SWIMMERS = 3;

/* ------------------------------------------------- the creature, verbatim */

const off = document.createElement('canvas');
off.width = off.height = GRID;
const offCtx = off.getContext('2d');
const frame = offCtx.createImageData(GRID, GRID);
const px = frame.data;

/** One frame of the point cloud at phase t, in paper white at stroke(_, 96). */
function renderCreature(t) {
  px.fill(0);
  for (let i = POINTS; i--; ) {
    const y = i / 235;
    const k = (4 + Math.cos(i / 9 - t * 2)) * Math.cos(i / 35);
    const e = y / 7 - 13;
    const d = Math.hypot(k, e) + Math.sin(e / 9 + t / 2) - 4;
    const c = d - t;
    const q = 2 * Math.sin(k * 3) - (y / 35) * k * (9 + k * Math.sin(Math.cos(e) * 9 - d * 2 + t));
    const X = Math.round(q + 40 * Math.cos(c) + 200);
    const Y = Math.round(q * Math.sin(c) + d * 35);
    if (X >= 0 && X < GRID && Y >= 0 && Y < GRID) {
      const idx = (Y * GRID + X) * 4;
      px[idx] = 242;
      px[idx + 1] = 240;
      px[idx + 2] = 250;
      px[idx + 3] = Math.min(255, px[idx + 3] + 96);
    }
  }
  offCtx.putImageData(frame, 0, 0);
}

/* ------------------------------------------------------- the open water */

let layer = null;
let ctx = null;
let raf = 0;
let last = 0;
let swimmers = [];

function ensureLayer() {
  if (layer) return;
  layer = document.createElement('canvas');
  layer.className = 'swim-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  ctx = layer.getContext('2d');
  fit();
  window.addEventListener('resize', fit);
}

function fit() {
  if (!layer) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  layer.width = Math.round(window.innerWidth * dpr);
  layer.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Scaling the 400px grid up should keep its dots square, not smear them.
  ctx.imageSmoothingEnabled = false;
}

/**
 * Position along the crossing at progress p ∈ [0,1]: a straight bottom-left →
 * top-right line plus a perpendicular sway, so it swims rather than slides.
 */
function pose(s, p) {
  const m = s.size * 0.75; // start and end fully offscreen
  const x0 = -m;
  const y0 = window.innerHeight + m;
  const dx = window.innerWidth + 2 * m;
  const dy = -(window.innerHeight + 2 * m);
  const len = Math.hypot(dx, dy);
  const sway = Math.sin(p * s.swayCycles * 2 * Math.PI + s.swayPhase) * s.swayAmp;
  return {
    x: x0 + dx * p + (-dy / len) * sway,
    y: y0 + dy * p + (dx / len) * sway,
  };
}

function tick(now) {
  const dt = Math.min(now - last, 100); // a backgrounded tab shouldn't teleport it
  last = now;

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  swimmers = swimmers.filter((s) => {
    s.p += dt / s.duration;
    if (s.p >= 1) return false;
    s.t += PHASE_STEP * (dt / (1000 / 60));

    renderCreature(s.t);
    const here = pose(s, s.p);
    const ahead = pose(s, s.p + 0.001);
    // The creature's head points up its own grid; aim that along the travel.
    const heading = Math.atan2(ahead.y - here.y, ahead.x - here.x) + Math.PI / 2;
    ctx.save();
    ctx.translate(here.x, here.y);
    ctx.rotate(heading);
    ctx.drawImage(off, -s.size / 2, -s.size / 2, s.size, s.size);
    ctx.restore();
    return true;
  });

  if (swimmers.length) {
    raf = requestAnimationFrame(tick);
  } else {
    raf = 0;
    layer.remove();
    window.removeEventListener('resize', fit);
    layer = ctx = null;
  }
}

function spawn() {
  if (swimmers.length >= MAX_SWIMMERS) return;
  ensureLayer();
  swimmers.push({
    p: 0,
    t: Math.random() * Math.PI * 2,
    duration: 15000 + Math.random() * 4000,
    size: Math.min(window.innerWidth, window.innerHeight) * (0.5 + Math.random() * 0.15),
    swayAmp: 30 + Math.random() * 30,
    swayCycles: 2 + Math.random() * 1.5,
    swayPhase: Math.random() * Math.PI * 2,
  });
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
}

/* ------------------------------------------------------------- the tap */

const screen = document.querySelector('.portrait-screen');
if (screen) {
  screen.addEventListener('click', () => {
    // The secret unlocks either way; the swim itself respects reduced motion.
    window.dispatchEvent(new CustomEvent('mz:secret', { detail: 'koi' }));
    if (!reduceMotion) spawn();
  });
}
