'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { hydrateAuth } from '@/store/slices/userSlice';
import { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 挂载后从 localStorage 恢复登录态，保证 SSR/CSR 首次渲染一致
    store.dispatch(hydrateAuth());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
