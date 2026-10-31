import { INGREDIENTS, type IngredientId } from '../config/ingredients'
import { RECIPES, type ProductId } from '../config/recipes'
import { STAFF } from '../config/staff'
import { STATIONS } from '../config/layout'
import {
  BASE_ARRIVAL_INTERVAL_MIN,
  DAILY_OVERHEAD,
  DEMAND_BY_HOUR,
  DIRT_CLEAN_THRESHOLD,
  MAX_CUSTOMERS_INSIDE,
  MAX_QUEUE_OUTSIDE,
  OVEN_REPAIR_COST,
  OVEN_WEAR_PER_BAKE,
  PRODUCT_DEMAND_WEIGHTS,
  STARTING_CASH,
} from '../config/economy'
import { RESTOCK_TARGETS, SUPPLIERS } from '../config/suppliers'
import {
  addDelivery,
  addToDisplay,
  canConsume,
  consume,
  createStartingStock,
  displayOf,
  spoilDay,
  takeFromDisplay,
  totalOf,
} from './inventory'
import { advanceAlongPath, findPath } from './pathfinding'
import { DAY_END_MIN, DAY_START_MIN, formatTime, isOpen, onShift, phaseAt } from './clock'
import type {
  BatchJob,
  CustomerState,
  DayLedger,
  EquipmentState,
  FinishedGood,
  SimSnapshot,
  StaffState,
  StaffTask,
  StockLot,
  SupplyOrder,
  TimeSpeed,
} from './types'

let idSeq = 1
function nextId(prefix: string): string {
  return `${prefix}-${idSeq++}`
}

function emptyLedger(): DayLedger {
  return {
    revenue: 0,
    ingredientCost: 0,
    wages: 0,
    deliveryFees: 0,
    wasteCost: 0,
    overhead: 0,
    repairs: 0,
    customersServed: 0,
    customersLost: 0,
    itemsSold: 0,
  }
}

function pickWant(rng: () => number): ProductId {
  const entries = Object.entries(PRODUCT_DEMAND_WEIGHTS) as [ProductId, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [id, w] of entries) {
    r -= w
    if (r <= 0) return id
  }
  return 'croissant'
}

export class BakerySim {
  day = 1
  timeMin = DAY_START_MIN
  speed: TimeSpeed = 1
  cash = STARTING_CASH
  stock: StockLot[] = createStartingStock(1)
  display: FinishedGood[] = []
  orders: SupplyOrder[] = []
  batches: BatchJob[] = []
  staff: StaffState[] = []
  customers: CustomerState[] = []
  equipment: EquipmentState = {
    ovenWear: 0.1,
    ovenInUse: false,
    ovenBatchId: null,
    prepInUse: false,
    dirtyDishes: 0,
    surfaceDirt: 0.05,
  }
  ledger: DayLedger = emptyLedger()
  log: string[] = []
  isDayComplete = false

  private arrivalCooldown = 2
  private morningOrdered = false
  private closingCleanupDone = false
  private rng: () => number

  constructor(rng: () => number = Math.random) {
    this.rng = rng
    this.staff = STAFF.map((s) => {
      const home = STATIONS[s.homeStation]
      return {
        id: s.id,
        name: s.name,
        role: s.role,
        x: home.x,
        z: home.z,
        targetX: home.x,
        targetZ: home.z,
        path: [],
        onShift: false,
        task: null,
        wageAccrued: 0,
      }
    })
    this.pushLog('Day 1 begins. Prep starts at 05:00.')
  }

  setSpeed(speed: TimeSpeed): void {
    this.speed = speed
  }

  pushLog(msg: string): void {
    this.log.unshift(`${formatTime(this.timeMin)}  ${msg}`)
    if (this.log.length > 40) this.log.length = 40
  }

