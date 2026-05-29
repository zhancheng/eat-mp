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
  const apiKey = getTypedApp().globalData.apiConfig.eleme?.apiKey
  if (apiKey) {
    // TODO: 饿了么开放平台 API
  }
  return generateRestaurants('eleme', '饿了么', pageSize, latitude, longitude)
}
