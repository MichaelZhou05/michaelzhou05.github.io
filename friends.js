/**
 * The fun layer: a cat that follows your cursor, a pixel icon on every heading,
 * a moon that turns the stars on, a handheld hiding a second palette, and ten
 * secrets to stumble into.
 */
import { SPRITES, spriteSvg } from './sprites.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const STORE_KEY = 'mz.secrets';

/**
 * Icon colours are the console palette from `styles.css` — the plastic, the
 * print and the lights. The one deliberate exception is DMG mode, which wears
 * its own swamp green because that is the whole joke.
 */
const SECRETS = [
  { id: 'cat', icon: 'catSit', color: '#e8e4f4', label: 'THE CAT PURRS', hint: 'someone naps at the edges' },
  { id: 'moon', icon: 'moon', color: '#ffb000', label: 'LIGHTS OUT, STARS ON', hint: 'the moon is a switch' },
  { id: 'star', icon: 'star', color: '#ffb000', label: 'WISH GRANTED', hint: 'one star is clickable' },
  { id: 'cursor', icon: 'crt', color: '#8a849f', label: 'SECRET BOOT LOG', hint: 'poke the blinking block' },
  { id: 'konami', icon: 'dpad', color: '#e60012', label: 'ARCADE MODE', hint: '↑↑↓↓←→←→ B A' },
  { id: 'dmg', icon: 'gbConsole', color: '#9bbc0f', label: 'DMG MODE', hint: 'the screen has a second mode' },
  { id: 'cart', icon: 'cartridge', color: '#b0a8c8', label: 'BLEW THE DUST OUT', hint: 'a cartridge sits loose' },
  { id: 'bug', icon: 'bug', color: '#2ed573', label: 'BUG SQUASHED', hint: 'something skitters past' },
  { id: 'sound', icon: 'note', color: '#7b68ee', label: 'SOUND TEST', hint: 'the footer can sing' },
  { id: 'espresso', icon: 'coffeeCup', color: '#e8e4f4', label: 'GOD SHOT', hint: 'the sidebar makes coffee' },
];

const found = new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]'));

/* ---------------------------------------------------------------- secrets */

function renderSecrets() {
  const list = document.getElementById('secrets-list');
  if (!list) return;
  list.innerHTML = SECRETS.map((secret) => {
    const isFound = found.has(secret.id);
    // Unfound secrets all wear the same "?" block, so the list reads as a
    // collection with gaps in it rather than a list of spoilers.
    const icon = isFound
      ? spriteSvg(secret.icon, { scale: 2, color: secret.color })
      : spriteSvg('mystery', { scale: 2, palette: { y: '#2e2a3a', d: '#14121b' } });
    return `<li class="${isFound ? 'is-found' : ''}">
      <i class="secret-icon">${icon}</i>
      <span>${isFound ? secret.label : secret.hint}</span>
    </li>`;
  }).join('');

  const count = SECRETS.filter((secret) => found.has(secret.id)).length;
  document.getElementById('secrets-count').textContent = String(count);
  const total = document.getElementById('secrets-total');
  if (total) total.textContent = String(SECRETS.length);
  document.getElementById('secrets-bar').style.width = `${(count / SECRETS.length) * 100}%`;
  document.querySelector('.secrets-panel')?.classList.toggle('all-found', count === SECRETS.length);
}

function unlock(id) {
  if (found.has(id)) return;
  found.add(id);
  localStorage.setItem(STORE_KEY, JSON.stringify([...found]));
  renderSecrets();
  toast(SECRETS.find((secret) => secret.id === id));
}

function toast(secret) {
  if (!secret) return;
  const node = document.createElement('div');
  node.className = 'secret-toast';
  node.innerHTML = `<span class="title-icon">${spriteSvg(secret.icon, { scale: 2, color: secret.color })}</span>
    <div><small>SECRET FOUND</small><strong>${secret.label}</strong></div>`;
  document.body.append(node);
  requestAnimationFrame(() => node.classList.add('is-in'));
  setTimeout(() => {
    node.classList.remove('is-in');
    setTimeout(() => node.remove(), 400);
  }, 2800);
}

/* ------------------------------------------------------------ icon slots */

/**
 * Every heading and index entry names its own sprite through `data-icon`, so
 * the rail stops being a column of identical stars: the d-pad is navigation,
 * the sword is the quest, the key is the secrets, and so on. `has-icon` retires
 * the CSS star fallback only once the real thing is in place.
 */
function paintIcons() {
  document.querySelectorAll('[data-icon]').forEach((host) => {
    const name = host.dataset.icon;
    if (!SPRITES[name]) return;
    const slot = document.createElement('span');
    slot.className = host.tagName === 'A' ? 'nav-icon' : 'title-icon';
    slot.innerHTML = spriteSvg(name, { scale: 2, color: host.dataset.iconColor });
    host.prepend(slot);
    host.classList.add('has-icon');
  });
}

