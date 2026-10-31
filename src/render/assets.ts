import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

const loader = new GLTFLoader()
const cache = new Map<string, Promise<GLTF>>()

export function loadGltf(url: string): Promise<GLTF> {
  let pending = cache.get(url)
  if (!pending) {
    pending = loader.loadAsync(url)
    cache.set(url, pending)
  }
  return pending
}

/** Clone a scene graph and prepare materials for the cartoon look. */
export function cloneModel(gltf: GLTF, opts?: { castShadow?: boolean; receiveShadow?: boolean }): THREE.Group {
  const root = cloneSkinned(gltf.scene) as THREE.Group
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    obj.castShadow = opts?.castShadow ?? true
    obj.receiveShadow = opts?.receiveShadow ?? true
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const mat of mats) {
      if (mat instanceof THREE.MeshStandardMaterial) {
        // Keep atlas textures readable; only flatten untextured solid materials
        if (!mat.map) mat.flatShading = true
        mat.roughness = Math.max(mat.roughness ?? 0.5, 0.7)
        mat.metalness = Math.min(mat.metalness ?? 0, 0.2)
        mat.needsUpdate = true
      }
    }
  })
  return root
}

/** Fit model so its height matches `targetHeight` meters. */
export function fitHeight(object: THREE.Object3D, targetHeight: number): number {
  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  box.getSize(size)
  if (size.y < 1e-4) return 1
  const scale = targetHeight / size.y
  object.scale.multiplyScalar(scale)
  // Sit on the floor
  const after = new THREE.Box3().setFromObject(object)
  object.position.y -= after.min.y
  return scale
}

/** Center XZ on origin while keeping floor contact. */
export function centerOnFloor(object: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(object)
  const center = new THREE.Vector3()
  box.getCenter(center)
  object.position.x -= center.x
  object.position.z -= center.z
  object.position.y -= box.min.y
}

export const MODEL_URLS = {
  fridge: '/models/furniture/kitchenFridge.glb',
  stove: '/models/furniture/kitchenStove.glb',
  sink: '/models/furniture/kitchenSink.glb',
  blender: '/models/furniture/kitchenBlender.glb',
  cabinet: '/models/furniture/kitchenCabinet.glb',
  cabinetDrawer: '/models/furniture/kitchenCabinetDrawer.glb',
  bar: '/models/furniture/kitchenBar.glb',
  table: '/models/furniture/table.glb',
  bookcase: '/models/furniture/bookcaseOpen.glb',
  desk: '/models/furniture/desk.glb',
  sideTable: '/models/furniture/sideTable.glb',
  cashRegister: '/models/shop/cash-register.glb',
  displayBread: '/models/shop/display-bread.glb',
  shelfBoxes: '/models/shop/shelf-boxes.glb',
  shelfEnd: '/models/shop/shelf-end.glb',
  freezer: '/models/shop/freezer.glb',
  maya: '/models/characters/maya.glb',
  leo: '/models/characters/leo.glb',
  customerF1: '/models/characters/customer-f1.glb',
  customerF2: '/models/characters/customer-f2.glb',
  customerM1: '/models/characters/customer-m1.glb',
  customerM2: '/models/characters/customer-m2.glb',
  customerM3: '/models/characters/customer-m3.glb',
  croissant: '/models/food/croissant.glb',
  baguette: '/models/food/loaf-baguette.glb',
  muffin: '/models/food/muffin.glb',
  cookie: '/models/food/cookie.glb',
  cookieChoc: '/models/food/cookie-chocolate.glb',
  bread: '/models/food/bread.glb',
  cupcake: '/models/food/cupcake.glb',
  donut: '/models/food/donut.glb',
} as const

export type ModelKey = keyof typeof MODEL_URLS
