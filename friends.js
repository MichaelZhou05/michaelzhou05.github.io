/**
 * The fun layer: a cat that follows your cursor, a pixel icon on every heading,
 * a moon that turns the stars on, a handheld hiding a second palette, and ten
 * secrets to stumble into.
 */
import { SPRITES, spriteSvg } from './sprites.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const STORE_KEY = 'mz.secrets';

const SECRETS = [
  { id: 'cat', icon: 'catSit', color: '#f4f7f5', label: 'THE CAT PURRS', hint: 'something follows you' },
  { id: 'moon', icon: 'moon', color: '#f4e7a8', label: 'LIGHTS OUT, STARS ON', hint: 'the moon is a switch' },
  { id: 'star', icon: 'star', color: '#cfff72', label: 'WISH GRANTED', hint: 'one star is clickable' },
  { id: 'ghost', icon: 'ghost', color: '#dbe7ff', label: 'CAUGHT A GHOST', hint: 'it visits now and then' },
  { id: 'cursor', icon: 'crt', color: '#8b918e', label: 'SECRET BOOT LOG', hint: 'poke the blinking block' },
  { id: 'konami', icon: 'dpad', color: '#ff9ecd', label: 'ARCADE MODE', hint: '↑↑↓↓←→←→ B A' },
  { id: 'dmg', icon: 'gbConsole', color: '#9bbc0f', label: 'DMG MODE', hint: 'the screen has a second mode' },
  { id: 'cart', icon: 'cartridge', color: '#9aa5a0', label: 'BLEW THE DUST OUT', hint: 'a cartridge sits loose' },
  { id: 'bug', icon: 'bug', color: '#7dd3a0', label: 'BUG SQUASHED', hint: 'something skitters past' },
  { id: 'sound', icon: 'note', color: '#5eead4', label: 'SOUND TEST', hint: 'the footer can sing' },
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
      : spriteSvg('mystery', { scale: 2, palette: { y: '#2b312d', d: '#12150f' } });
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

function spawnCat() {
  const cat = document.createElement('div');
  cat.className = 'oneko';
  cat.setAttribute('role', 'img');
  cat.setAttribute('aria-label', 'A small pixel cat that follows the cursor');
  cat.innerHTML = `
    <div class="oneko-bubble" hidden></div>
    <div class="oneko-body">${spriteSvg('catSit', { scale: 2 })}</div>`;
  document.body.append(cat);

  const body = cat.querySelector('.oneko-body');
  const bubble = cat.querySelector('.oneko-bubble');
  const frames = {
    sit: spriteSvg('catSit', { scale: 2 }),
    stepA: spriteSvg('catStepA', { scale: 2 }),
    stepB: spriteSvg('catStepB', { scale: 2 }),
    sleep: spriteSvg('catSleep', { scale: 2 }),
  };

  const state = {
    x: window.innerWidth - 120,
    y: window.innerHeight - 120,
    targetX: window.innerWidth - 120,
    targetY: window.innerHeight - 120,
    frame: 'sit',
    idleFor: 0,
    stepTimer: 0,
    facing: 1,
  };

  const setFrame = (name) => {
    if (state.frame === name) return;
    state.frame = name;
    body.innerHTML = frames[name];
  };

  window.addEventListener('pointermove', (event) => {
    state.targetX = event.clientX + 26;
    state.targetY = event.clientY + 26;
  }, { passive: true });

  cat.addEventListener('click', () => {
    say(['MEOW!', 'purrrr~', 'nyaa!', 'hi :3', '*headbutt*'][Math.floor(Math.random() * 5)]);
    unlock('cat');
    cat.classList.add('is-happy');
    setTimeout(() => cat.classList.remove('is-happy'), 600);
  });

  let bubbleTimer;
  function say(text) {
    bubble.textContent = text;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 1600);
  }

  let previous = performance.now();
  function step(now) {
    const delta = Math.min(0.05, (now - previous) / 1000);
    previous = now;

    const dx = state.targetX - state.x;
    const dy = state.targetY - state.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 42) {
      const speed = Math.min(230, 90 + distance * 1.4);
      state.x += (dx / distance) * speed * delta;
      state.y += (dy / distance) * speed * delta;
      state.facing = dx < -2 ? -1 : dx > 2 ? 1 : state.facing;
      state.idleFor = 0;
      state.stepTimer += delta;
      if (state.stepTimer > 0.13) {
        state.stepTimer = 0;
        setFrame(state.frame === 'stepA' ? 'stepB' : 'stepA');
      }
    } else {
      state.idleFor += delta;
      setFrame(state.idleFor > 6 ? 'sleep' : 'sit');
      if (state.idleFor > 6 && bubble.hidden && Math.random() < 0.004) say('z z z');
    }

    cat.style.transform = `translate3d(${Math.round(state.x)}px, ${Math.round(state.y)}px, 0) scaleX(${state.facing})`;
    requestAnimationFrame(step);
  }

  if (!reduceMotion) requestAnimationFrame(step);
  else cat.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
}

