export interface PartySearchProps {
  search_type: 'PARTY';
  party_id: number;
  party_name: string;
  party_image_url: string | null;
}

export interface CongressmanSearchProps {
  search_type: 'CONGRESSMAN';
  congressman_id: string;
  congressman_name: string;
  congressman_image_url: string | null;
  party_id: number;
  party_name: string;
  current_member?: boolean;
  assembly_number?: number;
}

export type SearchCongressmanPartyProps = PartySearchProps | CongressmanSearchProps;

export interface SearchCongressmanPartyResponse {
  search_response: SearchCongressmanPartyProps[];
}
