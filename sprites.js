/**
 * Tiny pixel-art sprite kit — 8-bit handheld era.
 *
 * Sprites are authored as silhouettes: every glyph maps to a palette colour and
 * the renderer draws the dark outline itself, so drawings stay easy to tweak.
 * `f` is the "primary" glyph — it is the one `spriteSvg({ color })` recolours,
 * so one drawing can serve many moods. Every other glyph is a fixed accent.
 */

const PALETTE = {
  f: '#f4f7f5', // fur / body / primary
  s: '#9aa5a0', // shade
  e: '#0a0a0a', // eye
  p: '#ff9ecd', // nose, blush, inner ear
  t: '#5eead4', // teal accent
  y: '#f1c75b', // amber accent / brass
  m: '#cfff72', // lime accent / lit screen
  d: '#1d2b27', // drawn line (closed eyes, mouth, panel gaps)
  w: '#e8ece9', // paper white
  k: '#f2c49b', // skin
  o: '#a9793f', // wood / leather
  n: '#151816', // near-black plastic
};

const cat = (legs, extra = {}) => [
  '...f........f...',
  '...ff......ff...',
  '..ffff....ffff..',
  '..ffffffffffff..',
  '..ffffffffffff..',
  extra.eyes ?? '..ffeffffffeff..',
  '..fpfffppfffpf..',
  '..ffffffffffff..',
  '...ffffffffff..f',
  '...ffffffffff..f',
  '..ffffffffffffff',
  '..ffffffffffff..',
  '..ffffffffffff..',
  legs,
];

