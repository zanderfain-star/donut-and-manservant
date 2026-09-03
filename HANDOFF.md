# Donut & Manservant — LLM Handoff Document

> A complete context dump for the next AI session picking up this project.
> Read this first before doing anything.

---

## TL;DR

A Phaser 3 sidescroller game inspired by *Dungeon Crawler Carl*. The player
controls Carl (bare-chested, red-haired, white boxers with red hearts, brass
spiked gauntlet) running through a collapsed dungeon. A cat named Donut
(orange tabby Persian with a gold crown) follows behind Carl, jumps to his
shoulder when he casts magic, and (eventually) helps him fight.

- **Project root:** `/Users/hsmith/Projects/donut-and-manservant/`
- **Dev server:** `npm run dev` (Vite, port 5173, bound to 0.0.0.0)
- **Test URL:** `http://localhost:5173/` or `http://10.0.0.163:5173/` (LAN)
- **Target deploy URL:** `https://donut.4bros.cc` (Cloudflare DNS → GitHub Pages)
- **Tech:** Phaser 3.80, Vite 5, vanilla JS, ES modules. NO TypeScript, NO React.

---

## Build / Run

```bash
cd /Users/hsmith/Projects/donut-and-manservant
npm run dev      # vite dev server, port 5173
npm run build    # outputs to ./dist
npm run deploy   # build + push to gh-pages branch (DO NOT run yet)
```

Dev server is currently running (PID 31712, listening on `*:5173`, returns
HTTP 200). If it dies: `pkill -f vite` then `cd /Users/hsmith/Projects/donut-and-manservant && nohup npx vite --host 0.0.0.0 --port 5173 > /tmp/donut-dev.log 2>&1 &`

---

## File Map (all in `src/`)

| File | Lines | Purpose |
|---|---|---|
| `main.js` | 24 | Phaser config, scene order, `pixelArt: false` |
| `scenes/BootScene.js` | 223 | Generates all placeholder textures (floor, platform, enemy, goal flag) |
| `scenes/MenuScene.js` | 187 | Title screen, Carl/Donut previews, how-to-play panel |
| `scenes/GameScene.js` | 941 | The whole game — world, physics, player, enemies, combat |
| `scenes/UIScene.js` | 182 | HUD, win/death overlays, restart/menu key handlers |
| `scenes/SpriteTestScene.js` | 112 | Dev test scene (not in main config) |
| `scenes/StyleDemoScene.js` | 248 | Dev test scene (not in main config) |
| `entities/SpriteFactory.js` | 833 | Cel-shaded Carl + Donut texture generation |

**Scene order in `main.js`:** `[BootScene, MenuScene, GameScene, UIScene]`
BootScene creates textures, then starts MenuScene. MenuScene → Space/Enter
→ starts GameScene + launches UIScene. UIScene binds back to GameScene via
`ui.bindToGame(gameScene)`.

---

## The Characters (per @johnrubio reference art)

The user gave a specific reference image: https://www.reddit.com/r/DungeonCrawlerCarl/comments/1jlkqox/i_drew_carl_and_donut/
(attribution: @johnrubio). The current sprites are built from that reference.

### Carl (64×80 texture, drawn at 1.5× scale → 96×120 on screen)
- **Hair:** short dark RED (`0x8a1a0a`), almost crimson
- **Face:** tanned peachy skin (`0xe8b070`), dark stubble on jaw, intense small black eyes, scowling mouth
- **Body:** bare muscular chest, defined pecs + abs via skin shadow
- **Cape:** red (`0xa02020`) flowing behind shoulders, tatter at the bottom
- **Left arm:** BRASS SPIKED GAUNTLET with red cloth wrap at wrist (signature feature)
- **Right arm:** bare, hanging at side, fist
- **Boxers:** off-white (`0xfff0d0`) with ELEVEN small red hearts
- **Knee pads:** brass with vertical spikes (top + bottom)
- **Feet:** bare, tanned skin

