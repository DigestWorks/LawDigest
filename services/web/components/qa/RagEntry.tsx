'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useRagStatus } from '@/hooks/useRagConversation';
import { Button } from '@/components/ui/button';

export default function RagEntry({ onNavigate }: { onNavigate: () => void }) {
  const status = useRagStatus();
  if (!status.data?.available) return null;
  return (
    <Button asChild variant="outline" className="justify-start">
      <Link href="/ask" onClick={onNavigate}>
        <MessageCircle data-icon="inline-start" />
        법안에 질문하기
      </Link>
    </Button>
  );
}
