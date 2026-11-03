import { SectionError } from '@/components/common/SectionState';
import { Button } from '@/components/ui/button';
import { Card } from '@heroui/card';
import { Divider } from '@heroui/react';
import { IconWeb } from '@/public/svgs';
import { useGetPartyDetail } from '../../apis';
import FollowBoard from './FollowBoard';
import PartyLogo from './PartyLogo';

function externalUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) return url.href;
  } catch {
    return null;
  }
  return null;
}

export default function PartyDetail({ partyId }: { partyId: number }) {
  const query = useGetPartyDetail(partyId);
  const profile = query.data?.data;

  if (!profile) {
    return query.isPending ? (
      <p role="status" className="p-5 text-sm text-muted-foreground">
        정당 프로필을 불러오는 중…
      </p>
    ) : (
      <SectionError
        message="정당 프로필을 불러오지 못했습니다."
        pending={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const {
    party_name,
    party_img_url,
    total_congressman_count,
    proportional_congressman_count,
    district_congressman_count,
    unclassified_congressman_count = 0,
    representative_bill_count,
    public_bill_count,
    follow_count,
    website_url,
    parliamentary_rank,
    followed,
  } = profile;
  const partySeats = proportional_congressman_count + district_congressman_count + unclassified_congressman_count;
  const seatRatio = total_congressman_count > 0 ? ((100 * partySeats) / total_congressman_count).toFixed(2) : null;

  const website = externalUrl(website_url);
  const leadershipSource = externalUrl(profile.leadership_source_url);
  const leaders = [
    { role: '당대표', name: profile.party_leader },
    { role: '원내대표', name: profile.parliamentary_leader },
    { role: '사무총장', name: profile.secretary_general },
    { role: '정책위의장', name: profile.policy_committee_chairman },
  ].filter(({ name }) => name?.trim());

  return (
    <section className="flex flex-col items-center mx-5 xl:mx-0 mt-5 gap-7 xl:w-[320px]">
      <Card shadow="none" className="flex flex-col items-center w-full gap-5 pt-1 dark:bg-dark-b lg:dark:bg-dark-pb">
        <PartyLogo party_name={party_name} party_img_url={party_img_url} />

        <div className="flex flex-col items-center gap-1">
          <h1 className="text-2xl font-semibold">{party_name}</h1>
          {parliamentary_rank && <p className="text-sm text-muted-foreground">의석 기준 원내 {parliamentary_rank}위</p>}
        </div>

        <div className="text-sm">
          <p>
            의석수: {partySeats}석 / {total_congressman_count}석{' '}
            {seatRatio !== null && <span className="text-gray-2 dark:text-muted-foreground">{seatRatio}%</span>}
          </p>
          <p>
            지역구 {district_congressman_count}석, 비례대표 {proportional_congressman_count}석
            {unclassified_congressman_count > 0 && ` · 선출 구분 미확인 ${unclassified_congressman_count}석`}
          </p>
        </div>
      </Card>

      <Divider className="dark:bg-dark-l" />

      <FollowBoard
        id={partyId}
        followed={followed}
        follow_count={follow_count}
        representative_bill_count={representative_bill_count}
        public_bill_count={public_bill_count}
      />

      {profile.leadership_verified_on && leadershipSource && leaders.length > 0 && (
        <section className="w-full space-y-3 border-t pt-5" aria-labelledby="party-leadership">
          <h3 id="party-leadership" className="font-semibold">
            지도부
          </h3>
          <dl className="grid grid-cols-2 gap-3">
            {leaders.map(({ role, name }) => (
              <div key={role}>
                <dt className="text-sm text-muted-foreground">{role}</dt>
                <dd className="font-medium">{name}</dd>
              </div>
            ))}
          </dl>
          <a
            className="text-sm underline underline-offset-4"
            href={leadershipSource}
            target="_blank"
            rel="noopener noreferrer">
            공식 출처 · <time dateTime={profile.leadership_verified_on}>{profile.leadership_verified_on}</time> 확인
          </a>
        </section>
      )}

      {website && (
        <Button asChild variant="outline">
          <a href={website} target="_blank" rel="noopener noreferrer">
            공식 웹사이트 <IconWeb />
          </a>
        </Button>
      )}
    </section>
  );
}
