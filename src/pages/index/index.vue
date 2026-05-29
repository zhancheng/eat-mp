<template>
  <view class="page">
    <view class="header">
      <view class="location-row" @tap="onRelocateTap">
        <text class="loc-icon">📍</text>
        <text class="loc-text">{{ locationText }}</text>
        <text class="refresh" @tap.stop="onRefreshTap">刷新</text>
      </view>
      <text class="header-sub">高德附近美食推荐</text>
      <view class="search-bar">
        <input
          class="search-input"
          placeholder="搜索餐厅、菜系..."
          :value="keyword"
          confirm-type="search"
          @input="onSearchInput"
          @confirm="loadData"
        />
      </view>
    </view>

    <scroll-view class="category-scroll" scroll-x>
      <view
        v-for="c in categories"
        :key="c.id"
        class="category-chip"
        :class="{ active: activeCategory === c.id }"
        @tap="onCategoryTap(c.id)"
      >
        {{ c.label }}
      </view>
    </scroll-view>

    <view class="toolbar">
      <picker
        mode="selector"
        :range="sortOptions"
        range-key="label"
        :value="sortIndex"
        @change="onSortChange"
      >
        <view class="sort-btn">{{ sortOptions[sortIndex].label }} ▾</view>
      </picker>
      <text class="count">{{ countText }}</text>
      <text v-if="favoriteCount" class="fav-count">收藏 {{ favoriteCount }}</text>
      <view class="wheel-entry" @tap="goWheel">🎡 转盘</view>
    </view>

    <view v-if="errorMsg" class="error-bar">
      <text>{{ errorMsg }}</text>
    </view>

    <view class="list-area">
      <view v-if="loading && !list.length" class="loading-wrap">
        <view class="loading-dot" />
        <text>正在加载附近美食...</text>
      </view>

      <template v-else-if="list.length">
        <restaurant-card
          v-for="item in list"
          :key="item.id"
          :item="item"
          :favorited="favoriteIds.has(item.id)"
          @tap="onCardTap"
          @favorite="onFavoriteToggle"
        />
        <view class="list-footer">
          <view v-if="loadingMore" class="footer-loading">
            <view class="loading-dot small" />
            <text>加载中...</text>
          </view>
          <text v-else-if="!hasMore" class="footer-done">— 没有更多了 —</text>
          <text v-else class="footer-hint">上拉加载更多</text>
        </view>
      </template>

      <view v-else-if="!loading" class="empty-state">
        <text>{{ errorMsg ? '加载失败' : '附近暂无餐厅' }}</text>
        <text class="hint">{{ errorMsg || '试试切换分类或扩大搜索范围' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { fetchAmapRecommendationsPage, sortRestaurants } from '@/services/api'
import {
  getLocation,
  openLocationSetting,
  FALLBACK_LOCATION
} from '@/services/location'
import { formatDistance } from '@/utils/util'
import { SORT_OPTIONS, FOOD_CATEGORIES } from '@/utils/constants'
import { isAmapConfigured } from '@/services/platforms/amap'
import {
  getDislikeIds,
  getFavoriteIds,
  initRestaurantLists,
  refreshRestaurantLists,
  toggleFavorite
} from '@/services/restaurant-lists'
import type { AppLocation } from '@/types/location'
import type { Restaurant } from '@/types/restaurant'
import { getTypedApp } from '@/types/global'

const PAGE_SIZE = 20

const loading = ref(true)
const loadingMore = ref(false)
const list = ref<Restaurant[]>([])
const page = ref(1)
const hasMore = ref(true)
const total = ref(0)
const sortOptions = SORT_OPTIONS
const categories = FOOD_CATEGORIES
const sortIndex = ref(0)
const keyword = ref('')
const activeCategory = ref('美食')
const locationText = ref('定位中...')
const errorMsg = ref('')
const lastLocation = ref<AppLocation | null>(null)
const lastKeyword = ref('')
const favoriteIds = ref(new Set<string>())
const dislikeIds = ref(new Set<string>())

const favoriteCount = computed(() => favoriteIds.value.size)

const countText = computed(() => {
  if (total.value > 0) {
    return `已加载 ${list.value.length} / ${total.value} 家`
  }
  return `共 ${list.value.length} 家`
})

onMounted(() => {
  if (!isAmapConfigured()) {
    errorMsg.value = '未配置高德 Key：请在 api.config.js 填写 amap.apiKey'
  }
  loadData()
})

function refreshListIds() {
  favoriteIds.value = getFavoriteIds()
  dislikeIds.value = getDislikeIds()
}

function filterVisibleItems(items: Restaurant[]) {
  return items.filter((item) => !dislikeIds.value.has(item.id))
}

onShow(() => {
  initRestaurantLists()
    .then(() => refreshRestaurantLists())
    .then(() => refreshListIds())
    .catch(() => refreshListIds())
  const app = getTypedApp()
  if (app.globalData.needRefreshList) {
    app.globalData.needRefreshList = false
    loadData()
  }
})

onPullDownRefresh(() => {
  loadData(true).finally(() => uni.stopPullDownRefresh())
})

onReachBottom(() => {
  loadMore()
})

function formatLocationLabel(location: AppLocation) {
  if (location.isFallback) return location.label || '未定位（默认北京）'
  const acc =
    location.accuracy != null ? ` ±${Math.round(location.accuracy)}m` : ''
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}${acc}`
}

function onRefreshTap() {
  loadData(true)
}

function onRelocateTap() {
  loadData(true)
}

async function resolveLocation(forceRefresh = false) {
  try {
    return await getLocation({ refresh: forceRefresh })
  } catch {
    const ok = await openLocationSetting()
    if (ok) return getLocation({ refresh: true })
    throw new Error('未获取定位权限')
  }
}

function mapItems(items: Restaurant[]) {
  return items.map((item) => ({
    ...item,
    distanceText: formatDistance(item.distance ?? 0)
  }))
}

function mergeList(existing: Restaurant[], incoming: Restaurant[]) {
  const seen = new Set(existing.map((i) => i.id))
  const merged = [...existing]
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      merged.push(item)
    }
  }
  return merged
}

async function fetchPage(location: AppLocation, pageNum: number, searchWord: string) {
  const { list: raw, hasMore: more, total: totalCount } =
    await fetchAmapRecommendationsPage({
      latitude: location.latitude,
      longitude: location.longitude,
      page: pageNum,
      pageSize: PAGE_SIZE,
      keyword: searchWord
    })
  const sorted = sortRestaurants(mapItems(raw), sortOptions[sortIndex.value].id)
  return {
    items: filterVisibleItems(sorted),
    hasMore: more,
    total: totalCount
  }
}

async function loadData(forceRefresh = false): Promise<void> {
  loading.value = true
  errorMsg.value = ''
  page.value = 1
  hasMore.value = true
  total.value = 0

  try {
    let location
    try {
      location = await resolveLocation(forceRefresh)
    } catch {
      location = FALLBACK_LOCATION
      uni.showToast({
        title: '定位失败，使用北京默认坐标',
        icon: 'none',
        duration: 2500
      })
    }

    lastLocation.value = location
    const searchWord = keyword.value.trim() || activeCategory.value
    lastKeyword.value = searchWord

    const { items, hasMore: more, total: totalCount } = await fetchPage(
      location,
      1,
      searchWord
    )

    list.value = items
    hasMore.value = more
    total.value = totalCount
    locationText.value = formatLocationLabel(location)
  } catch (e) {
    console.error(e)
    list.value = []
    hasMore.value = false
    errorMsg.value = e instanceof Error ? e.message : '加载失败'
    uni.showToast({ title: errorMsg.value, icon: 'none', duration: 3000 })
  } finally {
    loading.value = false
  }
}

async function loadMore(): Promise<void> {
  if (!hasMore.value || loadingMore.value || loading.value || !lastLocation.value) {
    return
  }

  loadingMore.value = true
  const nextPage = page.value + 1

  try {
    const { items, hasMore: more, total: totalCount } = await fetchPage(
      lastLocation.value,
      nextPage,
      lastKeyword.value
    )

    if (items.length) {
      page.value = nextPage
      list.value = mergeList(list.value, items)
    }
    hasMore.value = more && items.length > 0
    if (totalCount > 0) total.value = totalCount
  } catch (e) {
    console.error(e)
    uni.showToast({
      title: e instanceof Error ? e.message : '加载失败',
      icon: 'none'
    })
  } finally {
    loadingMore.value = false
  }
}

function onCategoryTap(id: string) {
  activeCategory.value = id
  keyword.value = ''
  loadData()
}

function onSortChange(e: { detail: { value: string } }) {
  sortIndex.value = Number(e.detail.value)
  list.value = sortRestaurants(list.value, sortOptions[sortIndex.value].id)
}

function onSearchInput(e: unknown) {
  keyword.value = (e as { detail: { value: string } }).detail.value
  if (!keyword.value) loadData()
}

function onCardTap({ item }: { item: Restaurant }) {
  uni.setStorageSync('detailRestaurant', item)
  uni.navigateTo({ url: `/pages/detail/detail?id=${encodeURIComponent(item.id)}` })
}

async function onFavoriteToggle({ item }: { item: Restaurant }) {
  try {
    const added = await toggleFavorite(item)
    refreshListIds()
    uni.showToast({ title: added ? '已收藏' : '已取消收藏', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '操作失败', icon: 'none' })
  }
}

function goWheel() {
  uni.switchTab({ url: '/pages/wheel/wheel' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $page-bg;
}
.header {
  background: linear-gradient(180deg, #ff6b35 0%, #ff8c5a 100%);
  padding: 24rpx 32rpx 28rpx;
}
.location-row {
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.95);
  font-size: 26rpx;
  margin-bottom: 8rpx;
}
.header-sub {
  display: block;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.88);
  margin-bottom: 16rpx;
}
.loc-icon {
  margin-right: 8rpx;
}
.loc-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.refresh {
  padding: 8rpx 20rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 24rpx;
  font-size: 24rpx;
}
.search-bar {
  background: #fff;
  border-radius: 40rpx;
  padding: 0 28rpx;
}
.search-input {
  height: 72rpx;
  font-size: 28rpx;
}
.category-scroll {
  white-space: nowrap;
  padding: 16rpx 24rpx;
  background: #fff;
  box-sizing: border-box;
}
.category-chip {
  display: inline-block;
  padding: 10rpx 24rpx;
  margin-right: 12rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  background: #f5f5f5;
  color: $text-secondary;
  &.active {
    background: #e8f8ef;
    color: #00a843;
    font-weight: 600;
  }
}
.toolbar {
  display: flex;
  align-items: center;
  padding: 16rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid $border;
}
.sort-btn {
  font-size: 26rpx;
  font-weight: 500;
}
.count {
  flex: 1;
  text-align: center;
  font-size: 24rpx;
  color: $text-muted;
}
.fav-count {
  font-size: 24rpx;
  color: #ff9500;
  margin-right: 16rpx;
}
.wheel-entry {
  font-size: 26rpx;
  color: $primary;
  font-weight: 600;
}
.error-bar {
  margin: 16rpx 32rpx 0;
  padding: 16rpx 20rpx;
  background: #fff3f0;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #e65100;
  line-height: 1.5;
}
.list-area {
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx;
  color: $text-muted;
  gap: 24rpx;
}
.loading-dot {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #eee;
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 48rpx;
  color: $text-muted;
  gap: 12rpx;
  text-align: center;
}
.hint {
  font-size: 24rpx;
}
.list-footer {
  padding: 32rpx 0 16rpx;
  text-align: center;
}
.footer-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  color: $text-muted;
  font-size: 24rpx;
}
.footer-done,
.footer-hint {
  font-size: 24rpx;
  color: $text-muted;
}
.loading-dot.small {
  width: 32rpx;
  height: 32rpx;
  border-width: 3rpx;
}
</style>
