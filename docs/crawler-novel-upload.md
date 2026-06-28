# 爬虫小说上传集成设计

> **方案调整说明（v2）**：原方案基于"公共小说库"模式，现调整为**个人书架模式**——每本小说归属一个用户，用户只能看到/阅读自己书架中的小说。本调整涉及数据模型、所有小说查询接口、上传接口、前端页面与 npm 脚本。v2 标记处为本次新增/修改内容。

## 1. 概述

### 1.1 目标

将 [crawler-novels](../../crawler-novels) 项目采集的小说资源，按其 `outputs/html/{小说名}/index.json` 目录索引，批量上传到 novel-reader 数据库，自动创建小说信息和章节内容。**上传的小说归属指定用户（个人书架），仅该用户可见可读。**

### 1.2 背景

- crawler-novels 负责采集，产出 `outputs/html/index.json`（目录索引）和 `outputs/content/`（纯文本正文）
- novel-reader 已预留上传接口 `POST /api/v1/admin/novels/upload`，但现有 service 实现与 crawler 实际产出格式不匹配，无法直接使用
- 需求文档 [requirements.md](./requirements.md) 第 3.4 节要求：支持批量上传、自动创建小说与章节目录、支持增量更新、上传过程展示进度
- **v2**：原 Novel 表无 user_id 字段（公共库），现调整为个人书架，需加归属字段并改造所有查询接口

### 1.3 范围

本文档描述：
1. 根据 index.json 目录上传对应小说的技术方案
2. **v2**：个人书架模式的数据模型与接口改造
3. **v2**：npm 命令行上传脚本方案

不涉及爬虫本身、阅读器 UI 交互逻辑。

---

## 2. crawler-novels 输出格式分析

### 2.1 目录结构

```
crawler-novels/outputs/
├── html/
│   └── {小说名}/
│       ├── index.json                       # 索引文件（卷顺序、章节顺序、MD5 校验）
│       └── {卷名}/
│           └── {章节名}.html                 # 原始 HTML
└── content/
    └── {小说名}/
        └── {卷名}/
            └── {章节名}.txt                  # 清洗后的纯文本（上传用此目录）
```

> **关键**：上传时读取的是 `outputs/content/` 下的 `.txt` 文件，而非 `outputs/html/` 下的 `.html` 文件。

### 2.2 index.json 结构

