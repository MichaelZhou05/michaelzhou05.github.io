/**
 * The coffee break — a hand-crank grinder and a lever machine in the rail,
 * one card under the index. Seven stations, one shot:
 *
 *   beans → crank the grinder → dose the portafilter → tamp → lock it in →
 *   pull the lever → drink, and the café clears the level for you.
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
  cremaLit: '#e8b877',
  cream: '#f2e6d0',
  cupShade: '#c9b79a',
  cupDark: '#8f7f68',
  cupHollow: '#6b5c4a', // the shadow that pools in the bottom of an empty cup
};

const STEP = { BEANS: 0, GRIND: 1, DOSE: 2, TAMP: 3, LOCK: 4, PULL: 5, SERVE: 6 };

/** On a phone nobody clicks — the ticket says tap, the verb a thumb knows. */
const COARSE_POINTER = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const HINTS = [
  'click the bean sack — scoop the beans',
  'hold the grinder — crank it',
  'click the portafilter — to the grinder',
  'click again — tamp it flat',
  'click the group head — lock it in',
  'hold the lever — pull the shot',
  'shot’s ready — click the cup',
].map((hint) => (COARSE_POINTER ? hint.replace('click', 'tap') : hint));

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

/**
 * The reward: once the shot is pulled the camera forgets the café, the cup
 * comes at you and swells until it owns the frame, then flashes out and the
 * screen hands you a level-clear card. Seconds per beat, plus where the big
 * cup parks.
 */
const CINE = { approach: 0.8, hold: 0.45, clear: 2.1, x: 64, y: 78, s: 4.6 };

/** What the café shouts at you when the shot lands. */
const CHEERS = [
  { word: 'PERFETTO!', hint: 'perfetto — that’s a proper shot.' },
  { word: 'BUONISSIMO!', hint: 'buonissimo. crema like velvet.' },
  { word: 'DELIZIOSO!', hint: 'delizioso. the machine agrees.' },
  { word: 'MAGNIFICO!', hint: 'magnifico. nonna would approve.' },
  { word: 'SQUISITO!', hint: 'squisito. one more? always.' },
  { word: 'BRAVISSIMO!', hint: 'bravissimo, barista.' },
];

/**
 * A 4×5 pixel alphabet, one string of 20 bits per glyph, read left to right,
 * top to bottom. Four wide rather than three purely so N keeps its diagonal
 * and stops reading as M.
 */
const GLYPH_W = 4;
const FONT = {
  A: '01101001111110011001', B: '11101001111010011110', C: '01111000100010000111',
  D: '11101001100110011110', E: '11111000111010001111', F: '11111000111010001000',
  G: '01111000101110010111', H: '10011001111110011001', I: '11100100010001001110',
  J: '00110001000110010110', K: '10011010110010101001', L: '10001000100010001111',
  M: '10011111111110011001', N: '10011101111110111001', O: '01101001100110010110',
  P: '11101001111010001000', Q: '01101001100110110111', R: '11101001111010101001',
  S: '01111000011000011110', T: '11110100010001000100', U: '10011001100110010110',
  V: '10011001100110100100', W: '10011001111111111001', X: '10011001011010011001',
  Y: '10011001011001000100', Z: '11110001011010001111', '!': '01000100010000000100',
  ' ': '0'.repeat(20),
  0: '01101001100110010110', 1: '01001100010001001110', 2: '11100001011010001111',
  3: '11100001011000011110', 4: '10101010111100100010', 5: '11111000111000011110',
  6: '01101000111010010110', 7: '11110001001001000100', 8: '01101001011010010110',
  9: '01101001011100010110',
};

/** The star that pops in when a level is cleared, 5×5. */
const STAR = ['00100', '01110', '11111', '01110', '00100'];

/**
 * The tamp, as a fraction of the whole move: down, held against the puck,
 * back up. The strokes keep their old speed; the dwell in the middle is the
 * ~0.2s where you are actually leaning on it.
 */
const TAMP_DIP = 0.355;
const tamperTravel = (t) => {
  if (t < TAMP_DIP) return Math.sin((t / TAMP_DIP) * (Math.PI / 2));
  if (t < 1 - TAMP_DIP) return 1;
  return Math.sin(((1 - t) / TAMP_DIP) * (Math.PI / 2));
};

