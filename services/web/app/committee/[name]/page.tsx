import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { committeeHref, decodeCommitteeParam } from '@/lib/committee';
import { getPublicCommittee } from '@/lib/publicDetail';
import { getMetadata } from '@/utils';
import CommitteeBills from '../components/CommitteeBills';
import CommitteeMembers from '../components/CommitteeMembers';
import CommitteeOutcome from '../components/CommitteeOutcome';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ name: string }> };

async function loadCommittee(params: Props['params']) {
  const name = decodeCommitteeParam((await params).name);
  if (!name) notFound();
  const { data } = await getPublicCommittee(name);
  // 이전 명칭으로 들어오면 현재 명칭 주소로 옮긴다.
  if (data.name !== name) permanentRedirect(committeeHref(data.name));
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const committee = await loadCommittee(params);
  return getMetadata({
    title: committee.name,
    description: `${committee.name} 소관 법안 ${committee.bill_count.toLocaleString()}건, 위원 ${committee.members.length}명`,
    asPath: committeeHref(committee.name),
  });
}

export default async function CommitteeDetailPage({ params }: Props) {
  const committee = await loadCommittee(params);

  return (
    <article className="mx-auto flex w-full max-w-[900px] flex-col gap-12 px-5 pb-28 pt-6 md:pb-16">
      <header className="flex flex-col gap-3">
        <Link
          href="/committee"
          className="w-fit rounded-full border border-gray-1 px-3 py-1 text-[13px] text-gray-3 hover:bg-gray-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-2 dark:border-dark-l dark:text-gray-1 dark:hover:bg-dark-l">
          {committee.type === 'special' ? '특별위원회' : '상임위원회'} 전체
        </Link>
        <h1 className="break-keep text-[26px] font-bold leading-tight text-primary-3 dark:text-gray-0.5">
          {committee.name}
        </h1>
        {committee.former_names.length > 0 && (
          <p className="text-[14px] text-gray-3 dark:text-gray-1">이전 이름 {committee.former_names.join(', ')}</p>
        )}
      </header>

      <CommitteeOutcome
        bills={committee.bill_count}
        passed={committee.passed_count}
        pending={committee.pending_count}
      />

      <CommitteeMembers members={committee.members} />

      <section aria-labelledby="committee-bills" className="flex flex-col gap-2">
        <h2 id="committee-bills" className="text-[20px] font-semibold text-primary-3 dark:text-gray-0.5">
          최근 회부된 법안
        </h2>
        <CommitteeBills name={committee.name} />
      </section>
    </article>
  );
}
