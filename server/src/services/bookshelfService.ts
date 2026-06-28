import { Bookshelf, Novel } from '../models';

// 检查是否已在书架
export const isInBookshelf = async (userId: number, novelId: number): Promise<boolean> => {
  const record = await Bookshelf.findOne({ where: { user_id: userId, novel_id: novelId } });
  return !!record;
};

// 加入书架
export const addToBookshelf = async (userId: number, novelId: number): Promise<void> => {
  const novel = await Novel.findByPk(novelId);
  if (!novel) {
    throw new Error('小说不存在');
  }
  // 已存在则跳过（findOrCreate 幂等）
  await Bookshelf.findOrCreate({
    where: { user_id: userId, novel_id: novelId },
    defaults: { user_id: userId, novel_id: novelId },
  });
};

// 移出书架
export const removeFromBookshelf = async (userId: number, novelId: number): Promise<void> => {
  await Bookshelf.destroy({ where: { user_id: userId, novel_id: novelId } });
};
