const { HTML_LIMITED_BOT_UA_RE } = require('next/dist/shared/lib/router/utils/html-bots');

/** @type {import('next').NextConfig} */
const imageHostname = process.env.NEXT_PUBLIC_HOSTNAME;
const internalApiOrigin = (process.env.INTERNAL_API_ORIGIN || 'https://api.lawdigest.kr').replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  htmlLimitedBots: new RegExp(`${HTML_LIMITED_BOT_UA_RE.source}|kakaotalk-scrap|KakaoScrap|TelegramBot`, 'i'),
  images: {
    remotePatterns: imageHostname
      ? [
          {
            protocol: 'https',
            hostname: imageHostname,
            port: '',
            pathname: '/**',
          },
        ]
      : [],
    domains: imageHostname ? [imageHostname] : [],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'dev.lawdigest.kr',
        'https://dev.lawdigest.kr',
        'test.lawdigest.kr',
        'https://test.lawdigest.kr',
      ],
    },
  },
  async rewrites() {
    return [
      {
        source: '/sitemap-:kind-:page.xml',
        destination: '/sitemaps/:kind/:page',
      },
      {
        source: '/v1/:path*',
        destination: `${internalApiOrigin}/v1/:path*`,
      },
      {
        source: '/oauth2/:path*',
        destination: `${internalApiOrigin}/oauth2/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