  snapshot(): SimSnapshot {
    return {
      day: this.day,
      timeMin: this.timeMin,
      speed: this.speed,
      phase: phaseAt(this.timeMin),
      cash: this.cash,
      stock: this.stock.map((l) => ({ ...l })),
      display: this.display.map((g) => ({ ...g })),
      orders: this.orders.map((o) => ({ ...o, lines: o.lines.map((l) => ({ ...l })) })),
      batches: this.batches.map((b) => ({ ...b })),
      staff: this.staff.map((s) => ({
        ...s,
        path: s.path.map((p) => ({ ...p })),
        task: s.task ? { ...s.task } : null,
      })),
      customers: this.customers.map((c) => ({
        ...c,
        path: c.path.map((p) => ({ ...p })),
      })),
      equipment: { ...this.equipment },
      ledger: { ...this.ledger },
      log: [...this.log],
      isDayComplete: this.isDayComplete,
    }
  }

  /** Advance simulation by dtMin sim-minutes. No-op while paused (speed 0). */
  tick(dtMin: number): void {
    if (this.isDayComplete || dtMin <= 0 || this.speed === 0) return

    // Sub-step for stability
    let left = dtMin
    while (left > 0 && !this.isDayComplete) {
      const step = Math.min(0.5, left)
      this.step(step)
      left -= step
    }
  }

  private step(dtMin: number): void {
    const prev = this.timeMin
    this.timeMin += dtMin
    if (this.timeMin >= DAY_END_MIN) {
      this.timeMin = DAY_END_MIN
      this.finishDay()
      return
    }

    this.updateShifts(dtMin)
    if (!this.morningOrdered && this.timeMin >= DAY_START_MIN + 1) {
      this.placeMorningOrders()
      this.morningOrdered = true
    }
    this.processDeliveries()
    this.planProduction()
    this.assignStaffTasks()
    this.updateStaffMovement(dtMin)
    this.progressBatches(dtMin)
    this.updateCustomers(dtMin, prev)
    this.progressCleaning(dtMin)
    this.maybeRepairOven()
  }

  private updateShifts(dtMin: number): void {
    for (const member of this.staff) {
      const def = STAFF.find((s) => s.id === member.id)!
      const was = member.onShift
      member.onShift = onShift(this.timeMin, def.shiftStartMin, def.shiftEndMin)
      if (member.onShift) {
        const hours = dtMin / 60
        const pay = def.wagePerHour * hours
        member.wageAccrued += pay
        this.ledger.wages += pay
        this.cash -= pay
      }
      if (!was && member.onShift) {
        this.pushLog(`${member.name} (${member.role}) starts shift.`)
      }
      if (was && !member.onShift) {
        member.task = null
        this.pushLog(`${member.name} ends shift.`)
      }
    }
  }

