'use client';

import { useId } from 'react';
import { SearchCongressmanPartyProps } from '@/types';
import { Button } from '@/components/ui/button';
import SearchParty from './SearchParty';
import SearchCongressman from './SearchCongressman';

export default function SearchList({
  searchResults,
  kind,
  onShowCategory,
  expanded,
  onToggleExpanded,
}: {
  searchResults: SearchCongressmanPartyProps[];
  kind: '의원' | '정당';
  onShowCategory?: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const listId = useId();
  const limit = onShowCategory ? 3 : 6;
  const visible = expanded ? searchResults : searchResults.slice(0, limit);
  const count = `${searchResults.length.toLocaleString('ko-KR')}${kind === '의원' ? '명' : '곳'}`;
  return (
    <div className="flex flex-col gap-4 mx-5 my-4">
      <ul id={listId} className="grid gap-2 md:grid-cols-2">
        {visible.map((item) =>
          item.search_type === 'PARTY' ? (
            <li key={`party-${item.party_id}`}>
              <SearchParty {...item} />
            </li>
          ) : (
            <li key={`person-${item.congressman_id}`}>
              <SearchCongressman {...item} />
            </li>
          ),
        )}
      </ul>
      {searchResults.length > limit &&
        (onShowCategory ? (
          <Button variant="outline" onClick={onShowCategory}>
            {kind} 결과 {count} 보기
          </Button>
        ) : (
          <Button variant="outline" onClick={onToggleExpanded} aria-expanded={expanded} aria-controls={listId}>
            {expanded ? `${kind} 결과 접기` : `${kind} ${count} 모두 보기`}
          </Button>
        ))}
    </div>
  );
}
