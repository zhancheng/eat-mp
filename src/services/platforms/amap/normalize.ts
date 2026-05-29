import type { AmapPoi, AmapPlaceResponse } from '@/types/amap'
import type { PaginatedResult, Restaurant } from '@/types/restaurant'

const PLATFORM = 'amap' as const
const PLATFORM_NAME = '高德美食'
const DEFAULT_COVER = '/static/images/default-shop.png'

function poiHasCover(poi: AmapPoi): boolean {
  return (poi.photos || []).some((p) => Boolean(p?.url?.trim()))
}

export function hasRestaurantCover(item: Restaurant): boolean {
  if (item.images?.some((url) => url?.trim())) return true
  const cover = item.cover?.trim()
  return Boolean(cover && cover !== DEFAULT_COVER)
}

function buildTags(poi: AmapPoi, typeParts: string[]): string[] {
  const tags = ['附近']
  if (typeParts[0]) tags.push(typeParts[0])
  if (poi.business_area) tags.push(poi.business_area)
  if (parseFloat(poi.biz_ext?.rating ?? '') >= 4.5) tags.push('高分')
  return tags.slice(0, 4)
}

export function normalizeAmapPoi(poi: AmapPoi, index = 0): Restaurant {
  const [lng, lat] = (poi.location || '').split(',').map(Number)
  const biz = poi.biz_ext || {}
  const rating = parseFloat(biz.rating || poi.rating || '0') || 0
  const cost = parseFloat(biz.cost || poi.cost || '0') || 0
  const distance = poi.distance != null ? Number(poi.distance) : undefined
  const typeParts = (poi.type || '').split(';').filter(Boolean)
  const category = typeParts[typeParts.length - 1] || '美食'
  const images = (poi.photos || []).map((p) => p?.url).filter(Boolean) as string[]
  const photoUrl = images[0] || ''

  return {
    id: `${PLATFORM}_${poi.id || index}`,
    shopId: poi.id || String(index),
    name: poi.name || '未知餐厅',
    platform: PLATFORM,
    platformName: PLATFORM_NAME,
    rating: rating > 0 ? +rating.toFixed(1) : 0,
    monthlySales: 0,
    avgPrice: cost > 0 ? Math.round(cost) : 0,
    latitude: Number.isFinite(lat) ? lat : 0,
    longitude: Number.isFinite(lng) ? lng : 0,
    distance,
    tag: poi.tag || '',
    tags: buildTags(poi, typeParts),
    cover: photoUrl || DEFAULT_COVER,
    images,
    deliveryTime: '到店消费',
    minOrder: 0,
    category,
    address:
      poi.address ||
      [poi.pname, poi.cityname, poi.adname, poi.address].filter(Boolean).join(''),
    telephone: poi.tel || '',
    reviewCount: 0,
    h5Url: poi.id
      ? `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(poi.name || '')}`
      : ''
  }
}

function parseAmapError(body: AmapPlaceResponse): string {
  const info = String(body.info || '')
  const infocode = String(body.infocode || '')

  if (infocode === '10009' || info === 'USERKEY_PLAT_NOMATCH') {
    return 'Key 平台不匹配：小程序直连请用「微信小程序」类型 Key，并勾选搜索 POI'
  }
  if (infocode === '10001' || info === 'INVALID_USER_KEY') {
    return 'Key 无效：请填高德控制台 32 位 Key，不能填微信 AppID（wx 开头）'
  }
  if (infocode === '10003') {
    return '今日调用量已超限'
  }
  return info || `高德错误(${infocode})` || '高德接口异常'
}

export function normalizeAmapResponse(
  body: AmapPlaceResponse | null | undefined,
  requestPageSize = 10
): PaginatedResult<Restaurant> {
  if (!body) {
    return { list: [], total: 0, page: 1, pageSize: requestPageSize, hasMore: false }
  }
  if (String(body.status) !== '1') {
    throw new Error(parseAmapError(body))
  }
  const pois = body.pois || body.data?.pois || []
  const list = Array.isArray(pois)
    ? pois.filter(poiHasCover).map((poi, i) => normalizeAmapPoi(poi, i))
    : []
  const page = Number(body.page) || 1
  const pageSize = Number(body.offset) || requestPageSize
  const total = Number(body.count) || 0
  const hasMore = total > 0 ? page * pageSize < total : list.length >= pageSize

  return { list, total, page, pageSize, hasMore }
}
