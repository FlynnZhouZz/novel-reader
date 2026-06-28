import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface BookshelfAttributes {
  id?: number;
  user_id: number;
  novel_id: number;
  created_at?: Date;
}

class Bookshelf extends Model<BookshelfAttributes> implements BookshelfAttributes {
  public id!: number;
  public user_id!: number;
  public novel_id!: number;
  public created_at!: Date;
}

Bookshelf.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '书架记录ID',
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '用户ID',
    },
    novel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '小说ID',
    },
  },
  {
    sequelize,
    tableName: 'bookshelf',
    modelName: 'Bookshelf',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'novel_id'],
        name: 'uk_user_novel',
      },
    ],
  }
);

export default Bookshelf;
