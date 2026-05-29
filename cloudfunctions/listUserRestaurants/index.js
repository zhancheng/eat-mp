const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const VALID_TYPES = new Set(['favorite', 'dislike'])

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { code: 401, message: '未登录' }
  }

  const listType = event?.listType
  if (!VALID_TYPES.has(listType)) {
    return { code: 400, message: '无效的列表类型' }
  }

  try {
    const { data } = await db
      .collection('user_restaurant_lists')
      .where({ openid: OPENID, listType })
      .orderBy('updatedAt', 'desc')
      .limit(200)
      .get()

    const list = (data || []).map((row) => ({
      ...(row.restaurant || {}),
      savedAt: row.updatedAt || row.createdAt || Date.now()
    }))

    return { code: 0, data: { list, total: list.length } }
  } catch (e) {
    console.error('[listUserRestaurants]', e)
    return {
      code: 500,
      message: e.message || '读取列表失败',
      hint: '请确认已创建 user_restaurant_lists 集合并部署云函数'
    }
  }
}
