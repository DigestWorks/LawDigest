import { BillResponse } from '@/types';
import { RefObject } from 'react';
import { BillListSkeleton } from '@/components/common/Skeletons';
import { Bill } from '@/components';

export default function BillFollowedList({
  bills,
  isFetching,
  fetchRef,
}: {
  bills: BillResponse[];
  isFetching: boolean;
  fetchRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {bills.map((bill) => (
        <Bill {...bill} key={bill.bill_info_dto.bill_id} />
      ))}
      {isFetching && (
        <li className="list-none">
          <BillListSkeleton count={1} label="다음 법안을 불러오고 있습니다" />
        </li>
      )}
      <div ref={fetchRef} />
    </ul>
  );
}
