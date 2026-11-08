'use client';

import { useId, useState } from 'react';
import { useGetPartyCongressman } from '@/app/party/[id]/apis';
import { Spinner, Divider } from '@heroui/react';
import { Button } from '@/components/ui/button';
import { IconArrowDown, IconArrowUp } from '@/public/svgs';
import PartyCongressmanItem from './PartyCongressmanItem';

export default function PartyCongressmanList({ id }: { id: number }) {
  const { data, isFetching } = useGetPartyCongressman(id);
  const [isOpened, setIsOpened] = useState(false);

  const listId = useId();
  const members = data?.data.party_congressman ?? [];
  const visibleMembers = isOpened ? members : members.slice(0, 8);

  return (
    <section className="flex flex-col gap-5 mx-5 my-10">
      <div id={listId} className="grid w-full grid-cols-4 md:grid-cols-8 lg:grid-cols-4 justify-items-center gap-y-3">
        {visibleMembers.map((congressman, index) => (
          <PartyCongressmanItem key={`${congressman.congressman_id}:${index}`} {...congressman} />
        ))}
      </div>
      {isFetching && (
        <div className="flex justify-center w-full my-4">
          <Spinner color="default" />
        </div>
      )}
      {members.length > 8 && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isOpened ? '소속 의원 접기' : '소속 의원 더 보기'}
            aria-expanded={isOpened}
            aria-controls={listId}
            onClick={() => setIsOpened((opened) => !opened)}>
            {isOpened ? <IconArrowUp /> : <IconArrowDown />}
          </Button>
        </div>
      )}

      <Divider className="dark:bg-dark-l lg:hidden" />
    </section>
  );
}
