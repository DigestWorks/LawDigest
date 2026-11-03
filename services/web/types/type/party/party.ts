export interface PartyDetailResponse {
  party_id: number;
  party_name: string;
  party_img_url: string | null;
  total_congressman_count: number;
  proportional_congressman_count: number;
  district_congressman_count: number;
  unclassified_congressman_count?: number;
  representative_bill_count: number;
  public_bill_count: number;
  follow_count: number;
  website_url: string | null;
  parliamentary_rank?: number | null;
  party_leader?: string | null;
  parliamentary_leader?: string | null;
  secretary_general?: string | null;
  policy_committee_chairman?: string | null;
  leadership_verified_on?: string | null;
  leadership_source_url?: string | null;
  followed: boolean;
}
