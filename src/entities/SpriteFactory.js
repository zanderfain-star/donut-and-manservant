import Phaser from 'phaser';

/*
 * SpriteFactory — BOLD CARTOON / COMIC PASS
 * ----------------------------------------
 * Cel-shaded, thick-ink Carl and Donut entities as Phaser Containers,
 * generated entirely from Graphics primitives (no image assets).
 *
 * Style rules (Dungeon Crawler Carl cover vibe):
 *   - Ink color #14101a everywhere, 2-3px internal strokes. The outer
 *     4px+ border comes from the outline-sprite-behind trick (outline
 *     texture = full silhouette in ink, scaled 1.08-1.10 behind color).
 *   - Flat punchy fills + one cel highlight blob + one shadow shape.
 *   - Must read at 96px on screen (1.5x scale).
 *
 * Reference art: @johnrubio fan art of Carl and Donut from
 * "Dungeon Crawler Carl" by Matt Dinniman.
 *
 * Each entity is a Phaser.Container that wraps:
 *   [0] outlineSprite  — the same silhouette painted in pure ink, scaled up
 *   [1] colorSprite    — the full-color cel-shaded art on top
 *
 * PUBLIC API (do not change — GameScene/MenuScene depend on it):
 *   static generate(scene)
 *   static createCarl(scene, x, y)  -> Container
 *   static createDonut(scene, x, y) -> Container
 * Container fields: .facing, .setFacing(dir), .playWalk(), .playIdle(),
 *   .colorSprite, .outlineSprite, (Donut also ._floatOffsetY)
 */

const CARL_W = 144;
const CARL_H = 192;
const DONUT_W = 64;
const DONUT_H = 64;

const CARL_POSES = ['idle', 'run1', 'run2'];

const TEXTURE_KEYS = {
  carlOutline: { idle: 'carl_outline_idle', run1: 'carl_outline_run1', run2: 'carl_outline_run2' },
  carlColor: { idle: 'carl_color_idle', run1: 'carl_color_run1', run2: 'carl_color_run2' },
  donutOutline: 'donut_outline',
  donutColor: 'donut_color',
};

const INK = 0x14101a;

