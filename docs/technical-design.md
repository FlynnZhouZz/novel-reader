# 小说阅读器 - 技术设计文档

## 1. 系统架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      客户端 (Client)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js (React + SSR)                           │  │
│  │  ├── Pages (路由)                                 │  │
│  │  ├── Components (UI 组件)                         │  │
│  │  ├── Redux (状态管理)                             │  │
│  │  └── Axios (HTTP 请求)                            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────┐
│                      服务端 (Server)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Node.js + Express                               │  │
│  │  ├── Routes (路由层)                              │  │
│  │  ├── Controllers (控制层)                         │  │
│  │  ├── Services (业务逻辑层)                        │  │
│  │  ├── Models (数据模型层)                          │  │
│  │  └── Middlewares (中间件)                         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓ MySQL
┌─────────────────────────────────────────────────────────┐
│                      数据库 (MySQL)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │  - users (用户表)                                 │  │
│  │  - novels (小说表)                                │  │
│  │  - chapters (章节表)                              │  │
│  │  - reading_progress (阅读进度表)                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 技术选型详情

#### 客户端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| Next.js | 14.x | SSR/SSG 框架、路由 |
| Ant Design | 5.x | UI 组件库 |
| Redux Toolkit | 2.x | 状态管理 |
| Axios | 1.x | HTTP 请求 |

#### 服务端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18.x+ | 运行环境 |
| Express | 4.x | Web 框架 |
| Sequelize | 6.x | ORM |
| MySQL2 | 3.x | MySQL 驱动 |
| JWT | 9.x | Token 生成与验证 |
| bcrypt | 5.x | 密码加密 |
| nodemailer | 6.x | 邮件发送 |
| multer | 1.x | 文件上传 |

---

## 2. 数据库设计

### 2.1 ER 图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │   novels    │       │  chapters   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ email       │◄──────│ author_id   │       │ novel_id(FK)│
│ password    │       │ name        │──────►│ title       │
│ nickname    │       │ cover       │       │ content     │
│ avatar      │       │ description │       │ order_num   │
│ bio         │       │ created_at  │       │ created_at  │
│ created_at  │       │ updated_at  │       │ updated_at  │
└─────────────┘       └─────────────┘       └─────────────┘
       │
       │
       ▼
