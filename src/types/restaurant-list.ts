import type { Restaurant } from './restaurant'

export type RestaurantListType = 'favorite' | 'dislike'

export interface SavedRestaurant extends Restaurant {
  savedAt: number
}

export interface RestaurantListResult {
  list: SavedRestaurant[]
  total: number
}
