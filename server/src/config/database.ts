import { Sequelize } from 'sequelize';
import { config } from './index';

// 测试环境使用 SQLite 内存数据库
let sequelize: Sequelize;

if (config.nodeEnv === 'test') {
  sequelize = new Sequelize('sqlite::memory:', {
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  });
} else {
  sequelize = new Sequelize(
    config.db.name,
    config.db.user,
    config.db.password,
    {
      host: config.db.host,
      port: config.db.port,
      dialect: 'mysql',
      logging: config.nodeEnv === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    }
  );
}

export { sequelize };

export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    // 开发环境下同步表结构（生产环境应使用 migration）
    if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
      await sequelize.sync({ force: config.nodeEnv === 'test' });
      if (config.nodeEnv === 'development') {
        console.log('数据库表结构同步成功');
      }
    }
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
};
