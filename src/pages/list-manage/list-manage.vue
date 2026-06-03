<template>
  <view class="page">
    <view v-if="cloudBlock" class="error-bar">{{ cloudBlock }}</view>

    <view v-if="loading" class="state-wrap">
      <view class="loading-dot" />
      <text>加载中...</text>
    </view>

    <view v-else-if="!items.length" class="state-wrap">
      <text class="state-title">{{ meta.emptyTitle }}</text>
      <text class="state-hint">{{ meta.emptyHint }}</text>
    </view>

    <template v-else>
      <view class="toolbar">
        <text class="count">共 {{ items.length }} 家</text>
        <text class="edit-btn" @tap="toggleEdit">{{ editing ? '完成' : '管理' }}</text>
      </view>

      <view class="list">
        <view
          v-for="item in items"
          :key="item.id"
          class="row"
          @tap="onRowTap(item)"
        >
          <view
            v-if="editing"
            class="checkbox"
            :class="{ checked: selectedIds.has(item.id) }"
            @tap.stop="toggleSelect(item.id)"
          >
            <uni-icons
              v-if="selectedIds.has(item.id)"
              type="checkbox-filled"
              size="18"
              color="#FF6B35"
            />
            <uni-icons v-else type="circle" size="18" color="#cccccc" />
          </view>
          <image
            class="cover"
            :src="item.cover || '/static/images/default-shop.png'"
            mode="aspectFill"
          />
          <view class="info">
            <text class="name">{{ item.name }}</text>
            <view class="meta">
            <view v-if="item.rating" class="rating">
              <uni-icons type="star-filled" size="12" color="#ff9500" />
              <text>{{ item.rating }}</text>
            </view>
              <text v-if="item.avgPrice">¥{{ item.avgPrice }}/人</text>
              <text v-if="item.distanceText" class="dist">{{ item.distanceText }}</text>
            </view>
            <text v-if="item.address" class="addr">{{ item.address }}</text>
          </view>
          <text
            v-if="!editing"
            class="remove-one"
            @tap.stop="removeOne(item)"
          >删除</text>
        </view>
      </view>
    </template>

    <view v-if="editing && items.length" class="bottom-bar">
      <text class="select-all" @tap="toggleSelectAll">
        {{ allSelected ? '取消全选' : '全选' }}
      </text>
      <button
        class="delete-btn"
        :disabled="!selectedIds.size || deleting"
        :loading="deleting"
        @tap="removeSelected"
      >
        删除{{ selectedIds.size ? ` (${selectedIds.size})` : '' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getCloudBlockReason } from '@/services/cloud'
import {
  fetchListForManage,
  LIST_META,
  removeFromList,
  refreshRestaurantLists
} from '@/services/restaurant-lists'
import { formatDistance } from '@/utils/util'
import type { RestaurantListType, SavedRestaurant } from '@/types/restaurant-list'

const listType = ref<RestaurantListType>('favorite')
const items = ref<SavedRestaurant[]>([])
const loading = ref(true)
const editing = ref(false)
const deleting = ref(false)
const selectedIds = ref(new Set<string>())
const cloudBlock = ref('')

const meta = computed(() => LIST_META[listType.value])

const allSelected = computed(
  () => items.value.length > 0 && selectedIds.value.size === items.value.length
)

onLoad((query) => {
  const type = query?.type === 'dislike' ? 'dislike' : 'favorite'
  listType.value = type
  uni.setNavigationBarTitle({ title: LIST_META[type].title })
})

onShow(() => {
  loadList()
})

async function loadList() {
  cloudBlock.value = getCloudBlockReason() || ''
  loading.value = true
  editing.value = false
  selectedIds.value = new Set()
  try {
    if (cloudBlock.value) {
      items.value = []
      return
    }
    const list = await fetchListForManage(listType.value)
    items.value = list.map((item) => ({
      ...item,
      distanceText: item.distanceText || formatDistance(item.distance || 0)
    }))
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
    items.value = []
  } finally {
    loading.value = false
  }
}

function toggleEdit() {
  editing.value = !editing.value
  if (!editing.value) selectedIds.value = new Set()
}

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(items.value.map((i) => i.id))
  }
}

function onRowTap(item: SavedRestaurant) {
  if (editing.value) {
    toggleSelect(item.id)
    return
  }
  uni.setStorageSync('detailRestaurant', item)
  uni.navigateTo({ url: `/pages/detail/detail?id=${encodeURIComponent(item.id)}` })
}

async function removeOne(item: SavedRestaurant) {
  const res = await uni.showModal({
    title: '确认删除',
    content: `从${meta.value.title}中移除「${item.name}」？`
  })
  if (!res.confirm) return
  await doRemove([item.id])
}

async function removeSelected() {
  if (!selectedIds.value.size) return
  const res = await uni.showModal({
    title: '确认删除',
    content: `确定删除选中的 ${selectedIds.value.size} 家餐厅？`
  })
  if (!res.confirm) return
  await doRemove([...selectedIds.value])
}

async function doRemove(ids: string[]) {
  deleting.value = true
  try {
    await removeFromList(listType.value, ids)
    await refreshRestaurantLists()
    items.value = items.value.filter((i) => !ids.includes(i.id))
    selectedIds.value = new Set()
    editing.value = false
    uni.showToast({ title: '已删除', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '删除失败', icon: 'none' })
  } finally {
    deleting.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $page-bg;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}
.error-bar {
  margin: 24rpx 32rpx 0;
  padding: 16rpx 20rpx;
  background: #fff3f0;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #e65100;
  line-height: 1.5;
}
.state-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx;
  text-align: center;
  gap: 16rpx;
  color: $text-muted;
}
.state-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}
.state-hint {
  font-size: 26rpx;
  line-height: 1.6;
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
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx 8rpx;
}
.count {
  font-size: 26rpx;
  color: $text-muted;
}
.edit-btn {
  font-size: 28rpx;
  color: $primary;
  font-weight: 600;
}
.list {
  padding: 8rpx 32rpx;
}
.row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.checkbox {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 2rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 24rpx;
  color: #fff;
}
.checkbox.checked {
  background: transparent;
  border-color: transparent;
}
.cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: #f0f0f0;
}
.info {
  flex: 1;
  min-width: 0;
}
.name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8rpx;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 6rpx;
}
.rating {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  color: #ff9500;
}
.dist {
  color: $primary;
}
.addr {
  display: block;
  font-size: 22rpx;
  color: $text-muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.remove-one {
  font-size: 24rpx;
  color: #e1251b;
  flex-shrink: 0;
  padding: 8rpx;
}
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid $border;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
}
.select-all {
  font-size: 28rpx;
  color: $text-secondary;
  flex-shrink: 0;
}
.delete-btn {
  flex: 1;
  background: #e1251b;
  color: #fff;
  border-radius: 48rpx;
  font-size: 30rpx;
  border: none;
}
.delete-btn::after {
  border: none;
}
.delete-btn[disabled] {
  opacity: 0.5;
}
</style>
