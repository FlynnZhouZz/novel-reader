'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Spin, List, Button, Typography, Switch, Space, message, Empty } from 'antd';
import { ArrowLeftOutlined, ReadOutlined, HeartOutlined, HeartFilled } from '@ant-design/icons';
import Link from 'next/link';
import { getNovelDetail, getChapterList, addToBookshelf, removeFromBookshelf, checkBookshelf, updateNovelVisibility } from '@/services/novel';
import { useAppSelector } from '@/store/hooks';
import { Novel, ChapterListItem } from '@/types';

const { Title, Paragraph, Text } = Typography;

export default function NovelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.id);
  const { isLoggedIn, hydrated } = useAppSelector((state) => state.user);

  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inBookshelf, setInBookshelf] = useState(false);
  const [togglingShelf, setTogglingShelf] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!novelId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [novelRes, chaptersRes]: any[] = await Promise.all([
          getNovelDetail(novelId),
          getChapterList(novelId),
        ]);
        setNovel(novelRes.data);
        setChapters(chaptersRes.data || []);
        // 登录用户且非作者：检查书架收藏状态
        if (isLoggedIn && !novelRes.data.isOwner) {
          try {
            const shelfRes: any = await checkBookshelf(novelId);
            setInBookshelf(shelfRes.data?.inBookshelf ?? false);
          } catch {
            // 忽略书架查询失败
          }
        }
      } catch (error: any) {
        message.error(error.message || '获取小说信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [novelId, hydrated, isLoggedIn]);

  const handleToggleBookshelf = async () => {
    if (!novel) return;
    setTogglingShelf(true);
    try {
      if (inBookshelf) {
        await removeFromBookshelf(novel.id);
        setInBookshelf(false);
        message.success('已移出书架');
      } else {
        await addToBookshelf(novel.id);
        setInBookshelf(true);
        message.success('已加入书架');
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setTogglingShelf(false);
    }
  };

  const handleToggleVisibility = async (checked: boolean) => {
    if (!novel) return;
    setTogglingVisibility(true);
    try {
      await updateNovelVisibility(novel.id, checked);
      setNovel({ ...novel, isPublic: checked });
      message.success(checked ? '已设为公开' : '已设为私有');
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setTogglingVisibility(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!novel) {
    return <Empty description="小说不存在" />;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ marginBottom: '16px' }}>
        返回
      </Button>

      <Card>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ flexShrink: 0 }}>
            {novel.cover ? (
              <img
                src={novel.cover}
                alt={novel.name}
                style={{ width: '150px', height: '200px', objectFit: 'cover', borderRadius: '4px' }}
              />
            ) : (
              <div
                style={{
                  width: '150px',
                  height: '200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f0f0f0',
                  borderRadius: '4px',
                  color: '#999',
                }}
              >
                暂无封面
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <Title level={3}>{novel.name}</Title>
            <p><Text type="secondary">作者: </Text>{novel.author}</p>
            <p><Text type="secondary">章节数: </Text>{novel.chapterCount}</p>
            <p><Text type="secondary">创建时间: </Text>{new Date(novel.createdAt).toLocaleDateString()}</p>
            {novel.description && (
              <div>
                <Text type="secondary">简介:</Text>
                <Paragraph style={{ marginTop: '8px' }}>{novel.description}</Paragraph>
              </div>
            )}
            <Space wrap>
              <Button
                type="primary"
                icon={<ReadOutlined />}
                size="large"
                onClick={() => {
                  if (chapters.length > 0) {
                    router.push(`/reader/${novelId}/${chapters[0].id}`);
                  }
                }}
                disabled={chapters.length === 0}
              >
                开始阅读
              </Button>
              {isLoggedIn && !novel.isOwner && (
                <Button
                  size="large"
                  icon={inBookshelf ? <HeartFilled /> : <HeartOutlined />}
                  onClick={handleToggleBookshelf}
                  loading={togglingShelf}
                >
                  {inBookshelf ? '移出书架' : '加入书架'}
                </Button>
              )}
              {novel.isOwner && (
                <Space>
                  <Text type="secondary">公开:</Text>
                  <Switch
                    checked={novel.isPublic}
                    onChange={handleToggleVisibility}
                    loading={togglingVisibility}
                  />
                </Space>
              )}
            </Space>
          </div>
        </div>
      </Card>

      <Card title="目录" style={{ marginTop: '24px' }}>
        {chapters.length === 0 ? (
          <Empty description="暂无章节" />
        ) : (
          <List
            dataSource={chapters}
            renderItem={(chapter) => (
              <List.Item>
                <Link href={`/reader/${novelId}/${chapter.id}`} style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{chapter.title}</span>
                  <Text type="secondary">第{chapter.orderNum}章</Text>
                </Link>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
