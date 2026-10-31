import * as THREE from 'three'
import type { FinishedGood } from '../sim/types'
import type { ProductId } from '../config/recipes'
import { MODEL_URLS, centerOnFloor, cloneModel, fitHeight, loadGltf } from './assets'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

const PRODUCT_MODELS: Record<ProductId, string[]> = {
  croissant: [MODEL_URLS.croissant],
  baguette: [MODEL_URLS.baguette, MODEL_URLS.bread],
  muffin: [MODEL_URLS.muffin, MODEL_URLS.cupcake],
  cookie: [MODEL_URLS.cookie, MODEL_URLS.cookieChoc, MODEL_URLS.donut],
}

/** Max visible props per product on the tiny display. */
const VISUAL_CAP: Record<ProductId, number> = {
  croissant: 4,
  baguette: 3,
  muffin: 4,
  cookie: 5,
}

export class DisplayGoods {
  private templates = new Map<string, GLTF>()
  private ready = false

  async load(): Promise<void> {
    const urls = Object.values(PRODUCT_MODELS).flat()
    await Promise.all(
      urls.map(async (url) => {
        this.templates.set(url, await loadGltf(url))
      }),
    )
    this.ready = true
  }

  sync(anchor: THREE.Group, display: FinishedGood[]): void {
    if (!this.ready) return
    while (anchor.children.length) {
      const child = anchor.children.pop()
      if (child) anchor.remove(child)
    }

    let slot = 0
    const products: ProductId[] = ['croissant', 'baguette', 'muffin', 'cookie']
    for (const productId of products) {
      const qty = display.find((g) => g.productId === productId)?.quantity ?? 0
      const show = Math.min(qty, VISUAL_CAP[productId])
      const urls = PRODUCT_MODELS[productId]
      for (let i = 0; i < show; i++) {
        const gltf = this.templates.get(urls[i % urls.length])!
        const mesh = cloneModel(gltf, { castShadow: true, receiveShadow: false })
        centerOnFloor(mesh)
        fitHeight(mesh, productId === 'baguette' ? 0.12 : 0.08)
        const col = slot % 4
        const row = Math.floor(slot / 4)
        mesh.position.set((col - 1.5) * 0.22, 0, (row - 0.5) * 0.18)
        mesh.rotation.y = (i % 3) * 0.4
        anchor.add(mesh)
        slot += 1
      }
    }
  }
}
