const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { code: 401, message: '未登录' }
  }

  try {
    const res = await db.collection('user_profiles').doc(OPENID).get()
    const data = res.data || {}
    return {
      code: 0,
      data: {
        nickName: data.nickName || '',
        avatarUrl: data.avatarUrl || ''
      }
    }
  } catch (e) {
    if (e.errCode === -1 || /not exist|不存在/i.test(e.message || '')) {
      return { code: 0, data: { nickName: '', avatarUrl: '' } }
    }
    console.error('[getUserProfile]', e)
    return { code: 500, message: e.message || '读取资料失败' }
  }
}
