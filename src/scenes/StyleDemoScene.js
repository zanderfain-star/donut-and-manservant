/*
 * StyleDemoScene — 2D-on-3D visual prototype.
 *
 * Goal: prove (or disprove) the Viewtiful-Joe-style contrast where the FLOOR
 * reads as a deep, atmospheric, almost-3D space and the CHARACTERS read as
 * flat, bright, ink-outlined 2D cutouts slapped on top.
 *
 * Read the scene back-to-front:
 *
 *   depth  | layer            | scrollFactor | treatment
 *   -------|------------------|--------------|-----------------------
 *   far    | demo_sky         | 0.00         | flat, deepest blue
 *   far    | demo_mountains   | 0.05         | indigo silhouette
 *   mid    | demo_haze        | 0.10         | cyan dust band (atmospheric perspective)
 *   mid    | demo_midground   | 0.25         | pillar ruins silhouette
 *   near   | demo_floor       | 0.60         | perspective plank stage
 *   near   | demo_fog         | 1.00         | bottom vignette / ground haze
 *   FG     | characters       | 1.00         | bright cel + black ink outline behind
 *
 * The camera pans slowly with LEFT/RIGHT (or A/D) so the parallax reads.
 * Press SPACE to swap to the actual GameScene.
 */

import Phaser from 'phaser';

const W = 1280;
const H = 720;

export class StyleDemoScene extends Phaser.Scene {
  constructor() {
    super('StyleDemoScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');

    // World is wider than viewport so parallax has somewhere to go.
    this.worldWidth = W * 2;

    // ============================================================
    // FLOOR LAYER — everything that should read as "the 3D world"
    // ============================================================

    // Sky: tile across the world. scrollFactor 0 = glued to camera.
    this.skyLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(0);
    for (let x = 0; x < this.worldWidth; x += 256) {
      const t = this.add.image(x, 0, 'demo_sky').setOrigin(0, 0);
      t.setTint(0x6a7088); // cool, desaturated — atmospheric perspective for "far"
      this.skyLayer.add(t);
    }

    // Distant mountains: slow parallax (0.05).
    this.mountainLayer = this.add.container(0, 80).setScrollFactor(0.05, 0).setDepth(5);
    for (let x = 0; x < this.worldWidth * 1.2; x += 256) {
      const t = this.add.image(x, 0, 'demo_mountains').setOrigin(0, 0);
      t.setAlpha(0.85);
      t.setTint(0x556070); // even more desaturated than sky → reads as furthest
      this.mountainLayer.add(t);
    }

    // Cyan haze band — atmospheric dust, mid-depth.
    this.hazeLayer = this.add.container(0, 340).setScrollFactor(0.1, 0).setDepth(10);
    for (let x = 0; x < this.worldWidth; x += 256) {
      const t = this.add.image(x, 0, 'demo_haze').setOrigin(0, 0);
      t.setBlendMode(Phaser.BlendModes.ADD);
      t.setAlpha(0.6);
      this.hazeLayer.add(t);
    }

    // Midground pillars / ruins — faster parallax (0.25), more detail.
    this.midLayer = this.add.container(0, 460).setScrollFactor(0.25, 0).setDepth(15);
    for (let x = 0; x < this.worldWidth * 1.4; x += 256) {
      const t = this.add.image(x, 0, 'demo_midground').setOrigin(0, 0);
      t.setAlpha(0.95);
      t.setTint(0x808890); // slightly warmer / brighter than mountains
      this.midLayer.add(t);
    }

    // Perspective plank stage — fast parallax (0.6), strong perspective lines.
    this.floorLayer = this.add.container(0, 560).setScrollFactor(0.6, 1).setDepth(20);
    for (let x = 0; x < this.worldWidth * 1.6; x += 320) {
      const t = this.add.image(x, 0, 'demo_floor').setOrigin(0, 0);
      t.setTint(0xb0a890); // warmest, most saturated → reads as nearest
      this.floorLayer.add(t);
    }

    // Bottom fog / vignette — pulls the floor into shadow at the front.
    this.fogLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(25);
    const fog = this.add.image(W / 2, H - 128, 'demo_fog').setOrigin(0.5, 0);
    fog.setDisplaySize(W, 256);
    fog.setAlpha(0.9);
    this.fogLayer.add(fog);

    // Subtle radial vignette overlay — drawn with Phaser graphics so we
    // don't depend on shader passes.
    this.vignette = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.drawVignette();

    // ============================================================
    // CHARACTER LAYER — flat, bright, ink-outlined 2D
    // ============================================================

    // Stage platform the characters stand on. Lives at scrollFactor 1
    // so the contrast vs. the floor parallax is unambiguous.
    const stageY = H - 160;
    this.stage = this.add.rectangle(W * 0.5, stageY, 420, 16, 0x1a1410, 1);
    this.stage.setStrokeStyle(2, 0x3a2418, 1);
    this.stage.setDepth(40);

    // Build the two characters as (ink + cel) pairs so the Viewtiful-Joe
    // outline reads even against the busy floor.
    this.carl = this.buildCharacter('carl_ink', 'carl_cel', W * 0.5 - 40, stageY - 16, 0);
    this.donut = this.buildCharacter('donut_ink', 'donut_cel', W * 0.5 + 40, stageY - 16, 1);

    // Bob animation state — different phase per character so they don't sync.
    this.bob = { carl: 0, donut: Math.PI };

    // ============================================================
    // CAMERA + INPUT
    // ============================================================

    this.cameras.main.setBounds(0, 0, this.worldWidth, H);

    // Slow auto-pan so parallax is visible even without input.
    this.autoPan = 0;

    this.keys = this.input.keyboard.addKeys({
      left: 'A', right: 'D', leftArrow: 'LEFT', rightArrow: 'RIGHT',
      start: 'SPACE', startAlt: 'ENTER',
    });

    // UI overlay — sticky to camera (scrollFactor 0).
    this.add.text(20, 20, 'STYLE DEMO — 2D heroes on a 3D floor', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#f4ecd8',
    }).setScrollFactor(0).setDepth(100);

