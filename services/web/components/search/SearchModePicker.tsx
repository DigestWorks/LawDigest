'use client';

import { useAtom } from 'jotai';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { searchModeState } from '@/store/SearchEntryState';

export default function SearchModePicker({ available, pending }: { available: boolean; pending: boolean }) {
  const [mode, setMode] = useAtom(searchModeState);
  return (
    <ToggleGroup
      type="single"
      variant="pill"
      size="sm"
      value={mode}
      disabled={pending}
      aria-label="검색 방식"
      onValueChange={(value) => {
        if (value === 'keyword' || value === 'search' || value === 'chat') setMode(value);
      }}>
      <ToggleGroupItem value="keyword">키워드</ToggleGroupItem>
      <ToggleGroupItem value="search" disabled={!available}>
        의미 검색
      </ToggleGroupItem>
      <ToggleGroupItem value="chat" disabled={!available}>
        AI 채팅
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function searchInputLabel(mode: 'keyword' | 'search' | 'chat') {
  if (mode === 'keyword') return '법안·의안번호·의원·정당 검색어';
  return mode === 'search' ? '찾고 싶은 법안의 주제' : '법안에 관한 질문';
}

export function searchActionLabel(mode: 'keyword' | 'search' | 'chat', pending: boolean) {
  if (pending) return '중지';
  return mode === 'chat' ? '질문 보내기' : '검색';
}
