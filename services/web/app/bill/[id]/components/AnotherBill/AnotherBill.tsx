import Image from 'next/image';
import Link from 'next/link';
import { billHeadline } from '@/lib/billHeadline';
import { SimilarBill } from '@/types';
import PartyLogoReplacement from '@/components/common/PartyLogoReplacement/PartyLogoReplacement';
import { getPartyLogoSrc } from '@/utils';

export default function AnotherBill({
  billTitle,
  billId,
  billName,
  billProposers,
  billStage,
  billResult,
  assemblyNumber,
  proposeDate,
  party,
}: SimilarBill) {
  const proposers = billProposers
    ?.replace(/([가-힣])의원/g, '$1 의원')
    .replace(/의원\s*등\s*(\d+)\s*인/g, '의원 등 $1인');
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <Link
        href={`/bill/${billId}`}
        className="flex min-w-0 flex-1 flex-col gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        <p className="text-sm font-semibold lg:text-base">{billHeadline(billName, billTitle)}</p>
        <p className="text-sm text-muted-foreground">
          {[assemblyNumber ? `${assemblyNumber}대` : null, proposeDate, billResult || billStage]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {proposers && <p className="text-xs text-muted-foreground">{proposers}</p>}
      </Link>
      <div className="flex shrink-0 flex-col gap-1">
        {party.map(({ party_id, party_name, party_image_url }) => {
          const light = getPartyLogoSrc(party_image_url, false);
          const dark = getPartyLogoSrc(party_image_url, true);
          return (
            <Link
              key={party_id}
              href={`/party/${party_id}`}
              aria-label={`${party_name} 프로필`}
              className="flex size-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2">
              {light && dark ? (
                <>
                  <Image src={light} width={40} height={24} alt="" className="object-contain dark:hidden" />
                  <Image src={dark} width={40} height={24} alt="" className="hidden object-contain dark:block" />
                </>
              ) : (
                <PartyLogoReplacement partyName={party_name} circle />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
