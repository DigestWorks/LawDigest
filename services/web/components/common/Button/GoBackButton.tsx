'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { IconArrowLeft } from '@/public/svgs';

export default function GoBackButton() {
  const router = useRouter();

  const onClick = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="뒤로 가기"
      onClick={onClick}
      className="[&_svg]:size-6">
      <IconArrowLeft />
    </Button>
  );
}
