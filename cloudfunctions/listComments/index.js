const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { restaurantId, page = 1, pageSize = 20 } = event || {}
  if (!restaurantId) {
    return { code: 400, message: '缺少 restaurantId' }
  }

  const limit = Math.min(Math.max(Number(pageSize) || 20, 1), 50)
  const skip = (Math.max(Number(page) || 1, 1) - 1) * limit
  const where = { restaurantId, status: 'normal' }

  try {
    // 不用 orderBy，避免未建复合索引时云函数执行失败
    const { data: all } = await db.collection('comments').where(where).limit(100).get()
    const sorted = (all || []).sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
    const list = sorted.slice(skip, skip + limit)
    const total = sorted.length

    return {
      code: 0,
      data: {
        list,
        total,
        page: Number(page) || 1,
        pageSize: limit,
        hasMore: skip + list.length < total
      }
    }
  } catch (e) {
    console.error('[listComments]', e)
    return {
      code: 500,
      message: e.message || '数据库查询失败',
      hint: '请确认已创建 comments 集合，且云函数部署在当前环境'
    }
  }
}
