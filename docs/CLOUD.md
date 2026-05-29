# 微信云开发

环境 ID：`cloudbase-d5g6ftxvg6526813c`（配置在 `src/config/cloud.config.ts`）

## 1. 云数据库

在云开发控制台 → **数据库** → 新建集合：

| 集合名 | 说明 |
|--------|------|
| `comments` | 餐厅评论 |
| `user_profiles` | 用户资料（文档 ID 为 openid） |
| `user_restaurant_lists` | 用户收藏 / 不喜欢列表（文档 ID 为 `{openid}_{listType}_{restaurantId}`） |

建议字段（由云函数写入，无需手建）：

- `restaurantId`：餐厅 ID（与 `Restaurant.id` 一致）
- `content`：评论正文
- `rating`：1–5 星，0 表示未评
- `nickName`、`avatarUrl`
- `createdAt`：服务器时间
- `status`：`normal` / `hidden`

**索引**（集合 → 索引）：

- `restaurantId` + `createdAt` 降序（列表查询）

**权限**（集合 → 权限设置，推荐）：

- 所有用户可读：`status == normal` 的记录
- 仅云函数可写（客户端不要开放「所有用户可写」）

更安全做法：读也走云函数 `listComments`（当前已实现），库权限可设为「仅创建者可读写」。

## 2. 正式 AppID（必做，否则必报 system error）

在 **`src/manifest.json`** 填写（两处 `appid` 都填同一个）：

```json
"appid": "wxXXXXXXXX",
"mp-weixin": {
  "appid": "wxXXXXXXXX",
  ...
}
```

然后执行 `npm run dev:mp-weixin`，用开发者工具打开 `dist/dev/mp-weixin`。

在工具 **详情 → 基本信息** 里确认 AppID **不是** `touristappid`。若仍是测试号，在工具右上角切换为你的小程序再编译。

云开发环境必须是用 **这个 AppID 的小程序** 创建的，否则 `cloudbase-d5g6ftxvg6526813c` 无法调用。

### 最关键：小程序关联环境（很多人漏这一步）

打开 [腾讯云 CloudBase 控制台](https://tcb.cloud.tencent.com/dev) 或微信开发者工具 → 云开发 → 设置：

**环境配置 → 安全配置 → 小程序关联**，添加：

`wx311c513e886b1cf1`

未关联时，客户端会报 `cloud.callFunction:fail system error`（函数已上传也会失败）。

上传云函数时，右上角环境必须选 **`cloudbase-d5g6ftxvg6526813c`**，不能选错其他环境。

## 3. 部署云函数

```bash
npm run dev:mp-weixin
# 或单独同步（改完云函数代码后）
npm run copy:cloudfunctions
```

**为什么要复制？** 开发者工具打开的是 `dist/dev/mp-weixin`（小程序根目录），`project.config.json` 里 `cloudfunctionRoot` 为 `cloudfunctions/`，因此云函数必须出现在 **`dist/dev/mp-weixin/cloudfunctions/`**。源码维护在仓库根 **`cloudfunctions/`**，编译结束会自动复制（`vite.config.ts` 插件 + `npm run dev:mp-weixin` 末尾脚本）。

若左侧没有 cloudfunctions：先确认 `dist/dev/mp-weixin` 已存在，再执行 `npm run copy:cloudfunctions`。

**不想复制？** 可把 `manifest.json` 的 `cloudfunctionRoot` 改回 `../../../cloudfunctions/`（指向仓库根），部分开发者工具版本可用，但上传部署偶发异常，仍推荐复制方案。

微信开发者工具打开 **`dist/dev/mp-weixin`**，左侧应出现 **cloudfunctions** 文件夹。

对每个函数右键 → **上传并部署：云端安装依赖**：

- `listComments`
- `addComment`
- `getUserProfile`
- `saveUserProfile`
- `listUserRestaurants`
- `toggleUserRestaurant`
- `removeUserRestaurants`
- `migrateUserRestaurants`

## 4. 内容安全

`addComment` 已调用 `security.msgSecCheck`。若报错，在云开发控制台确认已开通 **openapi** / 内容安全相关权限。

## 5. 收藏与不喜欢列表

集合 `user_restaurant_lists` 字段（云函数写入）：

- `openid`：用户 openid
- `listType`：`favorite` | `dislike`
- `restaurantId`：餐厅 ID
- `restaurant`：餐厅快照对象
- `updatedAt`：更新时间

**索引**（集合 → 索引）：

- `openid` + `listType` + `updatedAt` 降序

**权限**：仅云函数可读写（客户端通过云函数操作）。

**云函数**：

| 函数 | 说明 |
|------|------|
| `listUserRestaurants` | 拉取某类列表 |
| `toggleUserRestaurant` | 添加/取消；加入一类会自动从另一类移除 |
| `removeUserRestaurants` | 批量删除（管理页） |
| `migrateUserRestaurants` | 首次启动将本地旧收藏迁移上云 |

在 **我的** 页可进入「我的收藏」「不喜欢的餐厅」进行管理删除。详情页可 ☆ 收藏、👎 不喜欢；不喜欢项不会出现在附近美食列表。

## 6. 用户资料（「我的」页）

在 **我的** Tab 设置头像、昵称，保存到 `user_profiles` 集合。发表评论时自动读取，无需每次填写。

需部署云函数 `getUserProfile`、`saveUserProfile`。

## 7. 评论头像（云存储）

发表评论时头像会传到云存储目录 `comment-avatars/`。在云开发控制台 → **存储 → 权限设置** 中允许用户上传（或使用默认「仅创建者可读写」配合云函数上传）。

头像使用微信 **chooseAvatar + nickname** 能力填写；`cloud://` fileID 会写入 `comments` 集合的 `avatarUrl` 字段。

## 8. comments 集合权限（建议）

| 操作 | 权限 |
|------|------|
| 读 | 所有用户可读（或仅云函数读） |
| 写 | 仅管理端可写（发表走 addComment 云函数） |

若云函数仍失败，列表会尝试客户端直连数据库读（需「所有用户可读」）。

## 9. 常见报错

| 现象 | 处理 |
|------|------|
| `system error (Error), retry... abort` | 未部署云函数 / 用了测试号 / 环境未选中 |
| `Environment invalid` / `-501000` | AppID 与云环境不一致，检查 envId |
| `Function not found` | 函数名不对或未上传，部署 `listComments`、`addComment` |

## 10. 本地调试

- 开发者工具 → 云开发 → 选择环境 `cloudbase-d5g6ftxvg6526813c`
- 详情页发表一条测试评论，在数据库 `comments` 中应能看到记录
