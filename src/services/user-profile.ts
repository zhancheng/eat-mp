import { callCloudFunction, getCloudBlockReason, initCloud, uploadCloudFile } from './cloud'
import type { UserProfile } from '@/types/user-profile'

const STORAGE_KEY = 'userProfile'

const EMPTY_PROFILE: UserProfile = { nickName: '', avatarUrl: '' }

export function loadLocalUserProfile(): UserProfile {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw && typeof raw === 'object') {
      return {
        nickName: String(raw.nickName || ''),
        avatarUrl: String(raw.avatarUrl || '')
      }
    }
  } catch {
    /* ignore */
  }
  return { ...EMPTY_PROFILE }
}

function saveLocalUserProfile(profile: UserProfile): void {
  uni.setStorageSync(STORAGE_KEY, {
    nickName: profile.nickName.slice(0, 32),
    avatarUrl: profile.avatarUrl.slice(0, 512)
  })
}

export function isProfileReady(profile: UserProfile): boolean {
  return !!profile.nickName.trim()
}

/** 从云端拉取资料并写入本地缓存 */
export async function fetchUserProfile(force = false): Promise<UserProfile> {
  if (!force) {
    const local = loadLocalUserProfile()
    if (isProfileReady(local)) return local
  }
  const block = getCloudBlockReason()
  if (block) {
    return loadLocalUserProfile()
  }
  try {
    const res = await callCloudFunction<UserProfile>('getUserProfile', {})
    if (res.code === 0 && res.data) {
      const profile: UserProfile = {
        nickName: res.data.nickName || '',
        avatarUrl: res.data.avatarUrl || ''
      }
      saveLocalUserProfile(profile)
      return profile
    }
  } catch (e) {
    console.warn('[user-profile] fetch failed', e)
  }
  return loadLocalUserProfile()
}

/** 保存到云端并更新本地 */
export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  const payload: UserProfile = {
    nickName: profile.nickName.trim(),
    avatarUrl: profile.avatarUrl.trim()
  }
  if (!payload.nickName) {
    throw new Error('请填写昵称')
  }
  const res = await callCloudFunction<UserProfile>(
    'saveUserProfile',
    payload as unknown as Record<string, unknown>
  )
  if (res.code !== 0) {
    throw new Error(res.message || '保存失败')
  }
  const saved = res.data || payload
  saveLocalUserProfile(saved)
  return saved
}

/** 发表评论前获取资料（须已在「我的」设置昵称） */
export async function requireProfileForComment(): Promise<UserProfile> {
  const profile = await fetchUserProfile()
  if (!isProfileReady(profile)) {
    throw new Error('PROFILE_INCOMPLETE')
  }
  return profile
}

export function goToMineProfile(): void {
  uni.switchTab({ url: '/pages/mine/mine' })
}

export function promptProfileSetup(): void {
  uni.showModal({
    title: '完善资料',
    content: '请先在「我的」页面设置昵称，之后评论将自动使用该资料。',
    confirmText: '去设置',
    success: (res) => {
      if (res.confirm) goToMineProfile()
    }
  })
}

/** 将 chooseAvatar 临时路径上传到云存储 */
export async function persistAvatar(tempFilePath: string): Promise<string> {
  if (!tempFilePath) return ''
  if (tempFilePath.startsWith('cloud://')) return tempFilePath
  if (!initCloud()) {
    throw new Error('云开发未就绪，无法上传头像')
  }
  const ext = tempFilePath.includes('.') ? tempFilePath.split('.').pop() : 'png'
  const cloudPath = `comment-avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return uploadCloudFile(cloudPath, tempFilePath)
}

export function profileAuthorInitial(name: string): string {
  const t = (name || '友').trim()
  return t ? t.slice(0, 1) : '友'
}
