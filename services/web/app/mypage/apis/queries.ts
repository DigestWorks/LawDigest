'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { nextBillPage } from '@/lib/billQueries';
import {
  getUserInfo,
  getFollowingParty,
  getFollowingCongressman,
  getBillBookmarked,
  getBillBookmarkedCount,
} from './apis';

export const useGetUserInfo = () =>
  useQuery({
    queryKey: ['/user/info'],
    queryFn: () => getUserInfo(),
  });

export const useGetFollowingParty = () =>
  useQuery({
    queryKey: ['/user/following/party'],
    queryFn: () => getFollowingParty(),
  });

export const useGetFollowingCongressman = () =>
  useQuery({
    queryKey: ['/user/liking/congressman'],
    queryFn: () => getFollowingCongressman(),
  });

export const useGetBillBookmarked = () =>
  useInfiniteQuery({
    queryKey: ['/user/bookmarking/bill'],
    queryFn: ({ pageParam }: { pageParam: number }) => getBillBookmarked(pageParam),
    initialPageParam: 0,
    getNextPageParam: nextBillPage,
  });

export const useGetBillBookmarkedCount = () =>
  useQuery({
    queryKey: ['/user/bookmarking/bill/count'],
    queryFn: () => getBillBookmarkedCount(),
  });
