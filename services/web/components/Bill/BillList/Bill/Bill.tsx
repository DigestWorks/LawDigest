'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useState, useCallback, useEffect, useId, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import Link, { useLinkStatus } from 'next/link';
import type { BaseResponse, BillListItem, ViewCountResponse } from '@/types';
import { committeeHref, isCommitteeName } from '@/lib/committee';
import { IconExport, IconScrabSmall } from '@/public/svgs';
import { billDetailQueryOptions, usePatchBookmark } from '@/app/bill/[id]/apis';
import {
  copyClipBoard,
  getPartyLogoSrc,
  getGovernmentAdministrationName,
  isGovernmentBill,
  getChairmanProposerInfo,
} from '@/utils';
import Image from 'next/image';
import PartyLogoReplacement from '@/components/common/PartyLogoReplacement/PartyLogoReplacement';
import ThemedPartyLogo from '@/components/common/ThemedPartyLogo';
import { getCookie } from 'cookies-next';
import { ACCESS_TOKEN } from '@/constants';
import { useSetAtom } from 'jotai';
import { snackbarState } from '@/store';
import ProposerList from '@/app/bill/[id]/components/ProposerList/ProposerList';
import { billHeadline } from '@/lib/billHeadline';
import { billResultLabel } from '@/lib/billStage';
import { isoDateOnly, proposalDateLabel } from '@/lib/dataFreshness';
import BillSource from './BillSource';
import { getPartyColor } from '@/constants/party';
import { getFeedSummaryMarkdown, getSummaryVisibilityClassNames } from './renderBillSummaryMarkdown';
import SafeBillSummaryHtml from './SafeBillSummaryHtml';
import { Button as ActionButton } from '@/components/ui/button';

