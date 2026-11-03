'use client';

import Link from 'next/link';
import { ArrowLeft, House, SearchX, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

export default function RecoveryState({
  kind,
  retry,
  retrying = false,
}: {
  kind: 'not-found' | 'error';
  retry?: () => void;
  retrying?: boolean;
}) {
  const missing = kind === 'not-found';
  return (
    <Empty className="mx-auto min-h-[55dvh] max-w-xl px-6 pb-32 pt-16 md:pb-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">{missing ? <SearchX /> : <TriangleAlert />}</EmptyMedia>
        <EmptyTitle>
          <h1>{missing ? '페이지를 찾을 수 없습니다' : '자료를 불러오지 못했습니다'}</h1>
        </EmptyTitle>
        <EmptyDescription>
          {missing
            ? '주소를 확인하거나 피드에서 다른 법안을 찾아보세요.'
            : '연결 상태를 확인한 뒤 다시 시도해 주세요. 잠시 후에도 계속되면 피드로 이동할 수 있습니다.'}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap justify-center gap-3">
          {retry && (
            <Button onClick={retry} disabled={retrying}>
              {retrying ? '다시 불러오는 중…' : '다시 시도'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else window.location.assign('/');
            }}>
            <ArrowLeft data-icon="inline-start" />
            이전 화면
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <House data-icon="inline-start" />
              피드로 이동
            </Link>
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  );
}
