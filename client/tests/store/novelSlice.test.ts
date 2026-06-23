import novelReducer, {
  setNovelList,
  setCurrentNovel,
  setChapters,
  setLoading,
} from '../../src/store/slices/novelSlice';
import { Novel, ChapterListItem } from '../../src/types';

describe('novelSlice', () => {
  const mockNovel: Novel = {
    id: 1,
    name: '测试小说',
    cover: null,
    description: '简介',
    author: '作者',
    chapterCount: 10,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockChapters: ChapterListItem[] = [
    { id: 1, title: '第一章', orderNum: 1 },
    { id: 2, title: '第二章', orderNum: 2 },
  ];

  it('应该返回初始状态', () => {
    const state = novelReducer(undefined, { type: 'unknown' });
    expect(state.novelList).toEqual([]);
    expect(state.currentNovel).toBeNull();
    expect(state.chapters).toEqual([]);
    expect(state.total).toBe(0);
    expect(state.page).toBe(1);
    expect(state.limit).toBe(20);
    expect(state.loading).toBe(false);
  });

  it('setNovelList 应该设置小说列表', () => {
    const state = novelReducer(
      undefined,
      setNovelList({ list: [mockNovel], total: 1, page: 1, limit: 20 })
    );
    expect(state.novelList).toHaveLength(1);
    expect(state.novelList[0].name).toBe('测试小说');
    expect(state.total).toBe(1);
    expect(state.page).toBe(1);
    expect(state.limit).toBe(20);
  });

  it('setCurrentNovel 应该设置当前小说', () => {
    const state = novelReducer(undefined, setCurrentNovel(mockNovel));
    expect(state.currentNovel).toEqual(mockNovel);
  });

  it('setChapters 应该设置章节列表', () => {
    const state = novelReducer(undefined, setChapters(mockChapters));
    expect(state.chapters).toHaveLength(2);
    expect(state.chapters[0].title).toBe('第一章');
  });

  it('setLoading 应该设置加载状态', () => {
    const state = novelReducer(undefined, setLoading(true));
    expect(state.loading).toBe(true);
  });
});
