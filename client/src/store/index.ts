import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import novelReducer from './slices/novelSlice';
import readerReducer from './slices/readerSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    novel: novelReducer,
    reader: readerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
