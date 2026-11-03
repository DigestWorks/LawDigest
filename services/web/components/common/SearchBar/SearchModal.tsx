'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import { Search, X } from 'lucide-react';
import { searchModalState } from '@/store';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buildSearchHref, readRecentSearches, saveRecentSearches } from '@/lib/search';
import SearchBar from './SearchBar';
import RagEntry from '@/components/qa/RagEntry';

export default function SearchModal() {
  const router = useRouter();
  const pathname = usePathname();
  const [modal, setModal] = useAtom(searchModalState);
  const [recent, setRecent] = useState<string[]>([]);
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (modal.show) {
      trigger.current = modal.trigger ?? null;
      setRecent(readRecentSearches());
    }
  }, [modal]);
  useEffect(() => {
    setModal({ show: false });
  }, [pathname, setModal]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, [contenteditable="true"]')) return;
      if (
        (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')
      ) {
        event.preventDefault();
        setModal({
          show: true,
          trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        });
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [setModal]);

  const updateRecent = (values: string[]) => {
    setRecent(values);
    saveRecentSearches(values);
  };
  const search = (keyword: string) => {
    updateRecent([keyword, ...recent.filter((value) => value !== keyword)].slice(0, 10));
    setModal({ show: false });
    router.push(buildSearchHref(keyword));
  };

  return (
    <Dialog open={modal.show} onOpenChange={(open) => setModal({ show: open })}>
      <DialogContent
        aria-modal="true"
        closeLabel="검색 닫기"
        onCloseAutoFocus={(event) => {
          if (trigger.current?.isConnected) {
            event.preventDefault();
            trigger.current.focus();
          }
        }}>
        <DialogHeader>
          <DialogTitle>검색</DialogTitle>
          <DialogDescription>법안명, 의원명, 정당명으로 찾아보세요.</DialogDescription>
        </DialogHeader>
        <SearchBar onSearch={search} initialValue={modal.keyword} />
        {modal.show && <RagEntry onNavigate={() => setModal({ show: false })} />}
        <section className="flex flex-col gap-3" aria-label="최근 검색어">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">최근 검색어</h2>
            {recent.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => updateRecent([])}>
                모두 지우기
              </Button>
            )}
          </div>
          {recent.length ? (
            <ul className="flex flex-col gap-1">
              {recent.map((keyword) => (
                <li key={keyword} className="flex items-center gap-2">
                  <Button variant="ghost" className="flex-1 justify-start min-w-0" onClick={() => search(keyword)}>
                    <Search data-icon="inline-start" />
                    <span className="truncate">{keyword}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${keyword} 검색 기록 삭제`}
                    onClick={() => updateRecent(recent.filter((value) => value !== keyword))}>
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">최근 검색어가 없습니다.</p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
