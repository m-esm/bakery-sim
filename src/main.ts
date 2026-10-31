import './style.css'
import { BakerySim } from './sim/bakery'
import { realDtToSimMin } from './sim/clock'
import { BakeryRenderer } from './render/scene'
import { Hud } from './ui/hud'
import { queueSlotPosition } from './config/layout'
import type { ProductId } from './config/recipes'
import type { TimeSpeed } from './sim/types'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `<canvas id="view"></canvas><div id="boot">Loading Tiny Bakery models…</div>`

const canvas = app.querySelector<HTMLCanvasElement>('#view')!
const boot = app.querySelector<HTMLDivElement>('#boot')!
const sim = new BakerySim()
const renderer = new BakeryRenderer(canvas)
const hud = new Hud(app, {
  onSpeed: (s: TimeSpeed) => sim.setSpeed(s),
  onNextDay: () => {
    sim.nextDay()
    sim.setSpeed(1)
  },
})

function fit(): void {
  const w = app.clientWidth
  const h = app.clientHeight
  canvas.width = w * Math.min(devicePixelRatio, 2)
  canvas.height = h * Math.min(devicePixelRatio, 2)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  renderer.resize(w, h)
}

fit()
window.addEventListener('resize', fit)

let last = performance.now()
let loaded = false

renderer
  .init()
  .then(() => {
    loaded = true
    boot.remove()
    // Test / capture helpers (not used by gameplay)
    ;(window as unknown as { __tinyBakery: unknown }).__tinyBakery = {
      sim,
      setSpeed: (s: TimeSpeed) => sim.setSpeed(s),
      advanceMin: (m: number) => {
        const prev = sim.speed
        if (sim.speed === 0) sim.setSpeed(1)
        sim.tick(m)
        sim.setSpeed(prev)
      },
      snapshot: () => sim.snapshot(),
      /** Capture helper: put customers on the sidewalk queue. */
      fillOutsideQueue: (n = 4) => {
        const wants: ProductId[] = ['croissant', 'muffin', 'cookie', 'baguette']
        // Drop existing outside waiters so the demo line is clean
        sim.customers = sim.customers.filter((c) => c.state !== 'queuedOutside')
        for (let i = 0; i < n; i++) {
          const slot = queueSlotPosition(i)
          sim.customers.push({
            id: `demo-q-${Date.now()}-${i}`,
            x: slot.x,
            z: slot.z,
            targetX: slot.x,
            targetZ: slot.z,
            path: [],
            state: 'queuedOutside',
            want: wants[i % wants.length],
            queueIndex: i,
            patienceMin: 40,
            payAmount: 0,
          })
        }
      },
      characterHeights: () => renderer.characters.measureVisible(),
    }
  })
  .catch((err) => {
    boot.textContent = `Model load failed: ${String(err)}`
    console.error(err)
  })

function frame(now: number): void {
  const realDt = Math.min(0.05, (now - last) / 1000)
  last = now
  if (loaded) {
    const simMin = realDtToSimMin(realDt, sim.speed)
    if (simMin > 0) sim.tick(simMin)
  }
  const snap = sim.snapshot()
  hud.update(snap)
  renderer.render(snap)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

window.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    e.preventDefault()
    sim.setSpeed(sim.speed === 0 ? 1 : 0)
  } else if (e.key === '1') sim.setSpeed(1)
  else if (e.key === '2') sim.setSpeed(4)
  else if (e.key === '3') sim.setSpeed(16)
})
