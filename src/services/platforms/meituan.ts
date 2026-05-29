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
  const apiKey = getTypedApp().globalData.apiConfig.meituan?.apiKey
  if (apiKey) {
    // TODO: 美团开放平台 API
  }
  return generateRestaurants('meituan', '美团', pageSize, latitude, longitude)
}
