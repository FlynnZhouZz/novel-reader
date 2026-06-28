// 后端服务地址（去掉 /api/v1 路径，用于拼接静态资源）
const SERVER_ORIGIN = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');

// 将后端返回的相对路径头像转为完整 URL
export const getAvatarUrl = (avatar: string | null | undefined): string | undefined => {
  if (!avatar) return undefined;
  // 已经是完整 URL（http/https）或 data URI，直接返回
  if (/^(https?:|data:)/.test(avatar)) return avatar;
  // 相对路径拼后端域名
  return `${SERVER_ORIGIN}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
};
