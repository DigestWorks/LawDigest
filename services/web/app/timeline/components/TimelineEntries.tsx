'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { Card, CardBody, CardHeader, Chip, Button, Pagination, useDisclosure } from '@heroui/react';
import ProcessResult from '@/app/bill/[id]/components/ProcessResult/ProcessResult';
import ThemedPartyLogo from '@/components/common/ThemedPartyLogo';
import { billHeadline } from '@/lib/billHeadline';
import { formatProposerText } from '@/lib/proposerText';
import { IconEnter, IconNext, IconPrev } from '@/public/svgs';
import type { TimelineBill, TimelineCommittee, TimelinePlenary } from '@/types';
import TimelineModal from './TimelineModal';

const COMMITTEE_PREVIEW_SIZE = 5;

function usePagedItems<T>(items: T[]) {
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setItemsPerPage(3);
      else if (window.innerWidth >= 768) setItemsPerPage(2);
      else setItemsPerPage(1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const total = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const current = Math.min(page, total - 1);
  return {
    current,
    total,
    setPage,
    currentItems: items.slice(current * itemsPerPage, (current + 1) * itemsPerPage),
  };
}

function billStatus(bill: TimelineBill) {
  return bill.bill_result?.includes('가결 ') ? null : bill.bill_result || bill.bill_stage;
}

function PartyMark({ bill, className = '' }: { bill: TimelineBill; className?: string }) {
  const party = bill.party_info?.[0];
  const base = `flex items-center justify-center w-7 h-7 rounded-full shadow-lg shrink-0 border-1.5 ${className}`;
  if (!party) {
    return (
      <span aria-hidden="true" className={`${base} border-border text-muted-foreground`}>
        <Landmark className="size-3.5" />
      </span>
    );
  }
  return (
    <Link
      href={`/party/${party.party_id}`}
      aria-label={`${party.party_name} 프로필`}
      className={`${base} ${party.party_name}`}>
      {party.party_name === '무소속' || !party.party_image_url ? (
        <span className="text-xs font-bold text-black dark:text-white">{party.party_name.slice(0, 1)}</span>
      ) : (
        <ThemedPartyLogo imageUrl={party.party_image_url} width={22} height={22} alt="" />
      )}
    </Link>
  );
}

function BillRow({ bill }: { bill: TimelineBill }) {
  return (
    <div className="flex gap-[18px] items-center">
      <PartyMark bill={bill} />
      <div className="flex min-w-0 flex-col gap-1">
        <Link href={`/bill/${encodeURIComponent(bill.bill_id)}`}>
          <p className="text-xs font-bold">{billHeadline(bill.bill_name, bill.bill_title)}</p>
        </Link>
        <p className="text-xs font-semibold text-gray-2 dark:text-gray-3">{formatProposerText(bill.bill_proposers)}</p>
      </div>
    </div>
  );
}

function BillCard({ bill, vote }: { bill: TimelineBill; vote?: TimelinePlenary }) {
  const status = billStatus(bill);
  return (
    <Card className="z-10 overflow-visible md:shadow-none md:border-1">
      <CardBody className="py-3 overflow-visible">
        <PartyMark bill={bill} className="absolute -left-[39px] bg-white dark:bg-dark-b md:hidden" />
        <div className="flex flex-col w-full gap-2 md:h-full md:justify-between">
          <Link href={`/bill/${encodeURIComponent(bill.bill_id)}`}>
            <p className="text-sm font-bold">{billHeadline(bill.bill_name, bill.bill_title)}</p>
          </Link>
          <div className="flex flex-wrap items-center gap-[6px]">
            {status && (
              <Chip
                variant="bordered"
                className="text-xs border-gray-1 dark:border-gray-2 text-gray-2 dark:text-gray-3 border-[1px]"
                size="sm"
                radius="sm">
                {status}
              </Chip>
            )}
            <p className="text-xs font-semibold text-gray-2 dark:text-gray-3">
              {formatProposerText(bill.bill_proposers)}
            </p>
          </div>
          {vote && typeof vote.approval_vote_count === 'number' && typeof vote.total_vote_count === 'number' && (
            <p className="sr-only">
              찬성 {vote.approval_vote_count} / 재석 {vote.total_vote_count}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function CardDeck() {
  return (
    <>
      <Card className="w-[calc(100%-20px)] mx-auto -top-[14px] z-[5] md:hidden">
        <CardBody />
      </Card>
      <Card className="w-[calc(100%-40px)] mx-auto -top-[28px] md:hidden">
        <CardBody />
      </Card>
    </>
  );
}

function Pager({
  title,
  current,
  total,
  setPage,
}: {
  title: string;
  current: number;
  total: number;
  setPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Button
        isIconOnly
        size="sm"
        aria-label={`${title} 이전 목록`}
        className="p-0 bg-transparent"
        onPress={() => setPage(current > 0 ? current - 1 : total - 1)}>
        <IconPrev />
      </Button>
      <Pagination
        aria-label={`${title} 목록 위치`}
        total={total}
        page={current + 1}
        onChange={(page) => setPage(page - 1)}
        classNames={{
          item: 'bg-gray-1 dark:bg-gray-3 text-transparent border-none shadow-none w-[6px] h-[6px]',
          cursor: 'bg-gray-3 dark:bg-gray-2 text-transparent w-[6px] h-[6px]',
        }}
      />
      <Button
        isIconOnly
        size="sm"
        aria-label={`${title} 다음 목록`}
        className="p-0 bg-transparent"
        onPress={() => setPage(current < total - 1 ? current + 1 : 0)}>
        <IconNext />
      </Button>
    </div>
  );
}

function SectionHeader({
  title,
  countLabel,
  count,
  children,
}: {
  title: string;
  countLabel: string;
  count: number;
  children: React.ReactNode;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <div className="relative">
      <div className="bg-gray-3 dark:bg-gray-4 w-[10px] h-[10px] rounded-full border border-black absolute -left-[30px] top-4" />
      <div className="flex items-center justify-between md:w-[280px]">
        <h3 className="text-[26px] font-extralight">{title}</h3>
        <div className="flex items-center">
          <p className="text-sm font-medium text-gray-2 dark:text-gray-3">
            {countLabel} <span className="text-black dark:text-white">{count.toLocaleString('ko-KR')}개</span>
          </p>
          <Button
            isIconOnly
            size="sm"
            aria-label={`${title} 전체 보기`}
            className="w-6 h-6 min-w-6 p-0 bg-transparent"
            onPress={onOpen}>
            <IconEnter />
          </Button>
          <TimelineModal isOpen={isOpen} onClose={onClose} title={title}>
            {children}
          </TimelineModal>
        </div>
      </div>
    </div>
  );
}

export function BillSection({
  title,
  countLabel,
  bills,
}: {
  title: string;
  countLabel: string;
  bills: TimelineBill[];
}) {
  const { current, total, setPage, currentItems } = usePagedItems(bills);
  if (!bills.length) return null;
  return (
    <section className="flex flex-col gap-5">
      <SectionHeader title={title} countLabel={countLabel} count={bills.length}>
        <div className="flex flex-col gap-3">
          {bills.map((bill) => (
            <BillRow key={bill.bill_id} bill={bill} />
          ))}
        </div>
      </SectionHeader>
      <div>
        <div className="grid grid-cols-1 gap-5 md:gap-2 md:grid-cols-2 lg:grid-cols-3">
          {currentItems.map((bill) => (
            <BillCard key={bill.bill_id} bill={bill} />
          ))}
        </div>
        <CardDeck />
      </div>
      <Pager title={title} current={current} total={total} setPage={setPage} />
    </section>
  );
}

function CommitteeCard({ committee }: { committee: TimelineCommittee }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const bills = committee.bill_outline_dto_list;
  return (
    <Card className="z-10 px-2 md:shadow-none md:border-1">
      <CardHeader>
        <h4 className="text-[22px] font-bold">{committee.committee_name}</h4>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col w-full gap-5">
          <div className="flex items-center">
            <p className="text-xs font-medium text-gray-2 dark:text-gray-3">
              심사한 법안 <span className="text-black dark:text-white">{bills.length.toLocaleString('ko-KR')}개</span>
            </p>
            <Button
              isIconOnly
              size="sm"
              aria-label={`${committee.committee_name} 전체 보기`}
              className="w-6 h-6 min-w-6 p-0 bg-transparent"
              onPress={onOpen}>
              <IconEnter />
            </Button>
            <TimelineModal isOpen={isOpen} onClose={onClose} title={committee.committee_name}>
              <div className="flex flex-col gap-3">
                {bills.map((bill) => (
                  <BillRow key={bill.bill_id} bill={bill} />
                ))}
              </div>
            </TimelineModal>
          </div>
          <div className="flex flex-col gap-3">
            {bills.slice(0, COMMITTEE_PREVIEW_SIZE).map((bill) => (
              <BillRow key={bill.bill_id} bill={bill} />
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function CommitteeSection({ committees }: { committees: TimelineCommittee[] }) {
  const { current, total, setPage, currentItems } = usePagedItems(committees);
  if (!committees.length) return null;
  const title = '위원회 심사';
  return (
    <section className="flex flex-col gap-5">
      <SectionHeader
        title={title}
        countLabel="심사한 법안"
        count={committees.reduce((sum, committee) => sum + committee.bill_outline_dto_list.length, 0)}>
        <div className="flex flex-col gap-4">
          {committees.map((committee) => (
            <div key={committee.committee_name} className="flex flex-col gap-2">
              <h4 className="text-lg font-bold">{committee.committee_name}</h4>
              <div className="flex flex-col gap-3">
                {committee.bill_outline_dto_list.map((bill) => (
                  <BillRow key={bill.bill_id} bill={bill} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionHeader>
      <div>
        <div className="grid grid-cols-1 gap-5 md:gap-2 md:grid-cols-2 lg:grid-cols-3">
          {currentItems.map((committee) => (
            <CommitteeCard key={committee.committee_name} committee={committee} />
          ))}
        </div>
        <CardDeck />
      </div>
      <Pager title={title} current={current} total={total} setPage={setPage} />
    </section>
  );
}

function plenaryGroup(result?: string | null) {
  if (result === '원안가결' || result === '수정가결') return '가결';
  if (result === '부결') return '부결';
  if (result?.endsWith('폐기')) return '폐기';
  if (result === '철회') return '철회';
  return result?.trim() ? '결과 확인 필요' : '결과 기록 없음';
}

const PLENARY_GROUPS = ['가결', '부결', '폐기', '철회', '결과 기록 없음', '결과 확인 필요'];

export function PlenarySection({ entries }: { entries: TimelinePlenary[] }) {
  const unique = Array.from(new Map(entries.map((entry) => [entry.bill_info.bill_id, entry])).values());
  const { current, total, setPage, currentItems } = usePagedItems(unique);
  if (!unique.length) return null;
  const title = '본회의 심의';
  return (
    <section className="flex flex-col gap-5">
      <SectionHeader title={title} countLabel="심의한 법안" count={unique.length}>
        <div className="flex flex-col gap-4">
          {PLENARY_GROUPS.map((group) => {
            const bills = unique.filter(({ bill_info }) => plenaryGroup(bill_info.bill_result) === group);
            if (!bills.length) return null;
            return (
              <div key={group} className="flex flex-col gap-2">
                <h4 className="text-lg font-bold">
                  {group} <span className="text-sm font-medium text-gray-2 dark:text-gray-3">{bills.length}개</span>
                </h4>
                <div className="flex flex-col gap-3">
                  {bills.map(({ bill_info }) => (
                    <BillRow key={bill_info.bill_id} bill={bill_info} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionHeader>
      <div>
        <div className="grid grid-cols-1 gap-5 md:gap-2 md:grid-cols-2 lg:grid-cols-3">
          {currentItems.map((entry) => (
            <BillCard key={entry.bill_info.bill_id} bill={entry.bill_info} vote={entry} />
          ))}
        </div>
        <CardDeck />
      </div>
      <div className="grid grid-cols-1 gap-5 md:gap-2 md:grid-cols-2 lg:grid-cols-3">
        {currentItems.map((entry) => (
          <ProcessResult
            key={entry.bill_info.bill_id}
            bill_result={entry.bill_info.bill_result}
            approval_count={entry.approval_vote_count}
            total_vote_count={entry.total_vote_count}
            party_vote_list={entry.party_vote_list ?? []}
          />
        ))}
      </div>
      <Pager title={title} current={current} total={total} setPage={setPage} />
    </section>
  );
}
