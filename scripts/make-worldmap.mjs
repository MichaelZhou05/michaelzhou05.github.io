/**
 * Bakes `assets/worldmap.js` — the one-bit world the location card draws from.
 *
 * The card has to zoom, so it cannot ship a picture of a map; it needs the map
 * as data. This pulls Natural Earth's 50m land outline (the coastline every
 * atlas is drawn from, generalised to about the detail of a page in one),
 * decodes the TopoJSON by hand — the format is small enough that a dependency
 * would cost more than the twenty lines below — and scanline-fills it into a
 * plain equirectangular bitmap.
 *
 * Equirectangular because the projection maths then reduce to two divisions:
 * longitude is x, latitude is y, and the card can crop a window around any
 * coordinate without knowing anything about projections at all.
 *
 * 2880x1440 is one pixel every 0.125 degrees — about 14km at the equator, and
 * the resolution at which a bay is a bay: Cape Cod curls, Long Island detaches,
 * the Chesapeake reaches inland. The 110m outline this used to be built from
 * had none of those, which is how you end up with a map of Boston that could
 * equally be a map of anywhere with sea to the east of it.
 *
 * That is 675KB of base64, which sounds enormous and isn't: a bitset this
 * sparse gzips to about 37KB, less than one photograph, for the whole planet.
 *
 *   npm run worldmap
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json';
const W = 2880;
const H = 1440;

/* ------------------------------------------------------------- topojson */

/**
 * TopoJSON stores every coastline once, as an "arc" of delta-encoded integers
 * on a quantised grid, and builds rings by referencing arcs — a negative index
 * meaning "that arc, walked backwards". Undoing it is a running sum through
 * the deltas and then the topology's own affine transform back to degrees.
 */
function decodeArcs(topology) {
  const { scale: [sx, sy], translate: [tx, ty] } = topology.transform;

  return topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * sx + tx, y * sy + ty];
    });
  });
}

/** A ring is a run of arcs; ~i is TopoJSON's "walk arc i backwards". */
function ringPoints(ring, arcs) {
  const points = [];

  for (const index of ring) {
    const arc = index < 0 ? arcs[~index].slice().reverse() : arcs[index];
    // The shared endpoint would otherwise appear twice at every seam.
    points.push(...(points.length ? arc.slice(1) : arc));
  }

  return points;
}

/* ------------------------------------------------------------ rasterise */

/**
 * Fiji sits on the 180th meridian, so its ring leaves the map at +180 and
 * re-enters at -180. Read literally that is a segment running the whole width
 * of the world, and it drags a scanline fill across the empty Pacific with it.
 *
 * Unwrapping walks the ring and lets longitude run past the edge instead —
 * 179, 180, 181 — so the ring stays a small closed loop that happens to live
 * outside the nominal range. The fill then wraps back on write.
 */
function unwrap(points) {
  let offset = 0;
  let previous = points[0][0];

  return points.map(([lon, lat]) => {
    if (lon - previous > 180) offset -= 360;
    else if (lon - previous < -180) offset += 360;
    previous = lon;
    return [lon + offset, lat];
  });
}

/**
 * One scanline per output row, even-odd fill, a polygon at a time.
 *
 * Even-odd is what makes holes free: a lake sits inside its continent's ring,
 * so any pixel inside both crosses an even number of edges and stays sea.
 * Filling one polygon at a time — rather than pooling every edge on the map —
 * keeps that parity argument local, so an unwrapped ring off past +180 cannot
 * repair its parity against a continent on the other side of the planet.
 *
 * Rows are sampled down the centre of each pixel. Sampling on the boundary
 * instead puts the poles exactly on a vertex and makes the fill flicker.
 */
function rasterise(polygons) {
  const land = new Uint8Array(W * H);

  for (const polygon of polygons) {
    const edges = [];

    for (const ring of polygon) {
      const points = unwrap(ring);
      for (let i = 0; i < points.length - 1; i += 1) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];
        if (y1 !== y2) edges.push([x1, y1, x2, y2]);
      }
    }

    for (let row = 0; row < H; row += 1) {
      const lat = 90 - ((row + 0.5) / H) * 180;
      const crossings = [];

      for (const [x1, y1, x2, y2] of edges) {
        // Half-open in latitude so a vertex is counted once, never twice.
        if ((y1 <= lat) === (y2 <= lat)) continue;
        crossings.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
      }

      if (!crossings.length) continue;
      crossings.sort((a, b) => a - b);

      for (let i = 0; i + 1 < crossings.length; i += 2) {
        const from = Math.round(((crossings[i] + 180) / 360) * W);
        const to = Math.round(((crossings[i + 1] + 180) / 360) * W);
        for (let col = from; col < to; col += 1) {
          land[row * W + (((col % W) + W) % W)] = 1;
        }
      }
    }
  }

  return land;
}

/**
 * Islands smaller than a pixel fall through the scanline entirely — 14km still
 * loses plenty of the Pacific, and a world map with no Tuvalu looks broken
 * rather than generalised. So every ring is also stamped along its own
 * outline, which costs nothing and puts the small stuff back as the single lit
 * pixel it deserves.
 */
function stampOutlines(land, polygons) {
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        const col = Math.floor(((lon + 180) / 360) * W);
        const row = Math.floor(((90 - lat) / 180) * H);
        if (row >= 0 && row < H) land[row * W + (((col % W) + W) % W)] = 1;
      }
    }
  }
}

/* ---------------------------------------------------------------- output */

/** Row-major, most significant bit first — the reader unpacks the same way. */
function pack(land) {
  const bytes = new Uint8Array(Math.ceil(land.length / 8));

  for (let i = 0; i < land.length; i += 1) {
    if (land[i]) bytes[i >> 3] |= 0x80 >> (i & 7);
  }

  return Buffer.from(bytes).toString('base64');
}

const response = await fetch(SRC);
if (!response.ok) throw new Error(`${SRC} → ${response.status}`);
const topology = await response.json();

const arcs = decodeArcs(topology);

/* world-atlas wraps its land in a GeometryCollection of one MultiPolygon;
   unwrapping both shapes keeps the script working against either. */
const land = topology.objects.land;
const geometries = land.type === 'GeometryCollection' ? land.geometries : [land];
const polygons = geometries
  .flatMap((geometry) => (geometry.type === 'MultiPolygon' ? geometry.arcs : [geometry.arcs]))
  .map((polygon) => polygon.map((ring) => ringPoints(ring, arcs)));

const bitmap = rasterise(polygons);
stampOutlines(bitmap, polygons);

const filled = bitmap.reduce((sum, bit) => sum + bit, 0);
const bits = pack(bitmap);

const out = fileURLToPath(new URL('../assets/worldmap.js', import.meta.url));
writeFileSync(out, `/**
 * The world, one bit a pixel, ${W}x${H} equirectangular.
 *
 * Generated by \`scripts/make-worldmap.mjs\` from Natural Earth 50m land.
 * Do not edit by hand — rerun the script.
 *
 * \`bits\` is base64 of a row-major bitset, most significant bit first, so
 * pixel (x, y) is bit \`y * w + x\`. \`isLand()\` in \`location.js\` unpacks it.
 */
export const WORLD = {
  w: ${W},
  h: ${H},
  bits:
    '${bits}',
};
`);

console.log(`wrote ${out}`);
console.log(`  ${W}x${H}, ${filled} land pixels (${((filled / (W * H)) * 100).toFixed(1)}%), ${bits.length} chars base64`);
