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
  /** "김종양 의원", "김종양 의원 외 1인" */
  proposer_label?: string | null;
  /** 단독 대표발의일 때만 있다. 정당색 포인트와 발의자 카드에 쓴다. */
  representative?: RagRepresentative | null;
};
export type RagRepresentative = {
  name: string;
  congressman_id: string;
  image_url: string | null;
  party: string | null;
  party_id: number | null;
  party_image_url: string | null;
};
export type RagAnswer = {
  status: 'answered' | 'insufficient_evidence' | 'searched';
  paragraphs: { text: string; source_keys: string[] }[];
  sources: RagSource[];
  limitations: string[];
  metadata: RagStatus;
};
export type RagPrior = { question: string; source_ids: string[]; assembly: Assembly };
export type RagRequest = { question: string; assembly: Assembly; history: RagPrior[] };
export type RagMode = 'chat' | 'search';
export type RagStep = {
  id: string;
  name: 'search' | 'read' | 'answer';
  status: 'running' | 'complete';
  summary: string;
};
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

const optionalText = (value: unknown, max: number) =>
  value === undefined || value === null || (typeof value === 'string' && value.length <= max);
// 의원 사진·정당 로고는 이미지 서버의 상대 경로만 받는다.
const optionalImagePath = (value: unknown) =>
  value === undefined || value === null || (typeof value === 'string' && /^\/[A-Za-z0-9/_.-]{1,200}$/.test(value));

function isRepresentative(value: unknown) {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'object') return false;
  const item = value as RagRepresentative;
  return (
    typeof item.name === 'string' &&
    item.name.length > 0 &&
    item.name.length <= 40 &&
    typeof item.congressman_id === 'string' &&
    /^[A-Za-z0-9_-]{1,40}$/.test(item.congressman_id) &&
    optionalText(item.party, 40) &&
    (item.party_id === undefined || item.party_id === null || Number.isSafeInteger(item.party_id)) &&
    optionalImagePath(item.image_url) &&
    optionalImagePath(item.party_image_url)
  );
}

export function isRagAnswer(value: unknown): value is RagAnswer {
  if (!value || typeof value !== 'object') return false;
  const answer = value as RagAnswer;
  if (
    !['answered', 'insufficient_evidence', 'searched'].includes(answer.status) ||
    !answer.metadata ||
    typeof answer.metadata.available !== 'boolean' ||
    typeof answer.metadata.lagging !== 'boolean' ||
    !['indexed_bills', 'available_bills'].every(
      (key) =>
        Number.isSafeInteger(answer.metadata[key as keyof RagStatus]) &&
        Number(answer.metadata[key as keyof RagStatus]) >= 0,
    ) ||
    !['data_as_of', 'index_as_of', 'index_latest_proposal'].every(
      (key) =>
        answer.metadata[key as keyof RagStatus] === null || typeof answer.metadata[key as keyof RagStatus] === 'string',
    ) ||
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
        /^S[1-8]$/.test(source.key) &&
        [21, 22].includes(source.assembly) &&
        (source.result === null || typeof source.result === 'string') &&
        typeof source.bill_id === 'string' &&
        /^[A-Za-z0-9_-]{1,100}$/.test(source.bill_id) &&
        ['bill_name', 'propose_date', 'stage', 'excerpt'].every(
          (key) =>
            typeof source[key as keyof RagSource] === 'string' &&
            String(source[key as keyof RagSource]).length <= 12000,
        ) &&
        optionalText(source.proposer_label, 80) &&
        isRepresentative(source.representative),
    )
  )
    return false;
  const keys = new Set(answer.sources.map((source) => source.key));
  return (
    keys.size === answer.sources.length &&
    new Set(answer.sources.map((source) => source.bill_id)).size === answer.sources.length &&
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
      : answer.paragraphs.length === 0 && (answer.status === 'searched' || answer.sources.length === 0))
  );
}

export function isRagStep(value: unknown): value is RagStep {
  if (!value || typeof value !== 'object') return false;
  const step = value as RagStep;
  return (
    typeof step.id === 'string' &&
    /^[1-5]$/.test(step.id) &&
    ['search', 'read', 'answer'].includes(step.name) &&
    ['running', 'complete'].includes(step.status) &&
    typeof step.summary === 'string' &&
    step.summary.length > 0 &&
    step.summary.length <= 500
  );
}
