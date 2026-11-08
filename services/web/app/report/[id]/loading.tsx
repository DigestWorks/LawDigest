import { Layout } from '@/components';
import { ReportDetailSkeleton } from '@/components/common/Skeletons';

// 리포트 페이지는 layout.tsx 없이 페이지 안에서 Layout을 그리므로 로딩 화면도 머리글을 함께 그린다.
export default function Loading() {
  return (
    <Layout nav logo notification>
      <ReportDetailSkeleton />
    </Layout>
  );
}
