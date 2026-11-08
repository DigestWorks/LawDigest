import { Hash, Landmark, ChartNoAxesCombined, type LucideIcon } from 'lucide-react';
export type ExploreTab = 'field' | 'assembly' | 'stats';

export interface ExploreTabMeta {
  key: ExploreTab;
  label: string;
  icon: LucideIcon;
}

export const EXPLORE_TABS: ExploreTabMeta[] = [
  { key: 'field', label: '분야', icon: Hash },
  { key: 'assembly', label: '국회', icon: Landmark },
  { key: 'stats', label: '통계', icon: ChartNoAxesCombined },
];
