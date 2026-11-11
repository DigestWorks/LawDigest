'use client';

import { CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { RagAnswer as Answer, RagSource } from '@/lib/rag';
import { billHeadline } from '@/lib/billHeadline';
import { billResultLabel } from '@/lib/billStage';
import { proposalDateLabel } from '@/lib/dataFreshness';
import { getPartyColor } from '@/constants/party';

const sourceId = (turnId: string, key: string) => `source-${turnId}-${key}`;
const sourceNumber = (key: string) => key.replace(/^S/, '');

/** 근거 번호의 바탕은 그 법안 단독 대표발의자의 정당색이다. 공동·위원회·정부 법안은 중립색이다. */
const partyTint = (source: RagSource | undefined) =>
  ({ '--source-party': getPartyColor(source?.representative?.party ?? null) }) as CSSProperties;

function SourceRow({ source, turnId }: { source: RagSource; turnId: string }) {
  const status = billResultLabel(source.result) || source.stage;
  const party = source.representative?.party;
  return (
    <li
      id={sourceId(turnId, source.key)}
      style={partyTint(source)}
      className="flex scroll-mt-32 gap-3.5 border-t border-border py-4 first:border-t-0">
      <span aria-hidden="true" className="ai-source-number mt-0.5 size-[22px] text-xs">
        {sourceNumber(source.key)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link
          href={`/bill/${encodeURIComponent(source.bill_id)}`}
          className="text-[16px] font-semibold leading-snug text-foreground underline-offset-4 [word-break:keep-all] hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
          {billHeadline(source.bill_name)}
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {status && (
            <span className="rounded-lg border border-border px-2 py-[3px] font-semibold text-foreground/80">
              {status}
            </span>
          )}
          <span className="font-semibold">제{source.assembly}대</span>
          <span>{proposalDateLabel(source.propose_date)}</span>
          {source.proposer_label && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              {party && <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[var(--source-party)]" />}
              <span className="truncate">
                {source.proposer_label}
                {party && <span className="sr-only">, {party}</span>}
              </span>
            </span>
          )}
          <a
            href={`https://likms.assembly.go.kr/bill/billDetail.do?billId=${encodeURIComponent(source.bill_id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded underline-offset-4 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            국회 원문
            <ExternalLink aria-hidden="true" className="size-3" />
            <span className="sr-only">(새 창)</span>
          </a>
        </div>
        <details className="group mt-0.5">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            근거가 된 원문
            <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <blockquote className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted px-4 py-3 text-sm leading-6 text-foreground/85">
            {source.excerpt}
          </blockquote>
        </details>
      </div>
    </li>
  );
}

type RagAnswerProps = {
  answer: Answer;
  turnId: string;
  /** 검색 결과 위의 AI 답변처럼, 길면 접어 두고 근거 법안은 펼친 뒤에 보인다. */
  collapsible?: boolean;
};

/**
 * 근거 번호가 붙은 답변과, 같은 번호의 근거 법안 목록.
 * 법안 카드의 '쉬운 요약'처럼 포인트 색(--lawdigest-summary-accent)의 점 목록으로 쓰고 첫 문장에 형광펜을 긋는다.
 */
export default function RagAnswer({ answer, turnId, collapsible = false }: RagAnswerProps) {
  const body = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(!collapsible);
  const clipped = !expanded;
  const showSources = answer.sources.length > 0 && expanded;

  // 접었을 때 높이를 넘는 답만 접는다. 짧은 답에 "더 보기"를 두지 않는다.
  // 문단이 떠오르는 동안에는 translateY만큼 높이가 늘어 보이므로, 애니메이션이 끝나면 다시 잰다.
  const fitsWithoutClip = () => {
    const element = body.current;
    if (!expanded && element && element.scrollHeight <= element.clientHeight + 4) setExpanded(true);
  };
  useLayoutEffect(fitsWithoutClip, [expanded, answer]);

  const revealSource = (key: string) => {
    setExpanded(true);
    requestAnimationFrame(() =>
      document.getElementById(sourceId(turnId, key))?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
  };

  let lead = '';
  if (answer.status === 'insufficient_evidence')
    lead = '확인한 법안에서 답할 근거를 찾지 못했습니다. 법안 이름이나 다른 표현으로 다시 물어보세요.';
  if (answer.status === 'searched')
    lead = answer.sources.length
      ? `관련 법안 ${answer.sources.length}건을 찾았습니다.`
      : '관련 법안을 찾지 못했습니다. 법안 이름이나 다른 표현으로 다시 물어보세요.';

  return (
    <div className="flex flex-col gap-7">
      <div className="relative">
        <div
          ref={body}
          id={`answer-${turnId}`}
          onAnimationEnd={fitsWithoutClip}
          className={`flex flex-col gap-4 text-[16px] leading-[1.8] text-foreground ${clipped ? 'ai-answer-clip' : ''}`}>
          {lead && <p>{lead}</p>}
          {answer.paragraphs.length > 0 && (
            <ul className="ai-reveal lawdigest-summary-list ai-points">
              {answer.paragraphs.map((paragraph, index) => (
                <li key={index} className="whitespace-pre-wrap [word-break:keep-all]">
                  {/* 첫 문단은 답의 요지다. 법안 카드의 핵심 문장처럼 형광펜을 긋는다. */}
                  {index === 0 ? <mark className="lawdigest-summary-mark">{paragraph.text}</mark> : paragraph.text}
                  {paragraph.source_keys.map((key) => {
                    const source = answer.sources.find((item) => item.key === key);
                    if (!source) return null;
                    return (
                      <a
                        key={key}
                        href={`#${sourceId(turnId, key)}`}
                        onClick={(event) => {
                          event.preventDefault();
                          revealSource(key);
                        }}
                        title={billHeadline(source.bill_name)}
                        style={partyTint(source)}
                        className="ai-source-number relative -top-px ml-1 size-[18px] align-middle text-[11px] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                        {sourceNumber(key)}
                        <span className="sr-only">번 근거, {billHeadline(source.bill_name)}</span>
                      </a>
                    );
                  })}
                </li>
              ))}
            </ul>
          )}
          {answer.limitations.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-sm leading-6 text-muted-foreground">
              {answer.limitations.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
          )}
        </div>
        {clipped && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            aria-controls={`answer-${turnId}`}
            className="mt-1 inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            더 보기
            <ChevronDown aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
      {showSources && (
        <section aria-labelledby={`sources-${turnId}`}>
          <h3 id={`sources-${turnId}`} className="lawdigest-summary-heading text-[15px] font-bold text-foreground">
            {answer.status === 'searched' ? '찾은 법안' : '근거 법안'}
          </h3>
          <ol className="mt-2">
            {answer.sources.map((source) => (
              <SourceRow key={source.key} source={source} turnId={turnId} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
