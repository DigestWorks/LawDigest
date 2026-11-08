'use client';

import Link from 'next/link';
import { MouseEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { NavbarItem } from '@heroui/navbar';
import { siteConfig } from '@/config/site';
import { IconNavBorder } from '@/public/svgs';

interface Point {
  x: number;
  y: number;
}

/** IconNavBorder의 크기 */
const INDICATOR = { width: 100, height: 50 };
/** 모바일 하단 내비 인디케이터와 같은 곡선(mobile-floating-nav.css) */
const INDICATOR_EASE: [number, number, number, number] = [0.175, 0.885, 0.32, 1.275];

// 헤더는 경로마다 다시 그려진다. 마지막 위치를 기억해 새 헤더에서 이어서 움직인다.
let lastIndicator: Point | null = null;

/** 데스크톱 상단 탭. 무지개 인디케이터 하나가 활성 탭으로 미끄러져 이동한다. */
export default function HeaderNavTabs({ hidden }: { hidden: boolean }) {
  const pathname = usePathname();
  const { navItems } = siteConfig;
  const reduceMotion = useReducedMotion();
  const list = useRef<HTMLUListElement>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [target, setTarget] = useState<Point | null>(null);
  const [measured, setMeasured] = useState(false);
  const [start] = useState(() => lastIndicator);

  const routeHref =
    navItems.find(({ href }) => (pathname === '/' ? href === '/' : href !== '/' && pathname.startsWith(href)))?.href ??
    null;
  // 누른 순간 인디케이터를 옮겨, 다음 화면을 불러오는 동안 기다리지 않게 한다.
  const activeHref = pendingHref ?? routeHref;

  useEffect(() => setPendingHref(null), [pathname]);

  useLayoutEffect(() => {
    const measure = () => {
      const ul = list.current;
      const tab = activeHref ? ul?.querySelector<HTMLElement>(`[data-nav-href="${CSS.escape(activeHref)}"]`) : null;
      setMeasured(true);
      if (!ul || !tab) {
        lastIndicator = null;
        setTarget(null);
        return;
      }
      const frame = ul.getBoundingClientRect();
      const rect = tab.getBoundingClientRect();
      const next = {
        x: rect.left - frame.left + (rect.width - INDICATOR.width) / 2,
        y: rect.top - frame.top + (rect.height - INDICATOR.height) / 2,
      };
      lastIndicator = next;
      setTarget(next);
    };
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => window.removeEventListener('resize', measure);
  }, [activeHref]);

  const onTabClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (href !== activeHref) setPendingHref(href);
  };

  const origin = start ?? target;
  const move = reduceMotion ? { duration: 0 } : { duration: 0.4, ease: INDICATOR_EASE };

  return (
    <ul
      ref={list}
      inert={hidden}
      className={`header-search-tabs relative flex justify-between md:min-w-[430px] w-full gap-0 px-0 lg:gap-6 xl:gap-20 xl:px-10${hidden ? ' is-hidden' : ''}`}>
      {measured && target && origin && (
        <motion.li
          aria-hidden="true"
          data-nav-indicator-active
          className="pointer-events-none absolute left-0 top-0 z-10"
          initial={{ x: origin.x, y: origin.y }}
          animate={{ x: target.x, y: target.y }}
          transition={{ x: move, y: move }}
          onUpdate={(latest) => {
            if (typeof latest.x === 'number' && typeof latest.y === 'number') {
              lastIndicator = { x: latest.x, y: latest.y };
            }
          }}>
          <IconNavBorder />
        </motion.li>
      )}
      {navItems.map(({ label, href }) => {
        const isActive = href === activeHref;
        return (
          <NavbarItem key={label} className="flex items-center justify-center">
            {/* 서버에서 그린 첫 화면은 측정 전이라 활성 탭에 고정 인디케이터를 둔다. */}
            {!measured && isActive && (
              <div aria-hidden="true" data-nav-indicator-active className="absolute z-10">
                <IconNavBorder />
              </div>
            )}
            <Link
              data-nav-href={href}
              aria-current={href === routeHref ? 'page' : undefined}
              onClick={(event) => onTabClick(event, href)}
              className={`${isActive ? 'text-black dark:text-white font-semibold' : 'text-gray-2'} flex flex-col items-center justify-center text-sm lg:text-base font-medium lg:px-5 lg:py-3 w-[100px] lg:w-[110px] h-[60px] leading-[60px] transition-colors duration-200`}
              href={href}>
              {label}
            </Link>
          </NavbarItem>
        );
      })}
    </ul>
  );
}