const COLORS = {
  // CARL
  skin: 0xffb066,
  skinShadow: 0xd97a2e,
  skinHi: 0xffd9a0,
  hair: 0xe02020,
  hairDark: 0x7a1010,
  hairHi: 0xff7a50,
  stubble: 0x5a3020,
  eyeWhite: 0xffffff,
  boxer: 0xfff6e5,
  boxerShadow: 0xd8b890,
  heart: 0xe02040,
  brass: 0xf5b83d,
  brassDark: 0x9a6420,
  brassHi: 0xffe9a0,
  wrap: 0xe02020,
  wrapDark: 0x7a1010,
  cape: 0xe02020,
  capeDark: 0x7a1010,
  // DONUT — fluffy orange tabby Persian
  fur: 0xff9a2e,
  furDark: 0xc25a10,
  furLight: 0xffd9a0,
  cream: 0xfff0d0,
  iris: 0xb8ff20,
  irisBright: 0xe8ff80,
  pupil: 0x14101a,
  nose: 0xff5070,
  innerEar: 0xffa080,
  crown: 0xffd020,
  crownDark: 0x9a6420,
  crownHi: 0xfff080,
  gem: 0xff3060,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

// In outline mode every color resolves to INK so the silhouette matches
// the color pass geometry exactly.
function comicPalette(outlineOnly) {
  if (!outlineOnly) return COLORS;
  return new Proxy(COLORS, {
    get: () => INK,
  });
}

function poly(g, points, fill) {
  const v = points.map(([x, y]) => new Phaser.Math.Vector2(x, y));
  g.fillStyle(fill, 1);
  g.fillPoints(v, true);
}

function inkPoly(g, points, thickness = 2) {
  const v = points.map(([x, y]) => new Phaser.Math.Vector2(x, y));
  g.lineStyle(thickness, INK, 1);
  g.strokePoints(v, true);
}

function inkLine(g, x1, y1, x2, y2, thickness = 2) {
  g.lineStyle(thickness, INK, 1);
  g.lineBetween(x1, y1, x2, y2);
}

/* ------------------------------------------------------------------ */
/* CARL — 144x192, facing right, feet at y=192. @johnrubio-inspired:    */
/* bearded jaw, heavy VEINED muscle, gauntlet arm thrown BACK, bare arm */
/* forward, flowing scarf-cape, heart boxers, spiked knees, bare feet.  */
/* Poses: idle (stance) / run1 / run2 (stride + pump + cape wave).      */
/* ------------------------------------------------------------------ */

// Vein + muscle-line detail over a limb segment (detail pass only).
// NOTE: Phaser.GameObjects.Graphics has no quadraticCurveTo — veins are
// two straight segments via moveTo/lineTo (same API drawCarlLimb uses).
function drawCarlVeins(g, x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const sx = x1 + (mx - x1) * 0.4 - 3;
  const sy = y1 + (my - y1) * 0.4;
  g.lineStyle(2, INK, 0.85);
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(mx - 2, my - 4);
  g.lineTo(mx + 4, my + 2);
  g.strokePath();
  g.lineStyle(1, INK, 0.7);
  g.beginPath();
  g.moveTo(mx + 2, my + 2);
  g.lineTo(mx + 8, my + 8);
  g.lineTo(x2 - 4, y2 - 3);
  g.strokePath();
}

function drawCarl(g, outlineOnly, pose) {
  const C = comicPalette(outlineOnly);
  const run = pose === 'run1' ? 1 : pose === 'run2' ? -1 : 0;

  // ---- SCARF-CAPE (behind everything, flows left; waves with stride) ----
  const capeLift = pose === 'run1' ? -12 : pose === 'run2' ? -4 : 6;
  const capePts = [
    [69, 54], [30, 57 + capeLift], [9, 87 + capeLift], [15, 126 + capeLift],
    [24, 117 + capeLift], [30, 135 + capeLift], [39, 123 + capeLift],
    [48, 138 + capeLift], [57, 123 + capeLift], [66, 93], [72, 72],
  ];
  poly(g, capePts, C.cape);
  if (!outlineOnly) {
    poly(g, [[30, 58 + capeLift], [12, 87 + capeLift], [16, 120 + capeLift], [25, 115 + capeLift], [27, 75 + capeLift]], C.capeDark);
    g.fillStyle(C.hairHi, 1);
    g.fillRect(60, 55, 7, 21);
    inkPoly(g, capePts, 4);
    inkLine(g, 45, 66 + capeLift, 36, 114 + capeLift, 2);
    inkLine(g, 56, 62 + capeLift, 50, 108 + capeLift, 1);
    // tattered hem nicks
    inkLine(g, 15, 126 + capeLift, 24, 117 + capeLift, 2);
    inkLine(g, 30, 135 + capeLift, 39, 123 + capeLift, 2);
  }

  // ---- REAR ARM = GAUNTLET (thrown back like the reference lunge) ----
  // shoulder (69,72) -> elbow -> spiked fist.
  const gElbow = pose === 'idle' ? [42, 93] : run === 1 ? [36, 84] : [42, 90];
  // run1/run2 fists nudged in-bounds: spikes reach r+6=24 past center,
  // so center x must stay >= 24 (canvas is 0..143).
  const gFist = pose === 'idle' ? [36, 120] : run === 1 ? [26, 75] : [25, 84];
  drawCarlLimb(g, C, 69, 72, gElbow[0], gElbow[1], 24, !outlineOnly);
  drawCarlLimb(g, C, gElbow[0], gElbow[1], gFist[0], gFist[1], 20, false);
  if (!outlineOnly) {
    drawCarlVeins(g, 69, 72, gElbow[0], gElbow[1]);
    // deltoid cap lines
    inkLine(g, 62, 66, 76, 62, 2);
    inkLine(g, 60, 74, 74, 70, 1);
  }
  // red wrap at the wrist, then the brass
  g.fillStyle(C.wrap, 1);
  g.fillCircle(gFist[0] + 4, gFist[1] - 3, 10);
  if (!outlineOnly) {
    g.lineStyle(3, INK, 1);
    g.strokeCircle(gFist[0] + 4, gFist[1] - 3, 10);
    inkLine(g, gFist[0] - 3, gFist[1] - 8, gFist[0] + 10, gFist[1] - 6, 2);
  }
  drawCarlFist(g, C, gFist[0], gFist[1], 18, outlineOnly ? { quiet: true } : true);

  // ---- LEGS (stride phases; idle feet end at y≈191, sole on 192) ----
  // Each leg: hip -> knee -> foot, then knee pad + bare foot with toes.
  // run1 back foot kept at fx<=124: toe ellipse (cx=fx+4, rx=13) must end <=143.
  const legs = pose === 'idle'
    ? [{ hip: [75, 129], knee: [72, 156], foot: [72, 185] }, { hip: [99, 129], knee: [102, 156], foot: [102, 185] }]
    : run === 1
      ? [{ hip: [75, 129], knee: [48, 150], foot: [33, 177] }, { hip: [99, 129], knee: [120, 150], foot: [124, 180] }]
      : [{ hip: [75, 129], knee: [57, 153], foot: [51, 182] }, { hip: [99, 129], knee: [108, 147], foot: [90, 183] }];
  for (const leg of legs) {
    const [hx, hy] = leg.hip;
    const [kx, ky] = leg.knee;
    const [fx, fy] = leg.foot;
    drawCarlLimb(g, C, hx, hy, kx, ky, 26, !outlineOnly);
    drawCarlLimb(g, C, kx, ky, fx, fy - 6, 20, false);
    if (!outlineOnly) {
      drawCarlVeins(g, hx, hy, kx, ky);
      // quad sweep + calf diamond
      inkLine(g, hx - 8, hy + 12, kx - 6, ky - 8, 2);
      inkLine(g, kx + 2, ky + 8, fx + 1, fy - 12, 1);
    }
    // spiked knee pad (brass, spikes forward — silhouette, so spikes are
    // drawn in BOTH passes; the ink halo must cover the spike tips).
    // Spike reach kx+22 keeps even the widest stance (kx=120) in-canvas.
    g.fillStyle(C.brass, 1);
    g.fillRoundedRect(kx - 14, ky - 11, 29, 20, 6);
    g.fillTriangle(kx + 15, ky - 8, kx + 22, ky - 2, kx + 15, ky + 4);
    g.fillTriangle(kx + 15, ky + 0, kx + 22, ky + 6, kx + 15, ky + 12);
    g.fillTriangle(kx + 15, ky - 2, kx + 22, ky + 1, kx + 15, ky + 4);
    if (!outlineOnly) {
      g.fillStyle(C.brassDark, 1);
      g.fillRect(kx - 14, ky + 3, 29, 6);
      g.fillStyle(C.brassHi, 1);
      g.fillRect(kx - 11, ky - 9, 8, 5);
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(kx - 14, ky - 11, 29, 20, 6);
    }
    // bare foot: heel-to-toe + 3 toes, facing right
    g.fillStyle(C.skin, 1);
    g.fillEllipse(fx + 4, fy, 26, 12);
    if (!outlineOnly) {
      g.fillStyle(C.skinShadow, 1);
      g.fillEllipse(fx + 4, fy + 3, 23, 6);
      g.fillStyle(C.skinHi, 1);
      g.fillEllipse(fx - 2, fy - 3, 10, 5);
      inkLine(g, fx + 10, fy - 2, fx + 16, fy - 2, 2);
      inkLine(g, fx + 10, fy + 2, fx + 16, fy + 2, 2);
      inkLine(g, fx + 4, fy + 5, fx + 12, fy + 5, 1);
      g.lineStyle(3, INK, 1);
      g.strokeEllipse(fx + 4, fy, 26, 12);
    }
  }

  // ---- BOXERS (white, red hearts, longer shorts cut + waistband) ----
  g.fillStyle(C.boxer, 1);
  g.fillRoundedRect(60, 102, 57, 30, 6);
  if (!outlineOnly) {
    g.fillStyle(C.boxerShadow, 1);
    g.fillRect(60, 124, 57, 8);
    // waistband
    g.fillStyle(C.heart, 1);
    g.fillRect(60, 102, 57, 7);
    g.fillStyle(C.boxer, 1);
    for (let wx = 64; wx < 114; wx += 8) g.fillRect(wx, 103, 4, 5);
    const hearts = [
      [70, 115], [80, 114], [90, 114], [100, 115], [109, 116],
      [75, 122], [85, 122], [95, 122], [105, 123],
    ];
    g.fillStyle(C.heart, 1);
    for (const [hx, hy] of hearts) {
      g.fillCircle(hx - 1.8, hy, 3);
      g.fillCircle(hx + 1.8, hy, 3);
      g.fillTriangle(hx - 4.2, hy + 1.5, hx + 4.2, hy + 1.5, hx, hy + 6.2);
    }
    inkLine(g, 60, 102, 117, 102, 3);
    inkLine(g, 60, 102, 60, 132, 3);
    inkLine(g, 117, 102, 117, 132, 3);
    inkLine(g, 60, 109, 117, 109, 1);
  }

  // ---- TORSO (heavy muscle: lats, pecs, 6-pack, obliques) ----
  g.fillStyle(C.skin, 1);
  g.fillRoundedRect(54, 57, 63, 51, 13);
  if (!outlineOnly) {
    g.fillStyle(C.skinShadow, 1);
    g.fillRoundedRect(105, 60, 12, 45, 6); // front lat shadow
    g.fillStyle(C.skinHi, 1);
    g.fillEllipse(66, 72, 16, 26); // cel light upper-left
    // pecs with lower curves
    inkLine(g, 63, 78, 84, 78, 4);
    inkLine(g, 90, 77, 110, 80, 4);
    inkLine(g, 66, 82, 82, 84, 1);
    inkLine(g, 92, 82, 108, 84, 1);
    // abs: 3 rows + center line + obliques
    inkLine(g, 78, 90, 105, 90, 3);
    inkLine(g, 78, 97, 105, 97, 3);
    inkLine(g, 81, 104, 102, 104, 2);
    inkLine(g, 91, 86, 91, 104, 2);
    inkLine(g, 74, 92, 78, 102, 1);
    inkLine(g, 109, 92, 105, 102, 1);
    g.fillStyle(C.skinShadow, 1);
    g.fillCircle(91, 107, 2); // navel
    g.lineStyle(4, INK, 1);
    g.strokeRoundedRect(54, 57, 63, 51, 13);
  }

  // ---- FRONT ARM (bare, veined, pumps with stride) ----
  // run1 fist kept at x<=130: knuckle r12 + stroke must end <=143.
  const fSh = [105, 69];
  const fEl = pose === 'idle' ? [111, 93] : run === 1 ? [126, 81] : [117, 93];
  const fFi = pose === 'idle' ? [108, 108] : run === 1 ? [130, 93] : [102, 105];
  drawCarlLimb(g, C, fSh[0], fSh[1], fEl[0], fEl[1], 22, !outlineOnly);
  drawCarlLimb(g, C, fEl[0], fEl[1], fFi[0], fFi[1], 18, false);
  if (!outlineOnly) {
    drawCarlVeins(g, fSh[0], fSh[1], fEl[0], fEl[1]);
    drawCarlVeins(g, fEl[0], fEl[1], fFi[0], fFi[1]);
    inkLine(g, 99, 62, 112, 58, 2); // front delt cap
  }
  drawCarlFist(g, C, fFi[0], fFi[1], 12, outlineOnly ? 'bare-quiet' : false);

  // ---- NECK + TRAPS ----
  g.fillStyle(C.skinShadow, 1);
  g.fillRect(81, 45, 18, 15);
  g.fillStyle(C.skin, 1);
  poly(g, [[69, 63], [117, 63], [102, 45], [81, 45]], C.skin);
  if (!outlineOnly) {
    inkLine(g, 69, 63, 117, 63, 3);
    inkLine(g, 78, 50, 72, 60, 1); // trap striations
    inkLine(g, 108, 50, 112, 60, 1);
  }

  // ---- HEAD (face + full BEARD jaw, centered over torso: x64-106) ----
  g.fillStyle(C.skin, 1);
  g.fillRoundedRect(64, 9, 42, 39, 9);
  if (!outlineOnly) {
    // beard: full lower-face mass (the @johnrubio jaw)
    g.fillStyle(C.stubble, 1);
    g.fillRoundedRect(64, 33, 42, 15, 6);
    g.fillStyle(C.hairDark, 1);
    for (let bx = 67; bx <= 100; bx += 5) {
      g.fillRect(bx, 36, 3, 4);
      g.fillRect(bx + 2, 42, 3, 3);
    }
    g.fillStyle(C.skinHi, 1);
    g.fillEllipse(72, 16, 10, 12); // cheek light
    // intense eyes under heavy brows
    g.fillStyle(C.eyeWhite, 1);
    g.fillRect(73, 20, 10, 7);
    g.fillRect(90, 20, 10, 7);
    g.fillStyle(INK, 1);
    g.fillRect(77, 21, 4, 6);
    g.fillRect(94, 21, 4, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(78, 22, 1.2);
    g.fillCircle(95, 22, 1.2);
    inkLine(g, 70, 15, 84, 19, 4); // brow L, angry
    inkLine(g, 110, 15, 96, 19, 4); // brow R, angry
    // nose: bridge + nostril
    inkLine(g, 86, 24, 85, 31, 2);
    inkLine(g, 85, 31, 89, 32, 2);
    // grim mouth under beard edge
    inkLine(g, 79, 44, 98, 43, 3);
    inkLine(g, 83, 46, 93, 46, 1);
    // ear with inner ridge
    g.fillStyle(C.skin, 1);
    g.fillRect(103, 27, 7, 10);
    g.fillStyle(C.skinShadow, 1);
    g.fillRect(106, 29, 3, 6);
    inkLine(g, 103, 27, 103, 37, 3);
    g.lineStyle(4, INK, 1);
    g.strokeRoundedRect(64, 9, 42, 39, 9);
  }

  // ---- HAIR (short red crop, spiked fringe, bounce per stride) ----
  // Whole mass sits 2px below the canvas top so the silhouette + ink halo
  // are never clipped (valid canvas rows are 0..191).
  const bounce = pose === 'idle' ? 0 : run === 1 ? -3 : 2;
  const hairPts = [
    [61, 23 + bounce], [58, 8 + bounce], [67, 2], [85, 2], [103, 3],
    [111, 9 + bounce], [106, 20 + bounce], [100, 11], [94, 20 + bounce],
    [87, 11], [79, 20 + bounce], [71, 11], [65, 21 + bounce],
  ];
  poly(g, hairPts, C.hair);
  if (!outlineOnly) {
    g.fillStyle(C.hairHi, 1);
    g.fillEllipse(82, 6, 30, 8);
    g.fillStyle(C.hairDark, 1);
    g.fillRect(61, 17 + bounce, 45, 6);
    // strand separations
    inkLine(g, 74, 4, 70, 17 + bounce, 1);
    inkLine(g, 88, 3, 86, 17 + bounce, 1);
    inkLine(g, 100, 4, 100, 17 + bounce, 1);
    inkPoly(g, hairPts, 3);
  }
}

function drawCarlLimb(g, C, x1, y1, x2, y2, w, detail) {
  // Thick limb segment with rounded joints (upper arm / forearm / thigh).
  // Outlined on BOTH edges so limbs separate from the torso mass.
  g.fillStyle(C.skin, 1);
  g.lineStyle(w, C.skin, 1);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokePath();
  g.fillStyle(C.skin, 1);
  g.fillCircle(x1, y1, w / 2);
  g.fillCircle(x2, y2, w / 2);
  // ink both flanks (perpendicular offsets)
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = (-dy / len) * (w / 2 - 1);
  const ny = (dx / len) * (w / 2 - 1);
  g.lineStyle(2, INK, 1);
  g.beginPath();
  g.moveTo(x1 + nx, y1 + ny);
  g.lineTo(x2 + nx, y2 + ny);
  g.strokePath();
  g.beginPath();
  g.moveTo(x1 - nx, y1 - ny);
  g.lineTo(x2 - nx, y2 - ny);
  g.strokePath();
  if (!detail) return;
  g.fillStyle(C.skinShadow, 1);
  g.lineStyle(2, C.skinShadow, 1);
  g.beginPath();
  g.moveTo(x1 - 2, y1);
  g.lineTo(x2 - 2, y2);
  g.strokePath();
  g.fillStyle(C.skinHi, 1);
  g.fillCircle((x1 + x2) / 2 - 2, (y1 + y2) / 2 - 2, 2);
}

function drawCarlFist(g, C, x, y, r, gauntlet) {
  if (gauntlet) {
    // Brass spiked fist + red wrist wrap (rear arm).
    // Spikes are silhouette: drawn in the outline pass too (in INK there)
    // so the halo covers the spike tips; only hi-light + ink ring are gated.
    g.fillStyle(C.wrap, 1);
    g.fillCircle(x, y, r + 1);
    g.fillStyle(C.brass, 1);
    g.fillCircle(x, y, r);
    g.fillStyle(C.brass, 1);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + 0.4;
      const sx = x + Math.cos(a) * r;
      const sy = y + Math.sin(a) * r;
      g.fillTriangle(sx - 2, sy - 2, sx + 2, sy + 2, x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6));
    }
    if (!gauntlet.quiet) {
      g.fillStyle(C.brassHi, 1);
      g.fillCircle(x - 2, y - 2, r * 0.45);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(x, y, r);
    }
  } else {
    // Bare knuckles.
    g.fillStyle(C.skin, 1);
    g.fillCircle(x, y, r);
    if (gauntlet !== 'bare-quiet') {
      g.fillStyle(C.skinHi, 1);
      g.fillCircle(x - 1.5, y - 1.5, r * 0.4);
      inkLine(g, x - r + 1, y + 1, x + r - 1, y + 1, 2);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(x, y, r);
    }
  }
}


