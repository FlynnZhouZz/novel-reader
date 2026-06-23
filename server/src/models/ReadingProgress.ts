import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';
import Novel from './Novel';
import Chapter from './Chapter';

export interface ReadingProgressAttributes {
  id?: number;
  user_id: number;
  novel_id: number;
  chapter_id: number;
  scroll_position?: number;
  updated_at?: Date;
}

class ReadingProgress extends Model<ReadingProgressAttributes> implements ReadingProgressAttributes {
  public id!: number;
  public user_id!: number;
  public novel_id!: number;
  public chapter_id!: number;
  public scroll_position!: number;
  public updated_at!: Date;
}

ReadingProgress.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '进度ID',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      comment: '用户ID',
    },
    novel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Novel,
        key: 'id',
      },
      comment: '小说ID',
    },
    chapter_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Chapter,
        key: 'id',
      },
      comment: '当前章节ID',
    },
    scroll_position: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: '滚动位置（0-1）',
      validate: {
        min: 0,
        max: 1,
      },
    },
  },
  {
    sequelize,
    tableName: 'reading_progress',
    modelName: 'ReadingProgress',
    indexes: [
      {
        fields: ['user_id', 'novel_id'],
        unique: true,
        name: 'uk_user_novel',
      },
    ],
  }
);

export default ReadingProgress;
