import type { Restaurant } from '@/types/restaurant'
import { getTypedApp } from '@/types/global'
import { generateRestaurants } from './mock-data'

export interface FetchNearbyParams {
  latitude: number
  longitude: number
  page?: number
  pageSize?: number
}

export async function fetchNearby({
  latitude,
  longitude,
  pageSize = 20
}: FetchNearbyParams): Promise<Restaurant[]> {
  const apiKey = getTypedApp().globalData.apiConfig.dianping?.apiKey
  if (apiKey) {
    // TODO: 大众点评 API
  }
  const list = generateRestaurants('dianping', '大众点评', pageSize, latitude, longitude)
  return list.map((item) => ({
    ...item,
    tags: [...(item.tags || []), '到店', '团购'].slice(0, 3),
    deliveryTime: item.deliveryTime || '到店消费'
  }))
}
