import { Op } from 'sequelize';
import { Novel, Chapter, Bookshelf } from '../models';
import { sequelize } from '../config/database';
import fs from 'fs/promises';
import path from 'path';

export interface NovelListItem {
  id: number;
  name: string;
  cover: string | null;
  description: string | null;
  author: string;
  chapterCount: number;
  isPublic?: boolean;
  createdAt: Date;
}

export interface NovelDetail extends NovelListItem {
  isOwner?: boolean;
}

export interface ChapterListItem {
  id: number;
  title: string;
  orderNum: number;
}

export interface ChapterDetail {
  id: number;
  title: string;
  content: string;
  orderNum: number;
  prevChapterId: number | null;
  nextChapterId: number | null;
}

// 获取公开小说列表（首页，无需登录）
export const getNovelList = async (
  page: number = 1,
  limit: number = 20,
  keyword?: string,
  author?: string
): Promise<{ list: NovelListItem[]; total: number; page: number; limit: number }> => {
  const where: any = { is_public: true };

  if (keyword) {
    where[Op.or] = [
      { name: { [Op.like]: `%${keyword}%` } },
      { description: { [Op.like]: `%${keyword}%` } },
    ];
  }

  if (author) {
    where.author = { [Op.like]: `%${author}%` };
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Novel.findAndCountAll({
    where,
    include: [
      {
        model: Chapter,
        as: 'chapters',
        attributes: ['id'],
        required: false,
      },
    ],
    distinct: true,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const list: NovelListItem[] = rows.map((novel) => ({
    id: novel.id,
    name: novel.name,
    cover: novel.cover,
    description: novel.description,
    author: novel.author,
    chapterCount: (novel as any).chapters?.length || 0,
    createdAt: novel.created_at,
  }));

  return { list, total: count, page, limit };
};

// 校验用户对小说的阅读权限：公开 OR 作者 OR 在书架中
const checkReadPermission = async (novel: Novel, userId?: number): Promise<boolean> => {
  if (novel.is_public) return true;
  if (!userId) return false;
  if (novel.user_id === userId) return true;
  const inShelf = await Bookshelf.findOne({ where: { user_id: userId, novel_id: novel.id } });
  return !!inShelf;
};

// 获取小说详情（公开小说任何人可看；私有小说需作者或书架收藏者）
export const getNovelDetail = async (id: number, userId?: number): Promise<NovelDetail> => {
  const novel = await Novel.findByPk(id, {
    include: [
      {
        model: Chapter,
        as: 'chapters',
        attributes: ['id'],
        required: false,
      },
    ],
  });

  if (!novel) {
    throw new Error('小说不存在');
  }

  const allowed = await checkReadPermission(novel, userId);
  if (!allowed) {
    throw new Error('无权访问该小说');
  }

  return {
    id: novel.id,
    name: novel.name,
    cover: novel.cover,
    description: novel.description,
    author: novel.author,
    chapterCount: (novel as any).chapters?.length || 0,
    isPublic: novel.is_public,
    isOwner: userId !== undefined && novel.user_id === userId,
    createdAt: novel.created_at,
  };
};

// 获取章节目录（权限同详情）
export const getChapterList = async (novelId: number, userId?: number): Promise<ChapterListItem[]> => {
  const novel = await Novel.findByPk(novelId);
  if (!novel) {
    throw new Error('小说不存在');
  }
  const allowed = await checkReadPermission(novel, userId);
  if (!allowed) {
    throw new Error('无权访问该小说');
  }

  const chapters = await Chapter.findAll({
    where: { novel_id: novelId },
    attributes: ['id', 'title', 'order_num'],
    order: [['order_num', 'ASC']],
  });

  return chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    orderNum: chapter.order_num,
  }));
};

// 获取章节内容（权限同详情）
export const getChapterDetail = async (
  novelId: number,
  chapterId: number,
  userId?: number
): Promise<ChapterDetail> => {
  const novel = await Novel.findByPk(novelId);
  if (!novel) {
    throw new Error('小说不存在');
  }
  const allowed = await checkReadPermission(novel, userId);
  if (!allowed) {
    throw new Error('无权访问该小说');
  }

  const chapter = await Chapter.findOne({
    where: { id: chapterId, novel_id: novelId },
  });

  if (!chapter) {
    throw new Error('章节不存在');
  }

  // 获取上一章和下一章
  const prevChapter = await Chapter.findOne({
    where: { novel_id: novelId, order_num: { [Op.lt]: chapter.order_num } },
    attributes: ['id'],
    order: [['order_num', 'DESC']],
  });

  const nextChapter = await Chapter.findOne({
    where: { novel_id: novelId, order_num: { [Op.gt]: chapter.order_num } },
    attributes: ['id'],
    order: [['order_num', 'ASC']],
  });

  return {
    id: chapter.id,
    title: chapter.title,
    content: chapter.content,
    orderNum: chapter.order_num,
    prevChapterId: prevChapter?.id || null,
    nextChapterId: nextChapter?.id || null,
  };
};

