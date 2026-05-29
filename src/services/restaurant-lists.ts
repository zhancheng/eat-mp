import { callCloudFunction, getCloudBlockReason } from './cloud'
import type { Restaurant } from '@/types/restaurant'
import type {
  RestaurantListResult,
  RestaurantListType,
  SavedRestaurant
} from '@/types/restaurant-list'

const LEGACY_FAV_KEY = 'favoriteRestaurants'
const MIGRATED_KEY = 'restaurantListsMigrated'
const CACHE_KEY = 'restaurantListsCache'

interface ListsCache {
  favorites: SavedRestaurant[]
  dislikes: SavedRestaurant[]
  updatedAt: number
}

let favoritesCache: SavedRestaurant[] = []
let dislikesCache: SavedRestaurant[] = []
let favoriteIds = new Set<string>()
let dislikeIds = new Set<string>()
let initPromise: Promise<void> | null = null

function pickSnapshot(item: Restaurant): SavedRestaurant {
  return {
    id: item.id,
    shopId: item.shopId,
    name: item.name,
    platform: item.platform,
    platformName: item.platformName,
    rating: item.rating,
    monthlySales: item.monthlySales,
    avgPrice: item.avgPrice,
    latitude: item.latitude,
    longitude: item.longitude,
    distance: item.distance,
    distanceText: item.distanceText,
    tags: item.tags,
    cover: item.cover,
    images: item.images,
    deliveryTime: item.deliveryTime,
    minOrder: item.minOrder,
    category: item.category,
    address: item.address,
    telephone: item.telephone,
    h5Url: item.h5Url,
    savedAt: Date.now()
  }
}

function applyCache(cache: ListsCache) {
  favoritesCache = cache.favorites
  dislikesCache = cache.dislikes
  favoriteIds = new Set(favoritesCache.map((i) => i.id))
  dislikeIds = new Set(dislikesCache.map((i) => i.id))
}

function loadLocalCache(): ListsCache {
  try {
    const raw = uni.getStorageSync(CACHE_KEY) as ListsCache | undefined
    if (raw && Array.isArray(raw.favorites) && Array.isArray(raw.dislikes)) {
      return raw
    }
  } catch {
    /* ignore */
  }
  return { favorites: [], dislikes: [], updatedAt: 0 }
}

function saveLocalCache() {
  uni.setStorageSync(CACHE_KEY, {
    favorites: favoritesCache,
    dislikes: dislikesCache,
    updatedAt: Date.now()
  } satisfies ListsCache)
}

function syncFromMemory() {
  saveLocalCache()
}

async function fetchListFromCloud(listType: RestaurantListType): Promise<SavedRestaurant[]> {
  const res = await callCloudFunction<RestaurantListResult>('listUserRestaurants', {
    listType
  })
  if (res.code !== 0 || !res.data) {
    throw new Error(res.message || '加载列表失败')
  }
  return (res.data.list || []).map((item) => ({
    ...item,
    savedAt: Number(item.savedAt) || Date.now()
  }))
}

async function migrateLegacyFavoritesIfNeeded(): Promise<void> {
  if (uni.getStorageSync(MIGRATED_KEY)) return
  const block = getCloudBlockReason()
  if (block) return

  let legacy: unknown[] = []
  try {
    const raw = uni.getStorageSync(LEGACY_FAV_KEY)
    legacy = Array.isArray(raw) ? raw : []
  } catch {
    legacy = []
  }

  if (!legacy.length) {
    uni.setStorageSync(MIGRATED_KEY, true)
    return
  }

  const res = await callCloudFunction<{ migrated: number }>('migrateUserRestaurants', {
    listType: 'favorite',
    items: legacy
  })
  if (res.code === 0) {
    uni.removeStorageSync(LEGACY_FAV_KEY)
    uni.setStorageSync(MIGRATED_KEY, true)
  }
}

export async function initRestaurantLists(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    applyCache(loadLocalCache())
    const block = getCloudBlockReason()
    if (block) return
    try {
      await migrateLegacyFavoritesIfNeeded()
      await refreshRestaurantLists()
    } catch (e) {
      console.warn('[restaurant-lists] init failed', e)
    }
  })()
  return initPromise
}

export async function refreshRestaurantLists(): Promise<void> {
  const block = getCloudBlockReason()
  if (block) {
    applyCache(loadLocalCache())
    return
  }
  const [favorites, dislikes] = await Promise.all([
    fetchListFromCloud('favorite'),
    fetchListFromCloud('dislike')
  ])
  favoritesCache = favorites
  dislikesCache = dislikes
  favoriteIds = new Set(favorites.map((i) => i.id))
  dislikeIds = new Set(dislikes.map((i) => i.id))
  syncFromMemory()
}

