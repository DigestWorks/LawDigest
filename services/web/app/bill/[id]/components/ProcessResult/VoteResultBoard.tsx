import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { getPartyLogoSrc } from '@/utils';
import { sortPartiesIndependentLast } from '@/lib/partyOrder';

interface VoteResultBoardProps {
  party_vote_list: {
    party_info: {
      party_id: number;
      party_name: string;
      party_image_url: string;
    };
    party_approval_count: number;
  }[];
}

export default function VoteResultBoard({ party_vote_list }: VoteResultBoardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(max(8.5rem,calc(50%-0.375rem)),1fr))] gap-x-3 gap-y-3">
      {sortPartiesIndependentLast(
        party_vote_list,
        (row) => row.party_info.party_name,
        (row) => row.party_approval_count,
      ).map(({ party_info: { party_id, party_name, party_image_url }, party_approval_count }) => (
        <div key={party_id} className="flex min-w-0 items-center gap-1.5">
          <Link
            href={`/party/${party_id}`}
            className={`flex items-center justify-center w-7 h-7 overflow-hidden rounded-full shadow-lg shrink-0 border-1.5 ${party_name}`}>
            {party_name === '무소속' ? (
              <div className="text-xs font-medium text-black">무</div>
            ) : (
              <Image
                src={getPartyLogoSrc(party_image_url, isDark) as string}
                width={20}
                height={20}
                alt={`${party_name} 로고 이미지`}
              />
            )}
          </Link>
          <Link href={`/party/${party_id}`} className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-semibold text-gray-2 dark:text-gray-1">{party_name}</p>
          </Link>
          <p className="shrink-0 whitespace-nowrap text-right text-xs font-medium tabular-nums">
            {party_approval_count}
            <span className="font-light">표</span>
          </p>
        </div>
      ))}
    </div>
  );
}