```json
{
  "novelName": "吞噬星空2：起源大陆",
  "startUrl": "https://www.hetushu.com/book/10319/7209073.html",
  "crawlDate": "2026-06-28T08:00:11.974Z",
  "totalChapters": 452,
  "volumes": [
    {
      "order": 1,
      "name": "第一卷 初临",
      "chapterCount": 66,
      "chapters": [
        {
          "index": 1,
          "fileName": "第一章 初临起源大陆.html",
          "url": "https://www.hetushu.com/book/10319/7209073.html",
          "contentHash": "9867d5970298908f9ccd35c797e2fef6"
        }
      ]
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `novelName` | string | 小说名称 |
| `startUrl` | string | 起始章节 URL |
| `crawlDate` | string | 采集时间（ISO 8601） |
| `totalChapters` | number | 总章节数 |
| `volumes[].order` | number | 卷序号（从 1 开始） |
| `volumes[].name` | string | 卷名 |
| `volumes[].chapterCount` | number | 本卷章节数 |
| `volumes[].chapters[].index` | number | 章节全局序号（全本递增，非卷内序号） |
| `volumes[].chapters[].fileName` | string | 文件名（**.html 后缀**，需替换为 .txt） |
| `volumes[].chapters[].url` | string | 原始采集 URL |
| `volumes[].chapters[].contentHash` | string | HTML 文件的 MD5（非 txt 内容哈希） |

### 2.3 txt 文件格式

- 路径：`outputs/content/{小说名}/{卷名}/{章节名}.txt`
- 文件名与 index.json 中 `fileName` 一致，仅后缀由 `.html` 改为 `.txt`
- 内容格式：
  ```
  第一章 初临起源大陆
  <空行>
  正文段落1
  正文段落2
  ...
  ```
  即首行为章节标题，空行后为正文（多段落以换行分隔）

### 2.4 关键发现与坑点

1. **index.json 不含 author 字段**：novel-reader 的 `Novel.author` 是 `NOT NULL`，必须额外提供作者信息
2. **index.json 不含 cover / description**：均为可选字段，可置空
3. **fileName 后缀为 .html**：实际正文在 `outputs/content` 下且为 `.txt`，需做后缀转换
4. **chapters.index 全本递增**：第二卷首章 index=67（非 1），可直接作为 `order_num` 使用
5. **各卷 chapterCount 之和 = totalChapters**：可用于完整性校验
6. **contentHash 是 HTML 文件的 MD5**：无法直接用于 txt 内容校验，若需校验需重新计算 txt 的 MD5

---

## 3. novel-reader 后端现状分析

### 3.1 数据模型

#### Novel 表（[server/src/models/Novel.ts](../server/src/models/Novel.ts)）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO_INCREMENT | 小说 ID |
| `name` | STRING(100) | NOT NULL | 小说名称 |
| `cover` | STRING(255) | NULL | 封面 URL |
| `description` | TEXT | NULL | 简介 |
| `author` | STRING(50) | NOT NULL | 作者 |
| `user_id` **v2** | INTEGER | NOT NULL, FK→users.id | **归属用户（个人书架）** |

#### Chapter 表（[server/src/models/Chapter.ts](../server/src/models/Chapter.ts)）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO_INCREMENT | 章节 ID |
| `novel_id` | INTEGER | NOT NULL, FK→Novel.id | 所属小说 ID |
| `title` | STRING(200) | NOT NULL | 章节标题 |
| `content` | TEXT('medium') | NOT NULL | 章节内容（v1 已升级为 MEDIUMTEXT） |
| `order_num` | INTEGER | NOT NULL | 章节序号（排序用） |

- 唯一索引：`uk_novel_order (novel_id, order_num)`，即同一小说下序号不可重复

#### v2 新增关联（[server/src/models/index.ts](../server/src/models/index.ts)）

```typescript
User.hasMany(Novel, { foreignKey: 'user_id', as: 'novels' });
Novel.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
```

#### v2 数据迁移（已有数据回填）

现有 Novel 记录（如已上传的《吞噬星空2》id=4）无 user_id，需指定 owner：

```sql
-- 1. 加列（允许 NULL，便于回填）
ALTER TABLE novels ADD COLUMN user_id INT NULL;
-- 2. 回填现有数据归属（指定一个已存在用户，例如 admin@test.com 的 id）
UPDATE novels SET user_id = (SELECT id FROM users WHERE email = 'admin@test.com' LIMIT 1) WHERE user_id IS NULL;
-- 3. 加非空约束 + 外键 + 索引
ALTER TABLE novels MODIFY COLUMN user_id INT NOT NULL;
ALTER TABLE novels ADD CONSTRAINT fk_novel_user FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE novels ADD INDEX idx_user_id (user_id);
```

### 3.2 现有上传接口

#### 路由（[server/src/routes/novel.ts](../server/src/routes/novel.ts#L30)）

```typescript
// 需登录
router.post('/admin/novels/upload', novelController.uploadNovelFromCrawler);
```

完整路径：`POST /api/v1/admin/novels/upload`

#### 控制器（[server/src/controllers/novelController.ts](../server/src/controllers/novelController.ts#L84)）

```typescript
export const uploadNovelFromCrawler = async (req: Request, res: Response) => {
  const { crawlerNovelPath } = req.body;
  if (!crawlerNovelPath) {
    badRequest(res, '请提供小说数据文件路径');
    return;
  }
  const result = await novelService.uploadNovelFromCrawler(crawlerNovelPath);
  success(res, result, '上传成功');
};
```

#### 现有 service 实现（[server/src/services/novelService.ts](../server/src/services/novelService.ts#L168)）

```typescript
interface CrawlerNovelData {
  name: string;
  author: string;
  cover?: string;
  description?: string;
  chapters: Array<{ title: string; content: string }>;
}

