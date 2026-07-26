/**
 * The coffee break — a hand-crank grinder and a lever machine in the rail,
 * one card under the index. Seven stations, one shot:
 *
 *   beans → crank the grinder → dose the portafilter → tamp → lock it in →
 *   pull the lever → drink.
 *
 * Everything is painted into a 128×104 canvas, one game pixel per canvas
 * pixel, and blown up by CSS exactly like the racetrack. No sprite sheets —
 * the whole café is fillRect — so the palette stays literal hex from the
 * page palette, and DMG mode's canvas filter greens the espresso for free.
 */

const W = 128;
const H = 104;
const COUNTER_Y = 88;

/** The page palette, plus the browns coffee insists on bringing with it. */
const C = {
  bg: '#0b0a12',
  star: '#2e2a3a',
  outline: '#07060c',
  plastic: '#16141d',
  plasticLit: '#2e2a3a',
  steel: '#8a849f',
  steelLit: '#e8e4f4',
  indigo: '#7b68ee',
  brass: '#ffb000',
  brassDark: '#a06f00',
  red: '#e60012',
  green: '#2ed573',
  wood: '#a9793f',
  woodDark: '#6e4d28',
  woodDeep: '#43301a',
  burlap: '#c9a36a',
  burlapDark: '#8f6c3d',
  bean: '#7a5230',
  beanDark: '#54371e',
  grounds: '#5a3a22',
  espresso: '#2f1b0e',
  crema: '#d29a55',
  cream: '#f2e6d0',
};

const STEP = { BEANS: 0, GRIND: 1, DOSE: 2, TAMP: 3, LOCK: 4, PULL: 5, SERVE: 6 };

const HINTS = [
  'click the bean sack — load the hopper',
  'hold the grinder — crank it',
  'click the portafilter — dose the grounds',
  'click again — tamp it flat',
  'click the group head — lock it in',
  'hold the lever — pull the shot',
  'shot’s ready — click the cup',
];

/** One rectangle of permission per station, plus where the hint arrow bobs. */
const HOTSPOTS = [
  { x: 34, y: 58, w: 26, h: 32, ax: 47, ay: 56 }, // bean sack
  { x: 8, y: 12, w: 34, h: 40, ax: 24, ay: 12 }, // grinder + crank
  { x: 56, y: 74, w: 28, h: 16, ax: 70, ay: 72 }, // portafilter (dose)
  { x: 56, y: 74, w: 28, h: 16, ax: 70, ay: 72 }, // portafilter (tamp)
  { x: 80, y: 48, w: 22, h: 22, ax: 91, ay: 46 }, // group head
  { x: 94, y: 14, w: 34, h: 34, ax: 104, ay: 19 }, // lever
  { x: 80, y: 70, w: 24, h: 18, ax: 81, ay: 84 }, // the cup
];

const STORE_KEY = 'mz.espresso.shots';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('espresso-canvas');
const hintEl = document.getElementById('espresso-hint');
const shotsEl = document.getElementById('espresso-shots');

if (canvas) init();