/* -------------------------------------------------------------------- cat */

/**
 * The house cat. Not a cursor-chaser: it mostly lives its own life — sleeping
 * in quiet corners, waking to patrol, grooming — and only takes a real
 * interest in the pointer when you pet it (click), after which it follows for
 * a while, gets bored, and pads back to bed.
 *
 * Movement is a tiny steering model (velocity eased toward a target), and the
 * sprite is chosen from the velocity's compass heading — the calico has real
 * frames for E/N/S/NE/SE and mirrors them for the western half — so it walks
 * and gallops in every direction instead of moonwalking sideways.
 */
function spawnCat() {
  const cat = document.createElement('div');
  cat.className = 'oneko';
  cat.setAttribute('role', 'img');
  cat.setAttribute('aria-label', 'A pixel calico cat that lives on this page');
  cat.innerHTML = '<div class="oneko-bubble" hidden></div><div class="oneko-body"></div>';
  document.body.append(cat);

  const body = cat.querySelector('.oneko-body');
  const bubble = cat.querySelector('.oneko-bubble');
  const statusReadout = document.getElementById('cat-status');

  const frames = {};
  ['catSit', 'catSitTail', 'catGroomA', 'catGroomB', 'catSleepA', 'catSleepB', 'catStretch',
    'catWalkEA', 'catWalkEB', 'catRunEA', 'catRunEB', 'catWalkNA', 'catWalkNB',
    'catWalkSA', 'catWalkSB', 'catWalkNEA', 'catWalkNEB', 'catWalkSEA', 'catWalkSEB',
  ].forEach((name) => { frames[name] = spriteSvg(name, { scale: 2 }); });

  const BOX_W = 44; // (20 + 2 outline cols) * scale 2
  const BOX_H = 36;
  const RUN_AT = 140; // px/s — faster than this is a gallop

  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  const state = {
    mode: 'sleep',
    x: 0, y: 0, vx: 0, vy: 0,
    tx: 0, ty: 0,
    sprite: '', facing: 1,
    heading: 'S:1', headingCandidate: '', headingHeld: 0,
    frameFlip: false, frameTimer: 0, bobPhase: 0,
    modeTime: 0, until: 0,
    awake: 0,           // seconds since it last slept — drives the pull back to bed
    squash: 0,          // seconds of arrival-squash left
    happyUntil: 0,      // while petting, CSS owns the body transform
    zTimer: 0, zNext: rand(2, 4),
    flickTimer: 0, flickNext: rand(1.6, 3.4), flicking: 0,
    plan: null,
    pointer: { x: window.innerWidth / 2, y: window.innerHeight / 2, seen: false },
  };

  const setSprite = (name) => {
    if (state.sprite === name) return;
    state.sprite = name;
    body.innerHTML = frames[name];
  };

  const setStatus = (text) => {
    if (statusReadout) statusReadout.textContent = text;
  };

  /**
   * Sleeping spots hug the viewport edges, and each candidate is vetted with
   * elementsFromPoint so the cat never dozes off on top of a link or button.
   */
  function pickSleepSpot() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const m = 12;
    const spots = [
      { x: m, y: h - BOX_H - m },
      { x: w - BOX_W - m, y: h - BOX_H - m },
      { x: w * 0.5 - BOX_W / 2, y: h - BOX_H - m },
      { x: m, y: h * 0.55 },
      { x: w - BOX_W - m, y: h * 0.4 },
      { x: w - BOX_W - m, y: m + 48 },
      { x: m, y: m + 48 },
    ].sort(() => Math.random() - 0.5);
    for (const spot of spots) {
      const busy = document.elementsFromPoint(spot.x + BOX_W / 2, spot.y + BOX_H / 2)
        .some((el) => el !== cat && !cat.contains(el)
          && el.closest?.('a, button, input, select, textarea, summary, [role="button"], canvas, .wild-bug, .secret-toast'));
      if (!busy) return spot;
    }
    return { x: w - BOX_W - m, y: h - BOX_H - m };
  }

  function wanderTarget() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let tries = 0; tries < 8; tries += 1) {
      const x = rand(16, w - BOX_W - 16);
      const y = rand(64, h - BOX_H - 16);
      const trip = Math.hypot(x - state.x, y - state.y);
      if (trip > 130 && trip < 520) return { x, y };
    }
    return { x: rand(16, w - BOX_W - 16), y: rand(64, h - BOX_H - 16) };
  }

  function enter(mode) {
    state.mode = mode;
    state.modeTime = 0;
    switch (mode) {
      case 'sleep':
        state.awake = 0;
        state.zTimer = 0;
        setStatus('sleeping');
        break;
      case 'wake':
        state.until = 1.1;
        setStatus('stretching');
        break;
      case 'idle':
        state.until = rand(2, 5);
        setStatus('loafing');
        break;
      case 'groom':
        state.until = rand(2.2, 4);
        setStatus('grooming');
        break;
      case 'wander': {
        const spot = wanderTarget();
        state.tx = spot.x;
        state.ty = spot.y;
        state.until = 18;
        setStatus('on patrol');
        break;
      }
      case 'follow':
        state.until = rand(7, 13);
        setStatus('following you');
        break;
      case 'shy':
        state.until = rand(4, 8);
        setStatus('keeping an eye on you');
        break;
      case 'return': {
        const spot = pickSleepSpot();
        state.tx = spot.x;
        state.ty = spot.y;
        state.until = 25;
        setStatus('heading to bed');
        break;
      }
      case 'curl':
        state.until = 1.2;
        setStatus('getting comfy');
        break;
      default:
        break;
    }
  }

  /** Ease the velocity toward the target — the lag IS the animal. */
  function locomote(delta, maxSpeed) {
    const dx = state.tx - state.x;
    const dy = state.ty - state.y;
    const dist = Math.hypot(dx, dy);
    const arrive = Math.min(1, dist / 110); // brake on approach
    const want = dist > 2 ? Math.min(maxSpeed, 28 + maxSpeed * arrive) : 0;
    const ux = dist > 0 ? dx / dist : 0;
    const uy = dist > 0 ? dy / dist : 0;
    const blend = Math.min(1, delta * 5);
    state.vx += (ux * want - state.vx) * blend;
    state.vy += (uy * want - state.vy) * blend;
    state.x += state.vx * delta;
    state.y += state.vy * delta;
    return dist;
  }

  /**
   * Velocity → compass heading → sprite. Eight sectors map onto the five
   * drawn directions plus a mirror flag; a heading only commits after ~90ms
   * so the sprite doesn't flicker when the path crosses a sector boundary.
   */
  const SECTOR = {
    0: 'E:1', 1: 'SE:1', 2: 'S:1', 3: 'SE:-1', 4: 'E:-1',
    '-1': 'NE:1', '-2': 'N:1', '-3': 'NE:-1', '-4': 'E:-1',
  };

  function moveSprite(delta) {
    const speed = Math.hypot(state.vx, state.vy);
    if (speed < 14) {
      setSprite('catSit');
      return 0;
    }

    const sector = Math.round(Math.atan2(state.vy, state.vx) / (Math.PI / 4));
    const candidate = SECTOR[sector];
    if (candidate !== state.heading) {
      if (candidate === state.headingCandidate) {
        state.headingHeld += delta;
        if (state.headingHeld > 0.09) state.heading = candidate;
      } else {
        state.headingCandidate = candidate;
        state.headingHeld = 0;
      }
    }
    const [direction, face] = state.heading.split(':');
    state.facing = Number(face);

    const running = speed > RUN_AT;
    const interval = running
      ? Math.max(0.075, 11 / speed)
      : Math.min(0.3, Math.max(0.13, 13 / speed));
    state.frameTimer += delta;
    if (state.frameTimer >= interval) {
      state.frameTimer -= interval;
      state.frameFlip = !state.frameFlip;
    }
    state.bobPhase += (delta / interval) * Math.PI;

    // The gallop is drawn side-on; diagonals borrow it with a lean. Straight
    // up/down keeps the walk frames and just cycles them at sprint tempo.
    let lean = 0;
    let base = `catWalk${direction}`;
    if (running && direction !== 'N' && direction !== 'S') {
      base = 'catRunE';
      lean = Math.max(-26, Math.min(26,
        (Math.atan2(state.vy, Math.abs(state.vx)) * 180) / Math.PI * 0.6));
    }
    setSprite(base + (state.frameFlip ? 'B' : 'A'));
    return running ? 0 : Math.sin(state.bobPhase) * 1.3; // run frames carry their own bounce
  }

  /** A pixel "z" that drifts up off the sleeping loaf. */
  function floatZ() {
    const z = document.createElement('span');
    z.className = 'oneko-z';
    z.textContent = Math.random() < 0.25 ? 'Z' : 'z';
    z.style.left = `${state.x + (state.facing === 1 ? 30 : 8)}px`;
    z.style.top = `${state.y + 8}px`;
    document.body.append(z);
    setTimeout(() => z.remove(), 2100);
  }

  const arrive = () => {
    state.squash = 0.14;
    state.vx = 0;
    state.vy = 0;
  };

  /** The idle decider — the older the wake, the stronger the pull back to bed. */
  function decideNext() {
    if (state.plan) {
      const plan = state.plan;
      state.plan = null;
      enter(plan);
      return;
    }
    const sleepy = Math.min(0.72, state.awake / 50);
    const roll = Math.random();
    if (roll < sleepy) enter('return');
    else if (roll < sleepy + 0.2) enter('groom');
    else if (roll < sleepy + 0.32 && state.pointer.seen) enter('shy');
    else enter('wander');
  }

  window.addEventListener('pointermove', (event) => {
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    state.pointer.seen = true;
  }, { passive: true });

  cat.addEventListener('click', () => {
    unlock('cat');
    cat.classList.add('is-happy');
    state.happyUntil = performance.now() + 620;
    body.style.transform = '';
    setTimeout(() => cat.classList.remove('is-happy'), 620);

    if (state.mode === 'sleep' || state.mode === 'curl') {
      say('mrrp?!');
      state.plan = 'follow';
      enter('wake');
    } else {
      say(['MEOW!', 'purrrr~', 'nyaa!', 'hi :3', '*headbutt*'][Math.floor(Math.random() * 5)]);
      state.plan = null;
      enter('follow');
    }
  });

  let bubbleTimer;
  function say(text) {
    bubble.textContent = text;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 1600);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      state.x = Math.min(state.x, window.innerWidth - BOX_W - 6);
      state.y = Math.min(state.y, window.innerHeight - BOX_H - 6);
      if (state.mode === 'sleep' || state.mode === 'curl') enter('return');
    }, 250);
  });

  let previous = performance.now();
  function step(now) {
    const delta = Math.min(0.05, (now - previous) / 1000);
    previous = now;
    state.modeTime += delta;
    if (state.mode !== 'sleep') state.awake += delta;
    let bob = 0;

    switch (state.mode) {
      case 'sleep': {
        setSprite(state.modeTime % 2.4 < 1.2 ? 'catSleepA' : 'catSleepB');
        state.zTimer += delta;
        if (state.zTimer > state.zNext) {
          state.zTimer = 0;
          state.zNext = rand(2.4, 4.2);
          floatZ();
        }
        // It wakes itself now and then — average of ~40s once it's settled in.
        if (state.modeTime > 14 && Math.random() < delta / 40) {
          state.plan = Math.random() < 0.72 ? 'wander' : 'shy';
          enter('wake');
        }
        break;
      }

      case 'wake': {
        setSprite(state.modeTime < 0.8 ? 'catStretch' : 'catSitTail');
        if (state.modeTime >= state.until) {
          if (state.plan) decideNext();
          else enter('idle');
        }
        break;
      }

      case 'idle': {
        state.flickTimer += delta;
        if (state.flicking > 0) {
          state.flicking -= delta;
          setSprite('catSitTail');
        } else {
          setSprite('catSit');
          if (state.flickTimer > state.flickNext) {
            state.flickTimer = 0;
            state.flickNext = rand(1.6, 3.4);
            state.flicking = 0.36;
          }
        }
        if (state.modeTime >= state.until) decideNext();
        break;
      }

      case 'groom': {
        setSprite(state.modeTime % 0.8 < 0.4 ? 'catGroomA' : 'catGroomB');
        if (state.modeTime >= state.until) enter('idle');
        break;
      }

      case 'wander': {
        const dist = locomote(delta, 78);
        bob = moveSprite(delta);
        if (dist < 6 || state.modeTime > state.until) {
          arrive();
          if (Math.random() < 0.3) state.plan = 'wander';
          enter('idle');
        }
        break;
      }

      case 'follow':
      case 'shy': {
        // Follow means "up close"; shy means "along at a polite distance".
        const keep = state.mode === 'follow' ? 34 : 150;
        const px = state.pointer.x - (state.x + BOX_W / 2);
        const py = state.pointer.y - (state.y + BOX_H / 2);
        const gap = Math.hypot(px, py);
        if (gap > keep + 14) {
          state.tx = state.x + px * ((gap - keep) / gap);
          state.ty = state.y + py * ((gap - keep) / gap);
          const eager = state.mode === 'follow';
          const maxSpeed = eager ? (gap > 260 ? 250 : gap > 120 ? 165 : 110) : 105;
          locomote(delta, maxSpeed);
          bob = moveSprite(delta);
        } else {
          // Close enough: sit and watch the cursor, tail going.
          state.vx *= 0.7;
          state.vy *= 0.7;
          state.facing = px >= 0 ? 1 : -1;
          state.flickTimer += delta;
          if (state.flicking > 0) {
            state.flicking -= delta;
            setSprite('catSitTail');
          } else {
            setSprite('catSit');
            if (state.flickTimer > 1.4) {
              state.flickTimer = 0;
              state.flicking = 0.36;
            }
          }
        }
        if (state.modeTime >= state.until) {
          state.plan = Math.random() < 0.55 ? 'return' : null;
          enter('idle');
        }
        break;
      }

      case 'return': {
        const dist = locomote(delta, 92);
        bob = moveSprite(delta);
        if (dist < 5 || state.modeTime > state.until) {
          arrive();
          enter('curl');
        }
        break;
      }

      case 'curl': {
        setSprite('catSit');
        if (state.modeTime >= state.until) enter('sleep');
        break;
      }

      default:
        break;
    }

    // Keep it on screen no matter what the viewport does.
    state.x = Math.max(4, Math.min(window.innerWidth - BOX_W - 4, state.x));
    state.y = Math.max(4, Math.min(window.innerHeight - BOX_H - 4, state.y));

    // While the pet-bounce plays, the CSS class owns the body transform.
    if (now >= state.happyUntil) {
      if (state.squash > 0) state.squash -= delta;
      const parts = [`scaleX(${state.facing})`];
      if (bob !== 0) parts.unshift(`translateY(${bob.toFixed(1)}px)`);
      if (state.mode === 'follow' || state.mode === 'shy' || state.mode === 'wander' || state.mode === 'return') {
        const speed = Math.hypot(state.vx, state.vy);
        if (speed > RUN_AT) {
          const lean = Math.max(-26, Math.min(26,
            (Math.atan2(state.vy, Math.abs(state.vx)) * 180) / Math.PI * 0.6));
          parts.push(`rotate(${(lean * state.facing).toFixed(1)}deg)`);
        }
      }
      if (state.squash > 0) parts.push('scaleY(0.88)');
      body.style.transform = parts.join(' ');
    }

    cat.style.transform = `translate3d(${Math.round(state.x)}px, ${Math.round(state.y)}px, 0)`;
    requestAnimationFrame(step);
  }

  // It starts the way it means to go on: asleep in a corner.
  const bed = pickSleepSpot();
  state.x = bed.x;
  state.y = bed.y;
  state.tx = bed.x;
  state.ty = bed.y;
  enter('sleep');
  cat.style.transform = `translate3d(${Math.round(state.x)}px, ${Math.round(state.y)}px, 0)`;

  if (!reduceMotion) {
    requestAnimationFrame(step);
  } else {
    setSprite('catSit');
    setStatus('loafing');
  }
}

