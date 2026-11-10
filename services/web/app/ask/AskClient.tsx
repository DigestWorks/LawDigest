'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, RotateCcw, Send, Square } from 'lucide-react';
import { useRagConversation, useRagStatus } from '@/hooks/useRagConversation';
import type { Assembly } from '@/lib/rag';
import type { RagTurn } from '@/store/RagConversationState';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupTextarea } from '@/components/ui/input-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Message, MessageContent, MessageHeader } from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Marker, MarkerContent } from '@/components/ui/marker';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import RagAnswer from '@/components/qa/RagAnswer';

function Retry({ turn, retry, disabled }: { turn: RagTurn; retry: () => void; disabled: boolean }) {
  const [waiting, setWaiting] = useState((turn.retryAt ?? 0) > Date.now());
  useEffect(() => {
    const remaining = (turn.retryAt ?? 0) - Date.now();
    setWaiting(remaining > 0);
    if (remaining <= 0) return undefined;
    const timer = setTimeout(() => setWaiting(false), remaining + 10);
    return () => clearTimeout(timer);
  }, [turn.retryAt]);
  return (
    <div className="flex flex-col items-start gap-2">
      {waiting && (
        <p className="text-sm text-muted-foreground">
          다시 요청 가능한 시각:{' '}
          {new Date(turn.retryAt!).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      <Button variant="outline" size="sm" onClick={retry} disabled={disabled || waiting}>
        <RotateCcw data-icon="inline-start" />
        다시 시도
      </Button>
    </div>
  );
}

function stepLabel(complete: boolean, pending: boolean) {
  if (complete) return '완료';
  return pending ? '진행 중' : '중단';
}

export default function AskClient() {
  const { turns, draft, setDraft, assembly, setAssembly, mode, setMode, ask, stop, reset, pending } =
    useRagConversation();
  const status = useRagStatus(assembly);
  const composing = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const invalid = draft.trim().length === 1 || draft.length > 1000;
  const available = status.data?.available === true;
  const send = () => {
    if (!composing.current && available) void ask();
  };
  let announcement = turns.length ? '질문 처리가 끝났습니다. 대화에서 답변과 근거를 확인하세요.' : '';
  if (pending)
    announcement =
      turns.find((turn) => turn.status === 'pending')?.steps?.at(-1)?.summary ?? '법안 원문을 확인하고 있습니다.';
  let emptyTitle = '질의응답을 잠시 사용할 수 없습니다';
  if (available)
    emptyTitle = mode === 'search' ? '관심 있는 주제로 법안을 찾아보세요' : '궁금한 법안 내용을 물어보세요';
  if (status.isPending) emptyTitle = '질문할 자료를 확인하고 있습니다';
  return (
    <div className="mx-auto flex h-[calc(100dvh-64px)] min-h-[480px] max-w-[880px] flex-col gap-4 px-5 pb-28 pt-5 text-foreground md:h-[calc(100dvh-98px)] md:pb-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] font-semibold">법안 검색과 질문</h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'search'
                ? '관심 주제와 관련된 법안을 원문에서 찾습니다.'
                : 'AI가 필요한 법안을 검색하고 원문을 확인해 답합니다.'}
            </p>
          </div>
          {turns.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
                input.current?.focus();
              }}>
              새 대화
            </Button>
          )}
        </div>
        <ToggleGroup
          type="single"
          variant="pill"
          size="sm"
          value={mode}
          disabled={pending}
          aria-label="법안 검색 또는 채팅 선택"
          onValueChange={(value) => {
            if (value === 'chat' || value === 'search') setMode(value);
          }}>
          <ToggleGroupItem value="search">법안 검색</ToggleGroupItem>
          <ToggleGroupItem value="chat">AI 채팅</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ToggleGroup
            type="single"
            variant="pill"
            size="sm"
            value={String(assembly)}
            disabled={pending}
            aria-label="질문에 사용할 법안 대수"
            onValueChange={(value) => {
              if (value) setAssembly(Number(value) as Assembly);
            }}>
            <ToggleGroupItem value="22">22대</ToggleGroupItem>
            <ToggleGroupItem value="21">21대</ToggleGroupItem>
            <ToggleGroupItem value="0">전체</ToggleGroupItem>
          </ToggleGroup>
          {available && (
            <p className="text-xs text-muted-foreground">
              검색 자료 {status.data!.indexed_bills.toLocaleString('ko-KR')}건 · 최신 발의일{' '}
              {status.data!.index_latest_proposal ?? '확인 중'}
            </p>
          )}
        </div>
      </header>
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {status.data?.lagging && (
        <Alert>
          <AlertDescription>
            수집된 법안 중 아직 검색에 반영되지 않은 자료가 있습니다. 최신 원문은 국회 출처에서 확인해 주세요.
          </AlertDescription>
        </Alert>
      )}
      <MessageScrollerProvider defaultScrollPosition="last-anchor">
        <MessageScroller className="flex-1">
          <MessageScrollerViewport aria-label="법안 질문 대화" tabIndex={0}>
            <MessageScrollerContent className="px-1 pb-5" aria-live="off">
              {turns.length === 0 && (
                <MessageScrollerItem messageId="welcome">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <MessageCircle />
                      </EmptyMedia>
                      <EmptyTitle>{emptyTitle}</EmptyTitle>
                      <EmptyDescription>
                        {available
                          ? '법안명이나 관심 주제를 넣으면 더 구체적인 근거를 찾을 수 있습니다.'
                          : '자료 준비가 끝나면 질문할 수 있습니다. 잠시 후 다시 확인해 주세요.'}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      {available ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDraft('청년 주거 지원과 관련된 법안은 어떤 내용을 담고 있나요?');
                            input.current?.focus();
                          }}>
                          청년 주거 지원 법안 알아보기
                        </Button>
                      ) : (
                        <Button variant="outline" disabled={status.isFetching} onClick={() => void status.refetch()}>
                          자료 상태 다시 확인
                        </Button>
                      )}
                    </EmptyContent>
                  </Empty>
                </MessageScrollerItem>
              )}
              {turns.flatMap((turn) => [
                <MessageScrollerItem key={`${turn.id}-question`} messageId={`${turn.id}-question`} scrollAnchor>
                  <Message align="end">
                    <MessageContent>
                      <MessageHeader>
                        {turn.mode === 'search' ? '내 검색' : '내 질문'} ·{' '}
                        {turn.assembly ? `${turn.assembly}대` : '전체 대수'}
                      </MessageHeader>
                      <Bubble align="end">
                        <BubbleContent className="whitespace-pre-wrap">{turn.question}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>,
                <MessageScrollerItem key={`${turn.id}-answer`} messageId={`${turn.id}-answer`}>
                  <Message>
                    <MessageContent>
                      <MessageHeader>모두의입법 AI</MessageHeader>
                      <Bubble variant="ghost">
                        <BubbleContent>
                          {!!turn.steps?.length && (
                            <ul className="mb-4 flex flex-col gap-2" aria-label="법안 확인 과정">
                              {turn.steps.map((step) => (
                                <li key={step.id} className="flex items-start gap-2 text-sm">
                                  <Badge variant="outline">
                                    {stepLabel(step.status === 'complete', turn.status === 'pending')}
                                  </Badge>
                                  <span>{step.summary}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {turn.status === 'pending' && (
                            <div className="flex flex-col gap-3" aria-busy="true">
                              <Marker>
                                <MarkerContent>법안 원문을 확인하고 있습니다…</MarkerContent>
                              </Marker>
                              <Skeleton className="h-4 w-64 max-w-full" />
                              <Skeleton className="h-4 w-48 max-w-full" />
                            </div>
                          )}
                          {turn.status === 'answered' && turn.answer && (
                            <RagAnswer answer={turn.answer} turnId={turn.id} />
                          )}
                          {turn.status === 'failed' && (
                            <div className="flex flex-col gap-3">
                              <Alert variant="destructive">
                                <AlertTitle>답변을 불러오지 못했습니다</AlertTitle>
                                <AlertDescription>{turn.error}</AlertDescription>
                              </Alert>
                              <Retry turn={turn} retry={() => void ask(turn)} disabled={pending || !available} />
                            </div>
                          )}
                          {turn.status === 'cancelled' && (
                            <div className="flex flex-col gap-3">
                              <Marker>
                                <MarkerContent>답변 요청을 중지했습니다.</MarkerContent>
                              </Marker>
                              <Retry turn={turn} retry={() => void ask(turn)} disabled={pending || !available} />
                            </div>
                          )}
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>,
              ])}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}>
        <FieldGroup>
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="bill-question" className="sr-only">
              법안에 관한 질문
            </FieldLabel>
            <InputGroup>
              <InputGroupTextarea
                id="bill-question"
                ref={input}
                rows={2}
                maxLength={1000}
                value={draft}
                aria-invalid={invalid || undefined}
                aria-describedby="question-help"
                placeholder="법안명이나 궁금한 내용을 입력하세요"
                onChange={(event) => setDraft(event.target.value)}
                onCompositionStart={() => {
                  composing.current = true;
                }}
                onCompositionEnd={() => {
                  composing.current = false;
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing &&
                    event.keyCode !== 229 &&
                    !composing.current
                  ) {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              <InputGroupAddon align="block-end" className="justify-between">
                <span className="text-xs text-muted-foreground">{draft.length}/1,000</span>
                {pending ? (
                  <Button type="button" size="sm" variant="outline" onClick={stop}>
                    <Square data-icon="inline-start" />
                    중지
                  </Button>
                ) : (
                  <Button type="submit" size="sm" disabled={!available || draft.trim().length < 2 || invalid}>
                    <Send data-icon="inline-start" />
                    {mode === 'search' ? '검색하기' : '질문하기'}
                  </Button>
                )}
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription id="question-help">
              법안은 제안된 내용이며 현행법과 다를 수 있습니다. 개인정보는 입력하지 마세요. 질문은 답변 생성을 위해
              OpenAI(미국)로 전송됩니다.{' '}
              <Link href="/privacy#overseas" className="underline underline-offset-4 hover:text-foreground">
                국외 이전 안내
              </Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
