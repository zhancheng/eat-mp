<script lang="ts">
import apiConfig from './config/api.config'
import { initCloud } from '@/services/cloud'
import { fetchUserProfile } from '@/services/user-profile'
import { initRestaurantLists } from '@/services/restaurant-lists'
import type { AppGlobalData } from '@/types/global'

export default {
  globalData: {
    location: null,
    apiConfig,
    needRefreshList: false
  } as AppGlobalData,

  onLaunch() {
    initCloud()
    fetchUserProfile().catch(() => {})
    initRestaurantLists().catch(() => {})
    this.initLocation()
  },

  methods: {
    initLocation() {
      const app = getApp() as import('@/types/global').UniAppInstance
      // 预拉定位；失败时不写默认坐标，避免污染 getLocation 缓存
      uni.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        success: (res) => {
          app.globalData.location = {
            latitude: res.latitude,
            longitude: res.longitude,
            isFallback: false,
            updatedAt: Date.now()
          }
        }
      })
    }
  }
}
</script>

<style lang="scss">
page {
  background-color: $page-bg;
  color: $text-primary;
  font-size: 28rpx;
  line-height: 1.5;
}
button{
  border: none;
}
button::after{
  border: none;
}
</style>
