import request from 'supertest';
import { app } from '../src/app';
import { sequelize } from '../src/config/database';
import { User } from '../src/models';

describe('用户接口测试', () => {
  let token: string;
  let userId: number;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.truncate({ cascade: true });

    // 注册一个用户并获取token
    const res = await request(app)
      .post('/api/v1/auth/register-with-password')
      .send({
        email: 'profile@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      });

    token = res.body.data.token;
    userId = res.body.data.user.id;
  });

  describe('GET /api/v1/user/profile', () => {
    it('应该成功获取用户信息', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.data.email).toBe('profile@example.com');
      expect(res.body.data.nickname).toBe('新用户');
    });

    it('未登录时应返回401', async () => {
      const res = await request(app).get('/api/v1/user/profile');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('Token无效时应返回401', async () => {
      const res = await request(app)
        .get('/api/v1/user/profile')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  describe('PUT /api/v1/user/profile', () => {
    it('应该成功更新昵称和简介', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nickname: '新昵称',
          bio: '这是我的简介',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('更新成功');
      expect(res.body.data.nickname).toBe('新昵称');
      expect(res.body.data.bio).toBe('这是我的简介');
    });

    it('昵称长度不足时应返回400', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nickname: '短',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('简介超长时应返回400', async () => {
      const res = await request(app)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bio: 'a'.repeat(201),
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });
  });

  describe('PUT /api/v1/user/password', () => {
    it('应该成功修改密码', async () => {
      const res = await request(app)
        .put('/api/v1/user/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: 'password123',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('密码修改成功');

      // 验证新密码可以登录
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'profile@example.com',
          password: 'newpassword123',
        });

      expect(loginRes.body.code).toBe(200);
    });

    it('原密码错误时应返回500', async () => {
      const res = await request(app)
        .put('/api/v1/user/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: 'wrongpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        });

      expect(res.body.code).toBe(500);
      expect(res.body.message).toBe('原密码错误');
    });

    it('新密码格式无效时应返回400', async () => {
      const res = await request(app)
        .put('/api/v1/user/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: 'password123',
          newPassword: '123',
          confirmPassword: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });
  });
});