┌─────────────────┐
│ reading_progress│
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ novel_id (FK)   │
│ chapter_id (FK) │
│ scroll_position │
│ updated_at      │
└─────────────────┘
```

### 2.2 数据表结构

#### 2.2.1 用户表 (users)

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
  password VARCHAR(255) NOT NULL COMMENT '密码（bcrypt加密）',
  nickname VARCHAR(50) NOT NULL DEFAULT '新用户' COMMENT '昵称',
  avatar VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
  bio VARCHAR(200) DEFAULT NULL COMMENT '简介',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

#### 2.2.2 小说表 (novels)

```sql
CREATE TABLE novels (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '小说ID',
  name VARCHAR(100) NOT NULL COMMENT '小说名称',
  cover VARCHAR(255) DEFAULT NULL COMMENT '封面URL',
  description TEXT DEFAULT NULL COMMENT '简介',
  author VARCHAR(50) NOT NULL COMMENT '作者',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_name (name),
  INDEX idx_author (author)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小说表';
```

#### 2.2.3 章节表 (chapters)

```sql
CREATE TABLE chapters (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '章节ID',
  novel_id INT NOT NULL COMMENT '所属小说ID',
  title VARCHAR(200) NOT NULL COMMENT '章节标题',
  content LONGTEXT NOT NULL COMMENT '章节内容',
  order_num INT NOT NULL COMMENT '章节序号（用于排序）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
  INDEX idx_novel_order (novel_id, order_num),
  UNIQUE KEY uk_novel_order (novel_id, order_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='章节表';
```

#### 2.2.4 阅读进度表 (reading_progress)

```sql
CREATE TABLE reading_progress (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '进度ID',
  user_id INT NOT NULL COMMENT '用户ID',
  novel_id INT NOT NULL COMMENT '小说ID',
  chapter_id INT NOT NULL COMMENT '当前章节ID',
  scroll_position FLOAT DEFAULT 0 COMMENT '滚动位置（0-1）',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_novel (user_id, novel_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='阅读进度表';
```

---

## 3. API 接口设计

### 3.1 接口规范

**基础路径：** `/api/v1`

**请求头：**
```
Content-Type: application/json
Authorization: Bearer <token>  // 需要鉴权的接口
```

**响应格式：**
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

**错误码定义：**
| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或 Token 失效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 3.2 用户相关接口

#### 3.2.1 发送验证码

```
POST /api/v1/auth/send-code
```

**请求参数：**
```json
{
  "email": "user@example.com",
  "type": "register"  // register | login | reset
}
```

**响应：**
```json
{
  "code": 200,
  "message": "验证码已发送"
}
```

#### 3.2.2 邮箱+验证码注册

```
POST /api/v1/auth/register
```

**请求参数：**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**响应：**
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "nickname": "新用户",
      "avatar": null,
      "bio": null
    }
  }
}
```

#### 3.2.3 邮箱+密码注册

```
POST /api/v1/auth/register-with-password
```

**请求参数：**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**响应：** 同 3.2.2

#### 3.2.4 邮箱+验证码登录

```
POST /api/v1/auth/login-with-code
```

**请求参数：**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应：** 同 3.2.2

#### 3.2.5 邮箱+密码登录

```
POST /api/v1/auth/login
```

**请求参数：**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应：** 同 3.2.2

#### 3.2.6 重置密码

```
POST /api/v1/auth/reset-password
```

**请求参数：**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**响应：**
```json
{
  "code": 200,
  "message": "密码重置成功",
  "data": {
    "token": "jwt_token_here"
  }
}
```

#### 3.2.7 获取当前用户信息

```
GET /api/v1/user/profile
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "新用户",
    "avatar": "http://example.com/avatar.jpg",
    "bio": "这个人很懒，什么都没留下",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 3.2.8 更新用户信息

```
PUT /api/v1/user/profile
```

**请求参数：**
```json
{
  "nickname": "新昵称",
  "bio": "新的简介"
}
```

**响应：**
```json
{
  "code": 200,
  "message": "更新成功"
}
```

#### 3.2.9 上传头像

```
POST /api/v1/user/avatar
Content-Type: multipart/form-data
```

**请求参数：**
```
avatar: <file>
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "avatar": "http://example.com/avatar.jpg"
  }
}
```

#### 3.2.10 修改密码

```
PUT /api/v1/user/password
```

**请求参数：**
```json
{
  "oldPassword": "oldpassword123",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**响应：**
```json
{
  "code": 200,
  "message": "密码修改成功"
}
```

### 3.3 小说相关接口

#### 3.3.1 获取小说列表

```
GET /api/v1/novels
```

**查询参数：**
```
page: 1          // 页码，默认 1
limit: 20        // 每页数量，默认 20
keyword: ""      // 搜索关键词（可选）
author: ""       // 作者筛选（可选）
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "小说名称",
        "cover": "http://example.com/cover.jpg",
        "description": "小说简介...",
        "author": "作者名",
        "chapterCount": 100,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

#### 3.3.2 获取小说详情

```
GET /api/v1/novels/:id
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "name": "小说名称",
    "cover": "http://example.com/cover.jpg",
    "description": "小说完整简介",
    "author": "作者名",
    "chapterCount": 100,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 3.3.3 获取章节目录

```
GET /api/v1/novels/:id/chapters
```

**响应：**
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "title": "第一章",
      "orderNum": 1
    },
    {
      "id": 2,
      "title": "第二章",
      "orderNum": 2
    }
  ]
}
```

#### 3.3.4 获取章节内容

```
GET /api/v1/novels/:novelId/chapters/:chapterId
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "title": "第一章",
    "content": "章节内容...",
    "orderNum": 1,
    "prevChapterId": null,
    "nextChapterId": 2
  }
}
```

#### 3.3.5 上传小说（从 crawler-novels）

```
POST /api/v1/admin/novels/upload
```

**请求参数：**
```json
{
  "crawlerNovelPath": "/path/to/crawler/novels/data"
}
```

**响应：**
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "novelId": 1,
    "chapterCount": 100
  }
}
```

### 3.4 阅读进度接口

#### 3.4.1 获取阅读进度

```
GET /api/v1/reading-progress/:novelId
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "chapterId": 1,
    "scrollPosition": 0.5
  }
}
```

#### 3.4.2 更新阅读进度

```
PUT /api/v1/reading-progress/:novelId
```

**请求参数：**
```json
{
  "chapterId": 1,
  "scrollPosition": 0.5
}
```

**响应：**
```json
{
  "code": 200,
  "message": "更新成功"
}
```

---

## 4. 客户端架构设计

### 4.1 目录结构