const easeOut = (k) => 1 - (1 - k) ** 3;
/** Overshoots by a hair on the way in, so things land instead of stopping. */
const easeOutBack = (k) => 1 + 2.2 * (k - 1) ** 3 + 1.4 * (k - 1) ** 2;
/** Everything that travels across the counter leaves and arrives gently. */
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
const lerp = (a, b, k) => a + (b - a) * k;

/**
 * The bean scoop, three poses deep: upright, halfway over, and tipped out.
 * S is steel, L its lit edge, D the inside — which is beans when the scoop is
 * loaded and shadow when it isn't.
 */
const SCOOP_UP = [
  '.......SS',
  '......SS.',
  'LLLLLLL..',
  'SDDDDDS..',
  'SDDDDDS..',
  '.SSSSS...',
];
const SCOOP_MID = [
  '.....SS',
  '....SS.',
  '..LLS..',
  '.LDDS..',
  'LDDDS..',
  '.SSS...',
];
const SCOOP_POUR = [
  '.....SS',
  '....SS.',
  'LSSSS..',
  '.DDDS..',
  '.DDDS..',
  'LSSSS..',
];

/** Where the scoop rests, digs, and tips out. */
const SCOOP_REST = [42, 56];
const SCOOP_DIP = [42, 61];
const SCOOP_POUR_AT = [23, 26];
const SCOOP_TIMES = { dip: 0.3, lift: 0.5, pour: 0.65, back: 0.45 };

