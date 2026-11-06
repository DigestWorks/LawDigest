'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { IconDarkMode, IconLightMode } from '@/public/svgs';

export default function ThemeSwitchButton() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  const onClick = () => {
    if (isDark) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-muted-foreground [&_svg]:size-6"
      onClick={onClick}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}>
      {isDark ? <IconDarkMode /> : <IconLightMode />}
    </Button>
  );
}
