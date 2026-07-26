/**
 * Tiny pixel-art sprite kit — 8-bit handheld era.
 *
 * Sprites are authored as silhouettes: every glyph maps to a palette colour and
 * the renderer draws the dark outline itself, so drawings stay easy to tweak.
 * `f` is the "primary" glyph — it is the one `spriteSvg({ color })` recolours,
 * so one drawing can serve many moods. Every other glyph is a fixed accent.
 */

/**
 * The sprite palette is the page palette: the neutrals carry the console's
 * violet cast rather than the old green one, and the three accents are the
 * same indigo / amber / PCB-green the CSS lights things with.
 */
const PALETTE = {
  f: '#f2f0fa', // fur / body / primary
  s: '#8a849f', // shade
  e: '#07060c', // eye
  p: '#ff9ecd', // nose, blush, inner ear
  t: '#7b68ee', // indigo accent
  y: '#ffb000', // amber accent / brass
  m: '#2ed573', // pcb green / lit screen
  d: '#1b1826', // drawn line (closed eyes, mouth, panel gaps)
  w: '#e8e4f4', // paper white
  k: '#f2c49b', // skin
  o: '#a9793f', // wood / leather
  n: '#16141d', // near-black plastic
  g: '#dd9f4e', // ginger fur (the calico's brown/yellow patches)
  c: '#3d3849', // charcoal fur — "black" that still reads against the outline
};

/**
 * The calico. One cat, many frames, all on the same 20×16 canvas so the DOM box
 * never changes size between frames — the chase code just swaps innerHTML.
 *
 * Colour language, consistent everywhere: white base (`w`), a charcoal saddle
 * over the back and left shoulder (`c`), ginger left ear / tail / flank
 * patches (`g`). Every side-view frame is drawn facing RIGHT; the behaviour
 * code mirrors with scaleX(-1) for the left-handed half of the compass.
 *
 * Directions on the sprite sheet: E (side), N (walking away — you get the
 * back of its head), S (walking at you), NE and SE (three-quarter views).
 * Each direction is a two-frame gait; the run is its own two-frame gallop
 * (full extension in the air / gathered bound on the ground).
 */
