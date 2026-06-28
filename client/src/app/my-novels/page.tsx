'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Row, Col, Card, Pagination, Spin, Empty, Tag, message } from 'antd';
import Link from 'next/link';
import { getMyNovels } from '@/services/novel';
import { useAppSelector } from '@/store/hooks';
import { Novel } from '@/types';

export default function MyNovelsPage() {
  const router = useRouter();
  const { isLoggedIn, hydrated } = useAppSelector((state) => state.user);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchNovels = async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const res: any = await getMyNovels(pageNum, 12);
      setNovels(res.data.list);
      setTotal(res.data.total);
      setPage(res.data.page);
    } catch (error: any) {
      message.error(error.message || '获取作品列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    fetchNovels(1);
  }, [hydrated, isLoggedIn]);

  const handlePageChange = (pageNum: number) => {
    fetchNovels(pageNum);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1>我的作品</h1>
      </div>

      <Spin spinning={loading}>
        {novels.length === 0 && !loading ? (
          <Empty description="暂无作品" />
        ) : (
          <Row gutter={[16, 16]}>
            {novels.map((novel) => (
              <Col xs={12} sm={8} md={6} lg={4} key={novel.id}>
                <Link href={`/novels/${novel.id}`}>
                  <Card
                    hoverable
                    cover={
                      novel.cover ? (
                        <img alt={novel.name} src={novel.cover} style={{ height: '200px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#999' }}>
                          暂无封面
                        </div>
                      )
                    }
                  >
                    <Card.Meta
                      title={novel.name}
                      description={
                        <div>
                          <div style={{ marginBottom: '4px' }}>
                            {novel.isPublic ? <Tag color="green">已公开</Tag> : <Tag color="default">私有</Tag>}
                          </div>
                          <div style={{ color: '#999', fontSize: '12px' }}>作者: {novel.author}</div>
                          <div style={{ color: '#999', fontSize: '12px' }}>章节: {novel.chapterCount}</div>
                        </div>
                      }
                    />
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {total > 12 && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Pagination current={page} total={total} pageSize={12} onChange={handlePageChange} showSizeChanger={false} />
        </div>
      )}
    </div>
  );
}
