import type { ApiConfig } from '@/types/api'

const apiConfig: ApiConfig = {
  amap: {
    enabled: true,
    apiKey: '你的高德Key',
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
