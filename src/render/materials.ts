import * as THREE from 'three'

/** Flat cartoon palette — warm bakery, not purple/cream AI defaults. */
export const PALETTE = {
  floorFront: 0xf2d6b3,
  floorBack: 0xe8c9a0,
  wall: 0xfff1d6,
  wallTrim: 0xd4a373,
  wood: 0xb08968,
  woodDark: 0x7f5539,
  metal: 0x8d99ae,
  oven: 0x4a4e69,
  ovenHot: 0xff6b35,
  glass: 0xa8dadc,
  pastry: 0xe09f3e,
  grass: 0x8ac926,
  sidewalk: 0xcbd5e1,
  skyTop: 0x89c2d9,
  skyBottom: 0xfefae0,
} as const

export function toon(color: number, opts?: { roughness?: number }): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts?.roughness ?? 0.85,
    metalness: 0.05,
    flatShading: true,
  })
}

export function toonEmissive(color: number, emissive: number, intensity = 0.35): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.7,
    flatShading: true,
  })
}
