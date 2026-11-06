'use client';

import { IconControl } from '@/public/svgs';
import { STAGE_TAB_KO } from '@/constants';
import FeedFilterDropdown from '../FeedFilterDropdown';

const STAGE_OPTIONS = ['전체', ...Object.values(STAGE_TAB_KO)].map((stage) => ({ label: stage, value: stage }));

export default function StageDropdown({ type, clickHandler }: { type: string; clickHandler: (value: string) => void }) {
  return (
    <FeedFilterDropdown
      label="법안 처리 단계"
      options={STAGE_OPTIONS}
      value={type}
      onChange={clickHandler}
      icon={<IconControl />}
    />
  );
}
