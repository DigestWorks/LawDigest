'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button } from '@heroui/react';

export default function FeedFilterDropdown<T extends string>({
  label,
  options,
  value,
  onChange,
  icon = <ChevronDown aria-hidden="true" className="size-4 shrink-0" />,
}: {
  label: string;
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  icon?: ReactNode;
}) {
  const selected = options.find((option) => option.value === value)?.label ?? value;
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          aria-label={`${label}: ${selected}`}
          endContent={icon}
          radius="full"
          className="h-9 min-w-0 gap-1.5 border border-border bg-transparent px-3 text-sm font-medium text-foreground">
          {selected}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={label}
        variant="flat"
        disallowEmptySelection
        selectionMode="single"
        selectedKeys={new Set([value])}
        onSelectionChange={(keys) => {
          if (keys === 'all') return;
          const next = options.find((option) => keys.has(option.value));
          if (next) onChange(next.value);
        }}>
        {options.map((option) => (
          <DropdownItem key={option.value}>{option.label}</DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
