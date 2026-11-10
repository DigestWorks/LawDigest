'use client';

import { useEffect, useLayoutEffect, useState, useCallback, useRef, CSSProperties, FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Clock3, ArrowUp, X } from 'lucide-react';
import { siteConfig } from '@/config/site';
import useSearchEntry from '@/components/search/useSearchEntry';
import useSearchSuggestions from '@/components/search/useSearchSuggestions';
import useSearchRingState from '@/components/search/useSearchRingState';
import { SEARCH_MAX_LENGTH } from '@/lib/search';

const SHELL_PADDING_PX = 4;

function Nav() {
  const { navItems } = siteConfig;
  const pathname = usePathname();
  const router = useRouter();
  const [isCompact, setIsCompact] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const search = useSearchEntry();
  const { expanded: isSearchOpen, isSearchRoute, routeKeyword, pending, focusToken, openEntry, closeEntry } = search;
  const isSearchOpenRef = useRef(isSearchOpen);
  useEffect(() => {
    isSearchOpenRef.current = isSearchOpen;
  }, [isSearchOpen]);

  const { draft: searchValue, setDraft: setSearchValue } = search;
  const [searchFocused, setSearchFocused] = useState(false);
  // 추천 말풍선은 포커스와 따로 연다. 말풍선을 누르는 순간 입력 포커스가 빠져도 클릭이 사라지지 않게 한다.
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const composing = useRef(false);
  const searchGroupRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const seenFocusToken = useRef(focusToken);
  const suggestions = useSearchSuggestions(isSearchOpen, 4);
  const showSuggestions = isSearchOpen && !pending && (suggestionsOpen || !isSearchRoute);
  const searchRingState = useSearchRingState(Boolean(pending));

  const navRef = useRef<HTMLElement | null>(null);

  const activeIndex = navItems.findIndex(({ href }) =>
    pathname === '/' ? href === '/' : href !== '/' && pathname.startsWith(href),
  );

  const activeIndexRef = useRef(activeIndex);
  const lastTabIndex = useRef(Math.max(activeIndex, 0));
  useEffect(() => {
    activeIndexRef.current = activeIndex;
    if (activeIndex >= 0) lastTabIndex.current = activeIndex;
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

  const openSearch = useCallback(() => {
    openEntry();
    setIsCompact(false);
  }, [openEntry]);

  const closeSearch = useCallback(() => {
    searchInputRef.current?.blur();
    setSuggestionsOpen(false);
    closeEntry();
  }, [closeEntry]);

  // 무지개 버튼, 헤더 아이콘, 본문 검색 입구, 단축키로 열면 보이는 입력에 포커스한다.
  // 클릭으로 연 경우 React가 이 이펙트를 클릭 처리 안에서 동기로 실행하므로 iOS도 키보드를 연다.
  useLayoutEffect(() => {
    if (focusToken === seenFocusToken.current) return;
    seenFocusToken.current = focusToken;
    const input = searchInputRef.current;
    if (!input || input.getClientRects().length === 0) return;
    setIsCompact(false);
    input.focus();
  }, [focusToken]);

  const submitSearch = useCallback(
    (keyword: string) => {
      if (!search.submit(keyword)) {
        searchInputRef.current?.focus();
        return;
      }
      setSearchValue(keyword.trim());
      setSuggestionsOpen(false);
      searchInputRef.current?.blur();
    },
    [search, setSearchValue],
  );

  // 바깥을 누르면 추천을 닫고, 검색 결과 화면이 아니면 검색 바도 접는다.
  useEffect(() => {
    if (!isSearchOpen) {
      setSuggestionsOpen(false);
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      // 데스크톱 화면에서는 하단 내비가 숨겨져 있다. 보이지 않을 때는 헤더 검색창의 클릭을 바깥 클릭으로 보지 않는다.
      if (!wrapperRef.current || wrapperRef.current.getClientRects().length === 0) return;
      const target = event.target as Element | null;
      if (!target || wrapperRef.current.contains(target) || target.closest('[data-search-toggle]')) return;
      searchInputRef.current?.blur();
      setSuggestionsOpen(false);
      if (!isSearchRoute && !pending) closeEntry();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isSearchOpen, isSearchRoute, pending, closeEntry]);

  // 화면 키보드가 열리면 검색 바를 키보드 위로 올린다.
  useEffect(() => {
    const viewport = window.visualViewport;
    const wrapper = wrapperRef.current;
    if (!viewport || !wrapper) return undefined;
    const update = () => {
      const offset = searchFocused ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      wrapper.style.setProperty('--mobile-keyboard-offset', `${Math.round(offset)}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [searchFocused]);

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

  const isSearchActive = pathname.startsWith('/search') || isSearchOpen;

  const recentBubbles = suggestions.recent.filter((keyword) => keyword !== routeKeyword).slice(0, 3);
  const trendingBubbles = suggestions.trending
    .filter(({ keyword }) => keyword !== routeKeyword && !recentBubbles.includes(keyword))
    .slice(0, 4);
  const bubbleCount = trendingBubbles.length + recentBubbles.length;
  let bubbleIndex = 0;
  // 검색 바에 가까운 말풍선부터 떠오른다.
  const bubbleStyle = () =>
    ({ '--suggestion-delay': `${(bubbleCount - 1 - bubbleIndex++) * 0.045}s` }) as CSSProperties;
  // 검색 결과 화면에서는 검색 바를 접지 않는다. 원형 단추는 마지막으로 보던 탭으로 돌아간다.
  const soloItem = navItems[activeIndex >= 0 ? activeIndex : lastTabIndex.current];
  const SoloIcon = activeIndex >= 0 || isSearchRoute ? soloItem.IconComponent : null;
  const onSoloClick = () => {
    if (!isSearchRoute) {
      closeSearch();
      return;
    }
    setNavIndex(lastTabIndex.current);
    router.push(soloItem.href);
  };

  // 에이전트 채팅 화면은 하단에 채팅 바를 고정하므로 탭 바를 두지 않는다.
  if (pathname === '/ask') return null;

  return (
    <>
      <div aria-hidden="true" className={`mobile-floating-nav-scrim${showSuggestions ? ' is-visible' : ''}`} />
      <div
        ref={wrapperRef}
        className="mobile-floating-nav-wrapper"
        style={{ '--mobile-nav-count': navItems.length } as React.CSSProperties}>
        {/* 탭 바 */}
        <nav
          ref={registerNavRef}
          aria-label="모바일 주 메뉴"
          className={`mobile-floating-nav${isCompact ? ' is-compact' : ''}${isDragging ? ' is-dragging' : ''}${activeIndex < 0 ? ' has-no-active' : ''}${isSearchOpen ? ' is-search-open' : ''}`}
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
              inert={isSearchOpen}
              className="mobile-floating-nav__item"
              onClick={(event) => {
                if (!wasDraggingRef.current || event.detail === 0) {
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

          {/* 검색이 펼쳐지면 탭 바는 현재 탭 아이콘 하나로 줄고, 누르면 검색을 닫는다. */}
          <button
            type="button"
            inert={!isSearchOpen}
            className="mobile-floating-nav__solo-icon"
            onClick={onSoloClick}
            aria-label={isSearchRoute ? `${soloItem.label}(으)로 돌아가기` : '검색 닫기'}>
            {SoloIcon ? <SoloIcon isActive /> : <X aria-hidden="true" className="size-6" />}
          </button>
        </nav>

        <div ref={searchGroupRef} className="mobile-floating-nav-search-group">
          <ul
            aria-label="검색 추천"
            inert={!showSuggestions}
            className={`mobile-floating-nav-suggestions${showSuggestions && bubbleCount > 0 ? ' is-visible' : ''}`}>
            {trendingBubbles.map(({ keyword }) => (
              <li key={`trending-${keyword}`} style={bubbleStyle()}>
                <button type="button" className="mobile-floating-nav-suggestion" onClick={() => submitSearch(keyword)}>
                  <span className="mobile-floating-nav-suggestion__mark" aria-hidden="true">
                    #
                  </span>
                  <span className="truncate">{keyword}</span>
                </button>
              </li>
            ))}
            {recentBubbles.map((keyword) => (
              <li key={`recent-${keyword}`} style={bubbleStyle()}>
                <button type="button" className="mobile-floating-nav-suggestion" onClick={() => submitSearch(keyword)}>
                  <Clock3 aria-hidden="true" className="size-3.5 shrink-0 opacity-60" />
                  <span className="sr-only">최근 검색어 </span>
                  <span className="truncate">{keyword}</span>
                </button>
              </li>
            ))}
          </ul>

          <div
            data-state={searchRingState}
            className={`mobile-floating-nav-search-wrap search-spinner${isSearchActive ? ' is-active' : ''}${isCompact ? ' is-compact' : ''}${isSearchOpen ? ' is-expanded' : ''}`}>
            <form
              role="search"
              inert={!isSearchOpen}
              className="mobile-floating-nav-search-expanded-inner"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                submitSearch(searchValue);
              }}>
              <svg
                className="mobile-floating-nav-search-expanded-icon"
                width="18"
                height="18"
                viewBox="0 0 22 22"
                fill="none"
                aria-hidden="true">
                <circle cx="9.5" cy="9.5" r="6" stroke="currentColor" strokeWidth="1.7" />
                <path d="M14 14L19 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                ref={searchInputRef}
                className="mobile-floating-nav-search-input"
                type="search"
                value={searchValue}
                maxLength={SEARCH_MAX_LENGTH}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  if (!composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229)
                    submitSearch(searchValue);
                }}
                onCompositionStart={() => {
                  composing.current = true;
                }}
                onCompositionEnd={() => {
                  composing.current = false;
                }}
                onFocus={() => {
                  setSearchFocused(true);
                  setSuggestionsOpen(true);
                  suggestions.refreshRecent();
                }}
                onBlur={() => setSearchFocused(false)}
                aria-label="법안·의안번호·의원·정당 검색어"
                aria-busy={Boolean(pending)}
                placeholder="법안·의원·정당 검색"
                autoComplete="off"
                enterKeyHint="search"
              />
              {searchValue && (
                <button
                  type="button"
                  className="mobile-floating-nav-search-close"
                  aria-label="검색어 지우기"
                  onClick={() => {
                    setSearchValue('');
                    searchInputRef.current?.focus();
                  }}>
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              )}
              <button
                type="submit"
                aria-label="검색"
                disabled={Boolean(pending) || !searchValue.trim()}
                className="mobile-floating-nav-search-close">
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
            </form>
            <span role="status" className="sr-only">
              {pending ? `‘${pending}’ 검색 결과를 불러오는 중입니다.` : ''}
            </span>

            <button
              type="button"
              inert={isSearchOpen}
              onClick={openSearch}
              aria-label="검색 열기"
              aria-expanded={isSearchOpen}
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
