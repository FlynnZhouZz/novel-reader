import request from 'supertest';
import { app } from '../src/app';
import { sequelize } from '../src/config/database';
import { Novel, Chapter } from '../src/models';

describe('阅读进度接口测试', () => {
  let token: string;
  let novelId: number;
  let chapterId: number;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.truncate({ cascade: true });

    // 注册用户
    const authRes = await request(app)
      .post('/api/v1/auth/register-with-password')
      .send({
        email: 'progress@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });
    token = authRes.body.data.token;

    // 创建小说和章节
    const novel = await Novel.create({
      name: '进度测试小说',
      author: '作者',
    });
    novelId = novel.id;

    const chapter = await Chapter.create({
      novel_id: novelId,
      title: '第一章',
      content: '内容',
      order_num: 1,
    });
    chapterId = chapter.id;
  });

  describe('PUT /api/v1/reading-progress/:novelId', () => {
    it('应该成功更新阅读进度', async () => {
      const res = await request(app)
        .put(`/api/v1/reading-progress/${novelId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          chapterId,
          scrollPosition: 0.5,
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('更新成功');
    });

    it('未登录时应返回401', async () => {
      const res = await request(app)
        .put(`/api/v1/reading-progress/${novelId}`)
        .send({
          chapterId,
          scrollPosition: 0.5,
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('小说不存在时应返回500', async () => {
      const res = await request(app)
        .put('/api/v1/reading-progress/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chapterId,
          scrollPosition: 0.5,
        });

      expect(res.body.code).toBe(500);
      expect(res.body.message).toBe('小说不存在');
    });

    it('章节不存在时应返回500', async () => {
      const res = await request(app)
        .put(`/api/v1/reading-progress/${novelId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          chapterId: 99999,
          scrollPosition: 0.5,
        });

      expect(res.body.code).toBe(500);
      expect(res.body.message).toBe('章节不存在');
    });
  });

  describe('GET /api/v1/reading-progress/:novelId', () => {
    it('应该成功获取阅读进度', async () => {
      // 先更新进度
      await request(app)
        .put(`/api/v1/reading-progress/${novelId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          chapterId,
          scrollPosition: 0.5,
        });

      const res = await request(app)
        .get(`/api/v1/reading-progress/${novelId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.chapterId).toBe(chapterId);
      expect(res.body.data.scrollPosition).toBe(0.5);
    });

    it('无进度记录时应返回null', async () => {
      const res = await request(app)
        .get(`/api/v1/reading-progress/${novelId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toBeNull();
    });

    it('未登录时应返回401', async () => {
      const res = await request(app).get(`/api/v1/reading-progress/${novelId}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });
});
