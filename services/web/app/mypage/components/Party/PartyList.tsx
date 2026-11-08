import { SectionEmpty, SectionError, SectionLoading } from '@/components/common/SectionState';
import PartyItem from './PartyItem';
import { useGetFollowingParty } from '../../apis';

export default function PartyList() {
  const query = useGetFollowingParty();
  const parties = query.data?.data;
  let content = <SectionEmpty>팔로우한 정당이 없습니다.</SectionEmpty>;

  if (query.isPending) {
    content = <SectionLoading>팔로우한 정당을 불러오는 중입니다.</SectionLoading>;
  } else if (!parties) {
    content = (
      <SectionError
        message="팔로우한 정당을 불러오지 못했습니다."
        onRetry={() => void query.refetch()}
        pending={query.isFetching}
      />
    );
  } else if (parties.length) {
    content = (
      <div className="grid grid-cols-2 gap-y-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:w-[750px] xl:w-[900px]">
        {parties.map((party) => (
          <PartyItem key={party.party_id} {...party} />
        ))}
      </div>
    );
  }

  return (
    <section className="px-[30px] flex flex-col gap-6">
      <h2 className="text-xl font-semibold">
        팔로우한 정당
        {parties && <span className="text-muted-foreground"> · {parties.length}</span>}
      </h2>
      {content}
    </section>
  );
}