/* ------------------------------------------------------------- decoration */

const DOODLES = [
  { sprite: 'star', color: '#ffb000', scale: 2 },
  { sprite: 'star', color: '#7b68ee', scale: 2 },
  { sprite: 'sparkle', color: '#b8a9ff', scale: 2 },
  { sprite: 'star', color: '#2ed573', scale: 2 },
  { sprite: 'sparkle', color: '#e85d04', scale: 2 },
];

function scatterDoodles() {
  document.querySelectorAll('[data-doodle]').forEach((slot, index) => {
    const preset = DOODLES[index % DOODLES.length];
    const custom = slot.dataset.doodle;
    const name = SPRITES[custom] ? custom : preset.sprite;
    slot.innerHTML = spriteSvg(name, {
      scale: Number(slot.dataset.scale) || preset.scale,
      color: slot.dataset.color || preset.color,
    });
    slot.style.animationDelay = `${(index % 7) * 0.42}s`;
  });
}

/** One doodle in the page is a wish — clicking it bursts into sparkles. */
function wireWishStar() {
  const star = document.querySelector('[data-secret="star"]');
  if (!star) return;
  star.addEventListener('click', () => {
    const rect = star.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, '#ffb000', 14);
    unlock('star');
  });
}

/** `color` may be one colour or a few — an array deals itself around the ring. */
function burst(x, y, color, count = 10, shapes = ['heart', 'sparkle']) {
  if (reduceMotion) return;
  const colors = Array.isArray(color) ? color : [color];
  for (let index = 0; index < count; index += 1) {
    const bit = document.createElement('span');
    bit.className = 'confetti-bit';
    bit.innerHTML = spriteSvg(index % 3 === 0 ? shapes[0] : shapes[1], { scale: 2, color: colors[index % colors.length] });
    const angle = (Math.PI * 2 * index) / count + Math.random();
    const power = 40 + Math.random() * 90;
    bit.style.setProperty('--dx', `${Math.cos(angle) * power}px`);
    bit.style.setProperty('--dy', `${Math.sin(angle) * power - 40}px`);
    bit.style.left = `${x}px`;
    bit.style.top = `${y}px`;
    document.body.append(bit);
    setTimeout(() => bit.remove(), 1100);
  }
}

