import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import Providers from '@/components/common/Providers';
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
        <Providers>
          <AntdRegistry>
            <AppHeader />
            <main style={{ minHeight: 'calc(100vh - 64px)' }}>{children}</main>
          </AntdRegistry>
        </Providers>
      </body>
    </html>
  );
}