// 从 crawler-novels 数据上传小说
// 读取 outputs/html/{小说名}/index.json + outputs/content/{小说名}/{卷名}/{章节名}.txt
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
      fileName: string; // .html 后缀
      url: string;
      contentHash: string;
    }>;
  }>;
}

export interface UploadOptions {
  novelDir: string;
  userId: number;          // 上传者用户ID
  author?: string;
  contentBaseDir?: string;
  cover?: string;
  description?: string;
  overwrite?: boolean;
  isPublic?: boolean;      // 是否公开，默认 false（私有，仅作者可见，需手动改为公开才在首页展示）
}

export interface UploadResult {
  novelId: number;
  novelName: string;
  created: number;
  skipped: number;
  failed: number;
  totalChapters: number;
  errors: string[];
}

export const uploadNovelFromCrawler = async (
  options: UploadOptions
): Promise<UploadResult> => {
  const {
    novelDir,
    userId,
    author,
    contentBaseDir,
    cover,
    description,
    overwrite = false,
    isPublic = false,
  } = options;

  // 1. 校验并定位 index.json
  const absoluteNovelDir = path.resolve(novelDir);
  const indexFile = path.join(absoluteNovelDir, 'index.json');
  let indexData: CrawlerIndex;
  try {
    const raw = await fs.readFile(indexFile, 'utf-8');
    indexData = JSON.parse(raw);
  } catch {
    throw new Error(`未找到 index.json，请检查 novelDir 路径: ${indexFile}`);
  }

  if (!indexData.novelName || !Array.isArray(indexData.volumes)) {
    throw new Error('index.json 格式不正确');
  }

  // 2. 推断 content 目录：novelDir/../../content/{小说名}/
  const novelName = indexData.novelName;
  const contentDir = contentBaseDir
    ? path.join(path.resolve(contentBaseDir), novelName)
    : path.join(absoluteNovelDir, '..', '..', 'content', novelName);

  // 3. 事务内处理
  return await sequelize.transaction(async (t) => {
    // 3.1 查询或创建小说（按用户 + 小说名去重）
    const [novel, novelCreated] = await Novel.findOrCreate({
      where: { name: novelName, user_id: userId },
      defaults: {
        name: novelName,
        user_id: userId,
        author: author || '未知作者',
        cover: cover || null,
        description: description || null,
        is_public: isPublic,
      },
      transaction: t,
    });

    // 3.2 若已存在且 overwrite=true，先清空章节
    if (!novelCreated && overwrite) {
      await Chapter.destroy({
        where: { novel_id: novel.id },
        transaction: t,
      });
    }

    // 3.3 查询已有 order_num 集合（用于增量更新跳过判断）
    let existingSet = new Set<number>();
    if (!novelCreated && !overwrite) {
      const existing = await Chapter.findAll({
        where: { novel_id: novel.id },
        attributes: ['order_num'],
        transaction: t,
      });
      existingSet = new Set(existing.map((c) => c.order_num));
    }

    // 4. 遍历 volumes/chapters，读取 txt 并收集待创建章节
    const chaptersToCreate: Array<{
      novel_id: number;
      title: string;
      content: string;
      order_num: number;
    }> = [];
    const errors: string[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const volume of indexData.volumes) {
      for (const chapter of volume.chapters) {
        const orderNum = chapter.index;

        // 增量更新：已存在则跳过
        if (existingSet.has(orderNum)) {
          skipped++;
          continue;
        }

        // 拼接 txt 路径：contentDir/{卷名}/{fileName 去后缀}.txt
        const txtFileName = chapter.fileName.replace(/\.html$/i, '.txt');
        const txtPath = path.join(contentDir, volume.name, txtFileName);

        try {
          await fs.access(txtPath);
        } catch {
          failed++;
          errors.push(
            `第 ${orderNum} 章 txt 文件不存在: ${txtPath}`
          );
          continue;
        }

        let raw: string;
        try {
          raw = await fs.readFile(txtPath, 'utf-8');
        } catch (e) {
          failed++;
          errors.push(
            `第 ${orderNum} 章 txt 读取失败: ${txtPath} - ${(e as Error).message}`
          );
          continue;
        }

        // 解析 txt：首行标题，空行后为正文
        const lines = raw.split(/\r?\n/);
        let title = '';
        let content = '';
        if (lines.length > 0) {
          title = lines[0].trim();
          let startIdx = 1;
          while (startIdx < lines.length && lines[startIdx].trim() === '') {
            startIdx++;
          }
          content = lines.slice(startIdx).join('\n').trim();
        }
        // 标题回退：用 fileName 去后缀
        if (!title) {
          title = chapter.fileName.replace(/\.html$/i, '');
        }
        if (!content) {
          failed++;
          errors.push(`第 ${orderNum} 章 txt 内容为空: ${txtPath}`);
          continue;
        }

        chaptersToCreate.push({
          novel_id: novel.id,
          title,
          content,
          order_num: orderNum,
        });
      }
    }

    // 5. 分批创建章节（避免超过 MySQL max_allowed_packet 限制）
    const BATCH_SIZE = 30;
    if (chaptersToCreate.length > 0) {
      for (let i = 0; i < chaptersToCreate.length; i += BATCH_SIZE) {
        const batch = chaptersToCreate.slice(i, i + BATCH_SIZE);
        await Chapter.bulkCreate(batch, { transaction: t });
      }
      created = chaptersToCreate.length;
    }

    return {
      novelId: novel.id,
      novelName: novelName,
      created,
      skipped,
      failed,
      totalChapters: indexData.totalChapters,
      errors,
    };
  });
};

