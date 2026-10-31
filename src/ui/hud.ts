import { INGREDIENTS, type IngredientId } from '../config/ingredients'
import { RECIPES, type ProductId } from '../config/recipes'
import { formatTime } from '../sim/clock'
import type { SimSnapshot, TimeSpeed } from '../sim/types'
import { totalOf } from '../sim/inventory'

export class Hud {
  readonly root: HTMLElement
  private onSpeed: (s: TimeSpeed) => void
  private onNextDay: () => void

  constructor(
    parent: HTMLElement,
    handlers: { onSpeed: (s: TimeSpeed) => void; onNextDay: () => void },
  ) {
    this.onSpeed = handlers.onSpeed
    this.onNextDay = handlers.onNextDay
    this.root = document.createElement('div')
    this.root.id = 'hud'
    this.root.innerHTML = `
      <header class="hud-top">
        <div class="brand">
          <span class="brand-mark">TB</span>
          <div>
            <div class="brand-name">Tiny Bakery</div>
            <div class="brand-sub">4×3 m · 12 m² shop floor</div>
          </div>
        </div>
        <div class="clock-block">
          <div class="clock" id="hud-clock">05:00</div>
          <div class="phase" id="hud-phase">prep</div>
        </div>
        <div class="speed-controls" id="speed-controls">
          <button type="button" data-speed="0" title="Pause">❚❚</button>
          <button type="button" data-speed="1" class="active" title="1×">1×</button>
          <button type="button" data-speed="4" title="4×">4×</button>
          <button type="button" data-speed="16" title="16×">16×</button>
        </div>
      </header>
      <aside class="hud-panel left">
        <h2>Business</h2>
        <div class="stat"><span>Cash</span><strong id="hud-cash">$0</strong></div>
        <div class="stat"><span>Revenue</span><strong id="hud-rev">$0</strong></div>
        <div class="stat"><span>Costs</span><strong id="hud-cost">$0</strong></div>
        <div class="stat"><span>Served</span><strong id="hud-served">0</strong></div>
        <div class="stat"><span>Lost</span><strong id="hud-lost">0</strong></div>
        <h2>Equipment</h2>
        <div class="stat"><span>Oven wear</span><strong id="hud-wear">0%</strong></div>
        <div class="stat"><span>Dirt</span><strong id="hud-dirt">0%</strong></div>
        <div class="stat"><span>Dishes</span><strong id="hud-dishes">0</strong></div>
        <button type="button" id="btn-nextday" class="hidden">Start next day</button>
      </aside>
      <aside class="hud-panel right">
        <h2>Stock</h2>
        <div id="hud-stock" class="list"></div>
        <h2>Display</h2>
        <div id="hud-display" class="list"></div>
        <h2>Orders</h2>
        <div id="hud-orders" class="list"></div>
      </aside>
      <footer class="hud-log">
        <h2>Activity</h2>
        <ul id="hud-log"></ul>
      </footer>
    `
    parent.appendChild(this.root)

    this.root.querySelector('#speed-controls')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button[data-speed]') as HTMLButtonElement | null
      if (!btn) return
      const speed = Number(btn.dataset.speed) as TimeSpeed
      this.onSpeed(speed)
      this.root.querySelectorAll('#speed-controls button').forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')
    })
    this.root.querySelector('#btn-nextday')!.addEventListener('click', () => this.onNextDay())
  }

  update(snap: SimSnapshot): void {
    setText(this.root, 'hud-clock', `Day ${snap.day} · ${formatTime(snap.timeMin)}`)
    setText(this.root, 'hud-phase', snap.phase)
    setText(this.root, 'hud-cash', `$${snap.cash.toFixed(2)}`)
    setText(this.root, 'hud-rev', `$${snap.ledger.revenue.toFixed(2)}`)
    const costs =
      snap.ledger.ingredientCost +
      snap.ledger.wages +
      snap.ledger.deliveryFees +
      snap.ledger.wasteCost +
      snap.ledger.overhead +
      snap.ledger.repairs
    setText(this.root, 'hud-cost', `$${costs.toFixed(2)}`)
    setText(this.root, 'hud-served', String(snap.ledger.customersServed))
    setText(this.root, 'hud-lost', String(snap.ledger.customersLost))
    setText(this.root, 'hud-wear', `${Math.round(snap.equipment.ovenWear * 100)}%`)
    setText(this.root, 'hud-dirt', `${Math.round(snap.equipment.surfaceDirt * 100)}%`)
    setText(this.root, 'hud-dishes', String(snap.equipment.dirtyDishes))

    const stockEl = this.root.querySelector('#hud-stock')!
    stockEl.innerHTML = (Object.keys(INGREDIENTS) as IngredientId[])
      .map((id) => {
        const q = totalOf(snap.stock, id)
        const unit = INGREDIENTS[id].unit
        return `<div class="row"><span>${INGREDIENTS[id].name}</span><span>${formatQty(q, unit)}</span></div>`
      })
      .join('')

    const displayEl = this.root.querySelector('#hud-display')!
    const products = Object.keys(RECIPES) as ProductId[]
    displayEl.innerHTML = products
      .map((id) => {
        const q = snap.display.find((g) => g.productId === id)?.quantity ?? 0
        return `<div class="row"><span>${RECIPES[id].name}</span><span>${q}</span></div>`
      })
      .join('')

    const ordersEl = this.root.querySelector('#hud-orders')!
    const pending = snap.orders.filter((o) => o.status === 'pending')
    ordersEl.innerHTML =
      pending.length === 0
        ? `<div class="muted">No pending deliveries</div>`
        : pending
            .map(
              (o) =>
                `<div class="row"><span>${o.supplierId}</span><span>${formatTime(o.arrivesAtMin)}</span></div>`,
            )
            .join('')

    const logEl = this.root.querySelector('#hud-log')!
    logEl.innerHTML = snap.log
      .slice(0, 12)
      .map((l) => `<li>${escapeHtml(l)}</li>`)
      .join('')

    const nextBtn = this.root.querySelector('#btn-nextday')!
    nextBtn.classList.toggle('hidden', !snap.isDayComplete)

    // Sync speed button active state
    this.root.querySelectorAll('#speed-controls button').forEach((b) => {
      const btn = b as HTMLButtonElement
      btn.classList.toggle('active', Number(btn.dataset.speed) === snap.speed)
    })
  }
}

function setText(root: HTMLElement, id: string, text: string): void {
  const el = root.querySelector(`#${id}`)
  if (el) el.textContent = text
}

function formatQty(q: number, unit: string): string {
  if (unit === 'pcs') return `${Math.round(q)} ${unit}`
  return `${q < 10 ? q.toFixed(1) : Math.round(q)} ${unit}`
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
