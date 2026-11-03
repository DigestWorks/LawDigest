'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useState, useCallback, useEffect, useId, useRef } from 'react';
import { useTheme } from 'next-themes';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Avatar,
  Button,
  Divider,
  Tooltip,
  Chip,
  AvatarGroup,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@heroui/react';
import Link from 'next/link';
import type { BaseResponse, BillProps, ViewCountResponse } from '@/types';
import { IconExport, IconScrabSmall } from '@/public/svgs';
import { usePatchBookmark } from '@/app/bill/[id]/apis';
import {
  copyClipBoard,
  getPartyLogoSrc,
  getGovernmentAdministrationName,
  isGovernmentBill,
  getChairmanProposerInfo,
} from '@/utils';
import Image from 'next/image';
import PartyLogoReplacement from '@/components/common/PartyLogoReplacement/PartyLogoReplacement';
import { getCookie } from 'cookies-next';
import { ACCESS_TOKEN } from '@/constants';
import { useSetAtom } from 'jotai';
import { snackbarState } from '@/store';
import ProposerList from '@/app/bill/[id]/components/ProposerList/ProposerList';
import { isoDateOnly, proposalDateLabel } from '@/lib/dataFreshness';
import BillSource from './BillSource';
import { getPartyColor } from '@/constants/party';
import { getFeedSummaryMarkdown, getSummaryVisibilityClassNames } from './renderBillSummaryMarkdown';
import SafeBillSummaryHtml from './SafeBillSummaryHtml';
import { Button as ActionButton } from '@/components/ui/button';

