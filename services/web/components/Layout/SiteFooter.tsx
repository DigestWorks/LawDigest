import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

const linkClass =
  'inline-flex min-h-11 items-center gap-1.5 underline-offset-4 hover:underline focus-visible:underline';

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-background px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-4 text-sm text-muted-foreground md:pb-4">
      <nav aria-label="서비스 정보" className="mx-auto flex max-w-5xl xl:max-w-[1224px] flex-wrap items-center gap-x-5">
        <Link href="/about" className={linkClass}>
          서비스 소개
        </Link>
        <a
          className={linkClass}
          href="https://likms.assembly.go.kr/bill/bi/main/mainPage.do"
          target="_blank"
          rel="noopener noreferrer">
          국회 의안정보시스템 <ExternalLink className="size-3.5" aria-hidden="true" />
          <span className="sr-only">새 창</span>
        </a>
      </nav>
    </footer>
  );
}