/** Grey sparkles only — what comes out of a cartridge is dust, not confetti. */
const puff = (x, y) => burst(x, y, '#8a849f', 7, ['sparkle', 'sparkle']);

/* ------------------------------------------------------------- moon/stars */

function wireMoon() {
  const moon = document.querySelector('.moon-toggle');
  if (!moon) return;
  moon.innerHTML = spriteSvg('moon', { scale: 2, color: '#f4e7a8' });

  const field = document.createElement('div');
  field.className = 'starfield';
  field.setAttribute('aria-hidden', 'true');
  field.innerHTML = Array.from({ length: 46 }, () => {
    const size = Math.random() < 0.22 ? 3 : Math.random() < 0.6 ? 2 : 1;
    return `<i style="left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.random() * 100).toFixed(2)}%;
      width:${size}px;height:${size}px;animation-delay:${(Math.random() * 4).toFixed(2)}s;
      opacity:${(0.35 + Math.random() * 0.6).toFixed(2)}"></i>`;
  }).join('');
  document.body.prepend(field);

  const apply = (on) => {
    document.body.classList.toggle('stars-on', on);
    moon.setAttribute('aria-pressed', String(on));
    moon.title = on ? 'Turn the stars off' : 'Turn the stars on';
  };
  apply(localStorage.getItem('mz.stars') !== 'off');

  moon.addEventListener('click', () => {
    const on = !document.body.classList.contains('stars-on');
    apply(on);
    localStorage.setItem('mz.stars', on ? 'on' : 'off');
    const rect = moon.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, '#ffb000', 8);
    unlock('moon');
  });
}

