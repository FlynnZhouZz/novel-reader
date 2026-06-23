import { Op } from 'sequelize';
import { Novel, Chapter } from '../models';
import fs from 'fs/promises';
import path from 'path';

export interface NovelListItem {
  id: number;
  name: string;
  cover: string | null;
  description: string | null;
  author: string;
  chapterCount: number;
  createdAt: Date;
}

export interface NovelDetail extends NovelListItem {}

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

// 获取小说列表（分页+搜索）
export const getNovelList = async (
  page: number = 1,
  limit: number = 20,
  keyword?: string,
  author?: string
): Promise<{ list: NovelListItem[]; total: number; page: number; limit: number }> => {
  const where: any = {};

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

// 获取小说详情
export const getNovelDetail = async (id: number): Promise<NovelDetail> => {
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

  return {
    id: novel.id,
    name: novel.name,
    cover: novel.cover,
    description: novel.description,
    author: novel.author,
    chapterCount: (novel as any).chapters?.length || 0,
    createdAt: novel.created_at,
  };
};

// 获取章节目录
export const getChapterList = async (novelId: number): Promise<ChapterListItem[]> => {
  const novel = await Novel.findByPk(novelId);
  if (!novel) {
    throw new Error('小说不存在');
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

// 获取章节内容
export const getChapterDetail = async (
  novelId: number,
  chapterId: number
): Promise<ChapterDetail> => {
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

export const uploadNovelFromCrawler = async (
  novelPath: string
): Promise<{ novelId: number; chapterCount: number }> => {
  // 读取 crawler-novels 数据
  const data = await fs.readFile(novelPath, 'utf-8');
  const novelData: CrawlerNovelData = JSON.parse(data);

  if (!novelData.name || !novelData.author || !novelData.chapters?.length) {
    throw new Error('小说数据格式不正确');
  }

  // 创建小说
  const novel = await Novel.create({
    name: novelData.name,
    author: novelData.author,
    cover: novelData.cover || null,
    description: novelData.description || null,
  });

  // 批量创建章节
  const chapters = novelData.chapters.map((chapter, index) => ({
    novel_id: novel.id,
    title: chapter.title,
    content: chapter.content,
    order_num: index + 1,
  }));

  await Chapter.bulkCreate(chapters);

  return { novelId: novel.id, chapterCount: chapters.length };
};

// 创建小说（手动）
export const createNovel = async (
  name: string,
  author: string,
  cover?: string,
  description?: string
): Promise<{ id: number; name: string; author: string }> => {
  const novel = await Novel.create({
    name,
    author,
    cover: cover || null,
    description: description || null,
  });

  return { id: novel.id, name: novel.name, author: novel.author };
};

// 创建章节（手动）
export const createChapter = async (
  novelId: number,
  title: string,
  content: string,
  orderNum?: number
): Promise<{ id: number; title: string; orderNum: number }> => {
  const novel = await Novel.findByPk(novelId);
  if (!novel) {
    throw new Error('小说不存在');
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
