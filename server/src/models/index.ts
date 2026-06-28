import User from './User';
import Novel from './Novel';
import Chapter from './Chapter';
import ReadingProgress from './ReadingProgress';

// 定义关联关系
Novel.hasMany(Chapter, { foreignKey: 'novel_id', as: 'chapters' });
Chapter.belongsTo(Novel, { foreignKey: 'novel_id', as: 'novel' });

User.hasMany(Novel, { foreignKey: 'user_id', as: 'novels' });
Novel.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(ReadingProgress, { foreignKey: 'user_id', as: 'readingProgress' });
ReadingProgress.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ReadingProgress.belongsTo(Novel, { foreignKey: 'novel_id', as: 'novel' });
ReadingProgress.belongsTo(Chapter, { foreignKey: 'chapter_id', as: 'chapter' });

export { User, Novel, Chapter, ReadingProgress };