// 创建小说（手动，归属当前用户，默认私有）
export const createNovel = async (
  userId: number,
  name: string,
  author: string,
  cover?: string,
  description?: string,
  isPublic: boolean = false
): Promise<{ id: number; name: string; author: string }> => {
  const novel = await Novel.create({
    name,
    author,
    user_id: userId,
    cover: cover || null,
    description: description || null,
    is_public: isPublic,
  });

  return { id: novel.id, name: novel.name, author: novel.author };
};

// 我的作品（当前用户上传的小说）
export const getMyNovels = async (
  userId: number,
  page: number = 1,
  limit: number = 20
): Promise<{ list: NovelListItem[]; total: number; page: number; limit: number }> => {
  const where: any = { user_id: userId };
  const offset = (page - 1) * limit;

  const { rows, count } = await Novel.findAndCountAll({
    where,
    include: [
      {
        model: Chapter,
        as: 'chapters',
        attributes: ['id'],
        required: false,
      },
    ],
    distinct: true,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const list: NovelListItem[] = rows.map((novel) => ({
    id: novel.id,
    name: novel.name,
    cover: novel.cover,
    description: novel.description,
    author: novel.author,
    chapterCount: (novel as any).chapters?.length || 0,
    isPublic: novel.is_public,
    createdAt: novel.created_at,
  }));

  return { list, total: count, page, limit };
};

// 我的书架（当前用户收藏的小说，含自己的和别人的）
export const getMyBookshelf = async (
  userId: number,
  page: number = 1,
  limit: number = 20
): Promise<{ list: NovelListItem[]; total: number; page: number; limit: number }> => {
  const offset = (page - 1) * limit;

  // 先从 bookshelf 表查出该用户收藏的 novel_id 列表（分页）
  const { rows: shelfRows, count } = await Bookshelf.findAndCountAll({
    where: { user_id: userId },
    attributes: ['novel_id'],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const novelIds = shelfRows.map((r) => r.novel_id);

  if (novelIds.length === 0) {
    return { list: [], total: count, page, limit };
  }

  const novels = await Novel.findAll({
    where: { id: novelIds },
    include: [
      {
        model: Chapter,
        as: 'chapters',
        attributes: ['id'],
        required: false,
      },
    ],
    order: [['created_at', 'DESC']],
  });

  const list: NovelListItem[] = novels.map((novel) => ({
    id: novel.id,
    name: novel.name,
    cover: novel.cover,
    description: novel.description,
    author: novel.author,
    chapterCount: (novel as any).chapters?.length || 0,
    createdAt: novel.created_at,
  }));

  return { list, total: count, page, limit };
};

// 修改小说公开状态（仅作者）
export const updateNovelVisibility = async (
  novelId: number,
  userId: number,
  isPublic: boolean
): Promise<void> => {
  const novel = await Novel.findByPk(novelId);
  if (!novel) {
    throw new Error('小说不存在');
  }
  if (novel.user_id !== userId) {
    throw new Error('无权操作该小说');
  }
  await novel.update({ is_public: isPublic });
};

// 创建章节（手动，含归属校验）
export const createChapter = async (
  novelId: number,
  userId: number,
  title: string,
  content: string,
  orderNum?: number
): Promise<{ id: number; title: string; orderNum: number }> => {
  const novel = await Novel.findByPk(novelId);
  if (!novel) {
    throw new Error('小说不存在');
  }
  if (novel.user_id !== userId) {
    throw new Error('无权操作该小说');
  }

  // 如果未指定序号，则自动递增
  let finalOrderNum = orderNum;
  if (finalOrderNum === undefined) {
    const lastChapter = await Chapter.findOne({
      where: { novel_id: novelId },
      order: [['order_num', 'DESC']],
    });
    finalOrderNum = lastChapter ? lastChapter.order_num + 1 : 1;
  }

  const chapter = await Chapter.create({
    novel_id: novelId,
    title,
    content,
    order_num: finalOrderNum,
  });

  return { id: chapter.id, title: chapter.title, orderNum: chapter.order_num };
};