export const uploadNovelFromCrawler = async (novelPath: string) => {
  const data = await fs.readFile(novelPath, 'utf-8');
  const novelData: CrawlerNovelData = JSON.parse(data);
  // 直接创建小说 + bulkCreate 章节
};
```

### 3.3 现有实现的问题

| 问题 | 说明 |
|------|------|
| **格式不匹配** | service 期望单一 JSON 文件含全部章节内容，但 crawler 实际是 index.json + 分散 txt 文件 |
| **缺少 author 来源** | index.json 无 author 字段，现有接口也未接收 author 参数 |
| **不支持增量更新** | 现有实现直接 `Novel.create`，重复上传会创建重复小说记录 |
| **无进度反馈** | 需求要求"上传过程需展示进度"，现有实现一次性 bulkCreate，无进度回调 |
| **无完整性校验** | 未校验文件是否存在、章节数是否匹配 |
| **无事务保护** | 中途失败会留下脏数据（小说已建但章节未建完） |
| **无用户归属（v2）** | Novel 表无 user_id，所有小说全站共享；需改为个人书架，每本小说归属一个用户 |
| **查询接口无归属过滤（v2）** | `GET /novels` 等公开接口返回全站数据，需改为按当前登录用户 user_id 过滤 |
| **章节接口无归属校验（v2）** | `GET /novels/:id/chapters` 等未校验 novel 是否属于当前用户，存在越权访问风险 |

---

## 4. 集成方案设计

### 4.1 整体流程

```
触发方式（二选一）：
  A. HTTP: POST /api/v1/admin/novels/upload  (userId 从 token 解析)
  B. npm:  yarn upload <novelDir> --user=<email> --author=<作者>  (脚本查 User 表得 userId)
  ▼
1. 确定 userId（HTTP：req.userId；npm：按 email 查 User）
2. 校验 novelDir 路径，定位 index.json
3. 解析 index.json，提取 novelName / volumes / chapters
4. 查询数据库是否已存在「该用户名下」同名小说
   ├── 不存在 → 创建 Novel（含 user_id）
   └── 已存在 → 走增量更新分支（校验 novel.user_id === userId，越权则拒绝）
5. 遍历 volumes → chapters，对每章：
   a. 拼接 txt 文件路径（outputs/content/{小说名}/{卷名}/{fileName 去后缀}.txt）
   b. 读取 txt，拆分标题与正文
   c. 校验文件存在 / 内容非空
   d. 查询该 order_num 是否已存在
      ├── 不存在 → 加入待创建列表
      └── 已存在 → 跳过（增量更新）
6. 事务内 bulkCreate 待创建章节
7. 返回 { novelId, created, skipped, totalChapters }
```

### 4.2 输入参数设计

#### 4.2.1 HTTP 接口请求体

由于 index.json 不含 author，需在请求体补充。userId 从登录 token 解析，**不由前端传入**（防伪造）：

```typescript
interface UploadRequest {
  // crawler-novels 项目中该小说的目录路径
  // 指向 outputs/html/{小说名}/ （含 index.json 的目录）
  novelDir: string;

  // 可选：作者（index.json 不含此字段）
  // 若不传，默认 "未知作者"
  author?: string;

  // 可选：小说内容根目录（用于定位 txt 文件）
  // 若不传，默认取 novelDir 同级的 ../content/{小说名}/
  contentBaseDir?: string;

  // 可选：封面 URL
  cover?: string;

  // 可选：简介
  description?: string;

  // 可选：是否覆盖已存在章节（默认 false，走增量更新）
  overwrite?: boolean;
}
```

> **userId 来源**：HTTP 方式从 `req.userId`（authMiddleware 注入）获取；**v2** 不再允许通过请求体指定 user_id，防止越权上传到他人书架。

#### 4.2.2 v2 npm 脚本参数

```
yarn upload <novelDir> [options]

位置参数：
  novelDir                crawler-novels 的 outputs/html/{小说名}/ 目录路径

