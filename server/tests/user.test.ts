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

    it('两次密码不一致时应返回400', async () => {
      const res = await request(app)
        .put('/api/v1/user/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: 'password123',
          newPassword: 'newpassword123',
          confirmPassword: 'different123',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('两次密码不一致');
    });

    it('原密码为空时应返回400', async () => {
      const res = await request(app)
        .put('/api/v1/user/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          oldPassword: '',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('请输入原密码');
    });

    it('未登录时应返回401', async () => {
      const res = await request(app)
        .put('/api/v1/user/password')
        .send({
          oldPassword: 'password123',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        });

      expect(res.status).toBe(401);
    });
  });

  // ========== 边界与安全场景补充 ==========
  describe('边界与安全场景补充', () => {
    describe('PUT /api/v1/user/profile - 边界', () => {
      it('昵称超长时应返回400', async () => {
        const res = await request(app)
          .put('/api/v1/user/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ nickname: 'a'.repeat(21) });

        expect(res.status).toBe(400);
      });

      it('昵称恰好2位应成功（边界）', async () => {
        const res = await request(app)
          .put('/api/v1/user/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ nickname: 'ab' });

        expect(res.status).toBe(200);
        expect(res.body.data.nickname).toBe('ab');
      });

      it('昵称恰好20位应成功（边界）', async () => {
        const res = await request(app)
          .put('/api/v1/user/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ nickname: 'a'.repeat(20) });

        expect(res.status).toBe(200);
      });

      it('简介恰好200字符应成功（边界）', async () => {
        const res = await request(app)
          .put('/api/v1/user/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ bio: 'a'.repeat(200) });

        expect(res.status).toBe(200);
      });

      it('简介为空字符串应成功', async () => {
        const res = await request(app)
          .put('/api/v1/user/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ bio: '' });

        expect(res.status).toBe(200);
      });

      it('只更新昵称不影响简介', async () => {
        // 先设置简介
        await request(app)
          .put('/api/v1/user/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ bio: '原始简介', nickname: '原始昵称' });

        // 只更新昵称
        const res = await request(app)
          .put('/api/v1/user/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ nickname: '新昵称' });

        expect(res.status).toBe(200);
        expect(res.body.data.nickname).toBe('新昵称');
        expect(res.body.data.bio).toBe('原始简介');
      });

      it('未登录时应返回401', async () => {
        const res = await request(app)
          .put('/api/v1/user/profile')
          .send({ nickname: '新昵称' });

        expect(res.status).toBe(401);
      });

      it('Authorization头格式错误时应返回401', async () => {
        const res = await request(app)
          .get('/api/v1/user/profile')
          .set('Authorization', 'InvalidFormat token');

        expect(res.status).toBe(401);
      });

      it('昵称含XSS脚本应能存储（转义由前端处理）', async () => {
        const res = await request(app)
          .put('/api/v1/user/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({ nickname: '<b>x</b>' });

        // 当前实现原样存储，验证不报错即可
        expect(res.status).toBe(200);
        expect(res.body.data.nickname).toBe('<b>x</b>');
      });
    });

    describe('POST /api/v1/user/avatar - 头像上传', () => {
      // 1x1 透明 PNG 的 base64
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      it('应该成功上传头像', async () => {
        const res = await request(app)
          .post('/api/v1/user/avatar')
          .set('Authorization', `Bearer ${token}`)
          .attach('avatar', pngBuffer, { filename: 'avatar.png', contentType: 'image/png' });

        expect(res.status).toBe(200);
        expect(res.body.code).toBe(200);
        expect(res.body.message).toBe('头像上传成功');
        expect(res.body.data.avatar).toMatch(/^\/uploads\/avatars\//);

        // 验证用户信息中头像已更新
        const profileRes = await request(app)
          .get('/api/v1/user/profile')
          .set('Authorization', `Bearer ${token}`);

        expect(profileRes.body.data.avatar).toBe(res.body.data.avatar);
      });

      it('未上传文件时应返回400', async () => {
        const res = await request(app)
          .post('/api/v1/user/avatar')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('请上传头像文件');
      });

      it('文件格式不支持时应返回错误', async () => {
        const res = await request(app)
          .post('/api/v1/user/avatar')
          .set('Authorization', `Bearer ${token}`)
          .attach('avatar', Buffer.from('plain text'), {
            filename: 'avatar.txt',
            contentType: 'text/plain',
          });

        // multer fileFilter 抛错由 errorHandler 处理，返回500
        expect(res.body.code).toBe(500);
        expect(res.body.message).toContain('JPG/PNG/WEBP');
      });

      it('文件超过2MB时应返回错误', async () => {
        // 构造大于 2MB 的 buffer
        const bigBuffer = Buffer.alloc(2 * 1024 * 1024 + 100, 0);
        const res = await request(app)
          .post('/api/v1/user/avatar')
          .set('Authorization', `Bearer ${token}`)
          .attach('avatar', bigBuffer, { filename: 'big.png', contentType: 'image/png' });

        expect(res.body.code).toBe(500);
      });

      it('未登录时应返回401', async () => {
        const res = await request(app)
          .post('/api/v1/user/avatar')
          .attach('avatar', pngBuffer, { filename: 'avatar.png', contentType: 'image/png' });

        expect(res.status).toBe(401);
      });

      it('JPEG格式应能上传成功', async () => {
        // 用 png buffer 但声明为 jpg（multer 只检查 mimetype 和 extname）
        const res = await request(app)
          .post('/api/v1/user/avatar')
          .set('Authorization', `Bearer ${token}`)
          .attach('avatar', pngBuffer, { filename: 'avatar.jpg', contentType: 'image/jpeg' });

        expect(res.status).toBe(200);
      });

      it('WEBP格式应能上传成功', async () => {
        const res = await request(app)
          .post('/api/v1/user/avatar')
          .set('Authorization', `Bearer ${token}`)
          .attach('avatar', pngBuffer, { filename: 'avatar.webp', contentType: 'image/webp' });

        expect(res.status).toBe(200);
      });
    });
  });
});
