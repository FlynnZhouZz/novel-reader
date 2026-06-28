import request from 'supertest';
import { app } from '../src/app';
import { sequelize } from '../src/config/database';
import { Novel, Chapter } from '../src/models';

describe('小说接口测试', () => {
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

    // 注册用户获取token
    const authRes = await request(app)
      .post('/api/v1/auth/register-with-password')
      .send({
        email: 'novel@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });
    token = authRes.body.data.token;

    // 创建测试小说
    const novel = await Novel.create({
      name: '测试小说',
      author: '测试作者',
      description: '这是一本测试小说',
      cover: null,
    });
    novelId = novel.id;

    // 创建测试章节
    const chapter = await Chapter.create({
      novel_id: novelId,
      title: '第一章',
      content: '这是第一章的内容',
      order_num: 1,
    });
    chapterId = chapter.id;

    await Chapter.create({
      novel_id: novelId,
      title: '第二章',
      content: '这是第二章的内容',
      order_num: 2,
    });
  });

  describe('GET /api/v1/novels', () => {
    it('应该成功获取小说列表', async () => {
      const res = await request(app).get('/api/v1/novels');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.list[0].name).toBe('测试小说');
      expect(res.body.data.list[0].chapterCount).toBe(2);
      expect(res.body.data.total).toBe(1);
    });

    it('应该支持关键词搜索', async () => {
      const res = await request(app).get(`/api/v1/novels?keyword=${encodeURIComponent('测试')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(1);
    });

    it('搜索不存在的关键词应返回空列表', async () => {
      const res = await request(app).get(`/api/v1/novels?keyword=${encodeURIComponent('不存在')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(0);
      expect(res.body.data.total).toBe(0);
    });

    it('应该支持作者搜索', async () => {
      const res = await request(app).get(`/api/v1/novels?author=${encodeURIComponent('测试作者')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(1);
    });

    it('应该支持分页', async () => {
      const res = await request(app).get('/api/v1/novels?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(10);
    });

    it('分页参数无效时应返回400', async () => {
      const res = await request(app).get('/api/v1/novels?page=0');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });
  });

  describe('GET /api/v1/novels/:id', () => {
    it('应该成功获取小说详情', async () => {
      const res = await request(app).get(`/api/v1/novels/${novelId}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.name).toBe('测试小说');
      expect(res.body.data.author).toBe('测试作者');
      expect(res.body.data.chapterCount).toBe(2);
    });

    it('小说不存在时应返回500', async () => {
      const res = await request(app).get('/api/v1/novels/99999');

      expect(res.body.code).toBe(500);
      expect(res.body.message).toBe('小说不存在');
    });

    it('ID无效时应返回400', async () => {
      const res = await request(app).get('/api/v1/novels/invalid');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });
  });

  describe('GET /api/v1/novels/:id/chapters', () => {
    it('应该成功获取章节目录', async () => {
      const res = await request(app).get(`/api/v1/novels/${novelId}/chapters`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].title).toBe('第一章');
      expect(res.body.data[0].orderNum).toBe(1);
      expect(res.body.data[1].title).toBe('第二章');
      expect(res.body.data[1].orderNum).toBe(2);
    });

    it('小说不存在时应返回500', async () => {
      const res = await request(app).get('/api/v1/novels/99999/chapters');

      expect(res.body.code).toBe(500);
      expect(res.body.message).toBe('小说不存在');
    });
  });

  describe('GET /api/v1/novels/:novelId/chapters/:chapterId', () => {
    it('应该成功获取章节内容', async () => {
      const res = await request(app).get(`/api/v1/novels/${novelId}/chapters/${chapterId}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.title).toBe('第一章');
      expect(res.body.data.content).toBe('这是第一章的内容');
      expect(res.body.data.orderNum).toBe(1);
      expect(res.body.data.prevChapterId).toBeNull();
      expect(res.body.data.nextChapterId).toBeDefined();
    });

    it('章节不存在时应返回500', async () => {
      const res = await request(app).get(`/api/v1/novels/${novelId}/chapters/99999`);

      expect(res.body.code).toBe(500);
      expect(res.body.message).toBe('章节不存在');
    });
  });

  describe('POST /api/v1/novels', () => {
    it('应该成功创建小说', async () => {
      const res = await request(app)
        .post('/api/v1/novels')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '新小说',
          author: '新作者',
          description: '新小说简介',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('创建成功');
      expect(res.body.data.name).toBe('新小说');
      expect(res.body.data.author).toBe('新作者');
    });

    it('缺少名称时应返回400', async () => {
      const res = await request(app)
        .post('/api/v1/novels')
        .set('Authorization', `Bearer ${token}`)
        .send({
          author: '新作者',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('未登录时应返回401', async () => {
      const res = await request(app)
        .post('/api/v1/novels')
        .send({
          name: '新小说',
          author: '新作者',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('POST /api/v1/novels/:id/chapters', () => {
    it('应该成功创建章节', async () => {
      const res = await request(app)
        .post(`/api/v1/novels/${novelId}/chapters`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '第三章',
          content: '这是第三章的内容',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('创建成功');
      expect(res.body.data.title).toBe('第三章');
      expect(res.body.data.orderNum).toBe(3);
    });

    it('自动递增章节序号', async () => {
      const res = await request(app)
        .post(`/api/v1/novels/${novelId}/chapters`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '第三章',
          content: '内容',
        });

      expect(res.body.data.orderNum).toBe(3);
    });
  });

  // ========== 边界与安全场景补充 ==========
  describe('边界与安全场景补充', () => {
    describe('GET /api/v1/novels - 分页边界', () => {
      it('limit超过100时应返回400', async () => {
        const res = await request(app).get('/api/v1/novels?limit=101');

        expect(res.status).toBe(400);
      });

      it('limit为负数时应返回400', async () => {
        const res = await request(app).get('/api/v1/novels?limit=-1');

        expect(res.status).toBe(400);
      });

      it('page为负数时应返回400', async () => {
        const res = await request(app).get('/api/v1/novels?page=-1');

        expect(res.status).toBe(400);
      });

      it('page为0时应返回400', async () => {
        const res = await request(app).get('/api/v1/novels?page=0');

        expect(res.status).toBe(400);
      });

      it('默认分页参数应生效', async () => {
        const res = await request(app).get('/api/v1/novels');

        expect(res.status).toBe(200);
        expect(res.body.data.page).toBe(1);
        expect(res.body.data.limit).toBe(20);
      });

      it('limit为1时应返回1条', async () => {
        const res = await request(app).get('/api/v1/novels?limit=1');

        expect(res.status).toBe(200);
        expect(res.body.data.list).toHaveLength(1);
        expect(res.body.data.limit).toBe(1);
      });
    });

    describe('GET /api/v1/novels/:id - 边界', () => {
      it('ID为0时应返回400', async () => {
        const res = await request(app).get('/api/v1/novels/0');

        expect(res.status).toBe(400);
      });

      it('ID为负数时应返回400', async () => {
        const res = await request(app).get('/api/v1/novels/-1');

        expect(res.status).toBe(400);
      });
    });

    describe('POST /api/v1/novels - 边界', () => {
      it('名称超长（>100）时应返回400', async () => {
        const res = await request(app)
          .post('/api/v1/novels')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'a'.repeat(101),
            author: '作者',
          });

        expect(res.status).toBe(400);
      });

      it('作者超长（>50）时应返回400', async () => {
        const res = await request(app)
          .post('/api/v1/novels')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: '小说名',
            author: 'a'.repeat(51),
          });

        expect(res.status).toBe(400);
      });

      it('缺少作者时应返回400', async () => {
        const res = await request(app)
          .post('/api/v1/novels')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: '小说名',
          });

        expect(res.status).toBe(400);
      });

      it('名称为空时应返回400', async () => {
        const res = await request(app)
          .post('/api/v1/novels')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: '',
            author: '作者',
          });

        expect(res.status).toBe(400);
      });

      it('名称恰好100字符应成功（边界）', async () => {
        const res = await request(app)
          .post('/api/v1/novels')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'a'.repeat(100),
            author: '作者',
          });

        expect(res.status).toBe(200);
      });
    });

    describe('POST /api/v1/novels/:id/chapters - 边界', () => {
      it('章节标题超长（>200）时应返回400', async () => {
        const res = await request(app)
          .post(`/api/v1/novels/${novelId}/chapters`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'a'.repeat(201),
            content: '内容',
          });

        expect(res.status).toBe(400);
      });

      it('章节内容为空时应返回400', async () => {
        const res = await request(app)
          .post(`/api/v1/novels/${novelId}/chapters`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: '新章节',
            content: '',
          });

        expect(res.status).toBe(400);
      });

      it('小说不存在时应返回500', async () => {
        const res = await request(app)
          .post('/api/v1/novels/99999/chapters')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: '新章节',
            content: '内容',
          });

        expect(res.body.code).toBe(500);
        expect(res.body.message).toBe('小说不存在');
      });

      it('未登录时应返回401', async () => {
        const res = await request(app)
          .post(`/api/v1/novels/${novelId}/chapters`)
          .send({
            title: '新章节',
            content: '内容',
          });

        expect(res.status).toBe(401);
      });

      it('指定orderNum时应使用指定值', async () => {
        const res = await request(app)
          .post(`/api/v1/novels/${novelId}/chapters`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: '指定序号章节',
            content: '内容',
            orderNum: 100,
          });

        expect(res.status).toBe(200);
        expect(res.body.data.orderNum).toBe(100);
      });

      it('小说ID无效时应返回400', async () => {
        const res = await request(app)
          .post('/api/v1/novels/invalid/chapters')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: '新章节',
            content: '内容',
          });

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/v1/novels/:novelId/chapters/:chapterId - 边界', () => {
      it('小说ID无效时应返回400', async () => {
        const res = await request(app).get('/api/v1/novels/invalid/chapters/1');

        expect(res.status).toBe(400);
      });

      it('章节ID无效时应返回400', async () => {
        const res = await request(app).get(`/api/v1/novels/${novelId}/chapters/invalid`);

        expect(res.status).toBe(400);
      });

      it('获取最后一章时nextChapterId应为null', async () => {
        const chapters = await request(app).get(`/api/v1/novels/${novelId}/chapters`);
        const lastChapterId = chapters.body.data[1].id;

        const res = await request(app).get(`/api/v1/novels/${novelId}/chapters/${lastChapterId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.nextChapterId).toBeNull();
        expect(res.body.data.prevChapterId).toBeDefined();
      });
    });
  });
});
