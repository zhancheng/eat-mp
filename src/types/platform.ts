export type PlatformId =
  | 'meituan'
  | 'eleme'
  | 'taobao'
  | 'jd'
  | 'dianping'
  | 'amap'

export interface PlatformInfo {
  id: PlatformId
  name: string
  color: string
  textColor: string
}
