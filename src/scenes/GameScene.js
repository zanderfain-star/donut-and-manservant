import Phaser from 'phaser';
import { SpriteFactory } from '../entities/SpriteFactory.js';

/*
 * GameScene — Floor 1.
 *
 * Architecture:
 *   - Carl's collision/position is driven by an invisible Arcade sprite
 *     (this.player) at the body's center.
 *   - Carl's visual is a SpriteFactory container (this.carlVis) drawn at the
 *     body's position. Container origin is (0.5, 1.0) — feet at the body
 *     center. We DON'T setOffset with negative numbers; instead we position
 *     the body so its bottom edge is on the floor.
 *   - Enemies are real sprites that patrol platforms. They can be killed by
 *     punch (melee), stomp (downward), or magic missile (ranged).
 *   - Player has HP, can take damage with invulnerability frames.
 *   - Reaching x > END_X triggers win. HP reaching 0 triggers death.
 */

const WORLD_WIDTH = 6400;
const WORLD_HEIGHT = 720;
const FLOOR_Y = 688;
const END_X = 6000;

const PLAYER = {
  maxHP: 5,
  speed: 280,
  jump: 520,
  accel: 1400,
  drag: 900,
  hurtIFrames: 800,
};

const ENEMY = {
  speed: 80,
  patrol: 140,
  hp: 1,
};

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // ----- WORLD BACKGROUND -----
    this.buildBackground();

    // ----- PHYSICS WORLD -----
    this.floorGroup = this.physics.add.staticGroup();
    this.platformGroup = this.physics.add.staticGroup();

    // Solid ground, but with two real bottomless pits removed
    const PITS = [
      { x1: 2050, x2: 2200 },
      { x1: 4250, x2: 4400 },
    ];
    const isInPit = (x) => PITS.some((p) => x >= p.x1 && x < p.x2);

    for (let x = 0; x < WORLD_WIDTH; x += 64) {
      if (isInPit(x)) continue;
      this.floorGroup.create(x + 32, FLOOR_Y + 32, 'floor_tile').refreshBody();
    }

    // Platform layout — climb, gap, fall-into-pit survival, etc.
    const platformDefs = [
      // [x, y, w, h]   (h is fixed at 32)
      [300, 540, 192, 32],
      [620, 460, 192, 32],
      [900, 520, 192, 32],
      [1180, 400, 128, 32],
      [1400, 480, 192, 32],
      [1680, 380, 160, 32],
      [1900, 540, 224, 32],
      [2220, 420, 192, 32],
      [2500, 500, 192, 32],
      [2780, 380, 160, 32],
      [3040, 480, 192, 32],
      [3300, 540, 224, 32],
      [3600, 420, 192, 32],
      [3880, 500, 192, 32],
      [4160, 380, 160, 32],
      [4440, 480, 192, 32],
      [4720, 540, 224, 32],
      [5000, 420, 192, 32],
      [5280, 500, 192, 32],
      [5560, 380, 192, 32],
    ];
    for (const [x, y, w] of platformDefs) {
      const p = this.platformGroup.create(x + w / 2, y + 16, 'platform');
      p.setDisplaySize(w, 32).refreshBody();
    }

    // Two bottomless pits — fall to your death. Mark them as transparent gaps.
    // Pit 1: x 2050..2200 — no floor tiles here
    // Pit 2: x 4250..4400 — no floor tiles here
    // (We'll mask by repositioning floorGroup children. Simpler: just don't
    //  place tiles there. We'll add kill-zones below.)

    // ----- PLAYER -----
    // Sprite origin = top-left at sprite.x, sprite.y. We want the body's
    // bottom edge at FLOOR_Y=688 so Carl's feet stand on the floor.
    //
    // sprite.y = FLOOR_Y - 24 = 664
    // body height = 88 (matches Carl sprite at 2× scale = 128 tall)
    // body bottom = 664 + offsetY + 88 = 688 → offsetY = -64
    // Horizontal: center body on sprite.x → offsetX = -22 (half of 44)
    this.player = this.physics.add.sprite(120, FLOOR_Y - 24, 'blank');
    this.player.setVisible(false);
    this.player.body.setSize(44, 88).setOffset(-22, -64);
    this.player.setMaxVelocity(PLAYER.speed, 900);
    this.player.setDragX(PLAYER.drag);
    this.player.setAccelerationX(PLAYER.accel);

    // Visual Carl
    this.carlVis = SpriteFactory.createCarl(this, this.player.x, this.player.y);
    this.carlVis.setDepth(20);

    // Donut
    this.donutVis = SpriteFactory.createDonut(this, this.player.x, this.player.y - 40);
    this.donutVis.setDepth(21);

    // ----- STATE -----
    this.hp = PLAYER.maxHP;
    this.lastHurtAt = -10000;
    this.lastPunchAt = 0;
    this.lastMagicAt = 0;
    this.won = false;
    this.dead = false;
    this.donutOrbitT = 0;

    // ----- ENEMIES -----
    this.enemies = this.physics.add.group();
    this.spawnEnemies();

    // ----- PROJECTILES -----
    this.missiles = this.physics.add.group({
      defaultKey: 'magic_missile',
      maxSize: 12,
      runChildUpdate: false,
    });

    // ----- KILL ZONES (pits) -----
    // Each kill zone is a tall zone below the missing-floor gap. The moment
    // the player falls into it (overlap), they die. World bounds don't
    // exist on Y by default — make sure player can fall freely by setting
    // collideWorldBounds=false on Y.
    this.player.setCollideWorldBounds(false, false, false, false);
    // World bounds — fall freely below the floor (for pits), but no flying out the top/sides.
    // Phaser 3 signature: setBounds(x, y, width, height, centerOn, checkLeft, checkRight, checkUp, checkDown)
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT, false, true, true, false, false);

    this.killZones = [
      { x1: 2050, x2: 2200 },
      { x1: 4250, x2: 4400 },
    ];
    this.killBodies = [];
    for (const k of this.killZones) {
      const w = k.x2 - k.x1;
      const z = this.add.zone(k.x1 + w / 2, FLOOR_Y + 200, w, 400).setOrigin(0.5, 0);
      this.physics.add.existing(z, true);
      this.killBodies.push(z);
    }

    // Goal flag (visual)
    this.add.image(END_X - 80, FLOOR_Y - 32, 'goal_flag').setDepth(15);

    // ----- COLLISIONS -----
    this.physics.add.collider(this.player, this.floorGroup);
    this.physics.add.collider(this.player, this.platformGroup);
    this.physics.add.collider(this.enemies, this.floorGroup);
    this.physics.add.collider(this.enemies, this.platformGroup);
    this.physics.add.collider(this.missiles, this.floorGroup, (m) => this.killMissile(m));
    this.physics.add.collider(this.missiles, this.platformGroup, (m) => this.killMissile(m));

    this.physics.add.overlap(this.player, this.enemies, (_, e) => this.playerHitsEnemy(e));
    this.physics.add.overlap(this.player, this.killBodies, () => this.killPlayer('pit'));

    // ----- INPUT -----
    this.keys = this.input.keyboard.addKeys({
      left: 'A', right: 'D',
      jump: 'W', jumpAlt: 'SPACE', jumpArrow: 'UP',
      punch: 'J', stomp: 'K', magic: 'L',
    });
    // Disable any stuck state from prior scenes
    this.input.keyboard.resetKeys();

    // Camera follows Carl
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(120, 60);

    // Background parallax layer — scrolls slower than camera
    this.bgFar = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'bg_far')
      .setOrigin(0, 0)
      .setScrollFactor(0.2, 0)
      .setDepth(0)
      .setAlpha(0.6);

    // ----- HUD -----
    this.createHUD();
  }

  /* ==========================================================
   * WORLD BUILDING
   * ========================================================== */

  buildBackground() {
    // Distant etching silhouettes — atmospheric, NOT solid black
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const W = 1024;
    const H = WORLD_HEIGHT;
    // Vertical gradient sky: deep indigo top → ink black near horizon
    for (let y = 0; y < H; y += 4) {
      const t = y / H;
      const r = Math.floor(0x0a * (1 - t) + 0x04 * t);
      const gC = Math.floor(0x0a * (1 - t) + 0x02 * t);
      const b = Math.floor(0x18 * (1 - t) + 0x08 * t);
      g.fillStyle((r << 16) | (gC << 8) | b, 1);
      g.fillRect(0, y, W, 4);
    }
    // Distant gothic spires silhouettes
    g.fillStyle(0x05050a, 1);
    const spires = [80, 180, 260, 380, 480, 620, 720, 880];
    for (const x of spires) {
      const baseY = 480;
      const h = 80 + Math.sin(x) * 40 + 60;
      const w = 30 + Math.sin(x * 1.3) * 15;
      g.fillRect(x, baseY, w, H - baseY);
      g.fillTriangle(x, baseY, x + w, baseY, x + w / 2, baseY - h);
    }
    g.generateTexture('bg_far', W, H);
    g.destroy();
  }

  spawnEnemies() {
    // Patrol enemies — spawn on platforms so they're an actual threat
    const spawns = [
      { x: 380, y: 480, range: 120 },
      { x: 700, y: 400, range: 140 },
      { x: 1280, y: 340, range: 80 },
      { x: 1500, y: 420, range: 140 },
      { x: 1900, y: 480, range: 160 },
      { x: 2300, y: 360, range: 130 },
      { x: 2700, y: 440, range: 130 },
      { x: 3100, y: 420, range: 130 },
      { x: 3500, y: 480, range: 160 },
      { x: 3800, y: 360, range: 130 },
      { x: 4200, y: 440, range: 130 },
      { x: 4600, y: 420, range: 130 },
      { x: 5000, y: 360, range: 130 },
      { x: 5400, y: 440, range: 130 },
      { x: 5700, y: 320, range: 130 },
    ];

    for (const s of spawns) {
      const e = this.enemies.create(s.x, s.y, 'enemy');
      e.setTint(0x8a1a1a);
      e.body.setSize(20, 24).setOffset(6, 4);
      e.hp = ENEMY.hp;
      e.alive = true;
      e.patrolHomeX = s.x;
      e.patrolRange = s.range;
      e.patrolDir = 1;

      // Stomp trigger zone — small zone above enemy's head
      const stompZone = this.add.zone(e.x, e.y - 8, 28, 16).setOrigin(0.5, 0);
      stompZone.ownerEnemy = e;
      e.stompZone = stompZone;
      this.physics.add.existing(stompZone, true);
    }
  }

  createHUD() {
    const cam = this.cameras.main;
    // HUD lives in the UIScene (parallel scene); this method just signals it.
    // We use UIScene for HUD so it stays fixed to camera and isn't affected
    // by world updates. See UIScene.update() reading gameState.
    const ui = this.scene.get('UIScene');
    ui.bindToGame(this);
  }

  /* ==========================================================
   * MAIN LOOP
   * ========================================================== */

  update(time, delta) {
    if (this.dead || this.won) {
      this.idleVisuals(delta);
      return;
    }
    const dt = delta / 1000;
    const body = this.player.body;
    const onGround = body.blocked.down || body.touching.down;

    // ----- Movement -----
    if (this.keys.left.isDown) {
      body.setAccelerationX(-PLAYER.accel);
      this.carlVis.setFacing(-1);
    } else if (this.keys.right.isDown) {
      body.setAccelerationX(PLAYER.accel);
      this.carlVis.setFacing(1);
    } else {
      body.setAccelerationX(0);
    }

    // Walk anim
    const moving = Math.abs(body.velocity.x) > 30;
    if (moving && onGround) this.carlVis.playWalk();
    else this.carlVis.playIdle();

    // Jump (use JustDown so it doesn't hold)
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jumpAlt) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jumpArrow);
    if (jumpPressed && onGround) {
      body.setVelocityY(-PLAYER.jump);
    }

    // Punch
    if (Phaser.Input.Keyboard.JustDown(this.keys.punch) && time - this.lastPunchAt > 280) {
      this.lastPunchAt = time;
      this.doPunch();
    }

    // Stomp (only mid-air, only when descending)
    if (Phaser.Input.Keyboard.JustDown(this.keys.stomp) && !onGround && body.velocity.y > -50) {
      body.setVelocityY(700);
      this.doStomp();
    }

    // Magic missile
    if (Phaser.Input.Keyboard.JustDown(this.keys.magic) && time - this.lastMagicAt > 400) {
      this.lastMagicAt = time;
      this.doMagicMissile();
    }

    // ----- Enemies AI -----
    this.updateEnemies(dt);

    // ----- Sync visuals -----
    // Body bottom = player.y + offsetY + height = player.y - 64 + 88 = player.y + 24.
    // Container origin is (0.5, 1.0) so container.y is the feet anchor.
    this.carlVis.x = this.player.x;
    this.carlVis.y = this.player.y + 24;

    // Donut orbits Carl's head
    this.donutOrbitT += dt * 3.2;
    const oRadius = 36;
    this.donutVis.x = this.player.x + Math.cos(this.donutOrbitT) * oRadius;
    this.donutVis.y = this.player.y + Math.sin(this.donutOrbitT) * 10 + this.donutVis._floatOffsetY;

    // ----- Win check -----
    if (this.player.x >= END_X) {
      this.won = true;
      this.cameras.main.flash(400, 110, 255, 255);
      this.scene.get('UIScene').showWin();
    }
  }

  idleVisuals(delta) {
    // Keep visuals updating slightly so it doesn't look frozen on death
    this.donutOrbitT += delta / 1000 * 1.6;
    this.donutVis.x = this.player.x + Math.cos(this.donutOrbitT) * 24;
    this.donutVis.y = this.player.y + Math.sin(this.donutOrbitT) * 8 + this.donutVis._floatOffsetY;
  }

  /* ==========================================================
   * COMBAT
   * ========================================================== */

  doPunch() {
    const dir = this.carlVis.facing;
    // Punch at body center height (carlVis.y is feet, body center is feet - 44)
    const x = this.carlVis.x + dir * 36;
    const y = this.carlVis.y - 56;

    // Visible arc
    const arc = this.add.image(x, y, 'punch_arc').setTint(0xffb000).setScale(1.4).setDepth(25);
    this.tweens.add({
      targets: arc,
      alpha: 0,
      scale: 2.4,
      duration: 200,
      onComplete: () => arc.destroy(),
    });

    // Hitbox — short-lived, no permanent collider
    const hb = this.add.rectangle(x, y, 64, 80, 0xffb000, 0).setDepth(25);
    this.physics.add.existing(hb);
    hb.body.setAllowGravity(false);
    hb.body.setImmovable(true);
    this.time.delayedCall(140, () => hb.destroy());

    // Check enemies in hitbox (one-shot, no permanent collider)
    this.enemies.getChildren().forEach((e) => {
      if (!e.alive) return;
      if (Math.abs(e.x - x) < 40 && Math.abs(e.y - y) < 48) {
        this.damageEnemy(e, 1, 'punch');
      }
    });
  }

  doStomp() {
    const x = this.carlVis.x;
    const y = this.carlVis.y;
    // Shockwave ring
    const ring = this.add.circle(x, y + 4, 6, 0xffb000, 0.7).setDepth(25);
    this.tweens.add({
      targets: ring,
      radius: 80,
      alpha: 0,
      duration: 320,
      onComplete: () => ring.destroy(),
    });

    // Hitbox near Carl's feet
    this.enemies.getChildren().forEach((e) => {
      if (!e.alive) return;
      if (Math.abs(e.x - x) < 60 && Math.abs(e.y - y) < 40) {
        this.damageEnemy(e, 99, 'stomp'); // one-shot kill
      }
    });
  }

  doMagicMissile() {
    const dir = this.carlVis.facing;
    const startX = this.carlVis.x + dir * 32;
    // Aim at body center (Carl's eye level on Donut)
    const startY = this.carlVis.y - 48;

    const m = this.missiles.get(startX, startY);
    if (!m) return;
    m.setActive(true).setVisible(true);
    m.body.setAllowGravity(false);
    m.body.setCircle(8, 4, 4);
    m.body.setVelocity(720 * dir, 0);
    m.setTint(0x6effff);
    m.setDepth(25);
    m.dmg = 1;
    m.dir = dir;

    // Trail — bounded, stops when missile dies or after 3s
    let elapsed = 0;
    const trail = this.time.addEvent({
      delay: 30,
      repeat: 99,
      callback: () => {
        elapsed += 30;
        if (!m.active || elapsed > 3000) {
          trail.remove(false);
          return;
        }
        const p = this.add.circle(m.x, m.y, 4, 0x6effff, 0.7).setDepth(24);
        this.tweens.add({
          targets: p,
          alpha: 0,
          scale: 2.5,
          duration: 220,
          onComplete: () => p.destroy(),
        });
      },
    });

    // Each frame, check for direct collision with enemies (since the
    // physics overlap on a pooled missile is unreliable)
    const checkCollide = this.time.addEvent({
      delay: 16,
      repeat: 250,
      callback: () => {
        if (!m.active) { checkCollide.remove(false); return; }
        this.enemies.getChildren().forEach((e) => {
          if (!e.alive) return;
          if (Math.abs(e.x - m.x) < 28 && Math.abs(e.y - m.y) < 32) {
            this.damageEnemy(e, 1, 'magic');
            this.killMissile(m);
            checkCollide.remove(false);
          }
        });
      },
    });

    // Cleanup safety
    this.time.delayedCall(4000, () => {
      if (m.active) this.killMissile(m);
    });
  }

  killMissile(m) {
    if (!m.active) return;
    m.setActive(false).setVisible(false);
    m.body.setVelocity(0, 0);
  }

  /* ==========================================================
   * ENEMIES
   * ========================================================== */

  updateEnemies(dt) {
    this.enemies.getChildren().forEach((e) => {
      if (!e.alive) return;

      // Patrol
      const target = e.patrolHomeX + e.patrolDir * e.patrolRange;
      if (e.patrolDir === 1 && e.x >= target) e.patrolDir = -1;
      else if (e.patrolDir === -1 && e.x <= target) e.patrolDir = 1;
      e.body.setVelocityX(e.patrolDir * ENEMY.speed);

      // Face the player if close (visual)
      const distToPlayer = this.player.x - e.x;
      if (Math.abs(distToPlayer) < 200) {
        e.setFlipX(distToPlayer < 0);
      } else {
        e.setFlipX(e.patrolDir < 0);
      }
    });
  }

  damageEnemy(e, amount, source) {
    if (!e.alive) return;
    e.hp -= amount;

    // Visual feedback
    e.setTint(0xff3d6e);
    this.tweens.add({
      targets: e,
      alpha: 0.3,
      yoyo: true,
      duration: 80,
      repeat: 1,
      onComplete: () => {
        if (!e.alive) return;
        e.clearTint();
        e.setAlpha(1);
      },
    });

    // Knockback away from Carl
    const dir = e.x < this.player.x ? 1 : -1;
    e.body.setVelocity(dir * 200, -150);

    if (e.hp <= 0) {
      this.killEnemy(e, source);
    }
  }

  killEnemy(e, source) {
    if (!e.alive) return;
    e.alive = false;
    e.body.setEnable(false);
    e.setTint(0x300808);

    // Death FX
    const dir = e.x < this.player.x ? 1 : -1;
    this.tweens.add({
      targets: e,
      alpha: 0,
      y: e.y - 30,
      x: e.x + dir * 40,
      angle: dir * 180,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        e.destroy();
        if (e.stompZone) e.stompZone.destroy();
      },
    });

    // Small particle burst
    for (let i = 0; i < 6; i++) {
      const p = this.add.circle(e.x, e.y, 3, 0xff3d6e, 0.9).setDepth(25);
      this.tweens.add({
        targets: p,
        x: e.x + (Math.random() - 0.5) * 80,
        y: e.y + (Math.random() - 0.5) * 60 - 20,
        alpha: 0,
        duration: 400,
        onComplete: () => p.destroy(),
      });
    }

    // Stomp → small upward bounce on Carl
    if (source === 'stomp') {
      this.player.body.setVelocityY(-380);
    }
  }

  /* ==========================================================
   * PLAYER DAMAGE / DEATH
   * ========================================================== */

  playerHitsEnemy(e) {
    if (!e.alive) return;
    if (this.dead) return;

    const now = this.time.now;
    if (now - this.lastHurtAt < PLAYER.hurtIFrames) return;
    this.lastHurtAt = now;

    // Check stomp: is player falling onto the enemy from above?
    const playerFeetY = this.player.y + 24;
    const enemyHeadY = e.y - 16;
    const stompOK =
      this.player.body.velocity.y > 50 &&
      playerFeetY < enemyHeadY + 8;

    if (stompOK) {
      // Bounce off, kill enemy
      this.player.body.setVelocityY(-420);
      this.damageEnemy(e, 99, 'stomp');
      return;
    }

    // Otherwise take damage
    this.hp -= 1;
    this.cameras.main.shake(140, 0.006);

    // Red flash on the COLOR sprite only (outline stays crisp)
    this.carlVis.colorSprite.setTint(0xff0000);
    this.time.delayedCall(180, () => {
      if (!this.dead) this.carlVis.colorSprite.setTint(0xffffff);
    });

    // Knockback
    const kb = this.player.x < e.x ? -1 : 1;
    this.player.body.setVelocity(kb * 280, -260);

    if (this.hp <= 0) this.killPlayer('enemy');
  }

  killPlayer(reason) {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    this.player.body.setVelocity(0, 0);
    this.player.body.setEnable(false);

    // Big visual death — Carl ragdolls, Donut freaks out
    this.cameras.main.shake(400, 0.015);
    this.cameras.main.flash(200, 80, 0, 0);

    this.tweens.add({
      targets: this.carlVis,
      angle: 90,
      alpha: 0.4,
      y: this.carlVis.y + 200,
      duration: 800,
      ease: 'Cubic.easeIn',
    });

    // Donut panics
    this.tweens.add({
      targets: this.donutVis,
      x: this.donutVis.x + (Math.random() - 0.5) * 200,
      y: this.donutVis.y - 80,
      alpha: 0.3,
      duration: 400,
      yoyo: true,
      repeat: 2,
    });

    this.time.delayedCall(1200, () => {
      this.scene.get('UIScene').showDeath(reason);
    });
  }
}