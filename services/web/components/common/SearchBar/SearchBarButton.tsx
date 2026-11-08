'use client';

import { Search } from 'lucide-react';
import useSearchEntry from '@/components/search/useSearchEntry';

/** 본문에 놓는 검색 입구. 누르면 헤더(데스크톱)나 하단 내비(모바일)의 검색창이 펼쳐진다. */
export default function SearchBarButton() {
  const { openEntry } = useSearchEntry();
  return (
    <div className="w-full max-w-[600px] px-5 mx-auto my-5">
      <button
        type="button"
        data-search-toggle
        onClick={openEntry}
        className="search-ring flex h-12 w-full rounded-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <span className="search-ring__inner flex w-full items-center gap-2.5 px-4 text-[15px] text-muted-foreground">
          <Search aria-hidden="true" className="size-[18px] shrink-0" />
          <span className="truncate">법안·의안번호·의원·정당 검색</span>
        </span>
      </button>
    </div>
  );
}
