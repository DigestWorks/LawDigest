import http from '@/api';
import { BillResponse, BookmarkResponse, SimilarBillsResponse } from '@/types';

export const getBillDetail = async (billId: string) =>
  http.get<BillResponse>({
    url: `/bill/detail/${encodeURIComponent(billId)}`,
  });

export const getSimilarBills = (billId: string, page: number, current?: boolean) =>
  http.get<SimilarBillsResponse>({
    url: `/bill/similar/${encodeURIComponent(billId)}`,
    params: { page, size: 5, current_assembly: current },
  });

export const postBookmark = (billId: string, likeChecked: boolean) =>
  http.patch<BookmarkResponse>({
    url: `/bill/user/bookmark`,
    params: { bill_id: billId, likeChecked },
  });
