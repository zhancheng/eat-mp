const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const VALID_TYPES = new Set(['favorite', 'dislike'])

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

  const ids = Array.isArray(event?.restaurantIds)
    ? event.restaurantIds.map((id) => String(id).trim()).filter(Boolean)
    : []

  if (!ids.length) {
    return { code: 400, message: '请选择要删除的餐厅' }
  }
  if (ids.length > 50) {
    return { code: 400, message: '单次最多删除 50 条' }
  }

  try {
    const col = db.collection('user_restaurant_lists')
    await Promise.all(
      ids.map((restaurantId) =>
        col
          .doc(listDocId(OPENID, listType, restaurantId))
          .remove()
          .catch((e) => {
            if (e.errCode === -1 || /not exist|不存在/i.test(e.message || '')) return
            throw e
          })
      )
    )
    return { code: 0, data: { removed: ids.length } }
  } catch (e) {
    console.error('[removeUserRestaurants]', e)
    return { code: 500, message: e.message || '删除失败' }
  }
}
