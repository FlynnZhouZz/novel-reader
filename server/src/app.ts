import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { connectDB } from './config/database';
import authRoutes from './routes/auth';
import novelRoutes from './routes/novel';
import bookshelfRoutes from './routes/bookshelf';
import readerRoutes from './routes/reader';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

const app = express();

// 中间件
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 静态文件（上传的图片）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ code: 200, message: 'ok', data: { status: 'healthy' } });
});

// 路由
app.use('/api/v1', authRoutes);
app.use('/api/v1', novelRoutes);
app.use('/api/v1', bookshelfRoutes);
app.use('/api/v1', readerRoutes);

// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动函数
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(config.port, () => {
      console.log(`服务器运行在 http://localhost:${config.port}`);
      console.log(`环境: ${config.nodeEnv}`);
    });

    return server;
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 仅在直接运行时启动（测试时不自动启动）
if (require.main === module) {
  startServer();
}

export { app, startServer };
