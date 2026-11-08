import Link from 'next/link';
import PartyProfileLogo from '@/components/common/PartyProfileLogo';

export default function PartyLogo({
  party_id,
  party_name,
  party_image_url,
}: {
  party_id: number;
  party_name: string;
  party_image_url: string | null;
}) {
  const logo = <PartyProfileLogo name={party_name} imageUrl={party_image_url} />;
  return party_id > 0 ? <Link href={`/party/${party_id}`}>{logo}</Link> : logo;
}
