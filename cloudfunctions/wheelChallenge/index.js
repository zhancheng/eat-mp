const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function calcPkScore(restaurant) {
  const rating = Number(restaurant?.rating) || 0
  const normalized = Math.max(0, Math.min(5, rating))
  return Math.round((normalized / 5) * 100)
}

async function getProfile(openid) {
  try {
    const res = await db.collection('user_profiles').doc(openid).get()
    const data = res.data || {}
    return {
      nickName: data.nickName || '饭友',
      avatarUrl: data.avatarUrl || ''
    }
  } catch {
    return { nickName: '饭友', avatarUrl: '' }
  }
}

async function resolveAvatarUrl(url) {
  const raw = String(url || '').trim()
  if (!raw || !raw.startsWith('cloud://')) return raw

  try {
    const res = await cloud.getTempFileURL({ fileList: [raw] })
    const item = res.fileList && res.fileList[0]
    return item && item.status === 0 && item.tempFileURL ? item.tempFileURL : raw
  } catch (e) {
    console.warn('[wheelChallenge] resolve avatar failed', e)
    return raw
  }
}

async function buildDisplayProfile(openid, snapshot) {
  const latest = openid ? await getProfile(openid) : { nickName: '饭友', avatarUrl: '' }
  const nickName = latest.nickName || snapshot?.nickName || '饭友'
  const avatarUrl = await resolveAvatarUrl(latest.avatarUrl || snapshot?.avatarUrl || '')
  return { nickName, avatarUrl }
}

function getActiveItems(doc) {
  if (!doc) return []
  if (
    doc.status === 'host_spun' ||
    doc.status === 'guest_spinning' ||
    (doc.status === 'finished' && doc.guestSpin)
  ) {
    if (doc.guestListSource === 'host') return doc.hostItems || []
    return doc.guestItems || []
  }
  return doc.hostItems || []
}

function getGuestItemCount(doc) {
  if (!doc) return 0
  if (doc.guestListSource === 'host') return (doc.hostItems || []).length
  if (doc.guestListSource === 'own') return (doc.guestItems || []).length
  return 0
}

async function formatChallenge(doc, openid) {
  let role = 'none'
  if (openid === doc.hostOpenid) role = 'host'
  else if (openid === doc.guestOpenid) role = 'guest'

  const hostProfile = await buildDisplayProfile(doc.hostOpenid, doc.hostProfile)
  const guestProfile = doc.guestOpenid
    ? await buildDisplayProfile(doc.guestOpenid, doc.guestProfile)
    : null

  return {
    challengeId: doc._id,
    role,
    status: doc.status,
    hostProfile,
    guestProfile,
    hostSpin: doc.hostSpin || null,
    guestSpin: doc.guestSpin || null,
    winner: doc.winner || null,
    guestListSource: doc.guestListSource || null,
    hostItemCount: (doc.hostItems || []).length,
    guestItemCount: getGuestItemCount(doc),
    currentTurn: doc.currentTurn || null,
    wheelItems: getActiveItems(doc)
  }
}

async function fetchChallenge(challengeId) {
  if (!challengeId) return null
  try {
    const res = await db.collection('wheel_challenges').doc(challengeId).get()
    return res.data || null
  } catch {
    return null
  }
}

async function handleCreate(openid, event) {
  const items = Array.isArray(event.items) ? event.items : []
  if (!items.length) {
    return { code: 400, message: '没有可抽奖的餐厅，请先收藏' }
  }

  const profile = await getProfile(openid)
  const now = Date.now()
  const res = await db.collection('wheel_challenges').add({
    data: {
      hostOpenid: openid,
      hostProfile: profile,
      hostItems: items.slice(0, 50),
      status: 'waiting',
      currentTurn: 'host',
      createdAt: now,
      updatedAt: now
    }
  })

  const doc = await fetchChallenge(res._id)
  return { code: 0, data: await formatChallenge(doc, openid) }
}

async function handleJoin(openid, event) {
  const doc = await fetchChallenge(event.challengeId)
  if (!doc) return { code: 404, message: '挑战不存在或已失效' }

  if (openid === doc.hostOpenid) {
    return { code: 0, data: await formatChallenge(doc, openid) }
  }

  if (doc.guestOpenid && doc.guestOpenid !== openid) {
    return { code: 400, message: '该挑战已有挑战者' }
  }

  if (!doc.guestOpenid) {
    const guestProfile = await getProfile(openid)
    await db
      .collection('wheel_challenges')
      .doc(doc._id)
      .update({
        data: {
          guestOpenid: openid,
          guestProfile,
          status: 'choosing',
          updatedAt: Date.now()
        }
      })
    const updated = await fetchChallenge(doc._id)
    return { code: 0, data: await formatChallenge(updated, openid) }
  }

  return { code: 0, data: await formatChallenge(doc, openid) }
}

async function handleGet(openid, event) {
  const doc = await fetchChallenge(event.challengeId)
  if (!doc) return { code: 404, message: '挑战不存在或已失效' }
  return { code: 0, data: await formatChallenge(doc, openid) }
}

async function handleSetGuestListSource(openid, event) {
  const doc = await fetchChallenge(event.challengeId)
  if (!doc) return { code: 404, message: '挑战不存在或已失效' }
  if (doc.guestOpenid !== openid) return { code: 403, message: '仅挑战者可选择' }
  if (doc.status !== 'choosing') return { code: 400, message: '当前状态不可选择' }

  const source = event.source === 'own' ? 'own' : 'host'
  const updateData = {
    guestListSource: source,
    status: 'ready',
    currentTurn: 'host',
    updatedAt: Date.now()
  }

  if (source === 'own') {
    const guestItems = Array.isArray(event.guestItems) ? event.guestItems : []
    if (!guestItems.length) {
      return { code: 400, message: '请先添加收藏餐厅' }
    }
    updateData.guestItems = guestItems.slice(0, 50)
  } else {
    updateData.guestItems = []
  }

  await db.collection('wheel_challenges').doc(doc._id).update({ data: updateData })
  const updated = await fetchChallenge(doc._id)
  return { code: 0, data: await formatChallenge(updated, openid) }
}