/* ------------------------------------------------------------------ */
/* DONUT — 64x64 fluffy orange tabby Persian, facing right              */
/* ------------------------------------------------------------------ */

function drawDonut(g, outlineOnly) {
  const C = comicPalette(outlineOnly);

  // ---- TAIL (right side) ----
  g.fillStyle(C.fur, 1);
  g.fillEllipse(50, 46, 17, 11);
  if (!outlineOnly) {
    g.fillStyle(C.furDark, 1);
    g.fillRect(52, 42, 3, 9);
    g.fillRect(57, 43, 3, 8);
    g.fillStyle(C.furLight, 1);
    g.fillEllipse(46, 43, 6, 4);
    g.lineStyle(3, INK, 1);
    g.strokeEllipse(50, 46, 17, 11);
  }

  // ---- BODY FLOOF tufts (silhouette puff balls) ----
  const tufts = [
    [13, 36, 5], [14, 46, 5], [22, 53, 5], [31, 55, 5],
    [40, 53, 5], [47, 47, 5],
  ];
  for (const [tx, ty, tr] of tufts) {
    g.fillStyle(C.fur, 1);
    g.fillCircle(tx, ty, tr);
    if (!outlineOnly) {
      g.lineStyle(2, INK, 1);
      g.strokeCircle(tx, ty, tr);
    }
  }

  // ---- BODY ----
  g.fillStyle(C.fur, 1);
  g.fillCircle(30, 40, 15);
  if (!outlineOnly) {
    // cream belly
    g.fillStyle(C.cream, 1);
    g.fillEllipse(31, 46, 17, 11);
    // tabby stripes on flanks
    g.fillStyle(C.furDark, 1);
    g.fillRect(17, 36, 4, 3);
    g.fillRect(17, 41, 4, 3);
    g.fillRect(40, 50, 4, 3);
    // cel highlight blob
    g.fillStyle(C.furLight, 1);
    g.fillEllipse(24, 33, 9, 6);
    g.lineStyle(3, INK, 1);
    g.strokeCircle(30, 40, 15);
  }

  // ---- PAWS ----
  g.fillStyle(C.cream, 1);
  g.fillEllipse(24, 53, 10, 6);
  g.fillEllipse(37, 53, 10, 6);
  if (!outlineOnly) {
    inkLine(g, 22, 53, 26, 53, 1);
    inkLine(g, 35, 53, 39, 53, 1);
    g.lineStyle(2, INK, 1);
    g.strokeEllipse(24, 53, 10, 6);
    g.strokeEllipse(37, 53, 10, 6);
  }

  // ---- EARS ----
  const earL = [[15, 16], [19, 4], [26, 13]];
  const earR = [[36, 13], [43, 4], [47, 16]];
  poly(g, earL, C.fur);
  poly(g, earR, C.fur);
  if (!outlineOnly) {
    poly(g, [[18, 13], [20, 7], [23, 12]], C.innerEar);
    poly(g, [[39, 12], [42, 7], [44, 13]], C.innerEar);
    inkPoly(g, earL, 2);
    inkPoly(g, earR, 2);
  }

  // ---- HEAD ----
  g.fillStyle(C.fur, 1);
  g.fillCircle(31, 27, 16);
  if (!outlineOnly) {
    // forehead tabby stripes
    g.fillStyle(C.furDark, 1);
    g.fillRect(25, 13, 3, 5);
    g.fillRect(30, 12, 3, 6);
    g.fillRect(35, 13, 3, 5);
    // cheek fluff
    g.fillStyle(C.fur, 1);
    g.fillCircle(16, 30, 4);
    g.fillCircle(46, 30, 4);
    g.lineStyle(2, INK, 1);
    g.strokeCircle(16, 30, 4);
    g.strokeCircle(46, 30, 4);
  }

  // ---- CREAM FACE DISC (Persian flat face) ----
  g.fillStyle(C.cream, 1);
  g.fillCircle(31, 30, 11);
  if (!outlineOnly) {
    g.fillStyle(C.furLight, 1);
    g.fillEllipse(27, 26, 8, 5);
  }

  // ---- EYES (big yellow-green, slit pupils, glint) ----
  for (const ex of [25, 38]) {
    g.fillStyle(C.iris, 1);
    g.fillCircle(ex, 28, 6.5);
  }
  if (!outlineOnly) {
    for (const ex of [25, 38]) {
      g.fillStyle(C.irisBright, 1);
      g.fillCircle(ex - 1, 26, 3);
      // slit pupil
      g.fillStyle(C.pupil, 1);
      g.fillEllipse(ex, 28, 2.5, 6);
      // glint
      g.fillStyle(0xffffff, 1);
      g.fillCircle(ex - 2.5, 25, 1.6);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(ex, 28, 6.5);
    }
  }

  // ---- NOSE + MOUTH + WHISKERS ----
  g.fillStyle(C.nose, 1);
  g.fillTriangle(28, 34, 34, 34, 31, 37);
  if (!outlineOnly) {
    inkLine(g, 31, 37, 31, 39, 1);
    inkLine(g, 31, 39, 28, 40, 1);
    inkLine(g, 31, 39, 34, 40, 1);
    inkLine(g, 14, 32, 22, 34, 1);
    inkLine(g, 14, 37, 22, 36, 1);
    inkLine(g, 40, 34, 48, 32, 1);
    inkLine(g, 40, 36, 48, 37, 1);
  }

  // ---- HEAD INK RING ----
  if (!outlineOnly) {
    g.lineStyle(3, INK, 1);
    g.strokeCircle(31, 27, 16);
  }

  // ---- CROWN (gold, 3 spikes, pink gem) ----
  const crownPts = [
    [23, 14], [23, 6], [26, 10], [29, 4],
    [32, 10], [35, 6], [35, 14],
  ];
  poly(g, crownPts, C.crown);
  if (!outlineOnly) {
    g.fillStyle(C.crownHi, 1);
    g.fillRect(24, 11, 10, 2);
    g.fillStyle(C.crownDark, 1);
    g.fillRect(23, 12, 12, 2);
    // ball tips
    g.fillStyle(C.crownHi, 1);
    g.fillCircle(23, 6, 1.8);
    g.fillCircle(29, 4, 1.8);
    g.fillCircle(35, 6, 1.8);
    // gem
    g.fillStyle(C.gem, 1);
    g.fillCircle(29, 11, 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(28.4, 10.4, 0.8);
    inkPoly(g, crownPts, 2);
  }
}

/* ------------------------------------------------------------------ */
/* SpriteFactory                                                        */
/* ------------------------------------------------------------------ */

export class SpriteFactory {
  static generate(scene) {
    if (!scene || !scene.textures) return;
    const tm = scene.textures;

    for (const pose of CARL_POSES) {
      if (!tm.exists(TEXTURE_KEYS.carlOutline[pose])) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        drawCarl(g, true, pose);
        g.generateTexture(TEXTURE_KEYS.carlOutline[pose], CARL_W, CARL_H);
        g.destroy();
      }
      if (!tm.exists(TEXTURE_KEYS.carlColor[pose])) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        drawCarl(g, false, pose);
        g.generateTexture(TEXTURE_KEYS.carlColor[pose], CARL_W, CARL_H);
        g.destroy();
      }
    }

    if (!tm.exists(TEXTURE_KEYS.donutOutline)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      drawDonut(g, true);
      g.generateTexture(TEXTURE_KEYS.donutOutline, DONUT_W, DONUT_H);
      g.destroy();
    }
    if (!tm.exists(TEXTURE_KEYS.donutColor)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      drawDonut(g, false);
      g.generateTexture(TEXTURE_KEYS.donutColor, DONUT_W, DONUT_H);
      g.destroy();
    }
  }

  static createCarl(scene, x, y) {
    SpriteFactory.generate(scene);

    // 144x192 canvas at SCALE 0.7 ≈ 100x134 on screen — triple the pixels
    // of the old sprite at the same footprint: finer curves, no blocks.
    const outline = scene.add.sprite(0, 0, TEXTURE_KEYS.carlOutline.idle);
    const color = scene.add.sprite(0, 0, TEXTURE_KEYS.carlColor.idle);

    const SCALE = 0.7;
    outline.setScale(SCALE * 1.08);
    color.setScale(SCALE * 1.0);
    outline.setOrigin(0.5, 1.0);
    color.setOrigin(0.5, 1.0);

    const container = scene.add.container(x, y, [outline, color]);
    container.setSize(CARL_W * SCALE, CARL_H * SCALE);
    container._originX = 0.5;
    container._originY = 1.0;
    container._scale = SCALE;

    container.outlineSprite = outline;
    container.colorSprite = color;
    container.facing = 1;
    container._baseY = y;
    container._runFrame = 0;

    const outlineBaseX = outline.scaleX;
    const outlineBaseY = outline.scaleY;
    container._idleTween = scene.tweens.add({
      targets: [outline],
      scaleX: { from: outlineBaseX, to: outlineBaseX * 1.02 },
      scaleY: { from: outlineBaseY, to: outlineBaseY * 1.02 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: false,
    });

    container._setPose = function (pose) {
      outline.setTexture(TEXTURE_KEYS.carlOutline[pose]);
      color.setTexture(TEXTURE_KEYS.carlColor[pose]);
    };

    container.playWalk = function () {
      if (container._runTimer) return;
      container._idleTween.pause();
      outline.setScale(outlineBaseX, outlineBaseY);
      color.setScale(SCALE, SCALE);
      // Real stride cycle: alternate the two run frames.
      container._runFrame = 0;
      container._runTimer = scene.time.addEvent({
        delay: 130,
        loop: true,
        callback: () => {
          container._runFrame = 1 - container._runFrame;
          container._setPose(container._runFrame === 0 ? 'run1' : 'run2');
        },
      });
    };

    container.playIdle = function () {
      if (container._runTimer) {
        container._runTimer.remove(false);
        container._runTimer = null;
        container._setPose('idle');
        outline.setScale(outlineBaseX, outlineBaseY);
        color.setScale(SCALE, SCALE);
      }
      container._idleTween.resume();
    };

    container.setFacing = function (dir) {
      container.facing = dir >= 0 ? 1 : -1;
      outline.setFlipX(container.facing < 0);
      color.setFlipX(container.facing < 0);
    };

    container.destroy = (function (origDestroy) {
      return function () {
        if (container._runTimer) container._runTimer.remove(false);
        if (container._idleTween) container._idleTween.stop();
        origDestroy.call(container);
      };
    })(container.destroy);

    return container;
  }

  static createDonut(scene, x, y) {
    SpriteFactory.generate(scene);

    const outline = scene.add.sprite(0, 0, TEXTURE_KEYS.donutOutline);
    const color = scene.add.sprite(0, 0, TEXTURE_KEYS.donutColor);

    // Donut runs SMALLER than Carl (cat vs man, 80px vs 96-120px) so the
    // pair reads as two characters instead of one fused cat-man blob.
    const SCALE = 1.25;
    const donutOutlineX = SCALE * 1.10;
    const donutOutlineY = SCALE * 1.10;
    outline.setScale(donutOutlineX, donutOutlineY);
    color.setScale(SCALE, SCALE);
    outline.setOrigin(0.5, 0.5);
    color.setOrigin(0.5, 0.5);

    const container = scene.add.container(x, y, [outline, color]);
    container.setSize(64 * SCALE, 64 * SCALE);
    container._originX = 0.5;
    container._originY = 0.5;
    container._scale = SCALE;

    container.outlineSprite = outline;
    container.colorSprite = color;
    container.facing = 1;
    container._baseY = y;
    container._floatOffsetY = 0;

    container._eyeTween = scene.tweens.add({
      targets: color,
      tint: { from: 0xffffff, to: 0xffe080 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    container._floatTween = scene.tweens.addCounter({
      from: -2,
      to: 0,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        container._floatOffsetY = tween.getValue();
      },
    });

    container.playWalk = function () {
      if (container._flutterTween) return;
      outline.setScale(donutOutlineX, donutOutlineY);
      color.setScale(SCALE, SCALE);
      container._flutterTween = scene.tweens.add({
        targets: [outline],
        scaleX: { from: donutOutlineX, to: donutOutlineX * 1.08 },
        scaleY: { from: donutOutlineY, to: donutOutlineY * 1.05 },
        duration: 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    };

    container.playIdle = function () {
      if (container._flutterTween) {
        container._flutterTween.stop();
        container._flutterTween = null;
        outline.setScale(donutOutlineX, donutOutlineY);
        color.setScale(SCALE, SCALE);
      }
    };

    container.setFacing = function (dir) {
      container.facing = dir >= 0 ? 1 : -1;
      outline.setFlipX(container.facing < 0);
      color.setFlipX(container.facing < 0);
    };

    container.destroy = (function (origDestroy) {
      return function () {
        if (container._flutterTween) container._flutterTween.stop();
        if (container._eyeTween) container._eyeTween.stop();
        if (container._floatTween) container._floatTween.stop();
        origDestroy.call(container);
      };
    })(container.destroy);

    return container;
  }
}

export default SpriteFactory;
