import { STAGE_TAB_KO } from '@/constants';

export type FeedContent = 'report' | 'bill' | 'following';

export function feedContent(value: string | null | undefined): FeedContent {
  return value === 'bill' || value === 'following' ? value : 'report';
}

export function feedStage(value: string | null | undefined) {
  return value && (Object.values(STAGE_TAB_KO) as string[]).includes(value) ? value : '';
}
