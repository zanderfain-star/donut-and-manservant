import Phaser from 'phaser';
import { SpriteFactory } from '../entities/SpriteFactory.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Placeholder generated textures until CC0 art is sourced.
    // The entity-quality Carl + Donut come from SpriteFactory.
    SpriteFactory.generate(this);
    this.makePlaceholderTextures();
  }

  makePlaceholderTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // 1x1 transparent — invisible sprite body for physics-only entities
    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture('blank', 1, 1);
    g.clear();

    // Magic missile (Donut's eye-rocket)
    g.fillStyle(0x6effff, 1);
    g.fillCircle(8, 8, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 2);
    g.generateTexture('magic_missile', 16, 16);
    g.clear();

    // Punch arc
    g.lineStyle(3, 0xffb000, 1);
    g.strokeCircle(16, 16, 12);
    g.generateTexture('punch_arc', 32, 32);
    g.clear();

    // Enemy placeholder: dark etching-style silhouette
    g.fillStyle(0x2a1a1a, 1);
    g.fillRect(8, 6, 16, 22);
    g.fillStyle(0x4a0a0a, 1);
    g.fillRect(12, 12, 8, 4);
    g.generateTexture('enemy', 32, 32);
    g.clear();

    // Floor tile (dark etching feel)
    g.fillStyle(0x1a1410, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(1, 0x2a1a14, 1);
    g.strokeRect(0, 0, 64, 64);
    for (let i = 0; i < 5; i++) {
      g.strokeRect(Math.random() * 48, Math.random() * 48, 8, 8);
    }
    g.generateTexture('floor_tile', 64, 64);
    g.clear();

    // Platform (etching crosshatch)
    g.fillStyle(0x14100c, 1);
    g.fillRect(0, 0, 128, 32);
    g.lineStyle(1, 0x3a2418, 1);
    for (let x = 0; x < 128; x += 6) {
      g.lineBetween(x, 0, x, 32);
    }
    g.generateTexture('platform', 128, 32);
    g.clear();

    // Goal flag — bright cyan, contrasts with the dark floor
    g.fillStyle(0x14100c, 1);
    g.fillRect(0, 0, 16, 128); // pole
    g.fillStyle(0x6effff, 1);
    g.fillTriangle(16, 16, 80, 32, 16, 48);
    g.fillStyle(0xffffff, 1);
    g.fillRect(22, 24, 32, 2); // shine
    g.generateTexture('goal_flag', 80, 128);
    g.clear();

    g.destroy();
  }

  create() {
    // Start the real game. BootScene is a thin shell for texture generation.
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}