```
client/
├── public/              # 静态资源
│   ├── images/
│   └── favicon.ico
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── layout.tsx   # 根布局
│   │   ├── page.tsx     # 首页
│   │   ├── login/       # 登录页
│   │   ├── register/    # 注册页
│   │   ├── profile/     # 个人中心
│   │   ├── novels/      # 小说列表
│   │   │   └── [id]/    # 小说详情
│   │   └── reader/      # 阅读器
│   │       └── [novelId]/
│   │           └── [chapterId]/
│   ├── components/      # 组件
│   │   ├── common/      # 通用组件
│   │   ├── user/        # 用户相关组件
│   │   ├── novel/       # 小说相关组件
│   │   └── reader/      # 阅读器组件
│   ├── store/           # Redux 状态管理
│   │   ├── index.ts
│   │   └── slices/
│   │       ├── userSlice.ts
│   │       ├── novelSlice.ts
│   │       └── readerSlice.ts
│   ├── services/        # API 服务
│   │   ├── api.ts       # Axios 实例
│   │   ├── user.ts
│   │   ├── novel.ts
│   │   └── reader.ts
│   ├── hooks/           # 自定义 Hooks
│   ├── utils/           # 工具函数
│   └── styles/          # 全局样式
├── package.json
├── next.config.js
└── tsconfig.json
```

### 4.2 核心页面

#### 4.2.1 登录/注册页

- 支持邮箱+验证码、邮箱+密码两种登录方式
- 支持邮箱+验证码、邮箱+密码两种注册方式
- 提供重置密码入口
- 使用 Ant Design 的 Tabs、Form、Input、Button 组件

#### 4.2.2 个人中心页

- 展示用户头像、昵称、简介
- 支持修改头像（上传组件）
- 支持修改昵称、简介（表单）
- 支持修改密码（表单）

#### 4.2.3 小说列表页

- 展示小说卡片列表（Grid 布局）
- 支持搜索（Input.Search）
- 支持分页（Pagination）
- 使用 Ant Design 的 Card、Row、Col 组件

#### 4.2.4 小说详情页

- 展示小说封面、名称、作者、简介
- 展示章节目录列表
- 提供"开始阅读"按钮
- 使用 Ant Design 的 Descriptions、List、Button 组件

#### 4.2.5 阅读器页

- 核心阅读界面
- 顶部：小说名称、章节标题、设置按钮、目录按钮
- 中间：章节内容展示区域
- 底部：上一章、下一章按钮
- 设置面板：背景颜色、字体大小、暗黑模式、翻页模式、自动阅读
- 目录面板：侧边抽屉展示章节目录

### 4.3 状态管理 (Redux)

#### 4.3.1 userSlice

```typescript
interface UserState {
  token: string | null;
  userInfo: {
    id: number;
    email: string;
    nickname: string;
    avatar: string | null;
    bio: string | null;
  } | null;
  isLoggedIn: boolean;
}
```

#### 4.3.2 novelSlice

```typescript
interface NovelState {
  novelList: Novel[];
  currentNovel: Novel | null;
  chapters: Chapter[];
  total: number;
  page: number;
  loading: boolean;
}
```

#### 4.3.3 readerSlice

```typescript
interface ReaderState {
  currentChapter: Chapter | null;
  settings: {
    backgroundColor: string;
    fontSize: number;
    darkMode: boolean;
    flipMode: 'scroll' | 'slide' | 'cover' | 'realistic';
    autoReadSpeed: number;
  };
  autoReading: boolean;
}
```

### 4.4 阅读器核心实现

#### 4.4.1 翻页模式实现

**上下翻页（scroll）：**
- 传统网页滚动
- 内容从上到下排列
- 使用 CSS `overflow-y: auto`

**平移翻页（slide）：**
- 使用 CSS Transform 实现左右滑动
- 监听触摸/鼠标事件计算滑动距离
- 滑动超过阈值时切换章节

```typescript
// 伪代码
const [translateX, setTranslateX] = useState(0);

const handleSwipe = (deltaX: number) => {
  if (deltaX > threshold) {
    // 左滑，下一章
    goToNextChapter();
  } else if (deltaX < -threshold) {
    // 右滑，上一章
    goToPrevChapter();
  }
};
```

**覆盖翻页（cover）：**
- 新页面从右侧滑入覆盖旧页面
- 使用 CSS `z-index` 和 `transform`

**仿真翻页（realistic）：**
- 使用 CSS 3D Transform 模拟真实翻页
- 使用 `perspective`、`rotateY` 等属性

```typescript
// 伪代码
const flipStyle = {
  transform: `perspective(1200px) rotateY(${angle}deg)`,
  transformOrigin: 'left center',
  transition: 'transform 0.6s'
};
```

