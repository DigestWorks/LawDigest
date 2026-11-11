'use client';

import Link from 'next/link';
import { Avatar } from '@heroui/avatar';
import ThemedPartyLogo from '@/components/common/ThemedPartyLogo';
import type { AnswerFocus } from './answerAccent';

/** 법안 상세의 발의자 카드와 같은 모양으로 답의 주인공(의원 또는 정당)을 보여 준다. 테두리는 정당색이다. */
export default function ProposerCard({ focus, color }: { focus: AnswerFocus; color: string }) {
  const { representative: person, count } = focus;
  const logo = person.party_image_url ? (
    <ThemedPartyLogo
      imageUrl={person.party_image_url}
      width={160}
      height={48}
      alt={person.party ?? ''}
      className="h-6 w-auto max-w-[110px] object-contain"
    />
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {person.party}
    </span>
  );

  const member = focus.kind === 'member';
  const href = member ? `/congressman/${encodeURIComponent(person.congressman_id)}` : `/party/${person.party_id}`;
  return (
    <Link
      href={href}
      style={{ borderColor: color }}
      className="flex min-h-[72px] items-center justify-between gap-3 rounded-lg border-[1.5px] bg-background px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-dark-pb">
      <span className="flex min-w-0 items-center gap-3">
        {member && (
          <Avatar
            radius="full"
            showFallback
            name={person.name}
            getInitials={(name) => name.slice(0, 1)}
            src={person.image_url ? `${process.env.NEXT_PUBLIC_IMAGE_URL ?? ''}${person.image_url}` : undefined}
            className="shrink-0 border dark:border-dark-l"
          />
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold text-foreground">
            {member ? `${person.name} 의원` : person.party}
          </span>
          <span className="text-xs text-muted-foreground">
            {member ? `대표발의 법안 ${count}건` : `소속 의원 대표발의 법안 ${count}건`}
          </span>
        </span>
      </span>
      {(member || person.party_image_url) && <span className="shrink-0">{member && !person.party ? null : logo}</span>}
    </Link>
  );
}
