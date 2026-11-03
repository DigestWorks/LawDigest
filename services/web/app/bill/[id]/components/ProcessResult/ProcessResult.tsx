'use client';

import { Card, CardHeader, CardBody } from '@heroui/react';
import HalfDonutChart from '@/components/common/Chart/HalfDonutChart';
import { billResultLabel, stageStatus } from '@/lib/billStage';
import { BillResponse } from '@/types';
import { Separator } from '@/components/ui/separator';
import VoteResultBoard from './VoteResultBoard';

type PartyVotes = NonNullable<BillResponse['vote_result_response']>['party_vote_list'];
type Props = {
  bill_result?: string | null;
  billStage?: string;
  approval_count: number | null;
  total_vote_count: number | null;
  party_vote_list: PartyVotes;
};
const resultDescriptions: Record<string, string> = {
  대안반영폐기: '이 법안의 내용이 위원회 대안에 반영되어 처리가 종료되었습니다.',
  임기만료폐기: '국회의원 임기가 만료되어 이 법안의 처리가 종료되었습니다.',
  철회: '발의자가 이 법안을 철회했습니다.',
  폐기: '이 법안의 처리가 종료되었습니다.',
};

export default function ProcessResult({
  bill_result,
  billStage = '',
  approval_count,
  total_vote_count,
  party_vote_list,
}: Props) {
  const result = billResultLabel(bill_result) || stageStatus(billStage).terminal;
  if (!result)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {billStage === '공포' || billStage === '정부이송'
          ? '처리 결과 기록을 확인하고 있습니다.'
          : '아직 본회의 처리 결과가 없습니다.'}
      </p>
    );

  const voted = ['원안가결', '수정가결', '부결'].includes(result);
  const missing = approval_count === null || total_vote_count === null;
  const valid =
    typeof approval_count === 'number' &&
    typeof total_vote_count === 'number' &&
    Number.isInteger(approval_count) &&
    Number.isInteger(total_vote_count) &&
    total_vote_count > 0 &&
    approval_count >= 0 &&
    approval_count <= total_vote_count;
  const partiesValid =
    party_vote_list.every((row) => Number.isInteger(row.party_approval_count) && row.party_approval_count >= 0) &&
    party_vote_list.reduce((sum, row) => sum + row.party_approval_count, 0) <= (approval_count ?? 0);

  return (
    <Card className="border border-border p-5 shadow-none">
      <CardHeader className="justify-center">
        <p className="text-lg font-semibold">{result}</p>
      </CardHeader>
      <CardBody className="flex flex-col items-center gap-4 p-0 text-center">
        {!voted && (
          <p>
            {resultDescriptions[result] ||
              (stageStatus('', result).terminal
                ? '이 법안의 처리가 종료되었습니다.'
                : '처리 결과 기록을 확인하고 있습니다.')}
          </p>
        )}
        {voted && !valid && (
          <p className="text-sm text-muted-foreground">
            {missing ? '본회의 표결 기록 미수집' : '표결 수치를 확인하고 있습니다.'}
          </p>
        )}
        {voted && valid && typeof approval_count === 'number' && typeof total_vote_count === 'number' && (
          <>
            <HalfDonutChart
              billResult={result}
              approvalCount={approval_count}
              totalVoteCount={total_vote_count}
              partyVoteList={partiesValid ? party_vote_list : []}
            />
            <p className="text-sm">
              찬성 {approval_count.toLocaleString()}표 · 총 투표 {total_vote_count.toLocaleString()}표
            </p>
            <Separator />
            {party_vote_list.length > 0 && partiesValid ? (
              <VoteResultBoard party_vote_list={party_vote_list} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {party_vote_list.length ? '정당별 표결 수치를 확인하고 있습니다.' : '정당별 표결 기록 미수집'}
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