/* ------------------------------------------------------------- decoration */

const DOODLES = [
  { sprite: 'star', color: '#cfff72', scale: 2 },
  { sprite: 'star', color: '#5eead4', scale: 2 },
  { sprite: 'sparkle', color: '#ff9ecd', scale: 2 },
  { sprite: 'star', color: '#b79cff', scale: 2 },
  { sprite: 'sparkle', color: '#f1c75b', scale: 2 },
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
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, '#cfff72', 14);
    unlock('star');
  });
}

function burst(x, y, color, count = 10, shapes = ['heart', 'sparkle']) {
  if (reduceMotion) return;
  for (let index = 0; index < count; index += 1) {
    const bit = document.createElement('span');
    bit.className = 'confetti-bit';
    bit.innerHTML = spriteSvg(index % 3 === 0 ? shapes[0] : shapes[1], { scale: 2, color });
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
const puff = (x, y) => burst(x, y, '#8b918e', 7, ['sparkle', 'sparkle']);

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
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, '#f4e7a8', 8);
    unlock('moon');
  });
}

/* ------------------------------------------------------------ shy ghost  */

function hauntPage() {
  const spawn = () => {
    const ghost = document.createElement('button');
    ghost.type = 'button';
    ghost.className = 'shy-ghost';
    ghost.title = 'boo?';
    ghost.setAttribute('aria-label', 'A shy pixel ghost');
    ghost.innerHTML = spriteSvg('ghost', { scale: 2, color: '#dbe7ff' });
    ghost.style.left = `${8 + Math.random() * 76}vw`;
    ghost.style.top = `${window.scrollY + 140 + Math.random() * (window.innerHeight - 320)}px`;
    ghost.addEventListener('click', () => {
      const rect = ghost.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top + rect.height / 2, '#dbe7ff', 12);
      unlock('ghost');
      ghost.remove();
    });
    document.body.append(ghost);
    setTimeout(() => ghost.classList.add('is-leaving'), 7000);
    setTimeout(() => ghost.remove(), 9000);
  };

  if (reduceMotion) return;
  setTimeout(function loop() {
    if (!document.hidden) spawn();
    setTimeout(loop, 26000 + Math.random() * 22000);
  }, 12000);
}

function shootingStars() {
  if (reduceMotion) return;
  setInterval(() => {
    if (document.hidden || !document.body.classList.contains('stars-on')) return;
    const star = document.createElement('span');
    star.className = 'shooting-star';
    star.style.left = `${20 + Math.random() * 60}vw`;
    star.style.top = `${Math.random() * 40}vh`;
    document.body.append(star);
    setTimeout(() => star.remove(), 1400);
  }, 9000);
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
    slot.innerHTML = spriteSvg('gbConsole', { scale: 2, color: on ? '#9bbc0f' : '#9aa5a0' });
    label.textContent = on ? 'dmg / four greens' : 'midnight / pure black';
    button.setAttribute('aria-pressed', String(on));
  };
  apply(localStorage.getItem('mz.dmg') === 'on');

  button.addEventListener('click', () => {
    const on = !document.body.classList.contains('dmg-mode');
    apply(on);
    localStorage.setItem('mz.dmg', on ? 'on' : 'off');
    const rect = button.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top, on ? '#9bbc0f' : '#5eead4', 8);
    unlock('dmg');
  });
}

/* -------------------------------------------------------- loose cartridge */

/** The 90s ritual, faithfully: it never works the first time. */
function wireCartridge() {
  const cart = document.querySelector('[data-secret="cart"]');
  if (!cart) return;
  cart.innerHTML = spriteSvg('cartridge', { scale: 2, color: '#9aa5a0' });

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
    cart.title = 'seated. good as new.';
    document.body.classList.add('is-glitching');
    setTimeout(() => document.body.classList.remove('is-glitching'), 460);
    setTimeout(() => burst(x, y, '#cfff72', 10), 300);
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
    bug.innerHTML = spriteSvg('bug', { scale: 2, color: '#7dd3a0' });

    bug.addEventListener('click', () => {
      const rect = bug.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top, '#ff6b6b', 12, ['sparkle', 'sparkle']);
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
  slot.innerHTML = spriteSvg('note', { scale: 2, color: '#5eead4' });
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
          ['#5eead4', '#cfff72', '#ff9ecd', '#b79cff', '#f1c75b'][n], 12), n * 130);
      }
    }
  });
}

/* ------------------------------------------------------------------ boot */

function heartsOnHover() {
  document.querySelectorAll('[data-hearts]').forEach((element) => {
    element.addEventListener('pointerenter', () => {
      const rect = element.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top + 6, '#ff9ecd', 5);
    });
  });
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
  console.log(`%c${art}`, 'color:#5eead4;font-family:monospace;font-size:12px');
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
heartsOnHover();
hauntPage();
wildBugs();
shootingStars();
hitCounter();
greet();
if (!window.matchMedia('(hover: none)').matches) spawnCat();
