/**
 * Nürburgring Nordschleife — centreline geometry and sector windows.
 *
 * This is not survey data. The control points below are drawn by eye and only
 * follow the real circuit's order of named corners: the climb out of the start
 * straight through Hatzenbach, the west flank up to Breidscheid, the run east
 * across Kesselchen to the Karussell and Hohe Acht, the descent down
 * Pflanzgarten, and the long Döttinger Höhe blast back to the line. Individual
 * corner shapes and the distances between them are approximations.
 *
 * They are authored in arbitrary units and then scaled so the finished
 * centreline totals LAP_LENGTH_METERS — the real lap's 20.832 km is the one
 * dimension that matches. The drawn road is also much wider than the real 8–9 m
 * asphalt: a true-width lap would be a hairline at the zoom levels a 20 km
 * circuit demands, so it is fattened for readability.
 */

export const TRACK_NAME = 'NÜRBURGRING NORDSCHLEIFE';
export const LAP_LENGTH_METERS = 20832;
export const ROAD_HALF_WIDTH = 40;
export const CORRIDOR_HALF_WIDTH = ROAD_HALF_WIDTH * 3.1;

const SEGMENT_STEPS = 14;

// [x east, y north, sector-boundary marker]
const CONTROL_POINTS = [
  [0, 0, 'START'],
  [30, 260],
  [20, 480],
  [-60, 660, 'HATZENBACH'],
  [-170, 745],
  [-120, 860],
  [-250, 950],
  [-190, 1075],
  [-320, 1165],
  [-280, 1290, 'HOCHEICHEN'],
  [-360, 1450],
  [-280, 1620],
  [-350, 1800],
  [-250, 1980],
  [-300, 2160, 'SCHWEDENKREUZ'],
  [-250, 2340],
  [-380, 2500],
  [-470, 2620],
  [-390, 2760, 'FUCHSROEHRE'],
  [-460, 2900],
  [-370, 3020],
  [-460, 3130],
  [-620, 3180],
  [-560, 3280],
  [-680, 3350, 'METZGESFELD'],
  [-620, 3480],
  [-730, 3570],
  [-660, 3690],
  [-780, 3780],
  [-700, 3880, 'WEHRSEIFEN'],
  [-820, 3960],
  [-720, 4060],
  [-560, 4090],
  [-380, 4040, 'EXMUEHLE'],
  [-230, 4110],
  [-60, 4090],
  [80, 4010, 'KESSELCHEN'],
  [260, 3980],
  [450, 3930],
  [640, 3900],
  [830, 3840],
  [1000, 3800, 'KLOSTERTAL'],
  [1080, 3690],
  [1120, 3570],
  [1230, 3510],
  [1350, 3540],
  [1420, 3630],
  [1400, 3730, 'HOHE_ACHT'],
  [1500, 3830],
  [1640, 3860],
  [1760, 3800],
  [1830, 3690],
  [1780, 3580],
  [1870, 3500, 'ESCHBACH'],
  [1960, 3390],
  [1930, 3260],
  [2030, 3160],
  [2130, 3060],
  [2100, 2930, 'EISKURVE'],
  [2200, 2830],
  [2330, 2760],
  [2420, 2650],
  [2520, 2530],
  [2470, 2410, 'SCHWALBENSCHWANZ'],
  [2570, 2320],
  [2640, 2200],
  [2760, 2140],
  [2900, 2080],
  [3040, 2000, 'DOETTINGER_I'],
  [2760, 1810],
  [2470, 1620],
  [2180, 1430, 'DOETTINGER_II'],
  [1890, 1240],
  [1600, 1050],
  [1330, 880, 'ANTONIUSBUCHE'],
  [1180, 760],
  [1000, 650],
  [820, 520],
  [640, 400, 'HOHENRAIN'],
  [470, 300],
  [380, 200],
  [300, 230],
  [230, 140],
  [150, 60],
];

/** Sector windows, in lap order. `from` is the control point each one opens on. */
const SECTOR_DEFS = [
  { from: 'START', name: 'START · T13', note: 'Grid · run to Hatzenbach' },
  { from: 'HATZENBACH', name: 'HATZENBACH', note: 'Hatzenbach esses' },
  { from: 'HOCHEICHEN', name: 'HOCHEICHEN', note: 'Hocheichen · Flugplatz' },
  { from: 'SCHWEDENKREUZ', name: 'SCHWEDENKREUZ', note: 'Schwedenkreuz · Aremberg' },
  { from: 'FUCHSROEHRE', name: 'FUCHSRÖHRE', note: 'Fuchsröhre · Adenauer Forst' },
  { from: 'METZGESFELD', name: 'METZGESFELD', note: 'Metzgesfeld · Kallenhard' },
  { from: 'WEHRSEIFEN', name: 'WEHRSEIFEN', note: 'Wehrseifen · Breidscheid' },
  { from: 'EXMUEHLE', name: 'BERGWERK', note: 'Ex-Mühle · Bergwerk' },
  { from: 'KESSELCHEN', name: 'KESSELCHEN', note: 'Kesselchen climb' },
  { from: 'KLOSTERTAL', name: 'KARUSSELL', note: 'Klostertal · Karussell' },
  { from: 'HOHE_ACHT', name: 'HOHE ACHT', note: 'Hohe Acht · Wippermann' },
  { from: 'ESCHBACH', name: 'BRÜNNCHEN', note: 'Eschbach · Brünnchen' },
  { from: 'EISKURVE', name: 'PFLANZGARTEN', note: 'Eiskurve · Pflanzgarten' },
  { from: 'SCHWALBENSCHWANZ', name: 'SCHWALBENSCHWANZ', note: 'Schwalbenschwanz · Galgenkopf' },
  { from: 'DOETTINGER_I', name: 'DÖTTINGER HÖHE', note: 'Döttinger Höhe — flat out' },
  { from: 'DOETTINGER_II', name: 'DÖTTINGER HÖHE', note: 'Döttinger Höhe — top end' },
  { from: 'ANTONIUSBUCHE', name: 'ANTONIUSBUCHE', note: 'Antoniusbuche · Tiergarten' },
  { from: 'HOHENRAIN', name: 'HOHENRAIN', note: 'Hohenrain chicane · finish' },
];

