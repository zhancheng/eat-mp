# 吃啥 · 高德附近美食推荐

微信小程序直连 **高德 Web 服务 API**（周边搜索）。

## 架构

```
小程序  →  https://restapi.amap.com/v3/place/around?key=...
```

## 1. 申请高德 Key

1. 打开 [高德控制台 → 应用管理](https://console.amap.com/dev/key/app)
2. **添加 Key** → 服务平台选 **「微信小程序」**
3. 勾选 **Web 服务 API** 下的 **搜索 POI**（周边搜索）
4. 绑定你的微信小程序 AppID
5. 将 Key 写入 `src/config/api.config.ts`（可从 `api.config.example.ts` 复制）

```bash
cp src/config/api.config.example.ts src/config/api.config.ts
# 编辑 apiKey
```

## 2. 配置微信合法域名

微信公众平台 → **开发** → **开发管理** → **服务器域名** → **request 合法域名**：

```
https://restapi.amap.com
```

开发阶段可在微信开发者工具勾选 **不校验合法域名**。

## 3. 运行

```bash
npm run dev:mp-weixin
```

用微信开发者工具打开 `dist/dev/mp-weixin`。

### 配置微信小程序 AppID（推荐）

在 `src/manifest.json` 中填写你的小程序 AppID（与高德 Key 绑定的一致）：

```json
"mp-weixin": {
  "appid": "wx你的AppID"
}
```

保存后重新执行 `npm run dev:mp-weixin`，再在开发者工具中打开 `dist/dev/mp-weixin`。未配置时会使用测试号 `touristappid`，部分工具版本可能触发安全接口报错。

## 定位不准

| 现象 | 处理 |
|------|------|
| 一直是北京 | 定位失败用默认坐标；点首页坐标行或「刷新」重新定位 |
| 模拟器位置不对 | 开发者工具 → 模拟器 → 自定义经纬度（GCJ-02） |

## 云开发（评论）

环境 ID 见 `src/config/cloud.config.ts`。部署云函数、建 `comments` 集合等步骤见 [docs/CLOUD.md](docs/CLOUD.md)。

## 常见错误

| 报错 | 处理 |
|------|------|
| **USERKEY_PLAT_NOMATCH** | Key 须为 **微信小程序** 类型（直连），不是 Web 服务 / JS API |
| INVALID_USER_KEY | Key 填错，或误填了 wx AppID |
| request:fail url not in domain list | 配置 `restapi.amap.com` 合法域名，或开发时勾选不校验 |
| 10003 | 当日调用量超限 |
| **webapi_getwxaasyncsecinfo:fail** | 多为**开发者工具内部**问题（`err_code: -80002`），与业务代码无关。若页面功能正常可忽略；否则依次尝试：① `manifest.json` 填写真实 AppID 并重新编译；② 工具 → 清除缓存 → 清除全部，重启开发者工具；③ 确认已登录微信开发者账号；④ 关闭 VPN/代理；⑤ 更新开发者工具到最新版 |

## 可选：本地代理（已不用）

若需把 Key 藏在服务端，可使用 `server/amap-proxy` + `npm run proxy:amap`，当前默认已改为小程序直连。