function BillDetailLinkLabel() {
  const { pending } = useLinkStatus();
  return (
    <>
      <span aria-hidden="true">{pending ? '불러오는 중…' : '자세히 보기'}</span>
      <span role="status" className="sr-only">
        {pending ? '법안 상세를 불러오는 중입니다.' : ''}
      </span>
    </>
  );
}

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
    bill_result,
    assembly_number,
    proposer_kind,
    proposers,
    committee,
  },
  representative_proposer_dto_list,
  is_book_mark,
  hot_activity,
  public_proposer_dto_list,
  public_proposer_count,
  has_original_summary,
  detail,
  headingLevel = 2,
  children,
}: BillListItem & { detail?: boolean; headingLevel?: 2 | 3; children?: ReactNode }) {
  const archived = assembly_number === 21;
  const status = billResultLabel(bill_result) || (archived && bill_stage ? `마지막 단계 ${bill_stage}` : bill_stage);
  const titleHeadingLevel = detail ? 1 : headingLevel;
  const TitleHeading = `h${titleHeadingLevel}` as const;
  const summaryHeadingLevel = (titleHeadingLevel + 1) as 2 | 3 | 4;
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

  const [hasDetailSession, setHasDetailSession] = useState<boolean | null>(null);
  useEffect(() => {
    if (detail) setHasDetailSession(Boolean(getCookie(ACCESS_TOKEN)));
  }, [detail, bill_id]);
  const mutateBookmark = usePatchBookmark(bill_id);
  const [toggleMore, setToggleMore] = useState(false);
  const summaryId = useId();
  const summaryContent = useRef<HTMLDivElement>(null);
  const proposerContent = useRef<HTMLDivElement>(null);
  const [proposersOpen, setProposersOpen] = useState(false);
  const proposerCount = public_proposer_count ?? public_proposer_dto_list?.length ?? 0;
  const aiSummary = gpt_summary?.trim() ? gpt_summary : '';
  const officialName = billHeadline(bill_name);
  const headline = billHeadline(bill_name, aiSummary ? title : null);
  const loadOriginalSummary = !aiSummary && !summary?.trim() && Boolean(has_original_summary);
  const checkBookmark = Boolean(detail && hasDetailSession);
  const detailQuery = useQuery({
    ...billDetailQueryOptions(bill_id, checkBookmark),
    enabled: checkBookmark || (proposersOpen && !public_proposer_dto_list) || (toggleMore && loadOriginalSummary),
    retry: false,
  });
  const accountBill = checkBookmark ? detailQuery.data?.data : undefined;
  const isLiked = accountBill?.is_book_mark ?? is_book_mark;
  const likeCount = accountBill?.bill_info_dto.bill_like_count ?? bill_like_count;
  const bookmarkChecking = Boolean(
    detail && (hasDetailSession === null || (checkBookmark && !accountBill && detailQuery.isFetching)),
  );
  const needsBookmarkCheck = checkBookmark && !accountBill;
  const bookmarkLabel = needsBookmarkCheck && detailQuery.isError ? '법안 스크랩 상태 다시 확인' : '법안 스크랩';
  const proposerList = public_proposer_dto_list ?? detailQuery.data?.data?.public_proposer_dto_list;
  const isGovernmentProposer = isGovernmentBill({
    proposerKind: proposer_kind,
    billId: bill_id,
    representativeProposerCount: representative_proposer_dto_list.length,
    publicProposerCount: proposerCount,
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
  const originalSummary = summary?.trim() || detailQuery.data?.data?.bill_info_dto.summary?.trim() || '';
  const displayedSummary = aiSummary && !detail ? getFeedSummaryMarkdown(aiSummary) : aiSummary || originalSummary;
  const summaryLabel = aiSummary ? '요약' : '제안이유';
  let originalSummaryState: ReactNode = <p>공개된 제안이유가 없습니다.</p>;
  if (detailQuery.isFetching) {
    originalSummaryState = <p role="status">제안이유를 불러오는 중입니다.</p>;
  } else if (detailQuery.isError) {
    originalSummaryState = (
      <>
        <p role="alert">제안이유를 불러오지 못했습니다.</p>
        <ActionButton
          variant="outline"
          size="sm"
          onClick={() => {
            summaryContent.current?.focus({ preventScroll: true });
            void detailQuery.refetch();
          }}>
          다시 불러오기
        </ActionButton>
      </>
    );
  }
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

  const onClickScrab = () => {
    if (!getCookie(ACCESS_TOKEN)) {
      setSnackbar({ show: true, type: 'ERROR', message: '로그인이 필요한 서비스입니다.', duration: 3000 });
      return;
    }
    if (needsBookmarkCheck) {
      void detailQuery.refetch();
      return;
    }
    mutateBookmark.mutate(!isLiked, {
      onSuccess: (bookmarked) =>
        setSnackbar({
          show: true,
          type: bookmarked ? 'SUCCESS' : 'CANCEL',
          message: bookmarked ? '해당 법안을 스크랩했습니다.' : '해당 법안의 스크랩을 취소했습니다.',
          duration: 3000,
        }),
      onError: () =>
        setSnackbar({ show: true, type: 'ERROR', message: '스크랩을 변경하지 못했습니다.', duration: 3000 }),
    });
  };

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
          <ThemedPartyLogo
            imageUrl={representative_proposer_dto_list[0].party_image_url}
            width={100}
            height={45}
            alt={`${representative_proposer_dto_list[0].party_name} 이미지`}
            className="w-[88px] h-8 object-contain object-right"
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
        <span className="font-medium">
          {isRepresentativeSolo
            ? `${representative_proposer_dto_list[0].representative_proposer_name} 의원`
            : `${representative_proposer_dto_list
                .map(({ representative_proposer_name }) => representative_proposer_name)
                .join('·')} 의원`}
        </span>
      </Link>

      <Popover placement="bottom" showArrow shouldCloseOnScroll={false} onOpenChange={setProposersOpen}>
        <PopoverTrigger>
          <Button
            aria-label={`발의자 명단 보기 (${proposerCount}인)`}
            className="p-0 m-0 min-w-0 justify-start bg-transparent h-min">
            <Tooltip showArrow content="발의자 명단 보기">
              <span className="text-xs text-muted-foreground">발의자 {proposerCount}인</span>
            </Tooltip>
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <div ref={proposerContent} tabIndex={-1} className="outline-none">
            {proposerList ? (
              <ProposerList
                representativeProposerList={representative_proposer_dto_list}
                publicProposerList={proposerList}
                billId={bill_id}
                proposerKind={proposer_kind}
                proposerText={proposers}
                committee={committee}
                proposeDate={propose_date}
                popover
              />
            ) : (
              <div className="p-3">
                {detailQuery.isError ? (
                  <>
                    <p role="alert">발의자 명단을 불러오지 못했습니다.</p>
                    <ActionButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        proposerContent.current?.focus({ preventScroll: true });
                        void detailQuery.refetch();
                      }}>
                      다시 불러오기
                    </ActionButton>
                  </>
                ) : (
                  <p role="status">발의자 명단을 불러오는 중입니다.</p>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );

  if (isGovernmentProposer) {
    proposerIdentityContent = (
      <>
        <span className="font-medium">대한민국 정부</span>
        <span className="text-xs text-muted-foreground">{getGovernmentAdministrationName(propose_date)}</span>
      </>
    );
  } else if (chairmanProposerInfo) {
    proposerIdentityContent = (
      <>
        <span className="font-medium">{chairmanProposerInfo.proposerTitle}</span>
        {chairmanProposerInfo.committeeName && (
          <span className="text-xs text-muted-foreground">{chairmanProposerInfo.committeeName}</span>
        )}
      </>
    );
  }

  return (
    <section className={`flex flex-col  ${detail ? 'items-start md:flex-row md:items-stretch' : 'md:mx-5'}`}>
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

          <TitleHeading className={`${detail ? 'text-[26px]' : 'text-xl'} font-semibold`}>{headline}</TitleHeading>

          {!headline.endsWith(officialName) && <p className="text-sm text-muted-foreground">{officialName}</p>}

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
                  <dd>
                    {isCommitteeName(committee) ? (
                      <Link
                        href={committeeHref(committee)}
                        className="underline underline-offset-2 hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-2">
                        {committee}
                      </Link>
                    ) : (
                      committee
                    )}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {!detail && (
            <div className="flex flex-wrap items-center w-full gap-2">
              <time className="text-xs text-muted-foreground" dateTime={isoDateOnly(propose_date) ?? undefined}>
                {proposalDateLabel(propose_date)}
              </time>
              {archived && <span className="text-xs text-muted-foreground">제21대</span>}
              {status && (
                <Chip
                  className="text-xs bg-transparent text-muted-foreground border-border border-1"
                  size="sm"
                  variant="bordered"
                  radius="sm">
                  {status}
                </Chip>
              )}
            </div>
          )}
        </CardHeader>

        <section className={!detail ? 'md:flex md:justify-between md:gap-10' : ''}>
          <div className={!detail ? 'hidden md:block md:w-[270px]' : ''} />
          <div className={!detail ? 'md:w-[440px] lg:w-[490px]' : ''}>
            <CardBody className={`p-0 leading-normal whitespace-pre-wrap ${detail ? '' : 'text-sm md:text-base'}`}>
              <BillSource billId={bill_id} generated={Boolean(aiSummary)} detail={detail} />
              <div id={summaryId} ref={summaryContent} tabIndex={-1}>
                {displayedSummary && (detail || aiSummary || toggleMore) && (
                  <SafeBillSummaryHtml
                    className={summaryContentClassName}
                    style={summaryAccentStyle}
                    markdown={displayedSummary}
                    sectionLevel={summaryHeadingLevel}
                  />
                )}
                {loadOriginalSummary && toggleMore && !displayedSummary && originalSummaryState}
              </div>
              {!detail && (displayedSummary || loadOriginalSummary) && (
                <ActionButton
                  variant="ghost"
                  className="-ml-4 self-start"
                  type="button"
                  onClick={onClickToggleMore}
                  aria-expanded={toggleMore}
                  aria-controls={summaryId}>
                  {toggleMore ? `${summaryLabel} 접기` : `${summaryLabel} 더 보기`}
                </ActionButton>
              )}
            </CardBody>

            {!detail && (
              <CardFooter className="flex items-center justify-between p-0 mt-5 -ml-1">
                <div className="flex gap-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <ActionButton
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 p-0"
                      aria-label={bookmarkLabel}
                      aria-pressed={bookmarkChecking || needsBookmarkCheck ? undefined : isLiked}
                      disabled={bookmarkChecking || mutateBookmark.isPending}
                      onClick={onClickScrab}>
                      <IconScrabSmall isActive={isLiked && !bookmarkChecking && !needsBookmarkCheck} />
                    </ActionButton>
                    <span className="mr-2">스크랩</span>
                    <span>{likeCount}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="mr-2">조회수</span>
                    <span>{view_count}</span>
                  </div>
                  <Tooltip content="링크 복사하기" className="dark:text-white">
                    <ActionButton
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      aria-label="법안 링크 복사"
                      onClick={handleCopyClipBoard}>
                      <IconExport />
                    </ActionButton>
                  </Tooltip>
                </div>

                <ActionButton asChild variant="secondary" className="min-w-[88px]">
                  <Link href={`/bill/${bill_id}`} aria-label="자세히 보기">
                    <BillDetailLinkLabel />
                  </Link>
                </ActionButton>
              </CardFooter>
            )}

            {detail && (
              <CardFooter className="flex items-center justify-between p-0 mt-10">
                <div className="flex gap-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <ActionButton
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 p-0"
                      aria-label={bookmarkLabel}
                      aria-pressed={bookmarkChecking || needsBookmarkCheck ? undefined : isLiked}
                      disabled={bookmarkChecking || mutateBookmark.isPending}
                      onClick={onClickScrab}>
                      <IconScrabSmall isActive={isLiked && !bookmarkChecking && !needsBookmarkCheck} />
                    </ActionButton>
                    <span className="mr-2">스크랩</span>
                    <span>{likeCount}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="mr-2">조회수</span>
                    <span>{detailViewCount}</span>
                  </div>
                </div>
                <Tooltip content="링크 복사하기">
                  <ActionButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label="법안 링크 복사"
                    onClick={handleCopyClipBoard}>
                    <IconExport />
                  </ActionButton>
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
            className={`flex flex-row h-[78px] mx-5 border-1.5 items-center justify-between px-[18px] dark:bg-gray-4 lg:max-w-full md:float-right ${detail ? 'md:w-[300px] lg:w-[490px] lg:float-left' : 'md:w-[410px] lg:w-[460px] lg:mr-6'} ${proposerCardBorderClassName}`}
            radius="sm"
            shadow="none">
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
                    showFallback
                    name={representative_proposer_dto_list[0].representative_proposer_name}
                    getInitials={(name) => name.slice(0, 1)}
                    src={
                      representative_proposer_dto_list[0].represent_proposer_img_url
                        ? `${process.env.NEXT_PUBLIC_IMAGE_URL}${representative_proposer_dto_list[0].represent_proposer_img_url}`
                        : undefined
                    }
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
