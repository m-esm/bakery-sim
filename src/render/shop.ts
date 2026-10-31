import * as THREE from 'three'
import { FURNITURE, SHOP_DEPTH, SHOP_WIDTH, STATIONS } from '../config/layout'
import { PALETTE, toon, toonEmissive } from './materials'

export function buildShop(): THREE.Group {
  const root = new THREE.Group()
  root.name = 'shop'

  // Outside ground
  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 8),
    toon(PALETTE.grass),
  )
  outside.rotation.x = -Math.PI / 2
  outside.position.set(SHOP_WIDTH / 2, -0.01, SHOP_DEPTH / 2 - 1)
  outside.receiveShadow = true
  root.add(outside)

  const sidewalk = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.04, 2.2),
    toon(PALETTE.sidewalk),
  )
  sidewalk.position.set(STATIONS.door.x, 0.02, -0.7)
  sidewalk.receiveShadow = true
  root.add(sidewalk)

  // Floor — two tones for front/back
  const floorFront = new THREE.Mesh(
    new THREE.BoxGeometry(SHOP_WIDTH, 0.06, 1.3),
    toon(PALETTE.floorFront),
  )
  floorFront.position.set(SHOP_WIDTH / 2, 0.03, 0.65)
  floorFront.receiveShadow = true
  root.add(floorFront)

  const floorBack = new THREE.Mesh(
    new THREE.BoxGeometry(SHOP_WIDTH, 0.06, 1.7),
    toon(PALETTE.floorBack),
  )
  floorBack.position.set(SHOP_WIDTH / 2, 0.03, 2.15)
  floorBack.receiveShadow = true
  root.add(floorBack)

  // Dollhouse cutaway walls — short so staff and stations stay visible
  const wallMat = toon(PALETTE.wall)
  const trimMat = toon(PALETTE.wallTrim)
  const wallH = 1.15

  // Back wall (full width, short)
  addWall(root, SHOP_WIDTH, wallH, SHOP_WIDTH / 2, wallH / 2, SHOP_DEPTH, wallMat)
  // Left / right
  addWall(root, 0.08, wallH, 0, wallH / 2, SHOP_DEPTH / 2, wallMat, SHOP_DEPTH)
  addWall(root, 0.08, wallH, SHOP_WIDTH, wallH / 2, SHOP_DEPTH / 2, wallMat, SHOP_DEPTH)

  // Front wall with door gap
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

  // Low divider between front and back
  const div = FURNITURE.backWallDivider
  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(div.w, 0.9, div.d),
    toon(PALETTE.wood),
  )
  divider.position.set(div.x + div.w / 2, 0.45, div.z + div.d / 2)
  divider.castShadow = true
  root.add(divider)
  // Pass-through gap near center-right
  const gap = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.92, 0.1),
    toon(PALETTE.floorBack),
  )
  gap.position.set(2.5, 0.45, div.z + 0.04)
  root.add(gap)

  // Furniture
  addBox(root, FURNITURE.displayCase, toon(PALETTE.woodDark), 'displayCase')
  // Glass top on display
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(FURNITURE.displayCase.w * 0.92, 0.35, FURNITURE.displayCase.d * 0.85),
    new THREE.MeshStandardMaterial({
      color: PALETTE.glass,
      transparent: true,
      opacity: 0.45,
      roughness: 0.2,
      flatShading: true,
    }),
  )
  glass.position.set(
    FURNITURE.displayCase.x + FURNITURE.displayCase.w / 2,
    FURNITURE.displayCase.h + 0.1,
    FURNITURE.displayCase.z + FURNITURE.displayCase.d / 2,
  )
  root.add(glass)

  // Pastries in display (simple spheres/boxes)
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 4),
      toonEmissive(PALETTE.pastry, 0xffb703, 0.15),
    )
    p.position.set(
      FURNITURE.displayCase.x + 0.25 + i * 0.3,
      FURNITURE.displayCase.h + 0.05,
      FURNITURE.displayCase.z + FURNITURE.displayCase.d / 2,
    )
    root.add(p)
  }

  addBox(root, FURNITURE.registerDesk, toon(PALETTE.wood), 'register')
  const register = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.2, 0.25),
    toon(0x22223b),
  )
  register.position.set(
    FURNITURE.registerDesk.x + FURNITURE.registerDesk.w / 2,
    FURNITURE.registerDesk.h + 0.1,
    FURNITURE.registerDesk.z + FURNITURE.registerDesk.d / 2,
  )
  root.add(register)

  addBox(root, FURNITURE.prepTable, toon(PALETTE.wood), 'prep')
  addBox(root, FURNITURE.oven, toon(PALETTE.oven), 'oven')
  const ovenDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.45, 0.05),
    toonEmissive(0x22223b, PALETTE.ovenHot, 0.4),
  )
  ovenDoor.position.set(
    FURNITURE.oven.x + FURNITURE.oven.w / 2,
    0.7,
    FURNITURE.oven.z + 0.02,
  )
  ovenDoor.name = 'ovenGlow'
  root.add(ovenDoor)

  addBox(root, FURNITURE.sink, toon(PALETTE.metal), 'sink')
  const basin = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.12, 0.3),
    toon(0x4cc9f0),
  )
  basin.position.set(
    FURNITURE.sink.x + FURNITURE.sink.w / 2,
    FURNITURE.sink.h,
    FURNITURE.sink.z + FURNITURE.sink.d / 2,
  )
  root.add(basin)

  addBox(root, FURNITURE.storageShelf, toon(PALETTE.woodDark), 'storage')
  for (let y = 0; y < 3; y++) {
    const sack = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.25, 0.3),
      toon(0xf4e1c1),
    )
    sack.position.set(
      FURNITURE.storageShelf.x + 0.35,
      0.35 + y * 0.4,
      FURNITURE.storageShelf.z + 0.28,
    )
    root.add(sack)
  }

  // Awning over the entrance (outside, street side)
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.05, 0.5),
    toon(0xe63946),
  )
  awning.position.set(2.0, 1.35, -0.32)
  awning.rotation.x = -0.15
  root.add(awning)
  const poleL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), toon(PALETTE.woodDark))
  poleL.position.set(1.35, 1.1, -0.5)
  root.add(poleL)
  const poleR = poleL.clone()
  poleR.position.x = 2.65
  root.add(poleR)

  // Sign on front wall
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.28, 0.06),
    toon(0x1d3557),
  )
  sign.position.set(2.0, 1.55, 0.05)
  root.add(sign)

  return root
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
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w === 0.08 ? depth : w, h, w === 0.08 ? depth : depth), mat)
  // For side walls we pass depth as length along Z
  if (w === 0.08) {
    mesh.geometry.dispose()
    mesh.geometry = new THREE.BoxGeometry(0.08, h, depth)
  }
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  root.add(mesh)
}

function addBox(
  root: THREE.Group,
  f: { x: number; z: number; w: number; d: number; h: number },
  mat: THREE.Material,
  name: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(f.w, f.h, f.d), mat)
  mesh.position.set(f.x + f.w / 2, f.h / 2, f.z + f.d / 2)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.name = name
  root.add(mesh)
  return mesh
}
