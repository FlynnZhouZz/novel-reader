'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Reader from '@/components/reader/Reader';
import { useAppSelector } from '@/store/hooks';

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const novelId = Number(params.novelId);
  const chapterId = Number(params.chapterId);
  const { isLoggedIn, hydrated } = useAppSelector((state) => state.user);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [hydrated, isLoggedIn]);

  if (!hydrated) return null;
  if (!isLoggedIn) return null;

  if (!novelId || !chapterId) {
    return <div style={{ textAlign: 'center', padding: '48px' }}>参数无效</div>;
  }

  return <Reader novelId={novelId} chapterId={chapterId} />;
}