可选参数：
  --user=<email>          归属用户邮箱（必填，用于查 User 表得 user_id）
  --author=<作者>         小说作者（默认 "未知作者"）
  --cover=<url>           封面 URL
  --description=<简介>    小说简介
  --overwrite             覆盖已存在章节（默认增量更新）
  --content-base=<dir>    content 根目录（默认推断）
```

> **为什么不登录**：脚本直接 import service 函数，不经 HTTP/authMiddleware。能跑脚本 = 有服务器权限 = 已是管理员。`--user` 仅用于指定"这本小说归属哪个普通用户书架"，不是鉴权。

### 4.3 service 改造方案

#### 4.3.1 新增接口定义

```typescript
// crawler-novels index.json 的实际结构
interface CrawlerIndex {
  novelName: string;
  startUrl: string;
  crawlDate: string;
  totalChapters: number;
  volumes: Array<{
    order: number;
    name: string;
    chapterCount: number;
    chapters: Array<{
      index: number;
      fileName: string;       // .html 后缀
      url: string;
      contentHash: string;
    }>;
  }>;
}

interface UploadOptions {
  novelDir: string;
  userId: number;          // v2：归属用户（必填）
  author?: string;
  contentBaseDir?: string;
  cover?: string;
  description?: string;
  overwrite?: boolean;
}

interface UploadResult {
  novelId: number;
  novelName: string;
  created: number;       // 本次新建章节数
  skipped: number;       // 已存在跳过数
  failed: number;        // 失败数
  totalChapters: number; // index.json 声明的总章节数
  errors: string[];      // 失败详情
}
```

#### 4.3.2 路径推断逻辑

```typescript
import path from 'path';

// novelDir 形如: /abs/crawler-novels/outputs/html/吞噬星空2：起源大陆
const indexFile = path.join(novelDir, 'index.json');
const novelName = path.basename(novelDir);

// contentBaseDir 推断: 同级 ../content/{小说名}/
const contentDir = contentBaseDir
  ? path.join(contentBaseDir, novelName)
  : path.join(path.dirname(novelDir), '..', 'content', novelName);
```

#### 4.3.3 章节文件路径拼接

```typescript
// index.json 中 fileName = "第一章 初临起源大陆.html"
// 实际 txt 路径 = contentDir/{卷名}/{fileName 去后缀}.txt
const txtFileName = chapter.fileName.replace(/\.html$/i, '.txt');
const txtPath = path.join(contentDir, volume.name, txtFileName);
```

#### 4.3.4 txt 内容解析

```typescript
const raw = await fs.readFile(txtPath, 'utf-8');
// 首行标题，空行，正文
const lines = raw.split(/\r?\n/);
let title = '';
let content = '';
if (lines.length > 0) {
  title = lines[0].trim();
  // 跳过首行及随后的空行，剩余为正文
  let startIdx = 1;
  while (startIdx < lines.length && lines[startIdx].trim() === '') {
    startIdx++;
  }
  content = lines.slice(startIdx).join('\n').trim();
}
// 若 txt 无标题行，回退使用 index.json 的 fileName 去后缀作为标题
if (!title) {
  title = chapter.fileName.replace(/\.html$/i, '');
}
```

#### 4.3.5 增量更新策略（v2：含用户归属）

```typescript
// 1. 查询「该用户名下」是否已存在同名小说
const existing = await Novel.findOne({
  where: { name: indexData.novelName, user_id: userId },
});

let novel: Novel;
if (!existing) {
  // 不存在 → 创建（归属当前用户）
  novel = await Novel.create({
    name: indexData.novelName,
    user_id: userId,                    // v2：归属用户
    author: author || '未知作者',
    cover: cover || null,
    description: description || null,
  }, { transaction: t });
} else {
  novel = existing;
  // v2：越权校验（虽然 where 已含 user_id，这里二次保险）
  if (novel.user_id !== userId) {
    throw new Error('无权操作他人书架的小说');
  }
}

