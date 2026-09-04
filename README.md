# Donut &amp; Manservant — v2.12

A bold cartoon / comic-cover sidescroller inspired by *Dungeon Crawler Carl*,
hosted at **https://donut.4bros.cc**.

> A fan game honoring **DUNGEON CRAWLER CARL by Matt Dinniman** —
> read the books: <https://mattdinniman.com/books/dungeon-crawler-carl/>.
> Unofficial, made with love. Goddammit, Donut!

You are Carl (red hair, brass gauntlet, heart boxers — hi-res 144×192 sprite).
Donut the crowned cat rides behind you and fires Donut Rockets from your
shoulder. Mongo, Donut's baby raptor, trails the party: he snacks on fallen
corpses (+10 NOM), chews up rats that stray too close to mommy, and grows
every zone (LV 1–12). From Floor 2 on, Carl tosses bombs with `U`.

Built with Phaser 3 + Vite, vanilla JS. All sprites generated procedurally —
no image assets. Bottom-right stamp (`v2.12 • N FPS`, hand-measured) tells
you exactly which build is live.

## Story

Seattle, 11:48 PM. Carl runs outside to get Donut out of the tree — and the
whole city whomps straight into the ground behind them. WHAT THE HELL?!
📢 RUN TO THE STAIRS NOW IF YOU WANT TO JOIN THE DUNGEON. Floor 0 is a
burning collapse: fires hurt, debris falls harder the closer you get to the
stairs. Then the dungeon: Floors 1–4 (DCC Books 1–3), ending in the Floor 5
Safe Room + Desperado Club test ground (buff pedestals, straw Jeffs).

## Levels (zones are mob-identified, no throne room here)

Walk onto the stairs (after the boss) to descend — score + Silver Box
upgrades carry down, HP refills.

Floor 0 — SEATTLE 11:48 PM (prelevel, no baddies): letterboxed intro
(~9s, SPACE skips), burning streets (1 HP/sec), collapse timer escalates
1 chunk/3.6s → 3 chunks/0.9s near the stairs, landed chunks hurt. Grab Donut,
RUN →.

Floor 1 — 3 zones + borough boss in one run:

| # | Zone | Stretch | Threat |
|---|------|---------|--------|
| 1 | ENTRY TUNNELS — Mind the Murder Dozers | 0–2000 | goblins + rats |
| 2 | THE GARBAGE — Something big lives in the trash | 2000–4200 | tinkers lob, violet grade |
| 3 | THE GYM — Fitness. Weights. Gains. | 4200–6000 | faster everything, heavy trogs, red grade |
| ★ | BARON SWINE — tuxedo boar bruiser | ~5400–6010 | 12 HP (max 2/hit), telegraphed lunges, flat arena |

Floor 2 — same engine, meaner dungeon + **BOMB TOSS UNLOCKED (`U`)**:

| # | Zone | Stretch | Threat |
|---|------|---------|--------|
| 1 | THE CINDERS — Watch for scorch marks | 0–2000 | +36% speed packs |
| 2 | THE LICHEN MAZE — Do not lick the walls | 2000–4200 | rapid tinkers, heavy trogs |
| 3 | THE POUND — You hear distorted barking | 4200–6000 | +60% speed bruisers |
| ★ | RALPH — rearing gerbil bruiser | ~5400–6010 | fast (95), 8 HP (max 2/hit) |

Floor 3 — THE OVER CITY (grey rubble, circus lights, crater mold):

| # | Zone | Threat |
|---|------|--------|
| 1 | THE RUBBLE — Grey on grey on grey | goblins, rats, DREK swarmers |
| 2 | CIRCUS GROUNDS — The show never stopped | tinkers, trogs, drek |
| 3 | THE CRATER — Something skates down there | heavies + drek |
| ★ | HEATHER — mold bear on skates | 10 HP (max 2/hit), fast for her size |

New mob: DREK (knee-high demonic infant, fast, 1 HP).

Floor 4 — THE IRON TANGLE (the map IS the Nightmare Express, ride inside):

