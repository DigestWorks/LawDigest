import '@/styles/globals.css';
import '@/styles/mobile-floating-nav.css';
import { Metadata, Viewport } from 'next';
import { siteConfig } from '@/config/site';
import getMetadata from '@/utils/getMetadata';
import clsx from 'clsx';
import Script from 'next/script';
import { QueryClientProvider, HeroUIProvider, NextThemesProvider, StateProvider } from '@/lib/provider';
import { GoToTopButton, Snackbar } from '@/components';
import SearchModal from '@/components/common/SearchBar/SearchModal';
import Nav from '@/components/Layout/Nav/Nav';
import SiteFooter from '@/components/Layout/SiteFooter';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  ...getMetadata(),
  title: { default: siteConfig.title, template: `%s | ${siteConfig.title}` },
};

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard-dynamic-subset.css"
        />
        {process.env.NODE_ENV === 'development' && (
          <Script src="//unpkg.com/react-grab/dist/index.global.js" crossOrigin="anonymous" strategy="lazyOnload" />
        )}
      </head>
      <body className={clsx('text-black bg-white dark:bg-dark-b dark:lg:bg-dark-pb dark:text-white antialiased')}>
        <StateProvider>
          <QueryClientProvider>
            <NextThemesProvider>
              <HeroUIProvider>
                <div className="relative flex flex-col h-auto min-h-[100dvh] min-w-[360px]">
                  <main className="flex items-center justify-center w-full h-full ">
                    {children}
                    <SearchModal />
                    <Snackbar />
                    <GoToTopButton />
                  </main>
                  <SiteFooter />
                  {/* Nav는 모든 페이지 전환에서 유지되도록 루트 레이아웃에 배치 */}
                  <Nav />
                </div>
              </HeroUIProvider>
            </NextThemesProvider>
          </QueryClientProvider>
        </StateProvider>
      </body>
    </html>
  );
}

export default RootLayout;
