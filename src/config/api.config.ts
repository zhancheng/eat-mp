import type { ApiConfig } from '@/types/api'

/**
 * 高德周边搜索 — 小程序直连
 *
 * 1. 高德控制台 → 添加 Key → 服务平台选「微信小程序」
 * 2. 勾选 Web 服务 API：搜索 POI（周边搜索）
 * 3. 填入下方 apiKey
 * 4. 微信公众平台 → 开发 → 开发管理 → 服务器域名 → request 合法域名：
 *    https://restapi.amap.com
 */
const apiConfig: ApiConfig = {
  amap: {
    enabled: true,
    /** 高德 Key（32 位），勿填微信 AppID */
    apiKey: '241cdfdfb37053d65da70016bfb94b6b',
    radius: 3000,
    types: '050000',
    keywords: '美食',
    sortrule: 'distance',
    extensions: 'all',
    fallbackMock: false,
    timeout: 15000
  }
}

export default apiConfig
