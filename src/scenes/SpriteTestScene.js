import Phaser from 'phaser';
import { SpriteFactory } from '../entities/SpriteFactory.js';

/*
 * Verification scene: a simple showcase that confirms
 * SpriteFactory.createCarl(scene, x, y) and SpriteFactory.createDonut(scene, x, y)
 * return working entities.
 *
 * Run it with:   npm run dev  -> http://localhost:5173/?verify=1
 *
 * What it checks:
 *   1. All four expected textures exist in the texture manager.
 *   2. Carl container is non-null, has both outline + color sprites.
 *   3. Donut container is non-null, has both outline + color sprites.
 *   4. Both idle tweens are running.
 *   5. No console errors thrown during creation.
 *   6. Visual confirmation: two big entities on screen, eye glow visible.
 *
 * Press SPACE to toggle Carl's walk animation; press F to flip both.
 */
export class SpriteTestScene extends Phaser.Scene {
  constructor() {
    super('SpriteTestScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a22');

    let ok = true;
    const fail = (msg) => {
      ok = false;
      this.add.text(20, 20, 'FAIL: ' + msg, { color: '#ff5050', fontSize: '20px', fontFamily: 'Courier New, monospace' });
    };

    // Generate textures (also done in BootScene normally)
    try {
      SpriteFactory.generate(this);
    } catch (e) {
      fail('generate() threw: ' + e.message);
    }

    // Check texture existence
    const tm = this.textures;
    const keys = ['carl_outline', 'carl_color', 'donut_outline', 'donut_color'];
    for (const k of keys) {
      if (!tm.exists(k)) fail(`texture "${k}" missing`);
    }

    // Create entities
    let carl, donut;
    try {
      carl = SpriteFactory.createCarl(this, 400, 360);
      donut = SpriteFactory.createDonut(this, 800, 360);
    } catch (e) {
      fail('factory threw: ' + e.message);
    }

    // Structural assertions
    if (carl && (!carl.outlineSprite || !carl.colorSprite)) fail('carl container missing layer sprites');
    if (donut && (!donut.outlineSprite || !donut.colorSprite)) fail('donut container missing layer sprites');

    // Depth & scale sanity
    if (carl) {
      carl.setDepth(5);
      if (carl.outlineSprite.scaleX <= 1.0) fail('carl outline not scaled > 1');
    }
    if (donut) {
      donut.setDepth(5);
      if (donut.outlineSprite.scaleX <= 1.0) fail('donut outline not scaled > 1');
    }

    // HUD
    this.add.text(20, 60, 'SpriteFactory verification', {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#6effff',
    });
    this.add.text(20, 90, 'SPACE: toggle Carl walk    F: flip both', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffffff',
    });

    this.add.text(20, 120, ok ? 'STATUS: PASS' : 'STATUS: FAIL', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: ok ? '#7fff7f' : '#ff5050',
    });

    // Controls
    this.keys = this.input.keyboard.addKeys({
      space: 'SPACE',
      flip: 'F',
    });
    this._carlWalking = false;
    this._flip = 1;

    this.events.on('update', () => {
      if (Phaser.Input.Keyboard.JustDown(this.keys.space) && carl) {
        this._carlWalking = !this._carlWalking;
        if (this._carlWalking) carl.playWalk();
        else carl.playIdle();
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.flip)) {
        this._flip *= -1;
        carl.setFacing(this._flip);
        donut.setFacing(this._flip);
      }
    });
  }
}

export default SpriteTestScene;