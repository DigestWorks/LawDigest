import { Pagination } from '../common';
import { BillListItem } from '../bill';

export interface SearchBillResponse {
  search_response: BillListItem[];
  pagination_response: Pagination;
}
