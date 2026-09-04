import Phaser from 'phaser';
import { SpriteFactory } from '../entities/SpriteFactory.js';

/*
 * GameScene — progression-first rebuild.
 *
 * One run, three zones:
 *   ENTRY TUNNELS (0–2000, goblins+rats) → THE GARBAGE (2000–4200, tinkers)
 *   → THE GYM (4200–6000, trogs) → BARON SWINE (borough boss) → stairs.
 *   Zones are mob-identified per DCC Book 1 canon — no throne room here.
 *
 * Ownership note: MenuScene / UIScene / BootScene / SpriteFactory are owned by
 * the art agent. This file only USES their existing APIs:
 *   SpriteFactory.createCarl / createDonut → container with
 *     .facing, .setFacing(dir), .playWalk(), .playIdle(),
 *     Donut ._floatOffsetY, shoulder-ride flags ._shoulderRide / ._shoulderEndAt
 *   BootScene textures: 'blank', 'enemy', 'floor_tile', 'platform',
 *     'descent_stairs', 'punch_arc', 'magic_missile'
 *   UIScene: bindToGame(this), showWin(achievements), showDeath(reason)
 *
 * Exposed for UI (read every frame by UIScene / HUD):
 *   this.hp, this.maxHP (=8), this.mana, this.maxMana (=5),
 *   this.score, this.combo, this.zoneName, this.won, this.dead,
 *   this.player, this.lastMagicAt, this.checkpoint
 * Events emitted: 'zone' (zoneName string), 'toast' (message string).
 * Registry mirrors: 'zone', 'score', 'hp', 'mana'.
 */

const WORLD_WIDTH = 6400;
const WORLD_HEIGHT = 720;
const FLOOR_Y = 640;
const END_X = 6000;
const SPAWN_X = 120;

const PLAYER = {
  maxHP: 8,
  speed: 280,
  jump: 720,
  accel: 1400,
  drag: 900,
  hurtIFrames: 1000,
  coyoteMs: 120,
  bufferMs: 120,
  punchCd: 220,
  magicCd: 350,
};

const MANA = {
  max: 5,
  start: 3,
  cost: 1,
  regenMs: 6000,
};

const FLOORS = {
  0: {
    // PRELEVEL: Seattle, the last night. No baddies, no pits, no boss —
    // grab Donut from the tree, outrun the collapse, take the stairs.
    zones: [
      { name: 'SEATTLE — 11:48 PM', x1: 0, x2: 3200, sub: 'The last night on the surface', banner: 0x8ad8ff, floor: 0x8a9ac0 },
    ],
    grades: [0x2a3a6a],
    checkpoints: [],
    pits: [],
    gates: [],
    platforms: [
      [700, 540, 160, 8], [1200, 500, 160, 8],
      [1800, 540, 160, 8], [2300, 500, 160, 8],
    ],
    spawns: [],
    pickups: [
      [750, 510, 'star'], [1250, 470, 'star'],
      [1850, 510, 'star'], [2350, 470, 'star'],
    ],
    boss: null,
    tips: [
      [700, 'FIRE HURTS — keep moving!'],
      [1200, 'A/D move • W/SPACE jump'],
      [4500, "Donut's in the tree — go get her!"],
      [8000, 'The world is ending. RUN →'],
      [11000, 'Take the STAIRS DOWN →'],
    ],
    worldW: 3200, endX: 2600,
    bg: 'bg_far', bgScroll: 0.2, floorTex: 'floor_tile', platformTint: 0x8a9ac0,
    clearTitle: 'THE WORLD ENDS!',
    clearSub: 'Carl runs into the dungeon… Floor 1 awaits.',
  },
  1: {
    zones: [
      { name: 'ENTRY TUNNELS', x1: 0, x2: 2000, sub: 'Mind the Murder Dozers', banner: 0xffc93d, floor: 0xffffff },
      { name: 'THE GARBAGE', x1: 2000, x2: 4200, sub: 'Something big lives in the trash', banner: 0x4df3ff, floor: 0xcfc2ff },
      { name: 'THE GYM', x1: 4200, x2: 6000, sub: 'Fitness. Weights. Gains.', banner: 0xff2e4d, floor: 0xffc4b0 },
    ],
    grades: [0xffc080, 0x6a4dff, 0xff4d4d],
    checkpoints: [
      { triggerX: 2100, respawnX: 2280, name: 'GARBAGE GATE' },
      { triggerX: 4300, respawnX: 4480, name: 'GYM GATE' },
    ],
    pits: [
      { x1: 2050, x2: 2200 },
      { x1: 4250, x2: 4400 },
    ],
    gates: [
      { x: 2000, label: 'GARBAGE', color: 0x4df3ff },
      { x: 4200, label: 'GYM', color: 0xff2e4d },
    ],
    platforms: [
      [380, 580, 160, 8], [620, 540, 160, 8], [860, 500, 160, 8],
      [1100, 580, 160, 8], [1340, 540, 160, 8], [1580, 500, 160, 8],
      [1820, 460, 160, 8],
      [2280, 580, 192, 8], [2520, 520, 160, 8], [2760, 480, 160, 8],
      [3000, 540, 160, 8], [3240, 580, 192, 8], [3480, 500, 160, 8],
      [3720, 460, 160, 8], [3960, 520, 160, 8],
      [4480, 580, 192, 8], [4720, 520, 160, 8], [4960, 480, 160, 8],
      [5200, 520, 160, 8], [5440, 580, 192, 8], [5680, 500, 192, 8],
    ],
    spawns: [
      { x: 520, type: 'goblin', range: 60 },
      { x: 800, type: 'rat', range: 70 },
      { x: 900, type: 'goblin', range: 60, py: 470 },
      { x: 1300, type: 'goblin', range: 70 },
      { x: 1650, type: 'goblin', range: 60, py: 470 },
      { x: 1900, type: 'rat', range: 50 },
      { x: 2400, type: 'goblin', range: 60 },
      { x: 2600, type: 'rat', range: 60 },
      { x: 2750, type: 'tinker', range: 70, py: 450 },
      { x: 3100, type: 'goblin', range: 70 },
      { x: 3500, type: 'trog', range: 60 },
      { x: 3900, type: 'tinker', range: 60, py: 490 },
      { x: 4100, type: 'goblin', range: 50 },
      { x: 4600, type: 'trog', range: 60 },
      { x: 4950, type: 'tinker', range: 70, py: 450 },
      { x: 5050, type: 'rat', range: 60 },
      { x: 5250, type: 'goblin', range: 70 },
      { x: 5560, type: 'trog', range: 60 },
      { x: 5820, type: 'goblin', range: 60 },
      { x: 5720, type: 'swine', range: 0 },
    ],
    pickups: [
      [700, 510, 'star'], [1150, 550, 'star'], [1500, 'GY', 'crystal'], [1850, 'GY', 'ham'],
      [2450, 'GY', 'star'], [2650, 'GY', 'crystal'], [2870, 450, 'star'], [3300, 'GY', 'star'],
      [3400, 'GY', 'ham'], [3650, 'GY', 'crystal'], [3870, 490, 'star'], [4150, 'GY', 'ham'],
      [4700, 'GY', 'crystal'], [4900, 'GY', 'ham'], [5050, 490, 'box'], [5300, 490, 'star'],
      [5520, 'GY', 'crystal'], [5650, 'GY', 'box'], [5780, 'GY', 'star'],
    ],
    boss: {
      type: 'swine', name: 'BARON SWINE', sub: '★ BOROUGH BOSS ★ PORKCHOP EXPRESS',
      roar: 'REEEEE!', roarToast: 'REEEEE! The Porkchop Express never stops!',
      killToast: 'THIS LITTLE PIGGY WENT TO MARKET',
    },
    tips: [
      [1200, 'A/D move • W/SPACE jump'],
      [4500, 'J punch • K stomp (mid-air!)'],
      [7800, 'L = Donut rocket (needs CRYSTAL fuel)'],
      [11000, 'HAM heals • STAR scores • take the STAIRS DOWN →'],
    ],
    worldW: 6400, endX: 6000,
    bg: 'bg_far', bgScroll: 0.2, floorTex: 'floor_tile', platformTint: null,
    clearTitle: 'FLOOR 1 CLEARED!',
    clearSub: 'Carl and Donut take the stairs… Floor 2 awaits.',
  },
  2: {
    // FLOOR 2: cinderblock grid, lichen, pound-chambers. Same engine, meaner.
    zones: [
      { name: 'THE CINDERS', x1: 0, x2: 2000, sub: 'Watch for scorch marks', banner: 0xff7a30, floor: 0xffd0a0 },
      { name: 'THE LICHEN MAZE', x1: 2000, x2: 4200, sub: 'Do not lick the walls', banner: 0x7aff6a, floor: 0xc0ffc0 },
      { name: 'THE POUND', x1: 4200, x2: 6000, sub: 'You hear distorted barking', banner: 0x9aa2ad, floor: 0xd0d0e0 },
    ],
    grades: [0xff7a30, 0x7aff6a, 0x9aa2ad],
    checkpoints: [
      { triggerX: 1950, respawnX: 2030, name: 'MAZE GATE' },
      { triggerX: 3950, respawnX: 4030, name: 'POUND GATE' },
    ],
    pits: [
      { x1: 1700, x2: 1850 },
      { x1: 3700, x2: 3850 },
    ],
    gates: [
      { x: 2000, label: 'LICHEN', color: 0x7aff6a },
      { x: 4200, label: 'POUND', color: 0x9aa2ad },
    ],
    platforms: [
      [300, 580, 160, 8], [520, 540, 160, 8], [760, 500, 160, 8],
      [1000, 580, 160, 8], [1240, 540, 160, 8], [1460, 470, 160, 8],
      [1920, 580, 192, 8], [2160, 520, 160, 8], [2400, 480, 160, 8],
      [2640, 540, 160, 8], [2880, 580, 192, 8], [3120, 500, 160, 8],
      [3360, 460, 160, 8], [3600, 520, 160, 8],
      [3920, 580, 192, 8], [4160, 520, 160, 8], [4400, 480, 160, 8],
      [4640, 520, 160, 8], [4880, 580, 192, 8], [5120, 500, 192, 8],
      [5560, 540, 192, 8],
    ],
    spawns: [
      { x: 450, type: 'goblin', range: 60 },
      { x: 650, type: 'rat', range: 70 },
      { x: 850, type: 'goblin', range: 60, py: 470 },
      { x: 1150, type: 'rat', range: 70 },
      { x: 1400, type: 'goblin', range: 60, py: 440 },
      { x: 1600, type: 'tinker', range: 60 },
      { x: 2050, type: 'goblin', range: 60 },
      { x: 2250, type: 'tinker', range: 70, py: 490 },
      { x: 2550, type: 'rat', range: 60 },
      { x: 2800, type: 'goblin', range: 70 },
      { x: 3050, type: 'trog', range: 60 },
      { x: 3400, type: 'tinker', range: 60, py: 430 },
      { x: 3550, type: 'rat', range: 60 },
      { x: 4100, type: 'goblin', range: 60 },
      { x: 4300, type: 'trog', range: 60 },
      { x: 4500, type: 'tinker', range: 70, py: 450 },
      { x: 4700, type: 'rat', range: 60 },
      { x: 4950, type: 'goblin', range: 70 },
      { x: 5200, type: 'trog', range: 60 },
      { x: 5450, type: 'rat', range: 60 },
      { x: 5600, type: 'goblin', range: 60 },
      { x: 5720, type: 'ralph', range: 0 },
    ],
    pickups: [
      [620, 510, 'star'], [1050, 550, 'ham'], [1350, 'GY', 'crystal'], [1600, 'GY', 'star'],
      [2100, 'GY', 'ham'], [2300, 490, 'star'], [2600, 'GY', 'crystal'], [2950, 'GY', 'star'],
      [3200, 'GY', 'ham'], [3450, 430, 'star'], [3600, 'GY', 'crystal'], [3850, 'GY', 'ham'],
      [4200, 'GY', 'crystal'], [4450, 450, 'star'], [4550, 'GY', 'box'], [4800, 'GY', 'ham'],
      [5050, 470, 'star'], [5350, 'GY', 'crystal'], [5520, 'GY', 'box'], [5700, 'GY', 'star'],
    ],
    boss: {
      type: 'ralph', name: 'RALPH', sub: '★ FRENZIED GERBIL ★ SQUEAKPOCALYPSE',
      roar: 'SKREEE!', roarToast: 'SKREEE! Ralph has left the chat!',
      killToast: 'POP GOES THE GERBIL',
    },
    tips: [
      [1200, 'Floor 2 hits harder — spend those Silver Boxes'],
      [4500, 'Ralph is faster than the Swine. Keep moving.'],
      [8000, 'Take the STAIRS DOWN →'],
    ],
    worldW: 6400, endX: 6000,
    bg: 'bg_cinder', bgScroll: 0.25, floorTex: 'floor_tile', platformTint: 0xffb080,
    clearTitle: 'FLOOR 2 CLEARED!',
    clearSub: 'Down the dark they go… Floor 3 awaits.',
  },
  3: {
    // FLOOR 3: THE OVER CITY — grey rubble, circus lights, crater's mold.
    zones: [
      { name: 'THE RUBBLE', x1: 0, x2: 2000, sub: 'Grey on grey on grey', banner: 0xb8b8c4, floor: 0xd0d0da },
      { name: 'CIRCUS GROUNDS', x1: 2000, x2: 4200, sub: 'The show never stopped', banner: 0xc93d8a, floor: 0xe0c0da },
      { name: 'THE CRATER', x1: 4200, x2: 6000, sub: 'Something skates down there', banner: 0x7a4a2a, floor: 0xffd0a8 },
    ],
    grades: [0x8a8aa0, 0xa04d8a, 0xff7a40],
    checkpoints: [
      { triggerX: 1900, respawnX: 1980, name: 'CIRCUS GATE' },
      { triggerX: 3900, respawnX: 3980, name: 'CRATER GATE' },
    ],
    pits: [
      { x1: 1600, x2: 1750 },
      { x1: 3500, x2: 3650 },
    ],
    gates: [
      { x: 2000, label: 'CIRCUS', color: 0xc93d8a },
      { x: 4200, label: 'CRATER', color: 0x7a4a2a },
    ],
    platforms: [
      [280, 580, 160, 8], [500, 540, 160, 8], [740, 500, 160, 8],
      [980, 580, 160, 8], [1220, 530, 160, 8], [1440, 470, 160, 8],
      [1820, 580, 192, 8], [2060, 520, 160, 8], [2300, 480, 160, 8],
      [2540, 540, 160, 8], [2780, 580, 192, 8], [3020, 500, 160, 8],
      [3260, 460, 160, 8], [3720, 580, 192, 8],
      [3960, 580, 192, 8], [4200, 520, 160, 8], [4440, 480, 160, 8],
      [4680, 520, 160, 8], [4920, 580, 192, 8], [5160, 500, 192, 8],
      [5560, 540, 192, 8],
    ],
    spawns: [
      { x: 420, type: 'goblin', range: 60 },
      { x: 640, type: 'drek', range: 70 },
      { x: 830, type: 'goblin', range: 60, py: 470 },
      { x: 1100, type: 'rat', range: 70 },
      { x: 1330, type: 'drek', range: 60, py: 440 },
      { x: 1520, type: 'goblin', range: 60 },
      { x: 1950, type: 'drek', range: 60 },
      { x: 2200, type: 'tinker', range: 70, py: 490 },
      { x: 2450, type: 'drek', range: 60 },
      { x: 2700, type: 'goblin', range: 70 },
      { x: 2950, type: 'trog', range: 60 },
      { x: 3180, type: 'drek', range: 60, py: 470 },
      { x: 3400, type: 'tinker', range: 60 },
      { x: 4050, type: 'drek', range: 60 },
      { x: 4300, type: 'trog', range: 60 },
      { x: 4550, type: 'drek', range: 70, py: 450 },
      { x: 4800, type: 'goblin', range: 70 },
      { x: 5050, type: 'tinker', range: 60 },
      { x: 5300, type: 'trog', range: 60 },
      { x: 5520, type: 'drek', range: 60 },
      { x: 5720, type: 'heather', range: 0 },
    ],
    pickups: [
      [600, 510, 'star'], [1000, 550, 'ham'], [1300, 'GY', 'crystal'], [1540, 440, 'star'],
      [2050, 'GY', 'star'], [2280, 490, 'crystal'], [2560, 'GY', 'ham'], [2900, 'GY', 'star'],
      [3120, 470, 'crystal'], [3350, 'GY', 'ham'], [3600, 'GY', 'star'], [3800, 'GY', 'crystal'],
      [4100, 'GY', 'ham'], [4350, 450, 'star'], [4480, 'GY', 'box'], [4750, 'GY', 'crystal'],
      [5000, 470, 'star'], [5280, 'GY', 'ham'], [5450, 'GY', 'box'], [5660, 'GY', 'star'],
    ],
    boss: {
      type: 'heather', name: 'HEATHER', sub: '★ MOLD BEAR ★ SKATES OF DOOM',
      roar: 'HONK!', roarToast: 'HONK! The rink is CLOSED!',
      killToast: 'BEAR NECESSITY AVERTED',
    },
    tips: [
      [1200, 'Floor 3: the Over City. Everything is grey. Everything bites.'],
      [4500, 'Drek swarm! Stomp the pack!'],
      [8000, 'Heather skates the crater. Take the STAIRS DOWN →'],
    ],
    worldW: 6400, endX: 6000,
    bg: 'bg_overcity', bgScroll: 0.22, floorTex: 'rubble_tile', platformTint: 0xc0c0cc,
    clearTitle: 'FLOOR 3 CLEARED!',
    clearSub: 'The tent folds… Floor 4 awaits.',
  },
  4: {
    // FLOOR 4: THE IRON TANGLE — the map IS the Nightmare Express.
    // Car roofs for floor, car gaps for pits. Tunnel streams past.
    zones: [
      { name: 'NIGHTMARE CARS', x1: 0, x2: 2000, sub: 'All aboard. No refunds.', banner: 0xe02020, floor: 0xd8d8e0 },
      { name: 'TRANSFER MAZE', x1: 2000, x2: 4200, sub: 'Mind the gap. Seriously.', banner: 0x4df3ff, floor: 0xc8d8e8 },
      { name: 'ABYSS EDGE', x1: 4200, x2: 6000, sub: 'Last stop: everywhere', banner: 0xff7a30, floor: 0xffd8b8 },
    ],
    grades: [0x8a2a3a, 0x2a6a8a, 0xff6a30],
    checkpoints: [
      { triggerX: 1620, respawnX: 1700, name: 'TRANSFER GATE' },
      { triggerX: 3570, respawnX: 3650, name: 'ABYSS GATE' },
    ],
    pits: [
      { x1: 1400, x2: 1550 },
      { x1: 3300, x2: 3450 },
    ],
    gates: [
      { x: 2000, label: 'TRANSFER', color: 0x4df3ff },
      { x: 4200, label: 'ABYSS', color: 0xff7a30 },
    ],
    platforms: [
      [260, 580, 160, 8], [480, 540, 160, 8], [700, 500, 160, 8],
      [920, 580, 160, 8], [1140, 540, 160, 8], [1620, 580, 192, 8],
      [1860, 520, 160, 8], [2100, 480, 160, 8], [2340, 540, 160, 8],
      [2580, 580, 192, 8], [2820, 500, 160, 8], [3060, 460, 160, 8],
      [3520, 580, 192, 8],
      [3720, 580, 192, 8], [3960, 520, 160, 8], [4200, 480, 160, 8],
      [4440, 520, 160, 8], [4680, 580, 192, 8], [4920, 500, 192, 8],
      [5160, 540, 192, 8], [5560, 540, 192, 8],
    ],
    spawns: [
      { x: 400, type: 'drek', range: 60 },
      { x: 620, type: 'goblin', range: 60 },
      { x: 800, type: 'drek', range: 60, py: 470 },
      { x: 1050, type: 'rat', range: 70 },
      { x: 1250, type: 'tinker', range: 60 },
      { x: 1700, type: 'goblin', range: 60 },
      { x: 1950, type: 'drek', range: 70, py: 490 },
      { x: 2200, type: 'rat', range: 60 },
      { x: 2450, type: 'goblin', range: 70 },
      { x: 2700, type: 'tinker', range: 60 },
      { x: 2950, type: 'drek', range: 60, py: 470 },
      { x: 3180, type: 'goblin', range: 60 },
      { x: 3600, type: 'drek', range: 60 },
      { x: 3850, type: 'trog', range: 60 },
      { x: 4100, type: 'tinker', range: 70, py: 450 },
      { x: 4350, type: 'drek', range: 60 },
      { x: 4550, type: 'goblin', range: 70 },
      { x: 4800, type: 'rat', range: 60 },
      { x: 5050, type: 'trog', range: 60 },
      { x: 5280, type: 'drek', range: 60 },
      { x: 5500, type: 'goblin', range: 60 },
      { x: 5720, type: 'amalgam', range: 0 },
    ],
    pickups: [
      [560, 510, 'star'], [950, 550, 'ham'], [1200, 'GY', 'crystal'], [1560, 440, 'star'],
      [1900, 'GY', 'ham'], [2150, 450, 'star'], [2400, 'GY', 'crystal'], [2650, 'GY', 'star'],
      [2900, 470, 'ham'], [3110, 'GY', 'crystal'], [3400, 'GY', 'star'], [3660, 'GY', 'ham'],
      [3900, 'GY', 'crystal'], [4150, 450, 'star'], [4300, 'GY', 'box'], [4520, 'GY', 'ham'],
      [4780, 470, 'star'], [5000, 'GY', 'crystal'], [5220, 'GY', 'box'], [5450, 'GY', 'star'],
      [5660, 'GY', 'ham'],
    ],
    boss: {
      type: 'amalgam', name: 'GHOUL AMALGAM', sub: '★ FESTERING MASS ★ ALL ABOARD',
      roar: 'BLORP!', roarToast: 'BLORP! No ticket? No problem. You are the ticket.',
      killToast: 'COMPOSTED',
    },
    tips: [
      [1200, 'Floor 4: the Nightmare Express. Do NOT miss your stop.'],
      [4500, 'MIND THE GAP. The gaps are real.'],
      [8000, 'Something festering guards the stairs →'],
    ],
    worldW: 6400, endX: 6000,
    bg: 'bg_car', bgScroll: 0.5, floorTex: 'car_floor', platformTint: 0x9ab8d8,
    stream: true,
    clearTitle: 'FLOOR 4 CLEARED!',
    clearSub: 'The dungeon shudders below… TO BE CONTINUED.',
  },
  5: {
    // FLOOR 5: SAFE ROOM + DESPERADO CLUB — no fighting (except Jeff).
    // Power-up test ground: pedestals grant experimental buffs, straw
    // dummies respawn so Carl can feel the numbers. Stairs end the demo.
    zones: [
      { name: 'SAFE ROOM', x1: 0, x2: 1200, sub: 'No fighting. Except Jeff.', banner: 0x4df3ff, floor: 0xd8e8f0 },
      { name: 'DESPERADO CLUB', x1: 1200, x2: 2400, sub: 'Try the specials', banner: 0xffb060, floor: 0xf0e0c8 },
    ],
    grades: [0x4d8ab8, 0xffb060],
    checkpoints: [],
    pits: [],
    gates: [
      { x: 1200, label: 'CLUB', color: 0xffb060 },
    ],
    platforms: [
      [500, 540, 160, 8],
      [1500, 540, 192, 8],
    ],
    spawns: [],
    pickups: [],
    boss: null,
    tips: [
      [1200, 'Welcome to the DESPERADO CLUB. Bopca keeps the bar.'],
      [4500, 'Pedestals grant experimental buffs. Jeff volunteers.'],
      [8000, 'Stairs at the far end when you are bored →'],
    ],
    pedestals: [
      { x: 600, kind: 'boots', label: 'SWIFT BOOTS', color: 0x4df3ff },
      { x: 900, kind: 'knuckles', label: 'BRASS+2', color: 0xffb000 },
      { x: 1500, kind: 'overdrive', label: 'OVERDRIVE', color: 0xff5a20 },
      { x: 1800, kind: 'quake', label: 'QUAKE', color: 0x7aff6a },
    ],
    dummies: [1050, 1400, 2100],
    worldW: 2400, endX: 2000,
    bg: 'bg_far', bgScroll: 0.2, floorTex: 'floor_tile', platformTint: 0xd8c8a8,
    clearTitle: 'RESTED & READY!',
    clearSub: 'The dungeon waits… Floor 6 someday.',
  },
};

