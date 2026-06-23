'use client';

import { useParams } from 'next/navigation';
import Reader from '@/components/reader/Reader';

export default function ReaderPage() {
  const params = useParams();
  const novelId = Number(params.novelId);
  const chapterId = Number(params.chapterId);

  if (!novelId || !chapterId) {
    return <div style={{ textAlign: 'center', padding: '48px' }}>参数无效</div>;
  }

  return <Reader novelId={novelId} chapterId={chapterId} />;
}
