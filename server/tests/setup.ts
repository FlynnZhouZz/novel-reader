import { Sequelize } from 'sequelize';
import { config } from '../src/config';

// 测试环境使用 SQLite 内存数据库
process.env.NODE_ENV = 'test';

// 覆盖数据库配置为 SQLite
const testSequelize = new Sequelize('sqlite::memory:', {
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

export { testSequelize };
