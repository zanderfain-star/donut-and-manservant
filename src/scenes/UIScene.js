import Phaser from 'phaser';

/*
 * UIScene — parallel comic-HUD scene drawn on top of GameScene.
 *
 * Bound via bindToGame(gameScene). Reads GameScene state every frame.
 * GameScene contract (gameplay agent owns it — be defensive):
 *   hp / maxHP / mana / maxMana / score / combo / zoneName /
 *   won / dead / player / lastMagicAt / checkpoint,
 *   emits 'zone' / 'toast' events, Donut shoulder-ride flags.
 * Every field is read with a fallback so the HUD never throws when
 * GameScene is mid-rewrite or a field is missing.
 *
 * CRITICAL BUG FIX (was line 73): '░'.repeat(5 - hp) throws
 * RangeError when hp=8 because maxHP=8. Hearts now always use
 * maxHP with clamped non-negative repeats — NEVER repeat(negative).
 */

const END_X_FALLBACK = 6000;
const MAGIC_CD_FALLBACK = 400;

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gameScene = null;
    this._boundScene = null;
    this.overlay = null;
    this.toastQueue = [];
    this.toastActive = false;

    const ink = (t) => t.setScrollFactor(0);

    // ----- Top-left HUD plate (comic caption box) -----
    this.hudBg = ink(this.add.graphics()).setDepth(499);
    this.hudBg.fillStyle(0x080808, 0.72);
    this.hudBg.fillRect(12, 12, 330, 118);
    this.hudBg.lineStyle(3, 0x080808, 1);
    this.hudBg.strokeRect(12, 12, 330, 118);
    this.hudBg.lineStyle(1, 0xf4ecd8, 0.5);
    this.hudBg.strokeRect(15, 15, 324, 112);

    // Hearts — fixed with maxHP clamp (see update)
    this.hpText = ink(this.add.text(24, 20, 'HP: ', {
      fontFamily: '"Courier New", monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ff3d6e',
      stroke: '#080808',
      strokeThickness: 4,
    })).setDepth(500);

    // Mana crystals (real row when GameScene exposes mana; else cooldown pips)
    this.manaText = ink(this.add.text(24, 50, 'ROCKET: ', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#6effff',
      stroke: '#080808',
      strokeThickness: 3,
    })).setDepth(500);

    // Magic cooldown readout
    this.magicCdText = ink(this.add.text(24, 72, 'ROCKET: [READY]', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#6effff',
    })).setDepth(500);

    // Score + combo
    this.scoreText = ink(this.add.text(24, 92, 'SCORE 000000', {
      fontFamily: '"Courier New", monospace',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffb000',
      stroke: '#080808',
      strokeThickness: 3,
    })).setDepth(500);
    this.comboText = ink(this.add.text(230, 92, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ff3d6e',
      stroke: '#080808',
      strokeThickness: 3,
    })).setDepth(500);

    // ----- Top-center zone banner -----
    this.zoneBg = ink(this.add.graphics()).setDepth(499);
    this.zoneBg.fillStyle(0x080808, 0.72);
    this.zoneBg.fillRect(490, 12, 300, 30);
    this.zoneBg.lineStyle(2, 0x6effff, 0.8);
    this.zoneBg.strokeRect(490, 12, 300, 30);
    this.zoneText = ink(this.add.text(640, 27, 'FLOOR 1 — DESCENT', {
      fontFamily: '"Courier New", monospace',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#f4ecd8',
    })).setOrigin(0.5, 0.5).setDepth(500);

    // ----- Top-right progress -----
    this.progressFrame = ink(this.add.graphics()).setDepth(500);
    this.progressFill = ink(this.add.graphics()).setDepth(500);
    this.progressLabel = ink(this.add.text(1256, 14, '0%', {
      fontFamily: '"Courier New", monospace',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#6effff',
      stroke: '#080808',
      strokeThickness: 3,
    })).setOrigin(1, 0).setDepth(500);
    this.progressTitle = ink(this.add.text(1256, 34, 'DESCENT → STAIRS', {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      color: '#a0a0a0',
    })).setOrigin(1, 0).setDepth(500);

    // ----- Toast line (under zone banner) -----
    this.toastText = ink(this.add.text(640, 58, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#ffb000',
      stroke: '#080808',
      strokeThickness: 4,
    })).setOrigin(0.5, 0).setDepth(800).setAlpha(0);

    // ----- Controls footer -----
    this.footerBg = ink(this.add.graphics()).setDepth(499);
    this.footerBg.fillStyle(0x080808, 0.72);
    this.footerBg.fillRect(180, 688, 920, 24);
    this.footerBg.lineStyle(1, 0xf4ecd8, 0.35);
    this.footerBg.strokeRect(180, 688, 920, 24);
    this.controlsText = ink(this.add.text(640, 700,
      '[A/D] move  [W/SPACE] jump  [J] punch  [K] stomp  [L] rocket  [R] retry  [M] menu', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#6effff',
    })).setOrigin(0.5, 1).setDepth(500);

    // Release stamp — bottom-right, so players can tell which build is live.
    this.versionText = ink(this.add.text(1272, 712, 'v2.11', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#8a7a5a',
    })).setOrigin(1, 1).setDepth(500);

    // Global retry/menu keys — valid any time, not just on overlays
    // (GameScene binds no R/M keys, so there is no conflict).
    // ESC stays overlay-only (below) to avoid accidental quits mid-run.
    this._navigating = false;
    this.input.keyboard.on('keydown-R', () => this.restartGame());
    this.input.keyboard.on('keydown-M', () => this.goToMainMenu());

    // Lazy-bind: UIScene may launch a tick before GameScene.create finishes.
    this._lazyTries = 0;

    // Mark the UI ready AFTER all texts exist, and reset all instance state
    // on shutdown. Scenes are singletons: stop()+launch() reuses this same
    // object while destroying every display object — without this reset,
    // a 'zone' event fired during the NEXT GameScene.create would setText()
    // on a dead Text and take the whole boot down with it.
    this._uiReady = true;
    this.events.once('shutdown', () => {
      this._uiReady = false;
      this.gameScene = null;
      this._boundScene = null;
      this.toastQueue = [];
      this.toastActive = false;
      this.overlay = null;
      this._pendingZone = null;
      this._navigating = false;
      this._winFloor = undefined;
      this._winHasNext = false;
      this._descendArmed = false;
      this.winCredit = null;
    });

    // Apply any zone event that arrived before create() built the texts,
    // and flush any toasts queued while the UI was still booting.
    if (this._pendingZone && this.zoneText) {
      this.zoneText.setText(String(this._pendingZone).toUpperCase().slice(0, 34));
    }
    if (this.toastQueue && this.toastQueue.length) this._pumpToast();
  }

  bindToGame(gameScene) {
    if (!gameScene || this._boundScene === gameScene) {
      this.gameScene = gameScene || this.gameScene;
      return;
    }
    this.gameScene = gameScene;
    this._boundScene = gameScene;
    // Zone / toast events (gameplay agent contract). Guard: events may not
    // exist on a half-rewritten GameScene — never throw here.
    try {
      if (gameScene.events && typeof gameScene.events.on === 'function') {
        gameScene.events.off('zone', this._onZone, this);
        gameScene.events.off('toast', this._onToast, this);
        gameScene.events.on('zone', this._onZone, this);
        gameScene.events.on('toast', this._onToast, this);
      }
    } catch (e) { /* HUD must never break the game */ }
    // Checkpoint toasts also arrive via 'toast' events; nothing else to wire.
  }

  _onZone(name) {
    if (typeof name === 'string' && name.length) {
      // GameScene may emit 'zone' from inside its own create() — i.e. before
      // THIS scene's create() has built zoneText, or on a stale post-shutdown
      // instance. Stash always; touch display objects only when ready.
      this._pendingZone = name;
      if (this._uiReady && this.zoneText) {
        this.zoneText.setText(name.toUpperCase().slice(0, 34));
        this.flashBanner(name);
      }
    }
  }

  _onToast(msg) {
    if (!this.toastQueue) this.toastQueue = [];
    if (typeof msg === 'string' && msg.length) this.showToast(msg);
    else if (msg && typeof msg.text === 'string') this.showToast(msg.text, msg.color);
  }

  /* ---------------- Toast queue (zone banners / pickups) ---------------- */

  showToast(text, color = '#ffb000') {
    if (!this.toastQueue) this.toastQueue = [];
    this.toastQueue.push({ text: String(text).slice(0, 60), color });
    if (this._uiReady && !this.toastActive) this._pumpToast();
  }

  flashBanner(text) {
    this.showToast('★ ' + String(text).slice(0, 40) + ' ★', '#6effff');
  }

  _pumpToast() {
    // May be invoked from an event that fired before create() built the UI,
    // or on a stale post-shutdown instance. Never touch dead objects.
    if (!this._uiReady || !this.toastText || !this.tweens || !this.time) {
      this.toastActive = false;
      return;
    }
    const next = (this.toastQueue || []).shift();
    if (!next) {
      this.toastActive = false;
      return;
    }
    this.toastActive = true;
    this.toastText.setText(next.text);
    this.toastText.setColor(next.color);
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(0).setScale(0.8);
    this.tweens.add({
      targets: this.toastText,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1500, () => {
          this.tweens.add({
            targets: this.toastText,
            alpha: 0,
            y: 48,
            duration: 300,
            onComplete: () => {
              this.toastText.setY(58);
              this._pumpToast();
            },
          });
        });
      },
    });
  }

  /* ---------------- Per-frame HUD ---------------- */

  update() {
    // Lazy bind if GameScene wasn't ready at create time.
    if (!this.gameScene && this._lazyTries < 10) {
      this._lazyTries++;
      try {
        const gs = this.scene.get('GameScene');
        if (gs && gs.scene && gs.scene.isActive() && gs.player) this.bindToGame(gs);
      } catch (e) { /* retry next frame */ }
    }
    const g = this.gameScene;
    if (!this._uiReady || !g || !g.player) return;

    // ----- FPS next to the release stamp, hand-measured (frames per
    // wall-clock second, refreshed 2x/sec) — not Phaser's smoothed estimate.
    this._fpsFrames = (this._fpsFrames || 0) + 1;
    const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!this._fpsMark) this._fpsMark = nowMs;
    if (nowMs - this._fpsMark > 500) {
      const fps = Math.round((this._fpsFrames * 1000) / Math.max(1, nowMs - this._fpsMark));
      this._fpsFrames = 0;
      this._fpsMark = nowMs;
      if (this.versionText) this.versionText.setText(`v2.11 • ${fps} FPS`);
      this.versionText.setColor(fps >= 50 ? '#8a7a5a' : fps >= 30 ? '#ffaa3d' : '#ff3d3d');
    }

    // ----- HP hearts — THE BUG FIX -----
    // Old code: '░'.repeat(5 - hp) → RangeError when hp=8 (maxHP=8).
    // New: derive maxHP (>=1), clamp hp into [0, maxHP], both repeats >= 0.
    const rawMax = (typeof g.maxHP === 'number' && isFinite(g.maxHP)) ? Math.floor(g.maxHP) : 8;
    const maxHP = Math.max(1, Math.min(20, rawMax));
    const rawHp = (typeof g.hp === 'number' && isFinite(g.hp)) ? Math.floor(g.hp) : maxHP;
    const hp = Math.max(0, Math.min(maxHP, rawHp));
    const emptyCount = Math.max(0, maxHP - hp); // NEVER negative
    this.hpText.setText(`HP: ${'♥'.repeat(hp)}${'♡'.repeat(emptyCount)}`);
    this.hpText.setColor(hp <= Math.ceil(maxHP / 4) ? '#ff3d3d' : hp <= Math.ceil(maxHP / 2) ? '#ffaa3d' : '#ff3d6e');

    // ----- Mana crystals + cooldown -----
    const hasMana = (typeof g.mana === 'number' && typeof g.maxMana === 'number');
    if (hasMana) {
      const maxM = Math.max(1, Math.min(20, Math.floor(g.maxMana)));
      const mana = Math.max(0, Math.min(maxM, Math.floor(g.mana)));
      const emptyM = Math.max(0, maxM - mana); // NEVER negative
      this.manaText.setText(`ROCKET: ${'◆'.repeat(mana)}${'◇'.repeat(emptyM)}`);
      this.manaText.setColor(mana <= 0 ? '#888888' : '#6effff');
    } else {
      // Fallback while GameScene has no mana pool: pips from lastMagicAt.
      const now = (g.time && typeof g.time.now === 'number') ? g.time.now : 0;
      const last = (typeof g.lastMagicAt === 'number') ? g.lastMagicAt : -10000;
      const cdTotal = (typeof g.magicCd === 'number') ? g.magicCd : MAGIC_CD_FALLBACK;
      const remaining = Math.max(0, cdTotal - (now - last));
      if (remaining > 0) {
        const pips = Math.max(1, Math.ceil((remaining / cdTotal) * 4));
        this.manaText.setText(`ROCKET: ${'◆'.repeat(4 - pips)}${'◇'.repeat(pips)} charging…`);
        this.manaText.setColor('#888888');
      } else {
        this.manaText.setText('ROCKET: ◆◆◆◆ READY (Donut!)');
        this.manaText.setColor('#6effff');
      }
    }

    // Cooldown readout line
    {
      const now = (g.time && typeof g.time.now === 'number') ? g.time.now : 0;
      const last = (typeof g.lastMagicAt === 'number') ? g.lastMagicAt : -10000;
      const cdTotal = (typeof g.magicCd === 'number') ? g.magicCd : MAGIC_CD_FALLBACK;
      const cdRemaining = Math.max(0, cdTotal - (now - last));
      if (cdRemaining > 0) {
        this.magicCdText.setText(`COOLDOWN: ${(Math.ceil(cdRemaining / 100) / 10).toFixed(1)}s`);
        this.magicCdText.setColor('#888888');
      } else {
        this.magicCdText.setText('ROCKET: [READY] — press [L]!');
        this.magicCdText.setColor('#6effff');
      }
    }

    // ----- Score + combo -----
    const score = (typeof g.score === 'number' && isFinite(g.score)) ? Math.max(0, Math.floor(g.score)) : 0;
    const combo = (typeof g.combo === 'number' && isFinite(g.combo)) ? Math.max(0, Math.floor(g.combo)) : 0;
    this.scoreText.setText(`SCORE ${String(score).padStart(6, '0')}`);
    if (combo >= 2) {
      this.comboText.setText(`x${combo} COMBO!`);
      // Pulse combo text while it is live
      const s = 1 + Math.min(0.25, combo * 0.03);
      this.comboText.setScale(s);
    } else {
      this.comboText.setText('');
      this.comboText.setScale(1);
    }

    // ----- Zone name (live from GameScene when available) -----
    if (typeof g.zoneName === 'string' && g.zoneName.length) {
      const z = g.zoneName.toUpperCase().slice(0, 34);
      if (this.zoneText.text !== z) this.zoneText.setText(z);
    }

    // ----- Progress bar + % -----
    if (!g.won && !g.dead) {
      const endX = (typeof g.END_X === 'number') ? g.END_X
        : (typeof g.endX === 'number') ? g.endX : END_X_FALLBACK;
      const px = (typeof g.player.x === 'number') ? g.player.x : 0;
      const pct = Math.max(0, Math.min(1, px / Math.max(1, endX)));
      const barX = 1090;
      const barY = 16;
      const barW = 150;
      const barH = 12;
      this.progressFrame.clear();
      this.progressFrame.fillStyle(0x080808, 0.72);
      this.progressFrame.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
      this.progressFrame.lineStyle(2, 0x080808, 1);
      this.progressFrame.strokeRect(barX - 4, barY - 4, barW + 8, barH + 8);
      this.progressFrame.lineStyle(1, 0x6effff, 0.8);
      this.progressFrame.strokeRect(barX, barY, barW, barH);
      this.progressFill.clear();
      this.progressFill.fillStyle(0x6effff, 1);
      this.progressFill.fillRect(barX + 1, barY + 1, Math.max(0, (barW - 2) * pct), barH - 2);
      // Checkpoint tick (when GameScene exposes one)
      if (g.checkpoint && typeof g.checkpoint.x === 'number') {
        const cxp = barX + 1 + (barW - 2) * Math.max(0, Math.min(1, g.checkpoint.x / Math.max(1, endX)));
        this.progressFill.fillStyle(0xffb000, 1);
        this.progressFill.fillRect(cxp - 1, barY - 2, 2, barH + 4);
      }
      this.progressLabel.setText(`${Math.floor(pct * 100)}%`);
    } else if (g.won) {
      this.progressLabel.setText('100% ★');
    }
  }

  /* ---------------- Overlays ---------------- */

  _scoreLine() {
    const g = this.gameScene || {};
    const score = (typeof g.score === 'number' && isFinite(g.score)) ? Math.max(0, Math.floor(g.score)) : 0;
    const combo = (typeof g.combo === 'number' && isFinite(g.combo)) ? Math.max(0, Math.floor(g.combo)) : 0;
    return { score, combo };
  }

  showWin(achievements = [], floor = 1, hasNext = false, title = null, sub = null) {
    if (this.overlay) return;
    this.overlay = true;
    this._winFloor = floor;
    this._winHasNext = hasNext;
    const { score, combo } = this._scoreLine();
    const ach = (Array.isArray(achievements) && achievements.length)
      ? achievements.slice(0, 4)
      : [{ id: 'participant', title: 'PARTICIPANT', quip: "You showed up. That's... something." }];
    this.add.rectangle(640, 360, 1280, 720, 0x0a0a0a, 0.88)
      .setScrollFactor(0).setDepth(1000);
    // Burst behind title
    const burst = this.add.graphics().setScrollFactor(0).setDepth(1000);
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const r = i % 2 === 0 ? 300 : 238;
      const a = (Math.PI * i) / 12 - Math.PI / 2;
      pts.push(new Phaser.Math.Vector2(640 + Math.cos(a) * r, 185 + Math.sin(a) * r * 0.42));
    }
    burst.fillStyle(0xffb000, 1);
    burst.lineStyle(5, 0x080808, 1);
    burst.fillPoints(pts, true);
    burst.strokePoints(pts, true);
    this.add.text(640, 185, title || `FLOOR ${floor} CLEARED!`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '52px',
      fontStyle: 'bold',
      color: '#0a0a0a',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 262, sub || (hasNext
      ? 'Carl and Donut take the stairs… Floor 2 awaits.'
      : 'The dungeon shudders below… TO BE CONTINUED.'), {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      fontStyle: 'italic',
      color: '#f4ecd8',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 300, `SCORE ${String(score).padStart(6, '0')}${combo >= 2 ? `   •   BEST x${combo} COMBO` : ''}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '21px',
      fontStyle: 'bold',
      color: '#ffb000',
      stroke: '#080808',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    // Goofy achievement plaques — worth nothing, mean everything.
    let ay = 352;
    for (const a of ach) {
      const plaque = this.add.graphics().setScrollFactor(0).setDepth(1001);
      plaque.fillStyle(0x14080a, 1);
      plaque.fillRoundedRect(640 - 300, ay, 600, 58, 6);
      plaque.lineStyle(3, 0xffc93d, 1);
      plaque.strokeRoundedRect(640 - 300, ay, 600, 58, 6);
      this.add.text(640, ay + 13, `★ ACHIEVEMENT UNLOCKED: ${a.title} ★`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#6effff',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1002);
      this.add.text(640, ay + 35, a.quip, {
        fontFamily: '"Courier New", monospace',
        fontSize: '13px',
        fontStyle: 'italic',
        color: '#f4ecd8',
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1002);
      ay += 66;
    }
    if (hasNext) {
      // THE way down: pulsing descend prompt. SPACE/click descends,
      // R retries the floor, M/ESC back to the cover.
      const prompt = this.add.text(640, ay + 16, `[ SPACE ] — DESCEND TO FLOOR ${floor + 1}!`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#0a0a0a',
        backgroundColor: '#4df3ff',
        padding: { x: 14, y: 6 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
      this.tweens.add({
        targets: prompt, alpha: { from: 1, to: 0.55 }, duration: 600,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.add.text(640, ay + 58, '[ R ] — retry    [ M ] — main menu    [ ESC ] — menu', {
        fontFamily: '"Courier New", monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#6effff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
      this._descendArmed = true;
    } else {
      this.add.text(640, ay + 12, '[ R ] — retry    [ M ] — main menu    [ ESC ] — menu', {
        fontFamily: '"Courier New", monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#6effff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    }

    // R/M already handled globally; ESC is overlay-only.
    this.input.keyboard.once('keydown-ESC', () => this.goToMainMenu());
    if (hasNext) {
      // SPACE on the clear panel goes DOWN. (Safe: GameScene.update
      // returns early while won, so this never double-fires a jump.)
      this.input.keyboard.once('keydown-SPACE', () => this.descendToNext());
      this.input.on('pointerdown', () => this.descendToNext());
    } else {
      // Final panel: credit Matt Dinniman + the book link (clickable —
      // clicks on it must NOT also retry, same guard pattern as the menu).
      this.winCredit = this.add.text(
        640, ay + 44,
        'a fan game honoring DUNGEON CRAWLER CARL by Matt Dinniman — mattdinniman.com',
        {
          fontFamily: '"Courier New", monospace',
          fontSize: '12px',
          color: '#8ad8ff',
        },
      ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1002)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (typeof window !== 'undefined') {
            window.open('https://mattdinniman.com/books/dungeon-crawler-carl/', '_blank', 'noopener');
          }
        })
        .on('pointerover', function () { this.setColor('#ffffff'); })
        .on('pointerout', function () { this.setColor('#8ad8ff'); });
      this.input.on('pointerdown', (pointer) => {
        if (pointer && pointer.x !== undefined && this.winCredit) {
          const b = this.winCredit.getBounds();
          if (b) {
            const pad = 14;
            if (Math.abs(pointer.x - b.centerX) < b.width / 2 + pad &&
                Math.abs(pointer.y - b.centerY) < b.height / 2 + pad) return;
          }
        }
        this.restartGame();
      });
    }
  }

  // Floor 1 clear → Floor 2. Guarded: fires once, win-panel only.
  // Mirrors restartGame's deferred pattern (self stop+launch in one tick
  // is silently dropped by the SceneManager).
  descendToNext() {
    if (!this._descendArmed || this._navigating) return;
    this._navigating = true;
    // NOTE: floor 0 is falsy — nullish check, not ||, or Floor 0 skips to 2.
    const next = (this._winFloor !== undefined ? this._winFloor : 1) + 1;
    const g = this.gameScene;
    if (g) {
      g.registry.set('score', g.score);
      g.registry.set('maxHP', g.maxHP);
      g.registry.set('maxMana', g.maxMana);
      g.registry.set('punchDmg', g.punchDmg);
      g.registry.set('floor', next);
    }
    this.scene.stop('GameScene');
    // start() stops the caller (this UIScene) and boots GameScene with data.
    this.scene.start('GameScene', { floor: next });
    setTimeout(() => {
      try {
        const sm = this.game.scene;
        if (sm.isActive('GameScene') && !sm.isActive('UIScene')) sm.start('UIScene');
      } catch (e) { /* HUD must never break the game */ }
    }, 60);
  }

  showDeath(reason) {
    if (this.overlay) return;
    this.overlay = true;
    const { score } = this._scoreLine();

    const reasonText = {
      pit: 'Carl fell into the abyss.',
      enemy: 'Carl was overwhelmed by dungeon creatures.',
    }[reason] || 'Carl has died.';

    this.add.rectangle(640, 360, 1280, 720, 0x0a0a0a, 0.88)
      .setScrollFactor(0).setDepth(1000);
    this.add.text(640, 250, 'CARL HAS FALLEN', {
      fontFamily: '"Courier New", monospace',
      fontSize: '60px',
      fontStyle: 'bold',
      color: '#ff3d3d',
      stroke: '#080808',
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 330, reasonText, {
      fontFamily: '"Courier New", monospace',
      fontSize: '19px',
      color: '#f4ecd8',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 362, 'Donut screams. The dungeon laughs.', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      fontStyle: 'italic',
      color: '#a0a0a0',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 384, 'GOAL: cross 3 zones alive — grab HAM/CRYSTAL, take the STAIRS DOWN.', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      color: '#6effff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 410, `SCORE ${String(score).padStart(6, '0')}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffb000',
      stroke: '#080808',
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.add.text(640, 478, '[ R ] — retry    [ M ] — main menu    [ ESC ] — give up', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffb000',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    // R/M already handled globally; ESC is overlay-only.
    this.input.keyboard.once('keydown-ESC', () => this.goToMainMenu());
  }

  // Properly stop BOTH scenes first, then restart fresh.
  // Guarded: a single keypress can hit the global + overlay listeners.
  restartGame() {
    if (this._navigating) return;
    this._navigating = true;
    this.scene.stop('GameScene');
    // start() stops the caller (this UIScene) and boots a fresh GameScene.
    this.scene.start('GameScene');
    // NOTE: relaunching OURSELVES in the same tick as our own stop is silently
    // dropped by the SceneManager (verified live: UIScene stayed off), and the
    // stopped ScenePlugin can't relaunch us later either. So: plain setTimeout
    // (always fires, unlike scene-clock timers that die with us) + the
    // SceneManager directly (manager.start boots without stopping anything).
    // Guarded in case the user hit M (menu) in between — then there is no
    // GameScene to HUD for, and we stay off.
    setTimeout(() => {
      try {
        const sm = this.game.scene;
        if (sm.isActive('GameScene') && !sm.isActive('UIScene')) sm.start('UIScene');
      } catch (e) { /* HUD must never break the game */ }
    }, 60);
  }

  // Properly stop BOTH scenes first, then return to menu.
  goToMainMenu() {
    if (this._navigating) return;
    this._navigating = true;
    if (this.scene.isActive('GameScene')) this.scene.stop('GameScene');
    this.scene.stop('UIScene');
    this.scene.start('MenuScene');
  }
}
