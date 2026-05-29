import type { PaginatedResult, Restaurant } from '@/types/restaurant'
import { getTypedApp } from '@/types/global'
import { generateRestaurants } from './mock-data'
import { fetchAmapNearby, type FetchAmapNearbyParams } from './amap/client'

function getConfig() {
  return getTypedApp().globalData.apiConfig.amap || {}
}

export function isAmapConfigured(): boolean {
  const cfg = getConfig()
  return cfg.enabled !== false && !!(cfg.apiKey || '').trim()
}

export async function fetchNearby(
  options: FetchAmapNearbyParams
): Promise<Restaurant[]> {
  const cfg = getConfig()
  if (cfg.enabled === false) return []

  if (isAmapConfigured()) {
    try {
      const { list } = await fetchAmapNearby(options)
      if (list.length) return list
      if (!cfg.fallbackMock) return []
    } catch (e) {
      const err = e as Error
      console.warn('[amap]', err.message || e)
      if (!cfg.fallbackMock) throw e
    }
  }

  return generateRestaurants(
    'amap',
    '高德美食',
    options.pageSize || 20,
    options.latitude,
    options.longitude
  )
}

/** 带分页元数据的请求（首页列表） */
export async function fetchNearbyPage(
  options: FetchAmapNearbyParams
): Promise<PaginatedResult<Restaurant>> {
  const cfg = getConfig()
  if (cfg.enabled === false) {
    const list = generateRestaurants(
      'amap',
      '高德美食',
      options.pageSize || 10,
      options.latitude,
      options.longitude
    )
    return { list, total: list.length, page: 1, pageSize: list.length, hasMore: false }
  }
  if (!isAmapConfigured()) {
    return { list: [], total: 0, page: 1, pageSize: options.pageSize || 10, hasMore: false }
  }
  return fetchAmapNearby(options)
}
