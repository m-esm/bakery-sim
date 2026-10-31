import * as THREE from 'three'
import { SHOP_DEPTH, SHOP_WIDTH } from '../config/layout'
import { buildShop } from './shop'
import { CharacterLayer } from './characters'
import { PALETTE } from './materials'
import type { SimSnapshot } from '../sim/types'

export class BakeryRenderer {
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly characters: CharacterLayer
  private shop: THREE.Group
  private sun: THREE.DirectionalLight
  private hemi: THREE.HemisphereLight
  private clock = new THREE.Clock()
  private ovenGlow: THREE.Object3D | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(PALETTE.skyBottom)
    this.scene.fog = new THREE.Fog(PALETTE.skyBottom, 12, 28)

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50)
    // View from the street / entrance so the 4×3 m front counter is readable
    this.camera.position.set(5.4, 4.8, -3.6)
    this.camera.lookAt(SHOP_WIDTH / 2 - 0.1, 0.55, SHOP_DEPTH / 2)

    this.hemi = new THREE.HemisphereLight(PALETTE.skyTop, PALETTE.floorFront, 0.85)
    this.scene.add(this.hemi)

    this.sun = new THREE.DirectionalLight(0xfff0d6, 1.15)
    this.sun.position.set(4, 8, -2)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(1024, 1024)
    this.sun.shadow.camera.near = 0.5
    this.sun.shadow.camera.far = 20
    this.sun.shadow.camera.left = -6
    this.sun.shadow.camera.right = 6
    this.sun.shadow.camera.top = 6
    this.sun.shadow.camera.bottom = -6
    this.scene.add(this.sun)

    const fill = new THREE.DirectionalLight(0xa8dadc, 0.35)
    fill.position.set(-3, 3, 4)
    this.scene.add(fill)

    this.shop = buildShop()
    this.scene.add(this.shop)
    this.ovenGlow = this.shop.getObjectByName('ovenGlow') ?? null

    this.characters = new CharacterLayer()
    this.scene.add(this.characters.group)

    // Ground plane shadow receiver already in shop; add subtle grid helper offset
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(SHOP_WIDTH, 0.02, SHOP_DEPTH)),
      new THREE.LineBasicMaterial({ color: 0x7f5539 }),
    )
    edge.position.set(SHOP_WIDTH / 2, 0.04, SHOP_DEPTH / 2)
    this.scene.add(edge)
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  render(snap: SimSnapshot): void {
    const dt = this.clock.getDelta()
    this.characters.update(snap.staff, snap.customers, dt)

    // Day/night tint from time of day
    const hour = (snap.timeMin / 60) % 24
    const dayFactor = hour < 6 || hour > 19 ? 0.35 : hour < 7 || hour > 18 ? 0.65 : 1
    this.sun.intensity = 0.55 + 0.7 * dayFactor
    this.hemi.intensity = 0.45 + 0.45 * dayFactor
    const sky = new THREE.Color(PALETTE.skyBottom).lerp(new THREE.Color(PALETTE.skyTop), dayFactor * 0.5)
    if (hour >= 18) sky.lerp(new THREE.Color(0xff922b), 0.25)
    if (hour < 6) sky.set(0x1d3557)
    this.scene.background = sky
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.copy(sky)

    if (this.ovenGlow && this.ovenGlow instanceof THREE.Mesh) {
      const mat = this.ovenGlow.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = snap.equipment.ovenInUse ? 0.9 : 0.25
    }

    // Gentle camera sway from the entrance side
    const t = performance.now() * 0.00015
    this.camera.position.x = 5.4 + Math.sin(t) * 0.12
    this.camera.position.z = -3.6 + Math.cos(t * 0.8) * 0.08
    this.camera.lookAt(SHOP_WIDTH / 2 - 0.1, 0.55, SHOP_DEPTH / 2)

    this.renderer.render(this.scene, this.camera)
  }
}
