export type Assembly = 0 | 21 | 22;
export type RagStatus = {
  available: boolean;
  indexed_bills: number;
  available_bills: number;
  data_as_of: string | null;
  index_as_of: string | null;
  index_latest_proposal: string | null;
  lagging: boolean;
};
export type RagSource = {
  key: string;
  bill_id: string;
  bill_name: string;
  assembly: number;
  propose_date: string;
  stage: string;
  result: string | null;
  excerpt: string;
  detail_url: string;
  official_url: string;
};
export type RagAnswer = {
  status: 'answered' | 'insufficient_evidence';
  paragraphs: { text: string; source_keys: string[] }[];
  sources: RagSource[];
  limitations: string[];
  metadata: RagStatus;
};
export type RagPrior = { question: string; source_ids: string[]; assembly: Assembly };
export type RagRequest = { question: string; assembly: Assembly; history: RagPrior[] };
export const unavailableStatus: RagStatus = {
  available: false,
  indexed_bills: 0,
  available_bills: 0,
  data_as_of: null,
  index_as_of: null,
  index_latest_proposal: null,
  lagging: false,
};

export function isRagRequest(value: unknown): value is RagRequest {
  if (!value || typeof value !== 'object') return false;
  const request = value as RagRequest;
  if (Object.keys(request).some((key) => !['question', 'assembly', 'history'].includes(key))) return false;
  return (
    typeof request.question === 'string' &&
    request.question.trim().length >= 2 &&
    request.question.length <= 1000 &&
    [0, 21, 22].includes(request.assembly) &&
    Array.isArray(request.history) &&
    request.history.length <= 4 &&
    request.history.every(
      (turn) =>
        turn &&
        Object.keys(turn).every((key) => ['question', 'source_ids', 'assembly'].includes(key)) &&
        typeof turn.question === 'string' &&
        turn.question.trim().length >= 2 &&
        turn.question.length <= 1000 &&
        [0, 21, 22].includes(turn.assembly) &&
        Array.isArray(turn.source_ids) &&
        turn.source_ids.length <= 8 &&
        turn.source_ids.every((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id)),
    )
  );
}

export function isRagAnswer(value: unknown): value is RagAnswer {
  if (!value || typeof value !== 'object') return false;
  const answer = value as RagAnswer;
  if (
    !['answered', 'insufficient_evidence'].includes(answer.status) ||
    !answer.metadata ||
    typeof answer.metadata.available !== 'boolean' ||
    !Array.isArray(answer.sources) ||
    answer.sources.length > 8 ||
    !Array.isArray(answer.paragraphs) ||
    answer.paragraphs.length > 8 ||
    !Array.isArray(answer.limitations) ||
    answer.limitations.length > 3 ||
    !answer.limitations.every((text) => typeof text === 'string' && text.length <= 2000)
  )
    return false;
  if (
    !answer.sources.every(
      (source) =>
        source &&
        typeof source.key === 'string' &&
        typeof source.bill_id === 'string' &&
        /^[A-Za-z0-9_-]{1,100}$/.test(source.bill_id) &&
        ['bill_name', 'propose_date', 'stage', 'excerpt'].every(
          (key) => typeof source[key as keyof RagSource] === 'string',
        ),
    )
  )
    return false;
  const keys = new Set(answer.sources.map((source) => source.key));
  return (
    answer.paragraphs.every(
      (p) =>
        p &&
        typeof p.text === 'string' &&
        p.text.trim().length > 0 &&
        p.text.length <= 2000 &&
        Array.isArray(p.source_keys) &&
        p.source_keys.length > 0 &&
        p.source_keys.every((key) => keys.has(key)),
    ) &&
    (answer.status === 'answered'
      ? answer.paragraphs.length > 0 && answer.sources.length > 0
      : answer.paragraphs.length === 0)
  );
}
