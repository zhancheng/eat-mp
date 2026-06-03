<template>
  <view class="page">
    <!-- 发起者选择餐厅面板 -->
    <view v-if="showPicker" class="picker-panel">
      <view class="picker-header">
        <text class="picker-title">选择对战餐厅</text>
        <text class="picker-hint">从收藏列表勾选或使用全部</text>
      </view>

      <view class="picker-mode-bar">
        <view
          class="mode-tab"
          :class="{ active: pickerMode === 'all' }"
          @tap="switchPickerMode('all')"
        >
          全部 {{ allFavorites.length }}
        </view>
        <view
          class="mode-tab"
          :class="{ active: pickerMode === 'pick' }"
          @tap="goPickerPick"
        >
          勾选 {{ pickerCheckedCount > 0 ? pickerCheckedCount : '' }}
        </view>
      </view>

      <!-- <view v-if="pickerMode === 'all'" class="picker-all-hint">
        <text>将使用全部 {{ allFavorites.length }} 家餐厅发起对战</text>
      </view> -->

      <view class="picker-actions">
        <button
          class="picker-confirm-btn"
          @tap="confirmPicker"
        >
          确定 ({{ effectivePickerItems.length }})
        </button>
        <button class="picker-cancel-btn" @tap="cancelPicker">取消</button>
      </view>
    </view>

    <view v-if="showPicker" class="picker-mask" />
    <view class="arena-header">
      <text class="arena-sub">双人擂台 · 比评分定胜负</text>
    </view>

    <view class="fighters">
      <view
        class="fighter"
        :class="{
          active:
            state?.status === 'host_spinning' ||
            (state?.currentTurn === 'host' && state?.status !== 'finished'),
          winner: state?.winner === 'host'
        }"
      >
        <image
          v-if="hostAvatarUrl"
          class="avatar"
          :src="hostAvatarUrl"
          mode="aspectFill"
        />
        <view v-else class="avatar avatar-fallback">{{ hostInitial }}</view>
        <view class="fighter-content">
          <view class="fighter-header">
            <text class="fighter-tag">发起者</text>
            <text class="fighter-name">{{ state?.hostProfile.nickName || '发起者' }}</text>
          </view>
          <text v-if="state?.hostSpin" class="shop-name">{{ state.hostSpin.restaurant.name }}</text>
          <text v-else-if="state?.status === 'host_spinning'" class="fighter-hint">转动中...</text>
          <text v-else-if="state?.status === 'ready'" class="fighter-hint">等待开转</text>
        </view>
        <text v-if="state?.hostSpin" class="pk-score">{{ state.hostSpin.pkScore }} 分</text>
      </view>

      <view class="vs-badge">VS</view>

      <view
        class="fighter"
        :class="{
          active:
            state?.status === 'guest_spinning' ||
            (state?.currentTurn === 'guest' && state?.status !== 'finished'),
          winner: state?.winner === 'guest'
        }"
      >
        <template v-if="state?.guestProfile">
          <image
            v-if="guestAvatarUrl"
            class="avatar"
            :src="guestAvatarUrl"
            mode="aspectFill"
          />
          <view v-else class="avatar avatar-fallback">{{ guestInitial }}</view>
          <view class="fighter-content">
            <view class="fighter-header">
              <text class="fighter-tag">挑战者</text>
              <text class="fighter-name">{{ state.guestProfile.nickName }}</text>
            </view>
            <text v-if="state.guestSpin" class="shop-name">{{ state.guestSpin.restaurant.name }}</text>
            <text v-else-if="state?.status === 'guest_spinning'" class="fighter-hint">转动中...</text>
            <text v-else-if="state?.status === 'host_spun'" class="fighter-hint">轮到你啦</text>
          </view>
          <text v-if="state.guestSpin" class="pk-score">{{ state.guestSpin.pkScore }} 分</text>
        </template>
        <template v-else>
          <view class="avatar avatar-empty">
            <uni-icons type="person-filled" size="24" color="rgba(255,255,255,0.5)" />
          </view>
          <view class="fighter-content">
            <view class="fighter-header">
              <text class="fighter-tag">挑战者</text>
              <text class="fighter-name muted">等待加入</text>
            </view>
          </view>
        </template>
      </view>
    </view>

    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="state">
      <view v-if="state.status === 'choosing' && state.role === 'guest'" class="source-panel">
        <text class="source-title">选择你的抽奖池</text>
        <text class="source-hint">没有收藏？可以用发起者的餐厅，或先去添加自己的收藏</text>
        <button class="source-btn primary" @tap="chooseHostList">
          使用发起者的收藏（{{ state.hostItemCount }} 家）
        </button>
        <button v-if="myFavoriteCount > 0" class="source-btn" @tap="chooseOwnList">
          使用我的收藏（{{ myFavoriteCount }} 家）
        </button>
        <button v-else class="source-btn outline" @tap="goAddFavorites">去添加我的收藏</button>
      </view>

      <template v-else>
        <lucky-wheel v-if="wheelItems.length" ref="wheelRef" :items="wheelItems" />
        <view v-else class="wheel-empty">
          <text>暂无可用餐厅</text>
        </view>

        <view class="actions">
          <view v-if="state.status === 'waiting' && state.role === 'host'" class="wait-block">
            <text class="wait-text">邀请饭搭子加入擂台</text>
            <button class="share-btn" open-type="share">
              <uni-icons type="weixin" size="18" color="#ffffff" />
              <text>分享到微信</text>
            </button>
          </view>

          <view v-else-if="state.status === 'waiting'" class="wait-block">
            <text class="wait-text">等待发起者分享邀请...</text>
          </view>

          <view v-else-if="state.status === 'choosing' && state.role === 'host'" class="wait-block">
            <text class="wait-text">挑战者正在选择抽奖池...</text>
          </view>

          <button
            v-else-if="canSpin"
            class="spin-btn"
            :disabled="spinning || !wheelItems.length"
            :loading="spinning"
            @tap="handleSpin"
          >
            {{ spinning ? '转动中...' : spinBtnText }}
          </button>

          <text v-else-if="state.status === 'host_spinning'" class="turn-hint">
            {{ state.role === 'host' ? '转动中...' : '发起者正在转动' }}
          </text>
          <text v-else-if="state.status === 'guest_spinning'" class="turn-hint">
            {{ state.role === 'guest' ? '转动中...' : '挑战者正在转动' }}
          </text>
          <text v-else-if="state.status === 'ready' && state.role === 'guest'" class="turn-hint">
            等待发起者先抽
          </text>
          <text v-else-if="state.status === 'host_spun' && state.role === 'host'" class="turn-hint">
            等待挑战者抽
          </text>
          <text v-else-if="state.status === 'finished'" class="turn-hint">
            挑战已结束
          </text>

          <text v-if="wheelItems.length && state.status !== 'waiting'" class="pool-hint">
            当前奖池 {{ wheelItems.length }} 家
          </text>
        </view>
      </template>
    </template>

    <view v-if="state?.status === 'finished' && showResult" class="result-modal">
      <view class="result-mask" />
      <view class="result-panel" @tap.stop>
        <uni-icons class="result-icon" :type="resultIconType" size="48" color="#FF6B35" />
        <text class="result-title">{{ resultTitle }}</text>
        <text class="result-desc">{{ resultDesc }}</text>
        <view class="score-compare">
          <view class="score-item">
            <text class="score-label">发起者</text>
            <text class="score-num">{{ state.hostSpin?.pkScore ?? 0 }}</text>
          </view>
          <text class="score-vs">:</text>
          <view class="score-item">
            <text class="score-label">挑战者</text>
            <text class="score-num">{{ state.guestSpin?.pkScore ?? 0 }}</text>
          </view>
        </view>
        <button class="result-btn" @tap="closeResult">知道了</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { onLoad, onShow, onUnload, onShareAppMessage } from '@dcloudio/uni-app'
