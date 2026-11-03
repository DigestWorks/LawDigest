import { SectionError } from '@/components/common/SectionState';
import { Card } from '@heroui/card';
import { Avatar } from '@heroui/avatar';
import { Chip, Divider, Button, Link as NextUILink, Accordion, AccordionItem } from '@heroui/react';
import { IconWeb } from '@/public/svgs';
import FollowBoard from './FollowBoard';
import { useGetCongressmanDetail } from '../../apis';
import PartyLogo from './PartyLogo';

export default function CongressmanDetail({ congressmanId }: { congressmanId: string }) {
  const query = useGetCongressmanDetail(congressmanId);
  const profile = query.data?.data;

  if (!profile) {
    return query.isPending ? (
      <p role="status" className="p-5 text-sm text-muted-foreground">
        의원 프로필을 불러오는 중…
      </p>
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

  return (
    <Card
      className={`mx-5 md:mx-auto xl:mx-0 mt-5 py-4 px-7 border-1.5 flex flex-col items-center gap-5 mb-4 dark:bg-dark-b xl:h-min md:w-[430px] xl:w-[320px] shrink-0 lg:dark:bg-dark-pb ${party_name}`}
      shadow="md"
      radius="md">
      <PartyLogo party_id={party_id} party_name={party_name} party_image_url={party_image_url} />

      <div className="flex justify-between w-full gap-5">
        <Avatar
          radius="full"
          src={process.env.NEXT_PUBLIC_IMAGE_URL + congressman_image_url}
          className={`w-[100px] h-[100px] border-1.5 shadow-lg shrink-0 ${party_name}`}
        />

        <div className="flex flex-col justify-between py-3 w-[65%] items-end text-right">
          <h1 className="text-2xl font-semibold">{congressman_name} 의원</h1>
          <p className="text-sm text-gray-2">
            {district} {elected}
          </p>
          <p className="text-xs">{commits}</p>
        </div>
      </div>

      <Divider className="bg-gray-1 dark:bg-dark-l" />

      <FollowBoard
        id={congressmanId}
        likeChecked={like_checked}
        follow_count={follow_count}
        represent_count={represent_count}
        public_count={public_count}
      />

      <Divider className="bg-gray-1 dark:bg-dark-l" />

      <div className="flex flex-col w-full gap-2 md:flex-row lg:flex-col">
        <Chip className="text-sm font-medium text-white bg-primary-3 dark:bg-gray-4 dark:text-gray-1 w-[78px] h-8">
          기본정보
        </Chip>

        <div className="w-full ml-3 ">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-2 dark:text-muted-foreground shrink-0">나이</p>
            <p className="text-sm font-medium dark:text-gray-1 w-[80%] break-words text-end">
              {age ? `${age} 세` : '-'}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-2 dark:text-muted-foreground shrink-0">성별</p>
            <p className="text-sm font-medium dark:text-gray-1 w-[80%] break-words text-end">{gender || '-'}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-2 dark:text-muted-foreground shrink-0">번호</p>
            <p className="text-sm font-medium dark:text-gray-1 w-[80%] break-words text-end">{telephone || '-'}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-2 dark:text-muted-foreground shrink-0">이메일</p>
            <p className="w-[80%] text-sm font-medium break-words dark:text-gray-1 text-end">{email || '-'}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-gray-2 dark:text-muted-foreground shrink-0">의원실</p>
            <p className="text-sm font-medium break-words dark:text-gray-1 w-[80%] text-end">{office || '-'}</p>
          </div>
        </div>
      </div>

      <Accordion>
        <AccordionItem
          classNames={{
            base: ['flex', 'flex-col-reverse'],
            indicator: ['mx-auto', '-rotate-90', 'data-[open=true]:rotate-90'],
            titleWrapper: ['hidden'],
          }}
          title="후보약력">
          <div className="flex flex-col h-full gap-5">
            <Divider className="bg-gray-1 dark:bg-dark-l" />

            <p className="text-sm font-medium whitespace-pre-line text-gray-3 dark:text-gray-2">
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
