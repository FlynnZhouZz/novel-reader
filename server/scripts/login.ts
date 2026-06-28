#!/usr/bin/env ts-node
/**
 * 登录脚本（保存 token 供 upload 脚本使用）
 *
 * 用法：
 *   yarn auth --email=<邮箱> --password=<密码>
 *
 * 流程：
 *   1. 调用登录接口验证账号密码
 *   2. 登录成功 → 保存 token 到 .upload-token 文件（7 天过期）
 *   3. 之后用 yarn upload 上传时自动读取该 token，无需再次登录
 *
 * 没有账号请到网站注册：http://localhost:3050/register
 */
import fs from 'fs';
import path from 'path';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const REGISTER_URL = process.env.REGISTER_URL || 'http://localhost:3050/register';
const TOKEN_FILE = path.join(__dirname, '..', '.upload-token');

async function main() {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};
  for (const arg of args) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  }

  const email = opts.email;
  const password = opts.password;
  if (!email || !password) {
    console.error('用法: yarn auth --email=<邮箱> --password=<密码>');
    console.error(`没有账号？请到 ${REGISTER_URL} 注册`);
    process.exit(1);
  }

  console.log(`🔑 登录中: ${email}`);
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginData: any = await loginRes.json();
    if (loginData.code !== 200 || !loginData.data?.token) {
      console.error(`❌ 登录失败: ${loginData.message || '未知错误'}`);
      console.error(`没有账号？请到 ${REGISTER_URL} 注册`);
      process.exit(1);
    }

    const { token, user } = loginData.data;
    // 保存 token 到本地文件
    fs.writeFileSync(TOKEN_FILE, token, 'utf-8');

    console.log(`✅ 登录成功: ${user.nickname} (id=${user.id}, email=${user.email})`);
    console.log(`   Token 已保存到 ${TOKEN_FILE}`);
    console.log(`   有效期 7 天，期间可用 yarn upload 上传，无需再次登录`);
  } catch (e: any) {
    console.error(`❌ 登录请求失败: ${e.message}`);
    console.error('请确认后端服务已启动: cd server && yarn dev');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ 失败:', e.message);
  process.exit(1);
});
