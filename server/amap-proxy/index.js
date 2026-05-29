/**
 * 高德 Web 服务 API 代理
 *
 * 配置：复制 .env.example 为 .env，填入 AMAP_API_KEY
 * 启动：npm start  或项目根目录 npm run proxy:amap
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '.env')
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, 'utf8')
  text.split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  })
}

loadEnv()

const API_KEY = process.env.AMAP_API_KEY || ''
const PORT = Number(process.env.PORT || 8788)
const AMAP_URL = 'https://restapi.amap.com/v3/place/around'

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

async function fetchAmapWebApi(input) {
  const {
    latitude,
    longitude,
    page = 1,
    pageSize = 20,
    keyword = '美食',
    radius = 3000,
    types = '050000'
  } = input

  const params = new URLSearchParams({
    key: API_KEY,
    location: `${longitude},${latitude}`,
    keywords: keyword,
    types,
    radius: String(radius),
    sortrule: 'distance',
    offset: String(Math.min(pageSize, 25)),
    page: String(page),
    extensions: 'all',
    output: 'JSON'
  })

  const res = await fetch(`${AMAP_URL}?${params}`)
  const json = await res.json()

  if (String(json.status) !== '1') {
    const info = json.info || ''
    const infocode = json.infocode || ''
    let msg = info || `高德错误 ${infocode}`
    if (infocode === '10009' || info === 'USERKEY_PLAT_NOMATCH') {
      msg =
        'USERKEY_PLAT_NOMATCH：当前 Key 不是「Web 服务」类型。' +
        '请到 console.amap.com → 应用管理 → 添加 Key → 服务平台必须选【Web服务】，' +
        '不要用微信小程序/JS API/Android/iOS 的 Key。'
    }
    const err = new Error(msg)
    err.amap = json
    throw err
  }

  return json
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && (req.url === '/health' || req.url.startsWith('/health?'))) {
    const check = req.url.includes('check=1')
    const payload = { ok: true, hasKey: !!API_KEY, keyPrefix: API_KEY ? API_KEY.slice(0, 6) + '...' : '' }
    if (check && API_KEY) {
      try {
        await fetchAmapWebApi({
          latitude: 39.9219,
          longitude: 116.44355,
          page: 1,
          pageSize: 1,
          keyword: '美食'
        })
        payload.amapOk = true
        payload.message = 'Web 服务 Key 可用'
      } catch (e) {
        payload.ok = false
        payload.amapOk = false
        payload.message = e.message
      }
    }
    res.writeHead(payload.ok ? 200 : 500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(payload))
    return
  }

  if (req.method !== 'POST' || req.url !== '/api/amap/nearby') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ code: 404, message: 'Not Found' }))
    return
  }

  if (!API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        code: 500,
        message: '请在 server/amap-proxy/.env 配置 AMAP_API_KEY（Web 服务类型）'
      })
    )
    return
  }

  if (API_KEY.startsWith('wx')) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        code: 500,
        message: 'AMAP_API_KEY 不能是微信 AppID，请使用 Web 服务 Key'
      })
    )
    return
  }

  try {
    const body = await readBody(req)
    const data = await fetchAmapWebApi(body)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ code: 0, data }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ code: 500, message: e.message || 'Server Error' }))
  }
})

async function startupCheck() {
  if (!API_KEY) {
    console.log('⚠️  未配置 AMAP_API_KEY，请编辑 server/amap-proxy/.env')
    return
  }
  try {
    await fetchAmapWebApi({
      latitude: 39.9219,
      longitude: 116.44355,
      page: 1,
      pageSize: 1,
      keyword: '美食'
    })
    console.log('✓  Web 服务 Key 校验通过')
  } catch (e) {
    console.log('')
    console.log('✗  Key 校验失败:', e.message)
    console.log('')
    console.log('  请到 https://console.amap.com/dev/key/app')
    console.log('  → 添加 Key → 服务平台选【Web服务】（不是微信小程序）')
    console.log('  → 勾选「搜索 POI」')
    console.log('  → 将新 Key 写入 .env 的 AMAP_API_KEY')
    console.log('')
  }
}

server.listen(PORT, async () => {
  console.log('')
  console.log('高德 Web 服务代理已启动')
  console.log(`  接口: http://127.0.0.1:${PORT}/api/amap/nearby`)
  console.log(`  诊断: http://127.0.0.1:${PORT}/health?check=1`)
  await startupCheck()
  console.log('')
})
