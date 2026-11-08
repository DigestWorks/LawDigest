import { SectionError } from '@/components/common/SectionState';
import { CongressmanProfileSkeleton } from '@/components/common/Skeletons';
import { Card } from '@heroui/card';
import { Avatar } from '@heroui/avatar';
import { Divider, Button, Link as NextUILink, Accordion, AccordionItem } from '@heroui/react';
import { IconWeb } from '@/public/svgs';
import FollowBoard from './FollowBoard';
import { useGetCongressmanDetail } from '../../apis';
import PartyLogo from './PartyLogo';

export default function CongressmanDetail({ congressmanId }: { congressmanId: string }) {
  const query = useGetCongressmanDetail(congressmanId);
  const profile = query.data?.data;

  if (!profile) {
    return query.isPending ? (
      <CongressmanProfileSkeleton />
    ) : (
      <SectionError
        message="의원 프로필을 불러오지 못했습니다."
        pending={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const {
    congressman_name,
    party_id,
    party_name,
    party_image_url,
    district,
    commits,
    elected,
    congressman_image_url,
    like_checked,
    represent_count,
    public_count,
    homepage,
    office,
    email,
    age,
    gender,
    follow_count,
    brief_history,
    telephone,
  } = profile;
  const committees = (commits ?? '')
    .split(/,\s*/)
    .map((committee) => committee.trim())
    .filter(Boolean);

  return (
    <Card
      className={`mx-5 md:mx-auto xl:mx-0 mt-5 py-5 px-6 border-1.5 flex flex-col gap-5 mb-4 dark:bg-dark-b xl:h-min md:w-[430px] xl:w-[320px] shrink-0 lg:dark:bg-dark-pb ${party_name}`}
      shadow="none"
      radius="md">
      <div className="flex items-center gap-4">
        <Avatar
          radius="full"
          showFallback
          name={congressman_name}
          getInitials={(name) => name.slice(0, 1)}
          src={congressman_image_url ? process.env.NEXT_PUBLIC_IMAGE_URL + congressman_image_url : undefined}
          className={`h-20 w-20 border-1.5 shrink-0 ${party_name}`}
        />

        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold">{congressman_name} 의원</h1>
          <p className="text-sm text-muted-foreground">
            {district} {elected}
          </p>
          <div className="mt-1 self-start">
            <PartyLogo party_id={party_id} party_name={party_name} party_image_url={party_image_url} />
          </div>
        </div>
      </div>

      {committees.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-border pt-4 text-sm text-muted-foreground">
          {committees.map((committee) => (
            <li key={committee}>{committee}</li>
          ))}
        </ul>
      )}

      <Divider className="bg-gray-1 dark:bg-dark-l" />

      <FollowBoard
        id={congressmanId}
        likeChecked={like_checked}
        follow_count={follow_count}
        represent_count={represent_count}
        public_count={public_count}
      />

      <Divider className="bg-gray-1 dark:bg-dark-l" />

      <section className="flex w-full flex-col gap-3" aria-labelledby="congressman-basic-info">
        <h2 id="congressman-basic-info" className="font-semibold">
          기본정보
        </h2>
        <dl className="flex flex-col gap-2 text-sm">
          {[
            ['나이', age ? `${age}세` : '-'],
            ['성별', gender || '-'],
            ['번호', telephone || '-'],
            ['이메일', email || '-'],
            ['의원실', office || '-'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">{label}</dt>
              <dd className="min-w-0 text-end font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Accordion className="px-0">
        <AccordionItem
          aria-label="약력"
          classNames={{
            trigger: ['py-2', 'border-t', 'border-border', 'rounded-none'],
            title: ['text-sm', 'font-semibold'],
          }}
          title="약력">
          <div className="flex flex-col h-full gap-5">
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {brief_history
                ? brief_history.replaceAll('&middot;', '·').replaceAll('&nbsp;', '').replaceAll('&#39;', `'`)
                : '해당 의원의 약력이 존재하지 않습니다.'}
            </p>

            <Button
              as={NextUILink}
              href={homepage}
              endContent={<IconWeb />}
              variant="bordered"
              radius="full"
              className="w-[135px] h-8 text-gray-2 mx-auto border-gray-1 dark:border-gray-2 dark:text-muted-foreground">
              홈페이지 방문
            </Button>
          </div>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
