import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Novel, ChapterListItem } from '../../types';

interface NovelState {
  novelList: Novel[];
  currentNovel: Novel | null;
  chapters: ChapterListItem[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
}

const initialState: NovelState = {
  novelList: [],
  currentNovel: null,
  chapters: [],
  total: 0,
  page: 1,
  limit: 20,
  loading: false,
};

const novelSlice = createSlice({
  name: 'novel',
  initialState,
  reducers: {
    setNovelList: (state, action: PayloadAction<{ list: Novel[]; total: number; page: number; limit: number }>) => {
      state.novelList = action.payload.list;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.limit = action.payload.limit;
    },
    setCurrentNovel: (state, action: PayloadAction<Novel | null>) => {
      state.currentNovel = action.payload;
    },
    setChapters: (state, action: PayloadAction<ChapterListItem[]>) => {
      state.chapters = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setNovelList, setCurrentNovel, setChapters, setLoading } = novelSlice.actions;
export default novelSlice.reducer;
