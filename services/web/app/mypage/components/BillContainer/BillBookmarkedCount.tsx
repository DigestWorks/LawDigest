'use client';

import { useGetBillBookmarkedCount } from '../../apis';

export default function BillBookmarkedCount() {
  const { data } = useGetBillBookmarkedCount();
  return <span className="text-[#555555] dark:text-gray-2">{data?.data.count ?? '—'}</span>;
}
