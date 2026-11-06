import Link from 'next/link';
import { billHeadline } from '@/lib/billHeadline';
import { billResultLabel } from '@/lib/billStage';
import { koreanDateLabel } from '@/lib/dataFreshness';
import { formatProposerText } from '@/lib/proposerText';
import { SimilarBill } from '@/types';
import PartyLogoReplacement from '@/components/common/PartyLogoReplacement/PartyLogoReplacement';
import ThemedPartyLogo from '@/components/common/ThemedPartyLogo';

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
  previous,
}: SimilarBill & { previous?: boolean }) {
  const status = billResultLabel(billResult) || (previous && billStage ? `마지막 단계 ${billStage}` : billStage);
  const proposers = formatProposerText(billProposers);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <Link
        href={`/bill/${billId}`}
        className="flex min-w-0 flex-1 flex-col gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        <p className="text-sm font-semibold lg:text-base">{billHeadline(billName, billTitle)}</p>
        <p className="text-sm text-muted-foreground">
          {[assemblyNumber ? `${assemblyNumber}대` : null, koreanDateLabel(proposeDate), status]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {proposers && <p className="text-xs text-muted-foreground">{proposers}</p>}
      </Link>
      <div className="flex shrink-0 flex-col gap-1">
        {party.map(({ party_id, party_name, party_image_url }) => (
          <Link
            key={party_id}
            href={`/party/${party_id}`}
            aria-label={`${party_name} 프로필`}
            className="flex size-11 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2">
            {party_image_url ? (
              <ThemedPartyLogo imageUrl={party_image_url} width={40} height={24} alt="" className="object-contain" />
            ) : (
              <PartyLogoReplacement partyName={party_name} circle />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
