'use client';

import { FormEvent, useId, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { normalizeSearch, SEARCH_MAX_LENGTH } from '@/lib/search';

export default function SearchBar({
  onSearch,
  initialValue = '',
}: {
  onSearch: (keyword: string) => void;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyword = normalizeSearch(value);
    if (!keyword) {
      setError('검색어를 입력해 주세요.');
      input.current?.focus();
      return;
    }
    onSearch(keyword);
  };

  return (
    <form onSubmit={submit} role="search">
      <FieldGroup>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={id} className="sr-only">
            법안·의안번호·의원·정당 검색어
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              ref={input}
              id={id}
              value={value}
              autoFocus
              maxLength={SEARCH_MAX_LENGTH}
              onChange={(event) => {
                setValue(event.target.value);
                setError('');
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              placeholder="법안·의안번호·의원·정당 검색"
              autoComplete="off"
              enterKeyHint="search"
            />
            <InputGroupAddon align="inline-end">
              {value && (
                <InputGroupButton
                  size="icon-lg"
                  aria-label="검색어 지우기"
                  onClick={() => {
                    setValue('');
                    setError('');
                    input.current?.focus();
                  }}>
                  <X />
                </InputGroupButton>
              )}
              <InputGroupButton type="submit" size="icon-lg" aria-label="검색">
                <Search />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </Field>
      </FieldGroup>
    </form>
  );
}