### Donut (64×64 texture, drawn at 1.5× scale → 96×96 on screen)
- **Fur:** bright orange/ginger (`0xf0a040`) with darker tiger stripes
- **Face:** Persian — flat, lighter cream (`0xffc880`) face
- **Eyes:** two large round eyes, yellow-green iris (`0xc8ff20`), black vertical slit pupil, white glint
- **Nose:** small pink triangle
- **Ears:** fluffy orange triangles with pink inner
- **Crown:** small gold (`0xffd020`) crown between ears, 4 spikes, ball tips, pink gem
- **Tail:** fluffy orange ellipse behind body to the right
- **Fur tufts:** multiple puff balls around the body silhouette

**IMPORTANT: Donut is a CAT, not a pink blob. She's a fluffy orange tabby
Persian with a crown. Don't make her pink — the previous version was wrong
and the user corrected it with the @johnrubio reference.**

### Enemies (48×48 texture)
- Bright crimson body, glowing yellow eyes, white fangs, spikes on top, claws at bottom
- 36×40 physics hitbox (was 24×28 — increased for easier hits)
- Pulsing red halo (radius 32)

---

## Game Architecture

### World (in `GameScene.js`)
- `WORLD_WIDTH = 6400, WORLD_HEIGHT = 720, FLOOR_Y = 640, END_X = 6000`
- `PLAYER.maxHP = 8, speed: 280, jump: 720, accel: 1400, drag: 900, hurtIFrames: 1000`
- `ENEMY.speed: 80, patrol: 140 (reduced to 50-60 in spawns), hp: 1`
- Carl body: 36w × 70h, offset (-18, -35), body top at y=570
- 21 platforms in 3 tiers, walk-under at y=580, mid at y=500-540, high at y=420-460
- 2 pits: x 2050-2200 and x 4250-4400
- 18 enemies on platforms, patrol range 50-60px

### Floor — "resides with the browser"
The user wanted the floor to stay visible at the bottom of the viewport
regardless of where Carl is in the world. Solution:
- A screen-fixed `tileSprite` (`setScrollFactor(0, 0)`) at the bottom of the
  viewport, 1280×80, tinted `0xccaa88` (warm brown). Cropped to show only
  the bottom portion of the `floor_tile` texture.
- A warm horizon line at the top of the panel (`0xc88040`).
- Physics floor remains at `FLOOR_Y = 640` in world space for collision.

### Donut Positioning
- **Default:** follows BEHIND Carl on the side OPPOSITE his facing direction
  - Carl faces right (facing=+1) → Donut is to his LEFT (x = player.x - 38)
  - Carl faces left (facing=-1) → Donut is to his RIGHT (x = player.x + 38)
  - Y: `player.y - 40 + sin(t)*8 + floatOffset` (gentle bob)
- **Magic missile:** Donut jumps to Carl's shoulder for 400ms
  - X: `player.x + facing * 22` (same side he's facing — looks like she's aiming)
  - Y: `player.y - 60 + sin(t*6)*1.5`
- Triggered in `doMagicMissile()`: `donutVis._shoulderRide = true; _shoulderEndAt = now + 400;`

### Scene Lifecycle — IMPORTANT BUG FIX
The "M" key for main menu previously didn't work because `this.scene.start('MenuScene')`
left the old GameScene and UIScene running. When the user pressed Space to restart,
the old scenes collided with the new ones. The fix is in `UIScene.js`:

```js
goToMainMenu() {
  this.scene.stop('GameScene');
  this.scene.stop('UIScene');
  this.scene.start('MenuScene');
}

restartGame() {
  this.scene.stop('GameScene');
  this.scene.stop('UIScene');
  this.scene.start('GameScene');
  this.scene.launch('UIScene');
}
```

`MenuScene.startGame()` also defensively stops any active GameScene/UIScene
before launching fresh ones.

### Win/Death Overlay Keys
- `[R]` — restart (calls `restartGame()`)
- `[M]` — main menu (calls `goToMainMenu()`)
- `[ESC]` — death screen, returns to main menu

