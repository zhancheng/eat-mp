import type { SavedRestaurant } from './restaurant-list'
import type { UserProfile } from './user-profile'

export type WheelChallengeStatus =
  | 'waiting'
  | 'choosing'
  | 'ready'
  | 'host_spinning'
  | 'host_spun'
  | 'guest_spinning'
  | 'finished'

export type WheelChallengeRole = 'host' | 'guest' | 'none'

export type WheelChallengeWinner = 'host' | 'guest' | 'tie'

export type GuestListSource = 'host' | 'own'

export interface WheelSpinResult {
  index: number
  restaurant: SavedRestaurant
  pkScore: number
}

export interface WheelChallengeState {
  challengeId: string
  role: WheelChallengeRole
  status: WheelChallengeStatus
  hostProfile: UserProfile
  guestProfile: UserProfile | null
  hostSpin: WheelSpinResult | null
  guestSpin: WheelSpinResult | null
  pendingSpin: WheelSpinResult | null
  winner: WheelChallengeWinner | null
  guestListSource: GuestListSource | null
  hostItemCount: number
  guestItemCount: number
  currentTurn: 'host' | 'guest' | null
  wheelItems: SavedRestaurant[]
}
