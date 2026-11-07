'use client';

import { useCallback, useState, useEffect } from 'react';
import { IconArrowUp } from '@/public/svgs';
import { Button } from '@/components/ui/button';

export default function GoToTopButton() {
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
