import { TimelineBoard, ListContainer } from './components';
import DataFreshnessNote from '@/components/common/DataFreshnessNote';

export const dynamic = 'force-dynamic';

export default function Timeline() {
  return (
    <section>
      <DataFreshnessNote scope="timeline" className="mx-auto max-w-[1200px] px-5 pt-5" />
      <TimelineBoard />
      <ListContainer />
    </section>
  );
}
