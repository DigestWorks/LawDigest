/**
 * 이전 버전의 이용약관·개인정보 처리방침 보관소.
 *
 * 개정 절차
 * 1. 고치기 전의 문서 객체(`TERMS_DOCUMENT` 또는 `PRIVACY_DOCUMENT`)를 그대로 복사해 아래 표의
 *    해당 kind에 시행일(effectiveDateTime) 키로 넣는다. 보관한 객체는 이후 고치지 않는다.
 * 2. `constants/legal.ts`의 현재 문서에서 본문, effectiveDate, effectiveDateTime, closing을 새 시행일로 고치고
 *    `history` 맨 앞에 새 항목(시행일, 개정 요약)을 추가한다.
 * 3. 시행일 7일 전부터 서비스 화면에 공지한다. 이용자에게 불리한 약관 변경은 30일 전부터 공지한다
 *    (이용약관 제3조, 개인정보 처리방침 13항).
 *
 * 보관한 버전은 `/terms/{시행일}`, `/privacy/{시행일}`에서 열람할 수 있다.
 */
import type { LegalDocumentData, LegalKind } from '@/constants/legal';

export const LEGAL_ARCHIVE: Record<LegalKind, Record<string, LegalDocumentData>> = {
  terms: {},
  privacy: {},
};

export function getArchivedDocument(kind: LegalKind, effectiveDateTime: string) {
  return Object.hasOwn(LEGAL_ARCHIVE[kind], effectiveDateTime) ? LEGAL_ARCHIVE[kind][effectiveDateTime] : undefined;
}

export function archivedVersions(kind: LegalKind) {
  return Object.keys(LEGAL_ARCHIVE[kind]);
}