import {
  createWheelChallenge,
  getWheelChallenge,
  joinWheelChallenge,
  setGuestListSource,
  revealWheelChallenge,
  spinWheelChallenge
} from '@/services/wheel-challenge'
import {
  getFavorites,
  initRestaurantLists,
  refreshRestaurantLists
} from '@/services/restaurant-lists'
import { getCloudBlockReason, resolveAvatarDisplayUrl } from '@/services/cloud'
import { profileAuthorInitial } from '@/services/user-profile'
import { formatDistance } from '@/utils/util'
import type { WheelItem } from '@/types/restaurant'
import type { WheelChallengeState } from '@/types/wheel-challenge'
import type { SavedRestaurant } from '@/types/restaurant-list'
import type LuckyWheel from '@/components/lucky-wheel/lucky-wheel.vue'

const challengeId = ref('')
const state = ref<WheelChallengeState | null>(null)
const wheelItems = ref<WheelItem[]>([])
const wheelRef = ref<InstanceType<typeof LuckyWheel> | null>(null)
const loading = ref(true)
const spinning = ref(false)
const myFavoriteCount = ref(0)
const showResult = ref(true)
const hostAvatarUrl = ref('')
const guestAvatarUrl = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null
let pendingOwnList = false

// 发起者餐厅选择相关
const allFavorites = ref<SavedRestaurant[]>([])
const selectedItems = ref<SavedRestaurant[]>([])
const showPicker = ref(false)
const pickerMode = ref<'all' | 'pick'>('all')

