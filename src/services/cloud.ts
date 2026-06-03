import cloudConfig from '@/config/cloud.config'
import type { CloudResult } from '@/types/comment'

let inited = false

const TOURIST_APPID = 'touristappid'

type WxAccountInfo = { miniProgram?: { appId?: string } }

type WxCloudInstance = {
  init(options: { env?: string; traceUser?: boolean }): void
  callFunction(options: Record<string, unknown>): void
  getTempFileURL?(options: {
    fileList: string[]
    success?: (res: { fileList: Array<{ fileID: string; tempFileURL?: string; status?: number }> }) => void
    fail?: (err: UniApp.GeneralCallbackResult) => void
  }): void
  uploadFile?(options: {
    cloudPath: string
    filePath: string
    config?: { env: string }
    success?: (res: { fileID: string }) => void
    fail?: (err: UniApp.GeneralCallbackResult) => void
  }): void
  database?(options?: { env?: string }): {
    collection: (name: string) => {
      where: (cond: Record<string, unknown>) => {
        limit: (n: number) => { get: () => Promise<{ data: unknown[] }> }
      }
    }
  }
}

type WxRuntime = {
  cloud?: WxCloudInstance
  getAccountInfoSync?: () => WxAccountInfo
}

/** 兼容 uni 编译：wx 可能是全局变量，不一定在 globalThis 上 */
function getWx(): WxRuntime | undefined {
  try {
    const g = globalThis as { wx?: WxRuntime }
    if (g.wx?.cloud) return g.wx
  } catch {
    /* ignore */
  }
  try {
    const w = (0, eval)('typeof wx !== "undefined" ? wx : undefined') as WxRuntime | undefined
    if (w?.cloud) return w
  } catch {
    /* ignore */
  }
  return undefined
}

export function getCloudBlockReason(): string | null {
  const wxApi = getWx()
  if (!wxApi?.cloud) {
    return '当前环境不支持 wx.cloud，请用微信开发者工具打开小程序'
  }
  try {
    const appId = wxApi.getAccountInfoSync?.().miniProgram?.appId || ''
    if (!appId || appId === TOURIST_APPID) {
      return '当前为测试号，无法使用云开发，请配置正式 AppID 后重新编译。'
    }
  } catch {
    /* ignore */
  }
  return null
}

export function getRuntimeAppId(): string {
  try {
    return getWx()?.getAccountInfoSync?.().miniProgram?.appId || ''
  } catch {
    return ''
  }
}

export function initCloud(force = false): boolean {
  const block = getCloudBlockReason()
  if (block) {
    console.warn('[cloud]', block)
    return false
  }
  if (inited && !force) return true
  const cloud = getWx()?.cloud
  if (!cloud) return false
  cloud.init({
    env: cloudConfig.envId,
    traceUser: false
  })
  inited = true
  return true
}

export function isCloudReady(): boolean {
  return inited && !getCloudBlockReason()
}

export function getWxCloudDatabase() {
  if (!initCloud()) return null
  return getWx()?.cloud?.database?.({ env: cloudConfig.envId }) ?? null
}

/** 上传文件到云存储，返回 fileID */
export function uploadCloudFile(cloudPath: string, filePath: string): Promise<string> {
  const block = getCloudBlockReason()
  if (block) return Promise.reject(new Error(block))
  if (!initCloud(true)) return Promise.reject(new Error('云开发未初始化'))
  const cloud = getWx()?.cloud
  if (!cloud?.uploadFile) {
    return Promise.reject(new Error('当前环境不支持云存储上传'))
  }
  return new Promise((resolve, reject) => {
    cloud.uploadFile!({
      cloudPath,
      filePath,
      config: { env: cloudConfig.envId },
      success: (res) => resolve(res.fileID),
      fail: (err) => reject(new Error(err.errMsg || '头像上传失败'))
    })
  })
}

export interface CloudDiagnostic {
  appId: string
  envId: string
  ping?: CloudResult<{ message?: string }>
  pingError?: string
  dbError?: string
}

/** 在详情页排查：先云端测试 ping，再测数据库读权限 */
export async function runCloudDiagnostics(): Promise<CloudDiagnostic> {
  const diag: CloudDiagnostic = {
    appId: getRuntimeAppId(),
    envId: cloudConfig.envId
  }
  initCloud(true)
  try {
    diag.ping = await callCloudFunction<{ message?: string }>('ping', {})
  } catch (e) {
    diag.pingError = (e as Error).message
  }
  try {
    const db = getWx()?.cloud?.database?.({ env: cloudConfig.envId })
    if (db) {
      await db.collection('comments').where({ status: 'normal' }).limit(1).get()
    }
  } catch (e) {
    diag.dbError = (e as Error).message
  }
  return diag
}

export async function pingCloud(): Promise<CloudResult<{ message: string }>> {
  return callCloudFunction<{ message: string }>('ping', {})
}

