import * as THREE from 'three'
import { FURNITURE, SHOP_DEPTH, SHOP_WIDTH, STATIONS } from '../config/layout'
import { COUNTER_HEIGHT_M } from '../config/scale'
import { PALETTE, toon } from './materials'
import { MODEL_URLS, centerOnFloor, cloneModel, fitHeight, loadGltf } from './assets'

export interface ShopBuildResult {
  root: THREE.Group
  displayAnchor: THREE.Group
  ovenGlow: THREE.Object3D | null
}

export async function buildShop(): Promise<ShopBuildResult> {
  const root = new THREE.Group()
  root.name = 'shop'

  // Outside ground + longer sidewalk for the queue
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), toon(PALETTE.grass))
  outside.rotation.x = -Math.PI / 2
  outside.position.set(SHOP_WIDTH / 2, -0.01, SHOP_DEPTH / 2 - 1.5)
  outside.receiveShadow = true
  root.add(outside)

  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 4.0), toon(PALETTE.sidewalk))
  sidewalk.position.set(STATIONS.door.x, 0.02, -1.5)
  sidewalk.receiveShadow = true
  root.add(sidewalk)

  // Floors
  const floorFront = new THREE.Mesh(new THREE.BoxGeometry(SHOP_WIDTH, 0.06, 1.3), toon(PALETTE.floorFront))
  floorFront.position.set(SHOP_WIDTH / 2, 0.03, 0.65)
  floorFront.receiveShadow = true
  root.add(floorFront)

  const floorBack = new THREE.Mesh(new THREE.BoxGeometry(SHOP_WIDTH, 0.06, 1.7), toon(PALETTE.floorBack))
  floorBack.position.set(SHOP_WIDTH / 2, 0.03, 2.15)
  floorBack.receiveShadow = true
  root.add(floorBack)

  // Open-top walls: tall enough that 1.7 m people read correctly vs 0.9 m counters
  const wallMat = toon(PALETTE.wall)
  const trimMat = toon(PALETTE.wallTrim)
  const wallH = 2.15
  // Back wall full height; side walls step down toward the front for a clear view
  addWall(root, SHOP_WIDTH, wallH, SHOP_WIDTH / 2, wallH / 2, SHOP_DEPTH, wallMat)
  addWall(root, 0.08, wallH, 0, wallH / 2, SHOP_DEPTH / 2, wallMat, SHOP_DEPTH)
  addWall(root, 0.08, wallH, SHOP_WIDTH, wallH / 2, SHOP_DEPTH / 2, wallMat, SHOP_DEPTH)

  const frontH = 1.55
  const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(1.35, frontH, 0.08), wallMat)
  frontLeft.position.set(0.675, frontH / 2, 0)
  frontLeft.castShadow = true
  root.add(frontLeft)
  const frontRight = new THREE.Mesh(new THREE.BoxGeometry(1.35, frontH, 0.08), wallMat)
  frontRight.position.set(3.325, frontH / 2, 0)
  frontRight.castShadow = true
  root.add(frontRight)
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.08), trimMat)
  lintel.position.set(2.0, frontH + 0.07, 0)
  root.add(lintel)

  // Partial divider with a clear pass-through near register
  const div = FURNITURE.backWallDivider
  const divider = new THREE.Mesh(new THREE.BoxGeometry(div.w, 0.85, div.d), toon(PALETTE.wood))
  divider.position.set(div.x + div.w / 2, 0.42, div.z + div.d / 2)
  divider.castShadow = true
  root.add(divider)

  // Door canopy stripe (not a counter) + shop sign above the lintel
  const awning = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.025, 0.22), toon(0xc1121f))
  awning.position.set(2.0, frontH + 0.18, -0.14)
  awning.rotation.x = -0.28
  awning.name = 'doorAwning'
  root.add(awning)
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.04), toon(0x1d3557))
  sign.position.set(2.0, frontH + 0.38, 0.05)
  sign.name = 'shopSign'
  root.add(sign)

  const [
    displayGltf,
    registerGltf,
    deskGltf,
    tableGltf,
    stoveGltf,
    sinkGltf,
    fridgeGltf,
    blenderGltf,
    shelfGltf,
    barGltf,
    cabinetGltf,
  ] = await Promise.all([
    loadGltf(MODEL_URLS.displayBread),
    loadGltf(MODEL_URLS.cashRegister),
    loadGltf(MODEL_URLS.desk),
    loadGltf(MODEL_URLS.table),
    loadGltf(MODEL_URLS.stove),
    loadGltf(MODEL_URLS.sink),
    loadGltf(MODEL_URLS.fridge),
    loadGltf(MODEL_URLS.blender),
    loadGltf(MODEL_URLS.shelfBoxes),
    loadGltf(MODEL_URLS.bar),
    loadGltf(MODEL_URLS.cabinet),
  ])

  // Front: display + matching counter (kitchen bar + cabinet), register desk
  const display = placeModel(cloneModel(displayGltf), {
    x: 0.9,
    z: 0.95,
    rotY: Math.PI,
    height: 1.0,
    maxWidth: 1.05,
  })
  display.name = 'displayCase'
  root.add(display)

  const counterA = placeModel(cloneModel(barGltf), {
    x: 1.7,
    z: 0.95,
    rotY: Math.PI,
    height: COUNTER_HEIGHT_M,
    maxWidth: 0.95,
  })
  counterA.name = 'frontCounter'
  root.add(counterA)

  const counterB = placeModel(cloneModel(cabinetGltf), {
    x: 2.25,
    z: 0.95,
    rotY: Math.PI,
    height: COUNTER_HEIGHT_M,
    maxWidth: 0.7,
  })
  root.add(counterB)

  const desk = placeModel(cloneModel(deskGltf), {
    x: 3.15,
    z: 0.95,
    rotY: Math.PI,
    height: COUNTER_HEIGHT_M,
    maxWidth: 0.9,
  })
  root.add(desk)
  const register = placeModel(cloneModel(registerGltf), {
    x: 3.15,
    z: 0.82,
    rotY: Math.PI,
    height: 0.32,
    y: COUNTER_HEIGHT_M,
  })
  root.add(register)

  // Back: prep, mixer, oven, sink, fridge, one stock shelf
  const prep = placeModel(cloneModel(tableGltf), {
    x: 0.95,
    z: 2.0,
    height: COUNTER_HEIGHT_M - 0.05,
    maxWidth: 0.95,
  })
  root.add(prep)
  const mixer = placeModel(cloneModel(blenderGltf), {
    x: 0.7,
    z: 1.9,
    height: 0.32,
    y: COUNTER_HEIGHT_M - 0.05,
  })
  root.add(mixer)

  const oven = placeModel(cloneModel(stoveGltf), {
    x: 2.05,
    z: 2.6,
    rotY: Math.PI,
    height: 1.05,
    maxWidth: 0.7,
  })
  oven.name = 'oven'
  root.add(oven)

  const sink = placeModel(cloneModel(sinkGltf), {
    x: 3.35,
    z: 2.3,
    rotY: -Math.PI / 2,
    height: 0.9,
    maxWidth: 0.55,
  })
  root.add(sink)

  const fridge = placeModel(cloneModel(fridgeGltf), {
    x: 0.35,
    z: 2.65,
    rotY: Math.PI / 2,
    height: 1.3,
    maxWidth: 0.55,
  })
  root.add(fridge)

  const stockShelf = placeModel(cloneModel(shelfGltf), {
    x: 3.55,
    z: 1.55,
    rotY: -Math.PI / 2,
    height: 1.35,
    maxWidth: 0.5,
    maxDepth: 0.7,
  })
  root.add(stockShelf)

  const displayAnchor = new THREE.Group()
  displayAnchor.name = 'displayGoods'
  displayAnchor.position.set(0.9, 1.02, 0.95)
  root.add(displayAnchor)

  const ovenGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.22),
    new THREE.MeshStandardMaterial({
      color: 0x222222,
      emissive: PALETTE.ovenHot,
      emissiveIntensity: 0.3,
      flatShading: true,
    }),
  )
  ovenGlow.position.set(2.05, 0.5, 2.38)
  ovenGlow.name = 'ovenGlow'
  root.add(ovenGlow)

  return { root, displayAnchor, ovenGlow }
}