// 2. 若小说已存在且未传 overwrite，则仅补充缺失章节
if (existing && !overwrite) {
  const existingChapters = await Chapter.findAll({
    where: { novel_id: novel.id },
    attributes: ['order_num'],
    transaction: t,
  });
  const existingSet = new Set(existingChapters.map(c => c.order_num));
  // 仅上传 existingSet 中不存在的章节
}
```

> **v2 关键变化**：`findOrCreate` 的 where 条件从 `{ name }` 改为 `{ name, user_id }`，即允许不同用户书架中存在同名小说（A 用户和 B 用户都可以有《吞噬星空2》）。

#### 4.3.6 事务保护

```typescript
import { sequelize } from '../config/database';

await sequelize.transaction(async (t) => {
  // 在事务内创建小说、bulkCreate 章节
  // 任一步骤抛错则整体回滚
});
```

### 4.4 字段映射

| 来源 | novel-reader | 说明 |
|------|--------------|------|
| `index.novelName` | `Novel.name` | 直接映射 |
| 请求体/脚本 `author` | `Novel.author` | index.json 无此字段，需外部传入 |
| 请求体/脚本 `cover` | `Novel.cover` | 可选，置空 |
| 请求体/脚本 `description` | `Novel.description` | 可选，置空 |
| **当前用户（HTTP）/ `--user`（npm）v2** | `Novel.user_id` | 归属用户，必填 |
| txt 首行 | `Chapter.title` | 解析 txt 获取 |
| txt 正文部分 | `Chapter.content` | 解析 txt 获取 |
| `chapter.index` | `Chapter.order_num` | 全本递增序号，直接用 |

---

## 5. 进度展示设计

需求要求"上传过程需展示进度"。鉴于单次 HTTP 请求无法实时推送，提供两种方案：

### 5.1 方案 A：分批上传 + 响应汇总（简单，推荐先实现）

- 单次请求同步处理，返回汇总结果（created/skipped/failed/totalChapters）
- 适合章节数不多的场景（452 章约几秒完成）
- 前端可在请求期间显示 loading，完成后展示汇总

### 5.2 方案 B：异步任务 + 轮询/SSE（适合大量章节）

1. `POST /admin/novels/upload` 立即返回 `taskId`
2. 后台任务执行上传，进度写入内存/Redis
3. 前端轮询 `GET /admin/novels/upload/progress/:taskId` 或通过 SSE 接收进度
4. 进度结构：`{ total, processed, created, skipped, failed, percent }`

> 建议：先实现方案 A 满足基本需求，后续若章节量达数千再演进到方案 B。

---

## 6. 边界处理

### 6.1 重复上传

- 按 `Novel.name` 唯一性判断是否已上传
- 已存在且 `overwrite=false`：仅补充缺失章节（按 `order_num` 去重）
- 已存在且 `overwrite=true`：先删除该小说所有章节，再全量重建（需事务）

### 6.2 断点续传

- 增量更新天然支持断点续传：上传中断后再次调用，已存在的 `order_num` 章节被跳过
- 建议在响应中返回 `skipped` 数量，便于判断是否已完成

### 6.3 文件完整性校验

| 校验项 | 处理 |
|--------|------|
| index.json 不存在 | 抛错 "未找到 index.json，请检查 novelDir 路径" |
| txt 文件不存在 | 记录到 `errors[]`，跳过该章节，`failed++`，不中断整体流程 |
| txt 内容为空 | 同上，记录错误并跳过 |
| 卷目录缺失 | 同上 |
| `totalChapters` 与实际章节数不符 | 在响应中提示，但仍处理实际找到的章节 |

### 6.4 contentHash 校验

- index.json 的 `contentHash` 是 **HTML 文件**的 MD5，非 txt 内容哈希
- 若需对 txt 做校验，需在上传时重新计算 txt 的 MD5 并自行对比（可省略，crawler 清洗过程已保证一致性）
- 如需严格校验，可校验 `outputs/html/{卷名}/{fileName}` 的 MD5 是否等于 `contentHash`，确认源数据未被篡改后再上传 txt

### 6.5 编码处理

- crawler-novels 清洗后 txt 默认 UTF-8，`fs.readFile(path, 'utf-8')` 直接读取
- 若遇乱码，检查 crawler 项目的 `clean.js` 输出编码配置

### 6.6 路径安全

- `novelDir`、`contentBaseDir` 必须为绝对路径或基于预配置的根目录
- 禁止路径穿越（如 `../../../etc/passwd`），建议在 service 内做 `path.resolve` 后校验是否在允许的根目录内

---

## 7. 兼容性与影响范围

### 7.1 接口兼容策略

现有控制器读取 `crawlerNovelPath`，改造时建议保留向后兼容：

```typescript
// 控制器层
const { crawlerNovelPath, novelDir, author, cover, description, overwrite } = req.body;
const finalNovelDir = novelDir || crawlerNovelPath;  // 优先 novelDir，回退 crawlerNovelPath
if (!finalNovelDir) {
  badRequest(res, '请提供小说目录路径（novelDir 或 crawlerNovelPath）');
  return;
}
// v2：userId 从 token 解析，不由请求体传入
const userId = req.userId!;
```

### 7.2 v2 个人书架改造涉及的文件

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `server/src/models/Novel.ts` | **加字段** | 新增 `user_id`（INTEGER NOT NULL, FK→users.id） |
| `server/src/models/index.ts` | **加关联** | `User.hasMany(Novel)` / `Novel.belongsTo(User)` |
| `server/src/services/novelService.ts` | **重写** `uploadNovelFromCrawler` + **改造查询** | 上传加 userId 参数；`getNovelList`/`getNovelDetail`/`getChapterList`/`getChapterDetail` 全部加 userId 过滤与归属校验 |
| `server/src/services/readingProgressService.ts` | **加归属校验** | `getProgress`/`updateProgress` 校验 novel 属于当前用户 |
| `server/src/controllers/novelController.ts` | **改造** | 所有控制器从 `req.userId` 取用户，传入 service |
| `server/src/controllers/readingProgressController.ts` | 无需改（已用 userId） | service 层补归属校验即可 |
| `server/src/routes/novel.ts` | **调整鉴权** | 原公开接口（列表/详情/章节）改为需登录 |
| `server/src/routes/reader.ts` | 无需改 | 已需登录 |
| `server/src/middlewares/auth.ts` | 无需改 | 已注入 `req.userId` |
| `server/scripts/upload-novel.ts` | **新建** | npm 脚本入口 |
| `server/package.json` | **加 script** | `"upload": "ts-node scripts/upload-novel.ts"` |
| `client/src/app/novels/page.tsx` | **改文案+登录守卫** | "小说库"→"我的书架"；未登录跳转登录 |
| `client/src/app/page.tsx` | **登录守卫** | 未登录跳转登录 |
| `client/src/app/novels/[id]/page.tsx` | **登录守卫** | 未登录跳转登录 |
| `client/src/app/reader/[novelId]/[chapterId]/page.tsx` | **登录守卫** | 未登录跳转登录 |
| `client/src/components/common/AppHeader.tsx` | **改文案** | "小说库"→"我的书架" |

### 7.3 v2 接口鉴权与归属过滤改造清单

| 接口 | 当前鉴权 | v2 鉴权 | v2 service 改造 |
|------|----------|---------|-----------------|
| `GET /novels` | 公开 | 需登录 | `where` 加 `user_id: userId` |
| `GET /novels/:id` | 公开 | 需登录 | 查询后校验 `novel.user_id === userId`，否则抛"无权访问" |
| `GET /novels/:id/chapters` | 公开 | 需登录 | 先校验 novel 归属，再查章节 |
| `GET /novels/:novelId/chapters/:chapterId` | 公开 | 需登录 | 先校验 novel 归属，再查章节 |
| `POST /novels`（手动创建） | 需登录 | 需登录 | `user_id = req.userId` |
| `POST /novels/:id/chapters`（手动建章） | 需登录 | 需登录 | 校验 novel 归属 |
| `POST /admin/novels/upload` | 需登录 | 需登录 | `userId = req.userId` 传入 service |
| `GET /reading-progress/:novelId` | 需登录 | 需登录 | 加 novel 归属校验 |
| `PUT /reading-progress/:novelId` | 需登录 | 需登录 | 加 novel 归属校验 |

### 7.4 v2 前端登录守卫策略

- 列表页/详情页/阅读器页：`useEffect` 中检测 `!isLoggedIn` 则 `router.push('/login')`
- AppHeader：未登录时"我的书架"菜单项可隐藏或点击跳登录
- 已有 `userSlice.hydrated` 标志，可避免 SSR 阶段误跳转

### 7.5 不受影响的功能

- 用户注册/登录/重置密码/个人中心/头像上传
- 阅读器交互逻辑（背景/字号/翻页/自动阅读）
- 验证码、邮件服务

### 7.6 风险提示

- **数据迁移**：现有 Novel 记录无 user_id，必须先回填 owner 再加 NOT NULL 约束，否则 ALTER 失败
- **测试影响**：`server/tests/novel.test.ts` 等可能基于"公共库"假设，需补充登录态与归属断言
- **公开接口转鉴权**：原 `GET /novels` 等改为需登录后，未登录请求将返回 401，前端需处理跳转
- **同名小说**：v2 允许不同用户书架有同名小说，`(name)` 不再全局唯一；若曾依赖名称唯一性需排查

---

## 8. v2 npm 脚本方案

### 8.1 为什么用 npm 命令而非页面

- 数据源在服务器本地（crawler-novels/outputs），前端无法浏览服务器文件系统
- 上传是运维操作（低频、管理员行为），非普通读者行为
- 避免 HTTP 超时（452 章约 10-20 秒）、路径泄露、token/CORS 复杂度
- 支持 shell 批量导入多本

### 8.2 脚本设计

**文件**：`server/scripts/upload-novel.ts`

```typescript
#!/usr/bin/env ts-node
/**
 * 爬虫小说上传脚本（个人书架模式）
 * 用法：
 *   yarn upload <novelDir> --user=<email> [--author=<作者>] [--description=<简介>]
 */
