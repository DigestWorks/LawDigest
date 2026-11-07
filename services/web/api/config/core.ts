import axios, {
  type AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
  Method,
  AxiosRequestConfig,
} from 'axios';
import { getCookie } from 'cookies-next';
import { ACCESS_TOKEN, HTTP_METHODS } from '@/constants';
import { BaseResponse } from '@/types';
import { BROWSER_API_TIMEOUT_MS, SERVER_API_TIMEOUT_MS } from '@/lib/apiTiming';
import qs from 'qs';
import { handleFailReissueToken } from '../auth';

const serverApiOrigin = (
  process.env.INTERNAL_API_ORIGIN ??
  process.env.NEXT_PUBLIC_URL ??
  'https://api.lawdigest.kr/'
).replace(/\/+$/, '');

type AuthRetryConfig = InternalAxiosRequestConfig & { authRetried?: boolean };
let refreshRequest: Promise<unknown> | undefined;

const axiosInstance: AxiosInstance = axios.create({
  baseURL: typeof window === 'undefined' ? `${serverApiOrigin}/v1` : '/v1',
  timeout: typeof window === 'undefined' ? SERVER_API_TIMEOUT_MS : BROWSER_API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// OAuth 콜백이 발급한 HttpOnly 재발급 쿠키는 API 호스트에 저장된다.
const refreshClient = axios.create({
  baseURL: `${serverApiOrigin}/v1`,
  timeout: BROWSER_API_TIMEOUT_MS,
  withCredentials: true,
});

axios.defaults.paramsSerializer = (params) => {
  return qs.stringify(params);
};

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const accessToken = getCookie(ACCESS_TOKEN)!;

    if (!accessToken) {
      return config;
    }

    config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: AxiosError) => {
    const config = error.config as AuthRetryConfig | undefined;
    if (error.response?.status !== 401 || !config || config.url === '/auth/reissue/token') {
      return Promise.reject(error);
    }

    if (config.authRetried) {
      handleFailReissueToken();
      return Promise.reject(error);
    }

    config.authRetried = true;
    refreshRequest ??= refreshClient
      .post('/auth/reissue/token')
      .catch((refreshError: unknown) => {
        if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
          handleFailReissueToken();
        }
        throw refreshError;
      })
      .finally(() => {
        refreshRequest = undefined;
      });
    await refreshRequest;
    return axiosInstance.request(config);
  },
);

const createApiMethod =
  (instance: AxiosInstance, method: Method) =>
  <T>(config: AxiosRequestConfig): Promise<BaseResponse<T>> =>
    instance({ ...config, method });

const http = {
  get: createApiMethod(axiosInstance, HTTP_METHODS.get),
  post: createApiMethod(axiosInstance, HTTP_METHODS.post),
  patch: createApiMethod(axiosInstance, HTTP_METHODS.patch),
  put: createApiMethod(axiosInstance, HTTP_METHODS.put),
  delete: createApiMethod(axiosInstance, HTTP_METHODS.delete),
};

export default http;
