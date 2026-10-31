# Tiny Bakery

Tiny Bakery is a browser 3D bakery simulation.  
The art style is cartoon and low-poly.  
The shop floor is **12 m²** (4 m × 3 m). One unit equals one meter.

## Run the game

1. Install packages: `npm install`
2. Start the app: `npm run dev`
3. Open [http://127.0.0.1:43123](http://127.0.0.1:43123)

Other commands:

- Run tests: `npm test`
- Build for production: `npm run build`

## Controls

| Input | Action |
| --- | --- |
| HUD buttons | Pause, 1×, 4×, 16× |
| `Space` | Pause or resume |
| `1` / `2` / `3` | Set 1× / 4× / 16× |
| Next day button | Start the next day after 19:00 |

At **1×**, one real second equals one simulation minute.

## What the sim covers

- **Supply:** Morning orders, deliveries, stock, shelf life, spoilage.
- **Production:** Recipes, mix, proof, bake, cool, decorate, display.
- **Staff:** Maya (baker) and Leo (cashier). Shifts, wages, tasks, pathfinding.
- **Sales:** Customers, outside queue, display stock, register payment.
- **Cleaning:** Dirty dishes, surface dirt, end-of-day cleanup.
- **Business:** Day cycle, cash, HUD stats.

## 3D models

The shop uses Kenney CC0 GLB models for furniture, food, and people.  
See [ASSETS.md](ASSETS.md) for every file, source URL, and license.

People walk with `idle` and `walk` clips.  
Baked goods appear on the display case.  
The outside queue stands on the sidewalk.

## Architecture

Simulation code does not import Three.js.  
Rendering only reads snapshots.

```
src/
  config/     layout, recipes, suppliers, staff, economy
  sim/        BakerySim + inventory, pathfinding, clock
  render/     Three.js shop, characters, goods, lighting
  ui/         HUD
  main.ts     wires sim, render, and HUD
tests/        Vitest tests for the sim core
public/models/  Kenney GLB assets
```

Flow:

1. `BakerySim.tick(dtMin)` updates state.
2. `BakerySim.snapshot()` returns plain data.
3. The renderer and HUD consume that snapshot each frame.

## Layout

| Zone | Contents |
| --- | --- |
| Outside (z &lt; 0) | Sidewalk queue |
| Front (z ≈ 0–1.2) | Door, display, register |
| Back (z ≈ 1.3–2.8) | Prep, oven, sink, storage |

## Roadmap

- Manual order UI for suppliers
- More recipes and seasonal demand
- Extra equipment failures
- Save and load day progress
- Sound effects
- First-day tutorial
- Mobile camera orbit
- Optional Quaternius / Poly Pizza props with credits when a Kenney gap appears

## Stack

TypeScript, Vite, Three.js, Vitest.  
3D packs: Kenney Food Kit, Furniture Kit, Mini Market, Mini Characters (CC0).
