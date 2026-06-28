#!/usr/bin/env ts-node
/**
 * 爬虫小说上传脚本（个人书架模式，使用 token 鉴权）
 *
 * 用法：
 *   yarn upload <novelDir> [--author=<作者>] [--description=<简介>] [--cover=<url>] [--overwrite] [--content-base=<dir>]
 *
 * 前置条件：
 *   必须先运行 yarn auth 登录，token 保存在 .upload-token（7 天过期）
 *
 * 流程：
 *   1. 读取本地 .upload-token
 *   2. 用 verifyToken 校验并解析 userId
 *   3. token 无效/过期 → 提示重新 yarn login
 *   4. token 有效 → 直连 service 上传到该用户书架
 */
import fs from 'fs';
import path from 'path';
import { verifyToken } from '../src/utils/jwt';
import { uploadNovelFromCrawler } from '../src/services/novelService';
import { sequelize } from '../src/config/database';

const REGISTER_URL = process.env.REGISTER_URL || 'http://localhost:3050/register';
const TOKEN_FILE = path.join(__dirname, '..', '.upload-token');

async function main() {
  const args = process.argv.slice(2);
  const novelDir = args[0];
  if (!novelDir) {
    console.error('用法: yarn upload <novelDir> [--author=...] [--description=...] [--cover=...] [--overwrite] [--content-base=...]');
    console.error('提示：首次使用需先登录 yarn auth --email=<邮箱> --password=<密码>');
    process.exit(1);
  }

  // 1. 读取本地 token
  if (!fs.existsSync(TOKEN_FILE)) {
    console.error('❌ 未找到登录 token，请先登录: yarn auth --email=<邮箱> --password=<密码>');
    console.error(`没有账号？请到 ${REGISTER_URL} 注册`);
    process.exit(1);
  }

  const token = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();

  // 2. 校验并解析 token
  let userId: number;
  try {
    const decoded = verifyToken(token);
    userId = decoded.userId;
  } catch (e: any) {
    console.error('❌ Token 已过期或无效，请重新登录: yarn auth --email=<邮箱> --password=<密码>');
    process.exit(1);
  }

  // 解析可选参数
  const opts: Record<string, string> = {};
  for (const arg of args.slice(1)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
    else if (arg.startsWith('--')) opts[arg.slice(2)] = '';
  }

  // 3. 直连 service 上传（避免 HTTP 长连接超时）
  await sequelize.authenticate();
  console.log(`📖 正在上传到 userId=${userId} 的书架...`);
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
