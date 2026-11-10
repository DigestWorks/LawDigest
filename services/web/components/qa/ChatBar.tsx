'use client';

import { FormEvent, forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, Square } from 'lucide-react';
import type { Assembly } from '@/lib/rag';
import useSearchRingState from '@/components/search/useSearchRingState';

const MAX_LENGTH = 1000;
const ASSEMBLIES: { value: Assembly; label: string }[] = [
  { value: 22, label: '22대' },
  { value: 21, label: '21대' },
  { value: 0, label: '21·22대' },
];

export type ChatBarHandle = { focus: () => void; fill: (text: string) => void };

type ChatBarProps = {
  placeholder: string;
  /** 답변을 만드는 중이면 보내기 대신 중지 단추를 보이고 테두리를 돌린다. */
  pending: boolean;
  disabled?: boolean;
  assembly: Assembly;
  onAssemblyChange: (assembly: Assembly) => void;
  /** 질문을 받아들였으면 true를 돌려준다. 그때 입력을 비운다. */
  onSubmit: (question: string) => boolean;
  onStop: () => void;
  autoFocus?: boolean;
};

/** 법안에 관한 질문을 받는 무지개 테두리 입력. 검색 결과의 AI 답변 아래와 에이전트 채팅 화면 하단에 놓인다. */
const ChatBar = forwardRef<ChatBarHandle, ChatBarProps>(function ChatBar(
  { placeholder, pending, disabled = false, assembly, onAssemblyChange, onSubmit, onStop, autoFocus = false },
  ref,
) {
  const [value, setValue] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const ringState = useSearchRingState(pending);
  const ready = value.trim().length >= 2 && !disabled;

  useImperativeHandle(ref, () => ({
    focus: () => input.current?.focus(),
    fill: (text: string) => {
      setValue(text);
      input.current?.focus();
    },
  }));

  // 내용에 맞춰 최대 여섯 줄까지 늘어난다.
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 6 * 26)}px`;
  }, [value]);

  const send = () => {
    if (pending || !ready) return;
    if (onSubmit(value.trim())) setValue('');
  };

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    send();
  };

  return (
    <form onSubmit={onFormSubmit} className="chat-bar search-ring search-spinner" data-state={ringState}>
      <div className="search-ring__inner flex items-end gap-1 py-2 pl-5 pr-2">
        <textarea
          ref={input}
          rows={1}
          value={value}
          maxLength={MAX_LENGTH}
          autoFocus={autoFocus}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return;
            event.preventDefault();
            if (!composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229) send();
          }}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          aria-label={placeholder}
          placeholder={placeholder}
          enterKeyHint="send"
          className="min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-base leading-[26px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <label className="relative flex h-10 shrink-0 items-center">
          <span className="sr-only">질문할 법안의 국회 대수</span>
          <select
            value={assembly}
            disabled={pending}
            onChange={(event) => onAssemblyChange(Number(event.target.value) as Assembly)}
            className="h-10 cursor-pointer appearance-none rounded-full bg-transparent pl-3 pr-7 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-60">
            {ASSEMBLIES.map(({ value: option, label }) => (
              <option key={option} value={option}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground"
          />
        </label>
        {pending ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="답변 중지"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-3 text-white transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-white dark:text-primary-3">
            <Square aria-hidden="true" className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!ready}
            aria-label="질문 보내기"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-3 text-white transition-[opacity,background-color] hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:bg-accent disabled:text-muted-foreground disabled:hover:opacity-100 dark:bg-white dark:text-primary-3 dark:disabled:bg-accent dark:disabled:text-muted-foreground">
            <ArrowUp aria-hidden="true" className="size-[18px]" strokeWidth={2.4} />
          </button>
        )}
      </div>
    </form>
  );
});

export default ChatBar;
