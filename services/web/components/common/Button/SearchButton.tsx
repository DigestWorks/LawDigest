'use client';
import { useSetAtom } from 'jotai';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { searchModalState } from '@/store';

export default function SearchButton() {
  const open = useSetAtom(searchModalState);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="검색 열기"
      onClick={(event) => open({ show: true, trigger: event.currentTarget })}>
      <Search />
    </Button>
  );
}
