import {
  callCloudFunction,
  getCloudBlockReason,
  getWxCloudDatabase,
  initCloud
} from './cloud'
import type { CloudResult, Comment, CommentListResult } from '@/types/comment'

export function isCommentsEnabled(): boolean {
  if (getCloudBlockReason()) return false
  return initCloud()
}

/** 客户端直连数据库读评论（需 comments 集合「所有用户可读」） */
async function fetchCommentsFromDb(
  restaurantId: string,
  pageSize = 20
): Promise<CommentListResult | null> {
  const db = getWxCloudDatabase()
  if (!db) return null
  try {
    const { data } = await db
      .collection('comments')
      .where({ restaurantId, status: 'normal' })
      .limit(100)
      .get()
    const rows = (data || []) as Comment[]
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt as string).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt as string).getTime() : 0
      return tb - ta
    })
    const list = rows.slice(0, pageSize)
    return {
      list,
      total: rows.length,
      page: 1,
      pageSize,
      hasMore: rows.length > pageSize
    }
  } catch (e) {
    console.warn('[comments] db fallback failed', e)
    return null
  }
}

export async function fetchComments(
  restaurantId: string,
  page = 1,
  pageSize = 20
): Promise<CommentListResult> {
  try {
    const res = await callCloudFunction<CommentListResult>('listComments', {
      restaurantId,
      page,
      pageSize
    })
    if (res.code === 0 && res.data) return res.data
    throw new Error(res.message || '加载评论失败')
  } catch (fnErr) {
    const fallback = await fetchCommentsFromDb(restaurantId, pageSize)
    if (fallback) return fallback
    throw fnErr
  }
}

export async function postComment(params: {
  restaurantId: string
  content: string
  rating?: number
  nickName?: string
  avatarUrl?: string
}): Promise<void> {
  const res = await callCloudFunction('addComment', params)
  if (res.code !== 0) {
    throw new Error(res.message || '发表评论失败')
  }
}
