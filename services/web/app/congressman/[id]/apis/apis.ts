import { Dispatch, SetStateAction } from 'react';
import http from '@/api';
import { BillListItem, FeedResponse, CongressmanDetailResponse, CongressmanFollowResponse, ValueOf } from '@/types';
import { BILL_TAB } from '@/constants';

export const getBillByCongressmanId = async (
  page: number,
  congressmanId: string,
  type: ValueOf<typeof BILL_TAB> | Dispatch<SetStateAction<ValueOf<typeof BILL_TAB>>>,
) =>
  http.get<FeedResponse<BillListItem>>({
    url: `/congressman/bill_info`,
    params: { congressman_id: congressmanId, type, page, size: 10, compact: true },
  });

export const getCongressmanDetail = (congressmanId: string) =>
  http.get<CongressmanDetailResponse>({
    url: `/congressman/detail`,
    params: { congressman_id: congressmanId },
  });

export const patchCongressmanFollow = (congressmanId: string, likeChecked: boolean) =>
  http.patch<CongressmanFollowResponse>({
    url: `/congressman/user/like`,
    params: { congressman_id: congressmanId, like_checked: likeChecked },
  });