  placeMorningOrders(): void {
    for (const supplier of SUPPLIERS) {
      const lines: SupplyOrder['lines'] = []
      for (const id of supplier.catalog) {
        const target = RESTOCK_TARGETS[id] ?? 0
        const have = totalOf(this.stock, id)
        const need = Math.max(0, target - have)
        if (need > 0.01) {
          lines.push({
            ingredientId: id,
            quantity: Math.round(need * 100) / 100,
            unitCost: INGREDIENTS[id].unitCost,
          })
        }
      }
      if (lines.length === 0) continue
      const goods = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0)
      const fee =
        supplier.feeWaiverAbove > 0 && goods >= supplier.feeWaiverAbove
          ? 0
          : supplier.deliveryFee
      const order: SupplyOrder = {
        id: nextId('ord'),
        supplierId: supplier.id,
        lines,
        deliveryFee: fee,
        placedAtMin: this.timeMin,
        arrivesAtMin: this.timeMin + supplier.leadTimeMinutes,
        status: 'pending',
      }
      const cost = goods + fee
      this.cash -= cost
      this.ledger.ingredientCost += goods
      this.ledger.deliveryFees += fee
      this.orders.push(order)
      this.pushLog(`Ordered from ${supplier.name} ($${cost.toFixed(2)}).`)
    }
  }

  private processDeliveries(): void {
    for (const order of this.orders) {
      if (order.status !== 'pending') continue
      if (this.timeMin < order.arrivesAtMin) continue
      order.status = 'delivered'
      for (const line of order.lines) {
        this.stock = addDelivery(this.stock, line.ingredientId, line.quantity, this.day)
      }
      // Assign a staffer to receive if possible
      const receiver =
        this.staff.find((s) => s.onShift && s.role === 'baker' && (!s.task || s.task.kind === 'idle')) ??
        this.staff.find((s) => s.onShift)
      if (receiver) {
        this.sendStaff(receiver, 'storage', {
          kind: 'receiveDelivery',
          station: 'storage',
          durationMin: 3,
          progressMin: 0,
        })
      }
      const supplier = SUPPLIERS.find((s) => s.id === order.supplierId)
      this.pushLog(`Delivery arrived from ${supplier?.name ?? order.supplierId}.`)
      this.equipment.surfaceDirt = Math.min(1, this.equipment.surfaceDirt + 0.05)
    }
  }

  private planProduction(): void {
    if (phaseAt(this.timeMin) === 'closing' || phaseAt(this.timeMin) === 'closed') return
    // Keep display stocked: queue batches for low products
    const activeOrQueued = this.batches.filter((b) => b.status !== 'done')
    if (activeOrQueued.length >= 3) return

    const priorities: ProductId[] = ['croissant', 'baguette', 'muffin', 'cookie']
    for (const productId of priorities) {
      if (activeOrQueued.some((b) => b.productId === productId)) continue
      const onDisplay = displayOf(this.display, productId)
      const recipe = RECIPES[productId]
      const threshold = Math.ceil(recipe.batchSize * 0.5)
      if (onDisplay >= threshold && this.timeMin >= 7 * 60) continue
      // During prep, bake even if display empty
      if (!canConsume(this.stock, recipe.ingredients)) continue
      if (this.equipment.ovenWear >= 0.98 && recipe.stages.some((s) => s.stage === 'bake')) {
        continue
      }
      this.stock = consume(this.stock, recipe.ingredients)
      const first = recipe.stages[0]
      const job: BatchJob = {
        id: nextId('batch'),
        productId,
        stageIndex: 0,
        stage: first.stage,
        remainingMin: first.minutes,
        assignedStaffId: null,
        station: first.station,
        status: 'queued',
      }
      this.batches.push(job)
      this.pushLog(`Started batch: ${recipe.name} ×${recipe.batchSize}.`)
      this.equipment.dirtyDishes += 1
      this.equipment.surfaceDirt = Math.min(1, this.equipment.surfaceDirt + recipe.dirtPerBatch * 0.3)
      break
    }
  }

  private sendStaff(staff: StaffState, stationId: keyof typeof STATIONS, task: StaffTask): void {
    const st = STATIONS[stationId]
    staff.task = task
    staff.targetX = st.x
    staff.targetZ = st.z
    staff.path = findPath({ x: staff.x, z: staff.z }, { x: st.x, z: st.z })
  }

  private assignStaffTasks(): void {
    for (const member of this.staff) {
      if (!member.onShift) continue
      if (member.task && member.task.kind !== 'idle') continue

      if (member.role === 'cashier') {
        const waiting = this.customers.find((c) => c.state === 'ordering')
        if (waiting) {
          this.sendStaff(member, 'register', {
            kind: 'serve',
            station: 'register',
            customerId: waiting.id,
            durationMin: 1.5,
            progressMin: 0,
          })
          continue
        }
        this.sendStaff(member, 'idleFront', { kind: 'idle', station: 'idleFront' })
        continue
      }

      // Baker
      if (phaseAt(this.timeMin) === 'closing' || this.equipment.surfaceDirt > 0.7 || this.equipment.dirtyDishes > 3) {
        if (this.equipment.dirtyDishes > 0 || this.equipment.surfaceDirt > DIRT_CLEAN_THRESHOLD) {
          this.sendStaff(member, 'sink', {
            kind: 'clean',
            station: 'sink',
            durationMin: 4,
            progressMin: 0,
          })
          continue
        }
      }

      const job = this.batches.find(
        (b) =>
          b.status === 'queued' ||
          (b.status === 'active' && !b.assignedStaffId && needsStaff(b.stage)),
      )
      if (job && needsStaff(job.stage)) {
        if (job.stage === 'bake' && this.equipment.ovenInUse && this.equipment.ovenBatchId !== job.id) {
          // wait
        } else {
          job.assignedStaffId = member.id
          job.status = job.stage === 'bake' && !this.equipment.ovenInUse ? 'waitingEquipment' : 'queued'
          this.sendStaff(member, job.station, {
            kind: job.stage as StaffTask['kind'],
            station: job.station,
            batchId: job.id,
            durationMin: job.remainingMin,
            progressMin: 0,
          })
          continue
        }
      }

      // Prefer finishing display stocking before routine cleaning
      const stockJob = this.batches.find(
        (b) => b.stage === 'display' && (b.status === 'queued' || !b.assignedStaffId),
      )
      if (stockJob) {
        stockJob.assignedStaffId = member.id
        stockJob.status = 'queued'
        this.sendStaff(member, 'display', {
          kind: 'stockDisplay',
          station: 'display',
          batchId: stockJob.id,
          durationMin: stockJob.remainingMin,
          progressMin: 0,
        })
        continue
      }

      if (this.equipment.dirtyDishes > 0 && phaseAt(this.timeMin) !== 'prep') {
        this.sendStaff(member, 'sink', {
          kind: 'clean',
          station: 'sink',
          durationMin: 3,
          progressMin: 0,
        })
        continue
      }

      this.sendStaff(member, 'idleBack', { kind: 'idle', station: 'idleBack' })
    }
  }

  private updateStaffMovement(dtMin: number): void {
    const walkSpeed = 0.9 // m per sim-minute (~1.5 m/s at 1x where 1s=1min → too fast; tuned for readability)
    for (const member of this.staff) {
      if (!member.onShift) continue
      if (member.path.length > 0) {
        const moved = advanceAlongPath(member.x, member.z, member.path, walkSpeed, dtMin)
        member.x = moved.x
        member.z = moved.z
        member.path = moved.path
      }
    }
  }

  private progressBatches(dtMin: number): void {
    for (const job of this.batches) {
      if (job.status === 'done') continue
      const recipe = RECIPES[job.productId]
      const staffed = !needsStaff(job.stage) || job.assignedStaffId

      // Equipment gates for oven
      if (job.stage === 'bake') {
        if (!this.equipment.ovenInUse) {
          this.equipment.ovenInUse = true
          this.equipment.ovenBatchId = job.id
          job.status = 'active'
        } else if (this.equipment.ovenBatchId !== job.id) {
          job.status = 'waitingEquipment'
          continue
        } else {
          job.status = 'active'
        }
      }

      // Staff must be near station for staffed stages
      if (needsStaff(job.stage)) {
        const worker = this.staff.find((s) => s.id === job.assignedStaffId)
        if (!worker || !worker.onShift) {
          job.assignedStaffId = null
          job.status = 'queued'
          continue
        }
        if (worker.path.length > 0) continue
        const st = STATIONS[job.station]
        if (Math.hypot(worker.x - st.x, worker.z - st.z) > 0.55) {
          worker.path = findPath({ x: worker.x, z: worker.z }, { x: st.x, z: st.z })
          continue
        }
        job.status = 'active'
        if (worker.task) worker.task.progressMin = (worker.task.progressMin ?? 0) + dtMin
      } else {
        // Unattended stages (proof/cool) run once started
        job.status = 'active'
        job.assignedStaffId = null
      }

      if (job.status !== 'active') continue
      if (!staffed && needsStaff(job.stage)) continue

      job.remainingMin -= dtMin
      if (job.remainingMin > 0) continue

      // Stage complete
      if (job.stage === 'bake') {
        this.equipment.ovenInUse = false
        this.equipment.ovenBatchId = null
        this.equipment.ovenWear = Math.min(1, this.equipment.ovenWear + OVEN_WEAR_PER_BAKE)
        this.equipment.surfaceDirt = Math.min(1, this.equipment.surfaceDirt + 0.05)
      }

      const worker = this.staff.find((s) => s.id === job.assignedStaffId)
      if (worker) {
        worker.task = null
        job.assignedStaffId = null
      }

      if (job.stageIndex + 1 >= recipe.stages.length) {
        job.status = 'done'
        this.display = addToDisplay(this.display, job.productId, recipe.batchSize)
        this.equipment.surfaceDirt = Math.min(1, this.equipment.surfaceDirt + recipe.dirtPerBatch * 0.5)
        this.pushLog(`${recipe.name} ready on display (+${recipe.batchSize}).`)
      } else {
        job.stageIndex += 1
        const next = recipe.stages[job.stageIndex]
        job.stage = next.stage
        job.remainingMin = next.minutes
        job.station = next.station
        job.status = 'queued'
      }
    }
    this.batches = this.batches.filter((b) => b.status !== 'done' || this.timeMin - DAY_START_MIN < 0)
    this.batches = this.batches.filter((b) => b.status !== 'done')
  }

  private updateCustomers(dtMin: number, _prevTime: number): void {
    // Arrivals
    if (isOpen(this.timeMin)) {
      const hour = Math.floor(this.timeMin / 60) % 24
      const demand = DEMAND_BY_HOUR[hour] ?? 0
      this.arrivalCooldown -= dtMin * Math.max(0.15, demand)
      const outside = this.customers.filter((c) => c.state === 'queuedOutside').length
      const inside = this.customers.filter(
        (c) => c.state !== 'queuedOutside' && c.state !== 'done' && c.state !== 'leaving',
      ).length
      if (this.arrivalCooldown <= 0 && demand > 0) {
        this.arrivalCooldown = BASE_ARRIVAL_INTERVAL_MIN * (0.6 + this.rng() * 0.8) / Math.max(0.3, demand)
        if (outside < MAX_QUEUE_OUTSIDE) {
          this.spawnCustomer(outside)
        } else {
          this.ledger.customersLost += 1
        }
      }
      // Admit from queue
      while (
        inside + this.customers.filter((c) => c.state === 'entering').length < MAX_CUSTOMERS_INSIDE
      ) {
        const next = this.customers
          .filter((c) => c.state === 'queuedOutside')
          .sort((a, b) => a.queueIndex - b.queueIndex)[0]
        if (!next) break
        next.state = 'entering'
        const door = STATIONS.door
        const counter = STATIONS.counter
        next.path = findPath({ x: next.x, z: next.z }, { x: door.x, z: door.z })
        next.path = next.path.concat(findPath({ x: door.x, z: door.z }, { x: counter.x, z: counter.z }))
        next.targetX = counter.x
        next.targetZ = counter.z
        // recompute inside count break condition via loop
        break
      }
    }

    // Update each customer
    const walkSpeed = 0.75
    for (const c of this.customers) {
      if (c.state === 'done') continue
      c.patienceMin -= dtMin * 0.15

      if (c.path.length > 0) {
        const moved = advanceAlongPath(c.x, c.z, c.path, walkSpeed, dtMin)
        c.x = moved.x
        c.z = moved.z
        c.path = moved.path
      }

      if (c.state === 'entering' && c.path.length === 0) {
        c.state = 'ordering'
      }

      if (c.state === 'ordering') {
        const cashier = this.staff.find(
          (s) => s.onShift && s.task?.kind === 'serve' && s.task.customerId === c.id,
        )
        if (cashier && cashier.path.length === 0) {
          const progress = (cashier.task!.progressMin ?? 0) + dtMin
          cashier.task!.progressMin = progress
          if (progress >= (cashier.task!.durationMin ?? 1.5)) {
            this.trySell(c)
            cashier.task = null
          }
        } else if (c.patienceMin <= 0) {
          this.leaveAngry(c)
        }
      }

      if (c.state === 'leaving' && c.path.length === 0) {
        c.state = 'done'
      }
    }

    // Compact outside queue positions
    const queued = this.customers
      .filter((c) => c.state === 'queuedOutside')
      .sort((a, b) => a.queueIndex - b.queueIndex)
    queued.forEach((c, i) => {
      c.queueIndex = i
      const q = STATIONS.queueOutside
      const tx = q.x
      const tz = q.z - i * 0.45
      if (Math.hypot(c.x - tx, c.z - tz) > 0.1 && c.path.length === 0) {
        c.targetX = tx
        c.targetZ = tz
        c.path = [{ x: tx, z: tz }]
      }
    })

    this.customers = this.customers.filter((c) => c.state !== 'done')
  }

  private spawnCustomer(queueIndex: number): void {
    const want = pickWant(this.rng)
    const q = STATIONS.queueOutside
    const c: CustomerState = {
      id: nextId('cust'),
      x: q.x + (this.rng() - 0.5) * 0.2,
      z: q.z - queueIndex * 0.45,
      targetX: q.x,
      targetZ: q.z - queueIndex * 0.45,
      path: [],
      state: 'queuedOutside',
      want,
      queueIndex,
      patienceMin: 12 + this.rng() * 10,
      payAmount: 0,
    }
    this.customers.push(c)
  }

  private trySell(c: CustomerState): void {
    const recipe = RECIPES[c.want]
    const { display, taken } = takeFromDisplay(this.display, c.want, 1)
    this.display = display
    if (taken < 1) {
      // Try any available product
      const available = (Object.keys(RECIPES) as ProductId[]).find((id) => displayOf(this.display, id) > 0)
      if (!available) {
        this.pushLog(`Customer left — sold out of ${recipe.name}.`)
        this.leaveAngry(c)
        return
      }
      const alt = takeFromDisplay(this.display, available, 1)
      this.display = alt.display
      const price = RECIPES[available].price
      this.cash += price
      this.ledger.revenue += price
      this.ledger.itemsSold += 1
      this.ledger.customersServed += 1
      c.payAmount = price
      this.pushLog(`Sold ${RECIPES[available].name} for $${price.toFixed(2)}.`)
    } else {
      const price = recipe.price
      this.cash += price
      this.ledger.revenue += price
      this.ledger.itemsSold += 1
      this.ledger.customersServed += 1
      c.payAmount = price
      this.pushLog(`Sold ${recipe.name} for $${price.toFixed(2)}.`)
    }
    c.state = 'leaving'
    const door = STATIONS.door
    const out = STATIONS.queueOutside
    c.path = findPath({ x: c.x, z: c.z }, { x: door.x, z: door.z })
    c.path.push({ x: out.x, z: out.z - 1.2 })
    c.targetX = out.x
    c.targetZ = out.z - 1.2
  }

  private leaveAngry(c: CustomerState): void {
    c.state = 'leaving'
    this.ledger.customersLost += 1
    const door = STATIONS.door
    const out = STATIONS.queueOutside
    c.path = findPath({ x: c.x, z: c.z }, { x: door.x, z: door.z })
    c.path.push({ x: out.x + 0.5, z: out.z - 1.0 })
  }

  private progressCleaning(dtMin: number): void {
    for (const member of this.staff) {
      if (!member.onShift || member.task?.kind !== 'clean') continue
      if (member.path.length > 0) continue
      member.task.progressMin = (member.task.progressMin ?? 0) + dtMin
      if ((member.task.progressMin ?? 0) >= (member.task.durationMin ?? 3)) {
        this.equipment.dirtyDishes = Math.max(0, this.equipment.dirtyDishes - 2)
        this.equipment.surfaceDirt = Math.max(0, this.equipment.surfaceDirt - 0.35)
        member.task = null
        this.pushLog(`${member.name} cleaned dishes and surfaces.`)
      }
    }

    // Passive dirt during open hours
    if (isOpen(this.timeMin)) {
      this.equipment.surfaceDirt = Math.min(1, this.equipment.surfaceDirt + dtMin * 0.002)
    }

    if (phaseAt(this.timeMin) === 'closing' && !this.closingCleanupDone) {
      if (this.equipment.dirtyDishes <= 0 && this.equipment.surfaceDirt <= DIRT_CLEAN_THRESHOLD) {
        this.closingCleanupDone = true
        this.pushLog('Shop cleaned. Ready to close.')
      }
    }
  }

  private maybeRepairOven(): void {
    if (this.equipment.ovenWear < 0.95) return
    const baker = this.staff.find((s) => s.onShift && s.role === 'baker' && (!s.task || s.task.kind === 'idle'))
    if (!baker) return
    if (this.cash < OVEN_REPAIR_COST) return
    this.cash -= OVEN_REPAIR_COST
    this.ledger.repairs += OVEN_REPAIR_COST
    this.equipment.ovenWear = 0.05
    this.sendStaff(baker, 'oven', {
      kind: 'repair',
      station: 'oven',
      durationMin: 8,
      progressMin: 0,
    })
    this.pushLog(`Oven repaired (−$${OVEN_REPAIR_COST}).`)
  }

  private finishDay(): void {
    if (this.isDayComplete) return
    // Spoilage
    const { stock, wasted } = spoilDay(this.stock, this.day)
    this.stock = stock
    for (const w of wasted) {
      this.ledger.wasteCost += w.cost
      this.pushLog(`Spoiled ${w.quantity.toFixed(1)} ${w.ingredientId} (−$${w.cost.toFixed(2)}).`)
    }
    this.ledger.overhead += DAILY_OVERHEAD
    this.cash -= DAILY_OVERHEAD
    this.isDayComplete = true
    const profit =
      this.ledger.revenue -
      this.ledger.ingredientCost -
      this.ledger.wages -
      this.ledger.deliveryFees -
      this.ledger.wasteCost -
      this.ledger.overhead -
      this.ledger.repairs
    this.pushLog(
      `Day ${this.day} closed. Profit $${profit.toFixed(2)}. Served ${this.ledger.customersServed}.`,
    )
  }

  /** Start next calendar day (for continuous play). */
  nextDay(): void {
    if (!this.isDayComplete) return
    this.day += 1
    this.timeMin = DAY_START_MIN
    this.isDayComplete = false
    this.morningOrdered = false
    this.closingCleanupDone = false
    this.arrivalCooldown = 2
    this.customers = []
    this.batches = []
    this.orders = this.orders.filter((o) => o.status === 'pending')
    this.ledger = emptyLedger()
    for (const s of this.staff) {
      s.task = null
      s.wageAccrued = 0
      s.path = []
      const def = STAFF.find((d) => d.id === s.id)!
      const home = STATIONS[def.homeStation]
      s.x = home.x
      s.z = home.z
    }
    this.pushLog(`Day ${this.day} begins.`)
  }

  stockSummary(): Record<IngredientId, number> {
    const out = {} as Record<IngredientId, number>
    for (const id of Object.keys(INGREDIENTS) as IngredientId[]) {
      out[id] = totalOf(this.stock, id)
    }
    return out
  }
}

function needsStaff(stage: BatchJob['stage']): boolean {
  return stage === 'mix' || stage === 'decorate' || stage === 'display' || stage === 'bake'
}
