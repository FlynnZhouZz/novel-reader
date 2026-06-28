import userReducer, { setLoginInfo, updateUserInfo, logout } from '../../src/store/slices/userSlice';
import { UserInfo } from '../../src/types';

describe('userSlice', () => {
  const mockUser: UserInfo = {
    id: 1,
    email: 'test@example.com',
    nickname: '测试用户',
    avatar: null,
    bio: null,
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('应该返回初始状态', () => {
    expect(userReducer(undefined, { type: 'unknown' })).toEqual({
      token: null,
      userInfo: null,
      isLoggedIn: false,
      hydrated: false,
    });
  });

  it('setLoginInfo 应该设置登录信息', () => {
    const initialState = {
      token: null,
      userInfo: null,
      isLoggedIn: false,
      hydrated: false,
    };

    const action = setLoginInfo({ token: 'test-token', user: mockUser });
    const state = userReducer(initialState, action);

    expect(state.token).toBe('test-token');
    expect(state.userInfo).toEqual(mockUser);
    expect(state.isLoggedIn).toBe(true);
  });

  it('updateUserInfo 应该更新用户信息', () => {
    const initialState = {
      token: 'test-token',
      userInfo: mockUser,
      isLoggedIn: true,
      hydrated: true,
    };

    const action = updateUserInfo({ nickname: '新昵称', bio: '新简介' });
    const state = userReducer(initialState, action);

    expect(state.userInfo?.nickname).toBe('新昵称');
    expect(state.userInfo?.bio).toBe('新简介');
    expect(state.userInfo?.email).toBe('test@example.com'); // 未修改的字段保持不变
  });

  it('logout 应该清除登录信息', () => {
    const initialState = {
      token: 'test-token',
      userInfo: mockUser,
      isLoggedIn: true,
      hydrated: true,
    };

    const state = userReducer(initialState, logout());

    expect(state.token).toBeNull();
    expect(state.userInfo).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });
});
