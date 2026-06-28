import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface NovelAttributes {
  id?: number;
  name: string;
  cover?: string | null;
  description?: string | null;
  author: string;
  user_id: number;
  created_at?: Date;
  updated_at?: Date;
}

class Novel extends Model<NovelAttributes> implements NovelAttributes {
  public id!: number;
  public name!: string;
  public cover!: string | null;
  public description!: string | null;
  public author!: string;
  public user_id!: number;
  public created_at!: Date;
  public updated_at!: Date;
}

Novel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '小说ID',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '小说名称',
    },
    cover: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: '封面URL',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: '简介',
    },
    author: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '作者',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '归属用户ID（个人书架）',
    },
  },
  {
    sequelize,
    tableName: 'novels',
    modelName: 'Novel',
  }
);

export default Novel;
