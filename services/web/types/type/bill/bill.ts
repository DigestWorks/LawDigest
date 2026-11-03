import { ReactNode } from 'react';

export interface BillResponse {
  hot_activity?: { view_count: number; scrap_count: number };
  bill_info_dto: {
    bill_id: string;
    bill_number?: number;
    bill_name: string;
    propose_date: string;
    summary: string;
    gpt_summary: string;
    view_count: number;
    bill_like_count: number;
    bill_stage: string;
    title: string;
    bill_result: string;
    proposer_kind?: 'CONGRESSMAN' | 'CHAIRMAN' | 'GOVERNMENT' | string | null;
    proposers?: string | null;
    committee?: string | null;
    category?: string | null;
    stage_dates?: { stage: string; date: string }[];
  };
  representative_proposer_dto_list: {
    representative_proposer_id: string;
    representative_proposer_name: string;
    represent_proposer_img_url: string;
    party_id: number;
    party_image_url: string;
    party_name: string;
  }[];
  public_proposer_dto_list: {
    public_proposer_id: string;
    public_proposer_name: string;
    public_proposer_img_url: string;
    public_proposer_party_id: number;
    public_proposer_party_image_url: string;
    public_proposer_party_name: string;
  }[];
  is_book_mark: boolean;
  similar_bills_count?: number;
  similar_bills?: {
    billTitle: string | null;
    billId: string;
    billName: string;
    billProposers: string;
    billStage: string;
    billResult?: string | null;
    assemblyNumber?: number;
    proposeDate?: string | null;
    party: {
      party_id: number;
      party_image_url: string;
      party_name: string;
    }[];
  }[];
  vote_result_response?: {
    approval_count: number | null;
    total_vote_count: number | null;
    party_vote_list: {
      party_info: {
        party_id: number;
        party_name: string;
        party_image_url: string;
      };
      party_approval_count: number;
    }[];
  } | null;
}

export type SimilarBill = NonNullable<BillResponse['similar_bills']>[number];

export interface SimilarBillsResponse {
  bill_list: SimilarBill[];
  total_count: number;
  pagination_response: { last_page: boolean; page_number: number };
}

export interface BillProps extends BillResponse {
  children?: ReactNode;
  detail?: boolean;
}

export type BillListItem = Omit<BillResponse, 'bill_info_dto' | 'public_proposer_dto_list'> & {
  bill_info_dto: Omit<BillResponse['bill_info_dto'], 'summary'> & { summary?: string | null };
  public_proposer_dto_list?: BillResponse['public_proposer_dto_list'];
  public_proposer_count?: number;
  has_original_summary?: boolean;
};
