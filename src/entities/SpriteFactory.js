import Phaser from 'phaser';

/*
 * SpriteFactory
 * --------------
 * Builds cel-shaded, ink-outlined Carl and Donut entities as Phaser
 * Containers, generated entirely from Graphics primitives (no image assets).
 *
 * Each entity is a Phaser.Container that wraps:
 *   [0] outlineSprite  — the same silhouette painted in pure black, scaled 1.08
 *   [1] colorSprite    — the full-color cel-shaded art on top
 *
 * The "outline behind, color in front" trick gives bold ink lines without
 * needing per-frame vector outlines. Real pixel-art can later swap in by
 * replacing the two textures; the public API stays identical.
 */

const TEXTURE_KEYS = {
  carlOutline: 'carl_outline',
  carlColor: 'carl_color',
  donutOutline: 'donut_outline',
  donutColor: 'donut_color',
};

const COLORS = {
  // Carl from Dungeon Crawler Carl — bare-chested, white boxers with red
  // hearts, only the LEFT sleeve of his jacket remains, plus spiky knee pads.
  // He's a chaos agent, not a hazmat worker. Make him WHITE+RED so he pops
  // like a beacon against the dark floor.
  carlSkin: 0xffd0a0,         // bright peachy skin tone
  carlSkinShadow: 0xd09060,
  carlSkinHighlight: 0xffe8c0,
  carlBoxer: 0xffffff,        // PURE WHITE boxers
  carlBoxerShadow: 0xe0e0e0,
  carlHeart: 0xff0030,        // ULTRA bright red hearts
  carlHeartShadow: 0xa00010,
  carlJacket: 0x8a5a30,       // brighter brown leather jacket
  carlJacketDark: 0x5a3a20,
  carlKneePad: 0xff8000,      // bright orange knee pads
  carlKneeSpike: 0xffff60,    // bright yellow spikes
  carlKneePadDark: 0xc04000,
  // Donut — fluffy pink cat, mostly pink
  donutFur: 0xff4f8b,
  donutFurShadow: 0xc42866,
  donutFurHighlight: 0xffb3cf,
  donutSclera: 0xffffff,
  donutIris: 0x6effff,
  donutPupil: 0x101020,
  donutCheek: 0xff7aa8,
  // Outline / ink
  ink: 0x080808,
};

/* ------------------------------------------------------------------ */
/* Texture generation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Draw the Carl silhouette paths. Used twice: once in black (outline),
 * once in full cel-shaded color. All paths are anchored at (0,0) and
 * fit within the 48x64 frame.
 */
