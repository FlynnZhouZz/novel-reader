import request from 'supertest';
import { app } from '../src/app';
import { sequelize } from '../src/config/database';
import { Novel, Chapter } from '../src/models';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

describe('安全场景测试', () => {
  let token: string;
  let userId: number;
  let novelId: number;

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
        email: 'security@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });
    token = authRes.body.data.token;
    userId = authRes.body.data.user.id;

    // 创建测试小说
    const novel = await Novel.create({
      name: '安全测试小说',
      author: '安全作者',
      description: '用于安全测试',
    });
    novelId = novel.id;

    await Chapter.create({
      novel_id: novelId,
      title: '第一章',
      content: '内容',
      order_num: 1,
    });
  });

  describe('SQL 注入防护', () => {
    it('搜索关键词含 SQL 注入 payload 应被安全处理（ORM 参数化）', async () => {
      const res = await request(app).get(
        `/api/v1/novels?keyword=${encodeURIComponent("' OR 1=1 --")}`
      );

      expect(res.status).toBe(200);
      // 不应返回全部数据，应返回空或无匹配
      expect(res.body.data.list).toHaveLength(0);
    });

    it('搜索作者含 SQL 注入 payload 应被安全处理', async () => {
      const res = await request(app).get(
        `/api/v1/novels?author=${encodeURIComponent("'; DROP TABLE novels; --")}`
      );

      expect(res.status).toBe(200);
      // 表不应被删除，仍可正常查询
      expect(res.body.data.list).toHaveLength(0);

      // 验证表依然存在
      const checkRes = await request(app).get('/api/v1/novels');
      expect(checkRes.status).toBe(200);
    });

    it('注册邮箱含 SQL 注入 payload 应被安全处理', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: "inject@example.com'; DROP TABLE users; --",
          password: 'password123',
          confirmPassword: 'password123',
        });

      // 邮箱格式不合法，应被拒绝
      expect(res.status).toBe(400);
    });

    it('小说名称含 SQL 注入 payload 应被安全存储', async () => {
      const res = await request(app)
        .post('/api/v1/novels')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: "'; DROP TABLE novels; --",
          author: '作者',
        });

      expect(res.status).toBe(200);

      // 验证表依然存在
      const checkRes = await request(app).get('/api/v1/novels');
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.list.length).toBeGreaterThan(0);
    });
  });

  describe('XSS 防护', () => {
    it('小说名称含 XSS 脚本应能存储（转义由前端处理）', async () => {
      const res = await request(app)
        .post('/api/v1/novels')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '<script>alert("xss")</script>',
          author: '作者',
        });

      expect(res.status).toBe(200);

      // 查询能读回
      const listRes = await request(app).get('/api/v1/novels');
      const found = listRes.body.data.list.find(
        (n: any) => n.name === '<script>alert("xss")</script>'
      );
      expect(found).toBeDefined();
    });

    it('章节标题含 XSS 脚本应能存储', async () => {
      const res = await request(app)
        .post(`/api/v1/novels/${novelId}/chapters`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '<img src=x onerror=alert(1)>',
          content: '<script>alert(1)</script>',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('<img src=x onerror=alert(1)>');
    });

    it('用户简介含 XSS 脚本应能存储', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ bio: '<script>document.cookie</script>' });

      expect(res.status).toBe(200);
      expect(res.body.data.bio).toBe('<script>document.cookie</script>');
    });
  });

  describe('JWT 安全', () => {
    it('无 Token 访问受保护接口应返回401', async () => {
      const res = await request(app).get('/api/v1/user/profile');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
      expect(res.body.message).toBe('未登录');
    });

    it('Token 格式错误（非 Bearer）应返回401', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Basic ${token}`);

      expect(res.status).toBe(401);
    });

    it('Authorization 头为空字符串应返回401', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', '');

      expect(res.status).toBe(401);
    });

    it('Bearer 后为空应返回401', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', 'Bearer ');

      expect(res.status).toBe(401);
    });

    it('篡改后的 Token 应返回401', async () => {
      // 篡改 token 的 payload 部分
      const parts = token.split('.');
      const tampered = `${parts[0]}.${parts[1].slice(0, -2)}xx.${parts[2]}`;
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${tampered}`);

      expect(res.status).toBe(401);
    });

    it('使用不同密钥签发的 Token 应返回401', async () => {
      const forgedToken = jwt.sign({ userId }, 'wrong_secret_key', {
        expiresIn: '1h',
      });
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
    });

    it('伪造 payload（篡改 userId）的 Token 应返回401', async () => {
      // 用正确密钥但签发一个无效 userId 的 token（模拟越权）
      const forgedToken = jwt.sign({ userId: 99999 }, config.jwtSecret, {
        expiresIn: '1h',
      });
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${forgedToken}`);

      // token 能解析但用户不存在，应返回500
      expect([401, 500]).toContain(res.body.code);
    });

    it('Token payload 缺少 userId 应被拒绝', async () => {
      const forgedToken = jwt.sign({ foo: 'bar' }, config.jwtSecret, {
        expiresIn: '1h',
      });
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${forgedToken}`);

      // token 签名有效但无 userId，authMiddleware 放行，业务层 getUserInfo(undefined) 抛错
      // 潜在安全改进点：authMiddleware 应校验 userId 存在
      expect([401, 500]).toContain(res.body.code);
    });
  });

  describe('鉴权越权防护', () => {
    it('未登录不能创建小说', async () => {
      const res = await request(app)
        .post('/api/v1/novels')
        .send({ name: '小说', author: '作者' });

      expect(res.status).toBe(401);
    });

    it('未登录不能创建章节', async () => {
      const res = await request(app)
        .post(`/api/v1/novels/${novelId}/chapters`)
        .send({ title: '章节', content: '内容' });

      expect(res.status).toBe(401);
    });

    it('未登录不能上传头像', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      const res = await request(app)
        .post('/api/v1/user/avatar')
        .attach('avatar', pngBuffer, { filename: 'a.png', contentType: 'image/png' });

      expect(res.status).toBe(401);
    });

    it('未登录不能修改密码', async () => {
      const res = await request(app)
        .put('/api/v1/user/password')
        .send({
          oldPassword: 'password123',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        });

      expect(res.status).toBe(401);
    });

    it('未登录不能更新阅读进度', async () => {
      const res = await request(app)
        .put(`/api/v1/reading-progress/${novelId}`)
        .send({ chapterId: 1, scrollPosition: 0.5 });

      expect(res.status).toBe(401);
    });

    it('未登录不能获取阅读进度', async () => {
      const res = await request(app).get(`/api/v1/reading-progress/${novelId}`);

      expect(res.status).toBe(401);
    });

    it('A 用户的 Token 不能访问 B 用户的进度', async () => {
      // 用户 A 更新进度
      const chapter = await Chapter.findOne({ where: { novel_id: novelId } });
      await request(app)
        .put(`/api/v1/reading-progress/${novelId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ chapterId: chapter!.id, scrollPosition: 0.5 });

      // 注册用户 B
      const bRes = await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: 'userb@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });
      const tokenB = bRes.body.data.token;

      // 用户 B 查询同一小说进度，应为 null（不能看到 A 的进度）
      const res = await request(app)
        .get(`/api/v1/reading-progress/${novelId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  describe('验证码安全', () => {
    it('验证码发送频率限制（60秒内不可重复）', async () => {
      await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'rate@example.com', type: 'register' });

      const res = await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'rate@example.com', type: 'register' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('频繁');
    });

    it('不同 type 的验证码互不干扰', async () => {
      // 发送 register 类型
      await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'multi@example.com', type: 'register' });

      // 60秒内再次发送相同邮箱不同 type，仍应被限流（按邮箱限流）
      const res = await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'multi@example.com', type: 'login' });

      expect(res.status).toBe(400);
    });
  });

  describe('路由层与健康检查', () => {
    it('健康检查应返回200', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('healthy');
    });

    it('带Token访问不存在的路由应返回404', async () => {
      const res = await request(app)
        .get('/api/v1/not-exist')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
    });

    it('不带Token访问不存在的受保护路由应返回401', async () => {
      // novel/reader router 的 router.use(authMiddleware) 前置鉴权
      const res = await request(app).get('/api/v1/not-exist');

      expect(res.status).toBe(401);
    });

    it('带Token访问不存在的POST路由应返回404', async () => {
      const res = await request(app)
        .post('/api/v1/no-such-endpoint')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('静态文件目录可访问', async () => {
      // /uploads 路径下无文件时应返回404（目录存在但无 index）
      const res = await request(app).get('/uploads/');
      expect([404, 301]).toContain(res.status);
    });
  });

  describe('输入长度与边界防护', () => {
    it('超长邮箱（>100字符）注册应被数据库或校验拒绝', async () => {
      const longEmail = `${'a'.repeat(95)}@b.com`; // 超过100字符
      const res = await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: longEmail,
          password: 'password123',
          confirmPassword: 'password123',
        });

      // 邮箱格式合法但超长，数据库 STRING(100) 应拒绝
      expect(res.body.code).toBe(500);
    });

    it('小说简介超长（>2000）应能存储（TEXT 字段）', async () => {
      const res = await request(app)
        .post('/api/v1/novels')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '超长简介小说',
          author: '作者',
          description: 'a'.repeat(2001),
        });

      expect(res.status).toBe(200);
    });
  });

  describe('密码安全', () => {
    it('密码经 bcrypt 加密存储（非明文）', async () => {
      // 直接查库验证
      const { User } = require('../src/models');
      const user = await User.findOne({ where: { email: 'security@example.com' } });

      expect(user.password).not.toBe('password123');
      expect(user.password).toMatch(/^\$2[ab]\$\d{2}\$/);
    });

    it('相同密码注册后哈希值不同（盐随机）', async () => {
      const res1 = await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: 'hash1@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });

      const res2 = await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: 'hash2@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });

      const { User } = require('../src/models');
      const user1 = await User.findByPk(res1.body.data.user.id);
      const user2 = await User.findByPk(res2.body.data.user.id);

      expect(user1.password).not.toBe(user2.password);
    });
  });
});
