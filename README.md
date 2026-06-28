# novel reader

小说阅读器

## 功能

- 个人书架：每个用户拥有独立书架，小说按用户归属，互不可见
- 用户体系：注册 / 登录（密码 + 验证码）、头像上传、个人中心
- 小说阅读：分页列表、搜索、详情、章节目录、正文阅读
- 阅读器：背景色 / 字号 / 翻页 / 自动阅读、阅读进度记录
- 爬虫数据导入：支持从 [crawler-novels](../crawler-novels) 项目一键上传采集结果

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 14 (App Router) + React 18 + Ant Design 5 + Redux Toolkit |
| 后端 | Node.js + Express + TypeScript + Sequelize |
| 数据库 | MySQL / MariaDB（Docker 部署） |
| 认证 | JWT + bcrypt |
| 文件上传 | multer |

## 目录结构

```
novel-reader/
├── client/                 # 前端（Next.js）
│   └── src/
│       ├── app/            # App Router 页面
│       ├── components/     # 组件（AppHeader、Reader 等）
│       ├── services/       # API 调用
│       ├── store/          # Redux（userSlice 等）
│       └── utils/          # 工具（getAvatarUrl 等）
├── server/                 # 后端（Express + TS）
│   └── src/
│       ├── config/         # 数据库 / 环境配置
│       ├── controllers/    # 控制器
│       ├── middlewares/    # auth / errorHandler
│       ├── models/         # Sequelize 模型（User/Novel/Chapter/ReadingProgress）
│       ├── routes/         # 路由
│       ├── services/       # 业务逻辑
│       └── utils/          # 工具（jwt / response）
│   └── scripts/
│       └── upload-novel.ts # 爬虫小说上传脚本
└── docs/                   # 技术文档
    ├── requirements.md
    ├── technical-design.md
    └── crawler-novel-upload.md
```

## 环境要求

- Node.js >= 18
- Yarn
- Docker（用于 MySQL/MariaDB）

## 启动

### 1. 数据库

```bash
docker run -d --name db -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=121869 \
  -e MYSQL_DATABASE=novel_reader \
  mariadb:latest
```

### 2. 后端

```bash
cd server
yarn install
# 配置 .env（DB_HOST / DB_USER / DB_PASSWORD / JWT_SECRET / CLIENT_URL 等）
yarn dev    # 默认 http://localhost:4000
```

后端使用 nodemon 热更新，监听 `src/` 与 `.env` 变化。

### 3. 前端

```bash
cd client
yarn install
# 配置 .env.local（NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1）
yarn dev     # 默认 http://localhost:3050
```

## 默认账号

| 邮箱 | 密码 | 说明 |
|------|------|------|
| admin@test.com | admin123 | 管理员，已上传示例小说 |

## 上传爬虫小说

爬虫采集结果存放于 [crawler-novels](../crawler-novels) 项目的 `outputs/` 目录。上传分两步：先登录保存 token，再用 token 上传。

### 第一步：登录（保存 token，7 天有效）

```bash
cd server
yarn auth --email=cn.foxfly@gmail.com --password=zz123456
```

登录成功后 token 保存在 `server/.upload-token`，有效期 7 天，期间可多次上传无需重复登录。token 过期后重新执行 `yarn auth` 即可。

**必须先有账号**：脚本调用网站登录接口校验账号密码。没有账号请到 [http://localhost:3050/register](http://localhost:3050/register) 注册。

### 第二步：上传（使用 token）

```bash
cd server

# 上传单本
yarn upload "../../crawler-novels/outputs/html/吞噬星空2：起源大陆" \
  --author=我吃西红柿 \
  --description="罗峰进入起源大陆后的故事"

# 批量上传所有已采集小说
for d in ../../crawler-novels/outputs/html/*/; do
  yarn upload "$d"
done

# 覆盖式重传
yarn upload "../../crawler-novels/outputs/html/吞噬星空2：起源大陆" --overwrite
```

### 参数说明

**`yarn auth`（登录）**

| 参数 | 必填 | 说明 |
|------|------|------|
| `--email=<邮箱>` | 是 | 登录邮箱 |
| `--password=<密码>` | 是 | 登录密码 |

**`yarn upload`（上传）**

| 参数 | 必填 | 说明 |
|------|------|------|
| `<novelDir>` | 是 | crawler-novels 的 `outputs/html/{小说名}/` 目录路径 |
| `--author=<作者>` | 否 | 小说作者，默认"未知作者" |
| `--description=<简介>` | 否 | 小说简介 |
| `--cover=<url>` | 否 | 封面 URL |
| `--overwrite` | 否 | 覆盖已存在章节，默认增量更新 |
| `--content-base=<dir>` | 否 | content 根目录，默认从 novelDir 推断 |

### 常见问题

- **未登录直接上传**：提示「未找到登录 token，请先登录」→ 先执行 `yarn auth`
- **token 过期**：提示「Token 已过期或无效」→ 重新执行 `yarn auth`
- **后端未启动**：提示「登录请求失败」→ 先启动后端 `cd server && yarn dev`

详细设计见 [docs/crawler-novel-upload.md](./docs/crawler-novel-upload.md)。

## 端口约定

- 前端：3050（`next dev -p 3050`）
- 后端：4000
- 数据库：3306
- FlareSolverr（爬虫用）：8191

后端 `.env` 的 `CLIENT_URL` 必须与前端端口一致（`http://localhost:3050`），否则跨域。

## 相关文档

- [需求文档](./docs/requirements.md)
- [技术设计](./docs/technical-design.md)
- [爬虫小说上传设计](./docs/crawler-novel-upload.md)
- [AGENTS.md](./AGENTS.md) — AI 开发工具协作规范

## TODO

- 我的作品，小说可自行设置小说相关数据，如：小说名、封面、作者、简介、目录章节名称等。
- 小说目录要分为两种
    - 有分卷的，卷下面才会分章节
    - 部分卷的，直接是章节的