function getPreselectedItems(): SavedRestaurant[] {
  try {
    const raw = uni.getStorageSync('wheelChallengeItems')
    if (Array.isArray(raw) && raw.length > 0) return raw as SavedRestaurant[]
  } catch { /* ignore */ }
  return []
}

function clearPreselectedItems() {
  try {
    uni.removeStorageSync('wheelChallengeItems')
  } catch { /* ignore */ }
}

const pickedIds = ref(new Set<string>())

const pickerCheckedCount = computed(() => pickedIds.value.size)

const effectivePickerItems = computed(() => {
  if (pickerMode.value === 'pick' && pickedIds.value.size > 0) {
    return allFavorites.value.filter((item) => pickedIds.value.has(item.id))
  }
  return allFavorites.value
})

const hostInitial = computed(() =>
  profileAuthorInitial(state.value?.hostProfile.nickName || '发')
)
const guestInitial = computed(() =>
  profileAuthorInitial(state.value?.guestProfile?.nickName || '友')
)

const canSpin = computed(() => {
  if (!state.value || spinning.value) return false
  if (state.value.status === 'ready' && state.value.role === 'host') return true
  if (state.value.status === 'host_spun' && state.value.role === 'guest') return true
  return false
})

const spinBtnText = computed(() => {
  if (!state.value) return '开始转动'
  return state.value.role === 'host' ? '发起者开转' : '挑战者开转'
})

const resultIconType = computed(() => {
  if (!state.value) return 'fire-filled'
  if (state.value.winner === 'tie') return 'auth-filled'
  if (state.value.winner === state.value.role) return 'medal-filled'
  return 'heart-filled'
})

const resultTitle = computed(() => {
  if (!state.value) return ''
  if (state.value.winner === 'tie') return '平局！'
  if (state.value.winner === 'host') {
    return state.value.role === 'host' ? '你赢了！' : '发起者获胜'
  }
  return state.value.role === 'guest' ? '你赢了！' : '挑战者获胜'
})

const resultDesc = computed(() => {
  if (!state.value?.winner || state.value.winner === 'tie') {
    return '双方评分相同，今天吃哪家都行'
  }
  const winSpin =
    state.value.winner === 'host' ? state.value.hostSpin : state.value.guestSpin
  return winSpin ? `就去吃 ${winSpin.restaurant.name} 吧` : ''
})

onShareAppMessage(() => ({
  title: `${state.value?.hostProfile.nickName || '饭友'}向你发起饭局轮盘挑战！`,
  path: `/pages/wheel-challenge/wheel-challenge?challengeId=${encodeURIComponent(challengeId.value)}`
}))

