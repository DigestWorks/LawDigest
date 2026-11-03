'use client';

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';
import { IconControl } from '@/public/svgs';
import { STAGE_TAB_KO } from '@/constants';

export default function StageDropdown({ type, clickHandler }: { type: string; clickHandler: (value: string) => void }) {
  const stages = ['전체', ...Object.values(STAGE_TAB_KO)];
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button endContent={<IconControl />} className="text-sm font-medium bg-transparent">
          {type}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="법안 처리 단계"
        variant="flat"
        disallowEmptySelection
        selectionMode="single"
        selectedKeys={new Set([type])}
        onSelectionChange={(keys) => {
          if (keys !== 'all') {
            const value = Array.from(keys)[0];
            if (typeof value === 'string') clickHandler(value);
          }
        }}>
        {stages.map((stage) => (
          <DropdownItem key={stage}>{stage}</DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
