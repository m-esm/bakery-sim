import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PERSON_HEIGHT_M } from '../config/scale'
import type { CustomerState, StaffState } from '../sim/types'
import { MODEL_URLS, centerOnFloor, cloneModel, fitHeight, loadGltf } from './assets'

interface Actor {
  root: THREE.Group
  mixer: THREE.AnimationMixer
  idle: THREE.AnimationAction | null
  walk: THREE.AnimationAction | null
  mode: 'idle' | 'walk' | 'hidden'
  floorY: number
}

const CUSTOMER_MODELS = [
  MODEL_URLS.customerF1,
  MODEL_URLS.customerF2,
  MODEL_URLS.customerM1,
  MODEL_URLS.customerM2,
  MODEL_URLS.customerM3,
] as const

export class CharacterLayer {
  readonly group = new THREE.Group()
  private staff = new Map<string, Actor>()
  private customers = new Map<string, Actor>()
  private templates = new Map<string, GLTF>()
  private ready = false

  constructor() {
    this.group.name = 'characters'
  }

  async load(): Promise<void> {
    const urls = [MODEL_URLS.maya, MODEL_URLS.leo, ...CUSTOMER_MODELS]
    await Promise.all(
      urls.map(async (url) => {
        this.templates.set(url, await loadGltf(url))
      }),
    )

    this.staff.set('maya', this.makeActor(MODEL_URLS.maya, PERSON_HEIGHT_M))
    this.staff.set('leo', this.makeActor(MODEL_URLS.leo, PERSON_HEIGHT_M))
    for (const actor of this.staff.values()) {
      actor.root.visible = false
      this.group.add(actor.root)
    }
    this.ready = true
  }

  /** Debug helper: world AABB height/width of visible actors. */
  measureVisible(): { h: number; w: number; x: number; z: number }[] {
    const out: { h: number; w: number; x: number; z: number }[] = []
    for (const actor of [...this.staff.values(), ...this.customers.values()]) {
      if (!actor.root.visible) continue
      actor.root.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(actor.root)
      out.push({
        h: box.max.y - box.min.y,
        w: Math.max(box.max.x - box.min.x, box.max.z - box.min.z),
        x: actor.root.position.x,
        z: actor.root.position.z,
      })
    }
    return out
  }

  update(staff: StaffState[], customers: CustomerState[], dtSec: number): void {
    if (!this.ready) return

    for (const s of staff) {
      const actor = this.staff.get(s.id)
      if (!actor) continue
      if (!s.onShift) {
        actor.root.visible = false
        actor.mode = 'hidden'
        continue
      }
      actor.root.visible = true
      actor.root.position.x = s.x
      actor.root.position.z = s.z
      actor.root.position.y = actor.floorY
      const moving = s.path.length > 0
      if (moving) {
        const t = s.path[0]
        actor.root.rotation.y = Math.atan2(t.x - s.x, t.z - s.z)
      }
      this.setAnim(actor, moving ? 'walk' : 'idle')
      actor.mixer.update(dtSec)
    }

    const seen = new Set<string>()
    for (const c of customers) {
      seen.add(c.id)
      let actor = this.customers.get(c.id)
      if (!actor) {
        const url = CUSTOMER_MODELS[hash(c.id) % CUSTOMER_MODELS.length]
        actor = this.makeActor(url, PERSON_HEIGHT_M)
        this.customers.set(c.id, actor)
        this.group.add(actor.root)
      }
      actor.root.visible = true
      actor.root.position.x = c.x
      actor.root.position.z = c.z
      actor.root.position.y = actor.floorY
      const moving = c.path.length > 0
      if (moving) {
        const t = c.path[0]
        actor.root.rotation.y = Math.atan2(t.x - c.x, t.z - c.z)
      } else if (c.state === 'queuedOutside') {
        // Face the shop door while waiting
        actor.root.rotation.y = 0
      } else if (c.state === 'ordering') {
        actor.root.rotation.y = Math.PI
      }
      this.setAnim(actor, moving ? 'walk' : 'idle')
      actor.mixer.update(dtSec)
    }

    for (const [id, actor] of this.customers) {
      if (seen.has(id)) continue
      this.group.remove(actor.root)
      actor.mixer.stopAllAction()
      this.customers.delete(id)
    }
  }

  private makeActor(url: string, height: number): Actor {
    const gltf = this.templates.get(url)!
    const root = cloneModel(gltf)
    const mixer = new THREE.AnimationMixer(root)
    const clips = gltf.animations
    const idleClip = findClip(clips, ['idle', 'Idle', 'static'])
    const walkClip = findClip(clips, ['walk', 'Walk'])
    const idle = idleClip ? mixer.clipAction(idleClip) : null
    const walk = walkClip ? mixer.clipAction(walkClip) : null
    // Apply idle pose before measuring so T-pose arms do not inflate width/height
    if (idle) {
      idle.play()
      idle.setEffectiveWeight(1)
      mixer.update(1 / 30)
    }
    root.updateMatrixWorld(true)
    // Prefer posed world AABB after idle; fall back to geometry fit
    const posed = new THREE.Box3().setFromObject(root)
    const posedH = posed.max.y - posed.min.y
    if (posedH > 0.2 && posedH < 5) {
      const scale = height / posedH
      root.scale.multiplyScalar(scale)
      root.updateMatrixWorld(true)
      const after = new THREE.Box3().setFromObject(root)
      root.position.x -= (after.min.x + after.max.x) / 2
      root.position.z -= (after.min.z + after.max.z) / 2
      root.position.y -= after.min.y
    } else {
      centerOnFloor(root)
      fitHeight(root, height)
    }
    // Narrow XZ only so cartoon shoulders fit the 0.6 m queue gap (keep 1.7 m height)
    root.updateMatrixWorld(true)
    const widthBox = new THREE.Box3().setFromObject(root)
    const width = Math.max(widthBox.max.x - widthBox.min.x, widthBox.max.z - widthBox.min.z)
    const maxWidth = 0.5
    if (width > maxWidth) {
      const slim = maxWidth / width
      root.scale.x *= slim
      root.scale.z *= slim
      root.updateMatrixWorld(true)
      const seated = new THREE.Box3().setFromObject(root)
      root.position.x -= (seated.min.x + seated.max.x) / 2
      root.position.z -= (seated.min.z + seated.max.z) / 2
      root.position.y -= seated.min.y
    }
    root.updateMatrixWorld(true)
    const floorY = root.position.y
    return { root, mixer, idle, walk, mode: 'idle', floorY }
  }

  private setAnim(actor: Actor, mode: 'idle' | 'walk'): void {
    if (actor.mode === mode) return
    actor.mode = mode
    const fade = 0.15
    if (mode === 'walk' && actor.walk) {
      actor.walk.reset().setEffectiveWeight(1).fadeIn(fade).play()
      actor.idle?.fadeOut(fade)
    } else if (actor.idle) {
      actor.idle.reset().setEffectiveWeight(1).fadeIn(fade).play()
      actor.walk?.fadeOut(fade)
    }
  }
}

function findClip(clips: THREE.AnimationClip[], names: string[]): THREE.AnimationClip | null {
  for (const name of names) {
    const hit = clips.find((c) => c.name === name || c.name.toLowerCase() === name.toLowerCase())
    if (hit) return hit
  }
  return clips[0] ?? null
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