onLoad(async (opts) => {
  const block = getCloudBlockReason()
  if (block) {
    uni.showModal({ title: '无法发起挑战', content: block, showCancel: false })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }

  try {
    if (opts?.create === '1') {
      await initRestaurantLists()
      await refreshRestaurantLists()
      const allFavs = getFavorites()
      const preselected = getPreselectedItems()
      if (preselected.length > 0) {
        selectedItems.value = preselected
        clearPreselectedItems()
      }
      showPicker.value = true
      allFavorites.value = allFavs
    } else if (opts?.challengeId) {
      challengeId.value = String(opts.challengeId)
      await enterChallenge()
    } else {
      uni.showToast({ title: '无效的挑战链接', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
    }
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  } finally {
    loading.value = false
  }

  startPolling()
})

onShow(async () => {
  await refreshMyFavorites()
  if (pendingOwnList && myFavoriteCount.value > 0 && state.value?.role === 'guest') {
    pendingOwnList = false
    uni.showModal({
      title: '已添加收藏',
      content: `检测到 ${myFavoriteCount.value} 家收藏，是否使用你的收藏参与挑战？`,
      confirmText: '使用我的',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) chooseOwnList()
      }
    })
  }
})

onUnload(() => {
  stopPolling()
  uni.$off('challenge-pick-confirmed', onChallengePickConfirmed)
})

async function refreshMyFavorites() {
  try {
    await initRestaurantLists()
    await refreshRestaurantLists()
    myFavoriteCount.value = getFavorites().length
  } catch {
    myFavoriteCount.value = 0
  }
}

async function enterChallenge() {
  let next = await getWheelChallenge(challengeId.value)
  if (next.role === 'none') {
    next = await joinWheelChallenge(challengeId.value)
  }
  await applyState(next)
}

function shortLabel(name: string) {
  if (!name) return ''
  return name.length > 8 ? name.slice(0, 7) + '...' : name
}

function mapWheelItems(items: WheelChallengeState['wheelItems']): WheelItem[] {
  return items.map((item) => ({
    ...item,
    label: shortLabel(item.name),
    distanceText: item.distanceText || formatDistance(item.distance || 0)
  }))
}

function avatarUrlKey(url: string): string {
  const raw = (url || '').trim()
  if (!raw || raw.startsWith('cloud://')) return raw
  return raw.split('?')[0]
}

function shouldApplyPollUpdate(
  prev: WheelChallengeState | null,
  next: WheelChallengeState
): boolean {
  if (!prev) return true
  if (prev.status !== next.status) return true
  if (prev.currentTurn !== next.currentTurn) return true
  if (prev.winner !== next.winner) return true
  if (!!prev.guestProfile !== !!next.guestProfile) return true
  if (prev.guestListSource !== next.guestListSource) return true
  if (prev.hostSpin?.index !== next.hostSpin?.index) return true
  if (prev.guestSpin?.index !== next.guestSpin?.index) return true
  if (prev.wheelItems.length !== next.wheelItems.length) return true
  if (prev.hostProfile?.nickName !== next.hostProfile?.nickName) return true
  if (prev.guestProfile?.nickName !== next.guestProfile?.nickName) return true
  if (
    avatarUrlKey(prev.hostProfile?.avatarUrl || '') !==
    avatarUrlKey(next.hostProfile?.avatarUrl || '')
  ) {
    return true
  }
  if (
    avatarUrlKey(prev.guestProfile?.avatarUrl || '') !==
    avatarUrlKey(next.guestProfile?.avatarUrl || '')
  ) {
    return true
  }
  return false
}

async function applyState(next: WheelChallengeState) {
  state.value = next
  wheelItems.value = mapWheelItems(next.wheelItems)

  const nextHostRaw = next.hostProfile?.avatarUrl || ''
  const nextGuestRaw = next.guestProfile?.avatarUrl || ''

  if (nextHostRaw) {
    hostAvatarUrl.value = await resolveAvatarDisplayUrl(nextHostRaw)
  } else {
    hostAvatarUrl.value = ''
  }

  if (nextGuestRaw) {
    guestAvatarUrl.value = await resolveAvatarDisplayUrl(nextGuestRaw)
  } else {
    guestAvatarUrl.value = ''
  }
}

