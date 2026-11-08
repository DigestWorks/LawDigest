'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navbar, NavbarContent, NavbarItem, NavbarBrand } from '@heroui/navbar';
import { siteConfig } from '@/config/site';
import { IconNavBorder } from '@/public/svgs';
import GoBackButton from '@/components/common/Button/GoBackButton';
import SettingButton from '@/components/common/Button/SettingButton';
import NotificationButton from '@/components/common/Button/NotifcationButton';
import ThemeSwitchButton from '@/components/common/Button/ThemeSwitchButton';
import Logo from './Logo';
import { HeaderSearchField, HeaderSearchToggle } from './HeaderSearch';
import useSearchEntry from '@/components/search/useSearchEntry';

export default function Header({
  logo,
  goBack,
  title,
  setting,
  search,
  notification,
  theme,
}: {
  logo?: boolean;
  goBack?: boolean;
  title?: string;
  setting?: boolean;
  search?: boolean;
  notification?: boolean;
  theme?: boolean;
}) {
  const pathname = usePathname();
  const { navItems } = siteConfig;
  const isTimelineOrFollowing = pathname.startsWith('/timeline') || pathname.startsWith('/following');
  const { expanded: searchExpanded } = useSearchEntry();

  return (
    <section className="relative z-30 w-full">
      <Navbar
        position="static"
        className={`dark:bg-dark-b dark:lg:bg-dark-pb md:h-[98px] dark:border-dark-l ${isTimelineOrFollowing ? 'md:border-b' : 'border-b'}`}>
        <NavbarBrand className="hidden xl:absolute xl:left-[-100px] lg:block">
          <Link href="/">
            <Logo width={106} height={18} />
          </Link>
        </NavbarBrand>

        {logo && (
          <NavbarBrand className="lg:hidden">
            <Link href="/">
              <Logo width={106} height={18} />
            </Link>
          </NavbarBrand>
        )}

        {goBack && (
          <NavbarContent justify="start" className="lg:hidden">
            <NavbarItem>
              <GoBackButton />
            </NavbarItem>
          </NavbarContent>
        )}

        <NavbarContent justify="center" data-header-center className="relative hidden mx-auto md:block">
          <NavbarItem className="contents">
            <HeaderSearchField />
          </NavbarItem>
          <ul
            inert={searchExpanded}
            className={`header-search-tabs flex justify-between md:min-w-[430px] w-full gap-0 px-0 lg:gap-6 xl:gap-20 xl:px-10${searchExpanded ? ' is-hidden' : ''}`}>
            {navItems.map(({ label, href }) => {
              const isActive = pathname === '/' ? pathname?.endsWith(href) : href !== '/' && pathname?.startsWith(href);

              return (
                <NavbarItem key={label} className="flex items-center justify-center ">
                  <div
                    data-nav-indicator-active={isActive || undefined}
                    className={`${isActive ? 'z-10' : '-z-10'} absolute`}>
                    <IconNavBorder />
                  </div>
                  <Link
                    className={`${isActive ? 'text-black dark:text-white font-semibold bg-transparent' : 'text-gray-2'} flex flex-col items-center justify-center text-sm lg:text-base font-medium lg:px-5 lg:py-3 bg-white lg:dark:bg-dark-pb dark:bg-dark-b w-[100px] lg:w-[110px] h-[60px] leading-[60px]`}
                    href={href}>
                    {label}
                  </Link>
                </NavbarItem>
              );
            })}
          </ul>
        </NavbarContent>

        {title && (
          <NavbarContent justify="center" className="md:hidden">
            <NavbarItem className="font-medium">{title}</NavbarItem>
          </NavbarContent>
        )}

        <NavbarContent justify="end" className="xl:absolute xl:right-[-100px]">
          <NavbarItem>
            <HeaderSearchToggle />
          </NavbarItem>
          {(setting || search || notification || theme) && (
            <NavbarItem>
              <ThemeSwitchButton />
            </NavbarItem>
          )}
          {setting && (
            <NavbarItem>
              <SettingButton />
            </NavbarItem>
          )}
          {(notification || search) && (
            <NavbarItem className={notification ? '' : 'hidden md:list-item'}>
              <NotificationButton />
            </NavbarItem>
          )}
        </NavbarContent>
      </Navbar>
    </section>
  );
}
