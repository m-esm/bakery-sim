import * as THREE from 'three'
import { SHOP_WIDTH } from '../config/layout'
import { buildShop } from './shop'
import { CharacterLayer } from './characters'
import { DisplayGoods } from './displayGoods'
import type { SimSnapshot } from '../sim/types'

export class BakeryRenderer {
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly characters = new CharacterLayer()
  readonly displayGoods = new DisplayGoods()
  private sun: THREE.DirectionalLight
  private warmFill: THREE.PointLight
  private hemi: THREE.HemisphereLight
  private clock = new THREE.Clock()
  private ovenGlow: THREE.Object3D | null = null
  private displayAnchor: THREE.Group | null = null
  private lastDisplayKey = ''
  private ready = false

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.12

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xffe8cc)
    this.scene.fog = new THREE.Fog(0xffe8cc, 14, 30)

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)
    // Frame the whole 4×3 m shop plus the sidewalk queue (a bit closer than overview)
    this.camera.position.set(5.4, 4.5, -4.0)
    this.camera.lookAt(SHOP_WIDTH / 2, 0.55, 0.15)

    // Warm cartoon lighting
    this.hemi = new THREE.HemisphereLight(0xffe0b2, 0xc4a574, 0.7)
    this.scene.add(this.hemi)

    this.sun = new THREE.DirectionalLight(0xfff0d6, 1.05)
    this.sun.position.set(3.5, 7.5, -2.5)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(1024, 1024)
    this.sun.shadow.camera.near = 0.5
    this.sun.shadow.camera.far = 20
    this.sun.shadow.camera.left = -6
    this.sun.shadow.camera.right = 6
    this.sun.shadow.camera.top = 6
    this.sun.shadow.camera.bottom = -6
    this.scene.add(this.sun)

    this.warmFill = new THREE.PointLight(0xffb347, 0.55, 10, 2)
    this.warmFill.position.set(2.0, 1.8, 1.2)
    this.scene.add(this.warmFill)

    const coolRim = new THREE.DirectionalLight(0xa8dadc, 0.25)
    coolRim.position.set(-3, 3, 4)
    this.scene.add(coolRim)

    this.scene.add(this.characters.group)
  }

  async init(): Promise<void> {
    const shop = await buildShop()
    this.scene.add(shop.root)
    this.displayAnchor = shop.displayAnchor
    this.ovenGlow = shop.ovenGlow
    await Promise.all([this.characters.load(), this.displayGoods.load()])
    this.ready = true
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  render(snap: SimSnapshot): void {
    const dt = Math.min(0.05, this.clock.getDelta())
    if (this.ready) {
      this.characters.update(snap.staff, snap.customers, dt)

      const key = snap.display.map((g) => `${g.productId}:${g.quantity}`).join('|')
      if (key !== this.lastDisplayKey && this.displayAnchor) {
        this.lastDisplayKey = key
        this.displayGoods.sync(this.displayAnchor, snap.display)
      }
    }

    const hour = (snap.timeMin / 60) % 24
    const dayFactor = hour < 6 || hour > 19 ? 0.4 : hour < 7 || hour > 18 ? 0.7 : 1
    this.sun.intensity = 0.55 + 0.6 * dayFactor
    this.hemi.intensity = 0.45 + 0.35 * dayFactor
    this.warmFill.intensity = 0.35 + 0.35 * dayFactor

    const sky = new THREE.Color(0xffe8cc).lerp(new THREE.Color(0x89c2d9), dayFactor * 0.35)
    if (hour >= 18) sky.lerp(new THREE.Color(0xff922b), 0.2)
    if (hour < 6) sky.set(0x2b2d42)
    this.scene.background = sky
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.copy(sky)

    if (this.ovenGlow && this.ovenGlow instanceof THREE.Mesh) {
      const mat = this.ovenGlow.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = snap.equipment.ovenInUse ? 1.1 : 0.25
    }

    const t = performance.now() * 0.00012
    this.camera.position.x = 5.4 + Math.sin(t) * 0.05
    this.camera.position.z = -4.0 + Math.cos(t * 0.7) * 0.04
    this.camera.lookAt(SHOP_WIDTH / 2, 0.55, 0.15)

    this.renderer.render(this.scene, this.camera)
  }
}