function drawCarlPaths(g, opts) {
  const c = opts.colors;
  const skin = c.carlSkin;
  const skinShadow = c.carlSkinShadow;
  const skinHighlight = c.carlSkinHighlight;
  const boxer = c.carlBoxer;
  const boxerShadow = c.carlBoxerShadow;
  const heart = c.carlHeart;
  const heartShadow = c.carlHeartShadow;
  const jacket = c.carlJacket;
  const jacketDark = c.carlJacketDark;
  const kneePad = c.carlKneePad;
  const kneeSpike = c.carlKneeSpike;
  const kneePadDark = c.carlKneePadDark;
  const ink = c.ink;
  const outlineOnly = !!opts.outlineOnly;

  const fill = (color, alpha = 1) => g.fillStyle(color, alpha);

  // ----- HEAD (bare, with beard stubble) -----
  // Round head shape
  fill(outlineOnly ? ink : skin);
  g.fillCircle(24, 11, 8);

  // Face shading (right side darker)
  if (!outlineOnly) {
    fill(skinShadow, 0.7);
    g.fillCircle(28, 12, 5);
  }

  // Eyes — small dark dots, intense stare
  if (!outlineOnly) {
    fill(ink, 1);
    g.fillRect(20, 9, 2, 2);
    g.fillRect(26, 9, 2, 2);
  }

  // Mouth (smirk)
  if (!outlineOnly) {
    fill(ink, 1);
    g.fillRect(22, 14, 4, 1);
  }

  // ----- NECK + BARELY-THERE JACKET LEFT SLEEVE -----
  // Neck (skin)
  fill(outlineOnly ? ink : skin);
  g.fillRect(20, 17, 8, 4);

  // JACKET: only the LEFT sleeve + a torn lapel piece on the left shoulder.
  // The right side of his torso is BARE — you can see his skin, boxers, and
  // bare chest.
  if (!outlineOnly) {
    // Left shoulder lapel (torn, hanging)
    fill(jacket, 1);
    g.fillTriangle(8, 22, 18, 22, 14, 30);
    fill(jacketDark, 1);
    g.fillTriangle(8, 22, 12, 22, 10, 28);

    // Left sleeve hanging down — torn at the end
    fill(jacket, 1);
    g.fillRect(2, 22, 6, 16);
    fill(jacketDark, 1);
    g.fillRect(2, 22, 2, 16); // shadow on left edge

    // Torn sleeve frays at the bottom
    fill(jacketDark, 1);
    g.fillTriangle(2, 38, 4, 42, 6, 38);
    g.fillTriangle(4, 38, 6, 41, 8, 38);
  }
  if (outlineOnly) {
    // Outline pass: include the sleeve silhouette
    g.fillRect(2, 22, 6, 16);
  }

  // ----- BARE CHEST (right side, since jacket only covers left) -----
  // Right side shows skin all the way down
  if (!outlineOnly) {
    fill(skin, 1);
    g.fillRect(30, 22, 12, 22);
    fill(skinShadow, 0.6);
    g.fillRect(36, 24, 6, 18);
  }

  // Belly suggestion — a subtle midline
  if (!outlineOnly) {
    fill(skinShadow, 0.4);
    g.fillRect(23, 26, 2, 16);
  }

  // ----- BOXERS (white with red hearts) -----
  fill(outlineOnly ? ink : boxer);
  g.fillRect(14, 38, 20, 8);
  if (!outlineOnly) {
    // Shading
    fill(boxerShadow, 0.5);
    g.fillRect(14, 42, 20, 4);
    // Waistband
    fill(boxerShadow, 1);
    g.fillRect(14, 38, 20, 2);
  }

  // Red hearts on the boxers (3 of them)
  if (!outlineOnly) {
    fill(heart, 1);
    // Heart 1
    g.fillCircle(18, 44, 1.5);
    g.fillCircle(20, 44, 1.5);
    g.fillTriangle(17, 45, 21, 45, 19, 47);
    // Heart 2
    g.fillCircle(23, 44, 1.5);
    g.fillCircle(25, 44, 1.5);
    g.fillTriangle(22, 45, 26, 45, 24, 47);
    // Heart 3
    g.fillCircle(28, 44, 1.5);
    g.fillCircle(30, 44, 1.5);
    g.fillTriangle(27, 45, 31, 45, 29, 47);
  }

  // ----- LEGS (skin, bare) -----
  if (!outlineOnly) {
    fill(skin, 1);
    g.fillRect(15, 46, 7, 14);
    g.fillRect(26, 46, 7, 14);
    fill(skinShadow, 0.6);
    g.fillRect(20, 46, 2, 14);
    g.fillRect(31, 46, 2, 14);
  }
  if (outlineOnly) {
    g.fillRect(15, 46, 7, 14);
    g.fillRect(26, 46, 7, 14);
  }

  // ----- KNEE PADS (spiky, bright orange-yellow) -----
  // Big round pad on each knee with spikes
  fill(outlineOnly ? ink : kneePad);
  g.fillCircle(18, 54, 4);
  g.fillCircle(30, 54, 4);

  if (!outlineOnly) {
    // Highlight on the pad
    fill(kneeSpike, 1);
    g.fillCircle(17, 53, 1.5);
    g.fillCircle(29, 53, 1.5);
    // Shadow under the pad
    fill(kneePadDark, 1);
    g.fillCircle(18, 56, 3);
    g.fillCircle(30, 56, 3);
  }

  // Spikes coming off the pads (4 each)
  if (!outlineOnly) {
    fill(kneeSpike, 1);
    // Left pad spikes
    g.fillTriangle(14, 54, 12, 50, 16, 52);
    g.fillTriangle(14, 54, 12, 58, 16, 56);
    g.fillTriangle(18, 50, 18, 54, 22, 54);
    g.fillTriangle(18, 54, 22, 54, 18, 58);
    // Right pad spikes
    g.fillTriangle(26, 54, 24, 50, 28, 52);
    g.fillTriangle(26, 54, 24, 58, 28, 56);
    g.fillTriangle(30, 50, 30, 54, 34, 54);
    g.fillTriangle(30, 54, 34, 54, 30, 58);
  }

  // ----- FEET (bare, skin) -----
  fill(outlineOnly ? ink : skin);
  g.fillRect(14, 60, 9, 4);
  g.fillRect(25, 60, 9, 4);
  if (!outlineOnly) {
    fill(skinShadow, 0.7);
    g.fillRect(14, 62, 9, 2);
    g.fillRect(25, 62, 9, 2);
  }
}

/**
 * Draw the Donut silhouette paths. Compact round cat, big single eye.
 */
