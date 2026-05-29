export interface AppLocation {
  latitude: number
  longitude: number
  isFallback: boolean
  accuracy?: number
  updatedAt?: number
  label?: string
}

export interface GetLocationOptions {
  refresh?: boolean
}
