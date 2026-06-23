'use client';

import { Drawer, List, Spin, Empty, Typography } from 'antd';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setShowChapterList } from '@/store/slices/readerSlice';
import { ChapterListItem } from '@/types';

const { Text } = Typography;

interface ChapterListPanelProps {
  chapters: ChapterListItem[];
  currentChapterId: number | null;
  loading: boolean;
  onSelectChapter: (chapterId: number) => void;
}

export default function ChapterListPanel({
  chapters,
  currentChapterId,
  loading,
  onSelectChapter,
}: ChapterListPanelProps) {
  const dispatch = useAppDispatch();
  const { showChapterList } = useAppSelector((state) => state.reader);

  const handleClose = () => {
    dispatch(setShowChapterList(false));
  };

  const handleSelect = (chapterId: number) => {
    onSelectChapter(chapterId);
    handleClose();
  };

  return (
    <Drawer
      title="目录"
      placement="left"
      onClose={handleClose}
      open={showChapterList}
      width={300}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin />
        </div>
      ) : chapters.length === 0 ? (
        <Empty description="暂无章节" />
      ) : (
        <List
          dataSource={chapters}
          renderItem={(chapter) => (
            <List.Item
              onClick={() => handleSelect(chapter.id)}
              style={{
                cursor: 'pointer',
                padding: '12px 16px',
                background: currentChapterId === chapter.id ? '#e6f7ff' : 'transparent',
                borderLeft: currentChapterId === chapter.id ? '3px solid #1890ff' : '3px solid transparent',
              }}
            >
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: currentChapterId === chapter.id ? 'bold' : 'normal' }}>
                  {chapter.title}
                </span>
                <Text type="secondary">第{chapter.orderNum}章</Text>
              </div>
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}
