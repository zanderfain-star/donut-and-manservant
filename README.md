# Donut &amp; Manservant

A bold cartoon / comic-cover sidescroller inspired by *Dungeon Crawler Carl*,
hosted at **https://donut.4bros.cc**.

> A fan game honoring **DUNGEON CRAWLER CARL by Matt Dinniman** —
> read the books: <https://mattdinniman.com/books/dungeon-crawler-carl/>.
> Unofficial, made with love. Goddammit, Donut!

You are Carl (red hair, brass gauntlet, heart boxers). Donut the crowned cat
rides behind you — and fires eye-rockets from your shoulder. Mongo, Donut's
baby raptor, trails the party: he snacks on fallen corpses (+10 NOM) and
chews up rats that stray too close to mommy. Take the stairs down at the
far right of Floor 1.

Built with Phaser 3 + Vite, vanilla JS. All sprites generated procedurally —
no image assets.

## Story

The dungeon took the world. Crawler Carl (heart boxers, brass gauntlet)
drops to **Floor 1: Descent** with his cat Donut (crowned, unimpressed,
armed with eye-rockets). She supervises. He punches first.

## Levels (DCC Book 1 canon — zones are mob-identified, no throne room here)

2 floors shipped. Walk onto the stairs (after the boss) and press SPACE to
descend — score + Silver Box upgrades carry down, HP refills.

Floor 1 — 3 zones + borough boss in one run:

| # | Zone | Stretch | Threat |
|---|------|---------|--------|
| 1 | ENTRY TUNNELS — Mind the Murder Dozers | 0–2000 | goblins + rats, base stats, warm grade |
| 2 | THE GARBAGE — Something big lives in the trash | 2000–4200 | tinkers lob faster (+12% speed), violet grade, 2 pits |
| 3 | THE GYM — Fitness. Weights. Gains. | 4200–6000 | faster everything, 4-HP trogs, red grade |
| ★ | BALL OF SWINE — borough boss | ~5400–6010 | rolling flesh ball, 12 HP (max 2/hit), guards the stairs |

Mob elevation per zone: speed +12%/zone, tinker fuse −15%/zone, gym
trogs grow a 4th HP. Mongo levels with the zones too (LV 1–3: size,
chew speed 1.0s→0.5s, leash 380→540).

Upgrades: 2 SILVER BOXES in the gym grant permanent loot — +1 max HP,
+1 max mana, or +1 punch damage (caps 10 / 7 / 3; maxed Carl gets +250).

Achievements (up to 4 on the clear panel): playstyle (Lover, Punch Drunk,
Cat Artillery, Smoosh Supreme), progression (This Little Piggy, Sous Chef,
Big Boy, Sightseer, Speedrunner, Box Gambler), survival/misc (Untouchable,
Pit Enthusiast, Show-Off, Exterminator, Waste Not, Loot Snob, What's Mana,
Participant).

Checkpoints: GARBAGE GATE (x2100 → respawn 2280), GYM GATE (x4300 → respawn
4480). Pit falls cost 1 HP and rescue to checkpoint — score/combo persist.
The descent stairs sit under a red forcefield dome until the Swine dies.

Floor 2 — same engine, meaner dungeon:

| # | Zone | Stretch | Threat |
|---|------|---------|--------|
| 1 | THE CINDERS — Watch for scorch marks | 0–2000 | +36% speed packs |
| 2 | THE LICHEN MAZE — Do not lick the walls | 2000–4200 | rapid tinkers, 4-HP trogs |
| 3 | THE POUND — You hear distorted barking | 4200–6000 | +60% speed, 5-HP trogs |
| ★ | RALPH — frenzied gerbil | ~5400–6010 | fast roller (95), 8 HP (max 2/hit) |

Mongo keeps leveling (LV 4–6: bigger, 0.4s→0.3s chews, 780 leash).

Floor 3 — THE OVER CITY (Book 2: grey rubble, circus lights, crater mold):

| # | Zone | Threat |
|---|------|--------|
| 1 | THE RUBBLE — Grey on grey on grey | goblins, rats, DREK swarmers |
| 2 | CIRCUS GROUNDS — The show never stopped | tinkers, trogs, drek |
| 3 | THE CRATER — Something skates down there | heavies + drek |
| ★ | HEATHER — mold bear on skates | 10 HP (max 2/hit), fast for her size |

New mob: DREK (knee-high demonic infant, fast, 1 HP). Mongo LV 7–9.

