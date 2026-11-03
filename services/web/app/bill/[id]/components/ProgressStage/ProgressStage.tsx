import { stageStatus, progressStages } from '@/lib/billStage';
import { isoDateOnly, koreanDateLabel } from '@/lib/dataFreshness';
import { IconChecked, IconKebab, IconPointed } from '@/public/svgs';

export default function ProgressStage({
  billStage,
  billResult,
  stageDates = [],
}: {
  billStage: string;
  billResult?: string | null;
  stageDates?: { stage: string; date: string }[];
}) {
  const { index: current, terminal, label } = stageStatus(billStage, billResult);
  if (current < 0)
    return (
      <div className="flex flex-col gap-2 text-center">
        <p className="font-semibold">{terminal || label || '단계 정보 확인 중'}</p>
        <p className="text-sm text-muted-foreground">
          {terminal ? '이 법안의 처리가 종료되었습니다.' : '현재 단계 기록을 확인하고 있습니다.'}
        </p>
      </div>
    );
  return (
    <div className="flex flex-col items-center gap-4">
      {terminal && <p className="font-semibold">{terminal} · 처리 종료</p>}
      <ol aria-label={terminal ? '종료 전 기록된 진행 단계' : '법안 심사 진행 단계'}>
        {progressStages.map((stage, index) => {
          let text = 'text-muted-foreground';
          if (index === current) text = 'text-foreground';
          const stageLabel = stage === '체계자구 심사' ? '체계·자구 심사' : stage;
          const recordedDate = stageDates.find((event) => event.stage === stage)?.date;
          const dateLabel = koreanDateLabel(recordedDate);
          let marker = (
            <span className="flex size-5 items-center justify-center rounded-full border border-border text-xs">
              {index + 1}
            </span>
          );
          if (index < current) marker = <IconChecked />;
          else if (index === current) marker = <IconPointed />;
          return (
            <li
              key={stage}
              aria-current={!terminal && index === current ? 'step' : undefined}
              className={`text-sm font-medium ${text}`}>
              <div className="flex items-center gap-5">
                <span aria-hidden="true">{marker}</span>
                <span>STEP {String(index + 1).padStart(2, '0')}</span>
                <span className="flex flex-col gap-1">
                  {stageLabel}
                  {dateLabel && (
                    <time className="text-xs text-muted-foreground" dateTime={isoDateOnly(recordedDate) ?? undefined}>
                      {dateLabel}
                    </time>
                  )}
                </span>
              </div>
              {index < progressStages.length - 1 && (
                <span aria-hidden="true">
                  <IconKebab isPassed={index < current} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
