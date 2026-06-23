'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Space, message, Tooltip } from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  MenuOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  LeftOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  setCurrentChapter,
  setAutoReading,
  setShowSettings,
  setShowChapterList,
} from '@/store/slices/readerSlice';
import { getChapterDetail, getChapterList } from '@/services/novel';
import { getReadingProgress, updateReadingProgress } from '@/services/reader';
import { ChapterDetail, ChapterListItem } from '@/types';
import SettingsPanel from './SettingsPanel';
import ChapterListPanel from './ChapterListPanel';

interface ReaderProps {
  novelId: number;
  chapterId: number;
}

export default function Reader({ novelId, chapterId }: ReaderProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { settings, autoReading, showSettings, showChapterList } = useAppSelector((state) => state.reader);
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [flipAngle, setFlipAngle] = useState(0);
  const [hasDragged, setHasDragged] = useState(false); // 标记是否发生了拖动
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false); // 标记是否已恢复过进度
  const contentRef = useRef<HTMLDivElement>(null);
  const autoReadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 获取章节内容
  const fetchChapter = useCallback(async (cId: number) => {
    setLoading(true);
    try {
      const res: any = await getChapterDetail(novelId, cId);
      setChapter(res.data);
      dispatch(setCurrentChapter(res.data));
      // 滚动到顶部
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    } catch (error: any) {
      message.error(error.message || '获取章节内容失败');
    } finally {
      setLoading(false);
    }
  }, [novelId, dispatch]);

  // 获取章节目录
  const fetchChapters = useCallback(async () => {
    setChaptersLoading(true);
    try {
      const res: any = await getChapterList(novelId);
      setChapters(res.data || []);
    } catch (error: any) {
      message.error(error.message || '获取目录失败');
    } finally {
      setChaptersLoading(false);
    }
  }, [novelId]);

  // 获取阅读进度（仅在首次进入时恢复）
  const fetchProgress = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || hasRestoredProgress) return;

    try {
      const res: any = await getReadingProgress(novelId);
      if (res.data) {
        setHasRestoredProgress(true);
        // 如果有进度，且进度记录的章节与当前不同，则跳转到进度章节
        if (res.data.chapterId && res.data.chapterId !== chapterId) {
          router.push(`/reader/${novelId}/${res.data.chapterId}`);
          return;
        }
        // 恢复滚动位置
        if (contentRef.current && res.data.scrollPosition > 0) {
          const totalHeight = contentRef.current.scrollHeight - contentRef.current.clientHeight;
          if (totalHeight > 0) {
            contentRef.current.scrollTop = totalHeight * res.data.scrollPosition;
          }
        }
      } else {
        setHasRestoredProgress(true);
      }
    } catch (error) {
      // 忽略进度获取错误
      setHasRestoredProgress(true);
    }
  }, [novelId, chapterId, router, hasRestoredProgress]);

  useEffect(() => {
    fetchChapter(chapterId);
    fetchChapters();
    fetchProgress();
  }, [chapterId, fetchChapter, fetchChapters, fetchProgress]);

  // 自动阅读
  useEffect(() => {
    if (autoReading && settings.flipMode === 'scroll') {
      autoReadTimerRef.current = setInterval(() => {
        if (contentRef.current) {
          contentRef.current.scrollBy({ top: settings.autoReadSpeed, behavior: 'auto' });
          // 检查是否到底部
          const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
          if (scrollTop + clientHeight >= scrollHeight - 5) {
            // 自动切换下一章
            if (chapter?.nextChapterId) {
              router.push(`/reader/${novelId}/${chapter.nextChapterId}`);
            } else {
              dispatch(setAutoReading(false));
              message.info('已是最后一章');
            }
          }
        }
      }, 50);
    } else {
      if (autoReadTimerRef.current) {
        clearInterval(autoReadTimerRef.current);
        autoReadTimerRef.current = null;
      }
    }

    return () => {
      if (autoReadTimerRef.current) {
        clearInterval(autoReadTimerRef.current);
      }
    };
  }, [autoReading, settings.autoReadSpeed, settings.flipMode, chapter, novelId, router, dispatch]);

  // 定时保存进度
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    progressTimerRef.current = setInterval(() => {
      if (contentRef.current && chapter) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        const scrollPosition = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
        updateReadingProgress(novelId, chapter.id, Math.min(Math.max(scrollPosition, 0), 1)).catch(() => {});
      }
    }, 30000);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [novelId, chapter]);

  // 上一章/下一章
  const goToPrevChapter = () => {
    if (chapter?.prevChapterId) {
      router.push(`/reader/${novelId}/${chapter.prevChapterId}`);
    } else {
      message.info('已是第一章');
    }
  };

  const goToNextChapter = () => {
    if (chapter?.nextChapterId) {
      router.push(`/reader/${novelId}/${chapter.nextChapterId}`);
    } else {
      message.info('已是最后一章');
    }
  };

  // 触摸/鼠标事件处理（用于平移、覆盖、仿真翻页）
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const point = 'touches' in e ? e.touches[0] : e;
    setTouchStart({ x: point.clientX, y: point.clientY });
    setHasDragged(false);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStart) return;
    const point = 'touches' in e ? e.touches[0] : e;
    const deltaX = point.clientX - touchStart.x;

    // 标记发生了拖动
    if (Math.abs(deltaX) > 5) {
      setHasDragged(true);
    }

    if (settings.flipMode === 'slide' || settings.flipMode === 'cover') {
      setTranslateX(deltaX);
    } else if (settings.flipMode === 'realistic') {
      // 仿真翻页：计算角度
      const angle = Math.max(-180, Math.min(0, -deltaX / 2));
      setFlipAngle(angle);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStart) return;
    const point = 'changedTouches' in e ? e.changedTouches[0] : e;
    const deltaX = point.clientX - touchStart.x;
    const threshold = 50;

    if (settings.flipMode === 'slide' || settings.flipMode === 'cover') {
      if (deltaX > threshold) {
        goToPrevChapter();
      } else if (deltaX < -threshold) {
        goToNextChapter();
      }
      setTranslateX(0);
    } else if (settings.flipMode === 'realistic') {
      if (deltaX > threshold) {
        goToPrevChapter();
      } else if (deltaX < -threshold) {
        goToNextChapter();
      }
      setFlipAngle(0);
    }

    setTouchStart(null);
    // 延迟重置 hasDragged，避免 click 事件立即触发
    setTimeout(() => setHasDragged(false), 0);
  };

  // 点击中间区域切换菜单
  const handleContentClick = (e: React.MouseEvent) => {
    // 如果发生了拖动，不触发点击事件
    if (hasDragged) {
      return;
    }

    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const middleStart = rect.width * 0.4;
    const middleEnd = rect.width * 0.6;

    if (clickX > middleStart && clickX < middleEnd) {
      // 点击中间区域，切换设置面板
      dispatch(setShowSettings(!showSettings));
    } else if (clickX < middleStart) {
      // 点击左侧，上一章
      if (settings.flipMode !== 'scroll') goToPrevChapter();
    } else {
      // 点击右侧，下一章
      if (settings.flipMode !== 'scroll') goToNextChapter();
    }
  };

  // 渲染内容区域
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div>加载中...</div>
        </div>
      );
    }

    if (!chapter) {
      return <div style={{ textAlign: 'center', padding: '48px' }}>章节内容不存在</div>;
    }

    const contentStyle: React.CSSProperties = {
      background: settings.backgroundColor,
      color: settings.textColor,
      fontSize: `${settings.fontSize}px`,
      lineHeight: '1.8',
      padding: '24px',
      minHeight: '100%',
    };

    // 根据翻页模式渲染
    switch (settings.flipMode) {
      case 'scroll':
        return (
          <div ref={contentRef} style={{ ...contentStyle, overflowY: 'auto', height: 'calc(100vh - 120px)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>{chapter.title}</h2>
            <div style={{ whiteSpace: 'pre-wrap' }}>{chapter.content}</div>
          </div>
        );

      case 'slide':
        return (
          <div
            style={{
              ...contentStyle,
              transform: `translateX(${translateX}px)`,
              transition: touchStart ? 'none' : 'transform 0.3s ease',
              height: 'calc(100vh - 120px)',
              overflowY: 'auto',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={touchStart ? handleTouchMove : undefined}
            onMouseUp={handleTouchEnd}
            onMouseLeave={touchStart ? handleTouchEnd : undefined}
          >
            <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>{chapter.title}</h2>
            <div style={{ whiteSpace: 'pre-wrap' }}>{chapter.content}</div>
          </div>
        );

      case 'cover':
        return (
          <div
            style={{
              ...contentStyle,
              transform: `translateX(${translateX}px)`,
              zIndex: 10,
              transition: touchStart ? 'none' : 'transform 0.3s ease',
              height: 'calc(100vh - 120px)',
              overflowY: 'auto',
              boxShadow: translateX !== 0 ? '-2px 0 10px rgba(0,0,0,0.1)' : 'none',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={touchStart ? handleTouchMove : undefined}
            onMouseUp={handleTouchEnd}
            onMouseLeave={touchStart ? handleTouchEnd : undefined}
          >
            <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>{chapter.title}</h2>
            <div style={{ whiteSpace: 'pre-wrap' }}>{chapter.content}</div>
          </div>
        );

      case 'realistic':
        return (
          <div
            style={{
              ...contentStyle,
              perspective: '1200px',
              height: 'calc(100vh - 120px)',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                transform: `rotateY(${flipAngle}deg)`,
                transformOrigin: 'left center',
                transition: touchStart ? 'none' : 'transform 0.6s ease',
                minHeight: '100%',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseMove={touchStart ? handleTouchMove : undefined}
              onMouseUp={handleTouchEnd}
              onMouseLeave={touchStart ? handleTouchEnd : undefined}
            >
              <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>{chapter.title}</h2>
              <div style={{ whiteSpace: 'pre-wrap' }}>{chapter.content}</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: settings.backgroundColor }}>
      {/* 顶部栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: settings.darkMode ? '#1A1A1A' : '#fff',
          color: settings.textColor,
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push(`/novels/${novelId}`)}
          style={{ color: settings.textColor }}
        />
        <div style={{ flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chapter?.title || '加载中...'}
        </div>
        <Space>
          <Tooltip title="目录">
            <Button type="text" icon={<MenuOutlined />} onClick={() => dispatch(setShowChapterList(true))} style={{ color: settings.textColor }} />
          </Tooltip>
          <Tooltip title="设置">
            <Button type="text" icon={<SettingOutlined />} onClick={() => dispatch(setShowSettings(true))} style={{ color: settings.textColor }} />
          </Tooltip>
          {settings.flipMode === 'scroll' && (
            <Tooltip title={autoReading ? '暂停' : '自动阅读'}>
              <Button
                type="text"
                icon={autoReading ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={() => dispatch(setAutoReading(!autoReading))}
                style={{ color: settings.textColor }}
              />
            </Tooltip>
          )}
        </Space>
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }} onClick={handleContentClick}>
        {renderContent()}
      </div>

      {/* 底部栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: settings.darkMode ? '#1A1A1A' : '#fff',
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <Button
          icon={<LeftOutlined />}
          onClick={goToPrevChapter}
          disabled={!chapter?.prevChapterId}
          style={{ color: settings.textColor }}
        >
          上一章
        </Button>
        <Button
          icon={<ArrowRightOutlined />}
          onClick={goToNextChapter}
          disabled={!chapter?.nextChapterId}
          style={{ color: settings.textColor }}
        >
          下一章
        </Button>
      </div>

      {/* 设置面板 */}
      <SettingsPanel />

      {/* 目录面板 */}
      <ChapterListPanel
        chapters={chapters}
        currentChapterId={chapter?.id || null}
        loading={chaptersLoading}
        onSelectChapter={(cId) => router.push(`/reader/${novelId}/${cId}`)}
      />
    </div>
  );
}
