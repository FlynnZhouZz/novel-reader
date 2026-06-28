#!/usr/bin/env ts-node
/**
 * 爬虫小说上传脚本（个人书架模式）
 *
 * 用法：
 *   yarn upload <novelDir> --user=<email> [--author=<作者>] [--description=<简介>] [--cover=<url>] [--overwrite] [--content-base=<dir>]
 *
 * 示例：
 *   yarn upload ../crawler-novels/outputs/html/吞噬星空2：起源大陆 --user=admin@test.com --author=我吃西红柿
 *
 * 说明：
 *   脚本直接调用 service 函数，不经 HTTP/authMiddleware。
 *   能跑脚本 = 有服务器权限 = 已是管理员。
 *   --user 仅用于指定"这本小说归属哪个用户书架"，不是鉴权。
 */
import { User } from '../src/models';
import { uploadNovelFromCrawler } from '../src/services/novelService';
import { sequelize } from '../src/config/database';

async function main() {
  const args = process.argv.slice(2);
  const novelDir = args[0];
  if (!novelDir) {
    console.error('用法: yarn upload <novelDir> --user=<email> [--author=...] [--description=...] [--cover=...] [--overwrite] [--content-base=...]');
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

  const userEmail = opts.user;
  if (!userEmail) {
    console.error('错误：必须指定 --user=<email>（归属用户邮箱）');
    process.exit(1);
  }

  await sequelize.authenticate();

  // 按 email 查用户，得 user_id
  const user = await User.findOne({ where: { email: userEmail } });
  if (!user) {
    console.error(`错误：用户不存在 ${userEmail}`);
    process.exit(1);
  }

  console.log(`📖 正在上传到「${user.nickname}」的书架...`);
  console.log(`   目录: ${novelDir}`);

  const result = await uploadNovelFromCrawler({
    novelDir,
    userId: user.id,
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
