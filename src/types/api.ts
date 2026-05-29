export interface AmapApiConfig {
  enabled?: boolean
  apiKey?: string
  radius?: number
  types?: string
  keywords?: string
  sortrule?: string
  extensions?: string
  fallbackMock?: boolean
  timeout?: number
}

export interface PlatformApiKeyConfig {
  apiKey?: string
}

export interface ApiConfig {
  amap: AmapApiConfig
  meituan?: PlatformApiKeyConfig
  eleme?: PlatformApiKeyConfig
  taobao?: PlatformApiKeyConfig
  jd?: PlatformApiKeyConfig
  dianping?: PlatformApiKeyConfig
}
