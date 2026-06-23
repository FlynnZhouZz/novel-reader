import { sendVerificationEmail } from './emailService';

interface CodeRecord {
  code: string;
  expires: number;
  lastSentAt: number;
  type: string;
  attempts: number; // 尝试次数
}

// 使用 Map 临时存储验证码（生产环境应使用 Redis）
const codeStore = new Map<string, CodeRecord>();

export type CodeType = 'register' | 'login' | 'reset';

// 生成 6 位数字验证码
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 检查是否可以发送验证码（60秒内不可重复发送）
export const canSendCode = (email: string): boolean => {
  const record = codeStore.get(email);
  if (!record) return true;
  return Date.now() - record.lastSentAt > 60 * 1000;
};

// 发送验证码
export const sendCode = async (email: string, type: CodeType): Promise<void> => {
  if (!canSendCode(email)) {
    throw new Error('验证码发送过于频繁，请60秒后再试');
  }

  const code = generateCode();

  // 先发送邮件，成功后再存储验证码
  try {
    await sendVerificationEmail(email, code);
  } catch (error) {
    // 邮件发送失败，不存储验证码
    throw new Error('验证码发送失败，请稍后重试');
  }

  // 邮件发送成功，存储验证码
  const record: CodeRecord = {
    code,
    expires: Date.now() + 5 * 60 * 1000, // 5分钟有效
    lastSentAt: Date.now(),
    type,
    attempts: 0,
  };
  codeStore.set(email, record);
};

// 验证验证码
export const verifyCode = (email: string, code: string, type?: CodeType): boolean => {
  const record = codeStore.get(email);
  if (!record) return false;

  // 检查是否过期
  if (Date.now() > record.expires) {
    codeStore.delete(email);
    return false;
  }

  // 检查尝试次数（最多5次）
  if (record.attempts >= 5) {
    codeStore.delete(email);
    return false;
  }

  // 验证码不匹配，增加尝试次数
  if (record.code !== code) {
    record.attempts += 1;
    return false;
  }

  // 验证码正确，删除记录
  codeStore.delete(email);
  return true;
};

// 测试用：直接获取验证码（仅用于测试环境）
export const getCodeForTest = (email: string): string | null => {
  if (process.env.NODE_ENV !== 'test') {
    return null;
  }
  const record = codeStore.get(email);
  return record ? record.code : null;
};

// 测试用：清除验证码（仅用于测试环境）
export const clearCodeStore = (): void => {
  codeStore.clear();
};