const catmullRom = (p0, p1, p2, p3, t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
};

/**
 * Sample the closed spline, rescale it to a 20.832 km lap, and resolve the
 * sector windows. Sample index `i * SEGMENT_STEPS` is control point `i`.
 */
export function buildTrack() {
  const count = CONTROL_POINTS.length;
  const samples = [];

  for (let index = 0; index < count; index += 1) {
    const p0 = CONTROL_POINTS[(index - 1 + count) % count];
    const p1 = CONTROL_POINTS[index];
    const p2 = CONTROL_POINTS[(index + 1) % count];
    const p3 = CONTROL_POINTS[(index + 2) % count];
    for (let step = 0; step < SEGMENT_STEPS; step += 1) {
      samples.push(catmullRom(p0, p1, p2, p3, step / SEGMENT_STEPS));
    }
  }
  samples.push(samples[0].slice());

  let rawLength = 0;
  for (let index = 1; index < samples.length; index += 1) {
    rawLength += Math.hypot(samples[index][0] - samples[index - 1][0], samples[index][1] - samples[index - 1][1]);
  }

  const scale = LAP_LENGTH_METERS / rawLength;
  const points = samples.map(([x, y]) => ({ x: x * scale, y: y * scale, distance: 0, angle: 0 }));

  for (let index = 1; index < points.length; index += 1) {
    points[index].distance = points[index - 1].distance
      + Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  for (let index = 0; index < points.length; index += 1) {
    const ahead = points[Math.min(points.length - 1, index + 1)];
    const behind = points[Math.max(0, index - 1)];
    points[index].angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x);
  }

  const markerIndex = new Map();
  CONTROL_POINTS.forEach((point, index) => {
    if (point[2]) markerIndex.set(point[2], index * SEGMENT_STEPS);
  });

  const sectors = SECTOR_DEFS.map((definition, order) => {
    const startSample = markerIndex.get(definition.from);
    const next = SECTOR_DEFS[order + 1];
    const endSample = next ? markerIndex.get(next.from) : points.length - 1;
    return {
      ...definition,
      order,
      startSample,
      endSample,
      startDistance: points[startSample].distance,
      endDistance: points[endSample].distance,
    };
  });

  return { points, length: points.at(-1).distance, sectors };
}

/**
 * Frame one sector: rotate it onto its own long axis so the driver always runs
 * roughly left-to-right, then zoom so the whole sector fits the canvas.
 */
export function fitSector(track, sector, viewWidth, viewHeight, options = {}) {
  const { padding = 46, minScale = 0.34, maxScale = 1.45 } = options;
  const slice = track.points.slice(sector.startSample, sector.endSample + 1);

  let meanX = 0;
  let meanY = 0;
  for (const point of slice) {
    meanX += point.x;
    meanY += point.y;
  }
  meanX /= slice.length;
  meanY /= slice.length;

  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const point of slice) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  }
  let angle = 0.5 * Math.atan2(2 * xy, xx - yy);

  // Orient the long axis along travel so the sector always reads left-to-right.
  const travelX = slice.at(-1).x - slice[0].x;
  const travelY = slice.at(-1).y - slice[0].y;
  if (Math.cos(angle) * travelX + Math.sin(angle) * travelY < 0) angle += Math.PI;

  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const point of slice) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    const u = dx * cos - dy * sin;
    const v = dx * sin + dy * cos;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  const margin = ROAD_HALF_WIDTH * 1.9;
  const spanU = (maxU - minU) + margin * 2;
  const spanV = (maxV - minV) + margin * 2;
  const scale = Math.max(minScale, Math.min(
    maxScale,
    Math.min((viewWidth - padding * 2) / spanU, (viewHeight - padding * 2) / spanV),
  ));

  const centreU = (minU + maxU) / 2;
  const centreV = (minV + maxV) / 2;

  return {
    angle,
    scale,
    // Rotate the local-space centre back into world space.
    x: meanX + centreU * Math.cos(angle) - centreV * Math.sin(angle),
    y: meanY + centreU * Math.sin(angle) + centreV * Math.cos(angle),
  };
}
