'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { RagAnswer as Answer } from '@/lib/rag';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Marker, MarkerContent } from '@/components/ui/marker';

export default function RagAnswer({ answer, turnId }: { answer: Answer; turnId: string }) {
  return (
    <div className="flex flex-col gap-5">
      {answer.status === 'insufficient_evidence' && <p>확인한 법안 자료에서 답변할 근거를 찾지 못했습니다.</p>}
      {answer.paragraphs.map((paragraph, index) => (
        <div key={index} className="flex flex-col gap-2">
          <p className="whitespace-pre-wrap leading-7">{paragraph.text}</p>
          <div className="flex flex-wrap gap-2" aria-label={`${index + 1}번째 문단의 근거`}>
            {paragraph.source_keys.map((key) => {
              const source = answer.sources.find((item) => item.key === key);
              return source ? (
                <Link
                  key={key}
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  href={`#source-${turnId}-${key}`}
                  replace>
                  {key} · {source.bill_name}
                </Link>
              ) : null;
            })}
          </div>
        </div>
      ))}
      {answer.limitations.length > 0 && (
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
          {answer.limitations.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ul>
      )}
      {answer.sources.length > 0 && (
        <section aria-label="답변의 근거 법안" className="flex flex-col gap-3">
          <Marker variant="border">
            <MarkerContent>근거 법안 {answer.sources.length}건</MarkerContent>
          </Marker>
          {answer.sources.map((source) => (
            <article
              id={`source-${turnId}-${source.key}`}
              key={source.key}
              className="flex scroll-mt-6 flex-col gap-2 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{source.key}</Badge>
                <span className="text-xs text-muted-foreground">
                  {source.assembly}대 · {source.propose_date} 발의
                </span>
              </div>
              <Link
                className="font-medium underline-offset-4 hover:underline"
                href={`/bill/${encodeURIComponent(source.bill_id)}`}>
                {source.bill_name}
              </Link>
              <p className="text-xs text-muted-foreground">
                수집된 처리 상태: {source.stage}
                {source.result ? ` · ${source.result}` : ''}
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">근거 원문 보기</summary>
                <blockquote className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap border-l-2 pl-3 leading-6">
                  {source.excerpt}
                </blockquote>
              </details>
              <Button asChild size="sm" variant="ghost" className="self-start">
                <a
                  href={`https://likms.assembly.go.kr/bill/billDetail.do?billId=${encodeURIComponent(source.bill_id)}`}
                  target="_blank"
                  rel="noopener noreferrer">
                  국회 원문 <ExternalLink data-icon="inline-end" />
                  <span className="sr-only">새 창</span>
                </a>
              </Button>
            </article>
          ))}
        </section>
      )}
      <Marker>
        <MarkerContent>
          수집 법안의 최신 발의일 {answer.metadata.data_as_of ?? '확인 중'}
          {answer.metadata.lagging ? ' · 검색 자료 갱신이 지연되고 있습니다.' : ''}
        </MarkerContent>
      </Marker>
    </div>
  );
}