    this.add.text(20, 44, 'Watch the parallax: sky → mountains → haze → pillars → floor', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#a0a0a0',
    }).setScrollFactor(0).setDepth(100);

    this.add.text(20, 64, 'Note the saturated cel characters vs. the muted, atmospheric floor.', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#a0a0a0',
    }).setScrollFactor(0).setDepth(100);

    this.add.text(20, H - 36, '[A/D or ←/→] pan   [SPACE / ENTER] → start GameScene', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#6effff',
    }).setScrollFactor(0).setDepth(100);
  }

  buildCharacter(inkKey, celKey, x, y, side) {
    // Each "character" is a container with two children:
    //   [0] ink sprite  — drawn first, scaled slightly larger, pure black
    //   [1] cel sprite  — drawn on top, full bright color
    // This produces a hard ink outline without shaders.
    const ink = this.add.image(0, 0, inkKey).setOrigin(0.5, 1);
    const cel = this.add.image(0, 0, celKey).setOrigin(0.5, 1);

    const c = this.add.container(x, y, [ink, cel]);
    c.setDepth(50);

    // Drop shadow on the stage, separate so it doesn't bob with the body.
    const shadow = this.add.image(x, y + 2, 'demo_shadow').setOrigin(0.5, 0).setDepth(45);
    shadow.setAlpha(0.7);

    // Pre-set ink sprite to be slightly larger so it shows as an outline rim.
    ink.setScale(1.18);

    // A tiny baseline scale to start at; we only animate y, not scale,
    // so the outline thickness stays constant.
    return { container: c, ink, cel, shadow, baseY: y, side };
  }

  drawVignette() {
    const g = this.vignette;
    const cx = W / 2;
    const cy = H / 2;
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const a = t * t * 0.5; // stronger at the corners
      const w = W * (0.5 + t * 0.55);
      const h = H * (0.5 + t * 0.55);
      g.fillStyle(0x000000, a);
      g.fillRect(cx - w / 2, cy - h / 2, w, h);
      // Carve the inner rectangle back out.
      g.fillStyle(0x000000, -a * 0.0); // no-op; Phaser graphics don't support
      // composite subtract, so instead we accept the vignette as a soft
      // darkening — it still reads.
    }
  }

  update(time, delta) {
    const dt = delta / 1000;

    // Camera pan: manual or slow auto-drift.
    let vx = 0;
    if (this.keys.left.isDown || this.keys.leftArrow.isDown) vx -= 1;
    if (this.keys.right.isDown || this.keys.rightArrow.isDown) vx += 1;
    if (vx === 0) {
      this.autoPan += dt * 8; // slow ambient drift
      vx = Math.sin(this.autoPan * 0.3) * 0.4;
    }
    this.cameras.main.scrollX += vx * 60 * dt;
    this.cameras.main.scrollX = Phaser.Math.Clamp(
      this.cameras.main.scrollX,
      0,
      this.worldWidth - W,
    );

    // Idle bob on both characters.
    this.bob.carl += dt * 2.4;
    this.bob.donut += dt * 3.1;
    this.applyBob(this.carl, this.bob.carl);
    this.applyBob(this.donut, this.bob.donut);

    // SPACE / ENTER → hand off to the real game scene.
    if (Phaser.Input.Keyboard.JustDown(this.keys.start) ||
        Phaser.Input.Keyboard.JustDown(this.keys.startAlt)) {
      // Clear keyboard state before switching — otherwise the SPACE press
      // we just consumed stays "down" across scene boundaries and the
      // GameScene jump handler fires on its very first frame.
      this.input.keyboard.resetKeys();
      this.input.keyboard.enabled = false;
      this.scene.start('GameScene');
      this.scene.launch('UIScene');
    }
  }

  applyBob(char, t) {
    // Sine bob: ±2 px. Outline scales with the body so the ink rim stays
    // tight — but ONLY on y, not on scale, so the outline thickness
    // remains the same in screen pixels.
    const y = char.baseY + Math.sin(t) * 2;
    char.container.y = y;
    char.shadow.y = char.baseY + 2 + Math.sin(t) * 2;
    // Slight squash on landing-ish edge to sell weight.
    const squash = 1 + Math.sin(t * 2) * 0.02;
    char.cel.setScale(squash, 2 - squash);
    char.ink.setScale(1.18 * squash, 1.18 * (2 - squash));
  }
}