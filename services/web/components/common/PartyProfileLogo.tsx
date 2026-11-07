'use client';

import { useState } from 'react';
import ThemedPartyLogo from '@/components/common/ThemedPartyLogo';
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
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!imageUrl || failedUrl === imageUrl) return <PartyLogoReplacement partyName={name} circle={large} />;
  return (
    <ThemedPartyLogo
      imageUrl={imageUrl}
      width={large ? 100 : 64}
      height={large ? 45 : 30}
      alt={`${name} 로고`}
      onError={() => setFailedUrl(imageUrl)}
      className={large ? 'h-[45px] w-[100px] object-contain' : 'h-[30px] w-[64px] object-contain'}
    />
  );
}
