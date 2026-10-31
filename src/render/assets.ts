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

/** Local-space AABB from mesh geometry (avoids skinned world AABB inflation). */
export function measureLocalBounds(object: THREE.Object3D): THREE.Box3 {
  object.updateMatrixWorld(true)
  const out = new THREE.Box3()
  const corner = new THREE.Vector3()
  let any = false
  object.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.geometry) return
    obj.geometry.computeBoundingBox()
    const bb = obj.geometry.boundingBox
    if (!bb) return
    for (const x of [bb.min.x, bb.max.x]) {
      for (const y of [bb.min.y, bb.max.y]) {
        for (const z of [bb.min.z, bb.max.z]) {
          corner.set(x, y, z).applyMatrix4(obj.matrixWorld)
          if (!any) {
            out.min.copy(corner)
            out.max.copy(corner)
            any = true
          } else {
            out.expandByPoint(corner)
          }
        }
      }
    }
  })
  if (!any) out.setFromObject(object)
  return out
}

/**
 * Measure local Y extent from mesh geometry (bind pose).
 * Avoids SkinnedMesh world AABB inflation from animations.
 */
export function measureLocalHeight(object: THREE.Object3D): number {
  const box = measureLocalBounds(object)
  return Math.max(1e-3, box.max.y - box.min.y)
}

/** Fit model so its height matches `targetHeight` meters. */
export function fitHeight(object: THREE.Object3D, targetHeight: number): number {
  object.scale.set(1, 1, 1)
  object.updateMatrixWorld(true)
  const height = measureLocalHeight(object)
  const scale = targetHeight / Math.max(height, 1e-3)
  object.scale.setScalar(scale)
  seatOnFloor(object)
  return scale
}

/** Center XZ on origin while keeping floor contact. */
export function centerOnFloor(object: THREE.Object3D): void {
  object.updateMatrixWorld(true)
  const box = measureLocalBounds(object)
  const center = new THREE.Vector3()
  box.getCenter(center)
  object.position.x -= center.x
  object.position.z -= center.z
  seatOnFloor(object)
}

function seatOnFloor(object: THREE.Object3D): void {
  object.updateMatrixWorld(true)
  const box = measureLocalBounds(object)
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
