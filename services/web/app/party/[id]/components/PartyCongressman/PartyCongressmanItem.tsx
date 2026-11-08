import Link from 'next/link';
import { PartyCongressmanProps } from '@/types';
import { Avatar } from '@heroui/avatar';

export default function PartyCongressmanItem({
  congressman_id,
  congressman_name,
  congressman_image_url,
}: PartyCongressmanProps) {
  return (
    <Link href={`/congressman/${congressman_id}`} className="flex flex-col items-center gap-2">
      <Avatar
        size="lg"
        showFallback
        name={congressman_name}
        getInitials={(name) => name.slice(0, 1)}
        className="border-2 dark:border-dark-l"
        src={congressman_image_url ? `${process.env.NEXT_PUBLIC_IMAGE_URL}${congressman_image_url}` : undefined}
      />
      <p className="font-medium">{congressman_name}</p>
    </Link>
  );
}
