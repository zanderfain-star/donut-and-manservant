import Phaser from 'phaser';

/*
 * UIScene — parallel scene that draws HUD and overlays on top of GameScene.
 *
 * Bound to the active GameScene via bindToGame(). Reads player state every
 * frame; shows damage cooldown overlay, win/death screens.
 */

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gameScene = null;

    // HUD text — sticky to camera
    this.hpText = this.add.text(20, 20, 'HP: █████', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ff3d6e',
    }).setScrollFactor(0).setDepth(500);

    this.magicCdText = this.add.text(20, 48, 'MAGIC: [READY]', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#6effff',
    }).setScrollFactor(0).setDepth(500);

    this.progressText = this.add.text(20, 70, 'FLOOR 1 — DESCENT', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#a0a0a0',
    }).setScrollFactor(0).setDepth(500);

    this.controlsText = this.add.text(20, 696,
      '[A/D] move  [W/SPACE/↑] jump  [J] punch  [K] stomp  [L] magic missile', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#6effff',
    }).setScrollFactor(0).setDepth(500);

    // Overlays (hidden initially)
    this.overlay = null;
  }

  bindToGame(gameScene) {
    this.gameScene = gameScene;
  }

  update() {
    if (!this.gameScene) return;
    const g = this.gameScene;

    // HP pips
    const hp = Math.max(0, g.hp);
    const filled = '█'.repeat(hp);
    const empty = '░'.repeat(5 - hp);
    this.hpText.setText(`HP: ${filled}${empty}`);
    this.hpText.setColor(hp <= 1 ? '#ff3d3d' : hp <= 2 ? '#ffaa3d' : '#ff3d6e');

    // Magic cooldown
    const now = g.time ? g.time.now : 0;
    const cdRemaining = Math.max(0, 400 - (now - g.lastMagicAt));
    if (cdRemaining > 0) {
      this.magicCdText.setText(`MAGIC: [${Math.ceil(cdRemaining / 100) / 10}s]`);
      this.magicCdText.setColor('#888888');
    } else {
      this.magicCdText.setText('MAGIC: [READY]');
      this.magicCdText.setColor('#6effff');
    }

    // Progress bar (subtle, bottom right)
    // (Re-drawn as percentage of world cleared)
    if (!g.won && !g.dead) {
      const pct = Math.min(1, g.player.x / 6000);
      // We can't easily redraw a bar without a graphics ref; use text instead
      if (!this.progressPct) {
        this.progressPct = this.add.text(1260, 696, '', {
          fontFamily: 'Courier New, monospace',
          fontSize: '12px',
          color: '#6effff',
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(500);
      }
      const bar = '█'.repeat(Math.floor(pct * 20));
      const empty = '░'.repeat(20 - Math.floor(pct * 20));
      this.progressPct.setText(`${bar}${empty} ${Math.floor(pct * 100)}%`);
    }
  }

  showWin() {
    if (this.overlay) return;
    this.overlay = true;
    this.add.rectangle(640, 360, 1280, 720, 0x0a0a0a, 0.85)
      .setScrollFactor(0).setDepth(1000);
    this.add.text(640, 280, 'FLOOR 1 CLEARED', {
      fontFamily: 'Courier New, monospace',
      fontSize: '64px',
      color: '#6effff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 380, 'Carl and Donut descend deeper.', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#f4ecd8',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 460, '[ R ] — restart', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffb000',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    this.input.keyboard.once('keydown-R', () => {
      this.scene.start('GameScene');
    });
  }

  showDeath(reason) {
    if (this.overlay) return;
    this.overlay = true;

    const reasonText = {
      pit: 'Carl fell into the abyss.',
      enemy: 'Carl was overwhelmed by dungeon creatures.',
    }[reason] || 'Carl has died.';

    this.add.rectangle(640, 360, 1280, 720, 0x0a0a0a, 0.85)
      .setScrollFactor(0).setDepth(1000);
    this.add.text(640, 280, 'CARL HAS FALLEN', {
      fontFamily: 'Courier New, monospace',
      fontSize: '64px',
      color: '#ff3d3d',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 380, reasonText, {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#f4ecd8',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 440, 'Donut screams. The dungeon laughs.', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#a0a0a0',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 520, '[ R ] — retry  [ESC] — give up (restart anyway)', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffb000',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    this.input.keyboard.once('keydown-R', () => this.scene.start('GameScene'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('GameScene'));
  }
}