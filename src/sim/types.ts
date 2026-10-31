import type { IngredientId } from '../config/ingredients'
import type { ProductId, ProductionStage } from '../config/recipes'
import type { StationId } from '../config/layout'
import type { RoleId } from '../config/staff'

export type TimeSpeed = 0 | 1 | 4 | 16

export interface StockLot {
  ingredientId: IngredientId
  quantity: number
  /** Sim-day index when it spoils (exclusive end of day) */
  spoilsOnDay: number
}

export interface FinishedGood {
  productId: ProductId
  quantity: number
}

export interface SupplyOrder {
  id: string
  supplierId: string
  lines: { ingredientId: IngredientId; quantity: number; unitCost: number }[]
  deliveryFee: number
  placedAtMin: number
  arrivesAtMin: number
  status: 'pending' | 'delivered' | 'cancelled'
}

export interface BatchJob {
  id: string
  productId: ProductId
  stageIndex: number
  stage: ProductionStage
  remainingMin: number
  assignedStaffId: string | null
  station: StationId
  status: 'queued' | 'active' | 'waitingEquipment' | 'done'
}

export interface StaffState {
  id: string
  name: string
  role: RoleId
  x: number
  z: number
  targetX: number
  targetZ: number
  path: { x: number; z: number }[]
  onShift: boolean
  task: StaffTask | null
  wageAccrued: number
}

export type StaffTaskKind =
  | 'idle'
  | 'walk'
  | 'mix'
  | 'proof'
  | 'bake'
  | 'cool'
  | 'decorate'
  | 'stockDisplay'
  | 'serve'
  | 'clean'
  | 'receiveDelivery'
  | 'repair'

export interface StaffTask {
  kind: StaffTaskKind
  station: StationId
  batchId?: string
  customerId?: string
  progressMin?: number
  durationMin?: number
}

export interface CustomerState {
  id: string
  x: number
  z: number
  targetX: number
  targetZ: number
  path: { x: number; z: number }[]
  state: 'queuedOutside' | 'entering' | 'browsing' | 'ordering' | 'paying' | 'leaving' | 'done'
  want: ProductId
  queueIndex: number
  patienceMin: number
  payAmount: number
}

export interface EquipmentState {
  ovenWear: number
  ovenInUse: boolean
  ovenBatchId: string | null
  prepInUse: boolean
  dirtyDishes: number
  surfaceDirt: number
}

export interface DayLedger {
  revenue: number
  ingredientCost: number
  wages: number
  deliveryFees: number
  wasteCost: number
  overhead: number
  repairs: number
  customersServed: number
  customersLost: number
  itemsSold: number
}

export interface SimSnapshot {
  day: number
  timeMin: number
  speed: TimeSpeed
  phase: 'prep' | 'open' | 'closing' | 'closed'
  cash: number
  stock: StockLot[]
  display: FinishedGood[]
  orders: SupplyOrder[]
  batches: BatchJob[]
  staff: StaffState[]
  customers: CustomerState[]
  equipment: EquipmentState
  ledger: DayLedger
  log: string[]
  isDayComplete: boolean
}
