import { Fragment } from 'react';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { LegalBlock, LegalDocumentData, LegalText } from '@/constants/legal';
import { getArchivedDocument } from '@/constants/legalArchive';

const HISTORY_ID = 'history';

const linkClass = 'underline underline-offset-4 hover:text-foreground focus-visible:text-foreground';

function Text({ value }: { value: LegalText }) {
  if (typeof value === 'string') return value;
  return value.map((part, index) =>
    typeof part === 'string' ? (
      <Fragment key={index}>{part}</Fragment>
    ) : (
      <a
        key={index}
        href={part.href}
        className={linkClass}
        {...(part.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {part.text}
      </a>
    ),
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (block.type === 'p') {
    return (
      <p>
        <Text value={block.text} />
      </p>
    );
  }
  if (block.type === 'table') {
    return (
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[520px] break-keep border-collapse border-y border-border text-left text-sm leading-6">
          <caption className="sr-only">{block.caption}</caption>
          <thead>
            <tr className="border-b border-border">
              {block.head.map((cell) => (
                <th key={cell} scope="col" className="py-2.5 pr-4 font-semibold text-foreground">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border last:border-b-0">
                {row.map((cell, cellIndex) =>
                  cellIndex === 0 ? (
                    <th
                      key={cellIndex}
                      scope="row"
                      className="min-w-[7.5rem] py-2.5 pr-4 align-top font-medium text-foreground">
                      <Text value={cell} />
                    </th>
                  ) : (
                    <td key={cellIndex} className="py-2.5 pr-4 align-top">
                      <Text value={cell} />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const List = block.type;
  return (
    <List className={`flex flex-col gap-2 pl-5 ${List === 'ol' ? 'list-decimal' : 'list-disc'} marker:text-gray-2`}>
      {block.items.map((item, index) => (
        <li key={index} className="pl-1">
          <Text value={item} />
        </li>
      ))}
    </List>
  );
}

function Contents({ document }: { document: LegalDocumentData }) {
  return (
    <ol className="flex flex-col text-sm">
      {document.sections.map((section) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="block rounded-sm py-1.5 text-muted-foreground hover:text-foreground focus-visible:text-foreground">
            {section.title}
          </a>
        </li>
      ))}
      <li>
        <a
          href={`#${HISTORY_ID}`}
          className="block rounded-sm py-1.5 text-muted-foreground hover:text-foreground focus-visible:text-foreground">
          개정 이력
        </a>
      </li>
    </ol>
  );
}

function History({ document, current }: { document: LegalDocumentData; current: LegalDocumentData }) {
  return (
    <section id={HISTORY_ID} aria-labelledby={`${HISTORY_ID}-title`} className="scroll-mt-6">
      <h2 id={`${HISTORY_ID}-title`} className="mb-3 text-lg font-semibold text-foreground">
        개정 이력
      </h2>
      <ol className="flex flex-col border-y border-border text-sm">
        {current.history.map((revision, index) => {
          const latest = index === 0;
          const viewing = revision.effectiveDateTime === document.effectiveDateTime;
          const href = latest
            ? current.path
            : getArchivedDocument(current.kind, revision.effectiveDateTime) &&
              `${current.path}/${revision.effectiveDateTime}`;
          const date = <time dateTime={revision.effectiveDateTime}>{revision.effectiveDate}</time>;
          return (
            <li
              key={revision.effectiveDateTime}
              aria-current={viewing ? 'page' : undefined}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border py-3 last:border-b-0">
              <span className={`min-w-[9rem] ${viewing ? 'font-semibold text-foreground' : ''}`}>
                {href && !viewing ? (
                  <Link href={href} className="underline underline-offset-4 hover:text-foreground">
                    {date}
                  </Link>
                ) : (
                  date
                )}
              </span>
              <span className="flex-1">{revision.summary}</span>
              {latest && <Badge variant="outline">현재 버전</Badge>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** current를 넘기면 document를 보관된 이전 버전으로 보여 준다. */
export default function LegalDocument({
  document,
  current = document,
}: {
  document: LegalDocumentData;
  current?: LegalDocumentData;
}) {
  const archived = current !== document;
  return (
    <article className="mx-auto w-full max-w-[1040px] px-5 py-8 lg:py-12">
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <h1 className="text-[26px] font-semibold leading-tight">{document.title}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <span>
            시행일 <time dateTime={document.effectiveDateTime}>{document.effectiveDate}</time>
          </span>
          {archived && (
            <>
              <Badge variant="secondary">이전 버전</Badge>
              <Link href={current.path} className="font-medium text-foreground underline underline-offset-4">
                현재 버전 보기
              </Link>
            </>
          )}
        </p>
      </header>

      <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
        <details className="group mb-8 border-b border-border pb-4 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
            목차
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <nav aria-label="목차" className="pt-1">
            <Contents document={document} />
          </nav>
        </details>

        <aside className="hidden lg:block">
          <nav aria-label="목차" className="sticky top-8">
            <Contents document={document} />
          </nav>
        </aside>

        <div className="flex max-w-[68ch] flex-col gap-10 break-keep text-[15px] leading-7 text-muted-foreground">
          {document.intro && (
            <p className="text-foreground">
              <Text value={document.intro} />
            </p>
          )}
          {document.sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-6">
              <h2 id={`${section.id}-title`} className="mb-3 text-lg font-semibold text-foreground">
                {section.title}
              </h2>
              <div className="flex flex-col gap-3">
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </div>
            </section>
          ))}
          <p className="border-t border-border pt-6 text-sm">{document.closing}</p>
          <History document={document} current={current} />
        </div>
      </div>
    </article>
  );
}
