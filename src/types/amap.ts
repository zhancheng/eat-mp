export interface AmapBizExt {
  rating?: string
  cost?: string
}

export interface AmapPhoto {
  url?: string
}

export interface AmapPoi {
  id?: string
  name?: string
  location?: string
  type?: string
  tag?: string
  address?: string
  pname?: string
  cityname?: string
  adname?: string
  tel?: string
  distance?: string | number
  rating?: string
  cost?: string
  business_area?: string
  biz_ext?: AmapBizExt
  photos?: AmapPhoto[]
}

export interface AmapPlaceResponse {
  status?: string | number
  info?: string
  infocode?: string
  count?: string | number
  page?: string | number
  offset?: string | number
  pois?: AmapPoi[]
  data?: { pois?: AmapPoi[] }
}
