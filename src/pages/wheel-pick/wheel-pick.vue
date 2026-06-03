<template>
  <view class="page">
    <view class="header">
      <text class="header-title">{{ title }}</text>
      <text class="header-hint">{{ subtitle }}</text>
    </view>

    <view v-if="!list.length && !loading" class="empty-wrap">
      <text class="empty-title">还没有收藏的餐厅</text>
      <text class="empty-hint">去「附近美食」收藏后再来勾选</text>
    </view>

    <view v-else class="list">
      <view
        v-for="item in list"
        :key="item.id"
        class="item"
        :class="{ checked: checkedIds.has(item.id) }"
        @tap="toggle(item.id)"
      >
        <view class="checkbox">
          <uni-icons v-if="checkedIds.has(item.id)" type="checkmark-filled" size="16" color="#fff" />
        </view>
        <text class="name">{{ item.name }}</text>
      </view>
    </view>

    <view class="actions">
      <button class="confirm-btn" :disabled="checkedCount === 0" @tap="confirm">
        确认 ({{ checkedCount }})
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getFavorites, initRestaurantLists, refreshRestaurantLists } from '@/services/restaurant-lists'
import { formatDistance } from '@/utils/util'
import type { WheelItem } from '@/types/restaurant'

const TITLES: Record<string, string> = {
  wheel: '选择餐厅',
  challenge: '选择对战餐厅'
}

const SUBTITLES: Record<string, string> = {
  wheel: '勾选要参与转盘的餐厅',
  challenge: '勾选要参与对战的餐厅'
}

type Purpose = 'wheel' | 'challenge'

const list = ref<WheelItem[]>([])
const loading = ref(false)
const checkedIds = ref(new Set<string>())

const checkedCount = computed(() => checkedIds.value.size)

let currentPurpose: Purpose = 'wheel'

onLoad((opts: any) => {
  currentPurpose = (opts?.purpose as Purpose) || 'wheel'
  load()
})

const title = computed(() => TITLES[currentPurpose])
const subtitle = computed(() => SUBTITLES[currentPurpose])

async function load() {
  loading.value = true
  try {
    await initRestaurantLists()
    await refreshRestaurantLists()
    const favorites = getFavorites()
    list.value = favorites.map((item) => ({
      ...item,
      label: item.name,
      distanceText: item.distanceText || formatDistance(item.distance || 0)
    }))
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function toggle(id: string) {
  const next = new Set(checkedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  checkedIds.value = next
}

function confirm() {
  if (checkedCount.value === 0) {
    uni.showToast({ title: '请先勾选餐厅', icon: 'none' })
    return
  }
  const eventName = currentPurpose === 'wheel' ? 'wheel-pick-confirmed' : 'challenge-pick-confirmed'
  uni.$emit(eventName, [...checkedIds.value])
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f0 0%, $page-bg 40%);
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}
.header {
  text-align: center;
  padding: 40rpx 32rpx 24rpx;
}
.header-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
}
.header-hint {
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
}
.list {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  margin: 16rpx 32rpx;
  background: #fff;
  border-radius: $radius;
}
.item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.item:last-child {
  border-bottom: none;
}
.item.checked .checkbox {
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  border-color: #ff6b35;
}
.checkbox {
  flex-shrink: 0;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.name {
  font-size: 28rpx;
  color: $text-primary;
}
.actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  display: flex;
  justify-content: center;
}
.confirm-btn {
  width: 480rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 48rpx;
  border: none;
}
.confirm-btn[disabled] {
  opacity: 0.5;
}
</style>