export function getFavorites(): SavedRestaurant[] {
  return [...favoritesCache]
}

export function getDislikes(): SavedRestaurant[] {
  return [...dislikesCache]
}

export function getFavoriteIds(): Set<string> {
  return new Set(favoriteIds)
}

export function getDislikeIds(): Set<string> {
  return new Set(dislikeIds)
}

export function isFavorite(id: string): boolean {
  return favoriteIds.has(id)
}

export function isDisliked(id: string): boolean {
  return dislikeIds.has(id)
}

export function getListCount(listType: RestaurantListType): number {
  return listType === 'favorite' ? favoriteIds.size : dislikeIds.size
}

async function toggleOnCloud(
  listType: RestaurantListType,
  restaurant: Restaurant,
  action?: 'add' | 'remove' | 'toggle'
): Promise<boolean> {
  const block = getCloudBlockReason()
  if (block) throw new Error(block)

  const payload: Record<string, unknown> = {
    listType,
    restaurant: pickSnapshot(restaurant)
  }
  if (action) payload.action = action

  const res = await callCloudFunction<{ added: boolean }>('toggleUserRestaurant', payload)
  if (res.code !== 0 || !res.data) {
    throw new Error(res.message || '操作失败')
  }
  return res.data.added
}

function applyToggleLocal(listType: RestaurantListType, restaurant: Restaurant, added: boolean) {
  const snapshot = pickSnapshot(restaurant)

  if (listType === 'favorite') {
    if (added) {
      favoritesCache = [snapshot, ...favoritesCache.filter((i) => i.id !== restaurant.id)]
      favoriteIds.add(restaurant.id)
      dislikesCache = dislikesCache.filter((i) => i.id !== restaurant.id)
      dislikeIds.delete(restaurant.id)
    } else {
      favoritesCache = favoritesCache.filter((i) => i.id !== restaurant.id)
      favoriteIds.delete(restaurant.id)
    }
  } else {
    if (added) {
      dislikesCache = [snapshot, ...dislikesCache.filter((i) => i.id !== restaurant.id)]
      dislikeIds.add(restaurant.id)
      favoritesCache = favoritesCache.filter((i) => i.id !== restaurant.id)
      favoriteIds.delete(restaurant.id)
    } else {
      dislikesCache = dislikesCache.filter((i) => i.id !== restaurant.id)
      dislikeIds.delete(restaurant.id)
    }
  }

  syncFromMemory()
}

export async function toggleFavorite(restaurant: Restaurant): Promise<boolean> {
  const added = await toggleOnCloud('favorite', restaurant)
  applyToggleLocal('favorite', restaurant, added)
  return added
}

export async function toggleDislike(restaurant: Restaurant): Promise<boolean> {
  const added = await toggleOnCloud('dislike', restaurant)
  applyToggleLocal('dislike', restaurant, added)
  return added
}

export async function removeFromList(
  listType: RestaurantListType,
  restaurantIds: string[]
): Promise<void> {
  const block = getCloudBlockReason()
  if (block) throw new Error(block)
  if (!restaurantIds.length) return

  const res = await callCloudFunction<{ removed: number }>('removeUserRestaurants', {
    listType,
    restaurantIds
  })
  if (res.code !== 0) {
    throw new Error(res.message || '删除失败')
  }

  const idSet = new Set(restaurantIds)
  if (listType === 'favorite') {
    favoritesCache = favoritesCache.filter((i) => !idSet.has(i.id))
    idSet.forEach((id) => favoriteIds.delete(id))
  } else {
    dislikesCache = dislikesCache.filter((i) => !idSet.has(i.id))
    idSet.forEach((id) => dislikeIds.delete(id))
  }
  syncFromMemory()
}

export async function fetchListForManage(listType: RestaurantListType): Promise<SavedRestaurant[]> {
  await refreshRestaurantLists()
  return listType === 'favorite' ? getFavorites() : getDislikes()
}

export const LIST_META: Record<
  RestaurantListType,
  { title: string; emptyTitle: string; emptyHint: string }
> = {
  favorite: {
    title: '我的收藏',
    emptyTitle: '还没有收藏',
    emptyHint: '在附近美食或详情页点击 ☆ 即可收藏'
  },
  dislike: {
    title: '不喜欢的餐厅',
    emptyTitle: '还没有标记不喜欢的餐厅',
    emptyHint: '在餐厅详情页点击 👎 即可加入'
  }
}
