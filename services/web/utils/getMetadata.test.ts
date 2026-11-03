import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { siteConfig } from '@/config/site';
import getMetadata from './getMetadata';

it('공유 메타정보에 실제 PNG 이미지 크기를 기록한다', () => {
  const png = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../public', `.${siteConfig.ogImage}`));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const metadata = getMetadata();
  expect(metadata.openGraph?.images).toMatchObject({ url: siteConfig.ogImage, width, height });
  expect(metadata.twitter?.images).toMatchObject({ url: siteConfig.ogImage, width, height });
});
