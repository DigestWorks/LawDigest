import { atom } from 'jotai';
import type { Assembly, RagAnswer, RagMode, RagStep } from '@/lib/rag';
import { searchDraftState } from './SearchEntryState';

export type RagTurn = {
  id: string;
  question: string;
  assembly: Assembly;
  mode?: RagMode;
  steps?: RagStep[];
  status: 'pending' | 'answered' | 'failed' | 'cancelled';
  answer?: RagAnswer;
  error?: string;
  retryAt?: number;
};

// 새로고침하면 사라진다. 질문·답변을 URL, localStorage, 서비스 DB에 저장하지 않는다.
export const ragConversationState = atom<RagTurn[]>([]);
export const ragDraftState = searchDraftState;
export const ragAssemblyState = atom<Assembly>(22);
export const ragModeState = atom<RagMode>('chat');
export type RagSubmission = { id: string; question: string; mode: RagMode };
export const ragSubmissionState = atom<RagSubmission | null>(null);
export const ragCancelState = atom(0);
export const ragPendingState = atom((get) => get(ragConversationState).some((turn) => turn.status === 'pending'));
