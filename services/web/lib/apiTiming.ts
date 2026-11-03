import { isAxiosError } from 'axios';

export const SERVER_API_TIMEOUT_MS = 3000;
export const BROWSER_API_TIMEOUT_MS = 10000;

export function retryTransientApiError(failureCount: number, error: unknown) {
  if (failureCount >= 1 || !isAxiosError(error)) return false;
  if (error.response) return error.response.status >= 500;
  return error.code === 'ERR_NETWORK' || error.code === 'ECONNRESET';
}
