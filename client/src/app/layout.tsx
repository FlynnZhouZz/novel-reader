import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Provider } from 'react-redux';
import { store } from '@/store';
import AppHeader from '@/components/common/AppHeader';
import './globals.css';

export const metadata: Metadata = {
  title: '小说阅读器',
  description: '在线小说阅读平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Provider store={store}>
          <AntdRegistry>
            <AppHeader />
            <main style={{ minHeight: 'calc(100vh - 64px)' }}>{children}</main>
          </AntdRegistry>
        </Provider>
      </body>
    </html>
  );
}