/** 将 cloud:// fileID 转为可跨用户展示的 HTTPS 临时链接 */
export function getCloudTempFileURL(fileId: string): Promise<string> {
  const raw = (fileId || '').trim()
  if (!raw) return Promise.resolve('')
  if (/^https?:\/\//i.test(raw)) return Promise.resolve(raw)
  if (!raw.startsWith('cloud://')) return Promise.resolve(raw)

  const block = getCloudBlockReason()
  if (block) return Promise.reject(new Error(block))
  if (!initCloud(true)) return Promise.reject(new Error('云开发未初始化'))

  const cloud = getWx()?.cloud
  if (!cloud?.getTempFileURL) {
    return Promise.reject(new Error('当前环境不支持云存储临时链接'))
  }

  return new Promise((resolve, reject) => {
    cloud.getTempFileURL!({
      fileList: [raw],
      success: (res) => {
        const item = res.fileList?.[0]
        if (item?.status === 0 && item.tempFileURL) {
          resolve(item.tempFileURL)
          return
        }
        reject(new Error('头像链接获取失败'))
      },
      fail: (err) => reject(new Error(err.errMsg || '头像链接获取失败'))
    })
  })
}

/** 解析头像地址，供 image 组件跨用户展示 */
export async function resolveAvatarDisplayUrl(url: string): Promise<string> {
  const raw = (url || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('cloud://')) {
    try {
      return await getCloudTempFileURL(raw)
    } catch (e) {
      console.warn('[cloud] resolveAvatarDisplayUrl failed', e)
      return ''
    }
  }
  return raw
}

export function callCloudFunction<T = unknown>(
  name: string,
  data?: Record<string, unknown>
): Promise<CloudResult<T>> {
  const block = getCloudBlockReason()
  if (block) return Promise.reject(new Error(block))

  initCloud(true)
  const cloud = getWx()?.cloud
  if (!cloud) return Promise.reject(new Error('仅支持微信小程序云开发'))

  const payload = data || {}

  const attempt = (useExplicitEnv: boolean) =>
    new Promise<CloudResult<T>>((resolve, reject) => {
      const options: Record<string, unknown> = {
        name,
        data: payload,
        success: (res: { result?: unknown }) => {
          resolve((res.result ?? { code: -1, message: '云函数无返回' }) as CloudResult<T>)
        },
        fail: (err: UniApp.GeneralCallbackResult) => {
          reject(err)
        }
      }
      if (useExplicitEnv) {
        options.config = { env: cloudConfig.envId }
      }
      cloud.callFunction(options)
    })

  return attempt(false).catch((firstErr) => {
    if (!/system error/i.test(String((firstErr as { errMsg?: string }).errMsg || firstErr))) {
      return Promise.reject(new Error(formatCloudCallError(firstErr as UniApp.GeneralCallbackResult, name)))
    }
    return attempt(true).catch((secondErr) => {
      return Promise.reject(
        new Error(formatCloudCallError(secondErr as UniApp.GeneralCallbackResult, name))
      )
    })
  })
}

function formatCloudCallError(err: UniApp.GeneralCallbackResult, fnName: string): string {
  const raw = err as UniApp.GeneralCallbackResult & { errMsg?: string; message?: string }
  const detail = raw.errMsg || raw.message || String(err)
  const appId = getRuntimeAppId()

  const checklist = [
    `【AppID】${appId || '未知'} 须与云环境绑定（见下方第 1 条）`,
    `【环境 ID】${cloudConfig.envId}（上传云函数时须选同一环境）`,
    `1. 腾讯云开发控制台 → 环境 → 安全配置 → 小程序关联：添加 ${appId || '你的AppID'}`,
    '2. 开发者工具云开发面板顶部，选中上述环境',
    '3. 对 ping 做「云端测试」应返回 pong；再测 listComments',
    '4. comments 集合权限建议：所有用户可读，仅管理端可写（写走云函数）',
    '5. listComments 需复合索引 restaurantId + createdAt，见 docs/CLOUD.md'
  ].join('\n')

  if (/system error/i.test(detail) && !/errCode:\s*-501000/i.test(detail)) {
    return [`云函数「${fnName}」网关失败（函数可能未部署到本环境，或 AppID 未关联环境）：`, checklist, detail].join(
      '\n'
    )
  }
  if (/Environment invalid|env not exist|INVALID_ENV|-501000/i.test(detail)) {
    return [`环境 ID 无效或未关联当前小程序：`, checklist, detail].join('\n')
  }
  if (/Function not found|FUNCTION_NOT_FOUND|-404011/i.test(detail)) {
    return [`云函数「${fnName}」在环境 ${cloudConfig.envId} 中不存在，请重新上传部署。\n`, detail].join('')
  }
  return [checklist, detail].join('\n')
}
