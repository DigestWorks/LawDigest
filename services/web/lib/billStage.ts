import { PROGRESS_STAGE_KO } from '@/constants';

export const progressStages: readonly string[] = Object.values(PROGRESS_STAGE_KO);
const endings = new Set(['철회', '부결', '임기만료폐기', '대안반영폐기', '폐기', '반려', '부의안건철회']);

export function stageStatus(stage: string, result?: string | null) {
  const ending = result && endings.has(result) ? result : null;
  const terminal = ending ?? (endings.has(stage) ? stage : null);
  const index = progressStages.indexOf(stage);
  return { terminal, index, label: stage === '체계자구 심사' ? '체계·자구 심사' : stage };
}