### Combat
- **Punch (`J`):** 80×90 hitbox at `(carl.x + dir*44, carl.y - 50)`, lasts 160ms
- **Stomp (`K`):** down slam, one-shots enemies hit during descent
- **Magic (`L`):** cyan missile (720px/s, 16×16 hitbox), Donut jumps to shoulder
- **Punch hitbox check:** `Math.abs(e.x - x) < 50 && Math.abs(e.y - y) < 55`
- **i-frames:** 1000ms after taking damage

### Test Script
`/tmp/browser-test/qa2.mjs` — Playwright script that runs 7 gameplay tests:
jump, walk+punch, magic, stomp, pit fall, restart, win. **IMPORTANT:** The
script does NOT auto-skip the menu, so a hand edit was needed:
```js
await page.goto(URL + '?bust=' + Date.now(), { waitUntil: 'networkidle0' });
await sleep(1500);
// Skip menu
await page.keyboard.press('Space');
await sleep(800);
```
All other test scripts (`play4.mjs`, `resnap.mjs`, `worldsnap.mjs`,
`spawnshot.mjs`, `qa.mjs`, `bindcheck.mjs`, `deathcheck.mjs`, `errcheck.mjs`,
`hudcheck*.mjs`, `wincheck.mjs`) had this same fix applied.

---

## What Was Just Done (this session)

1. **Sprite redesign** — completely rewrote `SpriteFactory.js` to match the
   @johnrubio reference: red-haired Carl with brass gauntlet + red cape,
   orange tabby Persian Donut with green eyes + gold crown.

2. **Carl physics** — resized player body 30×50 → 36×70 to match the bigger sprite.

3. **Floor "resides with the browser"** — added a screen-fixed tileSprite
   ground panel at viewport bottom (80px tall, warm brown tint, horizon line).

4. **Enemies more visible** — bigger 48×48 texture (was 32×32) with detailed
   features. Pulsing red halo. Generous 36×40 hitbox.

5. **Punch hitbox widened** — 80×90 (was 64×80) with 50×55 detection radius
   (was 40×48). Punch arc larger and brighter.

6. **Donut follows behind** — repositioned to follow opposite Carl's facing
   direction at y_offset=-40, with small horizontal orbit.

7. **Main menu bug fixed** — `M` key and `R` key now properly stop existing
   GameScene/UIScene before starting fresh ones. `MenuScene.startGame()`
   also defensively stops any active scenes.

8. **Menu previews moved** — Carl on left side (x=200), Donut on right (x=1080)
   so they're not hidden by the how-to-play panel.

---

## What's NOT Done Yet (next session)

- **Push to GitHub** — user said "do not post to github yet." When ready:
  1. `git init` (not a git repo yet — verified)
  2. Create GitHub repo, `git remote add origin <url>`
  3. Push to main, enable Pages, configure custom domain
  4. Cloudflare DNS for `donut.4bros.cc` → 4 GitHub Pages IPs (185.199.108.153/.109/.110/.111), proxy OFF
  5. See `DEPLOY.md` for full instructions
- **Balance pass** — Carl currently dies around x=4360 with 18 enemies. May want to tweak:
  - More forgiving enemy damage (i-frames longer?)
  - More punch range, or slower enemy patrol
  - Heal pickups?
- **Music / SFX** — currently silent. Could add ambient dungeon drone + combat sounds
- **More levels** — only Floor 1 exists. Architecture supports adding more
- **Polish** — particle effects on enemy death (already exists), screen shake on heavy hits, more debris variety
- **Donut attack** — currently she only "rides" on shoulder. Could give her a passive aura or active attack

---

## Gotchas / Things That Will Bite You

