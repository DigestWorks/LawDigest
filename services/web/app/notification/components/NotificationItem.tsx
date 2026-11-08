'use client';

import { useTheme } from 'next-themes';
import Link from 'next/link';
import getTimeRemaining from '@/utils/getTimeRemaining';
import { getChairmanProposerInfo } from '@/utils/chairmanProposer';
import getImageSrc from '@/utils/getImageSrc';
import { isGovernmentProposerKind } from '@/utils/governmentProposer';
import type { Notification } from '@/types';
import { Avatar, AvatarGroup, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { IconAlert, IconKebab } from '@/public/svgs';

export default function NotificationItem({
  title,
  content,
  created_date,
  type,
  extra,
  notification_image_url_list,
  target,
  read,
  notification_id,
  onClickRead,
  onClickDelete,
}: Notification & {
  onClickRead: (notificationId: number, isClickByButton: boolean) => void;
  onClickDelete: (notificationId: number) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isBillUpdate = type === 'bill_stage_update' || type === 'bill_result_update';
  const proposerText = notification_image_url_list[0]?.replace(/\.png$/, '');
  const chairman = isBillUpdate ? getChairmanProposerInfo({ proposerKind: extra, proposerText }) : null;
  const isGovernment = isBillUpdate && (isGovernmentProposerKind(extra) || proposerText === '정부');
  const partyImages = notification_image_url_list.flatMap((image) => {
    const separator = image.indexOf(':');
    if (separator < 1) return [];
    const party = image.slice(0, separator);
    const path = image.slice(separator + 1);
    if (!path.startsWith('/') || path.startsWith('//')) return [];
    const themedPath = isDark ? path.replace('wide', 'dark') : path;
    return [{ party, src: getImageSrc(themedPath), alt: `${party} 이미지` }];
  });

  let images = partyImages;
  if (isGovernment) {
    images = [{ party: '', src: '/images/government-logo.png', alt: '정부 로고' }];
  } else if (chairman) {
    images = [{ party: '', src: chairman.logoSrc, alt: chairman.logoAlt }];
  }
  const firstImage = images[0];
  const linkUrl = `${type === 'congressman_party_update' ? 'congressman' : 'bill'}/${target}`;

  return (
    <section className="flex items-center gap-[10px] lg:gap-4">
      <div className="flex items-center gap-1">
        <div className={read ? 'invisible' : ''}>
          <IconAlert />
        </div>

        {images.length <= 1 ? (
          <Avatar
            radius="full"
            src={firstImage?.src}
            alt={firstImage?.alt}
            size="md"
            className="w-[50px] h-[50px]"
            classNames={{
              base: [`${isBillUpdate ? 'bg-white dark:bg-dark-pb p-1' : ''} border ${firstImage?.party ?? ''}`],
              img: [`${isBillUpdate ? 'object-contain' : ''}`],
            }}
          />
        ) : (
          <AvatarGroup className={`w-[50px] ${images.length >= 3 ? 'gap-0' : ''}`} isGrid max={3}>
            {images.map(({ party, src, alt }) => (
              <Avatar
                key={`${party}:${src}`}
                src={src}
                alt={alt}
                size="sm"
                classNames={{
                  base: [`shrink-0 bg-white dark:bg-dark-pb p-1 border ${party}`],
                  img: ['object-contain'],
                }}
              />
            ))}
          </AvatarGroup>
        )}
      </div>

      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col w-full gap-1">
          <Link href={linkUrl} onClick={() => onClickRead(notification_id, false)}>
            <p className="text-xs font-bold md:text-base ">
              {title} &nbsp;
              <span className="text-[10px] md:text-sm font-medium text-gray-2 dark:text-muted-foreground">
                {getTimeRemaining(created_date)}
              </span>
            </p>
          </Link>
          <p className="text-gray-3 dark:text-gray-2 text-[10px] md:text-sm">{content}</p>
        </div>

        <Dropdown>
          <DropdownTrigger>
            <Button isIconOnly size="sm" className="bg-transparent" aria-label={`${title} 알림 관리`}>
              <IconKebab isPassed />
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label={`${title} 알림 관리`}>
            <DropdownItem key="read" onClick={() => onClickRead(notification_id, true)}>
              읽음 표시
            </DropdownItem>
            <DropdownItem key="delete" onClick={() => onClickDelete(notification_id)}>
              삭제
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </section>
  );
}
