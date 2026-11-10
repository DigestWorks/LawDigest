import { atom } from 'jotai';

export interface SearchEntryStateProps {
  /** 'auto'는 검색 결과 경로에서만 검색창을 펼친다. */
  open: boolean | 'auto';
  /** 제출한 뒤 첫 결과를 기다리는 검색어 */
  pending: string | null;
  /** 값이 바뀌면 화면에 보이는 검색 입력이 포커스를 받는다. */
  focusToken: number;
}

const searchEntryState = atom<SearchEntryStateProps>({ open: 'auto', pending: null, focusToken: 0 });

export default searchEntryState;

export type SearchMode = 'keyword' | 'search' | 'chat';
export const searchModeState = atom<SearchMode>('keyword');
export const searchDraftState = atom('');
