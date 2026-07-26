/**
 * The location card — a Game Boy screen with the world on it, cropped to
 * wherever Michael happens to be, and his clock underneath.
 *
 * Everything the card needs is declared on the element itself, so moving house
 * is one line of HTML and no JavaScript:
 *
 *   data-place  the name printed under the screen
 *   data-lat    decimal degrees, north positive
 *   data-lon    decimal degrees, east positive
 *   data-zoom   1 is the whole planet; every step up halves the span
 *   data-tz     IANA zone the clock runs in
 *
 * The map itself is `assets/worldmap.js` — Natural Earth's coastline baked to
 * one bit a pixel on an equirectangular grid by `scripts/make-worldmap.mjs`.
 * Equirectangular is the whole trick: longitude is x and latitude is y, so
 * cropping to a place is arithmetic rather than cartography.
 *
 * The screen is drawn in the four greens of an original DMG rather than the
 * site's indigo. A handheld from 1989 is the one object that can carry a
 * world map, a blinking dot and a clock without any of it looking like a
 * dashboard, and the page is already dressed as a console — this is the part
 * of it that is pretending to be the actual screen.
 */
import { WORLD } from './assets/worldmap.js';

const card = document.querySelector('[data-locale]');

if (card) {
  /* The DMG's four greens, darkest first. Nothing else goes on this screen. */
  const DMG = {
    sea: '#0f380f',
    grid: '#13421040',
    land: '#306230',
    coast: '#8bac0f',
    marker: '#9bbc0f',
  };

  /* One logical map pixel, in CSS pixels. Three is the size where the
     coastline still reads as a coastline and a single lit cell still reads as
     a place rather than a speck. */
  const CELL = 3;

  const canvas = card.querySelector('.locale-map');
  const context = canvas.getContext('2d');

  const place = card.dataset.place || 'somewhere';
  const lat = Number(card.dataset.lat);
  const lon = Number(card.dataset.lon);
  const zone = card.dataset.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zoom = Math.max(1, Number(card.dataset.zoom) || 1);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Bit `y * w + x`, most significant bit first — the packing the generator
     writes. Decoded once into a byte array; the lookup is two shifts. */
  const bytes = Uint8Array.from(atob(WORLD.bits), (character) => character.charCodeAt(0));
  const isLand = (x, y) => {
    if (y < 0 || y >= WORLD.h) return 0;
    const index = y * WORLD.w + (((x % WORLD.w) + WORLD.w) % WORLD.w);
    return (bytes[index >> 3] >> (7 - (index & 7))) & 1;
  };

  /* ------------------------------------------------------------ the view */

  /**
   * Zoomed in, the card shows a window on the world; zoomed all the way out it
   * shows the whole thing. Both are the same crop maths, so the click that
   * swaps between them only has to change one number.
   */
  let wide = false;
  let grid = { cols: 0, rows: 0 };
  let terrain = null;

  /** Degrees per map cell, and the top-left corner of the window, in degrees. */
  function window_() {
    const scale = wide ? 1 : zoom;

    /* A cell never covers less than one pixel of the source map. Past that
       point zooming stops adding coastline and starts stretching the same
       pixel over two cells — which shows up as a coastline where every other
       row is doubled, the one artefact that reads as broken rather than
       low-resolution. `data-zoom` is therefore a request, and this is the
       screen's honest answer to it. */
    const step = Math.max(360 / scale / grid.cols, 360 / WORLD.w);
    const spanLat = step * grid.rows;

    /* Latitude is clamped so a zoomed view never runs off the top or bottom of
       the map and starts sampling empty rows; longitude is free to wrap, which
       is why the Pacific views work at all. */
    const half = spanLat / 2;
    const centreLat = spanLat >= 180 ? 0 : Math.min(90 - half, Math.max(-90 + half, lat));

    return { step, left: lon - (step * grid.cols) / 2, top: centreLat + half };
  }

  /**
   * The land layer only changes when the view does, so it is drawn once into
   * an offscreen canvas and blitted every frame. The marker is the only thing
   * that actually animates.
   */
  function drawTerrain() {
    const { step, left, top } = window_();
    const { cols, rows } = grid;

    terrain = document.createElement('canvas');
    terrain.width = cols;
    terrain.height = rows;
    const layer = terrain.getContext('2d');

    layer.fillStyle = DMG.sea;
    layer.fillRect(0, 0, cols, rows);

    /* Whether a cell is land is decided by the whole patch of source map it
       covers, not by its centre. A centre sample drops every island smaller
       than the cell it falls in — pulled back to the whole world that cell is
       three degrees across, so it drops most of the Pacific, and a world map
       missing Hawaii looks broken rather than generalised. */
    const patch = Math.max(1, Math.round(step / (360 / WORLD.w)));
    const filled = new Uint8Array(cols * rows);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const originX = Math.floor(((left + col * step + 180) / 360) * WORLD.w);
        const originY = Math.floor(((90 - (top - row * step)) / 180) * WORLD.h);

        let hit = 0;
        for (let dy = 0; dy < patch && !hit; dy += 1) {
          for (let dx = 0; dx < patch && !hit; dx += 1) {
            hit = isLand(originX + dx, originY + dy);
          }
        }
        filled[row * cols + col] = hit;
      }
    }

    /* Land that runs off the edge of the window is not a coastline, it is a
       crop. Assuming the continent carries on past the edge stops the viewport
       drawing itself a bright border all the way round. */
    const at = (col, row) =>
      (col < 0 || col >= cols || row < 0 || row >= rows ? 1 : filled[row * cols + col]);

    /* Land in mid green, every cell that touches water picked out in the
       lightest one — the whole shore, not just the side the light comes from.
       Two greens this close together carry almost no edge on their own: lit
       from the northwest, a coast that faces southeast (which is to say, the
       entire eastern seaboard) simply doesn't appear, and the screen shows a
       green rectangle with a marker on it. The outline is what turns the same
       four colours into a map — Cape Cod hooks, Long Island lets go of the
       mainland, and the marker sits somewhere you can name. */
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!filled[row * cols + col]) continue;

        const inland =
          at(col - 1, row) && at(col + 1, row) && at(col, row - 1) && at(col, row + 1);

        layer.fillStyle = inland ? DMG.land : DMG.coast;
        layer.fillRect(col, row, 1, 1);
      }
    }

    return { step, left, top };
  }

  /* ----------------------------------------------------------- the frame */

  let view = null;

  /** Where the marker sits, in cells — fractional, so it lands where it means. */
  function markerCell() {
    const east = ((((lon - view.left) % 360) + 360) % 360);
    return { x: east / view.step, y: (view.top - lat) / view.step };
  }

  function paint(time) {
    /* The first frame can beat the first fit — a rail that is still laid out
       at zero width has no grid to draw on yet. */
    if (!terrain) {
      requestAnimationFrame(paint);
      return;
    }

    const { cols, rows } = grid;
    const scale = CELL * (window.devicePixelRatio || 1);

    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(terrain, 0, 0);

    const { x, y } = markerCell();
    const cx = Math.round(x);
    const cy = Math.round(y);

    /* A ping every two and a half seconds, drawn as an expanding square ring
       because a circle at this scale is just a wobbly square anyway. It stops
       at five cells: any bigger and it stops reading as something radiating
       out of the marker and starts reading as a box drawn around it. */
    if (!reduced.matches) {
      const phase = (time % 2500) / 2500;
      const radius = Math.round(1 + phase * 4);
      context.globalAlpha = Math.max(0, 1 - phase) * 0.5;
      context.strokeStyle = DMG.marker;
      context.lineWidth = 1;
      context.strokeRect(cx - radius + 0.5, cy - radius + 0.5, radius * 2, radius * 2);
      context.globalAlpha = 1;
    }

    /* The marker is a plus, one cell thick — the smallest shape that still has
       a centre you can point at — carrying a dark cell all the way around it.
       That outline is doing real work: a coastal city sits exactly where the
       light land meets the light coastline, and without it the marker lands
       in the one place on the map it cannot be seen. */
    context.fillStyle = DMG.sea;
    context.fillRect(cx - 3, cy - 1, 7, 3);
    context.fillRect(cx - 1, cy - 3, 3, 7);

    /* It blinks between the two lightest greens rather than on and off, so the
       place itself never actually disappears. */
    const lit = reduced.matches || (time % 1200) < 700;
    context.fillStyle = lit ? DMG.marker : DMG.coast;
    context.fillRect(cx - 2, cy, 5, 1);
    context.fillRect(cx, cy - 2, 1, 5);

    if (!reduced.matches) requestAnimationFrame(paint);
  }

  /* --------------------------------------------------------- the fitting */

  /**
   * The grid is derived from the space the card actually has rather than fixed
   * up front, so every cell stays exactly three device-independent pixels and
   * the map never lands on a half pixel. Two to one, because that is the shape
   * of the world in this projection.
   */
  function fit() {
    const width = canvas.parentElement.clientWidth;
    if (!width) return;

    const cols = Math.floor(width / CELL);
    const rows = Math.floor(cols / 2);
    if (cols === grid.cols && rows === grid.rows) return;

    grid = { cols, rows };

    const ratio = window.devicePixelRatio || 1;
    canvas.width = cols * CELL * ratio;
    canvas.height = rows * CELL * ratio;
    canvas.style.width = `${cols * CELL}px`;
    canvas.style.height = `${rows * CELL}px`;

    render();
  }

  function render() {
    view = drawTerrain();
    if (reduced.matches) paint(0);
  }

  /* -------------------------------------------------------- the readouts */

  const clock = card.querySelector('.locale-clock-time');
  const meridiem = card.querySelector('.locale-clock-zone');

  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: zone,
  });
  const named = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'short', timeZone: zone,
  });

  function tick() {
    clock.textContent = time.format(new Date());
    /* "7/25/2026, EDT" — the zone is the only part worth printing. */
    meridiem.textContent = named.format(new Date()).split(', ').pop().toLowerCase();
  }

  tick();
  setInterval(tick, 1000);

  card.querySelector('.locale-place').textContent = place;
  card.querySelector('.locale-coords').textContent =
    `${Math.abs(lat).toFixed(2)}°${lat < 0 ? 'S' : 'N'} ${Math.abs(lon).toFixed(2)}°${lon < 0 ? 'W' : 'E'}`;

  /* ------------------------------------------------------------ the wire */

  const hint = card.querySelector('.locale-hint');

  function toggle() {
    wide = !wide;
    hint.textContent = wide ? 'the whole world — click to zoom back in' : 'click the screen for the whole world';
    render();
  }

  canvas.addEventListener('click', toggle);
  canvas.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggle();
  });

  new ResizeObserver(fit).observe(canvas.parentElement);
  fit();
  if (!reduced.matches) requestAnimationFrame(paint);
}
