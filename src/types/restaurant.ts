import type { PlatformId } from './platform'

export interface Restaurant {
  id: string
  shopId?: string
  name: string
  platform: PlatformId
  platformName: string
  rating: number
  monthlySales: number
  avgPrice: number
  latitude: number
  longitude: number
  distance?: number
  distanceText?: string
  tag?: string
  tags?: string[]
  cover: string
  images?: string[]
  deliveryTime: string
  minOrder: number
  category?: string
  address?: string
  telephone?: string
  reviewCount?: number
  h5Url?: string
  deeplink?: string
  favoritedAt?: number
}

export interface WheelItem extends Restaurant {
  label: string
}

export type SortBy = 'distance' | 'rating' | 'sales'

export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
