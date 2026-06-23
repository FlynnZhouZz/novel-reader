import { validateEmail, validatePassword, validateNickname } from '../../src/utils/validator';

describe('验证工具函数', () => {
  describe('validateEmail', () => {
    it('合法邮箱应返回true', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.org')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('非法邮箱应返回false', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('合法密码应返回true', () => {
      expect(validatePassword('password123')).toBe(true);
      expect(validatePassword('Abcdef12')).toBe(true);
      expect(validatePassword('12345678a')).toBe(true);
    });

    it('过短密码应返回false', () => {
      expect(validatePassword('abc123')).toBe(false);
      expect(validatePassword('a1')).toBe(false);
    });

    it('过长密码应返回false', () => {
      expect(validatePassword('abcdefghijklmnop123456789')).toBe(false); // 21字符
    });

    it('纯字母密码应返回false', () => {
      expect(validatePassword('abcdefghij')).toBe(false);
    });

    it('纯数字密码应返回false', () => {
      expect(validatePassword('12345678')).toBe(false);
    });
  });

  describe('validateNickname', () => {
    it('合法昵称应返回true', () => {
      expect(validateNickname('ab')).toBe(true);
      expect(validateNickname('测试用户')).toBe(true);
      expect(validateNickname('abcdefghijklmnopqrst')).toBe(true); // 20字符
    });

    it('过短昵称应返回false', () => {
      expect(validateNickname('a')).toBe(false);
      expect(validateNickname('')).toBe(false);
    });

    it('过长昵称应返回false', () => {
      expect(validateNickname('abcdefghijklmnopqrstu')).toBe(false); // 21字符
    });
  });
});
