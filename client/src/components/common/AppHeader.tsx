'use client';

import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import { HomeOutlined, BookOutlined, UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/userSlice';
import { getAvatarUrl } from '@/utils/url';

const { Header } = Layout;

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isLoggedIn, userInfo } = useAppSelector((state) => state.user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 阅读器页面不显示头部
  if (pathname?.startsWith('/reader')) {
    return null;
  }

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };

  const menuItems = [
    { key: '/', label: <Link href="/">首页</Link>, icon: <HomeOutlined /> },
    { key: '/novels', label: <Link href="/novels">小说库</Link>, icon: <BookOutlined /> },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      label: '个人中心',
      icon: <UserOutlined />,
      onClick: () => router.push('/profile'),
    },
    {
      key: 'settings',
      label: '修改密码',
      icon: <SettingOutlined />,
      onClick: () => router.push('/profile?tab=password'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
      <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', marginRight: '48px' }}>
        小说阅读器
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[pathname || '/']}
        items={menuItems}
        style={{ flex: 1, minWidth: 0 }}
      />
      {mounted && isLoggedIn && userInfo ? (
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Avatar src={getAvatarUrl(userInfo.avatar)} icon={<UserOutlined />} />
            <span style={{ color: '#fff' }}>{userInfo.nickname}</span>
          </div>
        </Dropdown>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button type="link" href="/login" style={{ color: '#fff' }}>登录</Button>
          <Button type="link" href="/register" style={{ color: '#fff' }}>注册</Button>
        </div>
      )}
    </Header>
  );
}
