import { TimelineBoard, ListContainer } from './components';
import DataFreshnessNote from '@/components/common/DataFreshnessNote';

export const dynamic = 'force-dynamic';

export default function Timeline() {
  return (
    <section>
      <TimelineBoard />
      <DataFreshnessNote scope="timeline" className="mx-auto mt-5 max-w-[1200px] px-5" />
      <ListContainer />
    </section>
  );
}
