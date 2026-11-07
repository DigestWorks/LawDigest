import Image from 'next/image';
import getPartyLogoSrc from '@/utils/getPartyLogoSrc';

/**
 * 서버에서 렌더링한 화면은 수화할 때 `src`를 고치지 않으므로, 두 이미지를 함께 두고 CSS로 전환한다.
 */
export default function ThemedPartyLogo({
  imageUrl,
  width,
  height,
  alt,
  className = '',
  onError,
}: {
  imageUrl: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
  onError?: () => void;
}) {
  const light = getPartyLogoSrc(imageUrl, false) as string;
  const dark = getPartyLogoSrc(imageUrl, true) as string;
  const shared = { width, height, onError };
  if (light === dark) return <Image {...shared} src={light} alt={alt} className={className} />;
  return (
    <>
      <Image {...shared} src={light} alt={alt} className={`${className} dark:hidden`} />
      <Image {...shared} src={dark} alt={alt} className={`${className} hidden dark:block`} />
    </>
  );
}
