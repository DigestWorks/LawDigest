import { BillResponse } from '@/types';
import { RefObject } from 'react';
import { BookmarkedBillsSkeleton } from '@/components/common/Skeletons';
import BillBookmarked from './BillBookmarked';

export default function BillBookmarkedList({
  bills,
  isFetching,
  fetchRef,
}: {
  bills: BillResponse[];
  isFetching: boolean;
  fetchRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <ul className="flex flex-col gap-4 mx-[30px] lg:mx-0">
      {bills.map((bill, index) => (
        <BillBookmarked {...bill} key={`${bill.bill_info_dto.bill_id + index}`} />
      ))}
      {isFetching && (
        <li className="list-none">
          <BookmarkedBillsSkeleton count={1} className="mx-0" />
        </li>
      )}
      <div ref={fetchRef} />
    </ul>
  );
}