async function refreshState() {
  if (!challengeId.value || spinning.value) return
  try {
    const next = await getWheelChallenge(challengeId.value)
    const needsAvatarRetry =
      (!!next.hostProfile?.avatarUrl && !hostAvatarUrl.value) ||
      (!!next.guestProfile?.avatarUrl && !guestAvatarUrl.value)
    if (!needsAvatarRetry && !shouldApplyPollUpdate(state.value, next)) return
    await applyState(next)
  } catch {
    /* ignore poll errors */
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (spinning.value) return
    const s = state.value
    if (!s || s.status === 'finished') return
    refreshState()
  }, 500)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function chooseHostList() {
  if (!challengeId.value) return
  loading.value = true
  try {
    const next = await setGuestListSource(challengeId.value, 'host')
    await applyState(next)
  } catch (e) {
    uni.showToast({ title: (e as Error).message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function chooseOwnList() {
  if (!challengeId.value) return
  const favs = getFavorites()
  if (!favs.length) {
    goAddFavorites()
    return
  }
  loading.value = true
  try {
    const next = await setGuestListSource(challengeId.value, 'own', favs)
    await applyState(next)
  } catch (e) {
    uni.showToast({ title: (e as Error).message, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goAddFavorites() {
  pendingOwnList = true
  uni.switchTab({ url: '/pages/index/index' })
}

function goPickerPick() {
  pickerMode.value = 'pick'
  uni.$once('challenge-pick-confirmed', onChallengePickConfirmed)
  uni.navigateTo({ url: '/pages/wheel-pick/wheel-pick?purpose=challenge' })
}

function onChallengePickConfirmed(ids: string[]) {
  if (ids.length > 0) {
    pickerMode.value = 'pick'
    pickedIds.value = new Set(ids)
  }
}

function switchPickerMode(mode: 'all' | 'pick') {
  pickerMode.value = mode
}

async function confirmPicker() {
  const items = effectivePickerItems.value
  if (!items.length) return
  loading.value = true
  showPicker.value = false
  try {
    const created = await createWheelChallenge(items)
    challengeId.value = created.challengeId
    await applyState(created)
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '创建挑战失败', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  } finally {
    loading.value = false
  }
}

function cancelPicker() {
  showPicker.value = false
  setTimeout(() => uni.navigateBack(), 300)
}

async function handleSpin() {
  if (!canSpin.value || !wheelRef.value || !challengeId.value) return
  spinning.value = true
  try {
    const { spin } = await spinWheelChallenge(challengeId.value)
    await wheelRef.value.spinToIndex(spin.index)
    const next = await revealWheelChallenge(challengeId.value)
    await applyState(next)
    if (typeof uni.vibrateShort === 'function') {
      uni.vibrateShort({ type: 'medium' })
    }
    if (next.status === 'finished') {
      showResult.value = true
    }
  } catch (e) {
    uni.showToast({ title: (e as Error).message, icon: 'none' })
    await refreshState()
  } finally {
    spinning.value = false
  }
}

function closeResult() {
  showResult.value = false
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, $page-bg 100%);
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}
.arena-header {
  text-align: center;
  padding: 32rpx 32rpx 16rpx;
}
.arena-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
}
.arena-sub {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 8rpx;
}
.fighters {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 32rpx 32rpx 60rpx;
}
.fighter {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: $radius;
  border: 2rpx solid transparent;
  transition: all 0.3s;
}
.fighter.active {
  border-color: rgba(255, 107, 53, 0.6);
  background: rgba(255, 107, 53, 0.15);
}
.fighter.winner {
  border-color: #ffd700;
  box-shadow: 0 0 28rpx rgba(255, 215, 0, 0.4);
}
.avatar {
  flex-shrink: 0;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}
.fighter-content {
  flex: 1;
  min-width: 0;
}
.fighter-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}
.fighter-tag {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.55);
  padding: 4rpx 12rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
}
.fighter-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fighter-name.muted {
  color: rgba(255, 255, 255, 0.45);
}
.shop-name {
  display: block;
  font-size: 24rpx;
  color: #ffd700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pk-score {
  flex-shrink: 0;
  align-self: center;
  font-size: 32rpx;
  font-weight: 700;
  color: $primary;
}
.fighter-hint {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
}
.avatar-fallback,
.avatar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
}
.avatar-empty {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.5);
}
.vs-badge {
  flex-shrink: 0;
  align-self: center;
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #ff6b35, #e94560);
  border-radius: 50%;
}
.loading-wrap,
.wheel-empty {
  text-align: center;
  padding: 80rpx 32rpx;
  color: $text-muted;
}
.source-panel {
  margin: 24rpx 32rpx;
  padding: 32rpx;
  background: #fff;
  border-radius: $radius;
  box-shadow: $shadow;
}
.source-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $text-primary;
}
.source-hint {
  display: block;
  font-size: 24rpx;
  color: $text-muted;
  margin: 12rpx 0 24rpx;
  line-height: 1.5;
}
.source-btn {
  margin-top: 16rpx;
  border-radius: 48rpx;
  font-size: 28rpx;
  border: none;
  background: $primary-light;
  color: $primary;
}
.source-btn.primary {
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
}
.source-btn.outline {
  background: #fff;
  border: 2rpx solid $primary;
  color: $primary;
}
.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 32rpx;
}
.wait-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}
.wait-text,
.turn-hint,
.pool-hint {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.75);
}
.pool-hint {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.45);
}
.share-btn,
.spin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  width: 480rpx;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 48rpx;
  border: none;
}
.result-modal {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.result-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
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
.result-icon {
  display: block;
  margin-bottom: 8rpx;
}
.result-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: $text-primary;
  margin-top: 16rpx;
}
.result-desc {
  display: block;
  font-size: 26rpx;
  color: $text-muted;
  margin-top: 12rpx;
  line-height: 1.5;
}
.score-compare {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  margin: 32rpx 0;
}
.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.score-label {
  font-size: 22rpx;
  color: $text-muted;
}
.score-num {
  font-size: 48rpx;
  font-weight: 700;
  color: $primary;
}
.score-vs {
  font-size: 36rpx;
  font-weight: 700;
  color: $text-muted;
}
.result-btn {
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  border: none;
  border-radius: 48rpx;
  width: 100%;
}

