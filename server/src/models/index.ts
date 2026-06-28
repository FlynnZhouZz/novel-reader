import User from './User';
import Novel from './Novel';
import Chapter from './Chapter';
import ReadingProgress from './ReadingProgress';
import Bookshelf from './Bookshelf';

// 定义关联关系
Novel.hasMany(Chapter, { foreignKey: 'novel_id', as: 'chapters' });
Chapter.belongsTo(Novel, { foreignKey: 'novel_id', as: 'novel' });

User.hasMany(Novel, { foreignKey: 'user_id', as: 'novels' });
Novel.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(ReadingProgress, { foreignKey: 'user_id', as: 'readingProgress' });
ReadingProgress.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ReadingProgress.belongsTo(Novel, { foreignKey: 'novel_id', as: 'novel' });
ReadingProgress.belongsTo(Chapter, { foreignKey: 'chapter_id', as: 'chapter' });

// 书架收藏关系：一个用户可收藏多本小说，一本小说可被多用户收藏
User.belongsToMany(Novel, { through: Bookshelf, foreignKey: 'user_id', otherKey: 'novel_id', as: 'bookshelf' });
Novel.belongsToMany(User, { through: Bookshelf, foreignKey: 'novel_id', otherKey: 'user_id', as: 'collectedBy' });

export { User, Novel, Chapter, ReadingProgress, Bookshelf };
