import type { AppLocation, GetLocationOptions } from '@/types/location'
import { getTypedApp, type UniAppInstance } from '@/types/global'

/** 仅作展示/兜底，不写入 globalData，避免覆盖真实定位 */
export const FALLBACK_LOCATION: AppLocation = {
  latitude: 39.9042,
  longitude: 116.4074,
  isFallback: true,
  label: '北京（未获取定位）'
}

interface DeviceLocation {
  latitude: number
  longitude: number
  accuracy?: number
}

function saveLocation(app: UniAppInstance, loc: DeviceLocation): AppLocation {
  const next: AppLocation = {
    latitude: loc.latitude,
    longitude: loc.longitude,
    isFallback: false,
    accuracy: loc.accuracy,
    updatedAt: Date.now()
  }
  app.globalData.location = next
  return next
}

function requestDeviceLocation(): Promise<DeviceLocation> {
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 4000,
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude,
          accuracy: res.accuracy
        })
      },
      fail: reject
    })
  })
}

/**
 * refresh=true 时忽略缓存，重新调起微信定位
 */
export function getLocation(options: GetLocationOptions = {}): Promise<AppLocation> {
  const { refresh = false } = options
  const app = getTypedApp()

  return new Promise((resolve, reject) => {
    const cached = app.globalData.location
    if (!refresh && cached && !cached.isFallback) {
      resolve(cached)
      return
    }

    requestDeviceLocation()
      .then((raw) => resolve(saveLocation(app, raw)))
      .catch(reject)
  })
}

export function clearCachedLocation(): void {
  const app = getTypedApp()
  app.globalData.location = null
}

export function openLocationSetting(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: '需要位置权限',
      content: '开启定位后可获取附近外卖和餐厅',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          uni.openSetting({
            success: (settingRes) => {
              const ok = !!settingRes.authSetting['scope.userLocation']
              if (ok) clearCachedLocation()
              resolve(ok)
            },
            fail: () => resolve(false)
          })
        } else {
          resolve(false)
        }
      }
    })
  })
}
