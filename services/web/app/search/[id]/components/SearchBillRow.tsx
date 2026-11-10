import Link from 'next/link';
import { CSSProperties } from 'react';
import { BillListItem } from '@/types';
import { billHeadline } from '@/lib/billHeadline';
import { billResultLabel } from '@/lib/billStage';
import { proposalDateLabel } from '@/lib/dataFreshness';
import { getPartyColor } from '@/constants/party';
import { getChairmanProposerInfo, getGovernmentAdministrationName, isGovernmentBill } from '@/utils';
import SearchHighlight from './SearchHighlight';

function proposerLabel({
  bill_info_dto: { bill_id, proposer_kind, proposers, committee, propose_date },
  representative_proposer_dto_list: representatives,
  public_proposer_count: publicCount = 0,
}: BillListItem) {
  if (
    isGovernmentBill({
      proposerKind: proposer_kind,
      billId: bill_id,
      representativeProposerCount: representatives.length,
      publicProposerCount: publicCount,
    })
  ) {
    return { name: getGovernmentAdministrationName(propose_date), party: null };
  }
  const chairman = getChairmanProposerInfo({ proposerKind: proposer_kind, proposerText: proposers, committee });
  if (chairman) return { name: chairman.proposerTitle, party: null };
  if (representatives.length === 0) return proposers?.trim() ? { name: proposers.trim(), party: null } : null;
  const [first] = representatives;
  const others = representatives.length > 1 ? ` 외 ${representatives.length - 1}인 공동대표` : '';
  return {
    name: `${first.representative_proposer_name} 의원${others}`,
    party: representatives.length === 1 ? first.party_name : null,
  };
}

/** 검색 결과의 법안 한 줄: 쉬운 제목, 정식 법안명, 처리 단계, 발의일, 대표발의자 */
export default function SearchBillRow({
  bill,
  keyword,
  style,
  className = '',
}: {
  bill: BillListItem;
  keyword: string;
  style?: CSSProperties;
  className?: string;
}) {
  const { bill_id, bill_name, title, gpt_summary, bill_stage, bill_result, propose_date, assembly_number } =
    bill.bill_info_dto;
  const official = billHeadline(bill_name);
  const headline = billHeadline(bill_name, gpt_summary?.trim() ? title : null);
  const archived = assembly_number !== undefined && assembly_number < 22;
  const status = billResultLabel(bill_result) || bill_stage;
  const proposer = proposerLabel(bill);

  return (
    <li style={style} className={className}>
      <Link
        href={`/bill/${bill_id}`}
        className="group flex flex-col gap-1.5 px-5 py-4 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:rounded-xl md:px-4">
        <h3 className="text-[17px] font-semibold leading-snug text-foreground [word-break:keep-all]">
          <SearchHighlight text={headline} keyword={keyword} />
        </h3>
        {official !== headline && (
          <p className="text-sm text-muted-foreground [word-break:keep-all]">
            <SearchHighlight text={official} keyword={keyword} />
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {status && (
            <span className="rounded-lg border border-border px-2 py-[3px] font-semibold text-foreground/80">
              {status}
            </span>
          )}
          {archived && <span className="font-semibold">제{assembly_number}대</span>}
          <span>{proposalDateLabel(propose_date)}</span>
          {proposer && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              {proposer.party && (
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getPartyColor(proposer.party) }}
                />
              )}
              <span className="truncate">
                {proposer.name}
                {proposer.party && <span className="sr-only">, {proposer.party}</span>}
              </span>
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