/** The portafilter's three addresses: the counter, the grinder, the group. */
const PF_REST = [61, 82];
const PF_DOCK = [17, 82]; // between the grinder's legs, under its chute
const PF_GROUP = [85, 66];

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
    mill: 0, // ground coffee waiting in the mill's window, 0..1
    mound: 0, // grounds in the basket, 0..1
    tamped: false,
    tamper: 0, // tamper travel, 0..1, out-and-back
    scoop: { phase: 'rest', t: 0, load: 0, x: SCOOP_REST[0], y: SCOOP_REST[1] },
    pf: { x: PF_REST[0], y: PF_REST[1] }, // the portafilter goes to the coffee
    pfTween: null, // { fx, fy, tx, ty, t, dur, next }
    dosing: null, // null | 'travel' | 'fill' | 'back'
    locked: false, // clamped into the group head
    lever: 0, // lever travel, 0 up .. 1 pulled
    pour: 0, // extraction, 0..1
    cine: null, // the victory lap: { phase, t, star, cheer }
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
        state.scoop.phase = 'dip'; // the scoop takes it from here
        state.scoop.t = 0;
        break;
      case STEP.GRIND:
      case STEP.PULL:
        state.holding = true;
        break;
      case STEP.DOSE:
        state.busy = true;
        beep(520, 0, 0.05);
        state.dosing = 'travel';
        movePf(PF_DOCK, 0.65, () => {
          state.dosing = 'fill';
          beep(220, 0, 0.05, 'square', 0.026);
        });
        break;
      case STEP.TAMP:
        state.busy = true;
        beep(180, 0, 0.07);
        break; // the tamper animation runs in update()
      case STEP.LOCK:
        state.busy = true;
        beep(300, 0, 0.05);
        movePf(PF_GROUP, 0.7, () => {
          state.locked = true;
          beep(150, 0, 0.06, 'square', 0.03);
          advance(STEP.PULL);
        });
        break;
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
  window.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', release);
  // Holding the lever is a pull, not a long-press: no context menu, and no
  // text-selection spilling out of the screen into the card around it.
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
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

  /** Slide the portafilter to an address on the counter, then do the thing. */
  function movePf(to, dur, next) {
    state.pfTween = { fx: state.pf.x, fy: state.pf.y, tx: to[0], ty: to[1], t: 0, dur, next };
  }

  /**
   * The scoop's round trip: dig into the sack, carry it up, tip it into the
   * hopper, come back. Each leg eases in and out, so it reads as a hand
   * moving rather than a sprite teleporting.
   */
  function updateScoop(dt) {
    const s = state.scoop;
    s.t += dt;
    const k = Math.min(1, s.t / SCOOP_TIMES[s.phase]);
    const e = easeInOut(k);

    if (s.phase === 'dip') {
      s.x = lerp(SCOOP_REST[0], SCOOP_DIP[0], e);
      s.y = lerp(SCOOP_REST[1], SCOOP_DIP[1], e);
      s.load = Math.min(1, k * 1.5);
      if (state.time - lastTick > 0.09) {
        lastTick = state.time;
        beep(70 + Math.random() * 30, 0, 0.04, 'square', 0.02); // beans shifting
      }
      if (k >= 1) {
        s.phase = 'lift';
        s.t = 0;
      }
    } else if (s.phase === 'lift') {
      s.x = lerp(SCOOP_DIP[0], SCOOP_POUR_AT[0], e);
      s.y = lerp(SCOOP_DIP[1], SCOOP_POUR_AT[1], e) - Math.sin(k * Math.PI) * 5;
      if (k >= 1) {
        s.phase = 'pour';
        s.t = 0;
      }
    } else if (s.phase === 'pour') {
      [s.x, s.y] = SCOOP_POUR_AT;
      s.load = 1 - k;
      state.hopper = k;
      if (k < 0.92) {
        particles.push({
          kind: 'fall',
          color: C.bean,
          x: 23 + Math.random() * 3,
          y: 30,
          vy: 26,
          t: 0,
          dur: 0.22,
        });
        if (state.time - lastTick > 0.07) {
          lastTick = state.time;
          beep(240 + Math.random() * 160, 0, 0.03, 'square', 0.018); // rattle
        }
      }
      if (k >= 1) {
        s.phase = 'back';
        s.t = 0;
      }
    } else if (s.phase === 'back') {
      s.x = lerp(SCOOP_POUR_AT[0], SCOOP_REST[0], e);
      s.y = lerp(SCOOP_POUR_AT[1], SCOOP_REST[1], e) - Math.sin(k * Math.PI) * 4;
      if (k >= 1) {
        s.phase = 'rest';
        s.t = 0;
        beep(880, 0, 0.04, 'square', 0.016); // the scoop back in the beans
        advance(STEP.GRIND);
      }
    }
  }

  /** Which of the three scoop poses this moment in the trip wants. */
  function scoopSprite() {
    const s = state.scoop;
    if (s.phase === 'pour') return SCOOP_POUR;
    if (s.phase === 'lift' && s.t / SCOOP_TIMES.lift > 0.72) return SCOOP_MID;
    if (s.phase === 'back' && s.t / SCOOP_TIMES.back < 0.22) return SCOOP_MID;
    return SCOOP_UP;
  }

  function serve() {
    state.busy = true;
    state.shots += 1;
    localStorage.setItem(STORE_KEY, String(state.shots));
    shotsEl.textContent = String(state.shots);
    // One shot on the house: the first pull is one of the page's secrets.
    window.dispatchEvent(new CustomEvent('mz:secret', { detail: 'espresso' }));

    const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];

    // Reduced motion gets the reward without the zoom: a toast, then the reset.
    if (reduceMotion) {
      setHint(cheer.hint);
      jingle();
      particles.push({ kind: 'plusone', x: 92, y: 70, t: 0, dur: 1.1 });
      setTimeout(() => {
        state.fading = 'out';
      }, 900);
      return;
    }

    setHint('here it comes…');
    state.cine = { phase: 'approach', t: 0, star: 0, cheer };
    // a rising sweep, because the cup is coming straight at the camera
    beep(220, 0, 0.05, 'square', 0.02);
    beep(330, 0.05, 0.05, 'square', 0.02);
    beep(440, 0.1, 0.07, 'square', 0.022);
  }

  /** The four notes every 8-bit game plays when you finish something. */
  function jingle() {
    beep(523, 0, 0.07, 'square', 0.03);
    beep(659, 0.08, 0.07, 'square', 0.03);
    beep(784, 0.16, 0.07, 'square', 0.03);
    beep(1046, 0.24, 0.26, 'square', 0.034);
  }

  /** The cup pops out of existence and the card takes the screen. */
  function levelClear() {
    setHint(state.cine.cheer.hint);
    jingle();
    for (let i = 0; i < 14; i += 1) {
      const angle = (i / 14) * Math.PI * 2;
      particles.push({
        kind: 'spark',
        top: true,
        size: 3,
        x: CINE.x,
        y: CINE.y - 5 * CINE.s,
        vx: Math.cos(angle) * 58,
        vy: Math.sin(angle) * 46,
        t: 0,
        dur: 0.8,
      });
    }
  }

  function resetScene() {
    Object.assign(state, {
      step: STEP.BEANS,
      busy: false,
      holding: false,
      hopper: 0,
      grind: 0,
      mill: 0,
      mound: 0,
      tamped: false,
      tamper: 0,
      scoop: { phase: 'rest', t: 0, load: 0, x: SCOOP_REST[0], y: SCOOP_REST[1] },
      pf: { x: PF_REST[0], y: PF_REST[1] },
      pfTween: null,
      dosing: null,
      locked: false,
      lever: 0,
      pour: 0,
      cine: null,
    });
    setHint(HINTS[STEP.BEANS]);
  }

  /**
   * The drink sequence, one beat at a time. It owns the scene until the
   * blackout takes over, so every other branch in update() stays parked.
   */
  function updateCinematic(dt) {
    const c = state.cine;
    c.t += dt;

    if (c.phase === 'approach' && c.t >= CINE.approach) {
      c.phase = 'hold';
      c.t = 0;
    } else if (c.phase === 'hold' && c.t >= CINE.hold) {
      c.phase = 'clear';
      c.t = 0;
      levelClear();
    } else if (c.phase === 'clear') {
      // three stars, landing one at a time, each with its own little ding
      while (c.star < 3 && c.t >= 0.6 + c.star * 0.22) {
        beep([1319, 1568, 1976][c.star], 0, 0.07, 'square', 0.026);
        c.star += 1;
      }
      if (c.t >= CINE.clear) {
        c.phase = 'gone'; // the blackout carries it home from here
        state.fading = 'out';
      }
    }

    // Steam off a cup this close reads as heat, so it gets bigger wisps.
    if ((c.phase === 'approach' || c.phase === 'hold') && Math.random() < dt * 9) {
      const pose = cupPose();
      particles.push({
        kind: 'steam',
        top: true,
        size: 4,
        rise: 26,
        x: pose.x - 14 + Math.random() * 28,
        y: pose.y - 10 * pose.s,
        t: 0,
        dur: 1.2,
      });
    }
  }

  /* -------------------------------------------------------------- update */

  function update(dt) {
    state.time += dt;

    if (state.cine) updateCinematic(dt);

    // The scoop owns the BEANS → GRIND transition; the tween owns the rest.
    if (state.scoop.phase !== 'rest') updateScoop(dt);

    if (state.pfTween) {
      const m = state.pfTween;
      m.t += dt;
      const k = Math.min(1, m.t / m.dur);
      state.pf.x = lerp(m.fx, m.tx, easeInOut(k));
      state.pf.y = lerp(m.fy, m.ty, easeInOut(k));
      if (k >= 1) {
        state.pfTween = null;
        m.next?.();
      }
    }

    if (state.step === STEP.GRIND && state.holding) {
      state.crank += dt * 9;
      state.grind = Math.min(1, state.grind + dt / 2.4);
      state.hopper = 1 - state.grind;
      state.mill = state.grind;
      if (state.time - lastTick > 0.11) {
        lastTick = state.time;
        beep(85 + Math.random() * 20, 0, 0.03, 'square', 0.028);
      }
      if (state.grind >= 1) {
        state.holding = false;
        advance(STEP.DOSE);
      }
    }

    // Docked under the chute: the mill empties into the basket.
    if (state.dosing === 'fill') {
      const rate = dt / 0.9;
      state.mill = Math.max(0, state.mill - rate);
      state.mound = Math.min(1, state.mound + rate);
      particles.push({
        kind: 'fall',
        color: C.grounds,
        x: 22 + Math.random() * 4,
        y: 75,
        vy: 30,
        t: 0,
        dur: 0.2,
      });
      if (state.time - lastTick > 0.08) {
        lastTick = state.time;
        beep(110 + Math.random() * 40, 0, 0.03, 'square', 0.02);
      }
      if (state.mound >= 1) {
        state.dosing = 'back';
        movePf(PF_REST, 0.65, () => {
          state.dosing = null;
          advance(STEP.TAMP);
        });
      }
    }

    // The tamper drops in, leans on the puck, and leaves.
    if (state.step === STEP.TAMP && state.busy) {
      state.tamper = Math.min(1, state.tamper + dt * 1.45);
      // the puck goes flat the moment the tamper reaches it, not on the way out
      if (state.tamper >= TAMP_DIP && !state.tamped) {
        state.tamped = true;
        particles.push({ kind: 'spark', x: state.pf.x + 7, y: state.pf.y - 4, vx: 0, vy: -18, t: 0, dur: 0.45 });
      }
      if (state.tamper >= 1) {
        state.tamper = 0;
        advance(STEP.LOCK);
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
    if (!reduceMotion && !state.cine && state.step === STEP.SERVE && Math.random() < dt * 4) {
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

    // the mill box, stopping short so the stand can hold it up
    px(15, 51, 19, 18, C.wood);
    px(15, 51, 19, 1, C.burlap);
    px(32, 51, 2, 18, C.woodDark);
    px(15, 68, 19, 1, C.woodDeep);
    px(17, 58, 3, 3, C.indigo); // the decal every heirloom grinder earns
    px(18, 57, 1, 5, C.indigo);
    px(16, 59, 5, 1, C.indigo);

    // the window on the front, where ground coffee waits its turn
    px(22, 56, 10, 9, C.woodDark);
    px(23, 57, 8, 7, C.woodDeep);
    if (state.mill > 0) {
      const depth = Math.max(1, Math.round(7 * state.mill));
      px(23, 64 - depth, 8, depth, C.grounds);
      px(23, 64 - depth, 8, 1, C.bean);
    }

    // chute and stand: the gap between the legs is a portafilter wide
    px(20, 69, 9, 2, C.brassDark);
    px(21, 69, 7, 1, C.brass);
    px(23, 71, 3, 4, C.brassDark);
    px(23, 71, 3, 1, C.brass);
    px(15, 69, 2, 19, C.woodDark);
    px(32, 69, 2, 19, C.woodDark);
    px(15, 69, 2, 1, C.wood);
    px(32, 69, 2, 1, C.wood);
    px(14, 86, 21, 2, C.woodDeep); // the base the portafilter parks on

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
    const bx = Math.round(state.pf.x);
    const by = Math.round(state.pf.y);

    px(bx, by, 14, 4, C.steel);
    px(bx + 1, by + 4, 12, 2, C.plasticLit);
    if (state.locked) {
      // locked: spouts down, handle swung out to the left
      px(bx + 3, by + 6, 2, 2, C.steel);
      px(bx + 8, by + 6, 2, 2, C.steel);
      px(bx - 9, by + 1, 9, 2, C.plastic);
      px(bx - 9, by + 1, 9, 1, C.plasticLit);
    } else {
      px(bx + 14, by + 1, 7, 2, C.plastic);
      px(bx + 14, by + 1, 7, 1, C.plasticLit);
    }

    // what's in the basket: nothing, a mound heaping up, or a tamped puck
    if (state.mound > 0) {
      if (state.tamped) {
        px(bx + 2, by, 10, 1, C.grounds);
      } else {
        px(bx + 2, by - 1, 10, 1, C.grounds);
        if (state.mound > 0.4) px(bx + 4, by - 2, 6, 1, C.grounds);
        if (state.mound > 0.8) px(bx + 6, by - 3, 2, 1, C.grounds);
      }
    }

    // the tamper only exists for the half second it is needed
    if (state.step === STEP.TAMP && state.busy) {
      const ty = by - 14 + Math.round(tamperTravel(Math.min(1, state.tamper)) * 10);
      px(bx + 5, ty - 4, 4, 4, C.wood);
      px(bx + 3, ty, 8, 2, C.steel);
    }
  }

  /**
   * The scoop, wherever it is on its round trip. Its inside fills with beans
   * from the bottom up, so a half-dug scoop looks half-dug.
   */
  function drawScoop() {
    const s = state.scoop;
    const sprite = scoopSprite();
    const x = Math.round(s.x);
    const y = Math.round(s.y);

    const inside = sprite.map((row, i) => (row.includes('D') ? i : -1)).filter((i) => i >= 0);
    const full = Math.round(s.load * inside.length);
    const loaded = new Set(inside.slice(inside.length - full));

    sprite.forEach((row, r) => {
      for (let c = 0; c < row.length; c += 1) {
        const ch = row[c];
        if (ch === '.') continue;
        let color = C.steel;
        if (ch === 'L') color = C.steelLit;
        else if (ch === 'D') color = loaded.has(r) ? C.bean : C.plastic;
        px(x + c, y + r, 1, 1, color);
      }
    });
  }

  function drawCup() {
    if (!state.locked) return; // the cup arrives with the portafilter
    if (state.cine) return; // …and leaves the counter once you pick it up
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

  /**
   * Where the big cup is this frame, in canvas pixels: anchor at the foot,
   * `s` game-pixels per cup unit, `dim` how far the café behind it has faded
   * out of the way. Past the flash the cup is simply gone.
   */
  function cupPose() {
    const c = state.cine;
    if (c.phase === 'approach') {
      const k = Math.min(1, c.t / CINE.approach);
      const e = easeOut(k);
      return {
        x: 92 + (CINE.x - 92) * e,
        y: 85 + (CINE.y - 85) * e,
        s: 1 + (CINE.s - 1) * easeOutBack(k),
        alpha: 1,
        dim: Math.min(1, k * 1.5) * 0.8,
      };
    }
    if (c.phase === 'hold') {
      // it breathes for a beat, then rushes the camera and is gone
      const k = Math.min(1, c.t / CINE.hold);
      return {
        x: CINE.x,
        y: CINE.y + Math.sin(c.t * 4) * 0.6,
        s: CINE.s + 2.6 * k ** 3,
        alpha: 1,
        dim: 0.8,
      };
    }
    return { x: CINE.x, y: CINE.y, s: CINE.s, alpha: 0, dim: 0.86 };
  }

  /**
   * The cup, drawn one cup-unit-tall row at a time so it stays pixel-crisp at
   * any scale instead of asking canvas to resample anything.
   */
  function drawBigCup(pose) {
    if (pose.alpha <= 0) return;
    const row = (ly, x0, x1, color) => {
      const ax = Math.round(pose.x + x0 * pose.s);
      const bx = Math.round(pose.x + x1 * pose.s);
      const ay = Math.round(pose.y + ly * pose.s);
      const by = Math.round(pose.y + (ly + 1) * pose.s);
      ctx.fillStyle = color;
      ctx.fillRect(ax, ay, bx - ax, by - ay);
    };

    ctx.globalAlpha = pose.alpha;

    // handle: a C of ceramic hung off the right wall
    row(-9, 6, 9, C.cream);
    for (let y = -8; y <= -4; y += 1) row(y, 8, 9, C.cupShade);
    row(-3, 6, 9, C.cupShade);

    // walls, with the inside of the cup in shadow behind the shot
    for (let y = -10; y <= -1; y += 1) {
      row(y, -5, 5, C.cupDark);
      row(y, -6, -5, C.cream);
      row(y, 5, 6, C.cupShade);
    }
    row(-2, -5, 5, C.cupHollow); // shadow pooling at the bottom
    row(-1, -5, 5, C.cupHollow);
    row(-11, -6, 6, C.cream); // the rim, seen a touch from above

    // the shot: nine rows of it, one of headspace under the rim
    for (let i = 0; i < 9; i += 1) {
      row(-1 - i, -5, 5, i === 8 ? C.crema : C.espresso);
    }
    row(-9, -3, -1, C.cremaLit); // a glint on the crema

    row(0, -5, 5, C.cupShade); // foot
    row(1, -9, 9, C.cream); // saucer
    row(2, -7, 7, C.cupDark);

    ctx.globalAlpha = 1;
  }

  /* ------------------------------------------------------------ level clear */

  /** 4×5 glyphs, centred on `cx`, at whole-pixel scale. */
  function text(str, cx, y, scale, color) {
    const advance = (GLYPH_W + 1) * scale;
    const left = Math.round(cx - (str.length * advance - scale) / 2);
    str.split('').forEach((ch, i) => {
      const glyph = FONT[ch];
      if (!glyph) return;
      for (let r = 0; r < 5; r += 1) {
        for (let c = 0; c < GLYPH_W; c += 1) {
          if (glyph[r * GLYPH_W + c] === '1') px(left + i * advance + c * scale, y + r * scale, scale, scale, color);
        }
      }
    });
  }

  /**
   * The card that drops in once the cup is gone: a flash, a shout in Italian,
   * three stars punched in one by one, and the tally. Level cleared.
   */
  function drawClearCard(c) {
    const k = c.t;
    if (k < 0.2) {
      ctx.globalAlpha = (1 - k / 0.2) * 0.85;
      px(0, 0, W, H, C.cream);
      ctx.globalAlpha = 1;
    }

    const y = Math.round(-50 + 70 * easeOutBack(Math.min(1, k / 0.4)));

    px(4, y, 120, 48, C.plastic); // the card, bordered like a dialogue box
    px(4, y, 120, 1, C.cream);
    px(4, y + 47, 120, 1, C.cream);
    px(4, y, 1, 48, C.cream);
    px(123, y, 1, 48, C.cream);
    px(6, y + 2, 116, 1, C.plasticLit);

    text(c.cheer.word, 64, y + 7, 2, C.brass);

    for (let i = 0; i < c.star; i += 1) {
      const age = Math.min(1, (k - (0.6 + i * 0.22)) / 0.18);
      const size = age < 0.35 ? 3 : 2; // punched in oversized, then settling
      const cx = 64 + (i - 1) * 16;
      STAR.forEach((line, r) => {
        for (let col = 0; col < 5; col += 1) {
          if (line[col] === '1') {
            px(cx - size * 2.5 + col * size, y + 26 - size * 2.5 + r * size, size, size, C.brass);
          }
        }
      });
      px(cx - 1, y + 25, 2, 2, C.cream); // the glint in the middle
    }

    if (k > 1.2) text(`SHOT ${String(state.shots).padStart(3, '0')}`, 64, y + 37, 1, C.cream);
  }

  function drawParticles(top) {
    particles.forEach((p) => {
      if (p.t < 0 || Boolean(p.top) !== top) return;
      const k = Math.min(1, p.t / p.dur);
      if (p.kind === 'fall') {
        // beans off the scoop lip, grounds out of the chute: straight down
        px(p.x, p.y + p.vy * p.t + 60 * p.t * p.t, 2, 2, p.color);
      } else if (p.kind === 'steam') {
        const size = p.size || 2;
        ctx.globalAlpha = 0.55 * (1 - k);
        px(p.x + Math.sin((p.t + p.x) * 5) * 2, p.y - k * (p.rise || 14), size, size, C.steelLit);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'spark') {
        const size = p.size || 2;
        ctx.globalAlpha = 1 - k;
        px(p.x + p.vx * p.t, p.y + p.vy * p.t + 30 * p.t * p.t, size, size, C.brass);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'plusone') {
        const s = p.s || 1;
        ctx.globalAlpha = 1 - k;
        const x = p.x;
        const y = p.y - k * 12 * s;
        px(x, y + s, 3 * s, s, C.brass); // +
        px(x + s, y, s, 3 * s, C.brass);
        px(x + 5 * s, y, s, 3 * s, C.brass); // 1
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
    drawScoop();
    drawMachine();
    drawCup();
    drawPortafilter();
    drawParticles(false);
    // Once the cup is in your hand the café steps back and the cup takes over.
    if (state.cine) {
      const pose = cupPose();
      ctx.globalAlpha = pose.dim;
      px(0, 0, W, H, C.bg);
      ctx.globalAlpha = 1;
      drawBigCup(pose);
      drawParticles(true);
      // the card stays up through the blackout, so it dims out instead of
      // being yanked off the screen a beat before the café returns
      if (state.cine.phase === 'clear' || state.cine.phase === 'gone') drawClearCard(state.cine);
    }
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
