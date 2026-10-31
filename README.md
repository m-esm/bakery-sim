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

## Deploy

Live site: [https://bakery.moshes.io](https://bakery.moshes.io).  
The Vite base path is `/` so the app serves from the site root.

Every push to `main` builds a container image.  
The `image` workflow runs `Dockerfile` for `linux/amd64` and pushes to `ghcr.io/m-esm/bakery-sim` with two tags: the full commit sha and `main-<run_number>-<sha7>`.

The image is multi-stage:

1. Node 22 builds the static site with `npm ci` and `npm run build`.
2. `nginxinc/nginx-unprivileged:1.27-alpine` serves `dist/` on port **8080** as uid **101**.

`deploy/nginx.conf` adds SPA fallback, gzip, and long cache headers for `/assets/` and `/models/` (including GLB files).  
For a read-only root filesystem, mount emptyDirs at `/tmp`, `/var/cache/nginx`, and `/var/run`.

Build and run locally:

```bash
docker build -t bakery-sim:local .
docker run --rm -p 8080:8080 \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /var/cache/nginx \
  --tmpfs /var/run \
  bakery-sim:local
```

Then open [http://127.0.0.1:8080](http://127.0.0.1:8080).  
Cluster hosts, TLS, and Flux image automation live in the tenant repo; this repo owns the image.

### Git remotes

Origin is the source of truth.  
GitHub is a build mirror that runs Actions and publishes GHCR images.

| Remote | URL | Role |
| --- | --- | --- |
| `origin` | `https://origin.cursor.com/git/mohsen-esmaeili/bakery-sim.git` | Day-to-day work |
| `github` | `https://github.com/m-esm/bakery-sim.git` | CI / GHCR mirror |

After each change on `main`, push to both remotes so the image workflow runs:

```bash
git push origin main
git push github main
```

Add the GitHub remote once if it is missing:

```bash
git remote add github https://github.com/m-esm/bakery-sim.git
```

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

People are **1.7 m** tall. Counters are about **0.9 m** high.  
The outside queue is single file with **0.6 m** spacing on the sidewalk.  
People walk with `idle` and `walk` clips.  
An overnight bake stocks every product before open. Morning prep bakes the full menu.

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
