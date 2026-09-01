# Donut &amp; Manservant

A sidescroller inspired by *Dungeon Crawler Carl*, hosted at **donut.4bros.cc**.

Built with Phaser 3 + Vite, deploys to GitHub Pages.

## Play locally

```
npm install
npm run dev
```

→ opens at http://localhost:5173/

## Build & deploy

```
npm run deploy
```

This builds to `dist/` and pushes to the `gh-pages` branch via the `gh-pages` npm package.

## Controls

- `A` / `D` — move (heavier, deliberate)
- `W` / `SPACE` / `↑` — jump
- `J` — punch (melee)
- `K` — stomp (air-only downward attack)
- `L` — magic missile (Donut's eye-rocket)
- `R` — restart after win/death

## Visual concept

- **The floor** is rendered to feel like a dark, foreign, almost-3D space — atmospheric perspective, gothic silhouettes, etching-style textures.
- **Carl and Donut** are rendered as flat, bright, ink-outlined 2D cutouts — they pop OFF the floor visually.
- Future floors can tint Carl/Donut toward the floor's palette as they "integrate" with each descent.

## Architecture

- `src/main.js` — Phaser game config, scene registration
- `src/scenes/BootScene.js` — texture generation, scene handoff
- `src/scenes/GameScene.js` — level, player physics, enemies, combat
- `src/scenes/UIScene.js` — HUD, win/death overlays (parallel scene)
- `src/entities/SpriteFactory.js` — cel-shaded Carl + Donut with outline trick

## Hosting

GitHub Pages from the `gh-pages` branch. Custom domain `donut.4bros.cc` configured via `public/CNAME`.