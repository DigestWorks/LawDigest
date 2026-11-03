import Link from 'next/link';
import { Avatar } from '@heroui/avatar';
import { ChevronRight } from 'lucide-react';
import { CongressmanSearchProps } from '@/types';
import getImageSrc from '@/utils/getImageSrc';

export default function SearchCongressman({
  congressman_id,
  congressman_image_url,
  congressman_name,
  party_name,
  current_member,
  assembly_number,
}: CongressmanSearchProps) {
  return (
    <Link
      href={`/congressman/${congressman_id}`}
      className="flex min-w-0 items-center gap-3 rounded-lg p-3 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      <Avatar src={getImageSrc(congressman_image_url)} name={congressman_name} alt={`${congressman_name} 의원`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-semibold">{congressman_name}</p>
        <p className="truncate text-sm text-muted-foreground">{party_name}</p>
        {current_member === false && (
          <p className="text-xs text-muted-foreground">{assembly_number ? `${assembly_number}대 · ` : ''}전직 의원</p>
        )}
      </div>
      <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
    </Link>
  );
}
