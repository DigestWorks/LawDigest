'use client';

import { useCallback, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { IconArrowUp } from '@/public/svgs';
import { Button } from '@/components/ui/button';

export default function GoToTopButton() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    const { scrollY } = window;

    if (scrollY > 400) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);

  const onClickGoToTopButton = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 에이전트 채팅 화면은 하단 채팅 바가 그 자리를 쓴다.
  if (pathname === '/ask') return null;

  return (
    <Button
      type="button"
      size="icon"
      aria-label="맨 위로 이동"
      className={`${isVisible ? '' : 'hidden'} floating-scroll-top z-[42] fixed rounded-full bg-muted/90 bottom-20 right-10 md:right-20`}
      variant="ghost"
      onClick={onClickGoToTopButton}>
      <IconArrowUp />
    </Button>
  );
}
