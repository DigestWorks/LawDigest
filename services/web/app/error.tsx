'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components';
import RecoveryState from '@/components/common/RecoveryState';

export default function ErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <Layout logo search>
      <RecoveryState kind="error" retry={retry} retrying={pending} />
    </Layout>
  );
}
