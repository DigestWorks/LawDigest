import { ExternalLink } from 'lucide-react';

export default function BillSource({
  billId,
  generated,
  detail = false,
}: {
  billId: string;
  generated: boolean;
  detail?: boolean;
}) {
  return (
    <div className="mb-3 flex flex-col gap-1 text-xs leading-5 text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-foreground">{generated ? 'AI 요약' : '국회 제안이유·주요 내용'}</span>
        <a
          href={`https://likms.assembly.go.kr/bill/billDetail.do?billId=${encodeURIComponent(billId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground">
          국회 원문 <ExternalLink aria-hidden="true" className="size-3" />
          <span className="sr-only">새 창</span>
        </a>
      </div>
      {detail && generated && <p>세부 조문과 제안 내용은 국회 원문에서 확인할 수 있습니다.</p>}
    </div>
  );
}
