import { highlightParts } from '@/lib/search';

export default function SearchHighlight({ text, keyword }: { text: string; keyword: string }) {
  return (
    <>
      {highlightParts(text, keyword).map((part, index) =>
        part.match ? (
          <mark key={index} className="search-mark">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