| # | Zone | Threat |
|---|------|--------|
| 1 | NIGHTMARE CARS — All aboard. No refunds. | drek + goblins in the cars |
| 2 | TRANSFER MAZE — Mind the gap. Seriously. | tinkers, trogs, car-gap pits |
| 3 | ABYSS EDGE — Last stop: everywhere | everything, faster |
| ★ | GHOUL AMALGAM — festering mass | 14 HP (max 2/hit), slow |

Tunnel streams past with station signs. Floor 4 clear = TO BE CONTINUED.

Floor 5 — SAFE ROOM + DESPERADO CLUB: no fighting (except Jeff). Buff
pedestals (Swift Boots, Brass+2, Overdrive, Quake), respawning straw dummies,
Bopca keeps the bar.

Enemy behavior: patrollers hold a bounce beat (cooldown-gated hops),
chase-hop up platforms after Carl, hop out when walled in. Bosses stalk on
foot and telegraph lunges (crouch + amber glint). Platforms are tiled
walkways (lowest top 540 — nothing to wedge under); boss arenas are flat.

Mob elevation per zone/floor: speed up, tinkers lob faster, late trogs grow
bonus HP. Mongo levels with the zones (size, chew 1.0s→0.2s, leash, guard
panic) and hunts big prey (never bosses).

Upgrades: SILVER BOXES grant permanent loot — +1 max HP, +1 max mana, or +1
punch damage (caps 10 / 7 / 3; maxed Carl gets +250).

Achievements (4 shuffled plaques per clear, random quips): playstyle
(Punch Drunk, Cat Artillery, Smoosh Supreme, Slugger, Seismic, Rocket Man,
Fire Support, Stormtrooper, Bombardier, Crowd Control, One-Man Riot),
progression (This Little Piggy, Pop Goes the Gerbil, Bear Necessity Averted,
Composted, Sous Chef, Big Boy, Apex Predator, Sightseer, Speedrunner,
Tourist, Box Gambler, Starstruck, Rock Hound, Ham Enthusiast, High Roller),
survival/misc (Untouchable, Flesh Wound, Damage Sponge, Pit/Cliff,
Show-Off, Hungry and Hurt, Exterminator, Waste Not, Loot Snob,
What's a Rocket, Participant).

Checkpoints per floor; pit falls cost 1 HP and rescue to checkpoint —
score/combo persist. Stairs sit under a forcefield dome until the boss dies.

## Goal

Cross every zone alive and walk onto the **DESCENT STAIRS** — Carl
auto-walks to the stair mouth, Donut rides his shoulder, and you fade down
(clear panel, score kept). Kills + stars build score (combo multiplier, 4s
window). Win bonus: 500 + 25×HP. Dying shows the death panel — `R` retries
from spawn, `M`/`ESC` back to the cover.

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
| `J` | punch (short-range melee + forward lunge) |
| `K` | stomp (mid-air — slam down, one-shots enemies; landing on heads works too) |
| `L` | DONUT ROCKET (Donut jumps to your shoulder and fires — needs CRYSTAL fuel) |
| `U` | bomb toss (Floor 2+ — arcing fuse bomb, AoE 2 dmg) |
| `R` | restart floor (on win/death screens, or anytime in the HUD footer) |
| `M` | back to main menu (comic cover) |
| `ESC` | back to main menu (from win/death screens) |

Menu: `SPACE` / `ENTER` / click — DESCEND!

HUD: hearts (`♥` = health, max 8), rocket fuel (`◆` = crystal charges),
score + combo multiplier, zone banner, descent progress % bar with
checkpoint tick, rocket cooldown, toast banners for zones/pickups, release
stamp + live FPS bottom-right.

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
- `src/scenes/UIScene.js` — parallel comic HUD: hearts/fuel/score/combo/zone/progress/cooldown/toasts/version+FPS, win-death overlays
- `src/entities/SpriteFactory.js` — cel-shaded Carl (144×192) + Donut with outline trick

## Hosting

GitHub Pages from the `gh-pages` branch. Custom domain `donut.4bros.cc`
configured via `public/CNAME`. `vite.config.js` uses `base: './'` — do not
change it or Pages asset paths break.

## License

MIT — see [LICENSE](./LICENSE). Fork it, fix it, make Floor 5 weird.
