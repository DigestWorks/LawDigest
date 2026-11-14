export type CommitteeType = 'standing' | 'special';

export interface CommitteeSummary {
  name: string;
  type: CommitteeType;
  bill_count: number;
  passed_count: number;
  pending_count: number;
  member_count: number;
}

export interface CommitteeMember {
  congressman_id: string;
  congressman_name: string;
  congressman_image_url: string | null;
  party_id: number | null;
  party_name: string | null;
  party_image_url: string | null;
}

export interface CommitteeDetailResponse {
  name: string;
  type: CommitteeType;
  former_names: string[];
  bill_count: number;
  passed_count: number;
  pending_count: number;
  members: CommitteeMember[];
}
