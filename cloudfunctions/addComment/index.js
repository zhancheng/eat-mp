const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return { code: 401, message: '请先登录微信' }
  }

  const {
    restaurantId,
    content,
    rating = 0,
    nickName = '微信用户',
    avatarUrl = ''
  } = event || {}

  if (!restaurantId) {
    return { code: 400, message: '缺少 restaurantId' }
  }

  const text = typeof content === 'string' ? content.trim() : ''
  if (!text) {
    return { code: 400, message: '请输入评论内容' }
  }
  if (text.length > 200) {
    return { code: 400, message: '评论最多 200 字' }
  }

  try {
    await cloud.openapi.security.msgSecCheck({ content: text })
  } catch (e) {
    console.warn('[addComment] msgSecCheck failed', e)
    return { code: 403, message: '内容不合规，请修改后重试' }
  }

  const stars = Number(rating)
  const safeRating = stars >= 1 && stars <= 5 ? Math.round(stars) : 0

  await db.collection('comments').add({
    data: {
      restaurantId,
      content: text,
      rating: safeRating,
      nickName: String(nickName).slice(0, 32) || '微信用户',
      avatarUrl: String(avatarUrl).slice(0, 512),
      createdAt: db.serverDate(),
      status: 'normal'
    }
  })

  return { code: 0, message: '发表成功' }
}
