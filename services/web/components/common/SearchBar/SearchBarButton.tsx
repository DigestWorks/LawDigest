'use client';
import { useSetAtom } from 'jotai';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { searchModalState } from '@/store';

export default function SearchBarButton({ keyword }: { keyword?: string }) {
  const open = useSetAtom(searchModalState);
  return (
    <div className="w-full max-w-[600px] px-5 mx-auto my-5">
      <Button
        variant="outline"
        className="w-full justify-start"
        aria-label="검색어 입력 열기"
        onClick={(event) => open({ show: true, trigger: event.currentTarget, keyword })}>
        <Search data-icon="inline-start" />
        <span className="truncate">{keyword || '법안, 의원, 정당명으로 검색'}</span>
      </Button>
    </div>
  );
}
