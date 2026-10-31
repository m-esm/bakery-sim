import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { CustomerState, StaffState } from '../sim/types'
import { MODEL_URLS, centerOnFloor, cloneModel, fitHeight, loadGltf } from './assets'

interface Actor {
  root: THREE.Group
  mixer: THREE.AnimationMixer
  idle: THREE.AnimationAction | null
  walk: THREE.AnimationAction | null
  mode: 'idle' | 'walk' | 'hidden'
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
    const urls = [
      MODEL_URLS.maya,
      MODEL_URLS.leo,
      ...CUSTOMER_MODELS,
    ]
    await Promise.all(
      urls.map(async (url) => {
        this.templates.set(url, await loadGltf(url))
      }),
    )

    this.staff.set('maya', this.makeActor(MODEL_URLS.maya, 1.15))
    this.staff.set('leo', this.makeActor(MODEL_URLS.leo, 1.2))
    for (const actor of this.staff.values()) {
      actor.root.visible = false
      this.group.add(actor.root)
    }
    this.ready = true
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
        actor = this.makeActor(url, 1.1)
        this.customers.set(c.id, actor)
        this.group.add(actor.root)
      }
      actor.root.visible = true
      actor.root.position.x = c.x
      actor.root.position.z = c.z
      const moving = c.path.length > 0
      if (moving) {
        const t = c.path[0]
        actor.root.rotation.y = Math.atan2(t.x - c.x, t.z - c.z)
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
    centerOnFloor(root)
    fitHeight(root, height)
    const mixer = new THREE.AnimationMixer(root)
    const clips = gltf.animations
    const idleClip = findClip(clips, ['idle', 'Idle', 'static'])
    const walkClip = findClip(clips, ['walk', 'Walk', 'run', 'sprint'])
    const idle = idleClip ? mixer.clipAction(idleClip) : null
    const walk = walkClip ? mixer.clipAction(walkClip) : null
    idle?.play()
    return { root, mixer, idle, walk, mode: 'idle' }
  }

  private setAnim(actor: Actor, mode: 'idle' | 'walk'): void {
    if (actor.mode === mode) return
    actor.mode = mode
    const fade = 0.2
    if (mode === 'walk') {
      actor.walk?.reset().fadeIn(fade).play()
      actor.idle?.fadeOut(fade)
    } else {
      actor.idle?.reset().fadeIn(fade).play()
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