function drawDonutPaths(g, opts) {
  const c = opts.colors;
  const fur = c.donutFur;
  const furShadow = c.donutFurShadow;
  const furHighlight = c.donutFurHighlight;
  const sclera = c.donutSclera;
  const iris = c.donutIris;
  const pupil = c.donutPupil;
  const cheek = c.donutCheek;
  const ink = c.ink;
  const outlineOnly = !!opts.outlineOnly;

  const fill = (color, alpha = 1) => g.fillStyle(color, alpha);

  // ----- EARS (two triangles on top) -----
  fill(outlineOnly ? ink : furShadow);
  g.beginPath();
  g.moveTo(10, 14);
  g.lineTo(14, 2);
  g.lineTo(20, 12);
  g.closePath();
  g.fillPath();

  g.beginPath();
  g.moveTo(38, 14);
  g.lineTo(34, 2);
  g.lineTo(28, 12);
  g.closePath();
  g.fillPath();

  // Inner ear (pink) — color pass only
  if (!outlineOnly) {
    fill(0xff9ec4, 1);
    g.beginPath();
    g.moveTo(14, 12);
    g.lineTo(16, 6);
    g.lineTo(19, 11);
    g.closePath();
    g.fillPath();

    g.beginPath();
    g.moveTo(34, 12);
    g.lineTo(32, 6);
    g.lineTo(29, 11);
    g.closePath();
    g.fillPath();
  }

  // ----- BODY (big round) -----
  fill(outlineOnly ? ink : fur);
  g.fillCircle(24, 28, 18);

  // Belly highlight — cel shading step
  if (!outlineOnly) {
    fill(furHighlight, 1);
    g.fillCircle(20, 24, 5);
  }

  // Bottom shadow — cel shading step
  if (!outlineOnly) {
    fill(furShadow, 1);
    g.fillEllipse(24, 40, 22, 6);
  }

  // ----- THE BIG MAGIC EYE (Donut's defining feature) -----
  // Sclera (white)
  fill(outlineOnly ? ink : sclera);
  g.fillCircle(24, 24, 8);

  // Iris — glowing cyan
  if (!outlineOnly) {
    fill(iris, 1);
    g.fillCircle(24, 24, 5);

    // Pupil
    fill(pupil, 1);
    g.fillCircle(24, 24, 2);

    // Eye glint (specular highlight)
    fill(0xffffff, 1);
    g.fillCircle(22, 22, 1);
  }

  // ----- CHEEKS (blush) -----
  if (!outlineOnly) {
    fill(cheek, 0.7);
    g.fillCircle(14, 30, 2);
    g.fillCircle(34, 30, 2);
  }

  // ----- PAW NUBS (small, peeking from body) -----
  fill(outlineOnly ? ink : furShadow);
  g.fillCircle(12, 42, 4);
  g.fillCircle(36, 42, 4);
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

export class SpriteFactory {
  /**
   * Must be called once per scene before createCarl/createDonut.
   * Generates the four textures and stores them in the scene's texture manager.
   * Idempotent — won't regenerate if textures already exist.
   */
  static generate(scene) {
    const tm = scene.textures;

    // ----- CARL -----
    if (!tm.exists(TEXTURE_KEYS.carlOutline)) {
      const g = scene.add.graphics({ x: 0, y: 0 });
      g.setVisible(false); // hide but keep in scene tree so generateTexture flushes commands
      drawCarlPaths(g, { colors: COLORS, outlineOnly: true });
      g.generateTexture(TEXTURE_KEYS.carlOutline, 48, 64);
      g.destroy();
    }

    if (!tm.exists(TEXTURE_KEYS.carlColor)) {
      const g = scene.add.graphics({ x: 0, y: 0 });
      g.setVisible(false);
      drawCarlPaths(g, { colors: COLORS, outlineOnly: false });
      g.generateTexture(TEXTURE_KEYS.carlColor, 48, 64);
      g.destroy();
    }

    // ----- DONUT -----
    if (!tm.exists(TEXTURE_KEYS.donutOutline)) {
      const g = scene.add.graphics({ x: 0, y: 0 });
      g.setVisible(false);
      drawDonutPaths(g, { colors: COLORS, outlineOnly: true });
      g.generateTexture(TEXTURE_KEYS.donutOutline, 48, 48);
      g.destroy();
    }

    if (!tm.exists(TEXTURE_KEYS.donutColor)) {
      const g = scene.add.graphics({ x: 0, y: 0 });
      g.setVisible(false);
      drawDonutPaths(g, { colors: COLORS, outlineOnly: false });
      g.generateTexture(TEXTURE_KEYS.donutColor, 48, 48);
      g.destroy();
    }
  }

  /**
   * Build a Carl entity container at (x, y).
   * The returned container's top-left represents Carl's feet anchor; the
   * origin is set to (0.5, 1.0) so x,y is "where his boots hit the floor".
   *
   * Returned container exposes:
   *   .colorSprite, .outlineSprite  — the two sprite layers
   *   .playWalk(), .playIdle()     — animation triggers
   *   .facing = 1 | -1             — last horizontal facing
   */
  static createCarl(scene, x, y) {
    SpriteFactory.generate(scene);

    const outline = scene.add.sprite(0, 0, TEXTURE_KEYS.carlOutline);
    const color = scene.add.sprite(0, 0, TEXTURE_KEYS.carlColor);

    // Carl is rendered at 2× scale so he's actually visible at game resolution.
    // Outline is 1.08× the color sprite, scaled with it.
    const SCALE = 2.0;
    outline.setScale(SCALE * 1.08);
    color.setScale(SCALE * 1.0);
    outline.setOrigin(0.5, 1.0);
    color.setOrigin(0.5, 1.0);

    const container = scene.add.container(x, y, [outline, color]);
    container.setSize(48 * SCALE, 64 * SCALE);
    container._originX = 0.5;
    container._originY = 1.0;
    container._scale = SCALE;

    container.outlineSprite = outline;
    container.colorSprite = color;
    container.facing = 1;
    container._baseY = y;

    // ---- Idle "breathing": outline-only scale pulse. The color sprite
    // stays at fixed SCALE so the outline (1.08× larger) reads as a
    // crisp rim around the body. Without this, animating both makes
    // them grow together and the rim disappears. ----
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

    container.playWalk = function () {
      // Walk: faster, more pronounced outline pulse (simulates bob).
      if (container._walkTween) return;
      container._idleTween.pause();
      outline.setScale(outlineBaseX, outlineBaseY);
      color.setScale(SCALE, SCALE);
      container._walkTween = scene.tweens.add({
        targets: [outline],
        scaleX: { from: outlineBaseX, to: outlineBaseX * 1.06 },
        scaleY: { from: outlineBaseY, to: outlineBaseY * 1.03 },
        duration: 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    };

    container.playIdle = function () {
      if (container._walkTween) {
        container._walkTween.stop();
        container._walkTween = null;
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
        if (container._walkTween) container._walkTween.stop();
        if (container._idleTween) container._idleTween.stop();
        origDestroy.call(container);
      };
    })(container.destroy);

    return container;
  }

  /**
   * Build a Donut entity container at (x, y).
   * Origin (0.5, 0.5) — Donut floats, so the center is the natural anchor.
   *
   * Returned container exposes:
   *   .colorSprite, .outlineSprite
   *   .irisSprite                  — the glowing cyan iris (for pulse tween)
   *   .playWalk(), .playIdle()
   *   .facing = 1 | -1
   */
  static createDonut(scene, x, y) {
    SpriteFactory.generate(scene);

    const outline = scene.add.sprite(0, 0, TEXTURE_KEYS.donutOutline);
    const color = scene.add.sprite(0, 0, TEXTURE_KEYS.donutColor);

    const SCALE = 2.0;
    const donutOutlineX = SCALE * 1.10;
    const donutOutlineY = SCALE * 1.10;
    outline.setScale(donutOutlineX, donutOutlineY);
    color.setScale(SCALE, SCALE);
    outline.setOrigin(0.5, 0.5);
    color.setOrigin(0.5, 0.5);

    const container = scene.add.container(x, y, [outline, color]);
    container.setSize(48 * SCALE, 48 * SCALE);
    container._originX = 0.5;
    container._originY = 0.5;
    container._scale = SCALE;

    container.outlineSprite = outline;
    container.colorSprite = color;
    container.facing = 1;
    container._baseY = y;
    container._floatOffsetY = 0; // updated by tween each frame; consumers add this to their target Y.

    // ---- Magic eye iris pulse: subtle cyan glow throbs every 1.2s ----
    // We retint the entire color sprite briefly to simulate the glow catching.
    container._eyeTween = scene.tweens.add({
      targets: color,
      tint: { from: 0xffffff, to: 0xc8ffff },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ---- Float bob: write a small offset into _floatOffsetY each frame.
    // Consumers (e.g. GameScene's orbit math) read it and add to their
    // computed y. This avoids the tween fighting external position writes.
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
      // Donut's "walk" is an excited flutter: faster outline jitter.
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