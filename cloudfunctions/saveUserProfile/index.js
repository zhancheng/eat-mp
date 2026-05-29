const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { code: 401, message: '未登录' }
  }

  const nickName = typeof event?.nickName === 'string' ? event.nickName.trim() : ''
  const avatarUrl = typeof event?.avatarUrl === 'string' ? event.avatarUrl.trim() : ''

  if (!nickName) {
    return { code: 400, message: '请填写昵称' }
  }
  if (nickName.length > 32) {
    return { code: 400, message: '昵称最多 32 字' }
  }

  try {
    await cloud.openapi.security.msgSecCheck({ content: nickName })
  } catch (e) {
    console.warn('[saveUserProfile] nickName check failed', e)
    return { code: 403, message: '昵称不合规，请修改' }
  }

  await db.collection('user_profiles').doc(OPENID).set({
    data: {
      nickName,
      avatarUrl: avatarUrl.slice(0, 512),
      updatedAt: db.serverDate()
    }
  })

  return {
    code: 0,
    message: '已保存',
    data: { nickName, avatarUrl }
  }
}