// Mongo's growth curve, one row per zone across BOTH floors (LV 1-6).
// He gets bigger, bites faster, and roams a little farther — but he only
// ever hunts rats, still leashed to Donut. Never overpowered, just braver.
const MONGO_LEVELS = [
  { scale: 1.0, chew: 1.0, speed: 320, leash: 380 },   // LV 1 — tunnels baby
  { scale: 1.15, chew: 0.7, speed: 340, leash: 460 },  // LV 2 — garbage toddler
  { scale: 1.3, chew: 0.5, speed: 360, leash: 540 },   // LV 3 — gym kid
  { scale: 1.4, chew: 0.4, speed: 380, leash: 620 },   // LV 4 — cinders teen
  { scale: 1.5, chew: 0.35, speed: 400, leash: 700 },  // LV 5 — lichen hunter
  { scale: 1.6, chew: 0.3, speed: 420, leash: 780 },   // LV 6 — pound terror
  { scale: 1.7, chew: 0.3, speed: 440, leash: 860 },   // LV 7 — rubble teen
  { scale: 1.8, chew: 0.28, speed: 460, leash: 940 },  // LV 8 — circus hand
  { scale: 1.9, chew: 0.25, speed: 480, leash: 1020 }, // LV 9 — crater kid
  { scale: 2.0, chew: 0.25, speed: 500, leash: 1100 }, // LV 10 — conductor
  { scale: 2.1, chew: 0.22, speed: 520, leash: 1180 }, // LV 11 — brakeman
  { scale: 2.2, chew: 0.2, speed: 540, leash: 1260 },  // LV 12 — abyss terror
];
// Guard instinct: a dangerous mob THIS close to Donut triggers full recall.
// Anything farther just tightens his leash (min 60px) so he still darts out
// for rats instead of cowering home for the whole room.
const MONGO_PANIC = 70;

// Book-aligned Floor 1 roster (DCC Book 1: goblins, rats, troglodytes).
// body/off are Arcade-physics rects in TEXTURE px, bottom-aligned so visual
// feet touch the floor: bodyBottom - centerY == feet. feetScaled = feet*scale
// is the sprite-center height above any surface (floor or walkway top).
const ENEMY_TYPES = {
  goblin: { hp: 1, speed: 140, score: 50, scale: 1.0, tint: 0xffffff, label: 'GOBLIN', tex: 'enemy_goblin', feet: 26, body: [38, 46], off: [9, 8] },
  tinker: { hp: 1, speed: 60, score: 75, scale: 0.95, tint: 0xffffff, label: 'TINKER', tex: 'enemy_tinker', feet: 26, body: [38, 46], off: [9, 8] },
  trog: { hp: 3, speed: 40, score: 150, scale: 1.45, tint: 0xffffff, label: 'TROG', tex: 'enemy_trog', feet: 34, body: [44, 60], off: [14, 10] },
  rat: { hp: 1, speed: 200, score: 40, scale: 0.8, tint: 0xffffff, label: 'RAT', tex: 'enemy_rat', feet: 24, body: [46, 22], off: [5, 30] },
  // JEFF (F5 test dummy): straw, harmless, respawns, shows HP pips.
  dummy: { hp: 6, speed: 0, score: 0, scale: 1.0, tint: 0xffffff, label: 'JEFF', tex: 'dummy', feet: 30, body: [36, 56], off: [10, 6] },
  // BARON SWINE — Floor 1 borough boss. Tuxedo boar bruiser, stalks the
  // arena on foot and lunges, max 2 dmg/hit.
  swine: { hp: 12, speed: 55, score: 1000, scale: 1.0, tint: 0xffffff, label: 'BARON SWINE', tex: 'boss_swine', feet: 58, body: [90, 100], off: [15, 18] },
  // RALPH — Floor 2 frenzied gerbil. Faster, frailer, same porkchop energy.
  ralph: { hp: 8, speed: 95, score: 1500, scale: 1.0, tint: 0xffffff, label: 'RALPH', tex: 'boss_ralph', feet: 58, body: [90, 100], off: [15, 18] },
  // DREK — knee-high demonic infant. Fast, weak, swarms in 3-4.
  drek: { hp: 1, speed: 230, score: 60, scale: 0.9, tint: 0xffffff, label: 'DREK', tex: 'enemy_drek', feet: 24, body: [40, 44], off: [8, 4] },
  // HEATHER — Floor 3 mold bear on skates. Quick for her size.
  heather: { hp: 10, speed: 70, score: 2000, scale: 1.0, tint: 0xffffff, label: 'HEATHER', tex: 'boss_heather', feet: 58, body: [90, 100], off: [15, 18] },
  // GHOUL AMALGAM — Floor 4 festering mass. Slow, enormous HP pool feel.
  amalgam: { hp: 14, speed: 45, score: 2500, scale: 1.0, tint: 0xffffff, label: 'GHOUL AMALGAM', tex: 'boss_amalgam', feet: 58, body: [90, 100], off: [15, 18] },
};