export const SPRITES = {
  catSit: { grid: cat('..fff.ffff.fff..') },
  catStepA: { grid: cat('.ffff.ffff..ff..') },
  catStepB: { grid: cat('..ff..ffff.ffff.') },
  catSleep: {
    grid: cat('..ffffffffffff..', { eyes: '..ffddffffddff..' }),
  },

  star: {
    grid: [
      '...f...',
      '...f...',
      '..fff..',
      'fffffff',
      '..fff..',
      '...f...',
      '...f...',
    ],
  },

  heart: {
    grid: [
      '.ff...ff.',
      'fffffffff',
      'fffffffff',
      '.fffffff.',
      '..fffff..',
      '...fff...',
      '....f....',
    ],
  },

  ghost: {
    grid: [
      '....ffff....',
      '..ffffffff..',
      '.ffffffffff.',
      'ffeeffffeeff',
      'ffeeffffeeff',
      'ffffffffffff',
      'ffffffffffff',
      'ffffffffffff',
      'ffffffffffff',
      'ffffffffffff',
      'ff.fff.fff.f',
      'f...f...f...',
    ],
  },

  sparkle: {
    grid: [
      '..f..',
      '.fff.',
      'fffff',
      '.fff.',
      '..f..',
    ],
  },

  /* ------------------------------------------------ hardware + inventory */

  /** The handheld itself: screen, d-pad, two buttons, speaker grille. */
  gbConsole: {
    grid: [
      '.ffffffffff.',
      'ffffffffffff',
      'ff.dddddd.ff',
      'ff.dmmmmd.ff',
      'ff.dmmmmd.ff',
      'ff.dddddd.ff',
      'ffffffffffff',
      'ffffffffffff',
      'ff.d.....pff',
      'ffddd...p.ff',
      'ff.d......ff',
      'ffffffffffff',
      'ffffff.s.sff',
      'fffff.s.s.ff',
      'ffffffffffff',
      '.ffffffffff.',
    ],
  },

  /** Grey cartridge, label up, gold pins down. */
  cartridge: {
    grid: [
      '..fffffff..',
      '.fffffffff.',
      '.fdddddddf.',
      '.fdmmmmmdf.',
      '.fdmmmmmdf.',
      '.fdddddddf.',
      '.fffffffff.',
      '.ff.....ff.',
      '.fffffffff.',
      '.fffffffff.',
      '.fyfyfyfyf.',
      '.fyfyfyfyf.',
    ],
  },

  /** Directional pad — the navigation icon, obviously. */
  dpad: {
    grid: [
      '..fff..',
      '..fff..',
      'fffffff',
      'fffsfff',
      'fffffff',
      '..fff..',
      '..fff..',
    ],
  },

  /** Little CRT with two green blips still crawling across it. */
  crt: {
    grid: [
      'fffffffffff',
      'fdddddddddf',
      'fdmmmdddddf',
      'fddddmmdddf',
      'fdddddddddf',
      'fffffffffff',
      '....fff....',
      '....fff....',
      '..fffffff..',
    ],
  },

  /* --------------------------------------------------------- characters */

  /** Player one: cap, two pixels of face, stubby boots. */
  hero: {
    grid: [
      '..fffff..',
      '.fffffff.',
      'fffffffff',
      '.kkkkkkk.',
      '.kekkkek.',
      '.kkkkkkk.',
      '.kkkdkkk.',
      '.fffffff.',
      'f..fff..f',
      '...fff...',
      '..ff.ff..',
    ],
  },

  /** Blob enemy #1 of every 90s RPG. */
  slime: {
    grid: [
      '....fff....',
      '..fffffff..',
      '.fffffffff.',
      'ffeefffeeff',
      'fffffffffff',
      'ffffdddffff',
      'fffffffffff',
      'fffffffffff',
    ],
  },

  /** The thing you squash. Antennae, six legs, one shiny shell. */
  bug: {
    grid: [
      '..f.....f..',
      '...f...f...',
      '...fffff...',
      '...fefef...',
      '.fffffffff.',
      'f.fffdfff.f',
      '.ffffdffff.',
      'f.fffdfff.f',
      '..fffffff..',
    ],
  },

  /* -------------------------------------------------------- nav objects */

  /** Top-down racer, four fat tyres and a dark cockpit. */
  car: {
    grid: [
      '..fff..',
      '..fff..',
      'nnfffnn',
      'nnfffnn',
      '..fff..',
      '.ddddd.',
      '..fff..',
      'nnfffnn',
      'nnfffnn',
      '.fffff.',
      '.fffff.',
    ],
  },

  book: {
    grid: [
      '..fffffff..',
      '.fffffffff.',
      '.fwwwfwwwf.',
      '.fwdwfwdwf.',
      '.fwwwfwwwf.',
      '.fwdwfwdwf.',
      '.fwwwfwwwf.',
      '.fffffffff.',
      '..fffffff..',
    ],
  },

  chest: {
    grid: [
      '..ooooooo..',
      '.ooooooooo.',
      '.ooooooooo.',
      '.yyyyyyyyy.',
      '.ooooyoooo.',
      '.ooooyoooo.',
      '.ooooooooo.',
      '.ooooooooo.',
      '..yyyyyyy..',
    ],
  },

  envelope: {
    grid: [
      'fffffffffff',
      'fdfffffffdf',
      'ffdfffffdff',
      'fffdfffdfff',
      'ffffdddffff',
      'fffffffffff',
      'fffffffffff',
      'fffffffffff',
    ],
  },

  /** Dog-eared sheet of paper with three lines of nothing on it. */
  page: {
    grid: [
      'fffffff..',
      'fffffffs.',
      'fffffffss',
      'fffffffff',
      'ffdddddff',
      'fffffffff',
      'ffdddddff',
      'fffffffff',
      'ffdddddff',
      'fffffffff',
      'fffffffff',
    ],
  },

  /** 3.5" disk. Still the universal glyph for "saved". */
  floppy: {
    grid: [
      'fffffffff',
      'fdddsdddf',
      'fdddsdddf',
      'fffffffff',
      'fffffffff',
      'fwwwwwwwf',
      'fwdddddwf',
      'fwwwwwwwf',
      'fffffffff',
    ],
  },

  briefcase: {
    grid: [
      '....fff....',
      '....f.f....',
      'ooooooooooo',
      'ooooooooooo',
      'ooooyyyoooo',
      'ooooooooooo',
      'ooooooooooo',
      'ooooooooooo',
      '.ooooooooo.',
    ],
  },

  /** Broadcast tower, two pixels of signal leaving it. */
  tower: {
    grid: [
      '.....f.....',
      '.t..fff..t.',
      't...f.f...t',
      '...ff.ff...',
      '...f...f...',
      '..ff...ff..',
      '..f.....f..',
      '.ff.....ff.',
      'fff.....fff',
    ],
  },

  /* ------------------------------------------------------------ pickups */

  key: {
    grid: [
      '.yyy.......',
      'y...y......',
      'y...yyyyyyy',
      'y...y..y.y.',
      '.yyy...y.y.',
    ],
  },

  sword: {
    grid: [
      '...w...',
      '..wws..',
      '..wws..',
      '..wws..',
      '..wws..',
      '..wws..',
      '.yyyyy.',
      'yyyyyyy',
      '...o...',
      '...o...',
      '..yyy..',
    ],
  },

  potion: {
    grid: [
      '...ooo...',
      '...ooo...',
      '...fff...',
      '...fff...',
      '..fffff..',
      '.fffffff.',
      '.fpppppf.',
      '.fpppppf.',
      '.fpppppf.',
      '.fffffff.',
      '..fffff..',
    ],
  },

  /** Interior gaps become the dark inner ring — that is the whole trick. */
  coin: {
    grid: [
      '..yyyyy..',
      '.yyyyyyy.',
      'yy.yyy.yy',
      'yy.yyy.yy',
      'yy.yyy.yy',
      'yy.yyy.yy',
      'yy.yyy.yy',
      '.yyyyyyy.',
      '..yyyyy..',
    ],
  },

  note: {
    grid: [
      '...ffffff',
      '...ffffff',
      '...ff.fff',
      '...ff..ff',
      '...ff....',
      '...ff....',
      '...ff....',
      '.ffff....',
      'fffff....',
      'fffff....',
      '.fff.....',
    ],
  },

  battery: {
    grid: [
      'fffffffff..',
      'f.......f..',
      'fmmmmm..fff',
      'fmmmmm..fff',
      'fmmmmm..fff',
      'f.......f..',
      'fffffffff..',
    ],
  },

  flag: {
    grid: [
      'fwwddwwddww',
      'fwwddwwddww',
      'fddwwddwwdd',
      'fddwwddwwdd',
      'fwwddwwddww',
      'fwwddwwddww',
      'f..........',
      'f..........',
      'f..........',
      'f..........',
      'fff........',
    ],
  },

  /** The universal "you have not found this yet" block. */
  mystery: {
    grid: [
      'yyyyyyyyy',
      'yyydddyyy',
      'yydyyydyy',
      'yyyyyydyy',
      'yyyyydyyy',
      'yyyydyyyy',
      'yyyyyyyyy',
      'yyyydyyyy',
      'yyyyyyyyy',
    ],
  },
};

