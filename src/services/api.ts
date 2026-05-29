import type { AppLocation } from '@/types/location'
import type { PaginatedResult, Restaurant, SortBy } from '@/types/restaurant'
import { getDistance } from '@/utils/util'
import * as amap from './platforms/amap'

const DEFAULT_PAGE_SIZE = 10

export interface FetchRecommendationsParams {
  latitude: number
  longitude: number
  page?: number
  pageSize?: number
  keyword?: string
}

/** 首页：高德附近美食推荐（单页，转盘等用） */
export async function fetchAmapRecommendations(
  params: FetchRecommendationsParams
): Promise<Restaurant[]> {
  const { list } = await fetchAmapRecommendationsPage(params)
  return list
}

/** 首页分页加载 */
export async function fetchAmapRecommendationsPage(
  params: FetchRecommendationsParams
): Promise<PaginatedResult<Restaurant>> {
  const {
    latitude,
    longitude,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    keyword = ''
  } = params
  const result = await amap.fetchNearbyPage({
    latitude,
    longitude,
    page,
    pageSize,
    keyword
  })
  return {
    list: result.list.map((item) => enrichItem(item, latitude, longitude)),
    hasMore: result.hasMore,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize
  }
}

function enrichItem(item: Restaurant, lat: number, lng: number): Restaurant {
  const calculated = getDistance(lat, lng, item.latitude, item.longitude)
  const distance =
    item.distance != null && item.distance >= 0 ? item.distance : calculated
  return { ...item, distance }
}

export function sortRestaurants(list: Restaurant[], sortBy: SortBy = 'distance'): Restaurant[] {
  const sorted = [...list]
  switch (sortBy) {
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating)
    case 'sales':
      return sorted.sort((a, b) => b.monthlySales - a.monthlySales)
    default:
      return sorted.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
  }
}

/** 转盘：从高德推荐中抽取 */
export async function fetchWheelCandidates(
  location: AppLocation,
  count = 8,
  keyword = ''
): Promise<Restaurant[]> {
  const list = await fetchAmapRecommendations({
    ...location,
    pageSize: count * 2,
    keyword
  })
  return sortRestaurants(list, 'rating').slice(0, count)
}
