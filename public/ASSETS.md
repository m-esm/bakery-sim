# Assets and credits

This file lists every third-party 3D model in Tiny Bakery.

All shipped models use **CC0 1.0** (public domain). Credit is not required. We still name the creators.

Art style: low-poly cartoon. Source: [Kenney.nl](https://kenney.nl/).

## License summary

| Source | License | Fit for this game |
| --- | --- | --- |
| Kenney | CC0 1.0 | Best fit. Game-ready packs. Small GLBs. Matching look. |
| Quaternius | CC0 on older packs; newer site uses QAL | Strong for characters. We used Kenney Mini Characters instead to keep one art style. |
| Poly Pizza | Mix of CC0 and CC-BY per model | Good catalog. We did not ship Poly Pizza files. Prefer pack-level CC0 from Kenney. |
| Scenario 3D Collection (Hugging Face) | CC BY 4.0 | Large AI GLB set (~39 GB). Mixed quality. Needs credit. Not used. |
| NVIDIA SimReady Central | Per-asset (often CC BY / partner terms); OpenUSD | Realistic robotics and factory gear. Wrong style for a cartoon bakery. Not used. |

Primary Kenney license page: https://kenney.nl/support  
CC0 deed: https://creativecommons.org/publicdomain/zero/1.0/

## Models in `public/models`

### Characters (Kenney Mini Characters + Mini Market)

| File | Role in game | Pack | Source URL | License |
| --- | --- | --- | --- | --- |
| `characters/maya.glb` | Baker Maya | Mini Characters (`character-female-a`) | https://kenney.nl/assets/mini-characters | CC0 |
| `characters/leo.glb` | Cashier Leo | Mini Market (`character-employee`) | https://kenney.nl/assets/mini-market | CC0 |
| `characters/customer-f1.glb` | Customer | Mini Characters (`character-female-b`) | https://kenney.nl/assets/mini-characters | CC0 |
| `characters/customer-f2.glb` | Customer | Mini Characters (`character-female-c`) | https://kenney.nl/assets/mini-characters | CC0 |
| `characters/customer-m1.glb` | Customer | Mini Characters (`character-male-b`) | https://kenney.nl/assets/mini-characters | CC0 |
| `characters/customer-m2.glb` | Customer | Mini Characters (`character-male-c`) | https://kenney.nl/assets/mini-characters | CC0 |
| `characters/customer-m3.glb` | Customer | Mini Characters (`character-male-d`) | https://kenney.nl/assets/mini-characters | CC0 |

Clips used: `idle`, `walk` (and fallbacks).

### Shop props (Kenney Mini Market)

| File | Role in game | Source URL | License |
| --- | --- | --- | --- |
| `shop/display-bread.glb` | Display case | https://kenney.nl/assets/mini-market | CC0 |
| `shop/cash-register.glb` | Register | https://kenney.nl/assets/mini-market | CC0 |
| `shop/shelf-boxes.glb` | Stock shelf | https://kenney.nl/assets/mini-market | CC0 |
| `shop/shelf-end.glb` | Shelf end (kept for variants) | https://kenney.nl/assets/mini-market | CC0 |
| `shop/freezer.glb` | Cold storage look | https://kenney.nl/assets/mini-market | CC0 |

### Furniture (Kenney Furniture Kit)

| File | Role in game | Source URL | License |
| --- | --- | --- | --- |
| `furniture/kitchenFridge.glb` | Fridge | https://kenney.nl/assets/furniture-kit | CC0 |
| `furniture/kitchenStove.glb` | Oven | https://kenney.nl/assets/furniture-kit | CC0 |
| `furniture/kitchenSink.glb` | Sink | https://kenney.nl/assets/furniture-kit | CC0 |
| `furniture/kitchenBlender.glb` | Mixer | https://kenney.nl/assets/furniture-kit | CC0 |
| `furniture/kitchenCabinet.glb` | Cabinet | https://kenney.nl/assets/furniture-kit | CC0 |
| `furniture/kitchenCabinetDrawer.glb` | Cabinet drawer | https://kenney.nl/assets/furniture-kit | CC0 |
| `furniture/kitchenBar.glb` | Counter bar | https://kenney.nl/assets/furniture-kit | CC0 |
| `furniture/table.glb` | Prep table | https://kenney.nl/assets/furniture-kit | CC0 |
| `furniture/bookcaseOpen.glb` | Open shelves | https://kenney.nl/assets/furniture-kit | CC0 |
| `furniture/desk.glb` | Register desk | https://kenney.nl/assets/furniture-kit | CC0 |
| `furniture/sideTable.glb` | Side table | https://kenney.nl/assets/furniture-kit | CC0 |

### Food (Kenney Food Kit)

| File | Role in game | Source URL | License |
| --- | --- | --- | --- |
| `food/croissant.glb` | Croissant | https://kenney.nl/assets/food-kit | CC0 |
| `food/loaf-baguette.glb` | Baguette | https://kenney.nl/assets/food-kit | CC0 |
| `food/muffin.glb` | Muffin | https://kenney.nl/assets/food-kit | CC0 |
| `food/cookie.glb` | Cookie | https://kenney.nl/assets/food-kit | CC0 |
| `food/cookie-chocolate.glb` | Cookie variant | https://kenney.nl/assets/food-kit | CC0 |
| `food/bread.glb` | Bread loaf | https://kenney.nl/assets/food-kit | CC0 |
| `food/cupcake.glb` | Cupcake / muffin stand-in | https://kenney.nl/assets/food-kit | CC0 |
| `food/donut.glb` | Extra pastry | https://kenney.nl/assets/food-kit | CC0 |

## Size notes

Total GLB payload is about **2 MB**.  
Textures for food, shop, and characters are embedded in the GLB files.

## Procedural meshes

Walls, floors, sidewalk, awning, and sign are local primitives. They are not third-party models.

## Attribution line (optional)

> 3D models by Kenney (www.kenney.nl), CC0.
