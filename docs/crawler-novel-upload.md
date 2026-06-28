# 爬虫小说上传集成设计

## 1. 概述

### 1.1 目标

将 [crawler-novels](../../crawler-novels) 项目采集的小说资源，按其 `outputs/html/{小说名}/index.json` 目录索引，批量上传到 novel-reader 数据库，自动创建小说信息和章节内容。

### 1.2 背景

- crawler-novels 负责采集，产出 `outputs/html/index.json`（目录索引）和 `outputs/content/`（纯文本正文）
- novel-reader 已预留上传接口 `POST /api/v1/admin/novels/upload`，但现有 service 实现与 crawler 实际产出格式不匹配，无法直接使用
- 需求文档 [requirements.md](./requirements.md) 第 3.4 节要求：支持批量上传、自动创建小说与章节目录、支持增量更新、上传过程展示进度

### 1.3 范围

本文档仅描述"根据 index.json 目录上传对应小说"的技术方案，不涉及爬虫本身、前端阅读器 UI。

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

#### Chapter 表（[server/src/models/Chapter.ts](../server/src/models/Chapter.ts)）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO_INCREMENT | 章节 ID |
| `novel_id` | INTEGER | NOT NULL, FK→Novel.id | 所属小说 ID |
| `title` | STRING(200) | NOT NULL | 章节标题 |
| `content` | TEXT | NOT NULL | 章节内容 |
| `order_num` | INTEGER | NOT NULL | 章节序号（排序用） |

- 唯一索引：`uk_novel_order (novel_id, order_num)`，即同一小说下序号不可重复

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

---

## 4. 集成方案设计

### 4.1 整体流程

```
POST /api/v1/admin/novels/upload
  │  body: { novelDir, author?, cover?, description? }
  ▼
1. 校验 novelDir 路径，定位 index.json
2. 解析 index.json，提取 novelName / volumes / chapters
3. 查询数据库是否已存在同名小说
   ├── 不存在 → 创建 Novel
   └── 已存在 → 走增量更新分支
4. 遍历 volumes → chapters，对每章：
   a. 拼接 txt 文件路径（outputs/content/{小说名}/{卷名}/{fileName 去后缀}.txt）
   b. 读取 txt，拆分标题与正文
   c. 校验文件存在 / 内容非空
   d. 查询该 order_num 是否已存在
      ├── 不存在 → 加入待创建列表
      └── 已存在 → 跳过（增量更新）
5. 事务内 bulkCreate 待创建章节
6. 返回 { novelId, created, skipped, totalChapters }
```

### 4.2 输入参数设计

由于 index.json 不含 author，需在请求体补充。建议请求体扩展为：

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
  // 通常 novelDir 已含小说名，可推断出 content 目录
  contentBaseDir?: string;

  // 可选：封面 URL
  cover?: string;

  // 可选：简介
  description?: string;

  // 可选：是否覆盖已存在章节（默认 false，走增量更新）
  overwrite?: boolean;
}
```

> **兼容性说明**：现有控制器读取 `crawlerNovelPath`。为最小化破坏，可保留 `crawlerNovelPath` 作为 `novelDir` 的别名（二者传任一即可），并在 service 内部做归一化。具体兼容策略见 [第 7 节](#7-兼容性与影响范围)。

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

#### 4.3.5 增量更新策略

```typescript
// 1. 查询或创建小说
const [novel, created] = await Novel.findOrCreate({
  where: { name: indexData.novelName },
  defaults: {
    name: indexData.novelName,
    author: author || '未知作者',
    cover: cover || null,
    description: description || null,
  },
});

// 2. 若小说已存在且 created=false，且未传 overwrite，则仅补充缺失章节
if (!created && !overwrite) {
  // 查询已有 order_num 集合
  const existing = await Chapter.findAll({
    where: { novel_id: novel.id },
    attributes: ['order_num'],
  });
  const existingSet = new Set(existing.map(c => c.order_num));
  // 仅上传 existingSet 中不存在的章节
}
```

#### 4.3.6 事务保护

```typescript
import { sequelize } from '../config/database';

