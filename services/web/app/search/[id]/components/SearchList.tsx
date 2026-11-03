'use client';
import { useState } from 'react';
import { SearchCongressmanPartyProps } from '@/types';
import { Button } from '@/components/ui/button';
import SearchParty from './SearchParty';
import SearchCongressman from './SearchCongressman';

export default function SearchList({ searchResults }: { searchResults: SearchCongressmanPartyProps[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? searchResults : searchResults.slice(0, 6);
  return (
    <div className="flex flex-col gap-4 mx-5 my-6">
      <p className="text-sm text-muted-foreground">{searchResults.length.toLocaleString()}건</p>
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((item) =>
          item.search_type === 'PARTY' ? (
            <SearchParty key={`party-${item.party_id}`} {...item} />
          ) : (
            <SearchCongressman key={`person-${item.congressman_id}`} {...item} />
          ),
        )}
      </div>
      {searchResults.length > 6 && (
        <Button variant="outline" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? '의원·정당 결과 접기' : `의원·정당 ${searchResults.length.toLocaleString()}건 모두 보기`}
        </Button>
      )}
    </div>
  );
}
