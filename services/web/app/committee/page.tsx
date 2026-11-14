import { getPublicCommitteeList } from '@/lib/publicDetail';
import { getMetadata } from '@/utils';
import CommitteeIndex from './components/CommitteeIndex';

export const dynamic = 'force-dynamic';

export const metadata = getMetadata({
  title: '위원회',
  description: '제22대 국회 상임위원회와 특별위원회의 소관 법안과 위원을 확인합니다.',
  asPath: '/committee',
});

export default async function CommitteePage() {
  const { data } = await getPublicCommitteeList();

  return (
    <section className="mx-auto w-full max-w-[720px] px-5 pb-28 pt-6 md:pb-16">
      <CommitteeIndex committees={data} />
    </section>
  );
}
