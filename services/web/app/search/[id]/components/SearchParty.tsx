import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { PartySearchProps } from '@/types';
import PartyLogoReplacement from '@/components/common/PartyLogoReplacement/PartyLogoReplacement';
import getPartyLogoSrc from '@/utils/getPartyLogoSrc';

export default function SearchParty({ party_id, party_name, party_image_url }: PartySearchProps) {
  const light = getPartyLogoSrc(party_image_url, false);
  const dark = getPartyLogoSrc(party_image_url, true);
  return (
    <Link
      href={`/party/${party_id}`}
      className="flex min-w-0 items-center gap-3 rounded-lg p-3 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
      {light && dark ? (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border p-1">
          <Image src={light} width={40} height={24} alt={`${party_name} 로고`} className="object-contain dark:hidden" />
          <Image
            src={dark}
            width={40}
            height={24}
            alt={`${party_name} 로고`}
            className="hidden object-contain dark:block"
          />
        </div>
      ) : (
        <PartyLogoReplacement partyName={party_name} circle />
      )}
      <p className="min-w-0 flex-1 truncate font-semibold">{party_name}</p>
      <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
    </Link>
  );
}
