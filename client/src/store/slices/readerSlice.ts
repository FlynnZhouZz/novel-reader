import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChapterDetail, ReaderSettings, FlipMode } from '../../types';

interface ReaderState {
  currentChapter: ChapterDetail | null;
  settings: ReaderSettings;
  autoReading: boolean;
  showSettings: boolean;
  showChapterList: boolean;
}

// 默认阅读器设置
export const defaultSettings: ReaderSettings = {
  backgroundColor: '#FFFFFF',
  textColor: '#333333',
  fontSize: 16,
  darkMode: false,
  flipMode: 'scroll' as FlipMode,
  autoReadSpeed: 2,
};

// 从 localStorage 加载设置
const loadSettings = (): ReaderSettings => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('readerSettings');
    if (stored) {
      try {
        return { ...defaultSettings, ...JSON.parse(stored) };
      } catch (e) {
        return defaultSettings;
      }
    }
  }
  return defaultSettings;
};

const initialState: ReaderState = {
  currentChapter: null,
  settings: loadSettings(),
  autoReading: false,
  showSettings: false,
  showChapterList: false,
};

const readerSlice = createSlice({
  name: 'reader',
  initialState,
  reducers: {
    setCurrentChapter: (state, action: PayloadAction<ChapterDetail | null>) => {
      state.currentChapter = action.payload;
    },
    updateSettings: (state, action: PayloadAction<Partial<ReaderSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      if (typeof window !== 'undefined') {
        localStorage.setItem('readerSettings', JSON.stringify(state.settings));
      }
    },
    setAutoReading: (state, action: PayloadAction<boolean>) => {
      state.autoReading = action.payload;
    },
    setShowSettings: (state, action: PayloadAction<boolean>) => {
      state.showSettings = action.payload;
    },
    setShowChapterList: (state, action: PayloadAction<boolean>) => {
      state.showChapterList = action.payload;
    },
  },
});

export const {
  setCurrentChapter,
  updateSettings,
  setAutoReading,
  setShowSettings,
  setShowChapterList,
} = readerSlice.actions;
export default readerSlice.reducer;
