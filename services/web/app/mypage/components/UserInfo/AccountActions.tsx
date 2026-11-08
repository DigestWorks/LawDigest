'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import WithdrawModal from '@/components/common/Modal/WithdrawModal';
import { useGetBillBookmarkedCount, useGetFollowingCongressman, useGetFollowingParty } from '../../apis';
import LogoutButton from './LogoutButton';

export default function AccountActions() {
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const bookmarks = useGetBillBookmarkedCount();
  const lawmakers = useGetFollowingCongressman();
  const parties = useGetFollowingParty();

  return (
    <section aria-labelledby="account-actions-title" className="flex flex-col gap-4 px-[30px] pb-12">
      <h2 id="account-actions-title" className="text-xl font-semibold">
        계정 관리
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <LogoutButton />
        <WithdrawModal
          isOpen={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          counts={{
            bookmarks: bookmarks.data?.data?.count,
            lawmakers: lawmakers.data?.data?.length,
            parties: parties.data?.data?.length,
          }}
          trigger={
            <Button variant="outline" size="sm">
              회원탈퇴
            </Button>
          }
        />
      </div>
      <nav aria-label="약관과 정책" className="flex flex-wrap gap-x-5 text-sm text-muted-foreground">
        <Link href="/terms" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          이용약관
        </Link>
        <Link
          href="/privacy"
          className="inline-flex min-h-11 items-center font-semibold text-foreground underline-offset-4 hover:underline">
          개인정보 처리방침
        </Link>
      </nav>
    </section>
  );
}
