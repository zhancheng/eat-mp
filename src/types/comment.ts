export interface Comment {
  _id: string
  restaurantId: string
  content: string
  rating?: number
  nickName: string
  avatarUrl?: string
  createdAt: number | string
  status: 'normal' | 'hidden'
}

export interface CommentListResult {
  list: Comment[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface CloudResult<T = unknown> {
  code: number
  message?: string
  data?: T
}
