'use client';

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { siteConfig } from '@/config/site';
import { searchModalState } from '@/store';

const SHELL_PADDING_PX = 4;

function Nav() {
  const { navItems } = siteConfig;
  const pathname = usePathname();
  const router = useRouter();
  const [isCompact, setIsCompact] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [searchModal, setSearchModal] = useAtom(searchModalState);

  const isSearchOpen = searchModal.show;
  const isSearchOpenRef = useRef(searchModal.show);
  useEffect(() => {
    isSearchOpenRef.current = searchModal.show;
  }, [searchModal.show]);

  const navRef = useRef<HTMLElement | null>(null);

  const activeIndex = navItems.findIndex(({ href }) =>
    pathname === '/' ? href === '/' : href !== '/' && pathname.startsWith(href),
  );

  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const setNavIndex = useCallback((index: number) => {
    navRef.current?.style.setProperty('--mobile-nav-index', String(index));
  }, []);

  useLayoutEffect(() => {
    if (activeIndex >= 0) setNavIndex(activeIndex);
  }, [activeIndex, setNavIndex]);

  // 드래그 상태
  const dragState = useRef<{
    isDragging: boolean;
    startX: number;
    startIndex: number;
    lastX: number;
  } | null>(null);
  const isDraggingRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const openSearch = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setSearchModal({ show: true, trigger: event.currentTarget });
      setIsCompact(false);
    },
    [setSearchModal],
  );

  // compact 전환 시 is-nav-transitioning 클래스
  const isFirstCompactRender = useRef(true);
  useEffect(() => {
    if (isFirstCompactRender.current) {
      isFirstCompactRender.current = false;
      return undefined;
    }
    const nav = navRef.current;
    if (!nav) return undefined;
    nav.classList.add('is-nav-transitioning');
    const timer = setTimeout(() => nav.classList.remove('is-nav-transitioning'), 340);
    return () => {
      clearTimeout(timer);
      nav.classList.remove('is-nav-transitioning');
    };
  }, [isCompact]);

  // 드래그 중 페이지 스크롤 차단
  const registerNavRef = useCallback((node: HTMLElement | null) => {
    navRef.current = node;
    if (!node) return;
    const idx = activeIndexRef.current >= 0 ? activeIndexRef.current : 0;
    node.style.setProperty('--mobile-nav-index', String(idx));
    const onTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current) e.preventDefault();
    };
    node.addEventListener('touchmove', onTouchMove, { passive: false });
  }, []);

  // 스크롤 감지 (compact 전환) — 검색/드래그 중 차단
  useEffect(() => {
    const handleScroll = (event: WheelEvent) => {
      if (isDraggingRef.current || isSearchOpenRef.current) return;
      setIsCompact(event.deltaY > 0);
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (isDraggingRef.current || isSearchOpenRef.current) return;
      const currentTouch = event.touches[0].clientY;
      setIsCompact(currentTouch < lastScrollTop);
      setLastScrollTop(currentTouch <= 0 ? 0 : currentTouch);
    };
    window.addEventListener('wheel', handleScroll, true);
    window.addEventListener('touchmove', handleTouchMove, true);
    return () => {
      window.removeEventListener('wheel', handleScroll, true);
      window.removeEventListener('touchmove', handleTouchMove, true);
    };
  }, [lastScrollTop]);

  // 드래그 핸들러
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    wasDraggingRef.current = false;
    dragState.current = {
      isDragging: false,
      startX: e.clientX,
      startIndex: activeIndexRef.current >= 0 ? activeIndexRef.current : 0,
      lastX: e.clientX,
    };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragState.current;
      if (!drag) return;

      const deltaX = e.clientX - drag.startX;

      if (!drag.isDragging && Math.abs(deltaX) > 8) {
        drag.isDragging = true;
        isDraggingRef.current = true;
        wasDraggingRef.current = true;
        setIsDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }

      if (!drag.isDragging) return;
      drag.lastX = e.clientX;

      const nav = navRef.current;
      if (!nav) return;
      const navRect = nav.getBoundingClientRect();
      const innerWidth = navRect.width - SHELL_PADDING_PX * 2;
      const tabWidth = innerWidth / navItems.length;
      const fracIndex = Math.max(0, Math.min(navItems.length - 1, drag.startIndex + deltaX / tabWidth));
      setNavIndex(fracIndex);
    },
    [navItems.length, setNavIndex],
  );

  const handlePointerUp = useCallback(() => {
    const drag = dragState.current;
    if (!drag) return;
    dragState.current = null;
    isDraggingRef.current = false;

    if (!drag.isDragging) {
      setIsDragging(false);
      return;
    }

    const nav = navRef.current;
    if (!nav) return;
    const navRect = nav.getBoundingClientRect();
    const deltaX = drag.lastX - drag.startX;
    const innerWidth = navRect.width - SHELL_PADDING_PX * 2;
    const tabWidth = innerWidth / navItems.length;
    const targetIndex = Math.max(0, Math.min(navItems.length - 1, drag.startIndex + Math.round(deltaX / tabWidth)));

    setIsDragging(false);
    window.requestAnimationFrame(() => setNavIndex(targetIndex));
    router.push(navItems[targetIndex].href);
  }, [navItems, router, setNavIndex]);

  const isSearchActive = pathname.startsWith('/search') || searchModal.show;

  return (
    <>
      <div
        className="mobile-floating-nav-wrapper"
        style={{ '--mobile-nav-count': navItems.length } as React.CSSProperties}>
        {/* 탭 바 */}
        <nav
          ref={registerNavRef}
          className={`mobile-floating-nav${isCompact ? ' is-compact' : ''}${isDragging ? ' is-dragging' : ''}`}
          onPointerDown={isSearchOpen ? undefined : handlePointerDown}
          onPointerMove={isSearchOpen ? undefined : handlePointerMove}
          onPointerUp={isSearchOpen ? undefined : handlePointerUp}
          onPointerCancel={
            isSearchOpen
              ? undefined
              : () => {
                  dragState.current = null;
                  isDraggingRef.current = false;
                  setIsDragging(false);
                }
          }>
          <div className="mobile-floating-nav__indicator" />

          <div aria-hidden="true" className="mobile-floating-nav__active-overlay">
            {navItems.map(({ label, IconComponent }) => (
              <div key={label} className="mobile-floating-nav__item is-active" style={{ pointerEvents: 'none' }}>
                <IconComponent isActive />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {navItems.map(({ label, href, IconComponent }, index) => (
            <button
              key={label}
              type="button"
              className="mobile-floating-nav__item"
              onClick={() => {
                if (!wasDraggingRef.current) {
                  setNavIndex(index);
                  setIsCompact(false);
                  router.push(href);
                }
                wasDraggingRef.current = false;
              }}
              aria-current={activeIndex === index ? 'page' : undefined}>
              <IconComponent isActive={false} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="mobile-floating-nav-search-group">
          <div
            className={`mobile-floating-nav-search-wrap${isSearchActive ? ' is-active' : ''}${isCompact ? ' is-compact' : ''}`}>
            <button
              type="button"
              onClick={openSearch}
              aria-label="검색 열기"
              className="mobile-floating-nav-search-btn">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <circle cx="9.5" cy="9.5" r="6" stroke="currentColor" strokeWidth="1.7" />
                <path d="M14 14L19 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Nav;
