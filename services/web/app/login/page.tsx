import Image from 'next/image';
import Link from 'next/link';
import { Logo } from '@/components';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { loginReturnTo, oauthLoginHref } from '@/lib/loginNavigation';

type LoginParams = { returnTo?: string | string[]; error?: string | string[] };

const providers = [
  { id: 'kakao', label: '카카오톡으로 시작하기', image: '/images/kakao.svg' },
  { id: 'google', label: '구글로 시작하기', image: '/images/google.svg' },
  { id: 'naver', label: '네이버로 시작하기', image: '/images/naver.png' },
] as const;

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
        {providers.map((provider) => (
          <Button key={provider.id} asChild variant="outline" className="h-[58px] w-full rounded-full">
            <a href={oauthLoginHref(provider.id, returnTo)}>
              <Image src={provider.image} width={22} height={22} alt="" />
              {provider.label}
            </a>
          </Button>
        ))}
      </div>
      <p className="break-keep text-center text-sm leading-6 text-muted-foreground">
        시작하면{' '}
        <Link href="/terms" className="font-medium text-foreground underline underline-offset-4">
          이용약관
        </Link>
        에 동의하게 됩니다. 개인정보 처리 내용은{' '}
        <Link href="/privacy" className="font-semibold text-foreground underline underline-offset-4">
          개인정보 처리방침
        </Link>
        에서 확인할 수 있습니다. 만 14세 미만은 가입할 수 없습니다.
      </p>
    </section>
  );
}
