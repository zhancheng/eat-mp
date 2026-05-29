import type { ApiConfig } from './api'
import type { AppLocation } from './location'

export interface AppGlobalData {
  location: AppLocation | null
  apiConfig: ApiConfig
  needRefreshList: boolean
}

export interface UniAppInstance {
  globalData: AppGlobalData
}

export function getTypedApp(): UniAppInstance {
  return getApp() as UniAppInstance
}

export {}