// Dungeon Crawler World chat: cheers that pop over kills (reader easter egg).
const CHAT_CHEERS = [
  'POGGERS', 'o7', 'CLIPPED!', '+1 SUB', 'CHAT GOES WILD',
  'DONUTFAN_99: SCREAMING', 'MORDECAI NODS', 'THAT\'S THE MONTAGE',
  'L + BOZO (the mob)', 'GODDAMMIT, DONUT!',
];

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    // Floor routing: explicit {floor} wins (menu boots 0, stairs pass n+1);
    // retries fall back to the registry; fresh boot starts at the prelevel.
    const reg = this.registry ? this.registry.get('floor') : undefined;
    this.floor = (data && data.floor !== undefined) ? data.floor : (reg !== undefined ? reg : 0);
    if (!FLOORS[this.floor]) this.floor = 0;
  }

  // Floor transition: carry score + box upgrades downstairs, fresh HP/mana.
  startFloor(n) {
    this.registry.set('score', this.score);
    this.registry.set('maxHP', this.maxHP);
    this.registry.set('maxMana', this.maxMana);
    this.registry.set('punchDmg', this.punchDmg);
    this.registry.set('floor', n);
    this.scene.restart({ floor: n });
  }

  create() {
    const F = FLOORS[this.floor];
    this.zones = F.zones;
    this.checkpoints = F.checkpoints;
    this.pits = F.pits;
    this.worldW = F.worldW;
    this.endX = F.endX;
    this.END_X = F.endX; // UIScene reads g.endX/g.END_X for progress
    this.bossDef = F.boss;
    this.bossType = F.boss ? F.boss.type : null;
    this.boss = null;
    this.bossIntroduced = false;
    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.setBounds(0, 0, this.worldW, WORLD_HEIGHT);
    // The descend sequence fades this camera out; restarts reuse the same
    // camera object, so always fade back in on (re)create.
    this.cameras.main.fadeIn(250, 0, 0, 0);

    this.buildBackground();
    this.ensurePickupTextures();

    // ----- PHYSICS WORLD -----
    this.floorGroup = this.physics.add.staticGroup();
    this.platformGroup = this.physics.add.staticGroup();
    this.buildFloor();
    this.buildPlatforms();
    this.placeDebris();
    this.buildZoneGates();

    // ----- PLAYER -----
    // Body 36w x 70h; player.x/y is the body CENTER, feet at y+35.
    this.player = this.physics.add.sprite(SPAWN_X, FLOOR_Y - 35, 'blank');
    this.player.setVisible(false);
    this.player.body.setSize(36, 70).setOffset(-18, -35);
    this.player.setMaxVelocity(PLAYER.speed, 1100);
    this.player.setDragX(PLAYER.drag);

    this.carlVis = SpriteFactory.createCarl(this, this.player.x, this.player.y);
    this.carlVis.setDepth(20);

    this.donutVis = SpriteFactory.createDonut(this, this.player.x - 56, this.player.y - 52);
    this.donutVis.setDepth(21);
    this.donutVis._shoulderRide = false;
    this.donutVis._shoulderEndAt = 0;
    // Floor 0 cold open: Donut waits in the tree until Carl comes for her.
    this.donutWaiting = this.floor === 0;
    if (this.donutWaiting) {
      this.donutVis.x = 250;
      this.donutVis.y = FLOOR_Y - 138;
    }

    // Mongo — Donut's baby raptor. Trails the party, snacks on the fallen.
    // Starts at the floor's first LV ((floor-1)*3+1); each new zone levels
    // him up (see MONGO_LEVELS + mongoLevelUp()). Not yet met on Floor 0.
    this.corpses = [];
    this.mongoLevel = Math.min(MONGO_LEVELS.length, Math.max(1, (this.floor - 1) * 3 + 1));
    // Test-ground buffs (F5 pedestals): reset every floor.
    this.buffs = { speed: 1, punchReach: 0, manaFreeUntil: 0, stompMul: 1 };
    // Floor 0 is before they meet Mongo — he joins on Floor 1.
    this.mongo = this.floor === 0 ? null
      : this.add.image(this.player.x - 80, FLOOR_Y - 22, 'mongo').setDepth(22);
    if (this.mongo) this.mongo.setScale(MONGO_LEVELS[this.mongoLevel - 1].scale);
    this.mongoTarget = null;
    this.mongoEatT = 0;
    this.mongoFightT = 0;
    this.mongoHopT = 0;
    this.mongoSnackShouted = false;

    // ----- EXPOSED STATE (UI reads this) -----
    // Fresh floor: full HP/mana. Score + box upgrades carry downstairs on
    // every floor except the prelevel (floor 0 always starts a clean run —
    // this also keeps F1 death-retries from wiping your score).
    const carry = this.floor >= 1;
    this.maxHP = carry ? (this.registry.get('maxHP') || PLAYER.maxHP) : PLAYER.maxHP;
    this.hp = this.maxHP;
    this.maxMana = carry ? (this.registry.get('maxMana') || MANA.max) : MANA.max;
    this.mana = this.maxMana;
    this.punchDmg = carry ? (this.registry.get('punchDmg') || 1) : 1;
    this.score = carry ? (this.registry.get('score') || 0) : 0;
    this.registry.set('score', this.score);
    this.registry.set('floor', this.floor);
    this.manaRegenAcc = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.zoneName = this.zones[0].name;
    // Run flags: scene instances are REUSED across stop/start, so every
    // transient flag must reset here. (Missed `descending` once locked all
    // input forever on every floor after a stair transition.)
    this.descending = false;
    this.stomping = false;
    this._stompWasAir = false;
    this._stompBoot = null;
    this.donutOrbitT = 0;
    this.lastBlockToastAt = -10000;
    this.won = false;
    this.dead = false;
    this.lastHurtAt = -10000;
    this.lastPunchAt = -10000;
    this.lastMagicAt = -10000;
    this.lastGroundedAt = -10000;
    this.lastJumpAt = -10000;
    this.stomping = false;
    // Playstyle stats for the end-of-floor goofy achievements.
    this.stats = {
      punch: 0, stomp: 0, magic: 0, mongo: 0, casts: 0,
      dmg: 0, pits: 0, ham: 0, star: 0, crystal: 0, box: 0, swine: 0, ralph: 0, heather: 0, amalgam: 0,
      t0: this.time.now,
    };
    // Zones visited (per floor) — SIGHTSEER needs all three.
    this.visitedZones = new Set([0]);
    this.donutOrbitT = 0;
    this.checkpoint = { x: SPAWN_X, y: FLOOR_Y - 35, name: 'START' };
    this.nextCheckpointIdx = 0;

    // ----- GROUPS -----
    this.enemies = this.physics.add.group();
    this.spawnEnemies();

    this.missiles = this.physics.add.group({
      defaultKey: 'magic_missile',
      maxSize: 12,
      runChildUpdate: false,
    });
    this.enemyShots = this.physics.add.group({
      defaultKey: 'enemy_spit',
      maxSize: 16,
      runChildUpdate: false,
    });

    this.pickups = this.physics.add.group({ runChildUpdate: false });
    this.spawnPickups();

    // Floor 5 test ground: room decor, buff pedestals, respawning Jefferies.
    if (this.floor === 5) {
      this.buildSafeRoom();
      this.spawnPedestals();
      for (const dx of (FLOORS[5].dummies || [])) this.spawnDummy(dx, true);
      this.time.addEvent({
        delay: 2000, loop: true,
        callback: () => this.restockDummies(),
      });
    }

    // ----- KILL ZONES (pits) -----
    this.player.setCollideWorldBounds(false, false, false, false);
    this.physics.world.setBounds(0, 0, this.worldW, WORLD_HEIGHT, false, true, true, false, false);

    this.killBodies = [];
    for (const k of this.pits) {
      const w = k.x2 - k.x1;
      const z = this.add.zone(k.x1 + w / 2, FLOOR_Y + 10, w, 800).setOrigin(0.5, 0);
      this.physics.add.existing(z, true);
      this.killBodies.push(z);
    }

    this.buildGoal();

    // ----- COLLISIONS -----
    this.physics.add.collider(this.player, this.floorGroup, () => {
      if (this.stomping || this._stompWasAir) this.stompLandFx();
      else this.stomping = false;
    });
    // Dome wall: solid while the boss lives, removed with the boss.
    // (No wall on Floor 0 — open stairs.)
    if (this.domeWall) {
      this.domeCollider = this.physics.add.collider(this.player, this.domeWall);
    }
    this.physics.add.collider(
      this.player,
      this.platformGroup,
      () => { this.stomping = false; this.stompLandFx(); },
      (p, s) => this.playerOnPlatform(p, s),
      this,
    );
    this.physics.add.collider(this.enemies, this.floorGroup);
    this.physics.add.collider(this.enemies, this.platformGroup);
    this.physics.add.collider(this.missiles, this.floorGroup, (m) => this.killMissile(m));
    // Missiles FLY THROUGH platforms (thin 8px ledges) — they only die on
    // the floor or on enemies. Otherwise every bolt fired from the floor
    // under a y580 walk-under step dies on its edge. Enemies on platforms
    // are still hit via the missiles↔enemies overlap below.
    this.physics.add.collider(this.enemyShots, this.floorGroup, (s) => this.killShot(s));
    this.physics.add.collider(this.enemyShots, this.platformGroup, (s) => this.killShot(s));

    this.physics.add.overlap(this.player, this.enemies, (_, e) => this.playerHitsEnemy(e));
    this.physics.add.overlap(this.missiles, this.enemies, (m, e) => {
      if (!m.active || !e.alive) return;
      this.damageEnemy(e, 1, 'magic');
      this.killMissile(m);
    });
    this.physics.add.overlap(this.player, this.enemyShots, (p, s) => {
      if (!s.active) return;
      this.killShot(s);
      this.hurtPlayer(1, s.x);
    });
    this.physics.add.overlap(this.player, this.pickups, (_, p) => this.collectPickup(p));
    this.physics.add.overlap(this.player, this.killBodies, () => this.pitFall());
    this.physics.add.overlap(this.player, this.stairZone, () => this.tryDescend());

    // ----- INPUT -----
    this.keys = this.input.keyboard.addKeys({
      left: 'A', right: 'D',
      jump: 'W', jumpAlt: 'SPACE', jumpArrow: 'UP',
      punch: 'J', stomp: 'K', magic: 'L',
    });
    this.input.keyboard.resetKeys();

    // ----- CAMERA -----
    this.cameras.main.startFollow(this.player, true, 0.5, 0.5);
    this.cameras.main.setDeadzone(40, 30);
    this.cameras.main.setLerp(0.5, 0.5);

    // Per-floor backdrop (F4's tunnel streams in update()).
    this.bgStreaming = FLOORS[this.floor].stream === true;
    this.bgFar = this.add.tileSprite(0, 0, this.worldW, WORLD_HEIGHT, FLOORS[this.floor].bg)
      .setOrigin(0, 0)
      .setScrollFactor(FLOORS[this.floor].bgScroll || 0.2, 0)
      .setDepth(0)
      .setAlpha(0.6);
    if (this.floor === 4) this.buildTrainFx();

    // Per-zone color grade: tunnels warm, garbage sickly violet, gym hot.
    // A whisper of a wash (alpha ~0.05) — enough to feel the descent
    // without drowning the dungeon mood.
    this.zoneGrade = this.add.rectangle(640, 360, 1280, 720, F.grades[0], 0.05)
      .setScrollFactor(0, 0)
      .setDepth(2);

    this.buildGroundPanel();
    if (this.floor === 0) this.buildPrelevel();

    // HUD bind (UIScene owned by art agent — just hand it our reference)
    const ui = this.scene.get('UIScene');
    if (ui && typeof ui.bindToGame === 'function') ui.bindToGame(this);

    // Publish initial zone for UI
    this.events.emit('zone', this.zoneName);
    this.registry.set('zone', this.zoneName);
    this.registry.set('hp', this.hp);
    this.registry.set('mana', this.mana);
    const z0 = this.zones[0];
    this.showZoneBanner(z0.name, z0.sub, true);
    // Tutorial beats — per floor, unmissable in the first seconds
    const tips = FLOORS[this.floor].tips;
    for (const [at, msg] of tips) {
      this.time.delayedCall(at, () => {
        if (this.dead || this.won) return;
        this.events.emit('toast', msg);
      });
    }
  }

  /* ==========================================================
   * WORLD BUILDING
   * ========================================================== */

  // Iron Tangle motion kit: station signs whip past + the whole train hums.
  buildTrainFx() {
    this.trainSigns = ['STATION 112', 'RED LINE', 'MIND THE GAP', 'ABYSS 436 →'];
    this.trainSignIdx = 0;
    this.time.addEvent({
      delay: 4200, loop: true,
      callback: () => {
        if (this.dead || this.won) return;
        const label = this.trainSigns[this.trainSignIdx % this.trainSigns.length];
        this.trainSignIdx += 1;
        const sign = this.add.text(
          this.cameras.main.scrollX + 1400, 180, `◤ ${label} ◢`,
          {
            fontFamily: '"Courier New", monospace', fontSize: '26px', fontStyle: 'bold',
            color: '#7affff', backgroundColor: '#0a0a12', padding: { x: 12, y: 8 },
          },
        ).setDepth(1).setAlpha(0.95);
        this.tweens.add({
          targets: sign, x: this.cameras.main.scrollX - 500, duration: 2600, ease: 'Linear',
          onComplete: () => sign.destroy(),
        });
      },
    });
  }

  buildBackground() {
    // 'bg_far' serves floors 0-1; F2+ backdrops come from BootScene stamps.
    if (this.floor > 1) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const W = 1024;
    const H = WORLD_HEIGHT;
    for (let y = 0; y < H; y += 4) {
      const t = y / H;
      const r = Math.floor(0x0a * (1 - t) + 0x04 * t);
      const gC = Math.floor(0x0a * (1 - t) + 0x02 * t);
      const b = Math.floor(0x18 * (1 - t) + 0x08 * t);
      g.fillStyle((r << 16) | (gC << 8) | b, 1);
      g.fillRect(0, y, W, 4);
    }
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

  zoneAt(x) {
    for (const z of this.zones) if (x >= z.x1 && x < z.x2) return z;
    return this.zones[this.zones.length - 1];
  }

  buildFloor() {
    const isInPit = (x) => this.pits.some((p) => x >= p.x1 && x < p.x2);
    // Top layer — tinted per zone so each third of the run reads differently.
    for (let x = 0; x < this.worldW; x += 96) {
      if (isInPit(x)) continue;
      const tile = this.floorGroup.create(x + 48, FLOOR_Y + 32, FLOORS[this.floor].floorTex);
      tile.setTint(this.zoneAt(x + 48).floor);
      tile.refreshBody();
    }
    // Dark body below, skipping pits so Carl falls through.
    for (let layer = 1; layer <= 4; layer++) {
      const yOffset = FLOOR_Y + 32 + layer * 64;
      const darker = layer === 1 ? 0x1a1208 : layer === 2 ? 0x140e06 : layer === 3 ? 0x0e0a04 : 0x080602;
      for (let x = 0; x < this.worldW; x += 96) {
        if (isInPit(x)) continue;
        const tile = this.floorGroup.create(x + 48, yOffset, FLOORS[this.floor].floorTex);
        tile.setTint(darker);
        tile.refreshBody();
      }
    }
    // Lit horizon line at the floor edge.
    this.add.rectangle(this.worldW / 2, FLOOR_Y, this.worldW, 2, 0x6e4828)
      .setOrigin(0.5, 0)
      .setDepth(2)
      .setAlpha(0.85);
  }

  buildPlatforms() {
    // [x, y, w, h] — y is the TOP of the 8px step; visual slab hangs below.
    // All tops at y >= 455 (reachable: jump 720 / gravity 1400 ≈ 185px rise).
    // No super-low walk-under traps: lowest top is 540 (100px headroom, so
    // baddies never wedge under a slab). Boss stair-arenas (x>5350) stay
    // flat floor so bosses never get stuck either.
    let platformDefs = FLOORS[this.floor].platforms;
    if (this.bossType) platformDefs = platformDefs.filter(([x]) => x <= 5350);
    platformDefs = platformDefs.map(([x, y, w, h]) => [x, Math.min(y, 540), w, h]);
    this.platformTops = [];
    for (const [x, y, w, h] of platformDefs) {
      const step = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
      this.physics.add.existing(step, true);
      // Body already matches the rect exactly (origin 0.5) — any offset
      // shifts collision off the visual (was -w/2: stood on thin air).
      step.body.setSize(w, h).setOffset(0, 0);
      step.setData('topY', y);
      this.platformGroup.add(step);
      this.platformTops.push({ x1: x, x2: x + w, top: y });
      // TILED (not stretched): rivets + hazard caps repeat cleanly at any
      // width instead of smearing.
      const plat = this.add.tileSprite(x + w / 2, y + 20, w, 40, 'platform')
        .setDepth(3);
      if (FLOORS[this.floor].platformTint) plat.setTint(FLOORS[this.floor].platformTint);
    }
  }

  // One-way platforms: jump up through from below, land on top, walk off
  // to drop. Enemies keep solid collision so they patrol the walkway.
  playerOnPlatform(player, step) {
    const topY = step.getData ? step.getData('topY') : null;
    if (topY === null || topY === undefined) return true;
    const feetY = player.y + 35; // body bottom (36x70 centered)
    const falling = player.body.velocity.y >= -50;
    return falling && feetY <= topY + 14;
  }

  placeDebris() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x3a2a1c, 1);
    g.fillRect(0, 0, 128, 96);
    g.lineStyle(1, 0x1a0e08, 1);
    for (let y = 16; y < 96; y += 16) g.lineBetween(0, y, 128, y);
    for (let x = 32; x < 128; x += 32) g.lineBetween(x, 0, x, 96);
    g.lineStyle(2, 0x0a0604, 1);
    g.lineBetween(10, 4, 30, 30);
    g.lineBetween(40, 20, 60, 60);
    g.lineBetween(70, 6, 90, 40);
    g.lineBetween(100, 30, 120, 80);
    g.fillStyle(0x5a4028, 1);
    g.fillRect(0, 0, 16, 4);
    g.fillRect(64, 32, 8, 4);
    g.fillRect(20, 64, 12, 6);
    g.generateTexture('debris_wall', 128, 96);
    g.clear();

    g.fillStyle(0x4a3a28, 1);
    g.fillRect(0, 0, 160, 24);
    g.lineStyle(1, 0x1a0e08, 1);
    g.lineBetween(0, 12, 160, 12);
    g.lineBetween(40, 0, 40, 24);
    g.lineBetween(100, 0, 100, 24);
    g.lineStyle(2, 0x8a4820, 1);
    g.lineBetween(20, 6, 28, 18);
    g.lineBetween(80, 4, 88, 20);
    g.lineBetween(130, 6, 138, 18);
    g.generateTexture('debris_beam', 160, 24);
    g.clear();

    g.fillStyle(0x3a2a1c, 1);
    g.fillRect(0, 0, 64, 80);
    g.lineStyle(1, 0x1a0e08, 1);
    g.strokeRect(0, 0, 64, 80);
    g.lineBetween(32, 0, 32, 80);
    g.fillStyle(0x0a0604, 1);
    g.fillTriangle(8, 0, 24, 0, 16, 12);
    g.fillTriangle(40, 0, 56, 0, 48, 8);
    g.fillStyle(0x6e4828, 1);
    g.fillRect(2, 0, 4, 2);
    g.fillRect(34, 0, 4, 2);
    g.generateTexture('debris_column', 64, 80);
    g.clear();
    g.destroy();

    const debrisDefs = [
      [120, 280, 'debris_wall', 1.6, 0.05, 0.7],
      [720, 240, 'debris_wall', 1.4, -0.08, 0.65],
      [1380, 220, 'debris_wall', 1.8, 0.1, 0.7],
      [2120, 280, 'debris_wall', 1.5, -0.12, 0.6],
      [2780, 240, 'debris_wall', 1.7, 0.08, 0.7],
      [3500, 260, 'debris_wall', 1.6, -0.05, 0.65],
      [4220, 230, 'debris_wall', 1.8, 0.12, 0.7],
      [4900, 270, 'debris_wall', 1.5, -0.1, 0.65],
      [5600, 240, 'debris_wall', 1.7, 0.06, 0.7],
      [80, 520, 'debris_column', 1.0, -0.15, 1],
      [480, 540, 'debris_beam', 0.8, 0.25, 1],
      [1040, 540, 'debris_column', 0.9, 0.2, 1],
      [1580, 540, 'debris_beam', 0.7, -0.3, 1],
      [2360, 520, 'debris_column', 1.1, -0.1, 1],
      [2920, 540, 'debris_beam', 0.9, 0.15, 1],
      [3580, 540, 'debris_column', 0.95, 0.18, 1],
      [4120, 520, 'debris_beam', 0.8, -0.22, 1],
      [4660, 540, 'debris_column', 1.0, -0.12, 1],
      [5220, 540, 'debris_beam', 0.85, 0.2, 1],
      [5800, 520, 'debris_column', 1.05, 0.14, 1],
    ];
    for (const [x, y, tex, scale, angle, alpha] of debrisDefs) {
      this.add.image(x, y, tex)
        .setScale(scale)
        .setAngle(Phaser.Math.RadToDeg(angle))
        .setAlpha(alpha)
        .setDepth(y < 400 ? 1 : 4);
    }
  }

  buildZoneGates() {
    // Comic-style gate arches marking zone borders (decor only).
    const gates = FLOORS[this.floor].gates;
    for (const gate of gates) {
      this.add.rectangle(gate.x - 90, FLOOR_Y - 110, 22, 220, 0x14101a, 1).setDepth(3);
      this.add.rectangle(gate.x - 90, FLOOR_Y - 110, 22, 220, gate.color, 0.25).setDepth(3);
      this.add.rectangle(gate.x + 90, FLOOR_Y - 110, 22, 220, 0x14101a, 1).setDepth(3);
      this.add.rectangle(gate.x + 90, FLOOR_Y - 110, 22, 220, gate.color, 0.25).setDepth(3);
      this.add.rectangle(gate.x, FLOOR_Y - 215, 202, 20, 0x14101a, 1).setDepth(3);
      this.add.text(gate.x, FLOOR_Y - 270, gate.label, {
        fontFamily: 'Courier New, monospace',
        fontSize: '44px',
        color: '#fff6e5',
        stroke: '#14101a',
        strokeThickness: 10,
      }).setOrigin(0.5).setDepth(3).setAlpha(0.9);
    }
  }

  buildGoal() {
    // Descent stairs: walk onto them to go DOWN to the next floor.
    this.stairX = this.endX + 40;
    const stairs = this.add.image(this.stairX, FLOOR_Y - 80, 'descent_stairs').setDepth(15);
    this.tweens.add({
      targets: stairs,
      alpha: { from: 0.85, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Breathing glow ring at the stair mouth
    const ring = this.add.circle(this.stairX, FLOOR_Y - 6, 30, 0x6effff, 0.35).setDepth(3);
    this.tweens.add({
      targets: ring,
      scaleX: { from: 1, to: 1.5 },
      scaleY: { from: 1, to: 1.5 },
      alpha: { from: 0.4, to: 0 },
      duration: 1100,
      repeat: -1,
      ease: 'Sine.easeOut',
    });
    // Trigger: stepping onto the stairs starts the descent.
    this.stairZone = this.add.zone(this.stairX, FLOOR_Y - 40, 130, 140).setOrigin(0.5, 0.5);
    this.physics.add.existing(this.stairZone, true);
    // Red forcefield in a purple laser dome (canon): a real wall across the
    // stair mouth while the boss lives. Drops with the boss. No boss on
    // Floor 0 — those stairs stand open.
    this.domeFx = [];
    if (!this.bossDef) return;
    const dome = this.add.graphics().setDepth(16);
    dome.lineStyle(6, 0xa04dff, 0.85);
    dome.strokeCircle(this.stairX, FLOOR_Y - 10, 95);
    dome.lineStyle(4, 0xff2e4d, 0.9);
    dome.strokeCircle(this.stairX, FLOOR_Y - 10, 78);
    this.domeFx.push(dome);
    this.tweens.add({
      targets: dome, alpha: { from: 0.65, to: 1 }, duration: 800,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.domeWall = this.add.rectangle(this.stairX - 80, FLOOR_Y - 70, 18, 140, 0x000000, 0);
    this.physics.add.existing(this.domeWall, true);
    this.domeFx.push(this.domeWall);
  }

  // The dome drops with the boss: stairs open.
  dropDome() {
    if (!this.domeFx) return;
    if (this.domeCollider) this.physics.world.removeCollider(this.domeCollider);
    this.domeCollider = null;
    for (const o of this.domeFx) o.destroy();
    this.domeFx = null;
    this.domeWall = null;
    this.events.emit('toast', 'FORCEFIELD DOWN!');
    this.toast('FORCEFIELD DOWN! The stairs are open!', '#4df3ff');
  }

  // Stair mouth: blocked by the dome while the boss lives (the wall does
  // the real blocking; this is the belts-and-suspenders check).
  tryDescend() {
    if (this.won || this.dead || this.descending) return;
    if (this.boss && this.boss.alive) {
      const now = this.time.now;
      if (now - (this.lastBlockToastAt || -10000) > 2500) {
        this.lastBlockToastAt = now;
        this.events.emit('toast', `${this.bossDef.name} BLOCKS THE STAIRS!`);
        this.toast('Kill the boss first!', '#ff2e4d');
        this.player.body.setVelocity(-320, -200);
      }
      return;
    }
    this.descend();
  }

  // Goofy end-of-floor achievements: judged purely on playstyle stats.
  // Worth nothing. Means everything. Earned pool is SHUFFLED so the 4
  // plaques vary run to run, and most quips roll a random variant.
  computeAchievements() {
    const s = this.stats;
    const kills = s.punch + s.stomp + s.magic + s.mongo;
    const missed = { ham: 0, star: 0, crystal: 0 };
    this.pickups.getChildren().forEach((p) => {
      // Collected pickups are destroy()ed but keep active=true — skip taken.
      // (plain prop: DataManager may be gone post-destroy, p.taken survives)
      if (p.active && !p.taken && missed[p.kind] !== undefined) {
        missed[p.kind] += 1;
      }
    });
    const runSecs = (this.time.now - s.t0) / 1000;
    const out = [];
    const A = (id, title, ...quips) => out.push({
      id, title, quip: quips[Math.floor(Math.random() * quips.length)],
    });
    // Playstyle (how you fought)
    if (kills === 0) A('pacifist', 'CERTIFIED LOVER', "0 kills. Carl's fists have filed a complaint.", 'Hugging it out. The dungeon is confused.', 'Violence declined. Donut respects it. Carl does not.');
    if (kills > 0 && s.stomp === 0 && s.magic === 0 && s.mongo === 0) A('fists', 'PUNCH DRUNK', 'Every problem is a nail. You are the hammer.', 'Hands rated E for Everyone. The baddies disagree.', 'The Marquis of Queensbury sends his regards.');
    if (kills > 0 && s.punch === 0 && s.stomp === 0 && s.mongo === 0) A('artillery', 'CAT ARTILLERY', 'Donut did 100% of the killing. Carl supervised.', 'Fire support, feline division.', 'Carl pointed. Donut deleted.');
    if (kills > 0 && s.punch === 0 && s.magic === 0 && s.mongo === 0) A('stomp', 'SMOOSH SUPREME', 'The floor sends its regards. And a chiropractor bill.', 'Gravity did most of the work. Carl takes the credit.', 'Local floors file noise complaint.');
    if (s.punch >= 8) A('slugger', 'CERTIFIED SLUGGER', `${s.punch} punches landed. Somebody's been skipping leg day.`, 'Fists of fury, sponsored by spite.');
    if (s.stomp >= 5) A('seismic', 'SEISMIC EVENT', `${s.stomp} smooshes. Seismographs noticed.`, 'The dungeon downstairs felt that one.');
    if (s.casts >= 6) A('rocketman', 'ROCKET MAN', 'Donut is filing for overtime.', 'Elton John sends regards.', 'Six-plus rockets. Subtlety left the chat.');
    if (s.magic >= 4) A('firesupport', 'FIRE SUPPORT', 'Donut provides. Carl supervises.', 'Death from slightly above.');
    if (s.casts > 0 && s.magic === 0) A('stormtrooper', 'STORMTROOPER', `Fired ${s.casts} rocket${s.casts > 1 ? 's' : ''}. Hit nothing. Donut blames the wind.`, 'Aim is a team effort. The team failed.');
    if (kills >= 20) A('riot', 'ONE-MAN RIOT', `${kills} kills. The crawlers are taking notes.`, 'Mordecai just clipped that.');
    else if (kills >= 12) A('crowd', 'CROWD CONTROL', `${kills} kills. The queue has been shortened.`, 'Packed house. Emptier now.');
    // Progression (how far / what you beat)
    if (s.swine > 0) A('piggy', 'THIS LITTLE PIGGY', 'Went to market. Permanently.', 'The Baron has left the building.');
    if (s.ralph > 0) A('gerbil', 'POP GOES THE GERBIL', 'Squeak. Squeak. Silence.', 'Ralph has left the chat.');
    if (s.heather > 0) A('bear', 'BEAR NECESSITY AVERTED', 'The rink is closed. Forever.', 'No skates. No mercy.');
    if (s.amalgam > 0) A('compost', 'COMPOSTED', 'Reduced, reused, recycled.', 'The mass has been separated at source.');
    if (s.mongo > 0) A('souschef', 'SOUS CHEF', `Mongo tenderized ${s.mongo} baddie${s.mongo > 1 ? 's' : ''}. Health code violation.`, `Mongo's kill count: ${s.mongo}. Donut is so proud. Nobody else is.`);
    if (this.mongoLevel >= 6) A('apex', 'APEX PREDATOR', 'Fully grown Mongo. Run.', 'The food chain has been reorganized.');
    else if (this.mongoLevel >= 3) A('bigboy', 'BIG BOY', '12 pounds of raptor. All of it hungry.', 'He eats corpses now. Character growth.');
    if (this.visitedZones.size >= 3) A('sightseer', 'SIGHTSEER', 'Saw every zone. Smelled every zone.', 'Took the full tour. Left a review: 1 star.', 'Gift shop was closed. Gift shop is always closed.');
    if (runSecs < 240) A('speedrunner', 'SPEEDRUNNER', 'Under 4 minutes. Borant is reviewing the tape.', 'Speedrun strats: running. Incredible.', 'Any% (any percent of dignity intact).');
    if (runSecs > 480) A('tourist', 'TOURIST', 'Over 8 minutes. Took the scenic route.', 'Stopped to read every sign. Every one.');
    if (s.box >= 2) A('gambler', 'BOX GAMBLER', 'Opened every Silver Box. No notes.', 'Loot goblin behavior. Respect.');
    if (s.star >= 6) A('starstruck', 'STARSTRUCK', `${s.star} stars pocketed. The Hoarder is jealous.`, 'Shiny. Very shiny.');
    if (s.crystal >= 4) A('rockhound', 'ROCK HOUND', `${s.crystal} crystals. Rocket fuel secured.`, 'Donut approves of this hoard.');
    if (s.ham >= 3) A('hamfan', 'HAM ENTHUSIAST', `${s.ham} hams inhaled. No regrets.`, 'Protein-based healing plan.');
    if (this.score >= 3000) A('roller', 'HIGH ROLLER', `${this.score} points. The house is nervous.`, 'Chat is spamming POGGERS.');
    // Survival + misc
    if (s.dmg === 0 && s.pits === 0) A('ghost', 'UNTOUCHABLE', 'Zero damage. Donut is accepting all credit.', 'The dungeon missed. Every time.', 'Plot armor: confirmed.');
    if (s.dmg === 1) A('flesh', 'FLESH WOUND', 'Exactly 1 damage. Saving the rest for later.', "'Tis but a scratch.");
    if (s.dmg >= 6) A('sponge', 'DAMAGE SPONGE', `${s.dmg} hits taken. Absorbent. Concerning.`, 'The infirmary knows you by name.');
    if (s.pits >= 3) A('diver', 'PIT ENTHUSIAST', `${s.pits} pits visited. Gravity appreciates the loyalty.`, 'Down is also a direction.');
    else if (s.pits >= 1) A('cliff', 'CLIFFHANGER', `${s.pits} pit${s.pits > 1 ? 's' : ''}. Only fell in ${s.pits > 1 ? 'a few times' : 'once'}. Growth.`, 'The pit sends its regards.');
    if (this.hp >= this.maxHP) A('perfect', 'SHOW-OFF', 'Full HP at the stairs. Suspicious. Impressive. Suspicious.', 'Did not get hit. Will mention it forever.');
    if (s.ham === 0 && s.dmg > 0) A('hungry', 'HUNGRY AND HURT', 'Took damage on an empty stomach. A bad combo.', 'The ham was RIGHT THERE.');
    const mobCount = this.enemies.getChildren().filter((e) => e.etype !== 'dummy').length;
    if (kills >= mobCount && kills > 0 && mobCount > 0) A('exterm', 'EXTERMINATOR', 'Everything is dead. The Hoarder sends condolences.', 'Floor swept. Literally.');
    if (missed.crystal > 0) A('waster', 'WASTE NOT, WANT NOT', `Left ${missed.crystal} rocket fuel behind. Emphasis on the WANT NOT.`, 'Donut saw that. Donut remembers.');
    if (s.star === 0 && missed.star > 0) A('snob', 'LOOT SNOB', 'Stars? Never heard of her.', 'Too good for stars. Stars disagree.');
    if (s.casts === 0 && kills > 0) A('norocket', "WHAT'S A ROCKET?", 'Never fired once. Donut is telling everyone.', 'The rocket sat this one out.');
    if (out.length === 0) A('participant', 'PARTICIPANT', "You showed up. That's... something.", 'Attendance award. Framed.');
    // Shuffle the earned pool so the 4 shown vary every run.
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out.slice(0, 4);
  }

  // Walk-onto-stairs descend: Carl auto-walks to the stair mouth, Donut
  // hops to his shoulder, screen fades — then the floor clear panel.
  // Floor 1's panel offers the way DOWN to Floor 2; Floor 2 ends the demo.
  descend() {
    if (this.won || this.dead || this.descending) return;
    this.descending = true;
    this.lastHurtAt = this.time.now; // grace: nothing hurts on the stairs
    this.combo = 0;
    this.comboTimer = 0;
    this.player.body.setAccelerationX(0);
    // The walk-to-stairs tween owns the sprite from here: stop the body and
    // switch it off, or Arcade physics overwrites the tween every step and
    // Carl freezes mid-descend (the reported end-of-level hang).
    this.player.body.stop();
    this.player.body.setAllowGravity(false);
    this.player.body.setEnable(false);
    this.events.emit('toast', 'DOWN WE GO!');
    // Donut rides shoulder for the descent
    if (this.donutVis) {
      this.donutVis._shoulderRide = true;
      this.donutVis._shoulderEndAt = this.time.now + 10000;
    }
    this.carlVis.playWalk();
    this.tweens.add({
      targets: this.player,
      x: this.stairX,
      duration: 700,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.cameras.main.fadeOut(450, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.won = true;
          this.score += 500 + this.hp * 25;
          this.registry.set('score', this.score);
          this.cameras.main.flash(400, 110, 255, 255);
          this.events.emit('toast', 'FLOOR CLEARED!');
          const hasNext = this.floor < Math.max(...Object.keys(FLOORS).map(Number));
          this.scene.get('UIScene').showWin(
            this.computeAchievements(), this.floor, hasNext,
            FLOORS[this.floor].clearTitle, FLOORS[this.floor].clearSub,
          );
        });
      },
    });
  }

  buildGroundPanel() {
    // Screen-fixed rubble strip: the floor "resides with the browser".
    const viewW = 1280;
    const viewH = 720;
    const groundH = 80;
    const groundY = viewH - groundH;
    this.groundPanel = this.add.tileSprite(0, groundY, viewW * 2, groundH, FLOORS[this.floor].floorTex || 'floor_tile')
      .setOrigin(0, 0)
      .setScrollFactor(0, 0)
      .setDepth(50)
      .setAlpha(1);
    this.groundPanel.setCrop({ x: 0, y: 24, width: viewW * 2, height: groundH });
    this.groundPanel.setTint(0xccaa88);
    this.groundEdge = this.add.rectangle(viewW, groundY, viewW * 2, 2, 0xc88040)
      .setOrigin(0.5, 0)
      .setScrollFactor(0, 0)
      .setDepth(51)
      .setAlpha(0.95);
  }

  /* ==========================================================
   * PRELEVEL (Floor 0) — Seattle, the last night
   * ========================================================== */

  buildPrelevel() {
    // Skyline backdrop: 2x-wide silhouette, slow parallax over the gradient.
    this.add.image(0, -20, 'pre_skyline')
      .setOrigin(0, 0)
      .setDisplaySize(this.worldW, 640)
      .setScrollFactor(0.55, 1)
      .setDepth(0)
      .setAlpha(0.95);
    // Donut's tree at the start.
    this.add.image(260, FLOOR_Y - 110, 'pre_tree').setDepth(4);
    // Burning blocks: glow beds + licking flames + rising embers.
    // The flames HURT — touching one costs 1 HP (see updateCollapse).
    this.preFires = [900, 1900, 2700];
    for (const fx of this.preFires) {
      const glow = this.add.circle(fx, FLOOR_Y - 8, 60, 0xff5a20, 0.3).setDepth(3);
      this.tweens.add({
        targets: glow, alpha: { from: 0.2, to: 0.42 }, scale: { from: 1, to: 1.15 },
        duration: 700 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      for (let i = 0; i < 2; i++) {
        const fl = this.add.image(fx - 20 + i * 40, FLOOR_Y - 24, 'pre_fire').setDepth(4);
        this.tweens.add({
          targets: fl, scaleY: { from: 0.85, to: 1.2 }, scaleX: { from: 1.1, to: 0.9 },
          duration: 260 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
      for (let i = 0; i < 4; i++) {
        const em = this.add.circle(fx + (Math.random() - 0.5) * 90, FLOOR_Y - 30, 2, 0xffc93d, 0.9).setDepth(4);
        this.tweens.add({
          targets: em, y: FLOOR_Y - 220 - Math.random() * 120, x: `+=${(Math.random() - 0.5) * 60}`,
          alpha: 0, duration: 1600 + Math.random() * 1200, repeat: -1,
          repeatDelay: Math.random() * 800, ease: 'Sine.easeOut',
        });
      }
    }
    // The collapse: escalation timer (see updateCollapse). The closer Carl
    // gets to the stairs, the faster the city comes down: volleys go from
    // one chunk every ~3.6s to three chunks every ~0.9s. Landed chunks hurt.
    this._collapseAcc = 2600; // first volley lands shortly after boot
    this._collapseFlags = {};
    // OPENING: the last towers come down. Carl watches, swears, gets told
    // where to go. No input lock — it happens ahead of spawn, run anytime.
    this.preIntro();
  }

  // Floor 0 opening cinematic (~9s, letterboxed, SPACE skips):
  // Carl walks out to fetch Donut from the tree, scoops her up on the way
  // past, then the last towers pancake STRAIGHT DOWN into the ground.
  // WHAT THE HELL (lingers 4s) → dungeon voice → bars out → run.
  preIntro() {
    this._introLock = true;
    this._introWhomped = false;
    this._introStart = this.time.now;
    // Letterbox bars slide in.
    this._introBarTop = this.add.rectangle(640, -45, 1280, 90, 0x000000).setScrollFactor(0, 0).setDepth(990);
    this._introBarBot = this.add.rectangle(640, 765, 1280, 90, 0x000000).setScrollFactor(0, 0).setDepth(990);
    this.tweens.add({ targets: this._introBarTop, y: 45, duration: 600, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: this._introBarBot, y: 675, duration: 600, ease: 'Cubic.easeOut' });
    // Dialogue caption line above the bottom bar.
    this._introCaption = this.add.text(640, 622, '', {
      fontFamily: '"Courier New", monospace', fontSize: '20px', fontStyle: 'bold',
      color: '#fff6e5', stroke: '#000000', strokeThickness: 6, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0, 0).setDepth(991).setAlpha(0);
    this._introTowers = [];
    for (const tx of [950, 1550, 2250]) {
      this._introTowers.push(
        this.add.image(tx, FLOOR_Y, 'pre_tower').setOrigin(0.5, 1).setDepth(2),
      );
    }
    const say = (at, text, color = '#fff6e5') => {
      this.time.delayedCall(at, () => {
        if (this.floor !== 0 || !this._introLock || this.dead) return;
        this.introCaption(text, color);
      });
    };
    say(400, 'CARL: Donut! Get down from that tree!', '#fff6e5');
    say(2400, 'DONUT: Mew.', '#ffb000');
    say(3400, 'CARL: Do you feel that—', '#fff6e5');
    // Scooped up on the way past (the walk triggers the real join); the
    // city drops on a fixed beat so the scene always runs ~9s.
    this.time.delayedCall(4600, () => {
      if (this.floor === 0 && this._introLock && !this._introWhomped) this.introWhomp();
    });
    // Failsafe: never hold the lock more than 12s.
    this.time.delayedCall(12000, () => {
      if (this._introLock) this.finishIntro(true);
    });
  }

  introCaption(text, color) {
    const c = this._introCaption;
    if (!c || !c.active) return;
    c.setText(text).setColor(color);
    this.tweens.killTweensOf(c);
    c.setAlpha(1);
    this.tweens.add({ targets: c, alpha: 0, duration: 500, delay: 1600 });
  }

  // Called from update(): Donut auto-joins as Carl passes the tree.
  introCheck() {
    if (!this._introLock || this.floor !== 0) return;
  }

  // WHOMP: every tower pancakes STRAIGHT DOWN into the ground, one after
  // another — shudder, drop, squash, dust rings, heavy shake. Nothing
  // topples; the city just... sits down.
  introWhomp() {
    if (this._introWhomped || this.floor !== 0) return;
    this._introWhomped = true;
    this.introCaption('', '#fff6e5');
    (this._introTowers || []).forEach((tw, i) => {
      this.time.delayedCall(i * 800, () => {
        if (!tw.active) return;
        // Shudder first, then drop.
        this.tweens.add({ targets: tw, x: '+=6', duration: 60, yoyo: true, repeat: 3 });
        this.time.delayedCall(260, () => {
          if (!tw.active) return;
          this.cameras.main.shake(280, 0.009);
          this.tweens.add({
            targets: tw, y: FLOOR_Y + 230, scaleY: 0.3, duration: 500, ease: 'Cubic.easeIn',
            onComplete: () => {
              if (this.floor !== 0) { tw.destroy(); return; }
              this.cameras.main.shake(160, 0.005);
              for (const sx of [-80, 80]) {
                const dust = this.add.circle(tw.x + sx, FLOOR_Y - 10, 10, 0x8a7057, 0.85).setDepth(4);
                this.tweens.add({
                  targets: dust, scale: 5, alpha: 0, duration: 800,
                  onComplete: () => dust.destroy(),
                });
              }
              // The lights go out as it lands.
              tw.setTint(0x555566);
              this.time.delayedCall(900, () => tw.destroy());
            },
          });
        });
      });
    });
    // Carl, watching the city sit down: "WHAT THE HELL?!" (lingers 4s).
    this.time.delayedCall(2600, () => {
      if (this.floor !== 0 || this.dead || this.won) return;
      this.floatText(this.player.x, this.player.y - 110, 'WHAT THE HELL?!', '#ffffff', 4000);
    });
    // The dungeon voice answers: run to the stairs, join the dungeon.
    this.time.delayedCall(3400, () => {
      if (this.floor !== 0 || this.dead || this.won) return;
      this.cameras.main.shake(120, 0.003);
      this.toast('📢 RUN TO THE STAIRS NOW IF YOU WANT TO JOIN THE DUNGEON', '#ffc93d');
    });
    // Bars out, control back.
    this.time.delayedCall(4400, () => this.finishIntro(false));
  }

  finishIntro(skipped) {
    if (!this._introLock) return;
    this._introLock = false;
    // Slide the letterbox out, collapse timer starts now.
    if (this._introBarTop && this._introBarTop.active) {
      this.tweens.add({ targets: this._introBarTop, y: -45, duration: 500, onComplete: () => this._introBarTop.destroy() });
    }
    if (this._introBarBot && this._introBarBot.active) {
      this.tweens.add({ targets: this._introBarBot, y: 765, duration: 500, onComplete: () => this._introBarBot.destroy() });
    }
    if (this._introCaption && this._introCaption.active) this._introCaption.destroy();
    this._collapseAcc = 0;
    if (skipped && !this._introWhomped) {
      // Skip: drop the city instantly, say the lines, hand over control.
      this.introWhomp();
      this._introLock = false;
      if (this._introBarTop && this._introBarTop.active) this._introBarTop.destroy();
      if (this._introBarBot && this._introBarBot.active) this._introBarBot.destroy();
      if (this._introCaption && this._introCaption.active) this._introCaption.destroy();
    }
  }

  // Floor 0 per-frame: fire damage + collapse escalation timer.
  // Paused during the opening cinematic; the timer starts on handover.
  updateCollapse(delta) {
    if (this.dead || this.won || this.descending || this.floor !== 0 || this._introLock) return;
    const px = this.player.x;
    const feetY = this.player.y + 35;
    // Burning streets hurt.
    for (const fx of (this.preFires || [])) {
      if (Math.abs(px - fx) < 55 && feetY > FLOOR_Y - 70) {
        this.hurtPlayer(1, fx);
        break;
      }
    }
    // Collapse progress 0→1 from spawn to stairs.
    const prog = Phaser.Math.Clamp((px - SPAWN_X) / Math.max(1, this.endX - SPAWN_X), 0, 1);
    if (prog > 0.5 && !this._collapseFlags.half) {
      this._collapseFlags.half = true;
      this.toast('HALF THE CITY IS GONE — RUN!', '#ff5a20');
    }
    if (prog > 0.85 && !this._collapseFlags.end) {
      this._collapseFlags.end = true;
      this.toast("IT'S ALL COMING DOWN!", '#ff3d3d');
    }
    // Escalating volleys: interval 3600ms → 900ms, chunks 1 → 3.
    this._collapseAcc += delta;
    const interval = 3600 - 2700 * prog;
    while (this._collapseAcc >= interval) {
      this._collapseAcc -= interval;
      this.collapseVolley(1 + Math.floor(prog * 2.01));
    }
  }

  collapseVolley(n) {
    if (this.dead || this.won || this.floor !== 0) return;
    this.cameras.main.shake(140, 0.004);
    for (let i = 0; i < n; i++) {
      const dx = Phaser.Math.Clamp(
        this.player.x + 220 + Math.random() * 320, 100, this.worldW - 100,
      );
      const chunk = this.add.image(dx, -40 - i * 60, 'debris_wall').setScale(0.5).setDepth(4).setAlpha(0.95);
      this.tweens.add({
        targets: chunk, y: FLOOR_Y - 24, duration: 650, ease: 'Cubic.easeIn',
        onComplete: () => {
          if (this.floor !== 0) { chunk.destroy(); return; }
          this.cameras.main.shake(90, 0.003);
          // Landing on Carl's head costs 1 HP.
          if (!this.dead && !this.won && Math.abs(this.player.x - dx) < 70) {
            this.hurtPlayer(1, dx);
          }
          const dust = this.add.circle(dx, FLOOR_Y - 10, 8, 0x8a7057, 0.7).setDepth(4);
          this.tweens.add({
            targets: dust, scale: 3, alpha: 0, duration: 400,
            onComplete: () => { dust.destroy(); chunk.destroy(); },
          });
        },
      });
    }
  }

  /* ==========================================================
   * PICKUP TEXTURES + SPAWNS
   * ========================================================== */

  ensurePickupTextures() {
    const tm = this.textures;
    if (!tm.exists('pickup_ham')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x14101a, 1);
      g.fillRoundedRect(0, 0, 30, 22, 6);
      g.fillStyle(0xff6b8a, 1); // ham pink (PAL.heal)
      g.fillRoundedRect(3, 3, 24, 16, 6);
      g.fillStyle(0xfff6e5, 1); // bone
      g.fillCircle(27, 5, 4);
      g.fillRect(22, 3, 8, 4);
      g.lineStyle(2, 0x14101a, 1);
      g.strokeCircle(12, 11, 5);
      g.generateTexture('pickup_ham', 30, 22);
      g.destroy();
    }
    if (!tm.exists('pickup_star')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const cx = 14; const cy = 14; const R = 12; const r = 5;
      g.fillStyle(0x14101a, 1);
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? R + 2 : r;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      g.fillStyle(0xffc93d, 1); // gold (PAL.gold)
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? R : r;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
      g.generateTexture('pickup_star', 28, 28);
      g.destroy();
    }
    if (!tm.exists('pickup_crystal')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x14101a, 1);
      g.fillTriangle(-2, 6, 12, -4, 26, 6);
      g.fillRect(-2, 6, 28, 22);
      g.fillStyle(0x4df3ff, 1); // mana cyan (PAL.mana)
      g.fillTriangle(2, 8, 11, 0, 20, 8);
      g.fillRect(2, 8, 18, 16);
      g.fillStyle(0xfff6e5, 0.9);
      g.fillTriangle(6, 8, 9, 3, 11, 8);
      g.generateTexture('pickup_crystal', 22, 28);
      g.destroy();
    }
    if (!tm.exists('enemy_spit')) {
      // Tinker bomb — dark iron ball, fuse + spark. 18px, reads mid-flight.
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x2a2030, 1);
      g.fillCircle(8, 11, 7);
      g.fillStyle(0x5a4a6a, 1);
      g.fillCircle(6, 9, 3);
      g.fillStyle(0x8a4820, 1);
      g.fillRect(7, 1, 2, 5);
      g.fillStyle(0xffc93d, 1);
      g.fillCircle(8, 2, 2.5);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(7.5, 1.5, 1);
      g.lineStyle(2, 0x14101a, 1);
      g.strokeCircle(8, 11, 7);
      g.generateTexture('enemy_spit', 18, 18);
      g.destroy();
    }
  }

  spawnPickups() {
    // [x, y, kind] — y is world center; 'GY' = hovers above FLOOR_Y.
    const GY = FLOOR_Y - 26;
    const defs = FLOORS[this.floor].pickups;
    for (const [x, yRaw, kind] of defs) {
      const y = yRaw === 'GY' ? GY : yRaw;
      const key = kind === 'ham' ? 'pickup_ham' : kind === 'star' ? 'pickup_star' : kind === 'box' ? 'pickup_box' : 'pickup_crystal';
      const p = this.pickups.create(x, y, key);
      p.setDepth(12);
      p.body.setAllowGravity(false);
      p.body.setImmovable(true);
      p.kind = kind;
      p.baseY = y;
      p.bobT = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: p,
        y: y - 8,
        duration: 800 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  collectPickup(p) {
    if (!p.active) return;
    const kind = p.kind;
    if (kind === 'ham') {
      if (this.hp >= this.maxHP) {
        this.toast('HP FULL!', '#ffb000');
        return; // leave it on the ground
      }
      this.hp = Math.min(this.maxHP, this.hp + 1);
      this.registry.set('hp', this.hp);
      this.toast('+1 HP!', '#ff6b8a');
      this.floatText(p.x, p.y - 24, '+1 HP', '#ff6b8a');
    } else if (kind === 'star') {
      this.score += 100;
      this.registry.set('score', this.score);
      this.toast('+100!', '#ffc93d');
      this.floatText(p.x, p.y - 24, '+100', '#ffc93d');
    } else if (kind === 'crystal') {
      if (this.mana >= this.maxMana) {
        this.toast('MANA FULL!', '#4df3ff');
        return;
      }
      this.mana = Math.min(this.maxMana, this.mana + 1);
      this.registry.set('mana', this.mana);
      this.toast('+1 MANA', '#4df3ff');
      this.floatText(p.x, p.y - 24, '+1 MANA', '#4df3ff');
    } else if (kind === 'box') {
      // SILVER BOX: random permanent upgrade (canon loot!). Caps keep the
      // Swine fair; a maxed-out Carl gets a consolation jackpot instead.
      this.stats.box += 1;
      const opts = [];
      if (this.maxHP < 10) opts.push('hp');
      if (this.maxMana < 7) opts.push('mana');
      if (this.punchDmg < 3) opts.push('punch');
      if (opts.length === 0) {
        this.score += 250;
        this.registry.set('score', this.score);
        this.toast('SILVER BOX: JACKPOT +250!', '#ffc93d');
        this.floatText(p.x, p.y - 24, '+250 JACKPOT', '#ffc93d');
      } else {
        const roll = opts[Math.floor(Math.random() * opts.length)];
        if (roll === 'hp') {
          this.maxHP += 1;
          this.hp = Math.min(this.maxHP, this.hp + 1);
          this.registry.set('hp', this.hp);
          this.toast('SILVER BOX: +1 MAX HP!', '#ff6b8a');
          this.floatText(p.x, p.y - 24, '+1 MAX HP', '#ff6b8a');
        } else if (roll === 'mana') {
          this.maxMana += 1;
          this.mana = Math.min(this.maxMana, this.mana + 1);
          this.registry.set('mana', this.mana);
          this.registry.set('maxMana', this.maxMana);
          this.toast('SILVER BOX: +1 MAX MANA!', '#4df3ff');
          this.floatText(p.x, p.y - 24, '+1 MAX MANA', '#4df3ff');
        } else {
          this.punchDmg += 1;
          this.toast('SILVER BOX: BRASS KNUCKLES — PUNCH +1!', '#ffb000');
          this.floatText(p.x, p.y - 24, 'PUNCH +1', '#ffb000');
        }
      }
    }
    // Count actual pickups (full-HP/full-mana early returns above skip this).
    // Tag taken: destroyed objects keep active=true, so the win screen must
    // be able to tell collected loot apart from loot left on the ground.
    if (kind === 'ham' || kind === 'star' || kind === 'crystal') {
      this.stats[kind] += 1;
      p.taken = true;
    }
    // Sparkle burst, then remove
    for (let i = 0; i < 5; i++) {
      const s = this.add.circle(p.x, p.y, 3, 0xfff6e5, 0.9).setDepth(26);
      this.tweens.add({
        targets: s,
        x: p.x + (Math.random() - 0.5) * 60,
        y: p.y - 20 - Math.random() * 30,
        alpha: 0,
        duration: 350,
        onComplete: () => s.destroy(),
      });
    }
    p.destroy();
  }

  /* ==========================================================
   * ENEMIES — goblin / tinker / trog / rat (DCC Book 1 Floor 1)
   * ========================================================== */

  spawnEnemies() {
    // Nothing near spawn (x=120). Borough boss rolls the stair arena.
    // Ground spawns rest feet-on-floor; py spawns snap to walkway tops.
    const spawns = FLOORS[this.floor].spawns;

    for (const s of spawns) {
      const t = ENEMY_TYPES[s.type];
      // Floor+zone elevation: deeper grades hit harder. Speed +12%/grade,
      // tinkers lob faster, late trogs grow bonus HP. (Per-instance — the
      // shared ENEMY_TYPES table is never mutated.)
      const zi = Math.max(0, this.zones.findIndex((z) => s.x >= z.x1 && s.x < z.x2));
      const gi = (this.floor - 1) * 3 + zi; // global grade 0-5
      const feetScaled = t.feet * t.scale;
      // Snap floating spawns to the nearest walkway top so bad guys stand
      // ON the platforms, feet level with the walkway — never sunk below.
      let sy = FLOOR_Y - feetScaled;
      if (s.py !== undefined) sy = this.snapToWalkway(s.x, s.py, feetScaled);
      const e = this.enemies.create(s.x, sy, t.tex);
      e.setScale(t.scale);
      e.body.setSize(t.body[0], t.body[1]).setOffset(t.off[0], t.off[1]);
      e.setDepth(15);
      e.hp = t.hp + (s.type === 'trog' ? (gi >= 7 ? 3 : gi >= 4 ? 2 : gi >= 2 ? 1 : 0) : 0);
      e.maxHp = e.hp;
      e.alive = true;
      e.etype = s.type;
      e.label = t.label;
      e.feetScaled = feetScaled;
      e.speed = Math.round(t.speed * Math.min(1 + 0.12 * gi, 1.8));
      e.spitCdBase = (2200 + Math.random() * 800) * Math.max(0.4, 1 - 0.15 * gi);
      e.scoreValue = t.score;
      e.patrolHomeX = s.x;
      // Platform walkers stay ON the walkway — small range so they don't
      // wander off the edge and end up below Carl.
      e.patrolRange = s.py !== undefined ? Math.min(s.range, 40) : s.range;
      e.patrolDir = Math.random() < 0.5 ? -1 : 1;
      e.hopT = Math.random() * 1.5; // hop cooldown: patrollers bounce, not pogo
      e.spitTimer = (e.spitCdBase || 1500 + Math.random() * 1500) * 0.7;
      const isBoss = s.type === this.bossType;
      const haloColor = isBoss ? 0xff8aa0 : s.type === 'trog' ? 0xff2e4d : s.type === 'tinker' ? 0xa04dff : s.type === 'rat' ? 0xffb000 : 0x3ddc5f;
      const haloR = isBoss ? 64 : s.type === 'trog' ? 40 : s.type === 'rat' ? 24 : 32;
      const halo = this.add.circle(e.x, e.y, haloR, haloColor, 0.3).setDepth(14);
      e.halo = halo;
      if (s.type === this.bossType) {
        // Boss bookkeeping: overhead HP pips + stair-dome lock.
        this.boss = e;
        e.hpText = this.add.text(e.x, e.y - 84, '♥'.repeat(e.hp), {
          fontFamily: '"Courier New", monospace', fontSize: '18px', fontStyle: 'bold', color: '#ff8aa0',
          stroke: '#080808', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(16);
      }
    }
  }

  updateEnemies(dt, time) {
    const px = this.player.x;
    const py = this.player.y;
    this.enemies.getChildren().forEach((e) => {
      if (!e.alive) return;
      const dx = px - e.x;
      e.hopT = Math.max(0, (e.hopT || 0) - dt); // hop cooldown ticks always

      if (e.etype === 'tinker') {
        // Keeps its distance: backs away when Carl closes in past ~260px.
        if (Math.abs(dx) < 260) {
          e.body.setVelocityX((dx < 0 ? 1 : -1) * e.speed);
        } else if (Math.abs(dx) < 480) {
          e.body.setVelocityX(0); // hold ground, lob
        } else {
          this.patrolMove(e);
        }
        // Hop out when walled in so lobbers never wedge under a slab.
        if (e.body.blocked.down && (e.body.blocked.left || e.body.blocked.right) && e.hopT <= 0) {
          e.body.setVelocityY(-500);
          e.hopT = 1.4;
        }
        // Lob a spit on a timer when Carl is in range.
        e.spitTimer -= dt * 1000;
        if (e.spitTimer <= 0 && Math.abs(dx) < 520 && !this.dead && !this.won) {
          this.enemySpit(e, dx);
          e.spitTimer = e.spitCdBase || 2200 + Math.random() * 800;
        }
      } else if (e.etype === this.bossType) {
        // Character boss: stalks Carl on foot, penned to the flat stair
        // arena (5400–6010) so it can't leave its lair. Lunges are
        // TELEGRAPHED (crouch + glint, 450ms) and infrequent — no spasms.
        let dir = Math.sign(dx) || 1;
        if (e.x < 5420) dir = 1;
        else if (e.x > 6000) dir = -1;
        e.angle = 0; // upright — no more rolling
        e.lungeT = (e.lungeT || 0) - dt * 1000;
        if ((e.lungeWindup || 0) > 0) {
          // Telegraph: planted, crouched, glinting. Then LEAP.
          e.lungeWindup -= dt * 1000;
          e.body.setVelocityX(0);
          if (e.lungeWindup <= 0) {
            e.clearTint();
            e.setScale(e._bossScale || 1);
            e.body.setVelocityY(-520);
            e.body.setVelocityX(dir * (e.speed + 170));
          }
        } else if (e.body.blocked.down && e.lungeT <= 0 && Math.abs(dx) < 340 && Math.abs(dx) > 40 && !this.dead && !this.won) {
          e.lungeWindup = 450;
          e.lungeT = 2800 + Math.random() * 1200;
          e._bossScale = e._bossScale || e.scaleX || 1;
          e.setTint(0xffd080);
          e.setScale(e._bossScale * 1.12, e._bossScale * 0.82); // crouch
        } else {
          e.body.setVelocityX(dir * e.speed);
        }
        e.setFlipX(dir < 0);
      } else {
        // Ground pattern: rare chase-hop when Carl is clearly above and
        // near (climbs platforms after him), wall-hop when penned,
        // occasional turnaround hops from patrolMove. Cooldown-gated.
        const grounded = e.body.blocked.down;
        if (grounded && e.hopT <= 0 && Math.abs(dx) < 200 && py < e.y - 100 && !this.dead && !this.won) {
          e.body.setVelocityY(-520);
          e.body.setVelocityX(Math.sign(dx || 1) * e.speed * 1.25);
          e.hopT = 1.6;
        } else {
          this.patrolMove(e);
          if (grounded && e.hopT <= 0 && (e.body.blocked.left || e.body.blocked.right)) {
            e.body.setVelocityY(-540);
            e.hopT = 1.4;
          }
        }
      }

      // Face the player when close, else face patrol direction.
      if (e.etype !== this.bossType) {
        if (Math.abs(dx) < 220) e.setFlipX(dx < 0);
        else e.setFlipX(e.patrolDir < 0);
      }

      if (e.halo) {
        e.halo.x = e.x;
        e.halo.y = e.y;
        e.halo.setAlpha(0.25 + Math.sin(time * 0.005 + e.patrolHomeX) * 0.1);
      }
      if (e.hpText) e.hpText.setPosition(e.x, e.y - 84);

      // Safety: enemies that fall in pits despawn instead of piling up.
      if (e.y > WORLD_HEIGHT + 120) {
        if (e.halo) e.halo.destroy();
        e.destroy();
      }
    });
  }

  // Nearest platform top within 130px x — sprite center hangs feetScaled
  // above the walkway so visual feet land exactly on it.
  snapToWalkway(x, fallbackY, feetScaled = 26) {
    if (!this.platformTops) return fallbackY;
    let best = null;
    for (const p of this.platformTops) {
      const cx = (p.x1 + p.x2) / 2;
      const d = Math.abs(cx - x);
      if (d < 130 && (best === null || d < best.d)) best = { d, top: p.top };
    }
    if (!best) return fallbackY;
    return best.top - feetScaled;
  }

  patrolMove(e) {
    const target = e.patrolHomeX + e.patrolDir * e.patrolRange;
    let turned = false;
    if (e.patrolDir === 1 && e.x >= target) { e.patrolDir = -1; turned = true; }
    else if (e.patrolDir === -1 && e.x <= target) { e.patrolDir = 1; turned = true; }
    e.body.setVelocityX(e.patrolDir * e.speed);
    // Hop at SOME turnarounds (cooldown-gated): a bounce beat, not a pogo.
    if (turned && e.body.blocked.down && (e.hopT || 0) <= 0) {
      e.body.setVelocityY(-380);
      e.hopT = 1.2 + Math.random();
    }
  }

  enemySpit(e, dx) {
    const s = this.enemyShots.get(e.x, e.y - 10);
    if (!s) return;
    s.setActive(true).setVisible(true).setDepth(24);
    s.body.setAllowGravity(true);
    s.body.setCircle(7, 2, 2);
    // Lobbed arc toward Carl: ~0.7s flight time + upward pop.
    const flight = 0.7;
    let vx = dx / flight;
    vx = Phaser.Math.Clamp(vx, -280, 280);
    s.body.setVelocity(vx, -330);
    this.time.delayedCall(3000, () => { if (s.active) this.killShot(s); });
  }

  killShot(s) {
    if (!s.active) return;
    s.setActive(false).setVisible(false);
    s.body.setVelocity(0, 0);
  }

  damageEnemy(e, amount, source) {
    if (!e.alive) return;
    // Boss rule: no single hit deals more than 2. Stomps bounce
    // off the boss instead of one-shotting it.
    if (e.etype === this.bossType && amount > 2) amount = 2;
    e.hp -= amount;
    e.setTintFill(0xffffff);
    this.time.delayedCall(70, () => { if (e.alive) e.setTint(ENEMY_TYPES[e.etype].tint); });
    if (e.hpText) e.hpText.setText('♥'.repeat(Math.max(0, e.hp)));

    // Knockback — trogs barely budge, bosses don't budge at all.
    const dir = e.x < this.player.x ? 1 : -1;
    const kb = e.etype === this.bossType ? 0 : e.etype === 'trog' ? 0.3 : 1;
    e.body.setVelocity(dir * 200 * kb, e.etype === this.bossType ? 0 : -150);

    if (e.hp <= 0) this.killEnemy(e, source);
  }

  killEnemy(e, source) {
    if (!e.alive) return;
    e.alive = false;
    e.body.setEnable(false);
    e.setTint(0x300808);
    if (source === 'punch' || source === 'stomp' || source === 'magic' || source === 'mongo') {
      this.stats[source] += 1;
    }

    // Score + combo (persist through checkpoint respawns — never reset here).
    this.combo += 1;
    this.comboTimer = 4000;
    const gained = e.scoreValue + (this.combo - 1) * 10;
    this.score += gained;
    this.registry.set('score', this.score);
    const comboStr = this.combo > 1 ? ` x${this.combo}` : '';
    this.floatText(e.x, e.y - 40, `+${gained} ${e.label || ''}${comboStr}`, '#ffc93d');
    // Dungeon Crawler World chat reacts (reader easter egg).
    if (Math.random() < 0.25) {
      const cheer = CHAT_CHEERS[Math.floor(Math.random() * CHAT_CHEERS.length)];
      this.floatText(
        e.x + (Math.random() - 0.5) * 60, e.y - 70 - Math.random() * 20,
        cheer, '#8ad8ff',
      );
    }

    // Leave a corpse: Mongo snacks on the fallen behind you.
    // (Bosses too. Dummies just poof — Jeff is straw, not food.)
    if (e.etype !== 'dummy') this.dropCorpse(e);

    if (e.halo) {
      const halo = e.halo;
      this.tweens.add({
        targets: halo, alpha: 0, scale: 2, duration: 200,
        onComplete: () => halo.destroy(),
      });
    }
    if (e.hpText) e.hpText.destroy();

    // BOSS DOWN: dome drops, stairs open, canon achievement toast.
    // Per-boss counters — plaques need the real thing.
    if (e.etype === this.bossType) {
      if (e.etype === 'swine') this.stats.swine += 1;
      else if (e.etype === 'ralph') this.stats.ralph += 1;
      else if (e.etype === 'heather') this.stats.heather += 1;
      else if (e.etype === 'amalgam') this.stats.amalgam += 1;
      this.cameras.main.shake(400, 0.012);
      this.cameras.main.flash(300, 255, 138, 160);
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(i * 120, () => this.powBurst(
          e.x + (Math.random() - 0.5) * 120, e.y - Math.random() * 80, 1.4,
        ));
      }
      this.dropDome();
      this.events.emit('toast', this.bossDef.killToast);
      this.toast(this.bossDef.killToast, '#ffc93d');
    }

    const dir = e.x < this.player.x ? 1 : -1;
    this.tweens.add({
      targets: e,
      alpha: 0,
      y: e.y - 30,
      x: e.x + dir * 40,
      angle: dir * 180,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => e.destroy(),
    });

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

    // Stomp pogo: bounce Carl skyward so stomps chain across packs.
    if (source === 'stomp') {
      this.player.body.setVelocityY(-560);
      this.stomping = false;
      this._stompWasAir = false;
      if (this._stompBoot && this._stompBoot.active) this._stompBoot.destroy();
      this._stompBoot = null;
      const boot = this.add.image(e.x, e.y + 6, 'stomp_boot').setDepth(26).setScale(1.1);
      this.tweens.add({
        targets: boot, scale: 1.35, alpha: 0, duration: 250,
        onComplete: () => boot.destroy(),
      });
      this.powBurst(e.x, e.y - 20, 0.85);
      this.cameras.main.shake(110, 0.005);
    }
  }

  /* ==========================================================
   * MONGO — Donut's baby raptor + the corpses he snacks on
   * ========================================================== */

  mongoStats() {
    return MONGO_LEVELS[Math.min(this.mongoLevel, MONGO_LEVELS.length) - 1];
  }

  // Per-zone look: cross-fade the color grade (tunnels warm → garbage
  // violet → gym hot red) on top of the per-zone floor tint.
  setZoneGrade(idx) {
    if (!this.zoneGrade) return;
    const colors = FLOORS[this.floor].grades;
    // NOTE: setFillStyle(color) resets fill alpha to 1 — always re-assert
    // the whisper wash and tween fillAlpha (not object alpha).
    this.zoneGrade.setFillStyle(colors[Math.min(idx, colors.length - 1)], 0.05);
    this.tweens.add({ targets: this.zoneGrade, fillAlpha: 0.08, duration: 900, yoyo: true });
  }

  // New zone, bigger baby: grow pop, faster bites, longer leash.
  mongoLevelUp() {
    if (!this.mongo) return; // not yet met on Floor 0
    const idx = this.zones.findIndex((z) => z.name === this.zoneName);
    const lv = Math.min((this.floor - 1) * 3 + idx + 1, MONGO_LEVELS.length);
    if (lv <= this.mongoLevel) return;
    this.mongoLevel = lv;
    const L = this.mongoStats();
    if (this.mongo) {
      this.tweens.add({
        targets: this.mongo, scale: L.scale * 1.35, duration: 180, yoyo: true,
        onComplete: () => { if (this.mongo) this.mongo.setScale(L.scale); },
      });
      this.floatText(this.mongo.x, this.mongo.y - 60, `MONGO LV ${lv}!`, '#7fd65a');
    }
    this.events.emit('toast', `MONGO LV ${lv} — BIGGER BITES!`);
    this.toast(`MONGO LV ${lv} — BIGGER BITES!`, '#7fd65a');
  }

  dropCorpse(e) {
    const t = ENEMY_TYPES[e.etype];
    const tex = (t && t.tex) || 'enemy_goblin';
    const sc = (t && t.scale) || 1;
    const c = this.add.image(e.x, e.y, tex)
      .setDepth(13)
      .setScale(sc)
      .setTint(0x9a8a9a)
      .setAlpha(0.9);
    c.setAngle(e.x < this.player.x ? 80 : -80);
    const corpse = { img: c, baseScale: sc, done: false };
    this.corpses.push(corpse);
    const overPit = this.pits.some((p) => e.x >= p.x1 && e.x < p.x2);
    if (overPit) {
      // No floor here — the corpse drops into the abyss. Mongo can't have it.
      this.tweens.add({
        targets: c, y: c.y + 340, alpha: 0, duration: 700, ease: 'Cubic.easeIn',
        onComplete: () => { corpse.done = true; c.destroy(); },
      });
    } else {
      // Thud to the floor, then lie there until Mongo (or time) takes it.
      const restY = FLOOR_Y - c.displayHeight / 2 + 2;
      this.tweens.add({ targets: c, y: restY, duration: 380, ease: 'Bounce.easeOut' });
      this.time.delayedCall(14000, () => {
        if (corpse.done) return;
        corpse.done = true;
        this.tweens.add({ targets: c, alpha: 0, duration: 600, onComplete: () => c.destroy() });
      });
    }
    // Cap the graveyard so long runs don't pile up sprites.
    if (this.corpses.length > 12) {
      const old = this.corpses.shift();
      if (old && !old.done) { old.done = true; old.img.destroy(); }
    }
  }

  // Mongo crumb burst helper (eating corpses, chewing rats — same joy).
  mongoCrumbs(x, y) {
    const crumb = this.add.circle(
      x + (Math.random() - 0.5) * 24, y - 10,
      2.5, 0x7fd65a, 1,
    ).setDepth(26);
    this.tweens.add({
      targets: crumb,
      x: crumb.x + (Math.random() - 0.5) * 50,
      y: crumb.y - 20 - Math.random() * 20,
      alpha: 0, duration: 350,
      onComplete: () => crumb.destroy(),
    });
  }

  updateMongo(dt) {
    const m = this.mongo;
    if (!m) return;
    const L = this.mongoStats();
    const baseY = FLOOR_Y - 24 * L.scale + 2;
    // Mommy's position + closest threat to her. Guard instinct is graded:
    // baddies far → full leash; closing in → leash tightens to her side;
    // on top of her (panic) → drop everything non-urgent and come home.
    const momX = this.donutVis.x;
    // Threats are the DANGEROUS mobs — rats are prey, not a threat, and
    // must never trigger the guard (or Mongo would cower home forever in
    // packed rooms instead of hunting).
    let threat = Infinity;
    this.enemies.getChildren().forEach((e) => {
      if (!e.alive || e.etype === 'rat' || e.etype === 'dummy') return;
      const d = Math.abs(e.x - momX);
      if (d < threat) threat = d;
    });
    const panic = threat < MONGO_PANIC;
    const leash = panic ? 0 : Math.min(L.leash, Math.max(60, threat));
    const homeX = momX - this.carlVis.facing * 40;
    // Validate current target (leash measured from Mommy, not Mongo)
    const tgt = this.mongoTarget;
    if (tgt) {
      if (tgt.kind === 'corpse' && tgt.ref.done) this.mongoTarget = null;
      else if (tgt.kind === 'prey' && (!tgt.ref.alive || Math.abs(tgt.ref.x - momX) > Math.max(leash, 120))) {
        this.mongoTarget = null;
      }
    }
    // --- chewing live prey: pinned, chew scales with level AND prey bulk.
    // Anything but bosses (Mongo knows better). Big prey takes longer.
    if (this.mongoFightT > 0) {
      this.mongoFightT -= dt;
      const r = this.mongoTarget && this.mongoTarget.kind === 'prey' ? this.mongoTarget.ref : null;
      m.setScale(L.scale * (1 + Math.abs(Math.sin(this.mongoFightT * 22)) * 0.14));
      if (r && r.alive) {
        r.body.setVelocity(0, 0); // pinned — Mongo is sitting on it
        m.x = r.x - Math.sign(r.x - m.x || 1) * 4;
        if (Math.random() < 0.4) this.mongoCrumbs(r.x, r.y - 10);
      }
      if (this.mongoFightT <= 0) {
        m.setScale(L.scale);
        if (r && r.alive) this.damageEnemy(r, 99, 'mongo');
        this.mongoTarget = null;
      }
      return;
    }
    // --- eating a corpse: chomp, shrink it, crumbs everywhere
    if (this.mongoEatT > 0) {
      this.mongoEatT -= dt;
      const t = this.mongoTarget && this.mongoTarget.kind === 'corpse' ? this.mongoTarget.ref : null;
      m.setScale(L.scale * (1 + Math.abs(Math.sin(this.mongoEatT * 20)) * 0.12));
      if (t && !t.done) {
        t.img.setScale(Math.max(0.08, t.baseScale * (this.mongoEatT / 0.9)));
        if (Math.random() < 0.35) this.mongoCrumbs(t.img.x, t.img.y);
      }
      if (this.mongoEatT <= 0) {
        m.setScale(L.scale);
        if (t && !t.done) { t.done = true; t.img.destroy(); }
        this.mongoTarget = null;
        this.score += 10;
        this.registry.set('score', this.score);
        this.floatText(m.x, m.y - 44, 'NOM +10', '#7fd65a');
        if (!this.mongoSnackShouted) {
          this.mongoSnackShouted = true;
          this.events.emit('toast', 'MONGO SNACKS!');
          this.toast('MONGO SNACKS!', '#7fd65a');
        }
      }
      return;
    }
    // --- panic recall: threat on Mommy — home NOW, hunts can wait.
    // (an in-progress chew/eat above already returns early and finishes fast)
    let destX;
    let hustle = 230;
    if (panic) {
      this.mongoTarget = null;
      destX = homeX;
      hustle = L.speed + 60; // scared legs are fast legs
    } else {
      // --- pick a job: nearest catchable prey inside the (threat-tightened)
      // leash beats a corpse. Anything but bosses and test dummies — Mongo
      // is brave, not stupid, and Jeff is staff.
      let rat = null;
      let rd = leash;
      this.enemies.getChildren().forEach((e) => {
        if (!e.alive || e.etype === this.bossType || e.etype === 'dummy') return;
        const d = Math.abs(e.x - momX);
        if (d < rd) { rd = d; rat = e; }
      });
      let corpse = null;
      let cd = 650;
      for (const c of this.corpses) {
        if (c.done) continue;
        const d = Math.abs(c.img.x - m.x) + Math.abs(c.img.y - m.y) * 0.5;
        if (d < cd) { cd = d; corpse = c; }
      }
      if (rat) {
        this.mongoTarget = { kind: 'prey', ref: rat };
        destX = rat.x;
        hustle = L.speed + 10; // Mongo is faster than prey (barely, braver later)
        // Caught it: sit on it and chew. Bulk takes longer (trog ≈ 3x rat).
        const reach = 26 + (rat.feetScaled || 20) * 0.3;
        if (Math.abs(rat.x - m.x) < reach && Math.abs(rat.y - m.y) < 80) {
          rat.setTintFill(0xffffff);
          this.mongoFightT = Math.min(3, L.chew * (1 + 0.7 * ((rat.maxHp || 1) - 1)));
          return;
        }
      } else if (corpse) {
        this.mongoTarget = { kind: 'corpse', ref: corpse };
        destX = corpse.img.x;
        hustle = L.speed;
        // Close enough to the corpse: dinner time.
        if (Math.abs(corpse.img.x - m.x) < 30 && Math.abs(corpse.img.y - m.y) < 70) {
          corpse.done = true; // claimed — the expiry timer will skip it
          this.mongoEatT = 0.9;
          return;
        }
      } else {
        this.mongoTarget = null;
        // Nothing to do: trail behind Donut, opposite Carl's facing.
        destX = homeX;
      }
    }
    // --- waddle there with a hop
    const dx = destX - m.x;
    const adx = Math.abs(dx);
    if (adx > 6) {
      m.x += Math.sign(dx) * Math.min(adx, hustle * dt);
      m.setFlipX(dx < 0);
      this.mongoHopT += dt * 14;
      m.y = baseY - Math.abs(Math.sin(this.mongoHopT)) * 10;
    } else {
      m.y = baseY + Math.sin(this.time.now * 0.004) * 2;
    }
  }

  /* ==========================================================
   * MAIN LOOP — tight platforming: coyote, buffer, variable jump
   * ========================================================== */

  update(time, delta) {
    if (this.dead || this.won) {
      this.idleVisuals(delta);
      return;
    }
    const dt = delta / 1000;
    const body = this.player.body;
    // Descending the stairs: input locked, world keeps breathing behind us.
    if (this.descending) {
      this.updateEnemies(dt, time);
      this.syncVisuals(dt);
      return;
    }
    // Seattle burns in real time: fires bite, the collapse escalates.
    if (this.floor === 0) this.updateCollapse(delta);
    const onGround = body.blocked.down || body.touching.down;

    if (onGround) this.lastGroundedAt = time;

    // ----- Horizontal movement -----
    const spd = this.buffs.speed;
    if (this._introLock) {
      // Opening beat: Carl walks out to the tree, scoops Donut up on the
      // way past, then stops to watch the city sit down. SPACE skips.
      if (!this._introWhomped && this.player.x < 520) {
        body.setAccelerationX(PLAYER.accel * spd);
        this.carlVis.setFacing(1);
      } else {
        body.setAccelerationX(0);
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
        Phaser.Input.Keyboard.JustDown(this.keys.jumpAlt)) {
        this.finishIntro(true);
      }
    } else if (this.keys.left.isDown) {
      body.setAccelerationX(-PLAYER.accel * spd);
      this.carlVis.setFacing(-1);
    } else if (this.keys.right.isDown) {
      body.setAccelerationX(PLAYER.accel * spd);
      this.carlVis.setFacing(1);
    } else {
      body.setAccelerationX(0);
    }
    this.player.setMaxVelocity(PLAYER.speed * spd, 1100);

    const moving = Math.abs(body.velocity.x) > 30;
    if (moving && onGround) this.carlVis.playWalk();
    else this.carlVis.playIdle();

    // ----- Jump: buffer + coyote + variable height -----
    const jumpDown =
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jumpAlt) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jumpArrow);
    if (jumpDown && !this._introLock) this.lastJumpAt = time;
    const buffered = time - this.lastJumpAt < PLAYER.bufferMs;
    const grounded = onGround || time - this.lastGroundedAt < PLAYER.coyoteMs;
    if (buffered && grounded) {
      body.setVelocityY(-PLAYER.jump);
      this.lastJumpAt = -10000;
      this.lastGroundedAt = -10000;
      this.stomping = false;
    }
    // Variable jump height: releasing early cuts the rise.
    const jumpUp =
      Phaser.Input.Keyboard.JustUp(this.keys.jump) ||
      Phaser.Input.Keyboard.JustUp(this.keys.jumpAlt) ||
      Phaser.Input.Keyboard.JustUp(this.keys.jumpArrow);
    if (jumpUp && body.velocity.y < -260) body.setVelocityY(-260);

    // ----- Punch (220ms cd + forward lunge) -----
    if (!this._introLock && Phaser.Input.Keyboard.JustDown(this.keys.punch) && time - this.lastPunchAt > PLAYER.punchCd) {
      this.lastPunchAt = time;
      this.doPunch(onGround);
    }

    // ----- Stomp slam: giant boot drops with Carl -----
    if (!this._introLock && Phaser.Input.Keyboard.JustDown(this.keys.stomp) && !onGround && body.velocity.y > -50) {
      body.setVelocityY(780);
      this.stomping = true;
      this._stompWasAir = true;
      const boot = this.add.image(this.player.x, this.player.y + 34, 'stomp_boot')
        .setDepth(26)
        .setScale(1.1);
      this.tweens.add({
        targets: boot, alpha: 0, scale: 1.3, duration: 400,
        onComplete: () => boot.destroy(),
      });
      this._stompBoot = boot;
      const ring = this.add.circle(this.player.x, this.player.y + 20, 6, 0xffb000, 0.7).setDepth(25);
      this.tweens.add({
        targets: ring, scale: 3, alpha: 0, duration: 250,
        onComplete: () => ring.destroy(),
      });
    }
    // Boot follows Carl down while slamming.
    if (this.stomping && this._stompBoot && this._stompBoot.active) {
      this._stompBoot.x = this.player.x;
      this._stompBoot.y = this.player.y + 34;
    }

    // ----- Magic (350ms cd, 1 mana, recoil, Donut shoulder ride) -----
    if (!this._introLock && Phaser.Input.Keyboard.JustDown(this.keys.magic) && time - this.lastMagicAt > PLAYER.magicCd) {
      this.doMagicMissile(time);
    }

    // ----- Mana regen: +1 per 6s -----
    if (this.mana < this.maxMana) {
      this.manaRegenAcc += delta;
      if (this.manaRegenAcc >= MANA.regenMs) {
        this.manaRegenAcc = 0;
        this.mana = Math.min(this.maxMana, this.mana + 1);
        this.registry.set('mana', this.mana);
      }
    } else {
      this.manaRegenAcc = 0;
    }

    // ----- Combo decay -----
    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
      }
    }

    this.updateEnemies(dt, time);

    // Iron Tangle express: the tunnel streams past (480px/s) while the
    // train-map itself stays put under Carl's feet.
    if (this.bgStreaming && this.bgFar) {
      this.bgFar.tilePositionX += 480 * dt;
    }

    // Failsafe: fell out of the world somehow → treat as pit.
    if (this.player.y > WORLD_HEIGHT + 200) this.pitFall();

    // Floor 5 flavor: Bopca greets first-time club entrants.
    if (this.floor === 5 && !this.bopcaSaid && this.player.x > 1150) {
      this.bopcaSaid = true;
      this.events.emit('toast', "BOPCA: 'Welcome. Break Jeff, buy nothing.'");
      this.toast("BOPCA: 'Welcome. Break Jeff, buy nothing.'", '#ffb060');
    }
    // Floor 0 cold open: reaching the tree brings Donut down.
    if (this.donutWaiting && this.player.x > 380) {
      this.donutWaiting = false;
      this.events.emit('toast', 'DONUT JOINS THE PARTY!');
      this.toast('DONUT JOINS THE PARTY!', '#ffb000');
      this.tweens.add({
        targets: this.donutVis, y: this.donutVis.y - 60, duration: 320, yoyo: true,
      });
    }
    // Opening beat: Donut's down → WHOMP the city.
    if (this.floor === 0) this.introCheck();
    this.updateZoneAndCheckpoints();
    this.syncVisuals(dt);

    // ----- Descend (stair trigger handles it; x>=END_X is the failsafe) -----
    // Failsafe also honors the boss lock — no sneaking past the Swine.
    if (!this.descending && this.player.x >= this.endX + 100) this.tryDescend();
  }

  updateZoneAndCheckpoints() {
    // Zones
    const z = this.zoneAt(this.player.x);
    if (z.name !== this.zoneName) {
      this.zoneName = z.name;
      this.events.emit('zone', this.zoneName);
      this.events.emit('toast', `${this.zoneName} — ${z.sub}`);
      this.registry.set('zone', this.zoneName);
      this.showZoneBanner(z.name, z.sub, false);
      const zi = this.zones.findIndex((zz) => zz.name === z.name);
      this.visitedZones.add(Math.max(0, zi));
      this.setZoneGrade(Math.max(0, zi));
      this.mongoLevelUp();
    }
    // Boss intro: crossing into the stair arena wakes whatever rules it.
    // (No boss on Floor 0 — just run.)
    if (this.bossDef && !this.bossIntroduced && this.player.x > 5350 && !this.dead && !this.won) {
      this.bossIntroduced = true;
      this.cameras.main.shake(350, 0.01);
      this.showZoneBanner(this.bossDef.name, this.bossDef.sub, false);
      this.events.emit('toast', this.bossDef.roar);
      this.toast(this.bossDef.roarToast, '#ff8aa0');
    }
    // Checkpoints
    if (this.nextCheckpointIdx < this.checkpoints.length) {
      const cp = this.checkpoints[this.nextCheckpointIdx];
      if (this.player.x >= cp.triggerX) {
        this.checkpoint = { x: cp.respawnX, y: FLOOR_Y - 35, name: cp.name };
        this.nextCheckpointIdx += 1;
        this.cameras.main.flash(150, 60, 220, 120);
        // Delayed so it doesn't stack on top of the zone banner/toast
        // (gates sit ~100px past their zone borders).
        this.time.delayedCall(1600, () => {
          if (this.dead || this.won) return;
          this.events.emit('toast', `CHECKPOINT — ${cp.name}`);
          this.toast(`CHECKPOINT — ${cp.name}`, '#3ddc5f');
        });
      }
    }
  }

  syncVisuals(dt) {
    // Container origin (0.5, 1.0): container.y is the feet anchor = body bottom.
    this.carlVis.x = this.player.x;
    this.carlVis.y = this.player.y + 35;

    this.donutOrbitT += dt * 3.2;
    const facing = this.carlVis.facing;
    if (this.donutWaiting) {
      // Perched in the tree: tail-flick bob, going nowhere.
      this.donutVis.y = FLOOR_Y - 138 + Math.sin(this.donutOrbitT * 1.4) * 3;
    } else if (this.donutVis._shoulderRide && this.time.now < this.donutVis._shoulderEndAt) {
      // Perched ON TOP of his head (not plastered over his face): bottom of
      // Donut overlaps the top 20px of Carl's head, face stays visible.
      this.donutVis.x = this.player.x + facing * 30;
      this.donutVis.y = this.player.y - 105 + Math.sin(this.donutOrbitT * 6) * 1.5;
    } else {
      if (this.donutVis._shoulderRide) this.donutVis._shoulderRide = false;
      const behindX = -facing;
      this.donutVis.x = this.player.x + behindX * 56 + Math.cos(this.donutOrbitT) * 6;
      this.donutVis.y = this.player.y - 52 + Math.sin(this.donutOrbitT) * 8 + this.donutVis._floatOffsetY;
    }
    this.updateMongo(dt);
  }

  idleVisuals(delta) {
    this.donutOrbitT += (delta / 1000) * 1.6;
    if (this.donutWaiting) return; // still in the tree
    const facing = this.carlVis.facing;
    const behindX = -facing;
    this.donutVis.x = this.player.x + behindX * 52 + Math.cos(this.donutOrbitT) * 4;
    this.donutVis.y = this.player.y - 48 + Math.sin(this.donutOrbitT) * 6 + this.donutVis._floatOffsetY;
    // Mongo mourns (idles) beside the party.
    if (this.mongo && this.mongoEatT <= 0) {
      this.mongo.y = FLOOR_Y - 22 + Math.sin(this.time.now * 0.004) * 2;
    }
  }

  /* ==========================================================
   * COMBAT
   * ========================================================== */

  doPunch(onGround) {
    const dir = this.carlVis.facing;
    // Punch lands where the giant fist is: center 56px out, generous
    // 72x70 window so it connects without pixel-perfect spacing.
    const x = this.carlVis.x + dir * 56;
    const y = this.carlVis.y - 50;

    // Forward lunge — the punch carries Carl into the enemy.
    if (onGround) this.player.setVelocityX(dir * 340);
    else this.player.body.setVelocityX(
      Phaser.Math.Clamp(this.player.body.velocity.x + dir * 220, -PLAYER.speed - 60, PLAYER.speed + 60)
    );

    // GIANT fist ~Carl-width (96px): pops out to full arm's length.
    const fist = this.add.image(this.carlVis.x + dir * 40, y, 'punch_fist')
      .setDepth(26)
      .setScale(0.4)
      .setAlpha(1);
    if (dir < 0) fist.setFlipX(true);
    this.tweens.add({
      targets: fist,
      scale: 1.15,
      x: this.carlVis.x + dir * 96,
      duration: 90,
      ease: 'Cubic.easeOut',
      yoyo: true,
      onComplete: () => fist.destroy(),
    });

    const arc = this.add.image(x + dir * 40, y, 'punch_arc').setTint(0xffb000).setScale(2.2).setDepth(25);
    if (dir < 0) arc.setFlipX(true);
    this.tweens.add({
      targets: arc, alpha: 0, scale: 3.4, duration: 220,
      onComplete: () => arc.destroy(),
    });

    let connected = false;
    this.enemies.getChildren().forEach((e) => {
      if (!e.alive) return;
      if (Math.abs(e.x - x) < 72 + this.buffs.punchReach && Math.abs(e.y - y) < 70) {
        connected = true;
        this.damageEnemy(e, this.punchDmg, 'punch');
        this.powBurst(e.x, e.y - 10, 0.8);
      }
    });
    if (connected) {
      this.cameras.main.shake(90, 0.004);
      this.powBurst(x + dir * 50, y, 0.55);
    }
  }

  powBurst(x, y, scale = 1) {
    const b = this.add.image(x, y, 'pow_burst').setDepth(27).setScale(0.3).setAlpha(1);
    this.tweens.add({
      targets: b, scale, alpha: 0, duration: 220, ease: 'Cubic.easeOut',
      onComplete: () => b.destroy(),
    });
  }

  // Big boot slam visual when a stomp lands (floor, platform, or enemy).
  stompLandFx() {
    // Only the full K-slam gets the giant boot; normal landings skip it.
    if (!this.stomping && !this._stompWasAir) return;
    this.stomping = false;
    this._stompWasAir = false;
    if (this._stompBoot && this._stompBoot.active) this._stompBoot.destroy();
    this._stompBoot = null;
    const boot = this.add.image(this.player.x, this.player.y + 30, 'stomp_boot')
      .setDepth(26)
      .setScale(1.1);
    this.tweens.add({
      targets: boot, scale: 1.35, alpha: 0, y: this.player.y + 44, duration: 220,
      onComplete: () => boot.destroy(),
    });
    const ring = this.add.circle(this.player.x, this.player.y + 34, 10, 0xffb000, 0.7).setDepth(25);
    this.tweens.add({
      targets: ring, scale: 4, alpha: 0, duration: 300,
      onComplete: () => ring.destroy(),
    });
    this.powBurst(this.player.x, this.player.y + 20, 0.6);
    this.cameras.main.shake(110, 0.005);
    // Ground-pound AoE: the slam pulps everything around the landing.
    // Generous on purpose — stomping INTO a pack should clear it.
    const R = 120 * this.buffs.stompMul;
    this.enemies.getChildren().forEach((e) => {
      if (!e.alive) return;
      if (Math.abs(e.x - this.player.x) < R && Math.abs(e.y - this.player.y) < 90) {
        this.damageEnemy(e, 99, 'stomp');
      }
    });
  }

  doMagicMissile(time) {
    // OVERDRIVE pedestal: free casting while the timer runs.
    const free = time < this.buffs.manaFreeUntil;
    if (!free && this.mana < MANA.cost) {
      this.toast('NO MANA!', '#888888');
      this.events.emit('toast', 'NO MANA');
      return;
    }
    if (!free) {
      this.mana -= MANA.cost;
      this.manaRegenAcc = 0;
    }
    this.lastMagicAt = time;
    this.stats.casts += 1;
    this.registry.set('mana', this.mana);

    const dir = this.carlVis.facing;
    const startX = this.carlVis.x + dir * 32;
    const startY = this.carlVis.y - 48;

    // Donut jumps to Carl's shoulder to aim — 400ms ride, facing forward.
    if (this.donutVis) {
      this.donutVis._shoulderRide = true;
      this.donutVis._shoulderEndAt = this.time.now + 400;
      if (typeof this.donutVis.setFacing === 'function') this.donutVis.setFacing(dir);
    }

    // Recoil kick.
    this.player.body.setVelocityX(this.player.body.velocity.x - dir * 160);
    if (!(this.player.body.blocked.down || this.player.body.touching.down)) {
      this.player.body.setVelocityY(this.player.body.velocity.y - 80);
    }

    const m = this.missiles.get(startX, startY);
    if (!m) return;
    m.setActive(true).setVisible(true);
    m.setScale(1);
    m.body.setAllowGravity(false);
    m.body.setCircle(11, 3, 3);
    m.body.setVelocity(720 * dir, 0);
    m.setTint(0x6effff);
    m.setDepth(25);

    let elapsed = 0;
    const trail = this.time.addEvent({
      delay: 30,
      repeat: 80,
      callback: () => {
        elapsed += 30;
        if (!m.active || elapsed > 2500) { trail.remove(false); return; }
        const p = this.add.circle(m.x, m.y, 4, 0x6effff, 0.7).setDepth(24);
        this.tweens.add({
          targets: p, alpha: 0, scale: 2.5, duration: 220,
          onComplete: () => p.destroy(),
        });
      },
    });
    this.time.delayedCall(2500, () => { if (m.active) this.killMissile(m); });
  }

  killMissile(m) {
    if (!m.active) return;
    m.setActive(false).setVisible(false);
    m.body.setVelocity(0, 0);
  }

  /* ==========================================================
   * SAFE ROOM + DESPERADO TEST GROUND (Floor 5)
   * ========================================================== */

  buildSafeRoom() {
    // Hanging club sign over the gate.
    this.add.text(1800, 260, '★ DESPERADO CLUB ★', {
      fontFamily: '"Courier New", monospace', fontSize: '40px', fontStyle: 'bold',
      color: '#ffb000', stroke: '#080808', strokeThickness: 8,
      backgroundColor: '#14080a', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(10);
    // Bar counter (Bopca keeps it, you keep your hands off).
    this.add.rectangle(320, FLOOR_Y - 50, 220, 100, 0x4a2e18, 1).setDepth(4);
    this.add.rectangle(320, FLOOR_Y - 100, 230, 12, 0x6a4a2a, 1).setDepth(4);
    for (const [bx, col] of [[260, 0xff5a20], [300, 0x4df3ff], [340, 0xffc93d], [380, 0x7aff6a]]) {
      this.add.circle(bx, FLOOR_Y - 118, 8, col, 1).setDepth(5);
      this.add.rectangle(bx - 3, FLOOR_Y - 106, 6, 6, 0x14101a, 1).setDepth(5);
    }
    // Warm lamps + stools.
    for (const lx of [700, 1300, 2000]) {
      const lamp = this.add.circle(lx, FLOOR_Y - 190, 26, 0xffc93d, 0.25).setDepth(3);
      this.tweens.add({
        targets: lamp, alpha: { from: 0.18, to: 0.32 }, duration: 1200,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    for (const sx of [240, 400]) {
      this.add.circle(sx, FLOOR_Y - 20, 16, 0x6a4a2a, 1).setDepth(4);
      this.add.rectangle(sx - 4, FLOOR_Y - 52, 8, 36, 0x4a2e18, 1).setDepth(4);
    }
  }

  spawnPedestals() {
    for (const def of (FLOORS[5].pedestals || [])) {
      const glow = this.add.circle(def.x, FLOOR_Y - 30, 34, def.color, 0.3).setDepth(11);
      this.tweens.add({
        targets: glow, alpha: { from: 0.2, to: 0.4 }, scale: { from: 1, to: 1.1 },
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      const ped = this.add.image(def.x, FLOOR_Y - 32, 'pedestal').setDepth(12);
      this.add.text(def.x, FLOOR_Y - 130, def.label, {
        fontFamily: '"Courier New", monospace', fontSize: '15px', fontStyle: 'bold',
        color: '#f4ecd8', stroke: '#080808', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(12);
      const zone = this.add.zone(def.x, FLOOR_Y - 55, 70, 110).setOrigin(0.5, 0.5);
      this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () => this.applyPedestal(def, zone, ped, glow));
    }
  }

  applyPedestal(def, zone, ped, glow) {
    if (this.dead || this.won || def.taken) return;
    def.taken = true;
    zone.destroy();
    ped.setAlpha(0.45);
    this.tweens.killTweensOf(glow);
    glow.setAlpha(0.12);
    for (let i = 0; i < 10; i++) {
      const s = this.add.circle(def.x, FLOOR_Y - 60, 3, def.color, 0.9).setDepth(26);
      this.tweens.add({
        targets: s, x: def.x + (Math.random() - 0.5) * 120, y: FLOOR_Y - 120 - Math.random() * 60,
        alpha: 0, duration: 500, onComplete: () => s.destroy(),
      });
    }
    if (def.kind === 'boots') {
      this.buffs.speed = 1.4;
      this.toast('SWIFT BOOTS! +40% move speed', '#4df3ff');
      this.floatText(def.x, FLOOR_Y - 150, 'SWIFT BOOTS', '#4df3ff');
    } else if (def.kind === 'knuckles') {
      this.punchDmg += 2;
      this.buffs.punchReach += 24;
      this.toast('BRASS+2! Punch hits WAY harder', '#ffb000');
      this.floatText(def.x, FLOOR_Y - 150, 'PUNCH +2', '#ffb000');
    } else if (def.kind === 'overdrive') {
      this.buffs.manaFreeUntil = this.time.now + 20000;
      this.toast('OVERDRIVE! Free magic for 20s', '#ff5a20');
      this.floatText(def.x, FLOOR_Y - 150, 'OVERDRIVE 20s', '#ff5a20');
    } else if (def.kind === 'quake') {
      this.buffs.stompMul = 2;
      this.toast('QUAKE! Stomp AoE x2', '#7aff6a');
      this.floatText(def.x, FLOOR_Y - 150, 'QUAKE x2', '#7aff6a');
    }
    this.events.emit('toast', 'POWER UP!');
  }

  spawnDummy(dx, quiet) {
    const t = ENEMY_TYPES.dummy;
    const e = this.enemies.create(dx, FLOOR_Y - t.feet * t.scale, t.tex);
    e.setScale(t.scale);
    e.body.setSize(t.body[0], t.body[1]).setOffset(t.off[0], t.off[1]);
    e.body.setAllowGravity(false);
    e.body.setImmovable(true);
    e.setDepth(15);
    e.hp = t.hp;
    e.maxHp = t.hp;
    e.alive = true;
    e.etype = 'dummy';
    e.label = t.label;
    e.feetScaled = t.feet * t.scale;
    e.speed = 0;
    e.scoreValue = 0;
    e.patrolHomeX = dx;
    e.patrolRange = 0;
    e.patrolDir = 1;
    e.spitTimer = 999999;
    e.halo = this.add.circle(e.x, e.y, 30, 0xffc93d, 0.22).setDepth(14);
    e.hpText = this.add.text(e.x, e.y - 52, '♥'.repeat(e.hp), {
      fontFamily: '"Courier New", monospace', fontSize: '15px', fontStyle: 'bold', color: '#ff8aa0',
      stroke: '#080808', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(16);
    if (!quiet) {
      e.setScale(0.1);
      this.tweens.add({ targets: e, scale: t.scale, duration: 300, ease: 'Back.easeOut' });
    }
    return e;
  }

  restockDummies() {
    if (this.dead || this.won || this.floor !== 5) return;
    const alive = this.enemies.getChildren().filter((e) => e.alive && e.etype === 'dummy');
    if (alive.length >= 3) return;
    const spots = FLOORS[5].dummies || [];
    const free = spots.filter((sx) => !alive.some((e) => Math.abs(e.x - sx) < 80));
    if (free.length === 0) return;
    this.spawnDummy(free[Math.floor(Math.random() * free.length)]);
    this.toast('A wild JEFF appears!', '#8ad8ff');
  }

  /* ==========================================================
   * PLAYER DAMAGE / PIT / DEATH
   * ========================================================== */

  playerHitsEnemy(e) {
    if (!e || !e.alive || this.dead || this.won) return;
    // Jeff is staff: dummies never hurt Carl (stomping/punching them is fine).
    if (e.etype === 'dummy') return;

    // Stomp: falling fast (or slamming) with feet above the enemy's head.
    // Head sits feetScaled above the enemy's center (per-type, bottom-aligned).
    const feetY = this.player.y + 35;
    const headY = e.y - (e.feetScaled || 20) + 8;
    const falling = this.player.body.velocity.y > 120;
    if ((this.stomping || falling) && feetY < headY + 12) {
      this.damageEnemy(e, 99, 'stomp'); // killEnemy() applies the pogo bounce
      return;
    }
    this.hurtPlayer(1, e.x);
  }

  hurtPlayer(amount, fromX) {
    if (this.dead || this.won || this.descending) return;
    const now = this.time.now;
    if (now - this.lastHurtAt < PLAYER.hurtIFrames) return;
    this.lastHurtAt = now;

    this.hp -= amount;
    this.stats.dmg += amount;
    this.combo = 0; // getting hit breaks the combo
    this.comboTimer = 0;
    this.registry.set('hp', Math.max(0, this.hp));
    this.cameras.main.shake(140, 0.006);

    if (this.carlVis.colorSprite) {
      this.carlVis.colorSprite.setTint(0xff0000);
      this.time.delayedCall(180, () => {
        if (!this.dead && this.carlVis.colorSprite) this.carlVis.colorSprite.setTint(0xffffff);
      });
    }

    const kb = this.player.x < fromX ? -1 : 1;
    this.player.body.setVelocity(kb * 280, -260);

    if (this.hp <= 0) this.killPlayer('enemy');
  }

  pitFall() {
    if (this.dead || this.won || this.descending) return;
    // Pit deaths respawn at the last checkpoint with -1 HP — score/combo persist.
    this.stats.pits += 1;
    this.hp -= 1;
    this.registry.set('hp', Math.max(0, this.hp));
    if (this.hp <= 0) {
      this.killPlayer('pit');
      return;
    }
    const cp = this.checkpoint;
    this.player.body.reset(cp.x, cp.y);
    this.player.body.setVelocity(0, 0);
    this.carlVis.x = cp.x;
    this.carlVis.y = cp.y + 35;
    this.carlVis.setAlpha(1).setAngle(0);
    this.stomping = false;
    this.lastHurtAt = this.time.now; // brief grace after rescue
    this.cameras.main.flash(200, 80, 80, 120);
    this.toast(`SAVED — ${cp.name}  (-1 HP)`, '#ff6b8a');
    this.events.emit('toast', `SAVED — ${cp.name}`);
  }

  killPlayer(reason) {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    this.registry.set('hp', 0);
    this.player.body.setVelocity(0, 0);
    this.player.body.setEnable(false);

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

  /* ==========================================================
   * BANNERS / TOASTS / FLOATERS (comic feel + UI events)
   * ========================================================== */

  showZoneBanner(name, sub, instant) {
    const zone = this.zones.find((z) => z.name === name) || { banner: 0xffc93d };
    const css = '#' + zone.banner.toString(16).padStart(6, '0');
    const title = this.add.text(640, 240, name, {
      fontFamily: 'Courier New, monospace',
      fontSize: '84px',
      color: '#fff6e5',
      stroke: '#14101a',
      strokeThickness: 14,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(600).setAngle(-3).setScale(0.4).setAlpha(0);
    const subT = this.add.text(640, 310, sub, {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: css,
      stroke: '#14101a',
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(600).setAlpha(0);
    this.tweens.add({
      targets: [title], scale: 1, alpha: 1, duration: instant ? 200 : 350, ease: 'Back.easeOut',
    });
    this.tweens.add({ targets: [subT], alpha: 1, duration: 300, delay: 150 });
    this.time.delayedCall(2200, () => {
      this.tweens.add({
        targets: [title, subT], alpha: 0, y: '-=30', duration: 400,
        onComplete: () => { title.destroy(); subT.destroy(); },
      });
    });
  }

  toast(msg, color) {
    this.events.emit('toast', msg);
    const t = this.add.text(640, 120, msg, {
      fontFamily: 'Courier New, monospace',
      fontSize: '26px',
      color: color || '#fff6e5',
      stroke: '#14101a',
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(600).setAngle(1.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 150 });
    this.time.delayedCall(1400, () => {
      this.tweens.add({
        targets: t, alpha: 0, y: '-=20', duration: 300,
        onComplete: () => t.destroy(),
      });
    });
  }

  floatText(x, y, str, color, lingerMs = 0) {
    const t = this.add.text(x, y, str, {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: color || '#fff6e5',
      stroke: '#14101a',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(600);
    this.tweens.add({
      targets: t, y: y - 44, alpha: 0, duration: 800, ease: 'Cubic.easeOut',
      delay: lingerMs,
      onComplete: () => t.destroy(),
    });
  }
}
