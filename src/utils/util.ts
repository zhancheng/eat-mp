export function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

/** 按匀速估算路程耗时（分钟），至少 1 分钟 */
export function estimateTravelMinutes(meters: number, speedKmh: number): number {
  if (meters <= 0 || speedKmh <= 0) return 0
  return Math.max(1, Math.round((meters / 1000 / speedKmh) * 60))
}

/** 格式化为「约 X 分钟」或「约 X 小时 Y 分钟」 */
export function formatTravelTime(meters: number, speedKmh: number): string {
  const minutes = estimateTravelMinutes(meters, speedKmh)
  if (minutes <= 0) return '-'
  if (minutes < 60) return `约${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `约${h}小时${m}分钟` : `约${h}小时`
}

export function formatSales(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万+`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k+`
  return `${count}`
}
