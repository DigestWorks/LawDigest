import PartyProfileLogo from '@/components/common/PartyProfileLogo';

export default function PartyLogo({ party_name, party_img_url }: { party_name: string; party_img_url: string | null }) {
  return (
    <div className="flex size-[130px] items-center justify-center rounded-full border shadow-lg">
      <PartyProfileLogo name={party_name} imageUrl={party_img_url} large />
    </div>
  );
}
