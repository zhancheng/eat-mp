const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const VALID_TYPES = new Set(['favorite', 'dislike'])

function pickRestaurantSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id || '').trim()
  if (!id) return null
  return {
    id,
    shopId: raw.shopId ? String(raw.shopId) : '',
    name: String(raw.name || '未知餐厅').slice(0, 64),
    platform: String(raw.platform || 'amap').slice(0, 16),
    platformName: String(raw.platformName || '').slice(0, 32),
    rating: Number(raw.rating) || 0,
    monthlySales: Number(raw.monthlySales) || 0,
    avgPrice: Number(raw.avgPrice) || 0,
    latitude: Number(raw.latitude) || 0,
    longitude: Number(raw.longitude) || 0,
    distance: raw.distance != null ? Number(raw.distance) : undefined,
    distanceText: raw.distanceText ? String(raw.distanceText).slice(0, 32) : '',
    tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).slice(0, 16)).slice(0, 8) : [],
    cover: String(raw.cover || '').slice(0, 512),
    images: Array.isArray(raw.images)
      ? raw.images.map((u) => String(u).slice(0, 512)).filter(Boolean).slice(0, 9)
      : [],
    deliveryTime: String(raw.deliveryTime || '').slice(0, 32),
    minOrder: Number(raw.minOrder) || 0,
    category: raw.category ? String(raw.category).slice(0, 32) : '',
    address: raw.address ? String(raw.address).slice(0, 128) : '',
    telephone: raw.telephone ? String(raw.telephone).slice(0, 32) : '',
    h5Url: raw.h5Url ? String(raw.h5Url).slice(0, 512) : ''
  }
}

function listDocId(openid, listType, restaurantId) {
  return `${openid}_${listType}_${restaurantId}`
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { code: 401, message: '未登录' }
  }

  const listType = event?.listType
  if (!VALID_TYPES.has(listType)) {
    return { code: 400, message: '无效的列表类型' }
  }

  const items = Array.isArray(event?.items) ? event.items : []
  if (!items.length) {
    return { code: 0, data: { migrated: 0 } }
  }
  if (items.length > 100) {
    return { code: 400, message: '单次最多迁移 100 条' }
  }

  const col = db.collection('user_restaurant_lists')
  let migrated = 0

  try {
    for (const raw of items) {
      const restaurant = pickRestaurantSnapshot(raw)
      if (!restaurant) continue
      const docId = listDocId(OPENID, listType, restaurant.id)
      await col.doc(docId).set({
        data: {
          openid: OPENID,
          restaurantId: restaurant.id,
          listType,
          restaurant,
          updatedAt: db.serverDate()
        }
      })
      migrated += 1
    }
    return { code: 0, data: { migrated } }
  } catch (e) {
    console.error('[migrateUserRestaurants]', e)
    return { code: 500, message: e.message || '迁移失败' }
  }
}
