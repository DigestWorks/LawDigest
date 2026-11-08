import Image from 'next/image';
import type { ReactNode } from 'react';
import { FaApple } from 'react-icons/fa';
import { Logo } from '@/components';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { loginReturnTo, oauthLoginHref, oauthProviders, type OAuthProvider } from '@/lib/loginNavigation';

type LoginParams = { returnTo?: string | string[]; error?: string | string[] };

const providerImage = (src: string) => <Image src={src} width={22} height={22} alt="" />;

const providerButtons: Record<OAuthProvider, { label: string; icon: ReactNode }> = {
  kakao: { label: '카카오톡으로 시작하기', icon: providerImage('/images/kakao.svg') },
  google: { label: '구글로 시작하기', icon: providerImage('/images/google.svg') },
  naver: { label: '네이버로 시작하기', icon: providerImage('/images/naver.png') },
  // Apple 버튼 문구와 로고 사용은 Apple HIG의 Sign in with Apple 버튼 지침을 따른다.
  apple: { label: 'Apple로 계속하기', icon: <FaApple aria-hidden className="!size-[22px]" /> },
};

export default async function Login({ searchParams }: { searchParams: Promise<LoginParams> }) {
  const params = await searchParams;
  const returnTo = loginReturnTo(typeof params.returnTo === 'string' ? params.returnTo : null);

  return (
    <section className="mx-auto mt-24 flex w-[90%] max-w-[430px] flex-col items-center gap-6 sm:mt-48">
      <h1 className="sr-only">로그인</h1>
      <div className="mb-4">
        <Logo width={222} height={37} />
      </div>
      {params.error && (
        <Alert>
          <AlertDescription className="break-keep">
            {params.error === 'cancelled'
              ? '로그인을 취소했습니다. 아래에서 다시 시작할 수 있습니다.'
              : '로그인을 완료하지 못했습니다. 아래에서 다시 시도해 주세요.'}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex w-full flex-col gap-4">
        {oauthProviders().map((provider) => (
          <Button key={provider} asChild variant="outline" className="h-[58px] w-full rounded-full">
            <a href={oauthLoginHref(provider, returnTo)}>
              {providerButtons[provider].icon}
              {providerButtons[provider].label}
            </a>
          </Button>
        ))}
      </div>
    </section>
  );
}
