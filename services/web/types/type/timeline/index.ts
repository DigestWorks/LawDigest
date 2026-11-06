import { Pagination } from '../common/pagination';

export interface TimelineResponse {
  pagination_response: Pagination;
  timeline_response_list: TimelineResponseList[];
}

export interface TimelineParty {
  party_id: number;
  party_name: string;
  party_image_url: string | null;
}

export interface TimelineBill {
  party_info?: TimelineParty[];
  bill_id: string;
  bill_name: string;
  bill_stage: string | null;
  bill_proposers: string | null;
  bill_title: string | null;
  bill_result?: string | null;
}

export interface TimelinePlenary {
  bill_info: TimelineBill;
  approval_vote_count: number | null;
  total_vote_count: number | null;
  party_vote_list?: { party_info: TimelineParty & { party_image_url: string }; party_approval_count: number }[];
}

export interface TimelineCommittee {
  committee_name: string;
  bill_count: number;
  bill_outline_dto_list: TimelineBill[];
}

export interface TimelineResponseList {
  date: string;
  bill_count: number;
  plenary_list: TimelinePlenary[];
  promulgation_list: TimelineBill[];
  committee_audit_list: TimelineCommittee[];
  submitted_list: TimelineBill[];
}

export interface TimelineBillState {
  days_since_opening: number;
  receipt_count: number;
  treatment_count: number;
  passed_count: number;
}
