import {
  Banknote,
  Building2,
  BusFront,
  BriefcaseBusiness,
  Leaf,
  HandHeart,
  HeartPulse,
  GraduationCap,
  Users,
  Factory,
  Bot,
  Tractor,
  Palette,
  Siren,
  Vote,
  Globe2,
  Gavel,
  CircleHelp,
  Shapes,
  type LucideIcon,
} from 'lucide-react';
/**
 * 분야(category) taxonomy 미러 — 백엔드 category 코드와 1:1.
 * 진실원: output/tab-prototypes/FIELD_TAXONOMY.md (v4), services/ai/.../category_taxonomy.py
 */
export interface CategoryMeta {
  code: string;
  label: string;
  icon: LucideIcon;
  color: string; // 분야 고유 색 (hex) — 아이콘/도넛/차트에 공통 사용
}

export const CATEGORIES: CategoryMeta[] = [
  { code: 'economy', label: '경제·세금', icon: Banknote, color: '#0088FF' },
  { code: 'housing', label: '부동산·주거', icon: Building2, color: '#F59E0B' },
  { code: 'transport', label: '교통·물류', icon: BusFront, color: '#0EA5E9' },
  { code: 'labor', label: '일자리·노동', icon: BriefcaseBusiness, color: '#16A34A' },
  { code: 'environment', label: '환경·기후·에너지', icon: Leaf, color: '#059669' },
  { code: 'welfare', label: '복지·연금', icon: HandHeart, color: '#14B8A6' },
  { code: 'health', label: '보건·의료', icon: HeartPulse, color: '#DB2777' },
  { code: 'education', label: '교육', icon: GraduationCap, color: '#7C3AED' },
  { code: 'family', label: '가족·청소년', icon: Users, color: '#F97316' },
  { code: 'industry', label: '산업·중소기업', icon: Factory, color: '#2563EB' },
  { code: 'tech', label: '과학·디지털·AI', icon: Bot, color: '#0891B2' },
  { code: 'agriculture', label: '농림·축산·수산', icon: Tractor, color: '#65A30D' },
  { code: 'culture', label: '문화·예술·체육', icon: Palette, color: '#C026D3' },
  { code: 'safety', label: '안전·재난·치안', icon: Siren, color: '#DC2626' },
  { code: 'politics', label: '정치·행정', icon: Vote, color: '#4F46E5' },
  { code: 'diplomacy', label: '외교·국방', icon: Globe2, color: '#475569' },
  { code: 'justice', label: '사법·범죄', icon: Gavel, color: '#0D9488' },
];

export const UNKNOWN_CATEGORY: CategoryMeta = {
  code: 'unknown',
  label: '미분류',
  icon: CircleHelp,
  color: '#999999',
};

const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  [...CATEGORIES, UNKNOWN_CATEGORY].map((c) => [c.code, c]),
);

export const isCategoryCode = (code: string | null | undefined): code is string =>
  Boolean(code && Object.prototype.hasOwnProperty.call(CATEGORY_MAP, code));

export const getCategoryMeta = (code?: string | null): CategoryMeta => {
  if (!code) return UNKNOWN_CATEGORY;
  return isCategoryCode(code) ? CATEGORY_MAP[code] : { code, label: code, icon: Shapes, color: '#0088FF' };
};