1. **Don't `setOrigin(0.5, 1.0)` for Donut** — she floats and needs origin 0.5, 0.5
2. **Outline trick** — each entity has TWO sprites: outline (1.08× scale, black) BEHIND color (1.0× scale, full color). Don't forget to update both
3. **The tween on `tint` mutates the whole sprite** — was washing out Donut's orange to pink when tinted cyan. Use warm yellow tint instead, or don't tint at all
4. **Test scripts need menu skip** — they load the page but expect GameScene to be active. Always add `page.keyboard.press('Space'); await sleep(800);` after page load
5. **Vite dev server sometimes hangs on syntax errors** — if you see a 500 error, check `tail /tmp/donut-dev.log` and `node --check <file>` to find the bad file
6. **The UIScene is parallel to GameScene** — they're both running, UIScene reads from `gameScene` reference. When you restart, you must stop BOTH before starting fresh
7. **PIT kill zone is at FLOOR_Y + 10 with height 800** — the lower floor layers are SKIPPED in pit x-ranges so Carl can fall through. Don't accidentally fill the pit area with floor tiles
8. **Camera Y** — WORLD_HEIGHT=720 = canvas height. Camera doesn't scroll vertically. Screen-fixed ground panel at viewport bottom aligns with FLOOR_Y=640 in world

---

## Test Commands

```bash
# Full QA — 7 gameplay tests (after the menu skip patch)
cd /tmp/browser-test && node qa2.mjs 2>&1 | tail -30

# Full level playthrough
cd /tmp/browser-test && node play4.mjs 2>&1 | tail -20

# Snapshots
cd /tmp/browser-test && node spawnshot.mjs     # spawn + jump + magic
cd /tmp/browser-test && node resnap.mjs        # spawn + mid + far
cd /tmp/browser-test && node worldsnap.mjs     # pit + goal

# Menu
cd /tmp/browser-test && node -e "
import('puppeteer-core').then(async (mod) => {
  const puppeteer = mod.default;
  const browser = await puppeteer.launch({headless: 'new', args:['--no-sandbox'], executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page = await browser.newPage();
  await page.setViewport({width: 1280, height: 720});
  await page.goto('http://localhost:5173/?bust=' + Date.now(), {waitUntil: 'networkidle0'});
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({path: '/tmp/donut-screenshots/MENU.png'});
  await browser.close();
});
" 2>&1 | tail -2
```

Screenshots go to `/tmp/donut-screenshots/`. File sizes should VARY between
frames (proves animation is happening). If all are byte-identical, the page
is frozen on an error overlay.

---

## Reference Links

- **@johnrubio Carl + Donut art** (used as visual reference): https://www.reddit.com/r/DungeonCrawlerCarl/comments/1jlkqox/i_drew_carl_and_donut/
- **Dungeon Crawler Carl Wikipedia**: https://en.wikipedia.org/wiki/Dungeon_Crawler_Carl
- **Phaser 3 docs**: https://photonstorm.github.io/phaser3-docs/
- **Cloudflare DNS for 4bros.cc**: configured in Cloudflare dashboard
- **GitHub Pages IPs**: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153

---

## File Counts

- Total source LOC: ~2,750 (across 8 files)
- 1 sprite factory, 1 main scene, 1 menu, 1 UI, 1 boot, 2 dev test scenes
- All sprites generated procedurally (no image assets) — easy to tweak colors
- Zero npm dependencies beyond Phaser 3.80 + Vite 5.4 + gh-pages

## Current State — What's Tested & Working

✅ Menu shows Carl/Donut previews on either side of how-to-play panel
✅ SPACE/ENTER/click on menu → starts GameScene + UIScene cleanly
✅ Carl spawns, walks, jumps, punches, stomps, casts magic
✅ Donut follows behind Carl, opposite to his facing
✅ Donut jumps to shoulder when magic fired
✅ All 7 QA tests pass with zero console errors
✅ Floor stays at bottom of viewport (screen-fixed)
✅ Enemies are visible (48px tall with halo)
✅ Punch hitbox is generous (50×55 detection)
✅ Win/death overlays work, M and R keys properly restart

## Current State — Known Limitations

⚠️ Carl auto-dies around x=4360 of 6000 in a straight playthrough (hard)
⚠️ No music or SFX
⚠️ No heal pickups
⚠️ No Donut attack/passive (she just rides shoulder)
⚠️ Only 1 level (Floor 1)
⚠️ Not yet pushed to GitHub
