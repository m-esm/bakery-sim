import type { IngredientId } from './ingredients'

export type ProductId = 'croissant' | 'baguette' | 'cookie' | 'muffin'

export type ProductionStage =
  | 'mix'
  | 'proof'
  | 'bake'
  | 'cool'
  | 'decorate'
  | 'display'

export interface StageTiming {
  stage: ProductionStage
  /** Minutes of sim time */
  minutes: number
  station: 'prep' | 'oven' | 'sink' | 'display' | 'counter'
}

export interface Recipe {
  id: ProductId
  name: string
  /** Sale price per finished item */
  price: number
  /** Batch yield */
  batchSize: number
  ingredients: Partial<Record<IngredientId, number>>
  stages: StageTiming[]
  /** Dirt created on prep/oven when batch finishes a dirty stage */
  dirtPerBatch: number
}

export const RECIPES: Record<ProductId, Recipe> = {
  croissant: {
    id: 'croissant',
    name: 'Croissant',
    price: 3.5,
    batchSize: 6,
    ingredients: { flour: 0.5, butter: 0.25, yeast: 0.02, milk: 0.2, sugar: 0.05, salt: 0.01 },
    stages: [
      { stage: 'mix', minutes: 10, station: 'prep' },
      { stage: 'proof', minutes: 16, station: 'prep' },
      { stage: 'bake', minutes: 14, station: 'oven' },
      { stage: 'cool', minutes: 6, station: 'prep' },
      { stage: 'display', minutes: 2, station: 'display' },
    ],
    dirtPerBatch: 0.25,
  },
  baguette: {
    id: 'baguette',
    name: 'Baguette',
    price: 2.8,
    batchSize: 4,
    ingredients: { flour: 0.8, yeast: 0.015, salt: 0.02, milk: 0.45 },
    stages: [
      { stage: 'mix', minutes: 8, station: 'prep' },
      { stage: 'proof', minutes: 14, station: 'prep' },
      { stage: 'bake', minutes: 14, station: 'oven' },
      { stage: 'cool', minutes: 5, station: 'prep' },
      { stage: 'display', minutes: 2, station: 'display' },
    ],
    dirtPerBatch: 0.2,
  },

  cookie: {
    id: 'cookie',
    name: 'Cookie',
    price: 1.8,
    batchSize: 12,
    ingredients: { flour: 0.3, sugar: 0.2, butter: 0.15, eggs: 2, chocolate: 0.1 },
    stages: [
      { stage: 'mix', minutes: 7, station: 'prep' },
      { stage: 'bake', minutes: 10, station: 'oven' },
      { stage: 'cool', minutes: 5, station: 'prep' },
      { stage: 'decorate', minutes: 4, station: 'prep' },
      { stage: 'display', minutes: 2, station: 'display' },
    ],
    dirtPerBatch: 0.15,
  },
  muffin: {
    id: 'muffin',
    name: 'Muffin',
    price: 2.5,
    batchSize: 8,
    ingredients: { flour: 0.35, sugar: 0.15, eggs: 2, milk: 0.25, butter: 0.1 },
    stages: [
      { stage: 'mix', minutes: 8, station: 'prep' },
      { stage: 'bake', minutes: 12, station: 'oven' },
      { stage: 'cool', minutes: 5, station: 'prep' },
      { stage: 'display', minutes: 2, station: 'display' },
    ],
    dirtPerBatch: 0.18,
  },
}