function init() {
  const ctx = canvas.getContext('2d');

  const state = {
    step: STEP.BEANS,
    busy: false, // a transition animation owns the scene; clicks bounce off
    holding: false,
    crank: -1.1, // crank arm angle, radians
    hopper: 0, // beans in the glass, 0..1
    grind: 0, // crank progress, 0..1
    drawer: 0, // grounds in the drawer, 0..1
    mound: 0, // grounds in the basket, 0..1
    tamped: false,
    tamper: 0, // tamper travel, 0..1, out-and-back
    lock: 0, // portafilter travel to the group, 0..1
    lever: 0, // lever travel, 0 up .. 1 pulled
    pour: 0, // extraction, 0..1
    fade: 0, // end-of-loop blackout, 0..1..0
    fading: null, // null | 'out' | 'in'
    time: 0,
    shots: Number(localStorage.getItem(STORE_KEY) || 0),
  };

  /** Fistfuls of things in flight: beans, grounds, steam, sparkles, the +1. */
  const particles = [];

  let lastTick = 0; // grind ratchet sound timer
  let lastBubble = 0; // pour gurgle timer
  let visible = true;
  let rafId = 0;
  let last = 0;

  shotsEl.textContent = String(state.shots);
  setHint(HINTS[state.step]);

  /* ------------------------------------------------------------- sound */

  /**
   * The same two-oscillator-lines-of-code chip beeps the sound test uses,
   * kept quiet enough to be foley rather than music. Everything is wrapped
   * so a missing audio device costs nothing.
   */
  let audio;

  function beep(freq, at = 0, duration = 0.05, type = 'square', gain = 0.02) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audio ??= new Ctx();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator();
      const amp = audio.createGain();
      const start = audio.currentTime + at;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      amp.gain.setValueAtTime(gain, start);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(amp).connect(audio.destination);
      osc.start(start);
      osc.stop(start + duration);
    } catch {
      /* silence is also a texture */
    }
  }

  /* -------------------------------------------------------- interaction */

  function hotspot() {
    return HOTSPOTS[state.step];
  }

  function toGame(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H,
    };
  }

  function inside(point, spot) {
    return point.x >= spot.x && point.x <= spot.x + spot.w && point.y >= spot.y && point.y <= spot.y + spot.h;
  }

  function press() {
    if (state.busy) return;
    switch (state.step) {
      case STEP.BEANS:
        state.busy = true;
        beep(520, 0, 0.05);
        flyBeans();
        break;
      case STEP.GRIND:
      case STEP.PULL:
        state.holding = true;
        break;
      case STEP.DOSE:
        state.busy = true;
        beep(520, 0, 0.05);
        flyGrounds();
        break;
      case STEP.TAMP:
        state.busy = true;
        beep(180, 0, 0.07);
        break; // the tamper animation runs in update()
      case STEP.LOCK:
        state.busy = true;
        beep(300, 0, 0.05);
        break; // so does the portafilter's trip to the group
      case STEP.SERVE:
        serve();
        break;
      default:
        break;
    }
  }

  function release() {
    state.holding = false;
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    if (inside(toGame(event), hotspot())) press();
  });
  window.addEventListener('pointerup', release);
  canvas.addEventListener('pointerleave', release);
  canvas.addEventListener('pointermove', (event) => {
    canvas.style.cursor = inside(toGame(event), hotspot()) ? 'pointer' : 'default';
  });

  // The whole game is one button at a time, so one key drives it too.
  canvas.addEventListener('keydown', (event) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) press();
  });
  canvas.addEventListener('keyup', (event) => {
    if (event.key === ' ' || event.key === 'Enter') release();
  });

  // No point simulating an espresso machine nobody is looking at.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !rafId) {
      last = 0;
      rafId = requestAnimationFrame(frame);
    }
  }).observe(canvas);

  /* --------------------------------------------------------- transitions */

  function setHint(text) {
    if (hintEl) hintEl.textContent = text;
  }

  function advance(step) {
    state.step = step;
    state.busy = false;
    setHint(HINTS[step]);
    beep(660, 0, 0.045);
    beep(880, 0.06, 0.05);
  }

  /** A scoop of beans arcs from the sack into the hopper glass. */
  function flyBeans() {
    for (let i = 0; i < 9; i += 1) {
      particles.push({
        kind: 'bean',
        from: [45 + (i % 3) * 2, 63],
        to: [22 + (i % 5), 40],
        peak: 18,
        t: -i * 0.06,
        dur: 0.55,
      });
    }
  }

  /** The drawer's grounds hop over to the waiting basket. */
  function flyGrounds() {
    for (let i = 0; i < 10; i += 1) {
      particles.push({
        kind: 'grounds',
        from: [22 + (i % 5), 82],
        to: [65 + (i % 7), 80],
        peak: 56,
        t: -i * 0.05,
        dur: 0.5,
      });
    }
  }

  function serve() {
    state.busy = true;
    state.shots += 1;
    localStorage.setItem(STORE_KEY, String(state.shots));
    shotsEl.textContent = String(state.shots);
    setHint('ahh. that’s the stuff.');
    beep(523, 0, 0.08, 'triangle', 0.025);
    beep(392, 0.09, 0.12, 'triangle', 0.025);
    particles.push({ kind: 'plusone', x: 92, y: 70, t: 0, dur: 1.1 });
    setTimeout(() => {
      state.fading = 'out';
    }, 900);
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      particles.push({
        kind: 'spark',
        x: 92,
        y: 78,
        vx: Math.cos(angle) * 26,
        vy: Math.sin(angle) * 26 - 12,
        t: 0,
        dur: 0.6,
      });
    }
    // One shot on the house: the first pull is one of the page's secrets.
    window.dispatchEvent(new CustomEvent('mz:secret', { detail: 'espresso' }));
  }

  function resetScene() {
    Object.assign(state, {
      step: STEP.BEANS,
      busy: false,
      holding: false,
      hopper: 0,
      grind: 0,
      drawer: 0,
      mound: 0,
      tamped: false,
      tamper: 0,
      lock: 0,
      lever: 0,
      pour: 0,
    });
    setHint(HINTS[STEP.BEANS]);
  }

  /* -------------------------------------------------------------- update */

  function update(dt) {
    state.time += dt;

    // Beans in flight own the BEANS → GRIND transition.
    if (state.step === STEP.BEANS && state.busy && !particles.some((p) => p.kind === 'bean')) {
      state.hopper = 1;
      advance(STEP.GRIND);
    }

    if (state.step === STEP.GRIND && state.holding) {
      state.crank += dt * 9;
      state.grind = Math.min(1, state.grind + dt / 2.4);
      state.hopper = 1 - state.grind;
      state.drawer = state.grind;
      if (state.time - lastTick > 0.11) {
        lastTick = state.time;
        beep(85 + Math.random() * 20, 0, 0.03, 'square', 0.028);
      }
      if (state.grind >= 1) {
        state.holding = false;
        advance(STEP.DOSE);
      }
    }

    if (state.step === STEP.DOSE && state.busy) {
      if (!particles.some((p) => p.kind === 'grounds')) {
        state.mound = 1;
        state.drawer = 0;
        advance(STEP.TAMP);
      } else {
        state.drawer = Math.max(0, state.drawer - dt * 2.2);
      }
    }

    // The tamper drops in, presses, and leaves. Out fast, back slower.
    if (state.step === STEP.TAMP && state.busy) {
      state.tamper = Math.min(1, state.tamper + dt * 2.6);
      if (state.tamper >= 1) {
        state.tamped = true;
        state.tamper = 0;
        particles.push({ kind: 'spark', x: 69, y: 76, vx: 0, vy: -18, t: 0, dur: 0.45 });
        advance(STEP.LOCK);
      }
    }

    if (state.step === STEP.LOCK && state.busy) {
      state.lock = Math.min(1, state.lock + dt * 2.4);
      if (state.lock >= 1) {
        beep(150, 0, 0.06, 'square', 0.03);
        advance(STEP.PULL);
      }
    }

    // The lever wants to be up; your hand is the only argument against.
    const leverTarget = state.step === STEP.PULL && state.holding && state.pour < 1 ? 1 : 0;
    state.lever += (leverTarget - state.lever) * Math.min(1, dt * 7);

    if (state.step === STEP.PULL && state.lever > 0.8 && state.pour < 1) {
      state.pour = Math.min(1, state.pour + dt / 3.4);
      if (state.time - lastBubble > 0.16) {
        lastBubble = state.time;
        beep(130 + Math.random() * 80, 0, 0.06, 'sine', 0.02);
      }
      if (state.pour >= 1) {
        state.holding = false;
        advance(STEP.SERVE);
        beep(659, 0.15, 0.09, 'triangle', 0.025);
        beep(784, 0.25, 0.09, 'triangle', 0.025);
        beep(1046, 0.35, 0.14, 'triangle', 0.025);
      }
    }

    // A served cup breathes; so does the machine's relief valve, sometimes.
    if (!reduceMotion && state.step === STEP.SERVE && Math.random() < dt * 4) {
      particles.push({ kind: 'steam', x: 90 + Math.random() * 5, y: 74, t: 0, dur: 1.4 });
    }
    if (!reduceMotion && Math.random() < dt * 0.25) {
      particles.push({ kind: 'steam', x: 118 + Math.random() * 2, y: 29, t: 0, dur: 1.1 });
    }

    // The post-shot blackout: fade down, reset the café, fade back up.
    if (state.fading === 'out') {
      state.fade = Math.min(1, state.fade + dt * 2.5);
      if (state.fade >= 1) {
        resetScene();
        state.fading = 'in';
      }
    } else if (state.fading === 'in') {
      state.fade = Math.max(0, state.fade - dt * 2.5);
      if (state.fade <= 0) state.fading = null;
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.t += dt;
      if (p.t > p.dur) particles.splice(i, 1);
    }
  }

  /* ---------------------------------------------------------------- draw */

  const px = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };

  /** A 1px line walked pixel by pixel, because lineTo() would anti-alias. */
  function pixelLine(x0, y0, x1, y1, color, thick = 1) {
    const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
    for (let i = 0; i <= steps; i += 1) {
      const t = steps === 0 ? 0 : i / steps;
      px(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thick, thick, color);
    }
  }

  function drawBackdrop() {
    px(0, 0, W, H, C.bg);
    [[9, 10], [52, 6], [88, 9], [118, 13], [70, 18]].forEach(([x, y]) => px(x, y, 1, 1, C.star));
    // The counter: a lit lip, a shadow line, then planks all the way down.
    px(0, COUNTER_Y, W, 2, C.wood);
    px(0, COUNTER_Y + 2, W, 1, C.woodDeep);
    px(0, COUNTER_Y + 3, W, H - COUNTER_Y - 3, C.woodDark);
    for (let x = 10; x < W; x += 26) px(x, COUNTER_Y + 3, 1, H - COUNTER_Y - 3, C.woodDeep);
  }

  function drawSack() {
    px(39, 66, 18, 22, C.burlap);
    px(38, 70, 1, 18, C.burlapDark);
    px(57, 70, 1, 18, C.burlapDark);
    px(39, 64, 18, 3, C.burlapDark); // the rolled cuff
    px(41, 63, 14, 2, C.burlap);
    // beans heaped in the open mouth — gone once they are in the hopper
    if (state.step === STEP.BEANS) {
      [[43, 62], [46, 61], [49, 62], [45, 63], [48, 63]].forEach(([x, y]) => px(x, y, 2, 2, C.bean));
    }
    // the stitched patch every sack of "single origin" wears
    px(43, 73, 10, 8, C.burlapDark);
    px(44, 74, 8, 6, C.burlap);
    px(46, 76, 2, 2, C.bean);
    px(49, 75, 1, 1, C.bean);
  }

  function drawGrinder() {
    const shake = state.holding && state.step === STEP.GRIND && !reduceMotion
      ? Math.round(Math.sin(state.time * 55)) : 0;
    ctx.save();
    ctx.translate(shake, 0);

    // hopper glass: a funnel with a visible bean level
    pixelLine(14, 34, 20, 47, C.steel);
    pixelLine(34, 34, 28, 47, C.steel);
    px(14, 33, 21, 1, C.steelLit);
    if (state.hopper > 0) {
      const depth = Math.round(9 * state.hopper);
      for (let i = 0; i < depth; i += 1) {
        const y = 46 - i;
        const half = 4 + Math.round((46 - y) * 0.45);
        px(24 - half + 1, y, half * 2 - 1, 1, i % 2 ? C.bean : C.beanDark);
      }
    }
    px(20, 47, 9, 4, C.brass);
    px(20, 47, 9, 1, C.brassDark);

    // the mill box
    px(15, 51, 19, 29, C.wood);
    px(15, 51, 19, 1, C.burlap);
    px(32, 51, 2, 29, C.woodDark);
    px(15, 79, 19, 1, C.woodDeep);
    px(23, 62, 3, 3, C.indigo); // the decal every heirloom grinder earns
    px(24, 61, 1, 5, C.indigo);
    px(22, 63, 5, 1, C.indigo);

    // drawer: grounds heap up over its lip as the crank does its work
    px(17, 80, 15, 8, C.woodDeep);
    px(17, 80, 15, 1, C.outline);
    px(23, 83, 3, 2, C.brass);
    if (state.drawer > 0) {
      const width = Math.round(11 * state.drawer);
      px(24 - Math.floor(width / 2), 79, width, 2, C.grounds);
      if (state.drawer > 0.5) px(22, 78, 5, 1, C.grounds);
    }

    // crank: a brass hub, a steel arm, a wooden knob going around
    const arm = 9;
    const ax = 24 + Math.cos(state.crank) * arm;
    const ay = 31 + Math.sin(state.crank) * arm * 0.9;
    pixelLine(24, 31, ax, ay, C.steel);
    px(23, 30, 3, 3, C.brass);
    px(ax - 1, ay - 1, 3, 3, C.wood);
    px(ax - 1, ay - 1, 3, 1, C.burlap);

    ctx.restore();
  }

  function drawMachine() {
    // drip tray first, so the body sits on it
    px(84, 84, 40, 4, C.plasticLit);
    px(84, 84, 40, 1, C.steel);
    for (let x = 87; x < 122; x += 4) px(x, 85, 2, 1, C.outline);

    // boiler, side view: brushed steel face, dark plastic side
    px(100, 38, 24, 46, C.steel);
    px(100, 38, 24, 1, C.steelLit);
    px(120, 38, 4, 46, C.plasticLit);
    px(100, 82, 24, 2, C.plastic);
    px(98, 36, 28, 3, C.plasticLit); // top cap
    px(98, 36, 28, 1, C.steel);
    px(117, 30, 3, 6, C.brass); // relief valve chimney
    px(117, 30, 3, 1, C.brassDark);

    // gauge: brass ring, black face, a needle that believes in you
    px(110, 47, 7, 7, C.brassDark);
    px(111, 48, 5, 5, C.plastic);
    const sweep = -Math.PI * 0.75 + state.pour * Math.PI * 0.9;
    px(113 + Math.cos(sweep) * 2, 50 + Math.sin(sweep) * 2, 1, 1, C.crema);
    px(113, 50, 1, 1, C.steelLit);

    // status lights: red means on, green means espresso
    px(103, 42, 2, 2, Math.sin(state.time * 2.2) > -0.6 ? C.red : '#57100f');
    px(103, 46, 2, 2, state.step >= STEP.SERVE ? C.green : '#0f3a24');

    px(104, 62, 16, 8, C.plastic); // the badge plate
    px(105, 63, 14, 6, C.plasticLit);
    px(107, 65, 10, 2, C.brass); // "LA PIXELLE", if you squint

    // group head, poking out of the left face
    px(94, 56, 8, 6, C.steel);
    px(86, 54, 10, 12, C.steel);
    px(86, 54, 10, 1, C.steelLit);
    px(88, 66, 6, 2, C.plasticLit);

    // the lever: up at rest, argued downward while you hold it. The arm is
    // steel over a dark shadow so it survives both backgrounds — black sky
    // when up, steel body when pulled.
    const angle = -Math.PI / 2 + state.lever * (Math.PI * 0.64);
    const ex = 104 + Math.cos(angle) * 15;
    const ey = 38 + Math.sin(angle) * 15;
    pixelLine(105, 39, ex + 1, ey + 1, C.outline, 2);
    pixelLine(104, 38, ex, ey, C.steelLit);
    px(103, 37, 4, 4, C.plasticLit);
    px(ex - 1, ey - 2, 4, 4, C.wood);
    px(ex - 1, ey - 2, 4, 1, C.burlap);
  }

  /** The portafilter lives three lives: counter, in transit, locked in. */
  function drawPortafilter() {
    const t = state.lock;
    const bx = Math.round(61 + (85 - 61) * t);
    const by = Math.round(82 + (66 - 82) * t);

    px(bx, by, 14, 4, C.steel);
    px(bx + 1, by + 4, 12, 2, C.plasticLit);
    if (t >= 1) {
      // locked: spouts down, handle swung out to the left
      px(bx + 3, by + 6, 2, 2, C.steel);
      px(bx + 8, by + 6, 2, 2, C.steel);
      px(bx - 9, by + 1, 9, 2, C.plastic);
      px(bx - 9, by + 1, 9, 1, C.plasticLit);
    } else {
      px(bx + 14, by + 1, 7, 2, C.plastic);
      px(bx + 14, by + 1, 7, 1, C.plasticLit);
    }

    // what's in the basket: nothing, a mound, or a tamped puck
    if (state.mound > 0) {
      if (state.tamped) {
        px(bx + 2, by, 10, 1, C.grounds);
      } else {
        px(bx + 2, by - 1, 10, 1, C.grounds);
        px(bx + 4, by - 2, 6, 1, C.grounds);
        px(bx + 6, by - 3, 2, 1, C.grounds);
      }
    }

    // the tamper only exists for the half second it is needed
    if (state.step === STEP.TAMP && state.busy) {
      const travel = Math.sin(Math.min(1, state.tamper) * Math.PI); // down and back
      const ty = by - 14 + Math.round(travel * 10);
      px(bx + 5, ty - 4, 4, 4, C.wood);
      px(bx + 3, ty, 8, 2, C.steel);
    }
  }

  function drawCup() {
    if (state.lock < 1) return; // the cup arrives with the portafilter
    // demitasse, cutaway view so the shot has somewhere visible to go
    px(86, 76, 2, 8, C.cream);
    px(96, 76, 2, 8, C.cream);
    px(87, 83, 10, 2, C.cream);
    px(98, 78, 2, 4, C.cream); // handle
    px(99, 79, 1, 2, C.bg);
    if (state.pour > 0) {
      const depth = Math.max(1, Math.round(6 * state.pour));
      px(88, 83 - depth, 8, depth, C.espresso);
      if (state.pour >= 1) px(88, 83 - depth, 8, 1, C.crema);
    }

    // twin streams while the lever is doing its one job
    if (state.step === STEP.PULL && state.lever > 0.8 && state.pour < 1) {
      const wobble = Math.floor(state.time * 20) % 2;
      px(88 + wobble, 74, 1, 9 - Math.round(6 * state.pour), C.espresso);
      px(93 - wobble, 74, 1, 9 - Math.round(6 * state.pour), C.espresso);
    }
  }

  function drawParticles() {
    particles.forEach((p) => {
      if (p.t < 0) return;
      const k = Math.min(1, p.t / p.dur);
      if (p.kind === 'bean' || p.kind === 'grounds') {
        const x = p.from[0] + (p.to[0] - p.from[0]) * k;
        const base = p.from[1] + (p.to[1] - p.from[1]) * k;
        const y = base - Math.sin(k * Math.PI) * (p.from[1] - p.peak);
        px(x, y, 2, 2, p.kind === 'bean' ? C.bean : C.grounds);
      } else if (p.kind === 'steam') {
        ctx.globalAlpha = 0.55 * (1 - k);
        px(p.x + Math.sin((p.t + p.x) * 5) * 2, p.y - k * 14, 2, 2, C.steelLit);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'spark') {
        ctx.globalAlpha = 1 - k;
        px(p.x + p.vx * p.t, p.y + p.vy * p.t + 30 * p.t * p.t, 2, 2, C.brass);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'plusone') {
        ctx.globalAlpha = 1 - k;
        const x = p.x;
        const y = p.y - k * 12;
        px(x, y + 1, 3, 1, C.brass); // +
        px(x + 1, y, 1, 3, C.brass);
        px(x + 5, y, 1, 3, C.brass); // 1
        ctx.globalAlpha = 1;
      }
    });
  }

  /** A bobbing amber arrow over whatever wants to be clicked next. */
  function drawArrow() {
    if (state.busy || state.holding) return;
    const spot = hotspot();
    const bob = reduceMotion ? 0 : Math.round(Math.sin(state.time * 5) * 2);
    const y = spot.ay - 8 + bob;
    px(spot.ax - 2, y, 5, 1, C.brass);
    px(spot.ax - 1, y + 1, 3, 1, C.brass);
    px(spot.ax, y + 2, 1, 1, C.brass);
  }

  /** Hold-step progress, drawn as a skinny amber bar along the top. */
  function drawProgress() {
    const value = state.step === STEP.GRIND ? state.grind : state.step === STEP.PULL ? state.pour : 0;
    if (value <= 0 || value >= 1) return;
    px(44, 4, 40, 5, C.plastic);
    px(45, 5, 38, 3, C.bg);
    px(46, 6, Math.round(36 * value), 1, C.brass);
  }

  function draw() {
    drawBackdrop();
    drawSack();
    drawGrinder();
    drawMachine();
    drawCup();
    drawPortafilter();
    drawParticles();
    drawArrow();
    drawProgress();
    if (state.fade > 0) {
      ctx.globalAlpha = state.fade;
      px(0, 0, W, H, C.bg);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------------------------------------------------------- loop */

  function frame(now) {
    if (!visible) {
      rafId = 0;
      return;
    }
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    update(dt);
    draw();
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
}
