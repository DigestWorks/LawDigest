import { BillListItem, BillResponse } from '../bill/bill';
import { Pagination } from './pagination';

export interface FeedResponse<Bill = BillResponse> {
  bill_list: Bill[];
  pagination_response: Pagination;
}

export type FeedPopularResponse = BillListItem[];
