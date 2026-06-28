import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserInfo } from '../../types';

interface UserState {
  token: string | null;
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  hydrated: boolean;
}

const initialState: UserState = {
  token: null,
  userInfo: null,
  isLoggedIn: false,
  hydrated: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // 客户端挂载后从 localStorage 恢复登录态（避免 SSR/CSR 水合不一致）
    hydrateAuth: (state) => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('token');
      const userInfoStr = localStorage.getItem('userInfo');
      if (token && userInfoStr) {
        try {
          state.token = token;
          state.userInfo = JSON.parse(userInfoStr);
          state.isLoggedIn = true;
        } catch (e) {
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
        }
      }
      state.hydrated = true;
    },
    setLoginInfo: (state, action: PayloadAction<{ token: string; user: UserInfo }>) => {
      state.token = action.payload.token;
      state.userInfo = action.payload.user;
      state.isLoggedIn = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('userInfo', JSON.stringify(action.payload.user));
      }
    },
    updateUserInfo: (state, action: PayloadAction<Partial<UserInfo>>) => {
      if (state.userInfo) {
        state.userInfo = { ...state.userInfo, ...action.payload };
        if (typeof window !== 'undefined') {
          localStorage.setItem('userInfo', JSON.stringify(state.userInfo));
        }
      }
    },
    logout: (state) => {
      state.token = null;
      state.userInfo = null;
      state.isLoggedIn = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
      }
    },
  },
});

export const { setLoginInfo, updateUserInfo, logout, hydrateAuth } = userSlice.actions;
export default userSlice.reducer;
