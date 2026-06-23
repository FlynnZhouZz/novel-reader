'use client';

import { useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { MailOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { resetPassword, sendCode } from '@/services/user';
import { useAppDispatch } from '@/store/hooks';
import { setLoginInfo } from '@/store/slices/userSlice';

export default function ResetPasswordPage() {
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
      await sendCode(email, 'reset');
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

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await resetPassword(values.email, values.code, values.newPassword, values.confirmPassword);
      // 重置密码后自动登录
      if (res.data.token) {
        // 需要获取用户信息，这里简化处理，直接跳转登录页
        message.success('密码重置成功，请重新登录');
        router.push('/login');
      }
    } catch (error: any) {
      message.error(error.message || '重置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', padding: '24px' }}>
      <Card style={{ width: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>重置密码</h2>
        <Form onFinish={onFinish} layout="vertical">
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
          <Form.Item name="newPassword" rules={[{ required: true, message: '请输入新密码' }, { pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/, message: '密码需8-20位，包含字母和数字' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="新密码" size="large" />
          </Form.Item>
          <Form.Item name="confirmPassword" dependencies={['newPassword']} rules={[{ required: true, message: '请确认密码' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('newPassword') === value) return Promise.resolve(); return Promise.reject(new Error('两次密码不一致')); } })]}>
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">重置密码</Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <a href="/login">返回登录</a>
        </div>
      </Card>
    </div>
  );
}
