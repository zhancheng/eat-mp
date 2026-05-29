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
  const apiKey = getTypedApp().globalData.apiConfig.taobao?.apiKey
  if (apiKey) {
    // TODO: 淘宝闪购 API
  }
  return generateRestaurants('taobao', '淘宝闪购', pageSize, latitude, longitude)
}
