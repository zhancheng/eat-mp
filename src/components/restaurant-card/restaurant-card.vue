<template>
  <view class="card" @tap="onTap">
    <view class="fav-btn" :class="{ active: favorited }" @tap.stop="onFavoriteTap">
      <uni-icons
        :type="favorited ? 'star-filled' : 'star'"
        size="18"
        :color="favorited ? '#ff9500' : '#ccc'"
      />
    </view>
    <image
      class="cover"
      :src="item.cover || '/static/images/default-shop.png'"
      mode="aspectFill"
      lazy-load
    />
    <view class="body">
      <view class="title-row">
        <text class="name">{{ item.name }}</text>
        <platform-tag :platform="item.platform" size="small" />
      </view>
      <view class="meta">
        <view class="rating">
          <uni-icons type="star-filled" size="12" color="#ff9500" />
          <text>{{ item.rating }}</text>
        </view>
        <text class="sep">|</text>
        <text>¥{{ item.avgPrice }}/人</text>
      </view>
      <view v-if="item.tags && item.tags.length" class="tags">
        <text v-for="(tag, i) in item.tags" :key="i" class="tag-item">{{ tag }}</text>
      </view>
      <view class="footer">
        <text class="distance">{{ item.distanceText }}</text>
        <text class="delivery">{{ item.deliveryTime }}</text>
        <text v-if="item.minOrder > 0" class="min-order">起送 ¥{{ item.minOrder }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Restaurant } from '@/types/restaurant'

const props = withDefaults(
  defineProps<{
    item: Restaurant
    favorited?: boolean
  }>(),
  { favorited: false }
)

const emit = defineEmits<{
  tap: [{ item: Restaurant }]
  favorite: [{ item: Restaurant }]
}>()

function onTap() {
  emit('tap', { item: props.item })
}

function onFavoriteTap() {
  emit('favorite', { item: props.item })
}
</script>

<style lang="scss" scoped>
.card {
  position: relative;
  display: flex;
  background: $card-bg;
  border-radius: $radius;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: $shadow;
  height: 210rpx;
}
.fav-btn {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  z-index: 2;
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
}
.cover {
  width: 210rpx;
  height: 210rpx;
  flex-shrink: 0;
  background: #f0f0f0;
}
.body {
  flex: 1;
  padding: 20rpx 24rpx;
  min-width: 0;
}
.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.name {
  font-size: 30rpx;
  font-weight: 600;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 8rpx;
}
.rating {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  color: #ff9500;
  font-weight: 500;
}
.sep {
  margin: 0 8rpx;
  color: #ddd;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 8rpx;
}
.tag-item {
  font-size: 20rpx;
  color: $primary;
  background: $primary-light;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}
.footer {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 22rpx;
  color: $text-muted;
}
.distance {
  color: $primary;
  font-weight: 500;
}
</style>
