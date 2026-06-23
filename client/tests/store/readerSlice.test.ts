import readerReducer, {
  setCurrentChapter,
  updateSettings,
  setAutoReading,
  setShowSettings,
  setShowChapterList,
  defaultSettings,
} from '../../src/store/slices/readerSlice';
import { ChapterDetail, ReaderSettings } from '../../src/types';

describe('readerSlice', () => {
  const mockChapter: ChapterDetail = {
    id: 1,
    title: '第一章',
    content: '内容',
    orderNum: 1,
    prevChapterId: null,
    nextChapterId: 2,
  };

  it('应该返回初始状态', () => {
    const state = readerReducer(undefined, { type: 'unknown' });
    expect(state.currentChapter).toBeNull();
    expect(state.autoReading).toBe(false);
    expect(state.showSettings).toBe(false);
    expect(state.showChapterList).toBe(false);
    expect(state.settings.fontSize).toBe(16);
    expect(state.settings.darkMode).toBe(false);
    expect(state.settings.flipMode).toBe('scroll');
  });

  it('setCurrentChapter 应该设置当前章节', () => {
    const state = readerReducer(undefined, setCurrentChapter(mockChapter));
    expect(state.currentChapter).toEqual(mockChapter);
  });

  it('updateSettings 应该更新设置', () => {
    const state = readerReducer(undefined, updateSettings({ fontSize: 20, darkMode: true }));
    expect(state.settings.fontSize).toBe(20);
    expect(state.settings.darkMode).toBe(true);
    // 未修改的设置应保持不变
    expect(state.settings.flipMode).toBe('scroll');
  });

  it('setAutoReading 应该切换自动阅读状态', () => {
    const state = readerReducer(undefined, setAutoReading(true));
    expect(state.autoReading).toBe(true);
  });

  it('setShowSettings 应该切换设置面板显示状态', () => {
    const state = readerReducer(undefined, setShowSettings(true));
    expect(state.showSettings).toBe(true);
  });

  it('setShowChapterList 应该切换目录面板显示状态', () => {
    const state = readerReducer(undefined, setShowChapterList(true));
    expect(state.showChapterList).toBe(true);
  });

  it('defaultSettings 应该包含所有必要字段', () => {
    expect(defaultSettings).toHaveProperty('backgroundColor');
    expect(defaultSettings).toHaveProperty('textColor');
    expect(defaultSettings).toHaveProperty('fontSize');
    expect(defaultSettings).toHaveProperty('darkMode');
    expect(defaultSettings).toHaveProperty('flipMode');
    expect(defaultSettings).toHaveProperty('autoReadSpeed');
  });
});