Floor 4 — THE IRON TANGLE (Book 3: the map IS the Nightmare Express):

| # | Zone | Threat |
|---|------|--------|
| 1 | NIGHTMARE CARS — All aboard. No refunds. | drek + goblins on the roofs |
| 2 | TRANSFER MAZE — Mind the gap. Seriously. | tinkers, trogs, car-gap pits |
| 3 | ABYSS EDGE — Last stop: everywhere | everything, faster |
| ★ | GHOUL AMALGAM — festering mass | 14 HP (max 2/hit), slow |

Train rules: steel roof floor, car gaps are pits, tunnel background streams
past (480px/s) with station signs (STATION 112, RED LINE, MIND THE GAP,
ABYSS 436). Mongo LV 10–12. Floor 4 clear = TO BE CONTINUED.

## Goal

Cross all 3 zones alive and walk onto the **DESCENT STAIRS** at x≈6040 —
Carl auto-walks to the stair mouth, Donut rides his shoulder, and you fade
down to Floor 2 (clear panel, score kept). Kills + stars build score (combo
multiplier ×4s window). Win bonus: 500 + 25×HP. Dying (HP 0 or abyss with
0 HP left) shows the death panel — `R` retries from spawn, `M`/`ESC` back
to the cover.

## Play locally

```
npm install
npm run dev
```

→ opens at http://localhost:5173/

## Controls

| Key | Action |
|-----|--------|
| `A` / `D` | move left / right |
| `W` / `SPACE` / `↑` | jump |
| `J` | punch (short-range melee) |
| `K` | stomp (mid-air — slam down, one-shots enemies; landing on heads works too) |
| `L` | magic missile (Donut jumps to your shoulder and fires — ranged) |
| `R` | restart floor (on win/death screens, or anytime in the HUD footer) |
| `M` | back to main menu (comic cover) |
| `ESC` | back to main menu (from win/death screens) |

Menu: `SPACE` / `ENTER` / click — DESCEND!

HUD: hearts (`♥` = health, max 8), mana crystals (`◆` = Donut magic),
score + combo multiplier, zone banner, descent progress % bar with
checkpoint tick, magic cooldown, toast banners for zones/pickups.

## Build & deploy (GitHub Pages → donut.4bros.cc)

```
npm run build     # outputs to ./dist (base './' — relative assets)
npm run deploy    # build + push dist/ to the gh-pages branch
```

Deploy-ready checklist (all verified locally, none of this deploys by itself):

- [ ] `npm run build` succeeds, `dist/index.html` exists with `./assets/…` paths
- [ ] `dist/CNAME` contains `donut.4bros.cc` (from `public/CNAME` — do not delete)
- [ ] `dist/.nojekyll` exists (from `public/.nojekyll` — keeps `CNAME` + dotfiles served)
- [ ] `dist/favicon.svg` exists (from `public/favicon.svg`)
- [ ] Custom domain set: repo → Settings → Pages → `donut.4bros.cc`
- [ ] DNS: `donut.4bros.cc` → GitHub Pages (see `DEPLOY.md`; Cloudflare proxy OFF)

Exact deploy commands (run from the project root, only when ready to ship):

```bash
# Option A — gh-pages package (pushes dist/ to gh-pages branch)
npm run deploy

# Option B — manual (same thing, explicit)
npm run build
npx gh-pages -d dist
```

CI alternative: `.github/workflows/pages.yml` builds `dist/` on every push
to `main` and deploys via official `actions/deploy-pages`. Either path works —
pick one so two deploys don't fight over the `gh-pages` branch.

Full DNS + repo setup walkthrough: see `DEPLOY.md`.

## Architecture

- `src/main.js` — Phaser game config, scene registration
- `src/scenes/BootScene.js` — procedural texture generation, scene handoff
- `src/scenes/MenuScene.js` — comic-cover title screen (starburst, previews, how-to-play)
- `src/scenes/GameScene.js` — level, player physics, enemies, combat (gameplay owner)
- `src/scenes/UIScene.js` — parallel comic HUD: hearts/mana/score/combo/zone/progress/cooldown/toasts, win-death overlays
- `src/entities/SpriteFactory.js` — cel-shaded Carl + Donut with outline trick

## Hosting

GitHub Pages from the `gh-pages` branch. Custom domain `donut.4bros.cc`
configured via `public/CNAME`. `vite.config.js` uses `base: './'` — do not
change it or Pages asset paths break.

## License

MIT — see [LICENSE](./LICENSE). Fork it, fix it, make Floor 5 weird.
