'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { searchBillOptions, searchPeopleOptions } from '@/lib/billQueries';
import { canSearchBills } from '@/lib/search';

export const useGetSearchCongressmanParty = (searchWord: string) =>
  useQuery({ ...searchPeopleOptions(searchWord), enabled: searchWord.trim().length > 0 });

export const useGetSearchBill = (searchWord: string) =>
  useInfiniteQuery({ ...searchBillOptions(searchWord), enabled: canSearchBills(searchWord), retry: false });