#### 4.4.2 自动阅读实现

```typescript
// 伪代码
useEffect(() => {
  if (autoReading) {
    const interval = setInterval(() => {
      window.scrollBy(0, autoReadSpeed);
      
      // 检查是否到底部
      if (isAtBottom()) {
        goToNextChapter();
      }
    }, 50);
    
    return () => clearInterval(interval);
  }
}, [autoReading, autoReadSpeed]);
```

#### 4.4.3 设置持久化

使用 `localStorage` 存储用户阅读设置：

```typescript
const READER_SETTINGS_KEY = 'novel_reader_settings';

const saveSettings = (settings: ReaderSettings) => {
  localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(settings));
};

const loadSettings = (): ReaderSettings => {
  const stored = localStorage.getItem(READER_SETTINGS_KEY);
  return stored ? JSON.parse(stored) : defaultSettings;
};
```

---

## 5. 服务端架构设计

### 5.1 目录结构

```
server/
├── src/
│   ├── config/          # 配置文件
│   │   ├── database.ts  # 数据库配置
│   │   ├── email.ts     # 邮件配置
│   │   └── index.ts     # 通用配置
│   ├── models/          # 数据模型
│   │   ├── User.ts
│   │   ├── Novel.ts
│   │   ├── Chapter.ts
│   │   └── ReadingProgress.ts
│   ├── routes/          # 路由
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── novel.ts
│   │   └── reader.ts
│   ├── controllers/     # 控制器
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   ├── novelController.ts
│   │   └── readerController.ts
│   ├── services/        # 业务逻辑
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   ├── novelService.ts
│   │   ├── emailService.ts
│   │   └── uploadService.ts
│   ├── middlewares/     # 中间件
│   │   ├── auth.ts      # JWT 鉴权
│   │   ├── upload.ts    # 文件上传
│   │   └── errorHandler.ts
│   ├── utils/           # 工具函数
│   │   ├── jwt.ts
│   │   ├── bcrypt.ts
│   │   └── validator.ts
│   └── app.ts           # 应用入口
├── uploads/             # 上传文件存储
│   ├── avatars/
│   └── covers/
├── package.json
└── tsconfig.json
```

### 5.2 核心模块实现

#### 5.2.1 验证码生成与存储

```typescript
// 生成 6 位数字验证码
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 使用 Map 临时存储验证码（生产环境应使用 Redis）
const codeStore = new Map<string, { code: string; expires: number }>();

const saveCode = (email: string, code: string) => {
  const expires = Date.now() + 5 * 60 * 1000; // 5 分钟过期
  codeStore.set(email, { code, expires });
};

const verifyCode = (email: string, code: string): boolean => {
  const record = codeStore.get(email);
  if (!record) return false;
  if (Date.now() > record.expires) {
    codeStore.delete(email);
    return false;
  }
  if (record.code !== code) return false;
  codeStore.delete(email);
  return true;
};
```

#### 5.2.2 邮件发送

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationEmail = async (email: string, code: string) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '验证码',
    html: `
      <h1>您的验证码是：${code}</h1>
      <p>验证码 5 分钟内有效，请勿泄露。</p>
    `
  });
};
```

#### 5.2.3 JWT 鉴权

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

export const generateToken = (userId: number): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): { userId: number } => {
  return jwt.verify(token, JWT_SECRET) as { userId: number };
};

// 鉴权中间件
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  
  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ code: 401, message: 'Token 失效' });
  }
};
```

#### 5.2.4 密码加密

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

#### 5.2.5 小说上传（从 crawler-novels）

```typescript
import fs from 'fs/promises';
import path from 'path';

interface CrawlerNovelData {
  name: string;
  author: string;
  cover?: string;
  description?: string;
  chapters: Array<{
    title: string;
    content: string;
  }>;
}

export const uploadNovelFromCrawler = async (novelPath: string) => {
  // 读取 crawler-novels 数据
  const data = await fs.readFile(novelPath, 'utf-8');
  const novelData: CrawlerNovelData = JSON.parse(data);
  
  // 创建小说
  const novel = await Novel.create({
    name: novelData.name,
    author: novelData.author,
    cover: novelData.cover,
    description: novelData.description
  });
  
  // 批量创建章节
  const chapters = novelData.chapters.map((chapter, index) => ({
    novelId: novel.id,
    title: chapter.title,
    content: chapter.content,
    orderNum: index + 1
  }));
  
  await Chapter.bulkCreate(chapters);
  
  return { novelId: novel.id, chapterCount: chapters.length };
};
```