export default function Bill({
  bill_info_dto: {
    bill_id,
    bill_number,
    bill_name,
    title,
    propose_date,
    summary,
    gpt_summary,
    view_count,
    bill_like_count,
    bill_stage,
    proposer_kind,
    proposers,
    committee,
  },
  representative_proposer_dto_list,
  is_book_mark,
  hot_activity,
  public_proposer_dto_list,
  detail,
  children,
}: BillProps) {
  const trackedBill = useRef<string | null>(null);
  const [observedView, setObservedView] = useState<{ id: string; count: number } | null>(null);
  useEffect(() => {
    if (!detail) return undefined;
    const recordVisibleView = () => {
      if (document.visibilityState !== 'visible' || trackedBill.current === bill_id) return;
      trackedBill.current = bill_id;
      const query = new URLSearchParams({ bill_id });
      void fetch(`/v1/bill/view_count?${query}`, { method: 'PATCH', credentials: 'omit', keepalive: true })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: BaseResponse<ViewCountResponse> | null) => {
          const count = payload?.data?.view_count;
          if (typeof count === 'number' && Number.isSafeInteger(count) && trackedBill.current === bill_id) {
            setObservedView({ id: bill_id, count });
          }
        })
        .catch(() => undefined);
    };
    document.addEventListener('visibilitychange', recordVisibleView);
    recordVisibleView();
    return () => document.removeEventListener('visibilitychange', recordVisibleView);
  }, [bill_id, detail]);
  const detailViewCount = observedView?.id === bill_id ? observedView.count : view_count;

  const [isLiked, setIsLiked] = useState(is_book_mark);
  const [likeCount, setLikeCount] = useState(bill_like_count);
  const mutateBookmark = usePatchBookmark(bill_id);
  const [toggleMore, setToggleMore] = useState(false);
  const summaryId = useId();
  const isGovernmentProposer = isGovernmentBill({
    proposerKind: proposer_kind,
    billId: bill_id,
    representativeProposerCount: representative_proposer_dto_list.length,
    publicProposerCount: public_proposer_dto_list.length,
  });
  const chairmanProposerInfo = getChairmanProposerInfo({
    proposerKind: proposer_kind,
    proposerText: proposers,
    committee,
  });
  const isChairmanProposer = chairmanProposerInfo !== null;
  const isRepresentativeSolo =
    !isGovernmentProposer && !isChairmanProposer && representative_proposer_dto_list.length === 1;
  const partyName = isRepresentativeSolo ? representative_proposer_dto_list[0].party_name : '다수';
  const partyAccent = getPartyColor(isRepresentativeSolo ? partyName : null);
  let proposerCardBorderClassName = '';
  if (isGovernmentProposer) {
    proposerCardBorderClassName = 'lawdigest-government-proposer-card';
  } else if (isChairmanProposer) {
    proposerCardBorderClassName = 'lawdigest-chairman-proposer-card';
  }
  const setSnackbar = useSetAtom(snackbarState);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const aiSummary = gpt_summary?.trim() ? gpt_summary : '';
  const displayedSummary = aiSummary && !detail ? getFeedSummaryMarkdown(aiSummary) : aiSummary || summary;
  const { summaryClassName } = getSummaryVisibilityClassNames({
    detail: Boolean(detail),
    expanded: toggleMore,
  });
  const summaryAccentStyle = {
    '--lawdigest-summary-accent': isGovernmentProposer ? '#c60c30' : chairmanProposerInfo?.accentColor ?? partyAccent,
    '--lawdigest-summary-accent-secondary': isGovernmentProposer
      ? '#003478'
      : chairmanProposerInfo?.accentColor ?? partyAccent,
  } as CSSProperties;
  const summaryContentClassName =
    `${summaryClassName} ${isGovernmentProposer ? 'lawdigest-summary-government-accent' : ''}`.trim();

  const onClickToggleMore = useCallback(() => {
    setToggleMore(!toggleMore);
  }, [toggleMore]);

  const onClickScrab = useCallback(() => {
    const accessToken = getCookie(ACCESS_TOKEN);

    if (accessToken) {
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
      setSnackbar({
        show: true,
        type: isLiked ? 'CANCEL' : 'SUCCESS',
        message: isLiked ? '해당 법안의 스크랩을 취소했습니다.' : '해당 법안을 스크랩했습니다.',
        duration: 3000,
      });

      mutateBookmark.mutate(!isLiked);
    } else {
      setSnackbar({ show: true, type: 'ERROR', message: '로그인이 필요한 서비스입니다.', duration: 3000 });
    }
  }, [isLiked, likeCount, setSnackbar]);

  const handleCopyClipBoard = useCallback(() => {
    copyClipBoard(`${process.env.NEXT_PUBLIC_DOMAIN}/bill/${bill_id}`);
    setSnackbar({ show: true, type: 'SUCCESS', message: '링크를 복사했습니다.', duration: 3000 });
  }, []);

  let proposerAffiliationContent = (
    <AvatarGroup>
      {representative_proposer_dto_list.map(({ party_image_url, party_id, party_name }) => (
        <Link href={party_image_url !== null ? `/party/${party_id}` : {}} key={party_id}>
          <Avatar
            src={getPartyLogoSrc(party_image_url, isDark) ?? undefined}
            size="md"
            classNames={{
              base: [`bg-white dark:bg-dark-pb p-1 border ${party_name}`],
              img: ['object-contain'],
            }}
          />
        </Link>
      ))}
    </AvatarGroup>
  );

  if (isGovernmentProposer) {
    proposerAffiliationContent = (
      <Image
        src="/images/government-logo.png"
        width={320}
        height={245}
        alt="대한민국정부 로고"
        className="w-auto h-[60px] object-contain -my-1"
      />
    );
  } else if (chairmanProposerInfo) {
    proposerAffiliationContent = (
      <Image
        src={chairmanProposerInfo.logoSrc}
        width={280}
        height={72}
        alt={chairmanProposerInfo.logoAlt}
        className="w-auto h-[34px] max-w-[150px] object-contain"
      />
    );
  } else if (isRepresentativeSolo) {
    proposerAffiliationContent = (
      <Link
        href={
          representative_proposer_dto_list[0].party_image_url !== null
            ? `/party/${representative_proposer_dto_list[0].party_id}`
            : {}
        }
        onClick={(e) => {
          if (representative_proposer_dto_list[0].party_image_url === null) e.preventDefault();
        }}>
        {representative_proposer_dto_list[0].party_image_url !== null ? (
          <Image
            src={getPartyLogoSrc(representative_proposer_dto_list[0].party_image_url, isDark) as string}
            width={100}
            height={45}
            alt={`${representative_proposer_dto_list[0].party_name} 이미지`}
            className="w-[100px] h-[40px] object-contain"
          />
        ) : (
          <PartyLogoReplacement partyName={representative_proposer_dto_list[0].party_name} circle={false} />
        )}
      </Link>
    );
  }

  let proposerIdentityContent: ReactNode = (
    <>
      <Link
        href={
          isRepresentativeSolo ? `/congressman/${representative_proposer_dto_list[0].representative_proposer_id}` : {}
        }
        scroll={isRepresentativeSolo}
        onClick={(e) => {
          if (!isRepresentativeSolo) e.preventDefault();
        }}>
        <h3 className="font-medium">
          {isRepresentativeSolo
            ? `${representative_proposer_dto_list[0].representative_proposer_name} 의원`
            : `${representative_proposer_dto_list
                .map(({ representative_proposer_name }) => representative_proposer_name)
                .join('·')} 의원`}
        </h3>
      </Link>

      <Popover placement="bottom" showArrow>
        <PopoverTrigger>
          <Button className="p-0 m-0 bg-transparent h-min">
            <Tooltip showArrow content="발의자 명단 보기">
              <h4 className="text-xs text-gray-2">
                {isRepresentativeSolo
                  ? `${representative_proposer_dto_list[0].representative_proposer_name} 의원 등 ${public_proposer_dto_list.length}인`
                  : `${representative_proposer_dto_list
                      .map(({ representative_proposer_name }) => representative_proposer_name)
                      .join('·')} 의원 등 ${public_proposer_dto_list.length}인`}
              </h4>
            </Tooltip>
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <ProposerList
            representativeProposerList={representative_proposer_dto_list}
            publicProposerList={public_proposer_dto_list}
            billId={bill_id}
            proposerKind={proposer_kind}
            proposerText={proposers}
            committee={committee}
            proposeDate={propose_date}
            popover
          />
        </PopoverContent>
      </Popover>
    </>
  );

  if (isGovernmentProposer) {
    proposerIdentityContent = (
      <>
        <h3 className="font-medium">대한민국 정부</h3>
        <h4 className="text-xs text-gray-2">{getGovernmentAdministrationName(propose_date)}</h4>
      </>
    );
  } else if (chairmanProposerInfo) {
    proposerIdentityContent = (
      <>
        <h3 className="font-medium">{chairmanProposerInfo.proposerTitle}</h3>
        {chairmanProposerInfo.committeeName && (
          <h4 className="text-xs text-gray-2">{chairmanProposerInfo.committeeName}</h4>
        )}
      </>
    );
  }

  return (
    <section className={`flex flex-col  ${detail ? 'md:flex-row items-start' : 'md:mx-5'}`}>
      <Card
        key={bill_id}
        className="flex flex-col gap-5 px-5 pt-6 dark:bg-dark-b dark:lg:bg-dark-pb"
        radius="none"
        shadow="none">
        <CardHeader
          className={`flex  flex-col items-start gap-2 p-0  ${!detail ? 'md:w-[270px] auto md:left-0 md:absolute' : ''}`}>
          {detail && (
            <time className="text-sm text-muted-foreground" dateTime={isoDateOnly(propose_date) ?? undefined}>
              {proposalDateLabel(propose_date)}
            </time>
          )}

          <h2 className={`${detail ? 'text-[26px]' : 'text-xl'} font-semibold`}>{title?.trim() || bill_name}</h2>

          {title?.trim() && title.trim() !== bill_name && (
            <h3 className="text-sm text-muted-foreground">{bill_name}</h3>
          )}

          {hot_activity && (
            <p className="text-xs text-muted-foreground">
              최근 7일 조회 {hot_activity.view_count.toLocaleString('ko-KR')}회 · 스크랩{' '}
              {hot_activity.scrap_count.toLocaleString('ko-KR')}건
            </p>
          )}

          {detail && (Boolean(bill_number) || committee) && (
            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {Boolean(bill_number) && (
                <div className="flex gap-1">
                  <dt>의안번호</dt>
                  <dd>{bill_number}</dd>
                </div>
              )}
              {committee && (
                <div className="flex gap-1">
                  <dt>소관위원회</dt>
                  <dd>{committee}</dd>
                </div>
              )}
            </dl>
          )}

          {!detail && (
            <div className="flex items-center w-full gap-3">
              <time className="text-xs text-muted-foreground" dateTime={isoDateOnly(propose_date) ?? undefined}>
                {proposalDateLabel(propose_date)}
              </time>
              <Chip
                className="text-xs bg-transparent text-gray-2 border-gray-1 dark:border-gray-3 dark:text-gray-3 border-1"
                size="sm"
                variant="bordered"
                radius="sm">
                {bill_stage}
              </Chip>
            </div>
          )}
        </CardHeader>

        <section className={!detail ? 'md:flex md:justify-between md:gap-10' : ''}>
          <div className={!detail ? 'hidden md:block md:w-[270px]' : ''} />
          <div className={!detail ? 'md:w-[440px] lg:w-[490px]' : ''}>
            <CardBody className={`p-0 leading-normal whitespace-pre-wrap ${detail ? '' : 'text-sm md:text-base'}`}>
              <BillSource billId={bill_id} generated={Boolean(aiSummary)} detail={detail} />
              <SafeBillSummaryHtml
                className={summaryContentClassName}
                style={summaryAccentStyle}
                id={summaryId}
                markdown={displayedSummary}
              />
              {!detail && (
                <ActionButton
                  variant="ghost"
                  className="self-start"
                  type="button"
                  onClick={onClickToggleMore}
                  aria-expanded={toggleMore}
                  aria-controls={summaryId}>
                  {toggleMore ? '요약 접기' : '요약 더 보기'}
                </ActionButton>
              )}
            </CardBody>

            {!detail && (
              <CardFooter className="flex items-center justify-between p-0 mt-5 -ml-1">
                <div className="flex gap-2">
                  <div className="flex items-center text-sm text-gray-3">
                    <Button isIconOnly size="sm" className="p-0 bg-transparent" onClick={onClickScrab}>
                      <IconScrabSmall isActive={isLiked} />
                    </Button>
                    <h4 className="mr-2">스크랩</h4>
                    <h4>{likeCount}</h4>
                  </div>
                  <div className="flex items-center text-sm text-gray-3">
                    <h4 className="mr-2">조회수</h4>
                    <h4>{view_count}</h4>
                  </div>
                  <Tooltip content="링크 복사하기" className="dark:text-white">
                    <Button
                      isIconOnly
                      size="sm"
                      className="bg-transparent"
                      aria-label="Export Button"
                      onClick={handleCopyClipBoard}>
                      <IconExport />
                    </Button>
                  </Tooltip>
                </div>

                <ActionButton asChild variant="secondary" className="min-w-[88px]">
                  <Link href={`/bill/${bill_id}`}>자세히 보기</Link>
                </ActionButton>
              </CardFooter>
            )}

            {detail && (
              <CardFooter className="flex items-center justify-between p-0 mt-10">
                <div className="flex gap-4">
                  <div className="flex items-center text-sm text-gray-2">
                    <Button isIconOnly size="sm" className="p-0 bg-transparent" onClick={onClickScrab}>
                      <IconScrabSmall isActive={isLiked} />
                    </Button>
                    <h4 className="mr-2">스크랩</h4>
                    <h4>{likeCount}</h4>
                  </div>
                  <div className="flex items-center text-sm text-gray-2">
                    <h4 className="mr-2">조회수</h4>
                    <h4>{detailViewCount}</h4>
                  </div>
                </div>
                <Tooltip content="링크 복사하기">
                  <Button isIconOnly size="sm" className="bg-transparent" onClick={handleCopyClipBoard}>
                    <IconExport />
                  </Button>
                </Tooltip>
              </CardFooter>
            )}
          </div>
        </section>
      </Card>

      <div
        className={`flex flex-col w-full md:w-auto md:flex-col ${detail ? 'md:border-l md:dark:border-dark-l' : ''}`}>
        <div className="pt-4 pb-6">
          <Card
            style={isGovernmentProposer || isChairmanProposer ? undefined : { borderColor: partyAccent }}
            className={`flex flex-row h-[78px] mx-5 border-1.5 items-center justify-between px-[18px] dark:bg-gray-4 md:w-[410px] lg:max-w-full lg:w-[490px] md:float-right ${detail ? 'md:w-[300px] lg:float-left' : ''} ${proposerCardBorderClassName}`}
            radius="sm"
            shadow="sm">
            <div className="flex items-center gap-2">
              {!isGovernmentProposer && isRepresentativeSolo && (
                <Link
                  href={
                    isRepresentativeSolo
                      ? `/congressman/${representative_proposer_dto_list[0].representative_proposer_id}`
                      : {}
                  }
                  scroll={isRepresentativeSolo}
                  onClick={(e) => {
                    if (!isRepresentativeSolo) e.preventDefault();
                  }}>
                  <Avatar
                    radius="full"
                    name={representative_proposer_dto_list[0].representative_proposer_name}
                    src={`${process.env.NEXT_PUBLIC_IMAGE_URL}${representative_proposer_dto_list[0].represent_proposer_img_url}`}
                    className="border dark:border-dark-l"
                  />
                </Link>
              )}
              <div className="flex flex-col gap-0.5">{proposerIdentityContent}</div>
            </div>

            {proposerAffiliationContent}
          </Card>
        </div>

        <section className="h-full mx-5">{children}</section>
      </div>

      {!detail && <Divider className="h-[10px] md:h-[1px] bg-gray-0.5 dark:bg-gray-4" />}
    </section>
  );
}
