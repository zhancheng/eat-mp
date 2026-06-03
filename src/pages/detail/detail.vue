<template>
  <view v-if="item" class="page">
    <view class="page-scroll">
    <view class="hero-wrap">
      <swiper
        class="hero-swiper"
        :indicator-dots="galleryImages.length > 1"
        indicator-color="rgba(255,255,255,0.45)"
        indicator-active-color="#fff"
        :circular="galleryImages.length > 1"
        :autoplay="galleryImages.length > 1"
        :interval="4000"
        @change="onSwiperChange"
      >
        <swiper-item v-for="(img, i) in galleryImages" :key="i">
          <image class="hero" :src="img" mode="aspectFit" />
        </swiper-item>
      </swiper>
      <view v-if="galleryImages.length > 1" class="hero-counter">
        {{ currentSlide + 1 }}/{{ galleryImages.length }}
      </view>
    </view>
    <view class="content">
      <view class="title-row">
        <text class="name">{{ item.name }}</text>
        <platform-tag :platform="item.platform" />
      </view>

      <view class="stats">
        <view class="stat">
          <text class="val">{{ item.rating }}</text>
          <text class="lbl">评分</text>
        </view>
        <view class="stat">
          <text class="val">¥{{ item.avgPrice }}</text>
          <text class="lbl">人均</text>
        </view>
        <view class="stat">
          <text class="val">{{ item.distanceText || '-' }}</text>
          <text class="lbl">距离</text>
        </view>
      </view>

      <view class="distance-bar-section">
        <text class="section-title">距离示意</text>
        <view class="distance-bar-wrap">
          <view
            class="distance-marker"
            :class="distanceZone"
            :style="{ left: distanceMarkerPercent + '%' }"
          >
            <text class="marker-label">{{ item.distanceText || '-' }}</text>
            <view class="marker-pin" />
          </view>
          <view class="distance-bar">
            <view class="bar-seg bar-seg--near" />
            <view class="bar-seg bar-seg--mid" />
            <view class="bar-seg bar-seg--far" />
          </view>
          <view class="distance-scale">
            <text>0</text>
            <text>300m</text>
            <text>600m</text>
            <text>1km+</text>
          </view>
          <view class="travel-time-row">
            <view class="travel-time-item">
              <text class="travel-mode">步行</text>
              <text class="travel-duration">{{ walkTimeText }}</text>
            </view>
            <view class="travel-time-divider" />
            <view class="travel-time-item">
              <text class="travel-mode">骑车</text>
              <text class="travel-duration">{{ bikeTimeText }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">配送信息</text>
        <text>预计 {{ item.deliveryTime }}</text>
        <text v-if="item.minOrder > 0"> · 起送 ¥{{ item.minOrder }}</text>
      </view>

      <view class="section">
        <text class="section-title">地址</text>
        <text>{{ item.address }}</text>
      </view>

      <view v-if="tagList.length" class="section">
        <text class="section-title">标签</text>
        <view class="tags">
          <text v-for="(tag, i) in tagList" :key="i" class="tag">{{ tag }}</text>
        </view>
      </view>

      <view class="section hint-box">
        <text class="hint">
          接入 {{ item.platformName }} 开放平台后，可在此跳转至对应 App 下单。
        </text>
      </view>

      <view id="comments-anchor" class="section comments-section">
        <text class="section-title">大家怎么说</text>
        <view v-if="commentsError" class="cloud-diag-btn" @tap="runCloudDiag">
          <text>云调用失败，点此运行诊断</text>
        </view>
        <view v-if="commentsLoading" class="comments-hint">加载中…</view>
        <view v-else-if="commentsError" class="comments-hint comments-hint--err">
          {{ commentsError }}
        </view>
        <view v-else-if="!comments.length" class="comments-hint">还没有评论，来写第一条吧</view>
        <view v-else class="comment-list">
          <view v-for="c in comments" :key="c._id" class="comment-item">
            <view v-if="c.avatarUrl" class="comment-avatar-wrap">
              <image class="comment-avatar" :src="c.avatarUrl" mode="aspectFill" />
            </view>
            <view v-else class="comment-avatar comment-avatar--placeholder">
              <text>{{ authorInitial(c.nickName) }}</text>
            </view>
            <view class="comment-main">
              <view class="comment-head">
                <text class="comment-author">{{ c.nickName || '微信用户' }}</text>
                <star-rating v-if="c.rating" :rating="c.rating" size="12" />
              </view>
              <text class="comment-body">{{ c.content }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    </view>

    <!-- 底部固定栏：假输入框 + 高德 / 收藏 / 评论 -->
    <view class="dock-bar">
      <view class="dock-input-fake" @tap="openCommentPanel">
        <text class="dock-input-placeholder">写几句吃过的感受…</text>
      </view>
      <view class="dock-actions">
        <view class="dock-action" @tap.stop="openPlatform">
          <uni-icons type="location" size="22" color="#1a1a1z" />
        </view>
        <view class="dock-action" :class="{ active: favorited }" @tap.stop="toggleFavoriteState">
          <uni-icons
            :type="favorited ? 'star-filled' : 'star'"
            size="22"
            :color="favorited ? '#ff9500' : '#1a1a1z'"
          />
        </view>
        <view
          class="dock-action dock-action--dislike"
          :class="{ active: disliked }"
          @tap.stop="toggleDislikeState"
        >
          <uni-icons
            :type="disliked ? 'hand-down-filled' : 'hand-down'"
            size="22"
            :color="disliked ? '#666666' : '#1a1a1z'"
          />
        </view>
        <view class="dock-action" @tap.stop="scrollToComments">
          <uni-icons type="chatbubble" size="22" color="#1a1a1z" />
          <text v-if="commentCount > 0" class="dock-action-num">{{ commentCount }}</text>
        </view>
      </view>
    </view>

    <!-- 评论输入层（图2） -->
    <view v-if="commentPanelOpen" class="comment-sheet">
      <view class="sheet-mask" @tap="closeCommentPanel" />
      <view class="sheet-panel" @tap.stop>
        <view class="sheet-toolbar">
          <text class="sheet-cancel" @tap="closeCommentPanel">取消</text>
          <text class="sheet-title">写评价</text>
          <text class="sheet-send" @tap="submitComment">发送</text>
        </view>
        <star-rating
          class="sheet-stars"
          :rating="commentRating"
          :readonly="false"
          size="24"
          @change="commentRating = $event"
        />
        <view class="sheet-input-row">
          <textarea
            v-model="commentDraft"
            class="sheet-textarea"
            placeholder="真实发声，言之有物"
            maxlength="200"
            :focus="commentInputFocus"
            hold-keyboard
            :disabled="commentSubmitting"
            :adjust-position="true"
            :cursor-spacing="120"
            confirm-type="send"
            @confirm="submitComment"
          />
          <button
            class="sheet-send-btn"
            :loading="commentSubmitting"
            :disabled="commentSubmitting || !commentDraft.trim()"
            @tap="submitComment"
          >
            发送
          </button>
        </view>
        <scroll-view class="sheet-emoji-row" scroll-x enable-flex>
          <text
            v-for="(emo, i) in quickEmojis"
            :key="i"
            class="sheet-emoji"
            @tap.stop="appendEmoji(emo)"
          >{{ emo }}</text>
        </scroll-view>
      </view>
    </view>
  </view>
  <view v-else class="empty">未找到餐厅信息</view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { formatDistance, formatTravelTime } from '@/utils/util'
import { PLATFORMS } from '@/utils/constants'
import {
  isDisliked,
  isFavorite,
  toggleDislike,
  toggleFavorite
} from '@/services/restaurant-lists'
import { fetchComments, postComment } from '@/services/comments'
import { getCloudBlockReason, runCloudDiagnostics } from '@/services/cloud'
import {
  fetchUserProfile,
  isProfileReady,
  profileAuthorInitial,
  promptProfileSetup,
  requireProfileForComment
} from '@/services/user-profile'
import type { UserProfile } from '@/types/user-profile'
import type { Comment } from '@/types/comment'
import type { Restaurant } from '@/types/restaurant'
import type { PlatformId } from '@/types/platform'

const DEFAULT_IMG = '/static/images/default-shop.png'

const item = ref<Restaurant | null>(null)
const currentSlide = ref(0)
const favorited = ref(false)
const disliked = ref(false)
const comments = ref<Comment[]>([])
const commentsLoading = ref(false)
const commentsError = ref('')
const commentDraft = ref('')
const commentRating = ref(5)
const commentSubmitting = ref(false)
const myProfile = ref<UserProfile>({ nickName: '', avatarUrl: '' })
const profileReady = computed(() => isProfileReady(myProfile.value))
const commentPanelOpen = ref(false)
const commentInputFocus = ref(false)
const commentCount = computed(() => comments.value.length)
const quickEmojis = ['😋', '👍', '🔥', '😊', '🤤', '👏', '❤️']

const galleryImages = computed(() => {
  if (!item.value) return [DEFAULT_IMG]
  const imgs = item.value.images?.filter(Boolean)
  if (imgs?.length) return imgs
  return [item.value.cover || DEFAULT_IMG]
})

const tagList = computed(() => {
  if (!item.value) return []
  const raw = item.value.tag
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((t) => t.trim()).filter(Boolean)
  }
  return Array.isArray(item.value.tags) ? item.value.tags : []
})

/** 色条最大刻度：1km */
const DISTANCE_BAR_MAX = 1000
/** 步行 / 骑车参考时速（km/h） */
const WALK_SPEED_KMH = 5
const BIKE_SPEED_KMH = 15

const distanceMeters = computed(() => item.value?.distance ?? 0)

const distanceMarkerPercent = computed(() => {
  const d = distanceMeters.value
  if (d <= 0) return 0
  return Math.min((d / DISTANCE_BAR_MAX) * 100, 100)
})

const distanceZone = computed(() => {
  const d = distanceMeters.value
  if (d <= 300) return 'near'
  if (d <= 600) return 'mid'
  return 'far'
})

const walkTimeText = computed(() =>
  formatTravelTime(distanceMeters.value, WALK_SPEED_KMH)
)

const bikeTimeText = computed(() =>
  formatTravelTime(distanceMeters.value, BIKE_SPEED_KMH)
)

function onSwiperChange(e: { detail: { current: number } }) {
  currentSlide.value = e.detail.current
}

function authorInitial(name?: string) {
  return profileAuthorInitial(name || '')
}

async function refreshMyProfile() {
  try {
    myProfile.value = await fetchUserProfile()
  } catch {
    /* ignore */
  }
}

onShow(() => {
  refreshMyProfile()
  if (item.value?.id) {
    favorited.value = isFavorite(item.value.id)
    disliked.value = isDisliked(item.value.id)
  }
})

onLoad(() => {
  const data = uni.getStorageSync('detailRestaurant') as Restaurant | undefined
  if (data) {
    item.value = {
      ...data,
      distanceText: data.distanceText || formatDistance(data.distance || 0)
    }
    favorited.value = isFavorite(data.id)
    disliked.value = isDisliked(data.id)
    loadComments()
  }
})

async function loadComments() {
  if (!item.value?.id) return
  const block = getCloudBlockReason()
  if (block) {
    commentsError.value = block
    return
  }
  commentsLoading.value = true
  commentsError.value = ''
  try {
    const res = await fetchComments(item.value.id)
    comments.value = res.list
  } catch (e) {
    commentsError.value = (e as Error).message || '加载失败'
  } finally {
    commentsLoading.value = false
  }
}

async function runCloudDiag() {
  uni.showLoading({ title: '诊断中' })
  try {
    const d = await runCloudDiagnostics()
    const lines = [
      `AppID: ${d.appId}`,
      `环境: ${d.envId}`,
      d.ping?.code === 0 ? 'ping: 成功' : `ping: ${d.pingError || JSON.stringify(d.ping)}`,
      d.dbError ? `数据库读: 失败 ${d.dbError}` : '数据库读: 成功'
    ]
    commentsError.value = lines.join('\n')
    uni.showModal({ title: '云开发诊断', content: lines.join('\n'), showCancel: false })
  } catch (e) {
    uni.showToast({ title: (e as Error).message, icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function openCommentPanel() {
  if (!profileReady.value) {
    promptProfileSetup()
    return
  }
  commentPanelOpen.value = true
  commentInputFocus.value = false
  nextTick(() => {
    commentInputFocus.value = true
  })
}

function closeCommentPanel() {
  commentPanelOpen.value = false
  commentInputFocus.value = false
}

function appendEmoji(emo: string) {
  if (commentDraft.value.length + emo.length > 200) return
  commentDraft.value += emo
}

function scrollToComments() {
  uni.pageScrollTo({
    selector: '#comments-anchor',
    offsetTop: -80,
    duration: 280
  })
}

async function submitComment() {
  if (!item.value?.id || !commentDraft.value.trim()) return
  const block = getCloudBlockReason()
  if (block) {
    uni.showToast({ title: '请配置正式 AppID', icon: 'none' })
    commentsError.value = block
    return
  }
  commentSubmitting.value = true
  try {
    const profile = await requireProfileForComment()
    await postComment({
      restaurantId: item.value.id,
      content: commentDraft.value,
      rating: commentRating.value,
      nickName: profile.nickName,
      avatarUrl: profile.avatarUrl
    })
    commentDraft.value = ''
    closeCommentPanel()
    uni.showToast({ title: '已发表', icon: 'success' })
    await loadComments()
  } catch (e) {
    const msg = (e as Error).message
    if (msg === 'PROFILE_INCOMPLETE') {
      closeCommentPanel()
      promptProfileSetup()
    } else {
      uni.showToast({ title: msg || '发表失败', icon: 'none' })
    }
  } finally {
    commentSubmitting.value = false
  }
}

async function toggleFavoriteState() {
  if (!item.value) return
  try {
    const added = await toggleFavorite(item.value)
    favorited.value = added
    if (added) disliked.value = false
    uni.showToast({ title: added ? '已收藏' : '已取消收藏', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '操作失败', icon: 'none' })
  }
}

async function toggleDislikeState() {
  if (!item.value) return
  try {
    const added = await toggleDislike(item.value)
    disliked.value = added
    if (added) favorited.value = false
    uni.showToast({ title: added ? '已加入不喜欢' : '已移出不喜欢', icon: 'none' })
    if (added) {
      const app = getApp() as import('@/types/global').UniAppInstance
      app.globalData.needRefreshList = true
    }
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '操作失败', icon: 'none' })
  }
}

function openPlatform() {
  const data = item.value
  if (!data) return
  if (data.platform === 'amap' && data.latitude && data.longitude) {
    uni.openLocation({
      latitude: data.latitude,
      longitude: data.longitude,
      name: data.name,
      address: data.address || ''
    })
    return
  }
  if (data.h5Url) {
    uni.setClipboardData({
      data: data.h5Url,
      success: () => uni.showToast({ title: '地图链接已复制', icon: 'none' })
    })
    return
  }
  const p = PLATFORMS[data.platform as PlatformId]
  uni.showToast({ title: `暂无${p?.name || ''}跳转`, icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $page-bg;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.page-scroll {
  min-height: 100%;
}
.hero-wrap {
  position: relative;
  width: 100%;
  height: 400rpx;
  background: #eee;
}
.hero-swiper {
  width: 100%;
  height: 100%;
}
.hero {
  width: 100%;
  height: 100%;
}
.hero-counter {
  position: absolute;
  right: 24rpx;
  bottom: 24rpx;
  padding: 6rpx 16rpx;
  font-size: 22rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 20rpx;
  z-index: 2;
}
.content {
  margin-top: -32rpx;
  padding: 32rpx;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
}
.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding-top: 24rpx;
  margin-bottom: 32rpx;
}
.name {
  font-size: 40rpx;
  font-weight: 700;
  flex: 1;
}
.stats {
  display: flex;
  justify-content: space-around;
  padding: 24rpx 0;
  border-top: 1rpx solid $border;
  border-bottom: 1rpx solid $border;
  margin-bottom: 32rpx;
}
.stat {
  text-align: center;
}
.val {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $primary;
}
.lbl {
  font-size: 22rpx;
  color: $text-muted;
}
.distance-bar-section {
  margin-bottom: 32rpx;
}
.distance-bar-wrap {
  position: relative;
  padding-top: 56rpx;
}
.distance-bar {
  display: flex;
  height: 16rpx;
  border-radius: 8rpx;
  overflow: hidden;
}
.bar-seg {
  height: 100%;
}
.bar-seg--near {
  flex: 0 0 30%;
  background: linear-gradient(90deg, #34c759, #52d869);
}
.bar-seg--mid {
  flex: 0 0 30%;
  background: linear-gradient(90deg, #f5d547, #ffcc00);
}
.bar-seg--far {
  flex: 1;
  background: linear-gradient(90deg, #ff9500, #ff3b30);
}
.distance-marker {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
  transition: left 0.25s ease;
}
.marker-label {
  font-size: 22rpx;
  font-weight: 600;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  color: #fff;
  white-space: nowrap;
  margin-bottom: 6rpx;
}
.distance-marker.near .marker-label {
  background: #34c759;
}
.distance-marker.mid .marker-label {
  background: #e6b800;
}
.distance-marker.far .marker-label {
  background: #ff3b30;
}
.marker-pin {
  width: 0;
  height: 0;
  border-left: 10rpx solid transparent;
  border-right: 10rpx solid transparent;
  border-top: 12rpx solid currentColor;
}
.distance-marker.near .marker-pin {
  color: #34c759;
}
.distance-marker.mid .marker-pin {
  color: #e6b800;
}
.distance-marker.far .marker-pin {
  color: #ff3b30;
}
.distance-scale {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
  font-size: 20rpx;
  color: $text-muted;
}
.travel-time-row {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 20rpx 24rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
}
.travel-time-item {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 12rpx;
}
.travel-mode {
  font-size: 24rpx;
  color: $text-muted;
}
.travel-duration {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
}
.travel-time-divider {
  width: 1rpx;
  height: 32rpx;
  background: $border;
  flex-shrink: 0;
}
.section {
  margin-bottom: 28rpx;
  font-size: 28rpx;
  color: $text-secondary;
  line-height: 1.6;
}
.section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 8rpx;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.tag {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  background: $primary-light;
  color: $primary;
  border-radius: 8rpx;
}
.hint-box {
  background: #f9f9f9;
  padding: 20rpx;
  border-radius: 12rpx;
}
.hint {
  font-size: 24rpx;
  color: $text-muted;
}
.comments-section {
  padding-top: 8rpx;
  border-top: 1rpx solid $border;
}
.comments-hint {
  font-size: 24rpx;
  color: $text-muted;
  padding: 8rpx 0 16rpx;
}
.comments-hint--err {
  color: #e1251b;
  white-space: pre-wrap;
  font-size: 22rpx;
  line-height: 1.5;
}
.cloud-diag-btn {
  margin-bottom: 12rpx;
  padding: 12rpx 16rpx;
  font-size: 24rpx;
  color: $primary;
  background: $primary-light;
  border-radius: 8rpx;
}
.comment-list {
  margin-bottom: 20rpx;
}
.comment-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.comment-avatar-wrap,
.comment-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
}
.comment-avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffb347, $primary);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}
.comment-main {
  flex: 1;
  min-width: 0;
}
.comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.comment-author {
  font-size: 24rpx;
  font-weight: 600;
  color: $text-primary;
}
.comment-body {
  font-size: 26rpx;
  color: $text-secondary;
  line-height: 1.5;
}

/* 底部固定栏 */
.dock-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 20rpx calc(12rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid $border;
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.06);
}
.dock-input-fake {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  background: #f2f3f5;
  border-radius: 36rpx;
}
.dock-input-placeholder {
  font-size: 26rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dock-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.dock-action {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 64rpx;
  padding: 4rpx 8rpx;
}
.dock-action-num {
  font-size: 24rpx;
  color: #1a1a1a;
  margin-top: 2rpx;
  line-height: 1.2;
}

/* 评论输入弹层 */
.comment-sheet {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.sheet-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}
.sheet-panel {
  position: relative;
  z-index: 1;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
}
.sheet-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.sheet-cancel {
  font-size: 28rpx;
  color: $text-muted;
  padding: 8rpx 0;
}
.sheet-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}
.sheet-send {
  font-size: 28rpx;
  color: $primary;
  font-weight: 600;
  padding: 8rpx 0;
}
.sheet-stars {
  margin-bottom: 16rpx;
}
.sheet-input-row {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.sheet-textarea {
  flex: 1;
  min-height: 72rpx;
  max-height: 200rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  background: #f2f3f5;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.sheet-send-btn {
  flex-shrink: 0;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 28rpx;
  font-size: 28rpx;
  color: #fff;
  background: $primary;
  border-radius: 36rpx;
  border: none;
}
.sheet-send-btn::after {
  border: none;
}
.sheet-emoji-row {
  white-space: nowrap;
  height: 72rpx;
}
.sheet-emoji {
  display: inline-block;
  font-size: 48rpx;
  padding: 0 12rpx;
  line-height: 72rpx;
}

.empty {
  padding: 120rpx;
  text-align: center;
  color: $text-muted;
}
</style>
