import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserAttributes {
  id?: number;
  email: string;
  password: string;
  nickname: string;
  avatar?: string | null;
  bio?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

class User extends Model<UserAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public nickname!: string;
  public avatar!: string | null;
  public bio!: string | null;
  public created_at!: Date;
  public updated_at!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: '用户ID',
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '邮箱',
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '密码（bcrypt加密）',
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '新用户',
      comment: '昵称',
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: '头像URL',
    },
    bio: {
      type: DataTypes.STRING(200),
      allowNull: true,
      defaultValue: null,
      comment: '简介',
    },
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
  }
);

export default User;
