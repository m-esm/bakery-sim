import * as THREE from 'three'
import { FURNITURE, SHOP_DEPTH, SHOP_WIDTH, STATIONS } from '../config/layout'
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

  // Outside ground
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), toon(PALETTE.grass))
  outside.rotation.x = -Math.PI / 2
  outside.position.set(SHOP_WIDTH / 2, -0.01, SHOP_DEPTH / 2 - 1)
  outside.receiveShadow = true
  root.add(outside)

  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 2.4), toon(PALETTE.sidewalk))
  sidewalk.position.set(STATIONS.door.x, 0.02, -0.75)
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

  // Dollhouse walls
  const wallMat = toon(PALETTE.wall)
  const trimMat = toon(PALETTE.wallTrim)
  const wallH = 1.15
  addWall(root, SHOP_WIDTH, wallH, SHOP_WIDTH / 2, wallH / 2, SHOP_DEPTH, wallMat)
  addWall(root, 0.08, wallH, 0, wallH / 2, SHOP_DEPTH / 2, wallMat, SHOP_DEPTH)
  addWall(root, 0.08, wallH, SHOP_WIDTH, wallH / 2, SHOP_DEPTH / 2, wallMat, SHOP_DEPTH)

  const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(1.4, wallH, 0.08), wallMat)
  frontLeft.position.set(0.7, wallH / 2, 0)
  frontLeft.castShadow = true
  root.add(frontLeft)
  const frontRight = new THREE.Mesh(new THREE.BoxGeometry(1.4, wallH, 0.08), wallMat)
  frontRight.position.set(3.3, wallH / 2, 0)
  frontRight.castShadow = true
  root.add(frontRight)
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.08), trimMat)
  lintel.position.set(2.0, wallH + 0.06, 0)
  root.add(lintel)

  // Low divider
  const div = FURNITURE.backWallDivider
  const divider = new THREE.Mesh(new THREE.BoxGeometry(div.w, 0.85, div.d), toon(PALETTE.wood))
  divider.position.set(div.x + div.w / 2, 0.42, div.z + div.d / 2)
  divider.castShadow = true
  root.add(divider)

  // Awning + sign
  const awning = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.5), toon(0xe63946))
  awning.position.set(2.0, 1.35, -0.32)
  awning.rotation.x = -0.15
  root.add(awning)
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.06), toon(0x1d3557))
  sign.position.set(2.0, 1.55, 0.05)
  root.add(sign)

  // Load Kenney GLBs
  const [
    displayGltf,
    registerGltf,
    deskGltf,
    tableGltf,
    stoveGltf,
    sinkGltf,
    fridgeGltf,
    blenderGltf,
    bookcaseGltf,
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
    loadGltf(MODEL_URLS.bookcase),
    loadGltf(MODEL_URLS.shelfBoxes),
    loadGltf(MODEL_URLS.bar),
    loadGltf(MODEL_URLS.cabinet),
  ])

  // Display case (front)
  const display = placeModel(cloneModel(displayGltf), {
    x: 1.2,
    z: 0.95,
    rotY: Math.PI,
    height: 1.05,
  })
  display.name = 'displayCase'
  root.add(display)

  // Counter bar under / beside display
  const bar = placeModel(cloneModel(barGltf), { x: 2.15, z: 0.95, rotY: Math.PI, height: 0.9 })
  root.add(bar)

  // Register desk + cash register
  const desk = placeModel(cloneModel(deskGltf), { x: 3.15, z: 0.95, rotY: Math.PI, height: 0.85 })
  root.add(desk)
  const register = placeModel(cloneModel(registerGltf), {
    x: 3.15,
    z: 0.85,
    rotY: Math.PI,
    height: 0.35,
    y: 0.85,
  })
  root.add(register)

  // Prep table + mixer
  const prep = placeModel(cloneModel(tableGltf), { x: 0.7, z: 2.0, rotY: 0, height: 0.85 })
  root.add(prep)
  const mixer = placeModel(cloneModel(blenderGltf), { x: 0.55, z: 1.85, height: 0.35, y: 0.85 })
  root.add(mixer)

  // Oven (stove)
  const oven = placeModel(cloneModel(stoveGltf), { x: 2.0, z: 2.55, rotY: Math.PI, height: 1.15 })
  oven.name = 'oven'
  root.add(oven)

  // Sink
  const sink = placeModel(cloneModel(sinkGltf), { x: 3.35, z: 2.15, rotY: -Math.PI / 2, height: 0.95 })
  root.add(sink)

  // Storage / fridge / shelves
  const fridge = placeModel(cloneModel(fridgeGltf), { x: 0.45, z: 2.65, rotY: Math.PI / 2, height: 1.35 })
  root.add(fridge)
  const shelves = placeModel(cloneModel(bookcaseGltf), { x: 0.2, z: 2.15, rotY: Math.PI / 2, height: 1.4 })
  root.add(shelves)
  const stockShelf = placeModel(cloneModel(shelfGltf), { x: 3.55, z: 1.55, rotY: -Math.PI / 2, height: 1.5 })
  root.add(stockShelf)
  const cabinet = placeModel(cloneModel(cabinetGltf), { x: 1.35, z: 2.7, rotY: Math.PI, height: 0.9 })
  root.add(cabinet)

  // Anchor for baked goods on the display
  const displayAnchor = new THREE.Group()
  displayAnchor.name = 'displayGoods'
  displayAnchor.position.set(1.2, 1.05, 0.95)
  root.add(displayAnchor)

  // Soft oven glow marker (emissive plane on stove front)
  const ovenGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 0.28),
    new THREE.MeshStandardMaterial({
      color: 0x222222,
      emissive: PALETTE.ovenHot,
      emissiveIntensity: 0.3,
      flatShading: true,
    }),
  )
  ovenGlow.position.set(2.0, 0.55, 2.28)
  ovenGlow.name = 'ovenGlow'
  root.add(ovenGlow)

  return { root, displayAnchor, ovenGlow }
}

function placeModel(
  model: THREE.Group,
  opts: { x: number; z: number; rotY?: number; height: number; y?: number },
): THREE.Group {
  centerOnFloor(model)
  fitHeight(model, opts.height)
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