await sequelize.transaction(async (t) => {
  // 在事务内创建小说、bulkCreate 章节
  // 任一步骤抛错则整体回滚
});
```

### 4.4 字段映射

| crawler-novels | novel-reader | 说明 |
|----------------|--------------|------|
| `index.novelName` | `Novel.name` | 直接映射 |
| 请求体 `author` | `Novel.author` | index.json 无此字段，需外部传入 |
| 请求体 `cover` | `Novel.cover` | 可选，置空 |
| 请求体 `description` | `Novel.description` | 可选，置空 |
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
```

### 7.2 影响的文件

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `server/src/services/novelService.ts` | **重写** `uploadNovelFromCrawler` | 核心改造，从单 JSON 读取改为 index.json + txt 遍历 |
| `server/src/controllers/novelController.ts` | 小幅修改 | 扩展请求体参数解析（author 等） |
| `server/src/routes/novel.ts` | **无需改动** | 路由路径不变 |
| `server/src/models/Novel.ts` | **无需改动** | 表结构不变 |
| `server/src/models/Chapter.ts` | **无需改动** | 表结构不变 |

### 7.3 不受影响的功能

- 小说列表/详情/章节目录查询接口（公开接口）
- 阅读器相关接口
- 用户体系、阅读进度等其他模块

### 7.4 风险提示

- 改造 `uploadNovelFromCrawler` 会导致原有期望"单一 JSON 含 chapters"的调用方式失效。当前项目中**无任何地方实际调用此接口**（仅路由定义），故改造无破坏性影响
- 改造需在事务内执行，注意 Sequelize 事务与 `findOrCreate` 的配合

---

## 8. 调用方式

### 8.1 接口定义

```
POST /api/v1/admin/novels/upload
Content-Type: application/json
Authorization: Bearer <token>
```

### 8.2 请求示例

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

### 8.3 成功响应

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

### 8.4 增量上传响应（第二次调用）

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

### 8.5 部分失败响应

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "novelId": 1,
    "novelName": "吞噬星空2：起源大陆",
    "created": 450,
    "skipped": 0,
    "failed": 2,
    "totalChapters": 452,
    "errors": [
      "第 50 章 txt 文件不存在: .../第三卷/第五十章 xxx.txt",
      "第 120 章 txt 内容为空: .../第五卷/第六十章 xxx.txt"
    ]
  }
}
```

---

## 9. 实现步骤建议

1. **改造 service**（核心）：在 `novelService.ts` 中重写 `uploadNovelFromCrawler`，实现 index.json 解析 + txt 遍历 + 增量更新 + 事务保护
2. **扩展控制器**：在 `novelController.ts` 中补充 `author`、`novelDir` 等参数解析
3. **编写测试**：在 `server/tests/novel.test.ts` 中补充上传接口的单元测试与边界测试（重复上传、文件缺失、路径错误等）
4. **手动验证**：用 curl 调用接口上传《吞噬星空2：起源大陆》，检查数据库 novels/chapters 表记录
5. **前端对接**（可选）：若需 UI 触发，在管理后台增加上传表单，传入 `novelDir` 与 `author`

---

## 10. 附录

### 10.1 参考文件

- [crawler-novels README](../../crawler-novels/README.md) — 爬虫项目说明与输出结构
- [requirements.md](./requirements.md) 第 3.4 节 — 小说上传需求
- [technical-design.md](./technical-design.md) — 整体技术架构
- [server/src/services/novelService.ts](../server/src/services/novelService.ts) — 现有 service 实现
- [server/src/models/Novel.ts](../server/src/models/Novel.ts) — Novel 模型
- [server/src/models/Chapter.ts](../server/src/models/Chapter.ts) — Chapter 模型

### 10.2 关键路径速查

| 用途 | 路径 |
|------|------|
| 爬虫索引 | `crawler-novels/outputs/html/{小说名}/index.json` |
| 爬虫正文 | `crawler-novels/outputs/content/{小说名}/{卷名}/{章节名}.txt` |
| 上传接口 | `POST /api/v1/admin/novels/upload` |
| service 入口 | `novelService.uploadNovelFromCrawler` |
