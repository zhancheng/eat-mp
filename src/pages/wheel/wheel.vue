<template>
  <view class="page">
    <view class="intro">
      <text class="title">今天吃啥？</text>
      <text class="subtitle">从你收藏的餐厅里随机选一个</text>
    </view>

    <view v-if="!wheelItems.length && !loading" class="empty-wrap">
      <text class="empty-title">还没有收藏的餐厅</text>
      <text class="empty-hint">在「附近美食」列表点击 ☆ 收藏商家后再来转盘</text>
      <button class="go-home-btn" @tap="goHome">去收藏</button>
    </view>

    <template v-else>
      <lucky-wheel ref="wheelRef" :items="wheelItems" />

      <view class="actions">
        <button
          class="spin-btn"
          :disabled="spinning || !wheelItems.length"
          :loading="loading"
          @tap="handleSpin"
        >
          {{ spinning ? '转动中...' : '开始转动' }}
        </button>
        <text class="fav-hint">共 {{ wheelItems.length }} 家收藏</text>
      </view>

      <view v-if="result" class="result-modal">
        <view class="result-mask" @tap="closeResult" />
        <view class="result-panel" @tap.stop>
          <text class="result-close" @tap="closeResult">×</text>
          <text class="result-label">今天就吃</text>
          <text class="result-name">{{ result.name }}</text>
          <view class="result-meta">
            <platform-tag platform="amap" />
            <text v-if="result.rating">★ {{ result.rating }}</text>
            <text>{{ result.distanceText }}</text>
          </view>
          <button class="detail-btn" @tap="goDetail">查看详情</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getFavorites,
  initRestaurantLists,
  refreshRestaurantLists
} from '@/services/restaurant-lists'
import { formatDistance } from '@/utils/util'
import type { WheelItem } from '@/types/restaurant'
import type LuckyWheel from '@/components/lucky-wheel/lucky-wheel.vue'

const wheelItems = ref<WheelItem[]>([])
const wheelRef = ref<InstanceType<typeof LuckyWheel> | null>(null)
const loading = ref(false)
const spinning = ref(false)
const result = ref<WheelItem | null>(null)

onShow(() => {
  loadFromFavorites()
})

function shortLabel(name: string) {
  if (!name) return ''
  return name.length > 8 ? name.slice(0, 7) + '...' : name
}

async function loadFromFavorites() {
  loading.value = true
  result.value = null
  try {
    await initRestaurantLists()
    await refreshRestaurantLists()
    const list = getFavorites()
    wheelItems.value = list.map((item) => ({
      ...item,
      label: shortLabel(item.name),
      distanceText: item.distanceText || formatDistance(item.distance || 0)
    }))
  } catch {
    wheelItems.value = []
  } finally {
    loading.value = false
  }
}

async function handleSpin() {
  if (spinning.value || !wheelRef.value || !wheelItems.value.length) return
  spinning.value = true
  result.value = null
  try {
    const index = await wheelRef.value.spinRandom()
    if (index >= 0) {
      result.value = wheelItems.value[index]
      if (typeof uni.vibrateShort === 'function') {
        uni.vibrateShort({ type: 'medium' })
      }
    }
  } finally {
    spinning.value = false
  }
}

function closeResult() {
  result.value = null
}

function goDetail() {
  if (!result.value) return
  uni.setStorageSync('detailRestaurant', result.value)
  uni.navigateTo({
    url: `/pages/detail/detail?id=${encodeURIComponent(result.value.id)}`
  })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f0 0%, $page-bg 40%);
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}
.intro {
  text-align: center;
  padding: 40rpx 32rpx 24rpx;
}
.title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
}
.subtitle {
  display: block;
  font-size: 26rpx;
  color: $text-muted;
  margin-top: 8rpx;
}
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 48rpx;
  text-align: center;
  gap: 16rpx;
}
.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}
.empty-hint {
  font-size: 26rpx;
  color: $text-muted;
  line-height: 1.6;
}
.go-home-btn {
  margin-top: 32rpx;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  border-radius: 48rpx;
  border: none;
  padding: 0 64rpx;
}
.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 40rpx 32rpx;
}
.spin-btn {
  width: 480rpx;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-size: 34rpx;
  font-weight: 600;
  border-radius: 48rpx;
  border: none;
}
.fav-hint {
  font-size: 24rpx;
  color: $text-muted;
}
.result-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.result-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}
.result-panel {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 600rpx;
  padding: 48rpx 32rpx 32rpx;
  background: #fff;
  border-radius: $radius;
  box-shadow: $shadow;
  text-align: center;
}
.result-close {
  position: absolute;
  top: 16rpx;
  right: 24rpx;
  font-size: 44rpx;
  line-height: 1;
  color: $text-muted;
  padding: 8rpx;
}
.result-label {
  display: block;
  font-size: 24rpx;
  color: $text-muted;
}
.result-name {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: $primary;
  margin: 12rpx 0 20rpx;
}
.result-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 24rpx;
}
.detail-btn {
  background: $primary-light;
  color: $primary;
  border: none;
  border-radius: 32rpx;
}
</style>
