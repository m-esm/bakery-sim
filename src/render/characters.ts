import * as THREE from 'three'
import { STAFF } from '../config/staff'
import { toon } from './materials'
import type { CustomerState, StaffState } from '../sim/types'

export class CharacterLayer {
  readonly group = new THREE.Group()
  private staffMeshes = new Map<string, THREE.Group>()
  private customerMeshes = new Map<string, THREE.Group>()
  private bobPhase = 0

  constructor() {
    this.group.name = 'characters'
    for (const def of STAFF) {
      const mesh = makePerson(def.color, def.role === 'baker' ? 0xfff1d6 : 0xffffff)
      mesh.visible = false
      this.staffMeshes.set(def.id, mesh)
      this.group.add(mesh)
    }
  }

  update(staff: StaffState[], customers: CustomerState[], dtSec: number): void {
    this.bobPhase += dtSec * 6
    for (const s of staff) {
      const mesh = this.staffMeshes.get(s.id)
      if (!mesh) continue
      mesh.visible = s.onShift
      if (!s.onShift) continue
      const moving = s.path.length > 0
      mesh.position.set(s.x, moving ? 0.02 * Math.sin(this.bobPhase + s.x) : 0, s.z)
      if (moving) {
        const t = s.path[0]
        mesh.rotation.y = Math.atan2(t.x - s.x, t.z - s.z)
      }
    }

    const seen = new Set<string>()
    for (const c of customers) {
      seen.add(c.id)
      let mesh = this.customerMeshes.get(c.id)
      if (!mesh) {
        const hue = (hash(c.id) % 360) / 360
        const color = new THREE.Color().setHSL(hue, 0.55, 0.55).getHex()
        mesh = makePerson(color, 0xffe5d9)
        this.customerMeshes.set(c.id, mesh)
        this.group.add(mesh)
      }
      mesh.visible = true
      const moving = c.path.length > 0
      mesh.position.set(c.x, moving ? 0.02 * Math.sin(this.bobPhase + c.x * 2) : 0, c.z)
      if (moving) {
        const t = c.path[0]
        mesh.rotation.y = Math.atan2(t.x - c.x, t.z - c.z)
      }
    }
    for (const [id, mesh] of this.customerMeshes) {
      if (!seen.has(id)) {
        this.group.remove(mesh)
        this.customerMeshes.delete(id)
      }
    }
  }
}

function makePerson(bodyColor: number, skinColor: number): THREE.Group {
  const g = new THREE.Group()
  // Chunky low-poly body so staff/customers read clearly in the tiny shop
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.18), toon(0x1d3557))
  legs.position.y = 0.16
  legs.castShadow = true
  g.add(legs)

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.22), toon(bodyColor))
  body.position.y = 0.52
  body.castShadow = true
  g.add(body)

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), toon(skinColor))
  head.position.y = 0.84
  head.castShadow = true
  g.add(head)

  const hat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.28), toon(0xf8f9fa))
  hat.position.y = 1.02
  g.add(hat)

  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.36), toon(0xf8f9fa))
  brim.position.y = 0.94
  g.add(brim)

  return g
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
