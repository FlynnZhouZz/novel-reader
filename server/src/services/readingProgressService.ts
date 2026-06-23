import { ReadingProgress, Novel, Chapter } from '../models';

export interface ProgressInfo {
  chapterId: number;
  scrollPosition: number;
}

// 获取阅读进度
export const getProgress = async (
  userId: number,
  novelId: number
): Promise<ProgressInfo | null> => {
  const novel = await Novel.findByPk(novelId);
  if (!novel) {
    throw new Error('小说不存在');
  }

  const progress = await ReadingProgress.findOne({
    where: { user_id: userId, novel_id: novelId },
  });

  if (!progress) {
    return null;
  }

  return {
    chapterId: progress.chapter_id,
    scrollPosition: progress.scroll_position,
  };
};

// 更新阅读进度
export const updateProgress = async (
  userId: number,
  novelId: number,
  chapterId: number,
  scrollPosition: number
): Promise<void> => {
  const novel = await Novel.findByPk(novelId);
  if (!novel) {
    throw new Error('小说不存在');
  }

  const chapter = await Chapter.findOne({
    where: { id: chapterId, novel_id: novelId },
  });
  if (!chapter) {
    throw new Error('章节不存在');
  }

  if (scrollPosition < 0 || scrollPosition > 1) {
    throw new Error('滚动位置必须在0-1之间');
  }

  // 使用 upsert 创建或更新
  await ReadingProgress.upsert({
    user_id: userId,
    novel_id: novelId,
    chapter_id: chapterId,
    scroll_position: scrollPosition,
  });
};
