<template>
  <view class="page">
    <view class="intro">
      <text class="title">今天吃啥？</text>
      <text class="subtitle">从你收藏的餐厅里随机选一个</text>
    </view>

    <view v-if="!wheelItems.length && !loading" class="empty-wrap">
      <text class="empty-title">还没有收藏的餐厅</text>
      <text class="empty-hint">在「附近美食」列表点击收藏按钮后再来转盘</text>
      <button class="go-home-btn" @tap="goHome">去收藏</button>
    </view>

    <template v-else>
      <view class="mode-bar">
        <view class="mode-tabs">
          <view
            class="mode-tab"
            :class="{ active: pickMode === 'all' }"
            @tap="switchMode('all')"
          >
            全部 {{ wheelItems.length }}
          </view>
          <view
            class="mode-tab"
            :class="{ active: pickMode === 'pick' }"
            @tap="goPick"
          >
            勾选 {{ checkedCount > 0 ? checkedCount : '' }}
          </view>
        </view>
      </view>

      <lucky-wheel ref="wheelRef" :items="wheelDisplayItems" />

      <view class="actions">
        <button
          class="spin-btn"
          :disabled="spinning || !canSpin"
          :loading="loading"
          @tap="handleSpin"
        >
          {{ spinning ? '转动中...' : '开始转动' }}
        </button>
        <button class="pk-btn" :disabled="loading || !canSpin" @tap="startPk">
          邀请饭搭子 PK
        </button>
        <text class="fav-hint">共 {{ effectiveItems.length }} 家{{ pickMode === 'pick' ? '（已勾选）' : '' }}</text>
      </view>

      <view v-if="result" class="result-modal">
        <view class="result-mask" @tap="closeResult" />
        <view class="result-panel" @tap.stop>
          <uni-icons class="result-close" type="closeempty" size="24" color="#999999" @tap="closeResult" />
          <text class="result-label">今天就吃</text>
          <text class="result-name">{{ result.name }}</text>
          <view class="result-meta">
            <platform-tag platform="amap" />
            <view v-if="result.rating" class="result-rating">
              <uni-icons type="star-filled" size="14" color="#ff9500" />
              <text>{{ result.rating }}</text>
            </view>
            <text>{{ result.distanceText }}</text>
          </view>
          <button class="detail-btn" @tap="goDetail">查看详情</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getFavorites,
  initRestaurantLists,
  refreshRestaurantLists
} from '@/services/restaurant-lists'
import { getCloudBlockReason } from '@/services/cloud'
import { formatDistance } from '@/utils/util'
import type { WheelItem } from '@/types/restaurant'
import type LuckyWheel from '@/components/lucky-wheel/lucky-wheel.vue'

const wheelItems = ref<WheelItem[]>([])
const wheelRef = ref<InstanceType<typeof LuckyWheel> | null>(null)
const loading = ref(false)
const spinning = ref(false)
const result = ref<WheelItem | null>(null)
const pickMode = ref<'all' | 'pick'>('all')
const checkedIds = ref(new Set<string>())

const checkedCount = computed(() => checkedIds.value.size)

const wheelDisplayItems = computed(() => {
  if (pickMode.value === 'pick' && checkedIds.value.size > 0) {
    return wheelItems.value.filter((item) => checkedIds.value.has(item.id))
  }
  return wheelItems.value
})

const effectiveItems = computed(() => wheelDisplayItems.value)

const canSpin = computed(() => effectiveItems.value.length > 0)

onShow(() => {
  loadFromFavorites()
})

onUnmounted(() => {
  uni.$off('wheel-pick-confirmed', onPickConfirmed)
})

function onPickConfirmed(ids: string[]) {
  checkedIds.value = new Set(ids)
  pickMode.value = ids.length > 0 ? 'pick' : 'all'
  nextTick(() => wheelRef.value?.buildSegments(wheelDisplayItems.value))
}

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

    await nextTick()
    wheelRef.value?.buildSegments(wheelDisplayItems.value)
  } catch {
    wheelItems.value = []
  } finally {
    loading.value = false
  }
}

async function handleSpin() {
  if (spinning.value || !wheelRef.value || !effectiveItems.value.length) return
  spinning.value = true
  result.value = null
  try {
    const index = await wheelRef.value.spinRandom()
    if (index >= 0) {
      result.value = effectiveItems.value[index]
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

function switchMode(mode: 'all' | 'pick') {
  pickMode.value = mode
  if (mode === 'all') {
    nextTick(() => wheelRef.value?.buildSegments(wheelItems.value))
  }
}

function goPick() {
  uni.$once('wheel-pick-confirmed', onPickConfirmed)
  uni.navigateTo({ url: '/pages/wheel-pick/wheel-pick?purpose=wheel' })
}

function togglePick(id: string) {
  const next = new Set(checkedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  checkedIds.value = next
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

function startPk() {
  const block = getCloudBlockReason()
  if (block) {
    uni.showModal({ title: '无法发起挑战', content: block, showCancel: false })
    return
  }
  if (!canSpin.value) {
    uni.showToast({ title: '请先收藏餐厅', icon: 'none' })
    return
  }
  uni.setStorageSync('wheelChallengeItems', effectiveItems.value)
  uni.navigateTo({ url: '/pages/wheel-challenge/wheel-challenge?create=1' })
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
.pk-btn {
  width: 480rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: #fff;
  color: $primary;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 48rpx;
  border: 2rpx solid $primary;
}
.fav-hint {
  font-size: 24rpx;
  color: $text-muted;
}
.mode-bar {
  display: flex;
  justify-content: center;
  padding: 16rpx 32rpx 0;
}
.mode-tabs {
  width: 80%;
  display: flex;
  background: #fff;
  border-radius: 40rpx;
  padding: 4rpx;
  gap: 4rpx;
  margin-bottom: 30rpx;
}
.mode-tab {
  flex: 1;
  padding: 12rpx 32rpx;
  font-size: 26rpx;
  color: $text-muted;
  border-radius: 36rpx;
  text-align: center;
}
.mode-tab.active {
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-weight: 600;
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
.result-rating {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
}
.detail-btn {
  background: $primary-light;
  color: $primary;
  border: none;
  border-radius: 32rpx;
}
</style>
