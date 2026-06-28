import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface NovelAttributes {
  id?: number;
  name: string;
  cover?: string | null;
  description?: string | null;
  author: string;
  user_id: number;
  is_public?: boolean;
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
  public is_public!: boolean;
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
      comment: '上传者用户ID',
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否公开（公开才会在首页展示）',
    },
  },
  {
    sequelize,
    tableName: 'novels',
    modelName: 'Novel',
  }
);

export default Novel;
