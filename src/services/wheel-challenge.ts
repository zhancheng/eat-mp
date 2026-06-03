import { callCloudFunction } from './cloud'
import type { SavedRestaurant } from '@/types/restaurant-list'
import type {
  GuestListSource,
  WheelChallengeState,
  WheelSpinResult
} from '@/types/wheel-challenge'

async function callWheelChallenge<T>(
  action: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  const res = await callCloudFunction<T>('wheelChallenge', { action, ...data })
  if (res.code !== 0 || !res.data) {
    throw new Error(res.message || '操作失败')
  }
  return res.data
}

export async function createWheelChallenge(items: SavedRestaurant[]): Promise<WheelChallengeState> {
  return callWheelChallenge<WheelChallengeState>('create', { items })
}

export async function joinWheelChallenge(challengeId: string): Promise<WheelChallengeState> {
  return callWheelChallenge<WheelChallengeState>('join', { challengeId })
}

export async function getWheelChallenge(challengeId: string): Promise<WheelChallengeState> {
  return callWheelChallenge<WheelChallengeState>('get', { challengeId })
}

export async function setGuestListSource(
  challengeId: string,
  source: GuestListSource,
  guestItems?: SavedRestaurant[]
): Promise<WheelChallengeState> {
  return callWheelChallenge<WheelChallengeState>('setGuestListSource', {
    challengeId,
    source,
    guestItems: guestItems || []
  })
}

export async function spinWheelChallenge(challengeId: string): Promise<{
  state: WheelChallengeState
  spin: WheelSpinResult
}> {
  return callWheelChallenge<{ state: WheelChallengeState; spin: WheelSpinResult }>('spin', {
    challengeId
  })
}

export async function revealWheelChallenge(challengeId: string): Promise<WheelChallengeState> {
  return callWheelChallenge<WheelChallengeState>('revealSpin', { challengeId })
}