import { User } from '../src/models';
import { uploadNovelFromCrawler } from '../src/services/novelService';
import { sequelize } from '../src/config/database';

async function main() {
  const args = process.argv.slice(2);
  const novelDir = args[0];
  if (!novelDir) {
    console.error('用法: yarn upload <novelDir> --user=<email> [--author=...]');
    process.exit(1);
  }

  // 解析 --key=value 参数
  const opts: Record<string, string> = {};
  for (const arg of args.slice(1)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  }

  const userEmail = opts.user;
  if (!userEmail) {
    console.error('错误：必须指定 --user=<email>（归属用户邮箱）');
    process.exit(1);
  }

  await sequelize.authenticate();

  // 按 email 查用户，得 user_id
  const user = await User.findOne({ where: { email: userEmail } });
  if (!user) {
    console.error(`错误：用户不存在 ${userEmail}`);
    process.exit(1);
  }

  console.log(`📖 正在上传到 ${user.nickname} 的书架...`);
  const result = await uploadNovelFromCrawler({
    novelDir,
    userId: user.id,
    author: opts.author,
    description: opts.description,
    cover: opts.cover,
    overwrite: 'overwrite' in opts,
    contentBaseDir: opts['content-base'],
  });

  console.log(`✅ 上传完成: ${result.novelName}`);
  console.log(`   新建: ${result.created}  跳过: ${result.skipped}  失败: ${result.failed}`);
  if (result.errors.length) {
    console.log('   失败详情:');
    result.errors.forEach((e) => console.log('   - ' + e));
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ 上传失败:', e.message);
  process.exit(1);
});
```

### 8.3 package.json script

```json
{
  "scripts": {
    "upload": "ts-node scripts/upload-novel.ts"
  }
}
```

### 8.4 使用示例

```bash
# 上传单本到指定用户书架
yarn upload ../crawler-novels/outputs/html/吞噬星空2：起源大陆 \
  --user=admin@test.com \
  --author=我吃西红柿 \
  --description="罗峰进入起源大陆后的故事"