export const SPRITES = {
  /* sit, facing the viewer — the default loaf */
  catSit: {
    grid: [
      '.....g........w.....',
      '....gg.......ww.....',
      '....gpg.....wpw.....',
      '....ggggwwwwwww.....',
      '....ggwwwwwwwww.....',
      '....gwwewwwweww.....',
      '....wwwwwppwwww.....',
      '.....wwwwwwwww......',
      '.....wwwwwwwww......',
      '....cwwwwwwwwww.....',
      '...ccwwwwwwwwwww....',
      '...ccwwwwwwwwwww....',
      '...cwwwwwwwwwwww....',
      '...wwwwwwwwwwwww....',
      '..ggwwwwwwwwwwww....',
      '..gg.www..www.......',
    ],
  },

  /* sit with the tail flicked up — the idle blink of cat body language */
  catSitTail: {
    grid: [
      '.....g........w.....',
      '....gg.......ww.....',
      '....gpg.....wpw.....',
      '....ggggwwwwwww.....',
      '....ggwwwwwwwww.....',
      '....gwwewwwweww.....',
      '....wwwwwppwwww.....',
      '.....wwwwwwwww......',
      '..g..wwwwwwwww......',
      '..g.cwwwwwwwwww.....',
      '..gccwwwwwwwwwww....',
      '..gccwwwwwwwwwww....',
      '...cwwwwwwwwwwww....',
      '...wwwwwwwwwwwww....',
      '...wwwwwwwwwwww.....',
      '.....www..www.......',
    ],
  },

  /* grooming: eyes shut, one forepaw raised to the cheek… */
  catGroomA: {
    grid: [
      '.....g........w.....',
      '....gg.......ww.....',
      '....gpg.....wpw.....',
      '....ggggwwwwwww.....',
      '....ggwwwwwwwww.....',
      '....gwwdwwwwdww.....',
      '....wwwwwppwwww.....',
      '.....wwwwwwwww......',
      '.....wwwwwwwww.w....',
      '....cwwwwwwwwwww....',
      '...ccwwwwwwwwwww....',
      '...ccwwwwwwwwwww....',
      '...cwwwwwwwwwwww....',
      '...wwwwwwwwwwwww....',
      '..ggwwwwwwwwwwww....',
      '..gg.www............',
    ],
  },

  /* …and back down. Alternating the pair reads as licking. */
  catGroomB: {
    grid: [
      '.....g........w.....',
      '....gg.......ww.....',
      '....gpg.....wpw.....',
      '....ggggwwwwwww.....',
      '....ggwwwwwwwww.....',
      '....gwwdwwwwdww.....',
      '....wwwwwppwwww.....',
      '.....wwwwwwwww......',
      '.....wwwwwwwww......',
      '....cwwwwwwwwww.....',
      '...ccwwwwwwwwwww....',
      '...ccwwwwwwwwwww....',
      '...cwwwwwwwwwwww....',
      '...wwwwwwwwwwwww....',
      '..ggwwwwwwwwwwww....',
      '..gg.www..www.......',
    ],
  },

  /* curled sleep, exhale — head on paws, tail wrapped over the front */
  catSleepA: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '.....ccccc..........',
      '...ccccccccc..g.....',
      '..ccccccccwwwwgw....',
      '..cccccwwwwwwwwww...',
      '..wwwwwwwwwwddwww...',
      '..wwwwwwwwwwwwwpw...',
      '..gggggwwwwwwwwww...',
      '...ggggggwwwwww.....',
    ],
  },

  /* curled sleep, inhale — the whole loaf lifts a pixel */
  catSleepB: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '......cccc..........',
      '....cccccccc........',
      '...ccccccccc..g.....',
      '..ccccccccwwwwgw....',
      '..cccccwwwwwwwwww...',
      '..wwwwwwwwwwddwww...',
      '..wwwwwwwwwwwwwpw...',
      '..gggggwwwwwwwwww...',
      '...ggggggwwwwww.....',
    ],
  },

  /* the wake-up: rump high, forelegs flat along the ground */
  catStretch: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '..c.................',
      '..cc.........g.w....',
      '...ccc.......gww....',
      '...ccccc....wwww....',
      '....cccwwwwwwwwewp..',
      '....ww....wwwwww....',
      '...ww.........ww....',
    ],
  },

  /* -- walk east (side view, facing right) -- */
  catWalkEA: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '.c............g..w..',
      '.c...........gg.ww..',
      '..c..........gggwww.',
      '..c..........ggwwwww',
      '...c...ccc...gwwewwp',
      '....ccccccccwwwwwwww',
      '....ccccccccwwwwwww.',
      '....wcccccwwwwwwww..',
      '....wwwwwwwwwwwwww..',
      '....ww.s......s.ww..',
      '...ww...........ww..',
    ],
  },
  catWalkEB: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '..c...........g..w..',
      '..c..........gg.ww..',
      '..c..........gggwww.',
      '...c.........ggwwwww',
      '...c...ccc...gwwewwp',
      '....ccccccccwwwwwwww',
      '....ccccccccwwwwwww.',
      '....wcccccwwwwwwww..',
      '....wwwwwwwwwwwwww..',
      '.....s.ww....ww.s...',
      '.......ww.....ww....',
    ],
  },

  /* -- gallop east: A is full extension (airborne), B the gathered bound -- */
  catRunEA: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '.............g..w...',
      'c............ggwww..',
      '.cc....ccc..gwwwewp.',
      '...ccccccccwwwwwwww.',
      '..wwccccwwwwwwwwww..',
      '.ww..wwwwwwwww...ww.',
      'ww................ww',
      '....................',
      '....................',
    ],
  },
  catRunEB: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      '......cccc...g.w....',
      '....cccccccggww.....',
      '...ccccccwwwwwwew...',
      '..ggwwwwwwwwwwwwp...',
      '...wwwwwwwwwwwww....',
      '....wwwwwwwwwww.....',
      '.....ww...ww........',
    ],
  },

  /* -- walk north: walking away, tail up like a flag -- */
  catWalkNA: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '..........g.........',
      '..........g.........',
      '.........gg.........',
      '.....g...g....w.....',
      '.....gg..g...ww.....',
      '.....ggggccwwww.....',
      '.....gggcccwwww.....',
      '....wccccccccww.....',
      '....wcccccccwww.....',
      '....wwwwwwwwwww.....',
      '.....ww....ww.......',
      '.....ww.............',
    ],
  },
  catWalkNB: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '.........g..........',
      '.........g..........',
      '.........gg.........',
      '.....g...g....w.....',
      '.....gg..g...ww.....',
      '.....ggggccwwww.....',
      '.....gggcccwwww.....',
      '....wccccccccww.....',
      '....wcccccccwww.....',
      '....wwwwwwwwwww.....',
      '.....ww....ww.......',
      '...........ww.......',
    ],
  },

  /* -- walk south: coming straight at you -- */
  catWalkSA: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '.....g........w.....',
      '....gg.......ww.....',
      '....gpg.....wpw.....',
      '....ggggwwwwwww.....',
      '....gwwewwwweww.....',
      '....wwwwwppwwww.....',
      '.....wwwwwwwww......',
      '....cwwwwwwwwww.....',
      '...gcwwwwwwwwww.....',
      '..g.wwwwwwwwwww.....',
      '.....ww.....ww......',
      '.....ww.............',
    ],
  },
  catWalkSB: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '.....g........w.....',
      '....gg.......ww.....',
      '....gpg.....wpw.....',
      '....ggggwwwwwww.....',
      '....gwwewwwweww.....',
      '....wwwwwppwwww.....',
      '.....wwwwwwwww......',
      '....cwwwwwwwwww.....',
      '...gcwwwwwwwwww.....',
      '..g.wwwwwwwwwww.....',
      '.....ww.....ww......',
      '............ww......',
    ],
  },

  /* -- walk north-east: three-quarter back view -- */
  catWalkNEA: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '...g................',
      '...g.........g..w...',
      '....g........ggww...',
      '....g......ggggww...',
      '.....g....ccggwwww..',
      '......ccccccgwwww...',
      '.....cccccccwwww....',
      '....wcccccwwwww.....',
      '....wwwwwwwwww......',
      '....wwwwwwwww.......',
      '....ww....ww........',
      '....ww..............',
    ],
  },
  catWalkNEB: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '....g...............',
      '....g........g..w...',
      '....g........ggww...',
      '.....g.....ggggww...',
      '.....g....ccggwwww..',
      '......ccccccgwwww...',
      '.....cccccccwwww....',
      '....wcccccwwwww.....',
      '....wwwwwwwwww......',
      '....wwwwwwwww.......',
      '....ww....ww........',
      '..........ww........',
    ],
  },

  /* -- walk south-east: three-quarter front view -- */
  catWalkSEA: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '..g.................',
      '..g......g....w.....',
      '...g....gg...ww.....',
      '...g....gggwwww.....',
      '..cc...ggggwwwww....',
      '..ccccwgwwewwwew....',
      '..ccwwwwwwwwwwww....',
      '...wwwwwwwwwppww....',
      '...wwwwwwwwwwww.....',
      '....wwwwwwwwww......',
      '...ww......ww.......',
      '...ww...............',
    ],
  },
  catWalkSEB: {
    grid: [
      '....................',
      '....................',
      '....................',
      '....................',
      '...g................',
      '...g.....g....w.....',
      '...g....gg...ww.....',
      '....g...gggwwww.....',
      '..cc...ggggwwwww....',
      '..ccccwgwwewwwew....',
      '..ccwwwwwwwwwwww....',
      '...wwwwwwwwwppww....',
      '...wwwwwwwwwwww.....',
      '....wwwwwwwwww......',
      '...ww......ww.......',
      '...........ww.......',
    ],
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
      '....fff....',
      '....fff....',
      '....fff....',
      '....fff....',
      'fffffffffff',
      'fffffsfffff',
      'fffffffffff',
      '....fff....',
      '....fff....',
      '....fff....',
      '....fff....',
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
      'fffffffffff',
      'ffeefffeeff',
      'fffffffffff',
      'fffdddddfff',
      'fffffffffff',
      'fffffffffff',
      'fffffffffff',
    ],
  },

  /** Side-view flyer, wing up mid-flap. The amber beak survives any recolour. */
  bird: {
    grid: [
      '....ff...',
      '...ffff..',
      'f..fffff.',
      'ffffffef.',
      '.fffffffy',
      '..fffff..',
      '...ff....',
    ],
  },

  /** One cell of a contribution graph. The auto-outline is the border. */
  commitSquare: {
    grid: [
      '.fff.',
      'fffff',
      'fffff',
      'fffff',
      '.fff.',
    ],
  },

  /** A demitasse on its saucer, steam still rising. The crema stays brown. */
  coffeeCup: {
    grid: [
      '..w..w...',
      '.w..w....',
      'fooooof..',
      'fffffffff',
      'fffffff.f',
      'fffffffff',
      '.fffff...',
      'ffffffff.',
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

  /**
   * Top-down racer. The tyres are held a pixel off the bodywork so the
   * renderer's outline runs between them — otherwise dark-on-dark reads as one
   * solid lump.
   */
  car: {
    grid: [
      '...fffff...',
      '...fffff...',
      'nn.fffff.nn',
      'nn.fffff.nn',
      '...fffff...',
      '...ddddd...',
      '...fffff...',
      'nn.fffff.nn',
      'nn.fffff.nn',
      '..fffffff..',
      '..fffffff..',
    ],
  },

  /** Open book: white leaves, a dark gutter, the cover showing along the base. */
  book: {
    grid: [
      '..ff...ff..',
      '.wwwwfwwww.',
      'wwwwwfwwwww',
      'wwdwwfwwdww',
      'wwwwwfwwwww',
      'wwdwwfwwdww',
      'wwwwwfwwwww',
      '.wwwwfwwww.',
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
      'ffssssdff',
      'ffssssdff',
      'fffffffff',
      'fwwwwwwwf',
      'fwdddddwf',
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
      '..fffffff..',
      '..ff...ff..',
      '.ff.....ff.',
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

  const { scale = 3, color, outline = '#07060c', palette = {}, className = '' } = options;
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
