'use client';

import { useState } from 'react';
import { Card, Form, Input, Button, Tabs, message } from 'antd';
import { MailOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { login, loginWithCode, sendCode } from '@/services/user';
import { useAppDispatch } from '@/store/hooks';
import { setLoginInfo } from '@/store/slices/userSlice';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 发送验证码
  const handleSendCode = async (email: string) => {
    if (!email) {
      message.warning('请先输入邮箱');
      return;
    }
    try {
      await sendCode(email, 'login');
      message.success('验证码已发送');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      message.error(error.message || '验证码发送失败');
    }
  };

  // 密码登录
  const onPasswordLogin = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await login(values.email, values.password);
      dispatch(setLoginInfo(res.data));
      message.success('登录成功');
      router.push('/');
    } catch (error: any) {
      message.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 验证码登录
  const onCodeLogin = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await loginWithCode(values.email, values.code);
      dispatch(setLoginInfo(res.data));
      message.success('登录成功');
      router.push('/');
    } catch (error: any) {
      message.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'password',
      label: '密码登录',
      children: (
        <Form onFinish={onPasswordLogin} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'code',
      label: '验证码登录',
      children: (
        <Form onFinish={onCodeLogin} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱" size="large" />
          </Form.Item>
          <Form.Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
            <Input
              prefix={<SafetyOutlined />}
              placeholder="验证码"
              size="large"
              suffix={
                <Button
                  type="link"
                  size="small"
                  disabled={countdown > 0}
                  onClick={() => {
                    const form = document.querySelector('form');
                    const emailInput = form?.querySelector('input[id="email"]') as HTMLInputElement;
                    handleSendCode(emailInput?.value || '');
                  }}
                >
                  {countdown > 0 ? `${countdown}s后重试` : '获取验证码'}
                </Button>
              }
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登录
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', padding: '24px' }}>
      <Card style={{ width: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>登录</h2>
        <Tabs items={tabItems} centered />
        <div style={{ textAlign: 'center' }}>
          <a href="/register">没有账号？去注册</a>
          <span style={{ margin: '0 8px' }}>|</span>
          <a href="/reset-password">忘记密码</a>
        </div>
      </Card>
    </div>
  );
}
