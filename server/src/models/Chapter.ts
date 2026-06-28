import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import Novel from './Novel';

export interface ChapterAttributes {
  id?: number;
  novel_id: number;
  title: string;
  content: string;
  order_num: number;
  created_at?: Date;
  updated_at?: Date;
}

class Chapter extends Model<ChapterAttributes> implements ChapterAttributes {
  public id!: number;
  public novel_id!: number;
  public title!: string;
  public content!: string;
  public order_num!: number;
  public created_at!: Date;
  public updated_at!: Date;
}

Chapter.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '章节ID',
    },
    novel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Novel,
        key: 'id',
      },
      comment: '所属小说ID',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '章节标题',
    },
    content: {
      type: DataTypes.TEXT('medium'),
      allowNull: false,
      comment: '章节内容',
    },
    order_num: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '章节序号（用于排序）',
    },
  },
  {
    sequelize,
    tableName: 'chapters',
    modelName: 'Chapter',
    indexes: [
      {
        fields: ['novel_id', 'order_num'],
        unique: true,
        name: 'uk_novel_order',
      },
    ],
  }
);

export default Chapter;
