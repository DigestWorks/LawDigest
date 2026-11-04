'use client';

import { deleteCookie } from 'cookies-next';
import { ACCESS_TOKEN } from '@/constants';

export const handleFailReissueToken = () => {
  if (typeof window === 'undefined') return;

  deleteCookie(ACCESS_TOKEN, { path: '/' });
  if (window.location.hostname === 'lawdigest.kr' || window.location.hostname.endsWith('.lawdigest.kr')) {
    deleteCookie(ACCESS_TOKEN, { path: '/', domain: '.lawdigest.kr' });
  }
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};
