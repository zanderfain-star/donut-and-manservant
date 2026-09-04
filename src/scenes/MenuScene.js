import Phaser from 'phaser';
import { SpriteFactory } from '../entities/SpriteFactory.js';

/*
 * MenuScene — comic-cover title screen.
 *
 * Bold cartoon / comic cover vibe:
 *   - Starburst behind a huge DONUT & MANSERVANT title
 *   - FLOOR 1: DESCENT subtitle banner
 *   - Carl (left) / Donut (right) previews flanking the HOW TO PLAY panel
 *   - Objective line + pulsing DESCEND prompt
 *
 * SPACE / ENTER / click starts GameScene + UIScene cleanly
 * (defensively stops leftovers first — see HANDOFF "Scene Lifecycle" fix).
 */

const TITLE_Y = 148;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this._started = false;

    this.drawMenuBackground();

    // ----- Comic frame: thick ink border + corner ticks -----
    const frame = this.add.graphics().setDepth(90);
    frame.lineStyle(10, 0x080808, 1);
    frame.strokeRect(5, 5, W - 10, H - 10);
    frame.lineStyle(3, 0xf4ecd8, 0.9);
    frame.strokeRect(14, 14, W - 28, H - 28);

    // ----- Corner cover tags -----
    this.add.text(30, 26, 'ISSUE #1', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#0a0a0a',
      backgroundColor: '#ffb000',
      padding: { x: 10, y: 4 },
    }).setDepth(95);

    this.add.text(W - 30, 26, 'FLOOR 1', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#0a0a0a',
      backgroundColor: '#6effff',
      padding: { x: 10, y: 4 },
    }).setOrigin(1, 0).setDepth(95);

    // ----- Starburst behind title -----
    const burst = this.add.graphics().setDepth(40);
    const cx = W / 2;
    const cy = TITLE_Y - 6;
    const points = [];
    const spikes = 16;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? 400 : 330;
      const a = (Math.PI * i) / spikes - Math.PI / 2;
      points.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.34));
    }
    burst.fillStyle(0xffb000, 1);
    burst.lineStyle(6, 0x080808, 1);
    burst.fillPoints(points, true);
    burst.strokePoints(points, true);
    // Inner burst pop
    const inner = [];
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? 340 : 290;
      const a = (Math.PI * i) / spikes - Math.PI / 2;
      inner.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.30));
    }
    burst.fillStyle(0xffcf4d, 1);
    burst.fillPoints(inner, true);

    // ----- TITLE -----
    this.add.text(cx, TITLE_Y - 28, 'DONUT & MANSERVANT', {
      fontFamily: '"Courier New", monospace',
      fontSize: '60px',
      fontStyle: 'bold',
      color: '#ff3d6e',
      stroke: '#080808',
      strokeThickness: 10,
    }).setOrigin(0.5).setDepth(50);

    this.add.text(cx, TITLE_Y + 22, 'POW! BRAWL IN THE DEEP!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '15px',
      fontStyle: 'bold italic',
      color: '#0a0a0a',
    }).setOrigin(0.5).setDepth(50);

    // Subtitle banner
    const subBg = this.add.graphics().setDepth(49);
    subBg.fillStyle(0x080808, 1);
    subBg.fillRect(cx - 260, TITLE_Y + 44, 520, 34);
    subBg.lineStyle(2, 0x6effff, 1);
    subBg.strokeRect(cx - 260, TITLE_Y + 44, 520, 34);
    this.add.text(cx, TITLE_Y + 61, '— FLOOR 1: DESCENT —', {
      fontFamily: '"Courier New", monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#6effff',
    }).setOrigin(0.5).setDepth(50);

    this.add.text(cx, TITLE_Y + 92, 'The dungeon took the world. Carl punches back. Donut supervises.', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'italic',
      color: '#c8bfa8',
    }).setOrigin(0.5).setDepth(50);
    // Story caption — who / why / goal in 3 beats
    this.add.text(cx, TITLE_Y + 118,
      'STORY: Seattle burns. Grab Donut from the tree, outrun the collapse, descend.',
      {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#0a0a0a',
        backgroundColor: '#f4ecd8',
        padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setDepth(50);

    // ----- CARL (left) / DONUT (right) previews -----
    // SpriteFactory guarantees textures exist (generates on demand),
    // so these are safe even on a cold boot straight into MenuScene.
    this.carlPreview = SpriteFactory.createCarl(this, 190, H / 2 + 130);
    this.carlPreview.setDepth(44);
    this.carlPreview.setFacing(1);
    this.donutPreview = SpriteFactory.createDonut(this, 1090, H / 2 + 90);
    this.donutPreview.setDepth(44);

    // Name captions under previews (caption-box style)
    this.add.text(190, H / 2 + 200, ' CARL ', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#0a0a0a',
      backgroundColor: '#ffb000',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(46);
    this.add.text(190, H / 2 + 228, 'manservant • punch first', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#a0a0a0',
    }).setOrigin(0.5).setDepth(46);

    this.add.text(1090, H / 2 + 160, ' DONUT ', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#0a0a0a',
      backgroundColor: '#ff3d6e',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(46);
    this.add.text(1090, H / 2 + 188, 'cat • crown • eye-rockets', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#a0a0a0',
    }).setOrigin(0.5).setDepth(46);

    // Idle bob for previews
    this.tweens.add({
      targets: this.carlPreview,
      y: (H / 2 + 130) - 8,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.donutPreview,
      y: (H / 2 + 90) - 14,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ----- HOW TO PLAY PANEL (comic caption box) -----
    const panelX = W / 2;
    const panelY = 408;
    const panelW = 620;
    const panelH = 252;

    const panel = this.add.graphics().setDepth(45);
    panel.fillStyle(0xf4ecd8, 1);
    panel.fillRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH);
    panel.fillStyle(0x14080a, 1);
    panel.fillRect(panelX - panelW / 2 + 6, panelY - panelH / 2 + 30, panelW - 12, panelH - 36);
    panel.lineStyle(5, 0x080808, 1);
    panel.strokeRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH);

    this.add.text(panelX, panelY - panelH / 2 + 15, '★ HOW TO PLAY ★', {
      fontFamily: '"Courier New", monospace',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#0a0a0a',
    }).setOrigin(0.5).setDepth(46);

    const lines = [
      ['[A] [D]', 'move left / right'],
      ['[W] [SPACE]', 'jump'],
      ['[J]', 'punch (short range)'],
      ['[K]', 'stomp (mid-air slam — one-shots!)'],
      ['[L]', 'DONUT ROCKET (Donut fires!)'],
      ['[U]', 'bomb toss (Floor 2+)'],
      ['[R] / [M]', 'restart floor / menu'],
    ];
    const startY = panelY - 76;
    const lineH = 25;
    lines.forEach(([keys, desc], i) => {
      this.add.text(panelX - panelW / 2 + 30, startY + i * lineH, keys, {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#6effff',
      }).setOrigin(0, 0.5).setDepth(46);
      this.add.text(panelX - panelW / 2 + 200, startY + i * lineH, desc, {
        fontFamily: '"Courier New", monospace',
        fontSize: '14px',
        color: '#f4ecd8',
      }).setOrigin(0, 0.5).setDepth(46);
    });

    // Objective + loot legend inside panel
    this.add.text(panelX, panelY + panelH / 2 - 32, 'GOAL: TUNNELS → GARBAGE → GYM, beat BARON SWINE, STAIRS DOWN!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffb000',
    }).setOrigin(0.5).setDepth(46);
    this.add.text(panelX, panelY + panelH / 2 - 14, 'LOOT: HAM heals • STAR scores • CRYSTAL = fuel for Donut rockets', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      color: '#6effff',
    }).setOrigin(0.5).setDepth(46);

    // ----- START PROMPT (pulsing action box) -----
    const promptBg = this.add.graphics().setDepth(49);
    promptBg.fillStyle(0xff3d6e, 1);
    promptBg.fillRect(cx - 300, H - 92, 600, 44);
    promptBg.lineStyle(4, 0x080808, 1);
    promptBg.strokeRect(cx - 300, H - 92, 600, 44);
    const prompt = this.add.text(cx, H - 70, '[ SPACE ]  or  [ ENTER ]  —  DESCEND!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#0a0a0a',
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: [prompt, promptBg],
      alpha: { from: 1, to: 0.45 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: prompt,
      scaleX: { from: 1, to: 1.04 },
      scaleY: { from: 1, to: 1.04 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ----- Footer -----
    this.add.text(W - 24, H - 24, 'v2.12 • CC0 art • Phaser 3', {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      color: '#6e4828',
    }).setOrigin(1, 1).setDepth(95);
    this.add.text(24, H - 24, 'DONUT.4BROS.CC', {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      color: '#6e4828',
    }).setOrigin(0, 1).setDepth(95);

    // Credit where due: a fan game honoring Matt Dinniman's books.
    // Clickable (opens the book page) — and clicks on it must NOT also
    // start the game, so startGame ignores pointers landing on it.
    this.creditText = this.add.text(
      W / 2, H - 44,
      'a fan game honoring DUNGEON CRAWLER CARL by Matt Dinniman — mattdinniman.com',
      {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        color: '#8ad8ff',
      },
    ).setOrigin(0.5).setDepth(95)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this._creditClickedAt = this.time.now;
        if (typeof window !== 'undefined') {
          window.open('https://mattdinniman.com/books/dungeon-crawler-carl/', '_blank', 'noopener');
        }
      })
      .on('pointerover', function () { this.setColor('#ffffff'); })
      .on('pointerout', function () { this.setColor('#8ad8ff'); });

    // ----- INPUT (guard against double-start) -----
    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
    // .on (not .once): credit-link clicks are swallowed by the guard above
    // without consuming the listener; _started blocks real double-starts.
    this.input.on('pointerdown', (pointer) => this.startGame(pointer));
  }

  drawMenuBackground() {
    // Reused on every return to the menu — skip regeneration if present
    // (generateTexture on an existing key logs a console error).
    if (this.textures.exists('menu_bg')) {
      this.add.image(0, 0, 'menu_bg').setOrigin(0, 0).setDepth(0);
      return;
    }
    // Vertical gradient: deep indigo top → ink black near bottom.
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const W = 1280;
    const H = 720;
    for (let y = 0; y < H; y += 4) {
      const t = y / H;
      const r = Math.floor(0x1a * (1 - t) + 0x04 * t);
      const gC = Math.floor(0x0e * (1 - t) + 0x02 * t);
      const b = Math.floor(0x2e * (1 - t) + 0x08 * t);
      g.fillStyle((r << 16) | (gC << 8) | b, 1);
      g.fillRect(0, y, W, 4);
    }
    // Gothic spires silhouette
    g.fillStyle(0x05050a, 1);
    const spires = [80, 200, 320, 460, 620, 780, 920, 1080, 1180];
    for (const x of spires) {
      const baseY = 480;
      const h = 80 + Math.sin(x * 0.7) * 40 + 60;
      const w = 30 + Math.sin(x * 1.3) * 15;
      g.fillRect(x, baseY, w, H - baseY);
      g.fillTriangle(x, baseY, x + w, baseY, x + w / 2, baseY - h);
    }
    // Halftone dots (comic print vibe) — sparse rows near the top
    g.fillStyle(0xffffff, 0.05);
    for (let y = 20; y < 260; y += 14) {
      for (let x = ((y / 14) % 2) * 7; x < W; x += 14) {
        g.fillCircle(x, y, 2);
      }
    }
    // Speed lines radiating from title center
    g.lineStyle(2, 0xffffff, 0.06);
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24;
      g.lineBetween(
        640 + Math.cos(a) * 120, 142 + Math.sin(a) * 40,
        640 + Math.cos(a) * 620, 142 + Math.sin(a) * 300,
      );
    }
    g.generateTexture('menu_bg', W, H);
    g.destroy();
    this.add.image(0, 0, 'menu_bg').setOrigin(0, 0).setDepth(0);
  }

  startGame(pointer) {
    if (this._started) return;
    // Clicks on the Matt Dinniman credit link open the book page instead.
    // (Generous padding: canvas→game pointer mapping can skew ~11px.)
    if (pointer && pointer.x !== undefined && this.creditText) {
      const b = this.creditText.getBounds();
      if (b) {
        const pad = 14;
        const cx = b.centerX;
        const cy = b.centerY;
        if (Math.abs(pointer.x - cx) < b.width / 2 + pad &&
            Math.abs(pointer.y - cy) < b.height / 2 + pad) return;
      }
    }
    this._started = true;
    // Stop any leftover game + UI scenes, then start fresh.
    if (this.scene.isActive('GameScene')) this.scene.stop('GameScene');
    if (this.scene.isActive('UIScene')) this.scene.stop('UIScene');

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // The run always opens on the Floor 0 prelevel (never resume a
      // registry floor from an earlier session here).
      this.scene.start('GameScene', { floor: 0 });
      this.scene.launch('UIScene');
    });
  }
}
