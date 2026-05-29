<template>
  <view class="page">
    <view class="card">
      <text class="card-title">我的资料</text>
      <text class="card-desc">评论将自动使用此处保存的头像和昵称</text>

      <view class="profile-row">
        <!-- #ifdef MP-WEIXIN -->
        <button class="avatar-picker" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
          <image
            v-if="avatarDisplay"
            class="avatar"
            :src="avatarDisplay"
            mode="aspectFill"
          />
          <view v-else class="avatar avatar--placeholder">
            <text>{{ profileAuthorInitial(formNickName) }}</text>
          </view>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="avatar avatar--placeholder">
          <text>{{ profileAuthorInitial(formNickName) }}</text>
        </view>
        <!-- #endif -->

        <view class="profile-fields">
          <!-- #ifdef MP-WEIXIN -->
          <text class="field-label">昵称</text>
          <input
            v-model="formNickName"
            type="nickname"
            class="nickname-input"
            placeholder="点击填写昵称"
            maxlength="32"
          />
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <input
            v-model="formNickName"
            class="nickname-input"
            placeholder="昵称"
            maxlength="32"
          />
          <!-- #endif -->
        </view>
      </view>

      <button class="save-btn" :loading="saving" :disabled="saving" @tap="handleSave">
        保存到云端
      </button>
    </view>

    <view class="card menu-card">
      <text class="card-title">我的列表</text>
      <view class="menu-item" @tap="goList('favorite')">
        <text class="menu-label">⭐ 我的收藏</text>
        <view class="menu-right">
          <text v-if="favoriteCount" class="menu-count">{{ favoriteCount }}</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
      <view class="menu-item" @tap="goList('dislike')">
        <text class="menu-label">👎 不喜欢的餐厅</text>
        <view class="menu-right">
          <text v-if="dislikeCount" class="menu-count">{{ dislikeCount }}</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
      <text class="menu-hint">点击进入管理、批量或单条删除</text>
    </view>

    <view v-if="cloudBlock" class="tip tip--warn">{{ cloudBlock }}</view>
    <view v-else class="tip">收藏与不喜欢列表已同步至云端，换设备登录后仍可使用</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getCloudBlockReason } from '@/services/cloud'
import {
  fetchUserProfile,
  loadLocalUserProfile,
  persistAvatar,
  profileAuthorInitial,
  saveUserProfile
} from '@/services/user-profile'
import {
  getListCount,
  initRestaurantLists,
  refreshRestaurantLists
} from '@/services/restaurant-lists'
import type { RestaurantListType } from '@/types/restaurant-list'

const formNickName = ref('')
const savedAvatarUrl = ref('')
const avatarTemp = ref('')
const saving = ref(false)
const cloudBlock = ref('')
const favoriteCount = ref(0)
const dislikeCount = ref(0)

const avatarDisplay = computed(() => avatarTemp.value || savedAvatarUrl.value)

function onChooseAvatar(e: { detail: { avatarUrl: string } }) {
  const url = e.detail?.avatarUrl
  if (url) avatarTemp.value = url
}

function syncListCounts() {
  favoriteCount.value = getListCount('favorite')
  dislikeCount.value = getListCount('dislike')
}

function goList(type: RestaurantListType) {
  uni.navigateTo({ url: `/pages/list-manage/list-manage?type=${type}` })
}

async function loadProfile() {
  cloudBlock.value = getCloudBlockReason() || ''
  try {
    await initRestaurantLists()
    if (!cloudBlock.value) {
      await refreshRestaurantLists()
    }
  } catch {
    /* ignore */
  }
  syncListCounts()

  if (cloudBlock.value) {
    const local = loadLocalUserProfile()
    formNickName.value = local.nickName
    savedAvatarUrl.value = local.avatarUrl
    return
  }
  uni.showLoading({ title: '加载中', mask: true })
  try {
    const profile = await fetchUserProfile(true)
    formNickName.value = profile.nickName
    savedAvatarUrl.value = profile.avatarUrl
    avatarTemp.value = ''
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

async function handleSave() {
  if (cloudBlock.value) {
    uni.showToast({ title: '云开发未就绪', icon: 'none' })
    return
  }
  const nickName = formNickName.value.trim()
  if (!nickName) {
    uni.showToast({ title: '请填写昵称', icon: 'none' })
    return
  }
  saving.value = true
  try {
    let avatarUrl = savedAvatarUrl.value
    if (avatarTemp.value) {
      avatarUrl = await persistAvatar(avatarTemp.value)
      savedAvatarUrl.value = avatarUrl
      avatarTemp.value = ''
    }
    await saveUserProfile({ nickName, avatarUrl })
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onShow(() => {
  loadProfile()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 32rpx;
  background: $page-bg;
  box-sizing: border-box;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}
.card-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: 8rpx;
}
.card-desc {
  display: block;
  font-size: 24rpx;
  color: $text-muted;
  margin-bottom: 32rpx;
}
.profile-row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 32rpx;
}
.avatar-picker {
  margin: 0;
  padding: 0;
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  overflow: hidden;
  background: transparent;
  flex-shrink: 0;
}
.avatar-picker::after {
  border: none;
}
.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: block;
}
.avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffb347, $primary);
  color: #fff;
  font-size: 56rpx;
  font-weight: 600;
}
.profile-fields {
  flex: 1;
  min-width: 0;
  padding-top: 24rpx;
}
.field-label {
  display: block;
  font-size: 24rpx;
  color: $text-muted;
  margin-bottom: 12rpx;
}
.nickname-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  font-size: 30rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  box-sizing: border-box;
}
.save-btn {
  background: $primary;
  color: #fff;
  border-radius: 48rpx;
  font-size: 30rpx;
  border: none;
}
.save-btn::after {
  border: none;
}
.menu-card .card-desc {
  display: none;
}
.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid $border;
}
.menu-item:last-of-type {
  border-bottom: none;
}
.menu-label {
  font-size: 30rpx;
  color: $text-primary;
}
.menu-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.menu-count {
  font-size: 26rpx;
  color: $text-muted;
}
.menu-arrow {
  font-size: 36rpx;
  color: #ccc;
  line-height: 1;
}
.menu-hint {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: $text-muted;
}
.tip {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $text-muted;
  text-align: center;
  line-height: 1.5;
}
.tip--warn {
  color: #e1251b;
}
</style>
