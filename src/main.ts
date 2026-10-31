import './style.css'
import { BakerySim } from './sim/bakery'
import { realDtToSimMin } from './sim/clock'
import { BakeryRenderer } from './render/scene'
import { Hud } from './ui/hud'
import type { TimeSpeed } from './sim/types'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `<canvas id="view"></canvas>`

const canvas = app.querySelector<HTMLCanvasElement>('#view')!
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
function frame(now: number): void {
  const realDt = Math.min(0.05, (now - last) / 1000)
  last = now
  const simMin = realDtToSimMin(realDt, sim.speed)
  if (simMin > 0) sim.tick(simMin)
  const snap = sim.snapshot()
  hud.update(snap)
  renderer.render(snap)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') {
    e.preventDefault()
    sim.setSpeed(sim.speed === 0 ? 1 : 0)
  } else if (e.key === '1') sim.setSpeed(1)
  else if (e.key === '2') sim.setSpeed(4)
  else if (e.key === '3') sim.setSpeed(16)
})
