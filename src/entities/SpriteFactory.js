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

const CARL_W = 96;
const CARL_H = 128;
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
/* CARL — 96x128, facing right, feet at y=128. @johnrubio-inspired:    */
/* bearded jaw, heavy muscle, gauntlet arm thrown BACK (screen-left),  */
/* bare arm forward, flowing cape, heart boxers, spiked knees.         */
/* Poses: idle (stance) / run1 / run2 (stride + pump + cape wave).     */
/* ------------------------------------------------------------------ */

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
    g.fillStyle(C.wrap, 1);
    g.fillCircle(x, y, r + 1);
    g.fillStyle(C.brass, 1);
    g.fillCircle(x, y, r);
    if (!gauntlet.quiet) {
      g.fillStyle(C.brassHi, 1);
      g.fillCircle(x - 2, y - 2, r * 0.45);
      // spikes ring the outer edge
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6 + 0.4;
        const sx = x + Math.cos(a) * r;
        const sy = y + Math.sin(a) * r;
        g.fillTriangle(sx - 2, sy - 2, sx + 2, sy + 2, x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6));
      }
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

function drawCarl(g, outlineOnly, pose) {
  const C = comicPalette(outlineOnly);
  const run = pose === 'run1' ? 1 : pose === 'run2' ? -1 : 0;

  // ---- CAPE (behind everything, flows left; waves with stride) ----
  const capeLift = pose === 'run1' ? -8 : pose === 'run2' ? -3 : 4;
  const capePts = [
    [46, 36], [20, 38 + capeLift], [6, 58 + capeLift], [10, 84 + capeLift],
    [16, 78 + capeLift], [20, 90 + capeLift], [26, 82 + capeLift],
    [32, 92 + capeLift], [38, 82 + capeLift], [44, 62], [48, 48],
  ];
  poly(g, capePts, C.cape);
  if (!outlineOnly) {
    poly(g, [[20, 39 + capeLift], [8, 58 + capeLift], [11, 80 + capeLift], [17, 77 + capeLift], [18, 50 + capeLift]], C.capeDark);
    g.fillStyle(C.hairHi, 1);
    g.fillRect(40, 37, 5, 14);
    inkPoly(g, capePts, 3);
    inkLine(g, 30, 44 + capeLift, 24, 76 + capeLift, 1);
  }

  // ---- REAR ARM = GAUNTLET (thrown back like the reference lunge) ----
  // shoulder (46,48) -> elbow -> spiked fist.
  const gElbow = pose === 'idle' ? [28, 62] : run === 1 ? [24, 56] : [28, 60];
  const gFist = pose === 'idle' ? [24, 80] : run === 1 ? [8, 50] : [14, 56];
  drawCarlLimb(g, C, 46, 48, gElbow[0], gElbow[1], 16, !outlineOnly);
  drawCarlLimb(g, C, gElbow[0], gElbow[1], gFist[0], gFist[1], 13, false);
  // red wrap at the wrist, then the brass
  g.fillStyle(C.wrap, 1);
  g.fillCircle(gFist[0] + 3, gFist[1] - 2, 7);
  if (!outlineOnly) {
    g.lineStyle(2, INK, 1);
    g.strokeCircle(gFist[0] + 3, gFist[1] - 2, 7);
  }
  drawCarlFist(g, C, gFist[0], gFist[1], 12, outlineOnly ? { quiet: true } : true);

  // ---- LEGS (stride phases; feet end at y≈126) ----
  // Each leg: hip -> knee -> foot, then knee pad + bare foot.
  const legs = pose === 'idle'
    ? [{ hip: [50, 86], knee: [48, 104], foot: [48, 122] }, { hip: [66, 86], knee: [68, 104], foot: [68, 122] }]
    : run === 1
      ? [{ hip: [50, 86], knee: [32, 100], foot: [22, 118] }, { hip: [66, 86], knee: [80, 100], foot: [88, 120] }]
      : [{ hip: [50, 86], knee: [38, 102], foot: [34, 121] }, { hip: [66, 86], knee: [72, 98], foot: [60, 122] }];
  for (const leg of legs) {
    const [hx, hy] = leg.hip;
    const [kx, ky] = leg.knee;
    const [fx, fy] = leg.foot;
    drawCarlLimb(g, C, hx, hy, kx, ky, 17, !outlineOnly);
    drawCarlLimb(g, C, kx, ky, fx, fy - 4, 13, false);
    // spiked knee pad (brass, spikes forward) — sized for thick thighs
    g.fillStyle(C.brass, 1);
    g.fillRoundedRect(kx - 9, ky - 7, 19, 13, 4);
    if (!outlineOnly) {
      g.fillStyle(C.brassDark, 1);
      g.fillRect(kx - 9, ky + 2, 19, 4);
      g.fillStyle(C.brassHi, 1);
      g.fillRect(kx - 7, ky - 6, 5, 3);
      g.fillStyle(C.brass, 1);
      g.fillTriangle(kx + 10, ky - 5, kx + 17, ky - 1, kx + 10, ky + 3);
      g.fillTriangle(kx + 10, ky + 1, kx + 17, ky + 5, kx + 10, ky + 9);
      g.lineStyle(2, INK, 1);
      g.strokeRoundedRect(kx - 9, ky - 7, 19, 13, 4);
    }
    // bare foot: heel-to-toe ellipse + toe line, facing right
    g.fillStyle(C.skin, 1);
    g.fillEllipse(fx + 3, fy, 17, 8);
    if (!outlineOnly) {
      g.fillStyle(C.skinShadow, 1);
      g.fillEllipse(fx + 3, fy + 2, 15, 4);
      inkLine(g, fx + 7, fy - 1, fx + 11, fy - 1, 1);
      inkLine(g, fx + 7, fy + 2, fx + 11, fy + 2, 1);
      g.lineStyle(2, INK, 1);
      g.strokeEllipse(fx + 3, fy, 17, 8);
    }
  }

  // ---- BOXERS (white, red hearts, wider cut) ----
  g.fillStyle(C.boxer, 1);
  g.fillRoundedRect(40, 68, 38, 20, 4);
  if (!outlineOnly) {
    g.fillStyle(C.boxerShadow, 1);
    g.fillRect(40, 83, 38, 5);
    const hearts = [
      [47, 73], [55, 73], [63, 73], [71, 73],
      [51, 79], [59, 79], [67, 79],
    ];
    g.fillStyle(C.heart, 1);
    for (const [hx, hy] of hearts) {
      g.fillCircle(hx - 1.2, hy, 2);
      g.fillCircle(hx + 1.2, hy, 2);
      g.fillTriangle(hx - 2.8, hy + 1, hx + 2.8, hy + 1, hx, hy + 4.2);
    }
    inkLine(g, 40, 68, 78, 68, 2);
    inkLine(g, 40, 68, 40, 88, 2);
    inkLine(g, 78, 68, 78, 88, 2);
  }

  // ---- TORSO (heavy muscle: lats, pecs, 6-pack) ----
  g.fillStyle(C.skin, 1);
  g.fillRoundedRect(36, 38, 42, 34, 9);
  if (!outlineOnly) {
    g.fillStyle(C.skinShadow, 1);
    g.fillRoundedRect(70, 40, 8, 30, 4); // front lat shadow
    g.fillStyle(C.skinHi, 1);
    g.fillEllipse(44, 48, 11, 17); // cel light upper-left
    // pecs
    inkLine(g, 42, 52, 56, 52, 3);
    inkLine(g, 60, 51, 73, 53, 3);
    // abs: 3 rows + center line
    inkLine(g, 52, 60, 70, 60, 2);
    inkLine(g, 52, 65, 70, 65, 2);
    inkLine(g, 54, 70, 68, 70, 2);
    inkLine(g, 61, 58, 61, 70, 1);
    g.fillStyle(C.skinShadow, 1);
    g.fillCircle(61, 74, 1.5); // navel
    g.lineStyle(3, INK, 1);
    g.strokeRoundedRect(36, 38, 42, 34, 9);
  }

  // ---- FRONT ARM (bare, pumps with stride) ----
  const fSh = [70, 46];
  const fEl = pose === 'idle' ? [74, 62] : run === 1 ? [84, 54] : [78, 62];
  const fFi = pose === 'idle' ? [72, 72] : run === 1 ? [88, 62] : [68, 70];
  drawCarlLimb(g, C, fSh[0], fSh[1], fEl[0], fEl[1], 15, !outlineOnly);
  drawCarlLimb(g, C, fEl[0], fEl[1], fFi[0], fFi[1], 12, false);
  drawCarlFist(g, C, fFi[0], fFi[1], 8, outlineOnly ? 'bare-quiet' : false);

  // ---- NECK + TRAPS ----
  g.fillStyle(C.skinShadow, 1);
  g.fillRect(54, 30, 12, 10);
  g.fillStyle(C.skin, 1);
  poly(g, [[46, 42], [78, 42], [68, 30], [54, 30]], C.skin);
  if (!outlineOnly) {
    inkLine(g, 46, 42, 78, 42, 2);
  }

  // ---- HEAD (face + full BEARD jaw) ----
  g.fillStyle(C.skin, 1);
  g.fillRoundedRect(48, 6, 28, 26, 6);
  if (!outlineOnly) {
    // beard: full lower-face mass (the @johnrubio jaw)
    g.fillStyle(C.stubble, 1);
    g.fillRoundedRect(48, 22, 28, 10, 4);
    g.fillStyle(C.hairDark, 1);
    for (let bx = 50; bx <= 72; bx += 4) {
      g.fillRect(bx, 24, 2, 3);
      g.fillRect(bx + 1, 28, 2, 2);
    }
    // intense eyes under heavy brows
    g.fillStyle(C.eyeWhite, 1);
    g.fillRect(54, 13, 7, 5);
    g.fillRect(65, 13, 7, 5);
    g.fillStyle(INK, 1);
    g.fillRect(57, 14, 3, 4);
    g.fillRect(68, 14, 3, 4);
    inkLine(g, 52, 10, 61, 13, 3); // brow L, angry
    inkLine(g, 78, 10, 69, 13, 3); // brow R, angry
    inkLine(g, 58, 29, 70, 28, 2); // grim mouth under beard edge
    inkLine(g, 61, 19, 62, 21, 1); // nose nick
    // ear
    g.fillStyle(C.skin, 1);
    g.fillRect(74, 18, 5, 7);
    inkLine(g, 74, 18, 74, 25, 2);
    g.lineStyle(3, INK, 1);
    g.strokeRoundedRect(48, 6, 28, 26, 6);
  }

  // ---- HAIR (short red crop, spiked fringe, bounce per stride) ----
  const bounce = pose === 'idle' ? 0 : run === 1 ? -2 : 1;
  const hairPts = [
    [46, 14 + bounce], [44, 4 + bounce], [50, 0], [62, 0], [74, 1],
    [79, 5 + bounce], [76, 12 + bounce], [72, 6], [68, 12 + bounce],
    [63, 6], [58, 12 + bounce], [53, 6], [49, 13 + bounce],
  ];
  poly(g, hairPts, C.hair);
  if (!outlineOnly) {
    g.fillStyle(C.hairHi, 1);
    g.fillEllipse(60, 3, 20, 5);
    g.fillStyle(C.hairDark, 1);
    g.fillRect(46, 10 + bounce, 30, 4);
    inkPoly(g, hairPts, 2);
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

    // 96x128 canvas ≈ old 96x120 on screen at SCALE 1.0 — triple the pixels.
    const outline = scene.add.sprite(0, 0, TEXTURE_KEYS.carlOutline.idle);
    const color = scene.add.sprite(0, 0, TEXTURE_KEYS.carlColor.idle);

    const SCALE = 1.0;
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