# 批量上传所有已采集小说到同一用户书架
for d in ../crawler-novels/outputs/html/*/; do
  yarn upload "$d" --user=admin@test.com --author=未知
done

# 覆盖式重传
yarn upload ../crawler-novels/outputs/html/吞噬星空2：起源大陆 \
  --user=admin@test.com --overwrite
```

### 8.5 输出示例

```
📖 正在上传到 管理员 的书架...
✅ 上传完成: 吞噬星空2：起源大陆
   新建: 452  跳过: 0  失败: 0
```

---

## 9. 调用方式（HTTP）

### 9.1 接口定义

```
POST /api/v1/admin/novels/upload
Content-Type: application/json
Authorization: Bearer <token>
```

> v2：userId 从 token 解析，小说归属当前登录用户。

### 9.2 请求示例

```bash
curl -X POST http://localhost:4000/api/v1/admin/novels/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -d '{
    "novelDir": "/Users/foxfly/Desktop/Benji/project/crawler-novels/outputs/html/吞噬星空2：起源大陆",
    "author": "我吃西红柿",
    "description": "罗峰进入起源大陆后的故事"
  }'
```

### 9.3 成功响应

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "novelId": 1,
    "novelName": "吞噬星空2：起源大陆",
    "created": 452,
    "skipped": 0,
    "failed": 0,
    "totalChapters": 452,
    "errors": []
  }
}
```

### 9.4 增量上传响应（第二次调用）

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "novelId": 1,
    "novelName": "吞噬星空2：起源大陆",
    "created": 0,
    "skipped": 452,
    "failed": 0,
    "totalChapters": 452,
    "errors": []
  }
}
```

### 9.5 越权访问响应（v2）

```json
{
  "code": 403,
  "message": "无权操作他人书架的小说"
}
```

---

## 10. 实现步骤建议（v2）

1. **数据模型**：`Novel.ts` 加 `user_id` 字段；`models/index.ts` 加 User↔Novel 关联
2. **数据库迁移**：执行 ALTER 加列 → 回填现有数据 owner → 加 NOT NULL/外键/索引
3. **service 改造**：
   - `uploadNovelFromCrawler` 加 `userId` 参数，`where` 加 `user_id`，创建时写入 `user_id`
   - `getNovelList`/`getNovelDetail`/`getChapterList`/`getChapterDetail` 加 `userId` 过滤与归属校验
   - `readingProgressService` 加 novel 归属校验
4. **controller 改造**：所有 novel/progress 控制器从 `req.userId` 取用户传入 service
5. **路由鉴权调整**：`novel.ts` 把原公开接口移到 `authMiddleware` 之后
6. **npm 脚本**：新建 `scripts/upload-novel.ts`，package.json 加 `upload` script
7. **前端守卫**：列表/详情/阅读器页加未登录跳转；"小说库"改"我的书架"
8. **测试补充**：novel.test.ts 补登录态与归属断言（A 用户看不到 B 用户的小说）
9. **手动验证**：npm 脚本上传《吞噬星空2》到 admin@test.com 书架，登录该账号验证可见可读

---

## 11. 附录

### 11.1 参考文件

- [crawler-novels README](../../crawler-novels/README.md) — 爬虫项目说明与输出结构
- [requirements.md](./requirements.md) 第 3.4 节 — 小说上传需求
- [technical-design.md](./technical-design.md) — 整体技术架构
- [server/src/services/novelService.ts](../server/src/services/novelService.ts) — 现有 service 实现
- [server/src/models/Novel.ts](../server/src/models/Novel.ts) — Novel 模型
- [server/src/models/Chapter.ts](../server/src/models/Chapter.ts) — Chapter 模型
- [server/src/models/User.ts](../server/src/models/User.ts) — User 模型

### 11.2 关键路径速查

| 用途 | 路径 |
|------|------|
| 爬虫索引 | `crawler-novels/outputs/html/{小说名}/index.json` |
| 爬虫正文 | `crawler-novels/outputs/content/{小说名}/{卷名}/{章节名}.txt` |
| HTTP 上传接口 | `POST /api/v1/admin/novels/upload` |
| npm 上传命令 | `yarn upload <novelDir> --user=<email>` |
| service 入口 | `novelService.uploadNovelFromCrawler` |
| npm 脚本入口 | `server/scripts/upload-novel.ts` |