/* 发起者选择餐厅面板 */
.picker-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.45);
}
.picker-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 101;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)) 32rpx;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.picker-header {
  text-align: center;
}
.picker-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: $text-primary;
}
.picker-hint {
  display: block;
  font-size: 24rpx;
  color: $text-muted;
  margin-top: 8rpx;
}
.picker-mode-bar {
  display: flex;
  background: $page-bg;
  border-radius: 40rpx;
  padding: 4rpx;
  gap: 4rpx;
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
.picker-list {
  flex: 1;
  overflow-y: auto;
  max-height: 500rpx;
  background: #fff;
  border-radius: $radius;
  border: 1rpx solid #f0f0f0;
}
.pick-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}
.pick-item:last-child {
  border-bottom: none;
}
.pick-item.checked .pick-checkbox {
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  border-color: #ff6b35;
}
.pick-checkbox {
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
.pick-name {
  font-size: 28rpx;
  color: $text-primary;
}
.picker-all-hint {
  text-align: center;
  padding: 32rpx;
  font-size: 28rpx;
  color: $text-secondary;
  background: #fff;
  border-radius: $radius;
  border: 1rpx solid #f0f0f0;
}
.picker-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.picker-confirm-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #ff6b35, #ff8c5a);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 48rpx;
  border: none;
}
.picker-cancel-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #fff;
  color: $text-muted;
  font-size: 28rpx;
  border-radius: 48rpx;
  border: 2rpx solid #e8e8e8;
}
</style>
