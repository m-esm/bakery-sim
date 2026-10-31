# Tiny Bakery

Browser-based 3D bakery simulation. Cartoon low-poly look. No paid assets.

The shop floor is **12 m²** total: **4 m × 3 m** (1 unit = 1 meter). Front area has the door, display case, and register. Back area has storage, prep table, oven, and sink. The shop runs with **2 staff** and only a few customers inside at once. Extra customers wait in a queue outside the door.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Other commands:

```bash
npm test          # unit tests
npm run build     # production build
```

## Controls

| Input | Action |
|-------|--------|
| HUD buttons | Pause, 1×, 4×, 16× |
| `Space` | Pause / resume |
| `1` / `2` / `3` | 1× / 4× / 16× |
| Next day button | Starts after 19:00 closing |

At **1×**, one real second equals one simulation minute.

## What it simulates

- **Supply** — Auto morning orders from Mill & Co, Dairy Dawn, and Sweet Trade. Deliveries arrive after a lead time. Stock has shelf life and can spoil at day end.
- **Production** — Data-driven recipes (croissant, baguette, cookie, muffin). Stages: mix → proof → bake → cool → decorate → display. Oven capacity and wear.
- **Staff** — Maya (baker) and Leo (cashier). Shifts, wages, tasks, and grid pathfinding in the 4×3 m shop.
- **Sales** — Customers arrive by time-of-day demand. Max 2 inside. Queue outside. Buy from the display case. Pay at the register.
- **Cleaning** — Dirty dishes and surface dirt. Baker cleans at the sink. Closing phase until the shop is tidy.
- **Business** — Day cycle 05:00–19:00. Open 07:00–18:00. Cash, revenue, wages, deliveries, waste, overhead. HUD shows stock, money, orders, and activity.

## Architecture

Simulation logic does not import Three.js. Rendering only reads snapshots.

```
src/
  config/     layout, recipes, suppliers, staff, economy (data)
  sim/        BakerySim + inventory, pathfinding, clock
  render/     Three.js shop, characters, materials
  ui/         HUD overlays
  main.ts     wires sim ↔ render ↔ HUD
tests/        Vitest unit tests for core sim
```

Key separation:

1. `BakerySim.tick(dtMin)` advances pure state.
2. `BakerySim.snapshot()` returns a plain object.
3. `BakeryRenderer` and `Hud` consume the snapshot each frame.

## Layout notes

| Zone | Contents |
|------|----------|
| Outside (z &lt; 0) | Sidewalk queue |
| Front (z ≈ 0–1.2) | Door, display, register |
| Back (z ≈ 1.3–2.8) | Prep, oven, sink, storage |

Furniture blocks walkable grid cells (0.25 m). Pathfinding uses A* on that grid.

## Roadmap

- Manual order UI and supplier price negotiation
- More recipes and seasonal demand
- Equipment failures beyond oven wear
- Save / load day progress
- Sound and stronger toon outlines
- Tutorial first day for new players
- Mobile touch camera orbit

## Stack

TypeScript, Vite, Three.js, Vitest.
