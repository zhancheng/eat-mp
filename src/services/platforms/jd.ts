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
  const apiKey = getTypedApp().globalData.apiConfig.jd?.apiKey
  if (apiKey) {
    // TODO: 京东外卖 API
  }
  return generateRestaurants('jd', '京东外卖', pageSize, latitude, longitude)
}
