'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import getPartyLogoSrc from '@/utils/getPartyLogoSrc';
import { PartyLogoReplacement } from '@/components/common/PartyLogoReplacement';

export default function PartyProfileLogo({
  name,
  imageUrl,
  large = false,
}: {
  name: string;
  imageUrl: string | null | undefined;
  large?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const src = getPartyLogoSrc(imageUrl, resolvedTheme === 'dark');
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return <PartyLogoReplacement partyName={name} circle={large} />;
  return (
    <Image
      src={src}
      width={large ? 100 : 64}
      height={large ? 45 : 30}
      alt={`${name} 로고`}
      onError={() => setFailedSrc(src)}
      className={large ? 'h-[45px] w-[100px] object-contain' : 'h-[30px] w-[64px] object-contain'}
    />
  );
}