async function handleSpin(openid, event) {
  const doc = await fetchChallenge(event.challengeId)
  if (!doc) return { code: 404, message: '挑战不存在或已失效' }

  let role = null
  if (openid === doc.hostOpenid) role = 'host'
  else if (openid === doc.guestOpenid) role = 'guest'
  else return { code: 403, message: '无权参与此挑战' }

  if (doc.status === 'finished') return { code: 400, message: '挑战已结束' }
  if (doc.status === 'waiting') return { code: 400, message: '等待挑战者加入' }
  if (doc.status === 'choosing') return { code: 400, message: '挑战者尚未选择餐厅池' }

  if (doc.status === 'host_spinning') {
    if (role === 'host' && doc.pendingHostSpin) {
      return {
        code: 0,
        data: {
          spin: doc.pendingHostSpin,
          state: await formatChallenge(doc, openid)
        }
      }
    }
    return { code: 400, message: '请等待发起者转动结束' }
  }

  if (doc.status === 'guest_spinning') {
    if (role === 'guest' && doc.pendingGuestSpin) {
      return {
        code: 0,
        data: {
          spin: doc.pendingGuestSpin,
          state: await formatChallenge(doc, openid)
        }
      }
    }
    return { code: 400, message: '请等待挑战者转动结束' }
  }

  if (doc.status === 'ready' && role !== 'host') {
    return { code: 400, message: '请等待发起者先抽' }
  }
  if (doc.status === 'host_spun' && role !== 'guest') {
    return { code: 400, message: '请等待挑战者抽' }
  }

  const items =
    role === 'host'
      ? doc.hostItems || []
      : doc.guestListSource === 'host'
        ? doc.hostItems || []
        : doc.guestItems || []

  if (!items.length) {
    return { code: 400, message: '没有可抽奖的餐厅' }
  }

  const index = Math.floor(Math.random() * items.length)
  const restaurant = items[index]
  const pkScore = calcPkScore(restaurant)
  const spin = { index, restaurant, pkScore }

  if (role === 'host') {
    await db.collection('wheel_challenges').doc(doc._id).update({
      data: {
        pendingHostSpin: spin,
        status: 'host_spinning',
        currentTurn: 'host',
        updatedAt: Date.now()
      }
    })
  } else {
    await db.collection('wheel_challenges').doc(doc._id).update({
      data: {
        pendingGuestSpin: spin,
        status: 'guest_spinning',
        currentTurn: 'guest',
        updatedAt: Date.now()
      }
    })
  }

  const updated = await fetchChallenge(doc._id)
  return {
    code: 0,
    data: {
      state: await formatChallenge(updated, openid),
      spin
    }
  }
}

async function handleRevealSpin(openid, event) {
  const doc = await fetchChallenge(event.challengeId)
  if (!doc) return { code: 404, message: '挑战不存在或已失效' }

  const _ = db.command

  if (doc.status === 'host_spinning') {
    if (openid !== doc.hostOpenid) {
      return { code: 403, message: '仅发起者可公布结果' }
    }
    if (!doc.pendingHostSpin) {
      return { code: 400, message: '没有待公布的结果' }
    }
    await db.collection('wheel_challenges').doc(doc._id).update({
      data: {
        hostSpin: doc.pendingHostSpin,
        pendingHostSpin: _.remove(),
        status: 'host_spun',
        currentTurn: 'guest',
        updatedAt: Date.now()
      }
    })
  } else if (doc.status === 'guest_spinning') {
    if (openid !== doc.guestOpenid) {
      return { code: 403, message: '仅挑战者可公布结果' }
    }
    if (!doc.pendingGuestSpin) {
      return { code: 400, message: '没有待公布的结果' }
    }
    const spin = doc.pendingGuestSpin
    const hostScore = doc.hostSpin?.pkScore ?? 0
    let winner = 'tie'
    if (spin.pkScore > hostScore) winner = 'guest'
    else if (spin.pkScore < hostScore) winner = 'host'

    await db.collection('wheel_challenges').doc(doc._id).update({
      data: {
        guestSpin: spin,
        pendingGuestSpin: _.remove(),
        status: 'finished',
        winner,
        currentTurn: null,
        updatedAt: Date.now()
      }
    })
  } else {
    return { code: 400, message: '当前没有进行中的转动' }
  }

  const updated = await fetchChallenge(doc._id)
  return { code: 0, data: await formatChallenge(updated, openid) }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: 401, message: '未登录' }

  const action = event?.action
  try {
    switch (action) {
      case 'create':
        return await handleCreate(OPENID, event)
      case 'join':
        return await handleJoin(OPENID, event)
      case 'get':
        return await handleGet(OPENID, event)
      case 'setGuestListSource':
        return await handleSetGuestListSource(OPENID, event)
      case 'spin':
        return await handleSpin(OPENID, event)
      case 'revealSpin':
        return await handleRevealSpin(OPENID, event)
      default:
        return { code: 400, message: '未知操作' }
    }
  } catch (e) {
    console.error('[wheelChallenge]', action, e)
    return {
      code: 500,
      message: e.message || '操作失败',
      hint: '请确认已创建 wheel_challenges 集合并部署云函数'
    }
  }
}
