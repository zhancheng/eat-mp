import type { PlatformId } from '@/types/platform'
import type { Restaurant } from '@/types/restaurant'

const CATEGORIES = ['川菜', '粤菜', '日料', '火锅', '烧烤', '快餐', '奶茶', '面食', '韩餐', '西餐']
const NAMES = [
  '川味小馆', '粤式茶餐厅', '樱花寿司', '海底捞火锅', '老王烧烤',
  '肯德基', '喜茶', '兰州拉面', '韩式炸鸡', '意式披萨',
  '黄焖鸡米饭', '沙县小吃', '麻辣香锅', '小龙虾专门店', '牛肉火锅'
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateRestaurants(
  platform: PlatformId,
  platformName: string,
  count: number,
  baseLat: number,
  baseLng: number
): Restaurant[] {
  const list: Restaurant[] = []
  for (let i = 0; i < count; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.02
    const offsetLng = (Math.random() - 0.5) * 0.02
    list.push({
      id: `${platform}_${Date.now()}_${i}`,
      name: `${randomItem(NAMES)}（${platformName}）`,
      platform,
      platformName,
      rating: +(3.5 + Math.random() * 1.5).toFixed(1),
      monthlySales: Math.floor(100 + Math.random() * 9999),
      avgPrice: Math.floor(15 + Math.random() * 80),
      latitude: baseLat + offsetLat,
      longitude: baseLng + offsetLng,
      tags: [randomItem(['满减', '新店', '品牌', '准时达']), randomItem(CATEGORIES)],
      cover: '/static/images/default-shop.png',
      deliveryTime: `${Math.floor(20 + Math.random() * 40)}分钟`,
      minOrder: Math.floor(Math.random() * 3) * 10,
      category: randomItem(CATEGORIES),
      address: `附近商业街 ${Math.floor(Math.random() * 100)} 号`,
      deeplink: ''
    })
  }
  return list
}
