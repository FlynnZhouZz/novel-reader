#!/usr/bin/env ts-node
/**
 * 爬虫小说上传脚本（个人书架模式）
 *
 * 用法：
 *   yarn upload <novelDir> --email=<邮箱> --password=<密码> [--author=<作者>] [--description=<简介>] [--cover=<url>] [--overwrite] [--content-base=<dir>]
 *
 * 示例：
 *   yarn upload "../../crawler-novels/outputs/html/吞噬星空2：起源大陆" --email=admin@test.com --password=admin123 --author=我吃西红柿
 *
 * 流程：
 *   1. 调用登录接口验证账号密码（与网站登录同一接口）
 *   2. 登录失败 → 提示去网站注册
 *   3. 登录成功 → 从响应拿 userId，直连 service 上传到该用户书架
 *
 * 说明：
 *   - 必须先有账号，没有账号请到网站注册：http://localhost:3050/register
 *   - 脚本走 HTTP 登录接口校验身份，登录态与网站一致
 *   - 上传部分直连 service 函数，避免 HTTP 长连接超时（452 章约 10-20 秒）
 */
import { uploadNovelFromCrawler } from '../src/services/novelService';
import { sequelize } from '../src/config/database';

// 后端 API 地址（默认本地，可用环境变量覆盖）
const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
// 前端注册页地址（用于失败提示）
const REGISTER_URL = process.env.REGISTER_URL || 'http://localhost:3050/register';

async function main() {
  const args = process.argv.slice(2);
  const novelDir = args[0];
  if (!novelDir) {
    console.error('用法: yarn upload <novelDir> --email=<邮箱> --password=<密码> [--author=...] [--description=...] [--cover=...] [--overwrite] [--content-base=...]');
    process.exit(1);
  }

  // 解析 --key=value / --flag 参数
  const opts: Record<string, string> = {};
  for (const arg of args.slice(1)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) {
      opts[m[1]] = m[2];
    } else if (arg.startsWith('--')) {
      opts[arg.slice(2)] = ''; // flag，如 --overwrite
    }
  }

  const email = opts.email;
  const password = opts.password;
  if (!email || !password) {
    console.error('错误：必须指定 --email=<邮箱> --password=<密码>');
    console.error(`没有账号？请到 ${REGISTER_URL} 注册`);
    process.exit(1);
  }

  // 1. 登录校验（走 HTTP，与网站登录同一接口）
  console.log(`🔑 登录中: ${email}`);
  let userId: number;
  let nickname: string;
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
    userId = loginData.data.user.id;
    nickname = loginData.data.user.nickname;
    console.log(`✅ 登录成功: ${nickname} (id=${userId})`);
  } catch (e: any) {
    console.error(`❌ 登录请求失败: ${e.message}`);
    console.error('请确认后端服务已启动: cd server && yarn dev');
    process.exit(1);
  }

  // 2. 直连 service 上传（避免 HTTP 长连接超时）
  await sequelize.authenticate();
  console.log(`📖 正在上传到「${nickname}」的书架...`);
  console.log(`   目录: ${novelDir}`);

  const result = await uploadNovelFromCrawler({
    novelDir,
    userId,
    author: opts.author,
    description: opts.description,
    cover: opts.cover || undefined,
    overwrite: 'overwrite' in opts,
    contentBaseDir: opts['content-base'] || undefined,
  });

  console.log(`\n✅ 上传完成: ${result.novelName}`);
  console.log(`   新建: ${result.created}  跳过: ${result.skipped}  失败: ${result.failed}  总计: ${result.totalChapters}`);
  if (result.errors.length) {
    console.log('   失败详情:');
    result.errors.forEach((e) => console.log('   - ' + e));
  }

  await sequelize.close();
  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('❌ 上传失败:', e.message);
  process.exit(1);
});