---

## 6. 关键技术方案

### 6.1 验证码防刷

**方案：**
- 同一邮箱 60 秒内只能发送一次
- 使用 Map 记录发送时间戳
- 生产环境建议使用 Redis + IP 限流

```typescript
const sendTimeStore = new Map<string, number>();

const canSendCode = (email: string): boolean => {
  const lastSendTime = sendTimeStore.get(email);
  if (!lastSendTime) return true;
  return Date.now() - lastSendTime > 60 * 1000; // 60 秒间隔
};
```

### 6.2 文件上传

**方案：**
- 使用 multer 处理文件上传
- 文件存储在 `uploads/` 目录
- 生成唯一文件名避免冲突
- 限制文件大小和类型

```typescript
import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    cb(null, extname && mimetype);
  }
});
```

### 6.3 阅读进度同步

**方案：**
- 用户阅读时定时同步进度（每 30 秒）
- 切换章节时立即同步
- 使用防抖避免频繁请求

```typescript
// 客户端
const syncProgress = useDebounce((chapterId, scrollPosition) => {
  dispatch(updateReadingProgress({ novelId, chapterId, scrollPosition }));
}, 30000);

// 监听滚动事件
const handleScroll = () => {
  const scrollPosition = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  syncProgress(currentChapter.id, scrollPosition);
};
```

### 6.4 章节内容缓存

**方案：**
- 客户端缓存当前章节及前后各一章
- 使用 Map 存储章节内容
- 切换章节时优先从缓存读取

```typescript
const chapterCache = new Map<number, Chapter>();

const preloadChapter = async (chapterId: number) => {
  if (chapterCache.has(chapterId)) return;
  const chapter = await fetchChapter(chapterId);
  chapterCache.set(chapterId, chapter);
};

// 预加载前后章节
const preloadAdjacentChapters = (currentId: number, prevId?: number, nextId?: number) => {
  if (prevId) preloadChapter(prevId);
  if (nextId) preloadChapter(nextId);
};
```

---

## 7. 部署方案

### 7.1 开发环境

**客户端：**
```bash
cd client
npm run dev  # http://localhost:3000
```

**服务端：**
```bash
cd server
npm run dev  # http://localhost:4000
```

### 7.2 生产环境

**客户端构建：**
```bash
cd client
npm run build
npm start
```

**服务端构建：**
```bash
cd server
npm run build
npm start
```

### 7.3 环境变量

**客户端 (.env.local)：**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

**服务端 (.env)：**
```
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_NAME=novel_reader
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-jwt-secret

# 邮件
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
EMAIL_FROM=noreply@example.com

# 服务器
PORT=4000
```

---

## 8. 开发计划

### 阶段一：基础架构（1-2 周）

- [ ] 初始化客户端和服务端项目
- [ ] 配置数据库连接和 ORM
- [ ] 创建数据表
- [ ] 实现基础中间件（错误处理、日志）

### 阶段二：用户体系（2-3 周）

- [ ] 实现验证码发送和验证
- [ ] 实现注册功能（邮箱+验证码、邮箱+密码）
- [ ] 实现登录功能（邮箱+验证码、邮箱+密码）
- [ ] 实现重置密码功能
- [ ] 实现个人中心（查看/修改信息、上传头像、修改密码）

### 阶段三：小说管理（2-3 周）

- [ ] 实现小说列表、搜索、分页
- [ ] 实现小说详情页
- [ ] 实现章节目录和章节内容接口
- [ ] 实现小说上传功能（从 crawler-novels）

### 阶段四：阅读器（3-4 周）

- [ ] 实现基础阅读功能
- [ ] 实现背景颜色、字体大小设置
- [ ] 实现高亮/暗黑模式
- [ ] 实现四种翻页模式
- [ ] 实现自动阅读功能
- [ ] 实现目录面板
- [ ] 实现阅读进度同步

### 阶段五：优化与测试（1-2 周）

- [ ] 性能优化（缓存、懒加载）
- [ ] 单元测试
- [ ] 集成测试
- [ ] 部署上线

---

## 9. 总结

本技术设计文档详细描述了小说阅读器项目的系统架构、数据库设计、API 接口设计、客户端和服务端架构设计，以及关键技术的实现方案。文档涵盖了用户体系、小说管理、阅读器等核心功能模块，为项目开发提供了清晰的技术指导。

开发团队可以按照文档中的设计方案和开发计划，有序推进项目开发工作，确保项目按时高质量完成。
