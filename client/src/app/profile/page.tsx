'use client';

import { useState, useEffect } from 'react';
import { Card, Tabs, Form, Input, Button, Avatar, Upload, message, Descriptions } from 'antd';
import { UserOutlined, UploadOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { updateUserInfo } from '@/store/slices/userSlice';
import { getProfile, updateProfile, uploadAvatar, changePassword } from '@/services/user';
import { getAvatarUrl } from '@/utils/url';

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { userInfo, isLoggedIn, hydrated } = useAppSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'info');

  useEffect(() => {
    if (hydrated && !isLoggedIn) {
      router.push('/login');
    }
  }, [hydrated, isLoggedIn, router]);

  // 水合前返回 null，保证 SSR/CSR 首次渲染一致
  if (!hydrated || !isLoggedIn || !userInfo) {
    return null;
  }

  // 更新基本信息
  const onProfileUpdate = async (values: any) => {
    setLoading(true);
    try {
      await updateProfile(values.nickname, values.bio);
      dispatch(updateUserInfo({ nickname: values.nickname, bio: values.bio }));
      message.success('更新成功');
    } catch (error: any) {
      message.error(error.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 上传头像
  const onUploadAvatar = async (file: File) => {
    try {
      const res: any = await uploadAvatar(file);
      dispatch(updateUserInfo({ avatar: res.data.avatar }));
      message.success('头像上传成功');
    } catch (error: any) {
      message.error(error.message || '头像上传失败');
    }
    return false; // 阻止默认上传行为
  };

  // 修改密码
  const onPasswordChange = async (values: any) => {
    setLoading(true);
    try {
      await changePassword(values.oldPassword, values.newPassword, values.confirmPassword);
      message.success('密码修改成功，请重新登录');
      dispatch({ type: 'user/logout' });
      router.push('/login');
    } catch (error: any) {
      message.error(error.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Avatar size={100} src={getAvatarUrl(userInfo.avatar)} icon={<UserOutlined />} />
            <div style={{ marginTop: '16px' }}>
              <Upload
                beforeUpload={onUploadAvatar}
                showUploadList={false}
                accept="image/jpeg,image/png,image/webp"
              >
                <Button icon={<UploadOutlined />}>更换头像</Button>
              </Upload>
            </div>
          </div>
          <Form
            onFinish={onProfileUpdate}
            layout="vertical"
            initialValues={{ nickname: userInfo.nickname, bio: userInfo.bio }}
          >
            <Form.Item name="nickname" label="昵称" rules={[{ required: true, message: '请输入昵称' }, { min: 2, max: 20, message: '昵称2-20个字符' }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="bio" label="简介" rules={[{ max: 200, message: '简介最多200个字符' }]}>
              <Input.TextArea rows={4} size="large" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} size="large">保存</Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'password',
      label: '修改密码',
      children: (
        <Form onFinish={onPasswordChange} layout="vertical">
          <Form.Item name="oldPassword" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/, message: '密码需8-20位，包含字母和数字' }]}>
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>
          <Form.Item name="confirmPassword" dependencies={['newPassword']} rules={[{ required: true, message: '请确认密码' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('newPassword') === value) return Promise.resolve(); return Promise.reject(new Error('两次密码不一致')); } })]}>
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large">修改密码</Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'account',
      label: '账号信息',
      children: (
        <Descriptions column={1} bordered>
          <Descriptions.Item label="用户ID">{userInfo.id}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{userInfo.email}</Descriptions.Item>
          <Descriptions.Item label="昵称">{userInfo.nickname}</Descriptions.Item>
          <Descriptions.Item label="简介">{userInfo.bio || '未设置'}</Descriptions.Item>
          <Descriptions.Item label="注册时间">{new Date(userInfo.createdAt).toLocaleString()}</Descriptions.Item>
        </Descriptions>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
      <Card style={{ width: '600px' }}>
        <h2 style={{ marginBottom: '24px' }}>个人中心</h2>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
}
