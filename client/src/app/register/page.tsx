'use client';

import { useState } from 'react';
import { Card, Form, Input, Button, Tabs, message } from 'antd';
import { MailOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { registerWithCode, registerWithPassword, sendCode } from '@/services/user';
import { useAppDispatch } from '@/store/hooks';
import { setLoginInfo } from '@/store/slices/userSlice';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async (email: string) => {
    if (!email) {
      message.warning('请先输入邮箱');
      return;
    }
    try {
      await sendCode(email, 'register');
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

  // 邮箱+验证码注册
  const onCodeRegister = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await registerWithCode(values.email, values.code, values.password, values.confirmPassword);
      dispatch(setLoginInfo(res.data));
      message.success('注册成功');
      router.push('/');
    } catch (error: any) {
      message.error(error.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  // 邮箱+密码注册
  const onPasswordRegister = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await registerWithPassword(values.email, values.password, values.confirmPassword);
      dispatch(setLoginInfo(res.data));
      message.success('注册成功');
      router.push('/');
    } catch (error: any) {
      message.error(error.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'password',
      label: '密码注册',
      children: (
        <Form onFinish={onPasswordRegister} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/, message: '密码需8-20位，包含字母和数字' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item name="confirmPassword" dependencies={['password']} rules={[{ required: true, message: '请确认密码' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject(new Error('两次密码不一致')); } })]}>
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">注册</Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'code',
      label: '验证码注册',
      children: (
        <Form onFinish={onCodeRegister} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱" size="large" />
          </Form.Item>
          <Form.Item name="code" rules={[{ required: true, message: '请输入验证码' }]}>
            <Input
              prefix={<SafetyOutlined />}
              placeholder="验证码"
              size="large"
              suffix={
                <Button type="link" size="small" disabled={countdown > 0} onClick={() => { const emailInput = document.querySelector('input[id="email"]') as HTMLInputElement; handleSendCode(emailInput?.value || ''); }}>
                  {countdown > 0 ? `${countdown}s后重试` : '获取验证码'}
                </Button>
              }
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/, message: '密码需8-20位，包含字母和数字' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item name="confirmPassword" dependencies={['password']} rules={[{ required: true, message: '请确认密码' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject(new Error('两次密码不一致')); } })]}>
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">注册</Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', padding: '24px' }}>
      <Card style={{ width: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>注册</h2>
        <Tabs items={tabItems} centered />
        <div style={{ textAlign: 'center' }}>
          <a href="/login">已有账号？去登录</a>
        </div>
      </Card>
    </div>
  );
}
