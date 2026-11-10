'use client';

import {
  CSSProperties,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock3, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useSearchEntry from '@/components/search/useSearchEntry';
import useSearchSuggestions from '@/components/search/useSearchSuggestions';
import useSearchRingState from '@/components/search/useSearchRingState';
import { SEARCH_MAX_LENGTH } from '@/lib/search';

function isVisible(element: HTMLElement | null) {
  return Boolean(element && element.getClientRects().length > 0);
}

/** 헤더 오른쪽의 검색 아이콘. 펼친 동안에는 닫기 아이콘으로 바뀐다.
 * 모바일은 하단 검색 바에 닫기 단추가 있으므로 펼친 동안 숨긴다. */
export function HeaderSearchToggle() {
  const { expanded, isSearchRoute, openEntry, closeEntry } = useSearchEntry();
  // 검색 결과 화면에서는 검색창이 늘 펼쳐져 있으므로 열고 닫는 아이콘을 두지 않는다.
  if (isSearchRoute) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className={expanded ? 'max-md:hidden' : undefined}
      data-search-toggle
      data-header-search-toggle
      aria-label={expanded ? '검색 닫기' : '검색 열기'}
      aria-expanded={expanded}
      onClick={expanded ? closeEntry : openEntry}>
      <span className="relative block size-5" aria-hidden="true">
        <Search
          className={`absolute inset-0 size-5 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-opacity ${expanded ? 'scale-50 rotate-45 opacity-0' : ''}`}
        />
        <X
          className={`absolute inset-0 size-5 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-opacity ${expanded ? '' : 'scale-50 -rotate-45 opacity-0'}`}
        />
      </span>
    </Button>
  );
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const FIELD_HEIGHT = 50;
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const BOX_PROPS = ['left', 'top', 'width', 'height'];
/** 열 때: 인디케이터 자리에서 바로 보인 뒤 늘어난다. */
const OPEN_TRANSITION = BOX_PROPS.map((prop) => `${prop} 0.46s ${EASE_OUT}`).join(', ');
/** 닫을 때: 인디케이터 자리로 줄어든 뒤 사라진다. */
const CLOSE_TRANSITION = [...BOX_PROPS.map((prop) => `${prop} 0.34s ${EASE_OUT}`), 'opacity 0.1s linear 0.3s'].join(
  ', ',
);

function setBox(form: HTMLFormElement, box: Box, opacity: number) {
  Object.assign(form.style, {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    opacity: String(opacity),
  });
}

/** 전환 없이 바로 놓는다. 브라우저 CSS 전환만 쓰므로 인라인 값이 곧 화면 값이다. */
function placeForm(form: HTMLFormElement, box: Box, opacity: number) {
  form.style.transition = 'none';
  setBox(form, box, opacity);
  // 다음 전환이 이 자리에서 시작하도록 지금 값을 확정한다.
  form.getBoundingClientRect();
}

/** 헤더 가운데에서 펼쳐지는 검색창과 그 아래 추천 패널(데스크톱).
 * 활성 탭의 무지개 인디케이터 자리에서 늘어나 검색창이 되고, 닫으면 그 자리로 줄어든다. */
export function HeaderSearchField() {
  const {
    expanded,
    isSearchRoute,
    routeKeyword,
    pending,
    focusToken,
    closeEntry,
    submit,
    draft: value,
    setDraft: setValue,
  } = useSearchEntry();
  const [focused, setFocused] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [geometry, setGeometry] = useState<{ origin: Box; final: Box } | null>(null);
  const reduceMotion = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const shownExpanded = useRef<boolean | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const seenFocusToken = useRef(focusToken);
  const composing = useRef(false);
  const panelId = useId();
  const suggestions = useSearchSuggestions(expanded);
  const showPanel = expanded && panelOpen && !pending;
  const ringState = useSearchRingState(Boolean(pending));
  const recent = suggestions.recent.filter((keyword) => keyword !== routeKeyword).slice(0, 5);
  const trending = suggestions.trending.filter(({ keyword }) => keyword !== routeKeyword);

  // 펼친 검색창의 자리와, 늘어나기 시작할 활성 탭 인디케이터(없으면 검색 아이콘)의 자리를 잰다.
  const measure = useCallback(() => {
    const frame = root.current?.getBoundingClientRect();
    if (!frame) return null;
    const width = Math.min(560, window.innerWidth - 300);
    const left = (frame.width - width) / 2;
    const indicator = root.current
      ?.closest('[data-header-center]')
      ?.querySelector('[data-nav-indicator-active] svg')
      ?.getBoundingClientRect();
    // 활성 탭 인디케이터가 있으면 그 세로 중심에 맞춰, 늘어날 때 좌우로만 커지게 한다.
    if (indicator) {
      const origin = {
        left: indicator.left - frame.left,
        top: indicator.top - frame.top,
        width: indicator.width,
        height: indicator.height,
      };
      const top = origin.top + (origin.height - FIELD_HEIGHT) / 2;
      return { origin, final: { left, top, width, height: FIELD_HEIGHT } };
    }
    const final = { left, top: (frame.height - FIELD_HEIGHT) / 2, width, height: FIELD_HEIGHT };
    const toggle = document.querySelector('[data-header-search-toggle]')?.getBoundingClientRect();
    const origin = toggle
      ? { left: toggle.left - frame.left, top: toggle.top - frame.top, width: toggle.width, height: toggle.height }
      : { ...final, left: final.left + final.width / 2 - FIELD_HEIGHT, width: FIELD_HEIGHT * 2 };
    return { origin, final };
  }, []);

  // 사용자가 열고 닫을 때만 움직인다. 경로가 바뀌어 헤더가 새로 그려지거나 창 크기가 바뀌면 제자리에 바로 놓는다.
  useLayoutEffect(() => {
    const form = formRef.current;
    const next = measure();
    if (!form || !next) return;
    setGeometry(next);
    const previous = shownExpanded.current;
    shownExpanded.current = expanded;
    if (previous === null || previous === expanded || reduceMotion) {
      placeForm(form, expanded ? next.final : next.origin, expanded ? 1 : 0);
      return;
    }
    if (expanded) {
      // 완전히 닫혀 있었으면 인디케이터 자리에서 시작하고, 닫히는 중이면 지금 자리에서 이어서 늘어난다.
      if (getComputedStyle(form).opacity === '0') placeForm(form, next.origin, 1);
      form.style.transition = OPEN_TRANSITION;
      setBox(form, next.final, 1);
    } else {
      form.style.transition = CLOSE_TRANSITION;
      setBox(form, next.origin, 0);
    }
  }, [expanded, measure, reduceMotion]);

  useEffect(() => {
    const onResize = () => {
      const form = formRef.current;
      const next = measure();
      if (!form || !next) return;
      setGeometry(next);
      placeForm(form, expanded ? next.final : next.origin, expanded ? 1 : 0);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [expanded, measure]);

  useLayoutEffect(() => {
    if (focusToken === seenFocusToken.current) return;
    seenFocusToken.current = focusToken;
    if (!isVisible(input.current)) return;
    input.current?.focus();
    input.current?.select();
    setPanelOpen(true);
  }, [focusToken]);

  useEffect(() => {
    if (!expanded) {
      setPanelOpen(false);
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      // 모바일 화면에서는 이 검색창이 숨겨져 있다. 보이지 않을 때는 하단 내비의 클릭을 바깥 클릭으로 보지 않는다.
      if (!isVisible(root.current)) return;
      const target = event.target as Element | null;
      if (!target || root.current?.contains(target) || target.closest('[data-search-toggle]')) return;
      setPanelOpen(false);
      if (!isSearchRoute && !pending) closeEntry();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [expanded, isSearchRoute, pending, closeEntry]);

  const search = (keyword: string) => {
    if (!submit(keyword)) {
      input.current?.focus();
      return;
    }
    setValue(keyword.trim());
    setPanelOpen(false);
    input.current?.blur();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    search(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (showPanel) {
        setPanelOpen(false);
        input.current?.focus();
      } else if (!isSearchRoute) {
        closeEntry();
        document.querySelector<HTMLElement>('[data-header-search-toggle]')?.focus();
      } else {
        input.current?.blur();
      }
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-suggestion]') ?? []);
    if (!items.length) return;
    event.preventDefault();
    setPanelOpen(true);
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') items[Math.min(current + 1, items.length - 1)].focus();
    else if (current <= 0) input.current?.focus();
    else items[current - 1].focus();
  };

  let rowIndex = 0;
  const nextRow = () => ({ '--row-index': rowIndex++ }) as CSSProperties;

  let contentTransition = { duration: 0.12, delay: 0 };
  if (!reduceMotion) contentTransition = expanded ? { duration: 0.2, delay: 0.2 } : { duration: 0.08, delay: 0 };

  return (
    <div ref={root} onKeyDown={onKeyDown} className="pointer-events-none absolute inset-0 z-50" inert={!expanded}>
      <form
        ref={formRef}
        role="search"
        onSubmit={onSubmit}
        style={{ opacity: 0 }}
        className={`header-search-ring search-spinner absolute${expanded ? ' pointer-events-auto' : ''}`}
        data-state={ringState}>
        <div className="header-search-ring__inner">
          <motion.div
            initial={false}
            animate={{ opacity: expanded ? 1 : 0 }}
            transition={contentTransition}
            className="flex h-full items-center gap-2.5 pl-4 pr-1.5">
            <Search aria-hidden="true" className="size-[18px] shrink-0 text-muted-foreground" />
            <input
              ref={input}
              value={value}
              maxLength={SEARCH_MAX_LENGTH}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                if (!composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229) search(value);
              }}
              onCompositionStart={() => {
                composing.current = true;
              }}
              onCompositionEnd={() => {
                composing.current = false;
              }}
              onFocus={() => {
                setFocused(true);
                setPanelOpen(true);
                suggestions.refreshRecent();
              }}
              onBlur={() => setFocused(false)}
              aria-label="법안·의안번호·의원·정당 검색어"
              aria-controls={showPanel ? panelId : undefined}
              aria-busy={Boolean(pending)}
              placeholder="법안·의안번호·의원·정당 검색"
              autoComplete="off"
              enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            {value && (
              <button
                type="button"
                aria-label="검색어 지우기"
                onClick={() => {
                  setValue('');
                  input.current?.focus();
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={Boolean(pending)}
              className={`flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                focused || value
                  ? 'bg-primary-3 text-white hover:opacity-85 dark:bg-white dark:text-primary-3'
                  : 'bg-accent text-muted-foreground'
              }`}>
              검색
            </button>
          </motion.div>
        </div>
      </form>
      <span role="status" className="sr-only">
        {pending ? `‘${pending}’ 검색 결과를 불러오는 중입니다.` : ''}
      </span>

      {showPanel && geometry && (recent.length > 0 || trending.length > 0) && (
        <section
          id={panelId}
          aria-label="검색 추천"
          style={
            geometry
              ? {
                  left: geometry.final.left,
                  width: geometry.final.width,
                  top: geometry.final.top + geometry.final.height + 10,
                }
              : undefined
          }
          className="header-search-panel pointer-events-auto absolute rounded-[20px] border border-border bg-background p-2 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.28)]">
          {recent.length > 0 && (
            <section aria-labelledby={`${panelId}-recent`} className="pt-1">
              <div data-suggestion-row style={nextRow()} className="flex items-center justify-between px-3 pb-1 pt-2">
                <h2 id={`${panelId}-recent`} className="text-xs font-semibold text-muted-foreground">
                  최근 검색어
                </h2>
                <button
                  type="button"
                  onClick={suggestions.clearRecent}
                  className="rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                  모두 지우기
                </button>
              </div>
              <ul>
                {recent.map((keyword) => (
                  <li key={keyword} data-suggestion-row style={nextRow()} className="group flex items-center gap-1">
                    <button
                      type="button"
                      data-suggestion
                      onClick={() => search(keyword)}
                      className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-left text-[15px] hover:bg-accent focus-visible:bg-accent focus-visible:outline-none">
                      <Clock3 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{keyword}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`${keyword} 검색 기록 삭제`}
                      onClick={() => suggestions.removeRecent(keyword)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring group-hover:opacity-100">
                      <X aria-hidden="true" className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {trending.length > 0 && (
            <section aria-labelledby={`${panelId}-trending`} className="px-3 pb-2 pt-3">
              <h2
                id={`${panelId}-trending`}
                data-suggestion-row
                style={nextRow()}
                className="text-xs font-semibold text-muted-foreground">
                지금 뜨는 키워드
              </h2>
              <div data-suggestion-row style={nextRow()} className="mt-2 flex flex-wrap gap-2">
                {trending.map(({ keyword }) => (
                  <button
                    key={keyword}
                    type="button"
                    data-suggestion
                    onClick={() => search(keyword)}
                    className="rounded-full border border-border px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                    <span className="text-[#0088FF]">#</span> {keyword}
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>
      )}
    </div>
  );
}