/**
 * Rare on purpose: a meteor every nine seconds is a schedule, not a wonder.
 * Each one rolls its own size, speed and trajectory, and the motion is driven
 * here via the Web Animations API — WAAPI outranks the CSS class animation, so
 * the old hardcoded (260px, 190px) keyframe never wins.
 */
function shootingStars() {
  if (reduceMotion) return;
  const spawn = () => {
    if (!document.hidden && document.body.classList.contains('stars-on')) {
      const star = document.createElement('span');
      star.className = 'shooting-star';
      const size = 1 + Math.floor(Math.random() * 3);
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${20 + Math.random() * 60}vw`;
      star.style.top = `${Math.random() * 40}vh`;
      document.body.append(star);

      const angle = (20 + Math.random() * 20) * (Math.PI / 180); // below horizontal
      const length = 200 + Math.random() * 220;
      const duration = 1100 + Math.random() * 800;
      star.animate([
        { transform: 'translate(0, 0)', opacity: 0 },
        { opacity: 1, offset: 0.15 },
        { transform: `translate(${Math.cos(angle) * length}px, ${Math.sin(angle) * length}px)`, opacity: 0 },
      ], { duration, easing: 'ease-out' }).onfinish = () => star.remove();
      setTimeout(() => star.remove(), duration + 500); // belt for the onfinish braces
    }
    setTimeout(spawn, 14000 + Math.random() * 10000);
  };
  setTimeout(spawn, 14000 + Math.random() * 10000);
}

/* --------------------------------------------------------- the handheld */

/**
 * The system-info panel says which screen you are looking at, and the answer is
 * a button. Flipping it drops the whole page into the original four-shade DMG
 * green — variables carry the type and frames, one filter carries the pictures.
 */
function wireGameboy() {
  const button = document.getElementById('gb-toggle');
  if (!button) return;
  const label = button.querySelector('.gb-toggle-label');
  const slot = document.createElement('span');
  slot.className = 'title-icon';
  button.prepend(slot);

  const apply = (on) => {
    document.body.classList.toggle('dmg-mode', on);
    slot.innerHTML = spriteSvg('gbConsole', { scale: 2, color: on ? '#9bbc0f' : '#b0a8c8' });
    label.textContent = on ? 'dmg / four greens' : 'midnight / pure black';
    button.setAttribute('aria-pressed', String(on));
  };
  apply(localStorage.getItem('mz.dmg') === 'on');

  button.addEventListener('click', () => {
    const on = !document.body.classList.contains('dmg-mode');
    apply(on);
    localStorage.setItem('mz.dmg', on ? 'on' : 'off');
    const rect = button.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top, on ? '#9bbc0f' : '#7b68ee', 8);
    unlock('dmg');
  });
}

/* -------------------------------------------------------- loose cartridge */

/** The 90s ritual, faithfully: it never works the first time. */
function wireCartridge() {
  const cart = document.querySelector('[data-secret="cart"]');
  if (!cart) return;
  cart.innerHTML = spriteSvg('cartridge', { scale: 2, color: '#b0a8c8' });

  let blows = 0;
  cart.addEventListener('click', () => {
    const rect = cart.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    puff(x, y);
    blows += 1;

    if (blows < 2) {
      cart.classList.remove('is-blown');
      void cart.offsetWidth; // restart the shake if it is already running
      cart.classList.add('is-blown');
      cart.title = 'still nothing. again, harder.';
      return;
    }
    if (blows > 2) return;

    cart.classList.remove('is-blown');
    cart.classList.add('is-seated');
    cart.title = 'seated. booting…';
    document.body.classList.add('is-glitching');
    setTimeout(() => document.body.classList.remove('is-glitching'), 460);
    setTimeout(() => burst(x, y, '#ffb000', 10), 300);
    // The payoff: a seated cartridge actually boots the game. If the console
    // section is missing the secret still unlocks and nothing errors.
    setTimeout(() => {
      const start = document.getElementById('start-race');
      if (!start) return;
      start.click();
      document.getElementById('race-canvas')?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    }, 600);
    unlock('cart');
  });
}

/* -------------------------------------------------------------- wild bug */

let openBattle = null;

/** The dialogue box every 8-bit RPG opened a fight with, typed one char at a time. */
function battle(lines) {
  openBattle?.remove();
  const box = document.createElement('div');
  box.className = 'battle-box';
  box.setAttribute('role', 'status');
  box.innerHTML = '<p></p><span class="battle-cue" aria-hidden="true">▼</span>';
  document.body.append(box);
  openBattle = box;
  requestAnimationFrame(() => box.classList.add('is-in'));

  const target = box.querySelector('p');
  let index = 0;

  const nextLine = () => {
    if (index >= lines.length) {
      box.classList.add('is-out');
      setTimeout(() => {
        box.remove();
        if (openBattle === box) openBattle = null;
      }, 400);
      return;
    }
    const line = lines[index];
    index += 1;
    let char = 0;
    const tick = setInterval(() => {
      target.textContent = line.slice(0, char += 1);
      if (char < line.length) return;
      clearInterval(tick);
      setTimeout(nextLine, 1100);
    }, 34);
  };

  nextLine();
}

function wildBugs() {
  const spawn = () => {
    const bug = document.createElement('button');
    bug.type = 'button';
    bug.className = 'wild-bug';
    bug.title = 'a wild bug';
    bug.setAttribute('aria-label', 'A wild bug skitters past. Click to squash it.');
    bug.innerHTML = spriteSvg('bug', { scale: 2, color: '#2ed573' });

    bug.addEventListener('click', () => {
      const rect = bug.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top, '#e60012', 12, ['sparkle', 'sparkle']);
      bug.remove();
      battle([
        'A WILD BUG APPEARED!',
        'MICHAEL used PATCH!',
        "IT'S SUPER EFFECTIVE!",
        'The BUG fled to staging.',
      ]);
      unlock('bug');
    }, { once: true });

    document.body.append(bug);
    setTimeout(() => bug.remove(), 15500);
  };

  setTimeout(function loop() {
    if (!document.hidden) spawn();
    setTimeout(loop, 34000 + Math.random() * 26000);
  }, 20000);
}

/* ------------------------------------------------------------ sound test */

let audioContext;

/** Four square-wave notes. Quiet, short, and never plays unless you ask. */
function playJingle() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  try {
    audioContext ??= new Ctx();
    if (audioContext.state === 'suspended') audioContext.resume();

    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * 0.12;

      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.05, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);

      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.13);
    });
  } catch {
    /* No audio device, no problem — the secret still unlocks. */
  }
}

function wireSoundTest() {
  const button = document.getElementById('sound-test');
  if (!button) return;
  const slot = document.createElement('span');
  slot.className = 'title-icon';
  slot.innerHTML = spriteSvg('note', { scale: 2, color: '#7b68ee' });
  button.prepend(slot);

  button.addEventListener('click', () => {
    playJingle();
    button.classList.add('is-playing');
    setTimeout(() => button.classList.remove('is-playing'), 1400);
    unlock('sound');
  });
}

/* -------------------------------------------------------- cursor + konami */

function wireCursorBlock() {
  const block = document.querySelector('.cursor-block');
  const log = document.querySelector('.boot-log');
  if (!block || !log) return;
  block.style.cursor = 'pointer';
  block.title = 'click me';

  const lines = [
    'boot: loading personality.dll ... ok',
    'boot: caffeine levels ....... critical',
    'boot: cat daemon ............ purring',
    'boot: thanks for clicking around :)',
  ];
  let clicks = 0;

  block.addEventListener('click', () => {
    clicks += 1;
    if (clicks < 3) {
      log.hidden = false;
      log.textContent = `boot: ${'.'.repeat(clicks + 1)} keep going`;
      return;
    }
    if (clicks > 3) return;
    log.hidden = false;
    let index = 0;
    const typeLine = () => {
      if (index >= lines.length) return;
      const line = lines[index];
      let char = 0;
      const tick = setInterval(() => {
        log.textContent = `${lines.slice(0, index).join('\n')}${index ? '\n' : ''}${line.slice(0, char += 1)}`;
        if (char >= line.length) {
          clearInterval(tick);
          index += 1;
          setTimeout(typeLine, 260);
        }
      }, 18);
    };
    typeLine();
    unlock('cursor');
  });
}

function wireKonami() {
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  let index = 0;
  window.addEventListener('keydown', (event) => {
    index = event.code === code[index] ? index + 1 : event.code === code[0] ? 1 : 0;
    if (index < code.length) return;
    index = 0;
    document.body.classList.toggle('arcade-mode');
    unlock('konami');
    if (document.body.classList.contains('arcade-mode')) {
      for (let n = 0; n < 5; n += 1) {
        setTimeout(() => burst(Math.random() * window.innerWidth, 120 + Math.random() * 300,
          ['#ff9ecd', '#b79cff', '#5eead4', '#ff5f8d', '#ffe3fb'][n], 12), n * 130);
      }
    }
  });
}

/* ------------------------------------------------------------------ boot */

/**
 * A delight that fires on every hover stops being one. First hover always
 * lands — the discovery — then each re-hover is a one-in-four roll, and a
 * four-second breather per element keeps rapid passes quiet either way.
 */
const lastDelight = new WeakMap();
function occasional(fn) {
  return (event) => {
    const element = event.currentTarget;
    const seen = lastDelight.has(element);
    const now = performance.now();
    if (seen && (now - lastDelight.get(element) < 4000 || Math.random() > 0.25)) return;
    lastDelight.set(element, now);
    fn(event);
  };
}

/**
 * Ambient treats on the outbound links — hearts for mail, blue birds for the
 * bird site, contribution greens for GitHub, coffee cups for the dream
 * machine. Not secrets, just hospitality.
 */
function hoverDelights() {
  const wire = (elements, fire) => {
    new Set(elements).forEach((element) => {
      element.addEventListener('pointerenter', occasional(() => {
        const rect = element.getBoundingClientRect();
        fire(rect.left + rect.width / 2, rect.top + 6);
      }));
    });
  };

  // mailto matches too, in case a markup pass ever drops the data-hearts hook
  wire(
    document.querySelectorAll('[data-hearts], a[href^="mailto:"]'),
    (x, y) => burst(x, y, '#ff9ecd', 5),
  );
  wire(
    document.querySelectorAll('a[href*="twitter.com"], a[href^="https://x.com"], a[href^="https://www.x.com"]'),
    (x, y) => burst(x, y, ['#1DA1F2', '#7cc7f5'], 8, ['bird', 'bird']),
  );
  wire(
    document.querySelectorAll('a[href*="github.com"]'),
    (x, y) => burst(x, y, ['#39d353', '#26a641', '#006d32'], 9, ['commitSquare', 'commitSquare']),
  );
  // lamarzocco matches too, in case a markup pass ever drops the data-coffee hook
  wire(
    document.querySelectorAll('[data-coffee], a[href*="lamarzocco"]'),
    (x, y) => burst(x, y, ['#f2f0fa', '#f2c49b'], 8, ['coffeeCup', 'coffeeCup']),
  );
}

/** An honest-to-goodness 90s hit counter. It counts your visits, not the world's. */
function hitCounter() {
  const readout = document.getElementById('hit-counter');
  if (!readout) return;
  const visits = Number(localStorage.getItem('mz.visits') || 0) + 1;
  localStorage.setItem('mz.visits', String(visits));

  const total = String(4096 + visits).padStart(7, '0');
  readout.textContent = total;
  readout.title = `you have been here ${visits} time${visits === 1 ? '' : 's'} — click to reroll the digits`;

  // Not a secret, just a mechanical counter that likes being touched.
  readout.addEventListener('click', () => {
    let ticks = 0;
    const roll = setInterval(() => {
      ticks += 1;
      readout.textContent = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join('');
      if (ticks < 12) return;
      clearInterval(roll);
      readout.textContent = total;
    }, 55);
  });
}

function greet() {
  const art = [
    '',
    '   /\\_/\\   michael zhou // portfolio',
    '  ( o.o )  there are 10 secrets on this page.',
    '   > ^ <   konami code. pet the cat. blow on the cartridge.',
    '',
  ].join('\n');
  console.log(`%c${art}`, 'color:#7b68ee;font-family:monospace;font-size:12px');
}

paintIcons();
renderSecrets();
scatterDoodles();
wireWishStar();
wireMoon();
wireGameboy();
wireCartridge();
wireSoundTest();
wireCursorBlock();
wireKonami();
hoverDelights();
wildBugs();
shootingStars();
hitCounter();
greet();
if (!window.matchMedia('(hover: none)').matches) spawnCat();

// Other modules earn secrets too — the espresso machine announces its first
// pulled shot this way rather than importing the whole fun layer.
window.addEventListener('mz:secret', (event) => unlock(event.detail));
