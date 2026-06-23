import request from 'supertest';
import { app } from '../src/app';
import { sequelize } from '../src/config/database';
import { getCodeForTest, clearCodeStore } from '../src/services/codeService';

describe('认证接口测试', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // 清空所有表数据
    await sequelize.truncate({ cascade: true });
    clearCodeStore();
  });

  describe('POST /api/v1/auth/send-code', () => {
    it('应该成功发送验证码', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'test@example.com', type: 'register' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('验证码已发送');
    });

    it('邮箱格式无效时应返回400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'invalid-email', type: 'register' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('验证码类型无效时应返回400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'test@example.com', type: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('60秒内重复发送应返回400', async () => {
      await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'test@example.com', type: 'register' });

      const res = await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'test@example.com', type: 'register' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('频繁');
    });
  });

  describe('POST /api/v1/auth/register-with-password', () => {
    it('应该成功使用邮箱+密码注册', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('注册成功');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('newuser@example.com');
    });

    it('邮箱已注册时应返回400', async () => {
      // 先注册一次
      await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });

      // 再注册相同邮箱
      const res = await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('该邮箱已被注册');
    });

    it('密码格式无效时应返回400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: 'test@example.com',
          password: '123',
          confirmPassword: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('密码');
    });

    it('两次密码不一致时应返回400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'different123',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('两次密码不一致');
    });
  });

  describe('POST /api/v1/auth/register (邮箱+验证码注册)', () => {
    it('应该成功使用邮箱+验证码注册', async () => {
      // 先发送验证码
      await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'codeuser@example.com', type: 'register' });

      const code = getCodeForTest('codeuser@example.com');
      expect(code).toBeDefined();

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'codeuser@example.com',
          code,
          password: 'password123',
          confirmPassword: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('注册成功');
      expect(res.body.data.token).toBeDefined();
    });

    it('验证码错误时应返回400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'wrongcode@example.com',
          code: '000000',
          password: 'password123',
          confirmPassword: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('验证码错误或已过期');
    });
  });

  describe('POST /api/v1/auth/login (邮箱+密码登录)', () => {
    beforeEach(async () => {
      // 先注册一个用户
      await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: 'loginuser@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });
    });

    it('应该成功登录', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('登录成功');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('loginuser@example.com');
    });

    it('密码错误时应返回500', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'wrongpassword',
        });

      expect(res.body.code).toBe(500);
      expect(res.body.message).toBe('邮箱或密码错误');
    });

    it('邮箱未注册时应返回500', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'notexist@example.com',
          password: 'password123',
        });

      expect(res.body.code).toBe(500);
      expect(res.body.message).toBe('该邮箱尚未注册');
    });
  });

  describe('POST /api/v1/auth/login-with-code (验证码登录)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: 'codelogin@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });
    });

    it('应该成功使用验证码登录', async () => {
      await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'codelogin@example.com', type: 'login' });

      const code = getCodeForTest('codelogin@example.com');

      const res = await request(app)
        .post('/api/v1/auth/login-with-code')
        .send({
          email: 'codelogin@example.com',
          code,
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('登录成功');
      expect(res.body.data.token).toBeDefined();
    });

    it('邮箱未注册时应返回500', async () => {
      await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'notexist@example.com', type: 'login' });

      const code = getCodeForTest('notexist@example.com');

      const res = await request(app)
        .post('/api/v1/auth/login-with-code')
        .send({
          email: 'notexist@example.com',
          code,
        });

      expect(res.body.code).toBe(500);
      expect(res.body.message).toBe('该邮箱尚未注册');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/auth/register-with-password')
        .send({
          email: 'reset@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        });
    });

    it('应该成功重置密码', async () => {
      await request(app)
        .post('/api/v1/auth/send-code')
        .send({ email: 'reset@example.com', type: 'reset' });

      const code = getCodeForTest('reset@example.com');

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: 'reset@example.com',
          code,
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(200);
      expect(res.body.message).toBe('密码重置成功');
      expect(res.body.data.token).toBeDefined();

      // 验证新密码可以登录
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'reset@example.com',
          password: 'newpassword123',
        });

      expect(loginRes.body.code).toBe(200);
    });
  });
});
