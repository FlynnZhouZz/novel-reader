import { FlipMode, ReaderSettings } from '../../src/types';

describe('类型定义', () => {
  it('FlipMode 应该支持四种翻页模式', () => {
    const modes: FlipMode[] = ['scroll', 'slide', 'cover', 'realistic'];
    expect(modes).toHaveLength(4);
    expect(modes).toContain('scroll');
    expect(modes).toContain('slide');
    expect(modes).toContain('cover');
    expect(modes).toContain('realistic');
  });

  it('ReaderSettings 应该包含所有必要字段', () => {
    const settings: ReaderSettings = {
      backgroundColor: '#FFFFFF',
      textColor: '#333333',
      fontSize: 16,
      darkMode: false,
      flipMode: 'scroll',
      autoReadSpeed: 2,
    };

    expect(settings.backgroundColor).toBe('#FFFFFF');
    expect(settings.textColor).toBe('#333333');
    expect(settings.fontSize).toBe(16);
    expect(settings.darkMode).toBe(false);
    expect(settings.flipMode).toBe('scroll');
    expect(settings.autoReadSpeed).toBe(2);
  });
});
