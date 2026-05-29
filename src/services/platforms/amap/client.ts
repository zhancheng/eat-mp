import type { AmapApiConfig } from '@/types/api'
import type { PaginatedResult, Restaurant } from '@/types/restaurant'
import { getTypedApp } from '@/types/global'
import { normalizeAmapResponse } from './normalize'

const AMAP_PLACE_AROUND = 'https://restapi.amap.com/v3/place/around'

function getConfig(): AmapApiConfig {
  return getTypedApp().globalData.apiConfig.amap || {}
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

export interface FetchAmapNearbyParams {
  latitude: number
  longitude: number
  page?: number
  pageSize?: number
  keyword?: string
}

/**
 * 小程序直连高德 Web 服务 API（周边搜索）
 * 须在微信后台配置 request 合法域名：https://restapi.amap.com
 */
export function fetchAmapNearby({
  latitude,
  longitude,
  page,
  pageSize,
  keyword
}: FetchAmapNearbyParams): Promise<PaginatedResult<Restaurant>> {
  const cfg = getConfig()
  const apiKey = (cfg.apiKey || '').trim()
  const size = Math.min(pageSize || 10, 25)

  if (!apiKey) {
    return Promise.reject(new Error('请配置 amap.apiKey（高德控制台 Key）'))
  }
  if (apiKey.startsWith('wx')) {
    return Promise.reject(new Error('apiKey 不能填微信 AppID，请填高德 32 位 Key'))
  }

  const query = buildQuery({
    key: apiKey,
    location: `${longitude},${latitude}`,
    keywords: keyword || cfg.keywords || '美食',
    types: cfg.types || '050000',
    radius: cfg.radius || 3000,
    sortrule: cfg.sortrule || 'distance',
    offset: size,
    page: page || 1,
    extensions: cfg.extensions || 'all',
    output: 'JSON'
  })

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${AMAP_PLACE_AROUND}?${query}`,
      method: 'GET',
      timeout: cfg.timeout || 15000,
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`高德 HTTP ${res.statusCode}`))
          return
        }
        try {
          resolve(normalizeAmapResponse(res.data as Parameters<typeof normalizeAmapResponse>[0], size))
        } catch (e) {
          reject(e)
        }
      },
      fail: (err) =>
        reject(
          new Error(
            err.errMsg ||
              '请求失败：请勾选不校验合法域名（开发），或配置 restapi.amap.com 合法域名'
          )
        )
    })
  })
}
