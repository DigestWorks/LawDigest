import { Pagination } from '../common';
import { BillResponse } from '../bill';

export interface SearchBillResponse {
  search_response: BillResponse[];
  pagination_response: Pagination;
}
