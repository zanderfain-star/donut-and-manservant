import Phaser from 'phaser';
import { SpriteFactory } from '../entities/SpriteFactory.js';
import { PAL } from '../palette.js';

/*
 * BootScene — COMIC TEXTURE PASS
 * ------------------------------
 * Generates every shared texture in bold cartoon style: thick #14101a
 * ink, flat punchy fills, cel highlight blobs. Characters (Carl/Donut)
 * come from SpriteFactory; everything else is built here.
 *
 * Texture keys (all backward-compat):
 *   blank, magic_missile (28px Donut eye-rocket), punch_arc, punch_fist,
 *   stomp_boot, pow_burst,
 *   enemy_goblin (+ enemy/enemy_chomper aliases), enemy_tinker (+ enemy_spitter),
 *   enemy_trog (+ enemy_brute), enemy_rat,
 *   pickup_ham, pickup_star, pickup_crystal,
 *   floor_tile (96x64), platform (128x40), goal_flag
 */

const INK = PAL.ink;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Entity-quality Carl + Donut come from SpriteFactory.
    SpriteFactory.generate(this);
    this.makePlaceholderTextures();
  }

  // Draw with `fn(g)` and register under every key in `keys`.
  // Skips keys that already exist (scene restarts / HMR safe).
  stamp(keys, w, h, fn) {
    const fresh = keys.filter((k) => !this.textures.exists(k));
    if (fresh.length === 0) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    fn(g);
    for (const k of fresh) g.generateTexture(k, w, h);
    g.destroy();
  }

  makePlaceholderTextures() {
    // 1x1 transparent — invisible sprite body for physics-only entities
    this.stamp(['blank'], 1, 1, (g) => {
      g.fillStyle(0x000000, 0);
      g.fillRect(0, 0, 1, 1);
    });

    // ---------------- PER-FLOOR BACKGROUNDS (1024x720) ----------------
    // bg_cinder (F2): ember-cracked dark rock, lava glow low.
    this.stamp(['bg_cinder'], 1024, 720, (g) => {
      for (let y = 0; y < 720; y += 4) {
        const t = y / 720;
        const r = Math.floor(0x14 * (1 - t) + 0x3a * t);
        const gg = Math.floor(0x08 * (1 - t) + 0x10 * t);
        const b = Math.floor(0x10 * (1 - t) + 0x06 * t);
        g.fillStyle((r << 16) | (gg << 8) | b, 1);
        g.fillRect(0, y, 1024, 4);
      }
      // basalt columns
      g.fillStyle(0x0a0608, 1);
      let seed = 31;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let x = 0; x < 1024; x += 90 + rnd() * 80) {
        const w = 50 + rnd() * 60;
        const h = 200 + rnd() * 260;
        g.fillRect(x, 720 - h, w, h);
        g.lineStyle(2, 0xff5a20, 0.5);
        g.lineBetween(x + 6, 720 - h + 20, x + 6, 700);
      }
      // ember cracks
      g.lineStyle(3, 0xff7a20, 0.9);
      for (let i = 0; i < 14; i++) {
        const ex = rnd() * 1024;
        const ey = 420 + rnd() * 280;
        g.lineBetween(ex, ey, ex + 20 + rnd() * 40, ey - 10 - rnd() * 20);
      }
      g.fillStyle(0xffc93d, 1);
      for (let i = 0; i < 40; i++) g.fillCircle(rnd() * 1024, 480 + rnd() * 230, 1.6);
    });

    // bg_overcity (F3): dead grey sky over a drowned volcano rim city.
    this.stamp(['bg_overcity'], 1024, 720, (g) => {
      for (let y = 0; y < 720; y += 4) {
        const t = y / 720;
        const v = Math.floor(0x3a * (1 - t) + 0x0c * t);
        g.fillStyle((v << 16) | (v << 8) | (v + 8), 1);
        g.fillRect(0, y, 1024, 4);
      }
      // volcano rim arc across the top
      g.fillStyle(0x060608, 1);
      g.fillEllipse(512, -140, 1300, 300);
      g.lineStyle(3, 0x8a2a1a, 0.8);
      g.beginPath();
      g.arc(512, -140, 640, 0.15 * Math.PI, 0.85 * Math.PI, false);
      g.strokePath();
      // ruined slabs skyline
      g.fillStyle(0x101014, 1);
      let seed = 77;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let x = 0; x < 1024; x += 70 + rnd() * 90) {
        const w = 44 + rnd() * 70;
        const h = 120 + rnd() * 200;
        const tilt = (rnd() - 0.5) * 0.12;
        g.save();
        g.translateCanvas(x + w / 2, 720 - h / 2);
        g.rotateCanvas(tilt);
        g.fillRect(-w / 2, -h / 2, w, h);
        g.restore();
        // broken windows (dark holes + one lit circus poster)
        g.fillStyle(0x000000, 1);
        for (let wy = 720 - h + 20; wy < 700; wy += 26) {
          for (let wx = x + 10; wx < x + w - 10; wx += 18) {
            if (rnd() > 0.6) g.fillRect(wx, wy, 8, 10);
          }
        }
      }
      // circus tent sliver (magenta + gold) poking up mid-skyline
      g.fillStyle(0x8a1a5a, 1);
      g.fillTriangle(590, 480, 690, 480, 640, 380);
      g.fillStyle(0xffc93d, 1);
      g.fillTriangle(628, 480, 652, 480, 640, 380);
      g.lineStyle(2, INK, 1);
      g.lineBetween(590, 480, 640, 380);
      g.lineBetween(690, 480, 640, 380);
    });

    // bg_tunnel (F4): Iron Tangle tube — arch rings + cable + lamps.
    // STREAMS leftward in update() to sell the train's speed.
    this.stamp(['bg_tunnel'], 1024, 720, (g) => {
      g.fillStyle(0x07070c, 1);
      g.fillRect(0, 0, 1024, 720);
      // repeating tube arch rings (the motion cue)
      for (let x = -128; x < 1152; x += 128) {
        g.lineStyle(10, 0x141420, 1);
        g.strokeRoundedRect(x, 40, 128, 640, 60);
        g.lineStyle(3, 0x2a2a44, 1);
        g.strokeRoundedRect(x, 40, 128, 640, 60);
        // rivets on the ring
        g.fillStyle(0x3a3a58, 1);
        for (const [rx, ry] of [[x + 14, 200], [x + 114, 200], [x + 14, 500], [x + 114, 500]]) {
          g.fillCircle(rx, ry, 4);
        }
      }
      // overhead cable + hanging lamps (bright streak sources)
      g.lineStyle(4, 0x0a0a10, 1);
      g.lineBetween(0, 90, 1024, 90);
      for (let x = 64; x < 1024; x += 256) {
        g.lineStyle(3, 0x0a0a10, 1);
        g.lineBetween(x, 90, x, 120);
        g.fillStyle(0xfff2b0, 1);
        g.fillEllipse(x, 132, 26, 14);
        g.fillStyle(0xffc93d, 0.25);
        g.fillEllipse(x, 150, 60, 60);
      }
      // track-level dark + red signal dots
      g.fillStyle(0x050508, 1);
      g.fillRect(0, 620, 1024, 100);
      g.fillStyle(0xff2e4d, 1);
      for (let x = 100; x < 1024; x += 340) g.fillCircle(x, 600, 5);
    });

    // Magic missile — BIG Donut eye-rocket (28px, was a 16px dot).
    // Ink-ringed cyan bolt, white-hot core, crown-spark fins. Faces RIGHT.
    this.stamp(['magic_missile'], 28, 28, (g) => {
      // glow bed
      g.fillStyle(PAL.magic, 0.35);
      g.fillCircle(14, 14, 13);
      // tail fins (crown sparks)
      g.fillStyle(PAL.crown || 0xffd020, 1);
      g.fillTriangle(2, 6, 8, 11, 2, 14);
      g.fillTriangle(2, 22, 8, 17, 2, 14);
      g.lineStyle(2, INK, 1);
      g.lineBetween(2, 6, 8, 11);
      g.lineBetween(2, 22, 8, 17);
      // bolt body
      g.fillStyle(INK, 1);
      g.fillEllipse(15, 14, 20, 13);
      g.fillStyle(PAL.magic, 1);
      g.fillEllipse(15, 14, 17, 10.5);
      // nose
      g.fillStyle(INK, 1);
      g.fillCircle(22, 14, 6);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(22, 14, 4);
      // core shine
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(13, 11.5, 9, 4);
    });

    // Punch fist — giant cartoon fist ~Carl-width (96px). Skin + brass
    // knuckle band + ink outline + motion lines. Faces RIGHT; flip for left.
    this.stamp(['punch_fist'], 96, 64, (g) => {
      // motion lines
      g.lineStyle(4, INK, 1);
      g.lineBetween(2, 14, 26, 14);
      g.lineBetween(2, 32, 22, 32);
      g.lineBetween(2, 50, 26, 50);
      // wrist + cuff
      g.fillStyle(PAL.cape || 0xe02020, 1);
      g.fillRoundedRect(8, 14, 16, 36, 4);
      g.lineStyle(4, INK, 1);
      g.strokeRoundedRect(8, 14, 16, 36, 4);
      // fist mass
      g.fillStyle(PAL.carlSkin || 0xffb066, 1);
      g.fillRoundedRect(22, 6, 56, 52, 12);
      g.fillStyle(0xffffff, 0.35);
      g.fillEllipse(36, 18, 20, 10);
      // knuckle ridges
      g.lineStyle(3, INK, 1);
      for (const kx of [36, 48, 60]) g.lineBetween(kx, 8, kx, 26);
      // brass knuckle band with spikes
      g.fillStyle(PAL.brass || 0xf5b83d, 1);
      g.fillRoundedRect(22, 40, 56, 14, 4);
      g.fillStyle(PAL.brassDark || 0x9a6420, 1);
      g.fillRect(22, 50, 56, 4);
      for (const sx of [30, 44, 58, 70]) g.fillTriangle(sx - 4, 40, sx, 30, sx + 4, 40);
      g.lineStyle(4, INK, 1);
      g.strokeRoundedRect(22, 6, 56, 52, 12);
      g.strokeRoundedRect(22, 40, 56, 14, 4);
    });

    // Stomp boot — giant boot ~Carl-width, sole down, ink outline + dust.
    this.stamp(['stomp_boot'], 96, 64, (g) => {
      // leg
      g.fillStyle(PAL.carlSkin || 0xffb066, 1);
      g.fillRoundedRect(34, 0, 28, 26, 6);
      g.lineStyle(4, INK, 1);
      g.strokeRoundedRect(34, 0, 28, 26, 6);
      // boot
      g.fillStyle(PAL.brassDark || 0x9a6420, 1);
      g.fillRoundedRect(14, 22, 68, 34, 8);
      g.fillStyle(PAL.brass || 0xf5b83d, 1);
      g.fillRoundedRect(14, 22, 68, 16, 8);
      g.fillStyle(0xffffff, 0.35);
      g.fillEllipse(30, 29, 22, 8);
      // tread
      g.fillStyle(INK, 1);
      for (const tx of [20, 32, 44, 56, 68]) g.fillRect(tx, 52, 8, 6);
      g.lineStyle(4, INK, 1);
      g.strokeRoundedRect(14, 22, 68, 34, 8);
      // impact dust puffs
      g.fillStyle(0xfff6e5, 1);
      g.fillCircle(8, 52, 6);
      g.fillCircle(88, 52, 6);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(8, 52, 6);
      g.strokeCircle(88, 52, 6);
    });

    // POW burst — comic impact star for punch/stomp connects.
    this.stamp(['pow_burst'], 128, 128, (g) => {
      const pts = [];
      for (let i = 0; i < 24; i++) {
        const r = i % 2 === 0 ? 58 : 40;
        const a = (Math.PI * i) / 12 - Math.PI / 2;
        pts.push(new Phaser.Math.Vector2(64 + Math.cos(a) * r, 64 + Math.sin(a) * r));
      }
      g.fillStyle(0xffcf4d, 1);
      g.fillPoints(pts, true);
      g.lineStyle(5, INK, 1);
      g.strokePoints(pts, true);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(64, 64, 22);
      g.lineStyle(4, INK, 1);
      g.strokeCircle(64, 64, 22);
    });

    // Punch arc — white-hot crescent swoosh (GameScene tints it 0xffb000,
    // so keep it bright: tint multiplies). Ink under-stroke + speed lines.
    this.stamp(['punch_arc'], 32, 32, (g) => {
      g.lineStyle(10, INK, 1);
      g.beginPath();
      g.arc(16, 18, 10, Math.PI * 1.15, Math.PI * 1.85, false);
      g.strokePath();
      g.lineStyle(5, 0xffffff, 1);
      g.beginPath();
      g.arc(16, 18, 10, Math.PI * 1.15, Math.PI * 1.85, false);
      g.strokePath();
      // impact star at the leading edge
      g.fillStyle(0xffffff, 1);
      g.fillCircle(25, 9, 3);
      g.fillStyle(INK, 1);
      g.fillCircle(25, 9, 1);
      // speed lines
      g.lineStyle(2, INK, 1);
      g.lineBetween(4, 22, 11, 22);
      g.lineBetween(3, 27, 10, 27);
    });

    // ---------------- FLOOR 1 BOOK MOBS (DCC Book 1) ----------------
    // All feet planted at the frame bottom (2px margin) so physics bodies
    // (bottom-aligned in GameScene) stand level with Carl — never sunk.
    // Goblin: small green humanoid, huge pointed ears, pineapple club. 56x56.
    // ( storyboard note: the old red-blob chomper keys alias here )
    this.stamp(['enemy_goblin', 'enemy', 'enemy_chomper'], 56, 56, (g) => {
      const skin = PAL.goblin;
      const dark = PAL.goblinDark;
      // pineapple club raised on the right
      g.fillStyle(PAL.clubWood, 1);
      g.fillRect(43, 14, 5, 22);
      g.fillStyle(PAL.pineapple, 1);
      g.fillEllipse(45, 10, 14, 16);
      g.fillStyle(dark, 1);
      for (const [px, py] of [[41, 6], [45, 4], [49, 6], [41, 12], [49, 12], [45, 15]]) g.fillCircle(px, py, 1.2);
      g.fillStyle(PAL.goblinEar, 1);
      g.fillTriangle(45, 0, 49, 0, 47, 4);
      g.lineStyle(2, INK, 1);
      g.strokeEllipse(45, 10, 14, 16);
      // big pointed ears (signature silhouette)
      for (const s of [-1, 1]) {
        const bx = s < 0 ? 14 : 42;
        g.fillStyle(PAL.goblinEar, 1);
        g.beginPath();
        g.moveTo(bx, 20);
        g.lineTo(bx + s * 14, 12);
        g.lineTo(bx + s * 4, 26);
        g.closePath();
        g.fillPath();
        g.lineStyle(2, INK, 1);
        g.beginPath();
        g.moveTo(bx, 20);
        g.lineTo(bx + s * 14, 12);
        g.lineTo(bx + s * 4, 26);
        g.closePath();
        g.strokePath();
      }
      // legs + feet on the frame bottom
      g.fillStyle(skin, 1);
      g.fillRect(20, 42, 6, 9);
      g.fillRect(30, 42, 6, 9);
      g.fillStyle(dark, 1);
      g.fillRect(18, 49, 10, 5);
      g.fillRect(28, 49, 10, 5);
      g.lineStyle(2, INK, 1);
      g.strokeRect(18, 49, 10, 5);
      g.strokeRect(28, 49, 10, 5);
      // torso: leather vest
      g.fillStyle(PAL.leather, 1);
      g.fillRoundedRect(17, 30, 22, 14, 3);
      g.fillStyle(PAL.leatherDark, 1);
      g.fillRect(17, 40, 22, 4);
      g.lineStyle(2, INK, 1);
      g.strokeRoundedRect(17, 30, 22, 14, 3);
      // arms
      g.fillStyle(skin, 1);
      g.fillRoundedRect(11, 30, 6, 12, 2);
      g.fillRoundedRect(39, 30, 6, 10, 2);
      g.lineStyle(2, INK, 1);
      g.strokeRoundedRect(11, 30, 6, 12, 2);
      // head
      g.fillStyle(skin, 1);
      g.fillCircle(28, 20, 11);
      g.fillStyle(0xffffff, 0.4);
      g.fillEllipse(24, 15, 8, 4);
      // angry brow + slanted yellow eyes
      g.fillStyle(dark, 1);
      g.fillTriangle(18, 16, 26, 18, 18, 19);
      g.fillTriangle(38, 16, 30, 18, 38, 19);
      for (const ex of [23, 33]) {
        g.fillStyle(INK, 1);
        g.fillEllipse(ex, 21, 5, 3.5);
        g.fillStyle(PAL.eyeGlow, 1);
        g.fillEllipse(ex, 21, 3.4, 2.2);
        g.fillStyle(INK, 1);
        g.fillCircle(ex, 21, 1);
      }
      // pointy nose + fanged grin
      g.fillStyle(dark, 1);
      g.fillTriangle(28, 22, 25, 27, 31, 27);
      g.fillStyle(INK, 1);
      g.fillRoundedRect(20, 28, 16, 5, 2);
      g.fillStyle(PAL.teeth, 1);
      g.fillTriangle(22, 28, 25, 28, 23.5, 32);
      g.fillTriangle(31, 28, 34, 28, 32.5, 32);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(28, 20, 11);
    });

    // Tinker: goblin engineer — pot helmet, goggles, wrench, bomb pack. 56x56.
    this.stamp(['enemy_tinker', 'enemy_spitter'], 56, 56, (g) => {
      const skin = PAL.goblin;
      const dark = PAL.goblinDark;
      // backpack + copper pipe + bomb
      g.fillStyle(PAL.leather, 1);
      g.fillRoundedRect(4, 30, 10, 16, 2);
      g.lineStyle(2, INK, 1);
      g.strokeRoundedRect(4, 30, 10, 16, 2);
      g.fillStyle(PAL.brass, 1);
      g.fillRect(12, 26, 4, 10);
      g.fillStyle(0x2a2030, 1);
      g.fillCircle(8, 24, 5);
      g.fillStyle(0xffc93d, 1);
      g.fillCircle(8, 24, 2);
      // legs + feet
      g.fillStyle(skin, 1);
      g.fillRect(21, 42, 6, 9);
      g.fillRect(30, 42, 6, 9);
      g.fillStyle(dark, 1);
      g.fillRect(19, 49, 10, 5);
      g.fillRect(28, 49, 10, 5);
      g.lineStyle(2, INK, 1);
      g.strokeRect(19, 49, 10, 5);
      g.strokeRect(28, 49, 10, 5);
      // torso: oil-stained tunic
      g.fillStyle(PAL.potDark, 1);
      g.fillRoundedRect(18, 30, 21, 14, 3);
      g.lineStyle(2, INK, 1);
      g.strokeRoundedRect(18, 30, 21, 14, 3);
      // wrench in right hand
      g.fillStyle(PAL.pot, 1);
      g.fillRect(40, 26, 4, 16);
      g.fillRect(38, 22, 8, 5);
      g.fillStyle(INK, 1);
      g.fillRect(40, 24, 4, 2);
      g.lineStyle(2, INK, 1);
      g.strokeRect(40, 26, 4, 16);
      // head
      g.fillStyle(skin, 1);
      g.fillCircle(28, 20, 10.5);
      // pot helmet: dome + rim + rivets
      g.fillStyle(PAL.pot, 1);
      g.fillEllipse(28, 11, 26, 14);
      g.fillStyle(0xffffff, 0.5);
      g.fillEllipse(22, 8, 9, 4);
      g.fillStyle(PAL.potDark, 1);
      g.fillRect(13, 13, 30, 4);
      g.fillStyle(INK, 1);
      for (const rx of [18, 28, 38]) g.fillCircle(rx, 15, 1.2);
      g.lineStyle(2, INK, 1);
      g.strokeEllipse(28, 11, 26, 14);
      // goggles: dark rings + cyan glint
      for (const ex of [23, 33]) {
        g.fillStyle(PAL.goggle, 1);
        g.fillCircle(ex, 22, 4.5);
        g.fillStyle(PAL.goggleGlint, 1);
        g.fillCircle(ex - 1, 21, 1.8);
        g.lineStyle(2, INK, 1);
        g.strokeCircle(ex, 22, 4.5);
      }
      g.lineStyle(2, INK, 1);
      g.lineBetween(27, 22, 29, 22);
      // toothy grin
      g.fillStyle(INK, 1);
      g.fillRoundedRect(21, 29, 14, 4, 2);
      g.fillStyle(PAL.teeth, 1);
      g.fillTriangle(23, 29, 26, 29, 24.5, 32);
      g.fillTriangle(29, 29, 32, 29, 30.5, 32);
    });

    // Trog Basher: bulky grey-green reptile-man, stone club. 72x72.
    this.stamp(['enemy_trog', 'enemy_brute'], 72, 72, (g) => {
      const hide = PAL.trog;
      const dark = PAL.trogDark;
      // stone club across the right shoulder
      g.fillStyle(PAL.slabFace, 1);
      g.fillRoundedRect(50, 2, 10, 34, 4);
      g.fillStyle(PAL.slabDark, 1);
      for (const [sx, sy] of [[52, 8], [56, 16], [52, 24]]) g.fillCircle(sx, sy, 1.6);
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(50, 2, 10, 34, 4);
      g.fillStyle(PAL.clubWood, 1);
      g.fillRect(52, 34, 6, 16);
      g.lineStyle(3, INK, 1);
      g.lineBetween(52, 34, 52, 50);
      g.lineBetween(58, 34, 58, 50);
      // legs + heavy feet on the frame bottom
      g.fillStyle(hide, 1);
      g.fillRect(22, 52, 10, 14);
      g.fillRect(40, 52, 10, 14);
      g.fillStyle(dark, 1);
      g.fillRect(18, 62, 16, 8);
      g.fillRect(38, 62, 16, 8);
      g.fillStyle(PAL.teeth, 1);
      for (const cx of [20, 26, 40, 46]) g.fillTriangle(cx, 70, cx + 5, 70, cx + 2.5, 66);
      g.lineStyle(3, INK, 1);
      g.strokeRect(18, 62, 16, 8);
      g.strokeRect(38, 62, 16, 8);
      // torso mass + pale belly
      g.fillStyle(hide, 1);
      g.fillRoundedRect(14, 26, 44, 30, 8);
      g.fillStyle(PAL.trogBelly, 1);
      g.fillRoundedRect(24, 34, 24, 20, 6);
      g.fillStyle(dark, 1);
      g.fillRect(24, 42, 24, 2);
      g.fillRect(24, 48, 24, 2);
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(14, 26, 44, 30, 8);
      // thick arms + claws
      g.fillStyle(hide, 1);
      g.fillRoundedRect(4, 30, 10, 24, 4);
      g.fillRoundedRect(58, 30, 10, 22, 4);
      g.fillStyle(PAL.teeth, 1);
      for (const cy of [54, 58]) {
        g.fillTriangle(4, cy, 10, cy + 1.5, 4, cy + 3);
        g.fillTriangle(68, cy, 62, cy + 1.5, 68, cy + 3);
      }
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(4, 30, 10, 24, 4);
      g.strokeRoundedRect(58, 30, 10, 22, 4);
      // head + heavy brow
      g.fillStyle(hide, 1);
      g.fillCircle(36, 18, 13);
      g.fillStyle(0xffffff, 0.3);
      g.fillEllipse(31, 12, 10, 5);
      g.fillStyle(dark, 1);
      g.fillRoundedRect(22, 12, 28, 7, 3);
      g.lineStyle(2, INK, 1);
      g.strokeRoundedRect(22, 12, 28, 7, 3);
      // small red eyes under the brow
      for (const ex of [30, 42]) {
        g.fillStyle(INK, 1);
        g.fillCircle(ex, 21, 4);
        g.fillStyle(PAL.ratEye, 1);
        g.fillCircle(ex, 21, 2.6);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(ex - 0.8, 20.2, 1);
      }
      // wide jaw + teeth
      g.fillStyle(INK, 1);
      g.fillRoundedRect(24, 26, 24, 8, 3);
      g.fillStyle(PAL.teeth, 1);
      for (const tx of [26, 32, 38, 44]) g.fillTriangle(tx, 26, tx + 4, 26, tx + 2, 31);
      // scale cracks
      g.lineStyle(2, dark, 1);
      g.lineBetween(16, 46, 22, 50);
      g.lineBetween(56, 44, 50, 50);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(36, 18, 13);
    });

    // BARON SWINE: Floor 1 borough boss. Tuxedo BOAR BRUISER on two legs —
    // trotters, snout, tusks, bow tie. Stands 120x120, feet at frame bottom.
    this.stamp(['boss_swine'], 120, 120, (g) => {
      const flesh = 0xf0a0a8;
      const dark = 0xc06a7a;
      // hooves
      g.fillStyle(0x3a2028, 1);
      g.fillRoundedRect(36, 104, 18, 10, 3);
      g.fillRoundedRect(66, 104, 18, 10, 3);
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(36, 104, 18, 10, 3);
      g.strokeRoundedRect(66, 104, 18, 10, 3);
      // thick legs
      g.fillStyle(flesh, 1);
      g.fillRect(38, 84, 14, 22);
      g.fillRect(68, 84, 14, 22);
      g.fillStyle(dark, 1);
      g.fillRect(38, 96, 14, 10);
      g.fillRect(68, 96, 14, 10);
      g.lineStyle(3, INK, 1);
      g.lineBetween(38, 84, 38, 104);
      g.lineBetween(82, 84, 82, 104);
      // burly arms + trotter fists with white cuffs
      g.fillStyle(flesh, 1);
      g.fillRoundedRect(8, 52, 18, 32, 8);
      g.fillRoundedRect(94, 52, 18, 32, 8);
      g.fillStyle(0xffffff, 1);
      g.fillRect(10, 52, 14, 7);
      g.fillRect(96, 52, 14, 7);
      g.fillStyle(flesh, 1);
      g.fillCircle(17, 88, 10);
      g.fillCircle(103, 88, 10);
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(8, 52, 18, 32, 8);
      g.strokeRoundedRect(94, 52, 18, 32, 8);
      g.strokeCircle(17, 88, 10);
      g.strokeCircle(103, 88, 10);
      // tuxedo torso
      g.fillStyle(0x1a1a22, 1);
      g.fillRoundedRect(26, 44, 68, 46, 10);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(60, 48, 48, 70, 72, 70);
      g.fillStyle(0xff2040, 1);
      g.fillTriangle(54, 50, 60, 54, 54, 58);
      g.fillTriangle(66, 50, 60, 54, 66, 58);
      g.fillCircle(60, 54, 2.5);
      // red sequins on the lapels
      for (const [sx, sy] of [[34, 60], [86, 60], [32, 76], [88, 76], [60, 82]]) {
        g.fillRect(sx, sy, 4, 4);
        g.fillStyle(0xffffff, 0.8);
        g.fillRect(sx, sy, 2, 2);
        g.fillStyle(0xff2040, 1);
      }
      // lapels + cummerbund: the Baron dresses for the kill
      g.fillStyle(0x2a2a36, 1);
      g.fillTriangle(48, 48, 40, 70, 52, 70);
      g.fillTriangle(72, 48, 80, 70, 68, 70);
      g.fillStyle(0x7a1020, 1);
      g.fillRect(28, 80, 64, 8);
      g.fillStyle(0xff2040, 0.6);
      g.fillRect(28, 80, 64, 2);
      // cuff buttons
      g.fillStyle(PAL.brassHi, 1);
      g.fillCircle(17, 55, 1.8);
      g.fillCircle(103, 55, 1.8);
      // hoof shine
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(38, 105, 6, 2);
      g.fillRect(68, 105, 6, 2);
      g.lineStyle(4, INK, 1);
      g.strokeRoundedRect(26, 44, 68, 46, 10);
      // boar head
      g.fillStyle(flesh, 1);
      g.fillCircle(60, 26, 20);
      g.fillStyle(0xffd0d8, 1);
      g.fillEllipse(52, 18, 16, 10);
      // ears
      g.fillStyle(flesh, 1);
      g.fillTriangle(44, 14, 38, 0, 52, 8);
      g.fillTriangle(76, 14, 82, 0, 68, 8);
      g.lineStyle(3, INK, 1);
      g.lineBetween(44, 14, 38, 0);
      g.lineBetween(44, 14, 52, 8);
      g.lineBetween(76, 14, 82, 0);
      g.lineBetween(76, 14, 68, 8);
      // snout + nostrils
      g.fillStyle(dark, 1);
      g.fillEllipse(60, 32, 24, 14);
      g.fillStyle(INK, 1);
      g.fillEllipse(54, 32, 3.5, 5);
      g.fillEllipse(66, 32, 3.5, 5);
      g.lineStyle(3, INK, 1);
      g.strokeEllipse(60, 32, 24, 14);
      // tusks curving up past the snout
      g.fillStyle(PAL.teeth, 1);
      g.fillTriangle(42, 36, 48, 36, 40, 18);
      g.fillTriangle(78, 36, 72, 36, 80, 18);
      g.lineStyle(2, INK, 1);
      g.lineBetween(42, 36, 40, 18);
      g.lineBetween(48, 36, 40, 18);
      g.lineBetween(78, 36, 80, 18);
      g.lineBetween(72, 36, 80, 18);
      // furious eyes under a heavy brow
      for (const ex of [49, 71]) {
        g.fillStyle(0xffffff, 1);
        g.fillCircle(ex, 18, 5.5);
        g.fillStyle(INK, 1);
        g.fillCircle(ex + 1, 19, 2.5);
        g.fillStyle(0xff3d3d, 1);
        g.fillCircle(ex + 1.5, 17.5, 1);
        g.lineStyle(2, INK, 1);
        g.strokeCircle(ex, 18, 5.5);
      }
      g.lineStyle(3, INK, 1);
      g.lineBetween(42, 10, 56, 14);
      g.lineBetween(78, 10, 64, 14);
      g.lineStyle(4, INK, 1);
      g.strokeCircle(60, 26, 20);
    });

    // RALPH: Floor 2 frenzied gerbil. REARING BRUISER on two legs — fluffy
    // brown muscle, buck teeth, long tail, frenzy-red eyes. 120x120, feet
    // at frame bottom.
    this.stamp(['boss_ralph'], 120, 120, (g) => {
      const fur = 0x9a6a42;
      const tan = 0xd8bc8a;
      // long pink tail whipping left
      g.lineStyle(5, 0xe08a9a, 1);
      g.beginPath();
      g.arc(22, 84, 16, Math.PI * 0.3, Math.PI * 1.5, false);
      g.strokePath();
      g.lineStyle(2, INK, 1);
      g.beginPath();
      g.arc(22, 84, 19, Math.PI * 0.3, Math.PI * 1.5, false);
      g.strokePath();
      g.beginPath();
      g.arc(22, 84, 13, Math.PI * 0.3, Math.PI * 1.5, false);
      g.strokePath();
      // big hind feet
      g.fillStyle(0x6a4a2a, 1);
      g.fillRoundedRect(34, 102, 18, 10, 4);
      g.fillRoundedRect(68, 102, 18, 10, 4);
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(34, 102, 18, 10, 4);
      g.strokeRoundedRect(68, 102, 18, 10, 4);
      // thick haunches
      g.fillStyle(fur, 1);
      g.fillEllipse(43, 92, 22, 18);
      g.fillEllipse(77, 92, 22, 18);
      g.lineStyle(3, INK, 1);
      g.strokeEllipse(43, 92, 22, 18);
      g.strokeEllipse(77, 92, 22, 18);
      // barrel body + pale belly
      g.fillStyle(fur, 1);
      g.fillRoundedRect(30, 46, 60, 52, 16);
      g.fillStyle(tan, 1);
      g.fillEllipse(60, 74, 36, 26);
      g.fillStyle(0xc09a6a, 1);
      g.fillEllipse(60, 82, 26, 12); // belly shading
      // pec lines: he lifts
      g.lineStyle(2, 0x6a4a2a, 1);
      g.beginPath(); g.arc(50, 58, 8, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
      g.beginPath(); g.arc(70, 58, 8, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
      // flank fluff tufts
      g.fillStyle(fur, 1);
      for (const [fx, fy] of [[28, 56], [92, 56], [28, 76], [92, 76]]) {
        g.fillCircle(fx, fy, 7);
      }
      g.lineStyle(2, INK, 1);
      for (const [fx, fy] of [[28, 56], [92, 76]]) {
        g.strokeCircle(fx, fy, 7);
      }
      // pumped arms + clawed paws (flexed)
      g.fillStyle(fur, 1);
      g.fillRoundedRect(12, 48, 16, 30, 7);
      g.fillRoundedRect(92, 48, 16, 30, 7);
      g.fillStyle(tan, 1);
      g.fillCircle(20, 42, 9);
      g.fillCircle(100, 42, 9);
      g.fillStyle(INK, 1);
      for (const [cx, cy] of [[16, 38], [24, 38], [96, 38], [104, 38]]) {
        g.fillTriangle(cx - 2, cy, cx + 2, cy, cx, cy + 6);
      }
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(12, 48, 16, 30, 7);
      g.strokeRoundedRect(92, 48, 16, 30, 7);
      g.strokeCircle(20, 42, 9);
      g.strokeCircle(100, 42, 9);
      g.lineStyle(4, INK, 1);
      g.strokeRoundedRect(30, 46, 60, 52, 16);
      // head
      g.fillStyle(fur, 1);
      g.fillCircle(60, 28, 19);
      g.fillStyle(0xc09a6a, 1);
      g.fillEllipse(52, 20, 18, 12);
      // round ears
      g.fillStyle(fur, 1);
      g.fillCircle(44, 10, 9);
      g.fillCircle(76, 10, 9);
      g.fillStyle(0xe08a9a, 1);
      g.fillCircle(44, 10, 4.5);
      g.fillCircle(76, 10, 4.5);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(44, 10, 9);
      g.strokeCircle(76, 10, 9);
      // frenzy-red eyes (impossibly wide scream-energy)
      for (const ex of [52, 68]) {
        g.fillStyle(0xffffff, 1);
        g.fillCircle(ex, 24, 7);
        g.fillStyle(PAL.ratEye, 1);
        g.fillCircle(ex, 25, 4.5);
        g.fillStyle(INK, 1);
        g.fillCircle(ex, 25, 2);
        g.lineStyle(2, INK, 1);
        g.strokeCircle(ex, 24, 7);
      }
      // nose + GIANT buck teeth below the muzzle
      g.fillStyle(0xe08a9a, 1);
      g.fillCircle(60, 33, 3);
      g.fillStyle(PAL.teeth, 1);
      g.fillRect(53, 37, 7, 12);
      g.fillRect(62, 37, 7, 12);
      g.lineStyle(2, INK, 1);
      g.strokeRect(53, 37, 7, 12);
      g.strokeRect(62, 37, 7, 12);
      g.lineBetween(53, 43, 69, 43);
      // tooth shine + foot claws + tail tuft
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(54, 38, 2, 10);
      g.fillRect(63, 38, 2, 10);
      g.fillStyle(INK, 1);
      for (const [tx, ty] of [[38, 107], [46, 107], [72, 107], [80, 107]]) {
        g.fillTriangle(tx - 2, ty, tx + 2, ty, tx, ty + 5);
      }
      g.fillStyle(fur, 1);
      g.fillCircle(8, 68, 6);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(8, 68, 6);
      g.lineStyle(4, INK, 1);
      g.strokeCircle(60, 28, 19);
    });

    // PRELEVEL — Seattle AFTER the end: nothing left standing. 1600x320 of
    // rubble mounds, snapped slabs, the Needle's broken stump, smoke + fire.
    // (The last towers fall in the intro — see GameScene.buildPrelevel.)
    this.stamp(['pre_skyline'], 1600, 320, (g) => {
      // fire glow beds
      for (const [gx, gw] of [[180, 260], [700, 300], [1250, 260]]) {
        g.fillStyle(0xff5a20, 0.35);
        g.fillEllipse(gx + gw / 2, 320, gw, 150);
        g.fillStyle(0xffc93d, 0.3);
        g.fillEllipse(gx + gw / 2, 320, gw * 0.6, 90);
      }
      // rubble mounds (deterministic)
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      let x = -40;
      while (x < 1600) {
        const w = 120 + rnd() * 160;
        const h = 40 + rnd() * 70;
        g.fillStyle(0x14141e, 1);
        g.fillEllipse(x + w / 2, 320, w, h * 2);
        g.fillStyle(0x23232e, 1);
        g.fillEllipse(x + w / 2 - 10, 320 - h * 0.3, w * 0.6, h);
        // rebar + broken concrete chunks sticking out
        g.lineStyle(3, 0x3a3a4a, 1);
        for (let r = 0; r < 3; r++) {
          const rx = x + 20 + rnd() * (w - 40);
          const ry = 320 - h * (0.4 + rnd() * 0.5);
          g.lineBetween(rx, ry, rx + (rnd() - 0.5) * 40, ry - 14 - rnd() * 20);
        }
        g.fillStyle(0x2e2e3a, 1);
        for (let c = 0; c < 4; c++) {
          g.fillRect(x + rnd() * w, 318 - rnd() * h, 8 + rnd() * 14, 5 + rnd() * 8);
        }
        x += w * 0.7;
      }
      // snapped slabs leaning out of the piles (nothing vertical survives)
      for (const [sx, tilt, sw, sh] of [[300, 0.5, 26, 110], [820, -0.45, 30, 130], [1330, 0.6, 24, 100]]) {
        g.save();
        g.translateCanvas(sx, 310);
        g.rotateCanvas(tilt);
        g.fillStyle(0x0c0e1a, 1);
        g.fillRect(-sw / 2, -sh, sw, sh);
        // dead windows (dark — the power is out)
        g.fillStyle(0x1a2030, 1);
        for (let wy = -sh + 12; wy < -8; wy += 16) {
          for (let wx = -sw / 2 + 5; wx < sw / 2 - 5; wx += 10) g.fillRect(wx, wy, 5, 8);
        }
        g.restore();
      }
      // Space Needle: snapped stump, leaning hard, saucer half-buried
      g.save();
      g.translateCanvas(1050, 320);
      g.rotateCanvas(-0.35);
      g.fillStyle(0x0c0e1a, 1);
      g.fillRect(-10, -90, 20, 90);
      g.fillStyle(0x1a2038, 1);
      g.fillEllipse(0, -92, 70, 16);
      g.restore();
      g.fillStyle(0x0c0e1a, 1);
      g.fillEllipse(1150, 312, 110, 24); // fallen saucer ring in the rubble
      // smoke columns
      g.fillStyle(0x1a1a24, 0.7);
      for (const [sx, sw] of [[250, 70], [760, 90], [1300, 65]]) {
        g.fillEllipse(sx, 120, sw, 200);
      }
    });

    // The last standing tower (intro only): tiered facade, setbacks, rows of
    // lit windows, roof clutter, blinking antenna. 140x300.
    // Three of these pancake straight down in the Floor 0 opening.
    this.stamp(['pre_tower'], 140, 330, (g) => {
      // main shaft with side shading
      g.fillStyle(0x11141f, 1);
      g.fillRect(18, 70, 104, 260);
      g.fillStyle(0x1c2233, 1);
      g.fillRect(18, 70, 22, 260);
      g.fillStyle(0x080a12, 1);
      g.fillRect(100, 70, 22, 260);
      // setback tiers near the top
      g.fillStyle(0x11141f, 1);
      g.fillRect(28, 52, 84, 22);
      g.fillStyle(0x1c2233, 1);
      g.fillRect(28, 52, 18, 22);
      g.fillStyle(0x11141f, 1);
      g.fillRect(40, 38, 60, 16);
      // window grid (lights still on — for seconds)
      let seed = 21;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let wy = 82; wy < 318; wy += 20) {
        for (let wx = 26; wx < 110; wx += 16) {
          if (rnd() > 0.4) {
            g.fillStyle(rnd() > 0.65 ? 0xfff2b0 : 0xff9a40, 1);
            g.fillRect(wx, wy, 9, 12);
            g.fillStyle(0x000000, 0.35);
            g.fillRect(wx, wy + 9, 9, 3);
          } else {
            g.fillStyle(0x1a2030, 1);
            g.fillRect(wx, wy, 9, 12);
          }
        }
      }
      // mullion lines
      g.lineStyle(1, 0x05060c, 1);
      for (let wy = 82; wy < 318; wy += 20) g.lineBetween(18, wy - 3, 122, wy - 3);
      // roof clutter: AC boxes + railing
      g.fillStyle(0x232838, 1);
      g.fillRect(46, 28, 18, 12);
      g.fillRect(78, 30, 14, 10);
      g.lineStyle(2, 0x232838, 1);
      g.lineBetween(28, 52, 112, 52);
      // antenna with red beacon
      g.fillStyle(0x0c0e1a, 1);
      g.fillRect(67, 8, 6, 24);
      g.fillStyle(0xff3d3d, 1);
      g.fillCircle(70, 6, 4);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(69, 5, 1.5);
      g.lineStyle(4, INK, 1);
      g.strokeRect(18, 70, 104, 260);
    });

    // Prelevel tree Donut waits in: gnarled trunk, four lush moonlit tiers,
    // thick perch branch with claw marks. 180x250. Donut sits ~[90, 128].
    this.stamp(['pre_tree'], 180, 250, (g) => {
      // roots gripping the dirt
      g.fillStyle(0x2e1c0e, 1);
      g.fillTriangle(70, 250, 95, 250, 84, 218);
      g.fillTriangle(55, 250, 78, 250, 68, 222);
      g.fillTriangle(105, 250, 125, 250, 114, 222);
      // gnarled trunk with bark grooves + moss
      g.fillStyle(0x4a2e18, 1);
      g.fillRoundedRect(72, 130, 26, 120, 6);
      g.fillStyle(0x2e1c0e, 1);
      g.fillRect(72, 170, 26, 80);
      g.lineStyle(2, 0x241305, 1);
      for (const bx of [78, 86, 94]) g.lineBetween(bx, 135, bx - 3, 248);
      g.fillStyle(0x2a4a22, 1);
      g.fillEllipse(76, 190, 8, 14);
      g.fillEllipse(96, 215, 7, 12);
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(72, 130, 26, 120, 6);
      // four lush tiers: dark mass + needle strokes + moonlit rim
      const tiers = [
        [90, 28, 150, 66], [90, 72, 128, 60], [90, 114, 106, 56], [90, 152, 84, 50],
      ];
      let seed = 5;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (const [cx, cy, w, h] of tiers) {
        g.fillStyle(0x14301c, 1);
        g.fillTriangle(cx - w / 2, cy + h / 2, cx + w / 2, cy + h / 2, cx, cy - h / 2);
        // needle strokes
        g.lineStyle(2, 0x1e4a2a, 1);
        for (let n = 0; n < 14; n++) {
          const nx = cx - w / 2 + rnd() * w;
          const ny = cy - h / 2 + rnd() * h;
          g.lineBetween(nx, ny, nx - 6 + rnd() * 12, ny + 8);
        }
        // moonlit top edge
        g.lineStyle(3, 0x7ab88a, 1);
        g.beginPath();
        g.moveTo(cx - w / 2 + 8, cy + h / 4);
        g.lineTo(cx, cy - h / 2);
        g.lineTo(cx + w / 2 - 8, cy + h / 4);
        g.strokePath();
        g.lineStyle(2, INK, 1);
        g.beginPath();
        g.moveTo(cx - w / 2, cy + h / 2);
        g.lineTo(cx + w / 2, cy + h / 2);
        g.lineTo(cx, cy - h / 2);
        g.closePath();
        g.strokePath();
      }
      // crown spike
      g.fillStyle(0x14301c, 1);
      g.fillTriangle(82, 8, 98, 8, 90, -6 + 14);
      // thick perch branch (Donut sits at ~[90, 128]) with claw marks
      g.fillStyle(0x4a2e18, 1);
      g.fillRoundedRect(28, 122, 118, 13, 5);
      g.fillStyle(0x2e1c0e, 1);
      g.fillRect(28, 128, 118, 7);
      g.lineStyle(2, 0xd8c8a8, 1);
      for (const [mx, my] of [[60, 126], [74, 125], [104, 126]]) {
        g.lineBetween(mx, my, mx + 4, my + 3);
        g.lineBetween(mx + 5, my, mx + 9, my + 3);
      }
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(28, 122, 118, 13, 5);
    });

    // Flame lick for the burning blocks. 32x40, transparent bg.
    this.stamp(['pre_fire'], 32, 40, (g) => {
      g.fillStyle(0xff5a20, 1);
      g.fillEllipse(16, 26, 22, 22);
      g.fillTriangle(8, 24, 24, 24, 16, 2);
      g.fillStyle(0xffc93d, 1);
      g.fillEllipse(16, 29, 13, 13);
      g.fillTriangle(11, 27, 21, 27, 16, 10);
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(16, 31, 7, 7);
    });

    // Common Rat: low grey rodent, pink tail, red eyes. 56x56.
    this.stamp(['enemy_rat'], 56, 56, (g) => {
      const fur = PAL.rat;
      const dark = PAL.ratDark;
      // tail curling left
      g.lineStyle(4, PAL.ratTail, 1);
      g.beginPath();
      g.arc(10, 44, 8, Math.PI * 0.2, Math.PI * 1.4, false);
      g.strokePath();
      g.lineStyle(2, INK, 1);
      g.beginPath();
      g.arc(10, 44, 10, Math.PI * 0.2, Math.PI * 1.4, false);
      g.strokePath();
      g.beginPath();
      g.arc(10, 44, 6, Math.PI * 0.2, Math.PI * 1.4, false);
      g.strokePath();
      // little feet on the frame bottom
      g.fillStyle(dark, 1);
      for (const fx of [18, 28, 38]) {
        g.fillRect(fx, 50, 7, 4);
        g.lineStyle(1, INK, 1);
        g.strokeRect(fx, 50, 7, 4);
      }
      // long low body
      g.fillStyle(fur, 1);
      g.fillEllipse(29, 42, 34, 16);
      g.fillStyle(0xffffff, 0.35);
      g.fillEllipse(24, 38, 14, 6);
      g.fillStyle(dark, 1);
      g.fillEllipse(36, 46, 12, 5);
      g.lineStyle(3, INK, 1);
      g.strokeEllipse(29, 42, 34, 16);
      // head: pointed snout right
      g.fillStyle(fur, 1);
      g.fillCircle(44, 36, 8);
      g.fillTriangle(48, 32, 54, 36, 48, 39);
      g.fillStyle(PAL.ratTail, 1);
      g.fillCircle(52, 36, 1.6);
      // round ears
      g.fillStyle(fur, 1);
      g.fillCircle(38, 28, 4);
      g.fillCircle(44, 27, 4);
      g.fillStyle(PAL.ratTail, 1);
      g.fillCircle(38, 28, 2);
      g.fillCircle(44, 27, 2);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(38, 28, 4);
      g.strokeCircle(44, 27, 4);
      // red eyes + whiskers + teeth
      g.fillStyle(INK, 1);
      g.fillCircle(43, 34, 3);
      g.fillStyle(PAL.ratEye, 1);
      g.fillCircle(43, 34, 2);
      g.lineStyle(1, INK, 1);
      g.lineBetween(48, 38, 54, 37);
      g.lineBetween(48, 39, 54, 40);
      g.fillStyle(PAL.teeth, 1);
      g.fillTriangle(47, 40, 50, 40, 48.5, 43);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(44, 36, 8);
    });

    // Mongo: Donut's baby velociraptor. Big head, tiny arms, long tail,
    // back stripes, stompy feet on the frame bottom. Faces RIGHT. 48x48.
    this.stamp(['mongo'], 48, 48, (g) => {
      const hide = 0x7fd65a;
      const dark = 0x3d7a30;
      const belly = 0xfff0d0;
      // tail tapering left
      g.fillStyle(hide, 1);
      g.fillTriangle(16, 28, 2, 20, 16, 38);
      g.fillTriangle(10, 26, 2, 20, 10, 32);
      g.lineStyle(2, INK, 1);
      g.lineBetween(16, 28, 2, 20);
      g.lineBetween(16, 38, 2, 20);
      // stompy legs + claw feet on the frame bottom
      g.fillStyle(hide, 1);
      g.fillRect(20, 34, 6, 9);
      g.fillRect(30, 34, 6, 9);
      g.fillStyle(dark, 1);
      g.fillRect(18, 41, 10, 5);
      g.fillRect(28, 41, 10, 5);
      g.fillStyle(PAL.teeth, 1);
      g.fillTriangle(18, 46, 22, 46, 20, 43);
      g.fillTriangle(28, 46, 32, 46, 30, 43);
      g.lineStyle(2, INK, 1);
      g.strokeRect(18, 41, 10, 5);
      g.strokeRect(28, 41, 10, 5);
      // body + pale belly
      g.fillStyle(hide, 1);
      g.fillEllipse(27, 32, 20, 14);
      g.fillStyle(belly, 1);
      g.fillEllipse(28, 36, 12, 7);
      g.lineStyle(2, INK, 1);
      g.strokeEllipse(27, 32, 20, 14);
      // back stripes
      g.fillStyle(dark, 1);
      g.fillTriangle(20, 26, 24, 26, 22, 31);
      g.fillTriangle(25, 25, 29, 25, 27, 30);
      // tiny arms
      g.fillStyle(hide, 1);
      g.fillRoundedRect(33, 30, 5, 8, 2);
      g.lineStyle(2, INK, 1);
      g.strokeRoundedRect(33, 30, 5, 8, 2);
      // big head + snout
      g.fillStyle(hide, 1);
      g.fillCircle(35, 17, 10);
      g.fillTriangle(41, 13, 47, 17, 41, 21);
      g.fillStyle(0xffffff, 0.4);
      g.fillEllipse(31, 12, 8, 4);
      // toothy grin
      g.fillStyle(INK, 1);
      g.fillRoundedRect(37, 20, 9, 4, 1.5);
      g.fillStyle(PAL.teeth, 1);
      g.fillTriangle(39, 20, 41, 20, 40, 23);
      g.fillTriangle(42, 20, 44, 20, 43, 23);
      // big eager eye
      g.fillStyle(0xffffff, 1);
      g.fillCircle(35, 14, 4);
      g.fillStyle(INK, 1);
      g.fillCircle(35.5, 14.5, 2.2);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(34.5, 13, 1);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(35, 17, 10);
    });

    // ---------------- PICKUPS (32x32) ----------------
    // Ham (heal): pink meat + white bone, shine.
    this.stamp(['pickup_ham'], 32, 32, (g) => {
      // bone
      g.fillStyle(PAL.bone, 1);
      g.fillRect(4, 21, 24, 5);
      for (const [bx, by] of [[4, 21], [4, 26], [28, 21], [28, 26]]) {
        g.fillStyle(PAL.bone, 1);
        g.fillCircle(bx, by, 3.5);
      }
      // meat
      g.fillStyle(PAL.ham, 1);
      g.fillCircle(16, 13, 10);
      g.fillStyle(PAL.hamDark, 1);
      g.fillEllipse(16, 17.5, 16, 7);
      g.fillStyle(0xffffff, 0.9);
      g.fillEllipse(12, 9, 7, 4.5);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(16, 13, 10);
      g.strokeRect(4, 21, 24, 5);
    });

    // Star (score): gold 5-point star, shine.
    this.stamp(['pickup_star'], 32, 32, (g) => {
      const pts = [];
      const cx = 16;
      const cy = 16;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 13 : 5.5;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      g.fillStyle(PAL.star, 1);
      g.fillPoints(pts, true);
      g.fillStyle(PAL.starDark, 1);
      g.fillTriangle(16, 22, 11, 26, 21, 26);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(13.5, 12.5, 2);
      g.lineStyle(3, INK, 1);
      g.strokePoints(pts, true);
    });

    // Crystal (mana): cyan diamond, facets, shine.
    this.stamp(['pickup_crystal'], 32, 32, (g) => {
      const gem = [
        new Phaser.Math.Vector2(16, 2),
        new Phaser.Math.Vector2(25, 12),
        new Phaser.Math.Vector2(16, 30),
        new Phaser.Math.Vector2(7, 12),
      ];
      g.fillStyle(PAL.crystal, 1);
      g.fillPoints(gem, true);
      // dark right facet + bright left facet
      g.fillStyle(PAL.crystalDark, 1);
      g.fillTriangle(16, 2, 25, 12, 16, 30);
      g.fillStyle(0xffffff, 0.85);
      g.fillTriangle(16, 2, 7, 12, 16, 14);
      // facet lines
      g.lineStyle(1, INK, 1);
      g.lineBetween(7, 12, 25, 12);
      g.lineBetween(16, 2, 16, 30);
      g.lineStyle(3, INK, 1);
      g.strokePoints(gem, true);
    });

    // Silver Boss Box (canon loot!): chrome box, gold ribbon + bow, shine.
    this.stamp(['pickup_box'], 32, 32, (g) => {
      // box
      g.fillStyle(0xc8ccd4, 1);
      g.fillRoundedRect(4, 10, 24, 18, 3);
      g.fillStyle(0x8a8f9a, 1);
      g.fillRoundedRect(4, 22, 24, 6, 3);
      g.fillStyle(0xffffff, 0.7);
      g.fillRect(6, 12, 5, 12);
      // lid seam
      g.lineStyle(1, INK, 1);
      g.lineBetween(4, 16, 28, 16);
      // gold ribbon cross
      g.fillStyle(PAL.gold, 1);
      g.fillRect(14, 10, 4, 18);
      g.fillRect(4, 17, 24, 4);
      // bow on top
      g.fillStyle(PAL.gold, 1);
      g.fillTriangle(16, 10, 8, 3, 14, 3);
      g.fillTriangle(16, 10, 24, 3, 18, 3);
      g.fillStyle(PAL.heart, 1);
      g.fillCircle(16, 8, 2.5);
      g.lineStyle(2, INK, 1);
      g.strokeRoundedRect(4, 10, 24, 18, 3);
      g.strokeTriangle(16, 10, 8, 3, 14, 3);
      g.strokeTriangle(16, 10, 24, 3, 18, 3);
      // sparkle
      g.fillStyle(0xffffff, 1);
      g.fillCircle(25, 6, 2);
      g.fillCircle(7, 5, 1.4);
    });

    // rubble_tile (F3 Over City): pale concrete slabs, cracks, rebar nubs.
    this.stamp(['rubble_tile'], 96, 64, (g) => {
      g.fillStyle(0x8a8a94, 1);
      g.fillRect(0, 0, 96, 64);
      g.fillStyle(0x6a6a74, 1);
      g.fillRect(0, 0, 96, 8);
      g.fillStyle(0xa8a8b2, 1);
      g.fillRect(4, 12, 40, 20);
      g.fillRect(50, 10, 42, 24);
      g.fillRect(10, 38, 34, 20);
      g.fillRect(50, 40, 38, 18);
      g.lineStyle(2, 0x3a3a44, 1);
      g.strokeRect(4, 12, 40, 20);
      g.strokeRect(50, 10, 42, 24);
      g.strokeRect(10, 38, 34, 20);
      g.strokeRect(50, 40, 38, 18);
      g.lineStyle(2, 0x2a2a32, 1);
      g.lineBetween(12, 14, 30, 30);
      g.lineBetween(60, 44, 80, 56);
      g.lineBetween(50, 20, 50, 34);
      // rebar nubs
      g.fillStyle(0x8a4a20, 1);
      for (const [rx, ry] of [[8, 44], [88, 16], [48, 58]]) g.fillCircle(rx, ry, 2.5);
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(6, 9, 20, 2);
      g.lineStyle(3, INK, 1);
      g.lineBetween(0, 8, 96, 8);
    });

    // train_roof (F4 Iron Tangle): steel walkway panels, rivets, RED LINE stripe.
    this.stamp(['train_roof'], 96, 64, (g) => {
      g.fillStyle(0x3a3f4a, 1);
      g.fillRect(0, 0, 96, 64);
      g.fillStyle(0x2a2e36, 1);
      g.fillRect(0, 0, 96, 10);
      g.fillStyle(0x4a505c, 1);
      g.fillRect(0, 10, 96, 6);
      // panel seams + rivets
      g.lineStyle(2, 0x1a1c22, 1);
      g.lineBetween(32, 10, 32, 64);
      g.lineBetween(64, 10, 64, 64);
      g.fillStyle(0x6a707c, 1);
      for (const rx of [8, 24, 40, 56, 72, 88]) {
        g.fillCircle(rx, 20, 2);
        g.fillCircle(rx, 34, 2);
        g.fillCircle(rx, 48, 2);
      }
      // RED LINE stripe down the middle
      g.fillStyle(0xe02020, 1);
      g.fillRect(0, 28, 96, 5);
      g.fillStyle(0xff8080, 0.8);
      g.fillRect(0, 28, 96, 1.5);
      // edge hazard ticks
      g.fillStyle(0xffc93d, 1);
      for (let hx = 2; hx < 96; hx += 12) {
        g.fillTriangle(hx, 58, hx + 6, 58, hx + 3, 63);
      }
      g.lineStyle(3, INK, 1);
      g.lineBetween(0, 10, 96, 10);
    });

    // DREK (F3/F4 swarmer): knee-high fat grey demonic infant. 56x56.
    this.stamp(['enemy_drek'], 56, 56, (g) => {
      const hide = 0x8a8a94;
      const dark = 0x4a4a54;
      // stubby legs + claw feet on the frame bottom
      g.fillStyle(hide, 1);
      g.fillRect(18, 40, 8, 10);
      g.fillRect(30, 40, 8, 10);
      g.fillStyle(dark, 1);
      g.fillRect(16, 48, 12, 6);
      g.fillRect(28, 48, 12, 6);
      g.fillStyle(PAL.teeth, 1);
      for (const cx of [17, 22, 29, 34]) g.fillTriangle(cx, 54, cx + 3, 54, cx + 1.5, 51);
      g.lineStyle(2, INK, 1);
      g.strokeRect(16, 48, 12, 6);
      g.strokeRect(28, 48, 12, 6);
      // fat round body
      g.fillStyle(hide, 1);
      g.fillCircle(28, 32, 16);
      g.fillStyle(0xffffff, 0.3);
      g.fillEllipse(22, 26, 12, 8);
      g.fillStyle(dark, 1);
      g.fillEllipse(28, 42, 18, 8);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(28, 32, 16);
      // loincloth flap
      g.fillStyle(0x5a3a20, 1);
      g.fillTriangle(20, 40, 36, 40, 28, 50);
      g.lineStyle(2, INK, 1);
      g.lineBetween(20, 40, 28, 50);
      g.lineBetween(36, 40, 28, 50);
      // tiny nub horns
      g.fillStyle(0xe8d8b0, 1);
      g.fillTriangle(16, 22, 12, 12, 20, 18);
      g.fillTriangle(40, 22, 44, 12, 36, 18);
      g.lineStyle(2, INK, 1);
      g.lineBetween(16, 22, 12, 12);
      g.lineBetween(40, 22, 44, 12);
      // big wet eyes + wailing mouth
      g.fillStyle(0xffffff, 1);
      g.fillCircle(22, 28, 5);
      g.fillCircle(34, 28, 5);
      g.fillStyle(INK, 1);
      g.fillCircle(22, 29, 2.5);
      g.fillCircle(34, 29, 2.5);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(21, 27, 1);
      g.fillCircle(33, 27, 1);
      g.fillStyle(INK, 1);
      g.fillEllipse(28, 38, 8, 5);
      g.fillStyle(PAL.teeth, 1);
      g.fillTriangle(25, 36, 28, 36, 26.5, 39);
      // baby-cries: musical wail notes
      g.fillStyle(PAL.goggleGlint, 1);
      g.fillCircle(8, 14, 2.5);
      g.fillCircle(48, 10, 2.5);
    });

    // HEATHER (F3 boss): Mold Bear on roller skates. 120x120.
    this.stamp(['boss_heather'], 120, 120, (g) => {
      const fur = 0x6a4a2a;
      const dark = 0x3a2412;
      // roller skates (the whole point)
      for (const sx of [26, 66]) {
        g.fillStyle(0x2a2a32, 1);
        g.fillRoundedRect(sx, 100, 28, 10, 3);
        g.fillStyle(0xffc93d, 1);
        for (const wx of [sx + 5, sx + 14, sx + 23]) g.fillCircle(wx, 110, 3.5);
        g.lineStyle(3, INK, 1);
        g.strokeRoundedRect(sx, 100, 28, 10, 3);
      }
      // legs
      g.fillStyle(fur, 1);
      g.fillRect(28, 78, 22, 26);
      g.fillRect(68, 78, 22, 26);
      g.lineStyle(3, INK, 1);
      g.lineBetween(28, 78, 28, 102);
      g.lineBetween(90, 78, 90, 102);
      // massive torso + belly
      g.fillStyle(fur, 1);
      g.fillRoundedRect(16, 34, 88, 50, 14);
      g.fillStyle(0x9a7a52, 1);
      g.fillEllipse(60, 62, 52, 30);
      g.fillStyle(dark, 1);
      g.fillEllipse(80, 50, 20, 14); // mold blotch
      g.fillStyle(0x4dc94d, 1);
      g.fillCircle(76, 46, 3);
      g.fillCircle(84, 52, 2.5);
      g.lineStyle(4, INK, 1);
      g.strokeRoundedRect(16, 34, 88, 50, 14);
      // burly arms + claws
      g.fillStyle(fur, 1);
      g.fillRoundedRect(2, 40, 16, 34, 6);
      g.fillRoundedRect(102, 40, 16, 34, 6);
      g.fillStyle(PAL.teeth, 1);
      for (const cy of [74, 79]) {
        g.fillTriangle(2, cy, 10, cy + 2, 2, cy + 4);
        g.fillTriangle(118, cy, 110, cy + 2, 118, cy + 4);
      }
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(2, 40, 16, 34, 6);
      g.strokeRoundedRect(102, 40, 16, 34, 6);
      // head + muzzle + mold
      g.fillStyle(fur, 1);
      g.fillCircle(60, 22, 17);
      g.fillStyle(0x9a7a52, 1);
      g.fillEllipse(60, 28, 22, 12);
      g.fillStyle(dark, 1);
      g.fillEllipse(48, 12, 14, 8);
      // round ears
      g.fillStyle(fur, 1);
      g.fillCircle(45, 8, 7);
      g.fillCircle(75, 8, 7);
      g.fillStyle(dark, 1);
      g.fillCircle(45, 8, 3);
      g.fillCircle(75, 8, 3);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(45, 8, 7);
      g.strokeCircle(75, 8, 7);
      // bloodshot rink-rage eyes
      for (const ex of [53, 67]) {
        g.fillStyle(0xffffff, 1);
        g.fillCircle(ex, 20, 5);
        g.fillStyle(PAL.ratEye, 1);
        g.fillCircle(ex, 21, 3);
        g.fillStyle(INK, 1);
        g.fillCircle(ex, 21, 1.4);
      }
      // nose + jaw
      g.fillStyle(INK, 1);
      g.fillCircle(60, 28, 3);
      g.fillStyle(INK, 1);
      g.fillRoundedRect(50, 31, 20, 6, 2);
      g.fillStyle(PAL.teeth, 1);
      g.fillTriangle(53, 31, 57, 31, 55, 36);
      g.fillTriangle(63, 31, 67, 31, 65, 36);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(60, 22, 17);
    });

    // GHOUL AMALGAM (F4 boss): heaving rot-mass of faces and arms. 120x120.
    this.stamp(['boss_amalgam'], 120, 120, (g) => {
      const rot = 0x5a7a3a;
      const dark = 0x2e4a1e;
      const flesh = 0x8a9a6a;
      // lumpy mass base
      g.fillStyle(rot, 1);
      const blobs = [[40, 74, 26], [62, 82, 30], [84, 72, 24], [52, 52, 24], [74, 48, 22], [62, 34, 18]];
      for (const [bx, by, br] of blobs) g.fillCircle(bx, by, br);
      g.fillStyle(flesh, 1);
      g.fillEllipse(48, 60, 26, 18);
      g.fillEllipse(76, 78, 24, 16);
      g.fillStyle(dark, 1);
      for (const [dx, dy] of [[36, 88], [88, 60], [62, 100], [30, 60]]) g.fillEllipse(dx, dy, 14, 9);
      // faces screaming out of the mass
      const faces = [[44, 52], [74, 40], [84, 78], [50, 86]];
      for (const [fx, fy] of faces) {
        g.fillStyle(0xd8c8a8, 1);
        g.fillCircle(fx, fy, 8);
        g.fillStyle(INK, 1);
        g.fillCircle(fx - 2.5, fy - 1, 1.6);
        g.fillCircle(fx + 2.5, fy - 1, 1.6);
        g.fillEllipse(fx, fy + 4, 5, 3.5);
        g.lineStyle(2, INK, 1);
        g.strokeCircle(fx, fy, 8);
      }
      // grasping arms with worm fingers
      for (const [ax, ay, flip] of [[14, 60, -1], [106, 56, 1], [30, 100, -1]]) {
        g.fillStyle(rot, 1);
        g.fillRoundedRect(Math.min(ax, ax + flip * 22), ay - 6, 22, 12, 5);
        g.fillStyle(flesh, 1);
        for (let f = 0; f < 3; f++) {
          g.fillTriangle(ax + flip * 22, ay - 4 + f * 4, ax + flip * 30, ay - 2 + f * 4, ax + flip * 22, ay + f * 4);
        }
        g.lineStyle(2, INK, 1);
        g.strokeRoundedRect(Math.min(ax, ax + flip * 22), ay - 6, 22, 12, 5);
      }
      // drips
      g.fillStyle(dark, 1);
      for (const [dx, dy, dh] of [[46, 100, 12], [70, 104, 9], [90, 96, 11]]) {
        g.fillRect(dx, dy, 5, dh);
        g.fillCircle(dx + 2.5, dy + dh, 2.5);
      }
      g.lineStyle(4, INK, 1);
      g.strokeCircle(40, 74, 26);
      g.strokeCircle(62, 82, 30);
      g.strokeCircle(84, 72, 24);
    });

    // bg_car (F4 interior): ride INSIDE the Nightmare Express. Ceiling
    // lights + straps, window band with tunnel streaks, seat backs, map.
    // STREAMS via tilePositionX — the streaks sell the speed.
    this.stamp(['bg_car'], 1024, 720, (g) => {
      // ceiling
      g.fillStyle(0x1a1a24, 1);
      g.fillRect(0, 0, 1024, 120);
      g.fillStyle(0xfff2b0, 1);
      for (let x = 40; x < 1024; x += 128) {
        g.fillRoundedRect(x, 18, 64, 14, 6);
        g.fillStyle(0xffc93d, 0.3);
        g.fillEllipse(x + 32, 60, 90, 50);
        g.fillStyle(0xfff2b0, 1);
      }
      // hanging straps
      g.fillStyle(0x3a3a4a, 1);
      for (let x = 100; x < 1024; x += 160) {
        g.fillRect(x, 32, 6, 34);
        g.fillCircle(x + 3, 74, 9);
      }
      g.lineStyle(2, INK, 1);
      for (let x = 100; x < 1024; x += 160) g.strokeCircle(x + 3, 74, 9);
      // window band: dark glass + rushing light streaks
      g.fillStyle(0x101018, 1);
      g.fillRect(0, 130, 1024, 200);
      for (let x = 20; x < 1024; x += 170) {
        g.fillStyle(0x05050c, 1);
        g.fillRoundedRect(x, 145, 130, 170, 8);
        // tunnel lamps whipping past (horizontal streaks)
        g.fillStyle(0xfff2b0, 1);
        g.fillRect(x + 8, 180 + (x % 3) * 22, 46, 5);
        g.fillRect(x + 60, 230 - (x % 3) * 14, 56, 5);
        g.fillStyle(0xff7a30, 0.8);
        g.fillRect(x + 8, 260, 70, 4);
        g.lineStyle(3, 0x3a3f4a, 1);
        g.strokeRoundedRect(x, 145, 130, 170, 8);
      }
      // wall panels + RED LINE map strip
      g.fillStyle(0x23232e, 1);
      g.fillRect(0, 330, 1024, 130);
      g.lineStyle(2, 0x14141c, 1);
      for (let x = 0; x <= 1024; x += 128) g.lineBetween(x, 330, x, 460);
      g.fillStyle(0xf4ecd8, 1);
      g.fillRect(0, 380, 1024, 34);
      g.fillStyle(0xe02020, 1);
      g.fillRect(0, 392, 1024, 6);
      g.fillStyle(0x14101a, 1);
      for (let x = 30; x < 1024; x += 90) g.fillCircle(x, 397, 5);
      g.fillStyle(0x14101a, 1);
      g.fillRect(430, 384, 150, 26);
      g.fillStyle(0xffc93d, 1);
      g.fillRect(440, 390, 10, 10);
      g.fillRect(560, 390, 10, 10);
      // seat backs row (silhouettes along the bottom)
      g.fillStyle(0x2e1a3a, 1);
      for (let x = 10; x < 1024; x += 150) {
        g.fillRoundedRect(x, 500, 110, 120, 12);
        g.fillStyle(0x4a2a5a, 1);
        g.fillRect(x + 10, 510, 90, 8);
        g.fillStyle(0x2e1a3a, 1);
      }
      g.lineStyle(3, INK, 1);
      g.lineBetween(0, 460, 1024, 460);
    });

    // car_floor (F4): dark car carpet + yellow safety edge.
    this.stamp(['car_floor'], 96, 64, (g) => {
      g.fillStyle(0x26262e, 1);
      g.fillRect(0, 0, 96, 64);
      g.fillStyle(0x30303a, 1);
      for (let i = 0; i < 30; i++) {
        g.fillRect((i * 37) % 96, (i * 53) % 64, 3, 3);
      }
      g.fillStyle(0x1a1a20, 1);
      g.fillRect(0, 0, 96, 8);
      g.fillStyle(0xffc93d, 1);
      g.fillRect(0, 10, 96, 4);
      g.fillStyle(0xffc93d, 0.7);
      for (let hx = 2; hx < 96; hx += 12) {
        g.fillTriangle(hx, 56, hx + 6, 56, hx + 3, 61);
      }
      g.lineStyle(3, INK, 1);
      g.lineBetween(0, 8, 96, 8);
    });

    // Training dummy "Jeff" (F5): straw + post. Hits show HP pips. 56x64.
    this.stamp(['dummy'], 56, 64, (g) => {
      // post
      g.fillStyle(0x4a2e18, 1);
      g.fillRect(24, 20, 8, 44);
      g.lineStyle(2, INK, 1);
      g.lineBetween(24, 20, 24, 64);
      g.lineBetween(32, 20, 32, 64);
      // crossbar arms
      g.fillStyle(0x4a2e18, 1);
      g.fillRect(10, 26, 36, 7);
      g.lineStyle(2, INK, 1);
      g.strokeRect(10, 26, 36, 7);
      // straw body
      g.fillStyle(0xd8b060, 1);
      g.fillRoundedRect(16, 34, 24, 24, 6);
      g.fillStyle(0xb08840, 1);
      for (const [sx, sy] of [[20, 40], [30, 44], [24, 50], [33, 52]]) {
        g.lineBetween(sx, sy, sx + 4, sy + 3);
      }
      // straw head + stitched face
      g.fillStyle(0xd8b060, 1);
      g.fillCircle(28, 22, 11);
      g.fillStyle(INK, 1);
      g.fillCircle(24, 20, 1.8);
      g.fillCircle(32, 20, 1.8);
      g.lineBetween(23, 27, 33, 27);
      g.lineBetween(23, 27, 25, 25);
      g.lineBetween(33, 27, 31, 25);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(28, 22, 11);
      g.strokeRoundedRect(16, 34, 24, 24, 6);
      // stuffing poking out
      g.lineStyle(2, 0xd8b060, 1);
      g.lineBetween(16, 40, 10, 36);
      g.lineBetween(40, 46, 46, 42);
    });

    // Pedestal (F5 test ground): stone plinth for tryable power-ups. 48x64.
    this.stamp(['pedestal'], 48, 64, (g) => {
      // glow bed
      g.fillStyle(0x4df3ff, 0.25);
      g.fillEllipse(24, 50, 40, 14);
      // plinth
      g.fillStyle(0x5a5a6a, 1);
      g.fillRoundedRect(10, 30, 28, 30, 3);
      g.fillStyle(0x3a3a46, 1);
      g.fillRect(10, 30, 28, 6);
      g.fillStyle(0xffffff, 0.35);
      g.fillRect(12, 38, 5, 18);
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(10, 30, 28, 30, 3);
      // cap stone
      g.fillStyle(0x6a6a7a, 1);
      g.fillRoundedRect(6, 22, 36, 10, 3);
      g.lineStyle(2, INK, 1);
      g.strokeRoundedRect(6, 22, 36, 10, 3);
      // floating rune shard above (tinted per power-up at spawn)
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(24, 2, 30, 14, 18, 14);
      g.lineStyle(2, INK, 1);
      g.lineBetween(24, 2, 30, 14);
      g.lineBetween(30, 14, 18, 14);
      g.lineBetween(18, 14, 24, 2);
    });

    // ---------------- FLOOR (96x64) ----------------
    // Warm brown rubble, CREAM 6px top lip + black edge. Reads at distance.
    this.stamp(['floor_tile'], 96, 64, (g) => {
      // base
      g.fillStyle(PAL.floorBase, 1);
      g.fillRect(0, 0, 96, 64);
      // rubble chunks: alternating dark / mid bricks with dark seams
      const bricks = [
        [4, 16, 14, 9], [22, 14, 16, 11], [42, 16, 12, 9],
        [58, 14, 18, 11], [80, 16, 12, 9],
        [10, 29, 12, 8], [28, 30, 14, 8], [48, 29, 12, 9], [66, 30, 16, 8],
        [4, 41, 16, 8], [26, 42, 12, 8], [44, 41, 18, 8], [68, 42, 14, 8],
      ];
      bricks.forEach(([x, y, w, h], i) => {
        g.fillStyle(i % 2 === 0 ? PAL.floorBrick : PAL.floorDark, 1);
        g.fillRect(x, y, w, h);
        g.lineStyle(1, PAL.slabDark, 1);
        g.strokeRect(x, y, w, h);
      });
      // light-caught edges on a few chunks
      g.fillStyle(PAL.slabTop, 1);
      g.fillRect(4, 16, 14, 2);
      g.fillRect(22, 14, 16, 2);
      g.fillRect(58, 14, 18, 2);
      g.fillRect(28, 30, 14, 2);
      // rebar — rust lines poking through
      g.lineStyle(2, PAL.rust, 1);
      g.lineBetween(14, 34, 30, 28);
      g.lineBetween(52, 38, 68, 32);
      g.lineBetween(76, 26, 88, 32);
      g.lineBetween(36, 48, 52, 44);
      // dust at the bottom
      g.fillStyle(PAL.floorDark, 1);
      g.fillRect(0, 52, 96, 12);
      g.fillStyle(PAL.cream, 0.55);
      g.fillRect(8, 54, 5, 2);
      g.fillRect(34, 56, 4, 2);
      g.fillRect(60, 54, 6, 2);
      g.fillRect(82, 56, 4, 2);
      // CREAM top lip (the walk surface) + black edge under it
      g.fillStyle(PAL.cream, 1);
      g.fillRect(0, 0, 96, 6);
      g.fillStyle(INK, 1);
      g.fillRect(0, 6, 96, 2);
      // cracks across the lip
      g.lineStyle(1, PAL.slabDark, 1);
      g.lineBetween(12, 0, 18, 6);
      g.lineBetween(44, 0, 52, 6);
      g.lineBetween(74, 0, 82, 6);
      // lip highlight specks
      g.fillStyle(0xffffff, 1);
      g.fillRect(3, 1, 5, 1);
      g.fillRect(30, 1, 6, 1);
      g.fillRect(62, 1, 5, 1);
      g.fillRect(86, 1, 6, 1);
    });

    // ---------------- PLATFORM (128x40) ----------------
    // Concrete slab: light top, riveted front face, hazard END CAPS only
    // (confined bands — not a full-stripe glitch), dark under-hang + rebar.
    this.stamp(['platform'], 128, 40, (g) => {
      // main front face + light top + dark under-hang
      g.fillStyle(PAL.slabFace, 1);
      g.fillRect(0, 8, 128, 22);
      g.fillStyle(PAL.slabTop, 1);
      g.fillRect(0, 0, 128, 8);
      g.fillStyle(PAL.slabDark, 1);
      g.fillRect(0, 30, 128, 10);
      // face shading: darker bottom of face, light catch under top
      g.fillStyle(PAL.slabDark, 1);
      g.fillRect(0, 26, 128, 4);
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(0, 8, 128, 2);
      // panel seams (tile-safe: 32px grid divides 128)
      g.lineStyle(1, PAL.slabDark, 1);
      for (const sx of [32, 64, 96]) g.lineBetween(sx, 8, sx, 30);
      // top cracks
      g.lineStyle(1, PAL.slabDark, 1);
      g.lineBetween(18, 0, 30, 8);
      g.lineBetween(64, 0, 74, 8);
      g.lineBetween(104, 0, 114, 8);
      // hazard END CAPS: yellow bands with ink diagonals, front face only
      for (const hx of [0, 112]) {
        g.fillStyle(PAL.hazard, 1);
        g.fillRect(hx, 12, 16, 14);
        g.lineStyle(2, INK, 1);
        g.lineBetween(hx + 2, 26, hx + 8, 12);
        g.lineBetween(hx + 8, 26, hx + 14, 12);
        g.strokeRect(hx, 12, 16, 14);
      }
      // rivets along the face
      for (const rx of [28, 44, 60, 76, 92]) {
        g.fillStyle(PAL.brass, 1);
        g.fillCircle(rx, 21, 3);
        g.fillStyle(PAL.brassHi, 1);
        g.fillCircle(rx - 1, 20, 1.2);
        g.lineStyle(1, INK, 1);
        g.strokeCircle(rx, 21, 3);
      }
      // rebar + dust hanging below
      g.lineStyle(2, PAL.rust, 1);
      g.lineBetween(30, 40, 28, 34);
      g.lineBetween(64, 40, 66, 33);
      g.lineBetween(98, 40, 96, 34);
      // full ink border
      g.lineStyle(3, INK, 1);
      g.strokeRect(0, 0, 128, 40);
      g.lineBetween(0, 8, 128, 8);
      g.lineBetween(0, 30, 128, 30);
    });

    // Descent stairs — stone stairwell dropping into the deep. 160x160,
    // origin center: steps descend left→right, glow + arrow at the mouth.
    this.stamp(['descent_stairs'], 160, 160, (g) => {
      // back arch (dark hole)
      g.fillStyle(INK, 1);
      g.fillRoundedRect(8, 8, 144, 144, 10);
      g.fillStyle(0x05050c, 1);
      g.fillRoundedRect(14, 14, 132, 132, 8);
      // glow rising from below
      g.fillStyle(PAL.magic, 0.3);
      g.fillEllipse(80, 128, 90, 30);
      g.fillStyle(PAL.magic, 0.5);
      g.fillEllipse(80, 132, 56, 18);
      // steps: 5 slabs descending left→right into the dark
      for (let i = 0; i < 5; i++) {
        const sx = 22 + i * 22;
        const sy = 40 + i * 18;
        const shade = i % 2 === 0 ? PAL.slabTop : PAL.slabFace;
        g.fillStyle(shade, 1);
        g.fillRoundedRect(sx, sy, 26, 12, 2);
        g.fillStyle(0xffffff, 0.35);
        g.fillRect(sx + 2, sy + 1, 22, 2);
        g.lineStyle(2, INK, 1);
        g.strokeRoundedRect(sx, sy, 26, 12, 2);
      }
      // rail posts
      g.fillStyle(PAL.clubWood, 1);
      g.fillRect(20, 30, 6, 60);
      g.fillRect(128, 66, 6, 60);
      g.lineStyle(2, INK, 1);
      g.strokeRect(20, 30, 6, 60);
      g.strokeRect(128, 66, 6, 60);
      // hanging sign: ▼ DOWN
      g.fillStyle(PAL.gold, 1);
      g.fillRoundedRect(48, 18, 64, 20, 4);
      g.lineStyle(3, INK, 1);
      g.strokeRoundedRect(48, 18, 64, 20, 4);
      g.fillStyle(INK, 1);
      g.fillTriangle(56, 24, 64, 24, 60, 32);
      g.fillRect(68, 24, 28, 4);
      g.fillRect(68, 30, 20, 3);
      // ink frame
      g.lineStyle(4, INK, 1);
      g.strokeRoundedRect(8, 8, 144, 144, 10);
    });

    // Goal flag — legacy texture (kept: old screenshots reference it).
    // Ink pole, gold ball, bright cyan pennant, shine
    this.stamp(['goal_flag'], 80, 128, (g) => {
      // ground mound
      g.fillStyle(PAL.slabDark, 1);
      g.fillEllipse(14, 122, 28, 10);
      g.lineStyle(2, INK, 1);
      g.strokeEllipse(14, 122, 28, 10);
      // pole
      g.fillStyle(INK, 1);
      g.fillRect(8, 8, 10, 116);
      g.fillStyle(PAL.slabTop, 1);
      g.fillRect(9, 8, 3, 116);
      // gold ball
      g.fillStyle(PAL.gold, 1);
      g.fillCircle(13, 7, 6);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(11, 5, 2);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(13, 7, 6);
      // pennant
      const flag = [
        new Phaser.Math.Vector2(18, 16),
        new Phaser.Math.Vector2(72, 32),
        new Phaser.Math.Vector2(18, 50),
      ];
      g.fillStyle(PAL.magic, 1);
      g.fillPoints(flag, true);
      g.fillStyle(0xffffff, 0.85);
      g.fillRect(24, 22, 30, 3);
      g.fillStyle(PAL.heart, 1);
      g.fillCircle(30, 35, 4);
      g.lineStyle(3, INK, 1);
      g.strokePoints(flag, true);
    });
  }

  create() {
    // Start with the menu (so the player sees a title + how-to-play before
    // being dropped into Floor 1). The menu previews Carl & Donut, then
    // starts GameScene on SPACE/ENTER.
    this.scene.start('MenuScene');
  }
}