function placeModel(
  model: THREE.Group,
  opts: {
    x: number
    z: number
    rotY?: number
    height: number
    y?: number
    maxWidth?: number
    maxDepth?: number
  },
): THREE.Group {
  centerOnFloor(model)
  fitHeight(model, opts.height)
  if (opts.maxWidth || opts.maxDepth) {
    model.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    box.getSize(size)
    let s = 1
    if (opts.maxWidth && size.x > opts.maxWidth) s = Math.min(s, opts.maxWidth / size.x)
    if (opts.maxDepth && size.z > opts.maxDepth) s = Math.min(s, opts.maxDepth / size.z)
    if (s < 1) {
      model.scale.multiplyScalar(s)
      model.updateMatrixWorld(true)
      const after = new THREE.Box3().setFromObject(model)
      model.position.y -= after.min.y
    }
  }
  model.rotation.y = opts.rotY ?? 0
  model.position.x = opts.x
  model.position.z = opts.z
  if (opts.y !== undefined) model.position.y = opts.y
  return model
}

function addWall(
  root: THREE.Group,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  depth = 0.08,
): void {
  const mesh = new THREE.Mesh(
    w === 0.08 ? new THREE.BoxGeometry(0.08, h, depth) : new THREE.BoxGeometry(w, h, depth),
    mat,
  )
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  root.add(mesh)
}
