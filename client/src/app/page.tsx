'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Row, Col, Card, Input, Pagination, Spin, Empty, message } from 'antd';
import Link from 'next/link';
import { getNovelList } from '@/services/novel';
import { useAppSelector } from '@/store/hooks';
import { Novel } from '@/types';

const { Search } = Input;

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, hydrated } = useAppSelector((state) => state.user);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');

  const fetchNovels = async (pageNum: number = 1, searchKeyword?: string) => {
    setLoading(true);
    try {
      const res: any = await getNovelList(pageNum, 12, searchKeyword);
      setNovels(res.data.list);
      setTotal(res.data.total);
      setPage(res.data.page);
    } catch (error: any) {
      message.error(error.message || '获取小说列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 等待登录态水合完成后判断
    if (!hydrated) return;
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    fetchNovels(1);
  }, [hydrated, isLoggedIn]);

  const handleSearch = (value: string) => {
    setKeyword(value);
    fetchNovels(1, value);
  };

  const handlePageChange = (pageNum: number) => {
    fetchNovels(pageNum, keyword);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '16px' }}>小说阅读器</h1>
        <Search
          placeholder="搜索小说名称或作者"
          allowClear
          enterButton="搜索"
          size="large"
          style={{ maxWidth: '600px' }}
          onSearch={handleSearch}
        />
      </div>

      <Spin spinning={loading}>
        {novels.length === 0 && !loading ? (
          <Empty description="暂无小说" />
        ) : (
          <Row gutter={[16, 16]}>
            {novels.map((novel) => (
              <Col xs={12} sm={8} md={6} lg={4} key={novel.id}>
                <Link href={`/novels/${novel.id}`}>
                  <Card
                    hoverable
                    cover={
                      novel.cover ? (
                        <img
                          alt={novel.name}
                          src={novel.cover}
                          style={{ height: '200px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            height: '200px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f0f0f0',
                            color: '#999',
                          }}
                        >
                          暂无封面
                        </div>
                      )
                    }
                  >
                    <Card.Meta
                      title={novel.name}
                      description={
                        <div>
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
          <Pagination
            current={page}
            total={total}
            pageSize={12}
            onChange={handlePageChange}
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  );
}