/** Circle-subtraction crescent — cleaner than hand-plotting the curve. */
function crescentGrid(size = 14) {
  const rows = [];
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    let row = '';
    for (let x = 0; x < size; x += 1) {
      const outer = Math.hypot(x - c, y - c) <= size / 2 - 0.7;
      const inner = Math.hypot(x - c - 3.4, y - c - 0.9) <= size / 2 - 1.5;
      row += outer && !inner ? 'f' : '.';
    }
    rows.push(row);
  }
  return rows;
}

SPRITES.moon = { grid: crescentGrid(14) };

/**
 * Grids are hand-typed, so a row can end up a pixel short. Padding once at load
 * keeps the renderer's width assumption true instead of drawing stray pixels
 * where `grid[y][x]` came back undefined.
 */
Object.values(SPRITES).forEach((sprite) => {
  const width = sprite.grid.reduce((widest, row) => Math.max(widest, row.length), 0);
  sprite.grid = sprite.grid.map((row) => row.padEnd(width, '.'));
});

/**
 * Render a sprite to an SVG string.
 * `color` recolours every `f` pixel; `palette` overrides any other glyph.
 */
export function spriteSvg(name, options = {}) {
  const sprite = SPRITES[name];
  if (!sprite) throw new Error(`Unknown sprite: ${name}`);

  const { scale = 3, color, outline = '#05100c', palette = {}, className = '' } = options;
  const colors = { ...PALETTE, ...(color ? { f: color } : {}), ...palette };
  const grid = sprite.grid;
  const height = grid.length;
  const width = grid[0].length;
  const at = (x, y) => (y < 0 || y >= height || x < 0 || x >= width ? '.' : grid[y][x]);

  let rects = '';
  for (let y = -1; y <= height; y += 1) {
    for (let x = -1; x <= width; x += 1) {
      const glyph = at(x, y);
      if (glyph !== '.') {
        rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[glyph] ?? colors.f}"/>`;
      } else if (outline && (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.')) {
        rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${outline}"/>`;
      }
    }
  }

  return `<svg class="${className}" viewBox="-1 -1 ${width + 2} ${height + 2}" width="${(width + 2) * scale}" height="${(height + 2) * scale}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
}

export function spriteElement(name, options = {}) {
  const wrapper = document.createElement('span');
  wrapper.className = `sprite sprite-${name}${options.className ? ` ${options.className}` : ''}`;
  wrapper.innerHTML = spriteSvg(name, options);
  return wrapper;
}
