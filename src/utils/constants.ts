import type { PlatformId, PlatformInfo } from '@/types/platform'
import type { SortBy } from '@/types/restaurant'

export const PLATFORMS: Record<PlatformId, PlatformInfo> = {
  meituan: { id: 'meituan', name: '美团', color: '#FFC300', textColor: '#1a1a1a' },
  eleme: { id: 'eleme', name: '饿了么', color: '#0097FF', textColor: '#ffffff' },
  taobao: { id: 'taobao', name: '淘宝闪购', color: '#FF5000', textColor: '#ffffff' },
  jd: { id: 'jd', name: '京东外卖', color: '#E1251B', textColor: '#ffffff' },
  dianping: { id: 'dianping', name: '大众点评', color: '#FF6633', textColor: '#ffffff' },
  amap: { id: 'amap', name: '高德美食', color: '#00C853', textColor: '#ffffff' }
}

/** 美食分类快捷筛选（传给高德 keywords） */
export const FOOD_CATEGORIES = [
  { id: '美食', label: '全部美食' },
  { id: '火锅', label: '火锅' },
  { id: '烧烤', label: '烧烤' },
  { id: '川菜', label: '川菜' },
  { id: '日料', label: '日料' },
  { id: '咖啡', label: '咖啡' }
] as const

export const PLATFORM_LIST = Object.values(PLATFORMS)

export const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: 'distance', label: '距离最近' },
  { id: 'rating', label: '评分最高' },
  { id: 'sales', label: '销量最高' }
]
