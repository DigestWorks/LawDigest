import { atomWithReset } from 'jotai/utils';

interface SearchModalStateProps {
  show: boolean;
  trigger?: HTMLElement | null;
  keyword?: string;
}

const searchModalState = atomWithReset<SearchModalStateProps>({
  show: false,
});

export default searchModalState;
