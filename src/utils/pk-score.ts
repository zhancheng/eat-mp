import type { Restaurant } from '@/types/restaurant'

/** 将餐厅评分换算为 PK 点数，满分 100，最低 0 */
export function calcPkScore(restaurant: Pick<Restaurant, 'rating'>): number {
  const rating = Number(restaurant.rating) || 0
  const normalized = Math.max(0, Math.min(5, rating))
  return Math.round((normalized / 5) * 100)
}
