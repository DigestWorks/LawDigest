# 2차 화면 복구 진행 기록

공개 상세의 HTTP 404와 일시 장애 재시도를 로컬 production 빌드에서 확인했으며, 계정·최신성·나머지 빈 상태 검증은 이어서 진행한다.

- 운영 `/bill/NOPE`, `/congressman/NOPE`, `/party/99999`는 모두 HTTP 200, 제목 없음, 전역 로딩 스플래시가 포함된 상태로 다시 재현했다.
- 새 상세 페이지는 공개 데이터를 먼저 확인한다. 400/404는 찾을 수 없음으로, 일시 오류는 별도 복구 화면으로 처리한다.
- 로그인 요청에서 Google `redirect_uri_mismatch`를 재현했다. 실제 계정의 세션 만료·개인화 검증을 시작하려면 OAuth 설정 수정 또는 기존 다른 소셜 계정 로그인이 필요하다.
- 이 기록은 2차 전체나 운영 배포의 완료를 뜻하지 않는다. PR #153은 상위 변경이며 2차 완료 뒤 머지·운영 검증을 진행한다.

## W9: 상세 주소, 오류, 로딩

`publicDetail.ts`에서 인증 인터셉터와 분리한 읽기 전용 상세 요청을 사용한다. 누락 응답은 `notFound()`로 전달하고, 연결·응답 실패에서 상류의 URL과 예외 객체·응답 원문을 넘기지 않는다. 의원·정당 서버 데이터를 일치하는 쿼리 키에 채워 hydration한다. Java `BaseResponse.code`의 실제 숫자 타입에 웹 타입을 맞췄다.

전역 `loading.tsx`가 스트리밍을 시작하기 전에 상세의 존재를 판단해야 실제 HTTP 404를 반환할 수 있다. 목록의 로딩은 피드·타임라인·탐색·검색 영역 안의 스켈레톤으로 분리했다. 상세의 실패 경계는 공용 복구 요소로 이전 화면·피드·재시도를 제공한다. 서버가 복구됐어도 경계만 초기화하면 기존 오류가 남는 것을 확인해, 재시도에 서버 경로의 새 요청을 연결했다.

| 확인 | 결과 |
| --- | --- |
| 없는 법안·의원·정당, 잘못된 정당 ID, 미등록 경로 | 로컬 production 서버 HTTP 404, ‘페이지를 찾을 수 없습니다’ 제목, `noindex` |
| 백엔드 503 표본 | 로컬 production 서버 HTTP 500, 전용 복구 화면, 상류 오류 원문 미노출 |
| 정상 공개 법안 상세 | HTTP 200, 실제 법안 제목·본문 렌더 |
| 장애 표본 복구 뒤 ‘다시 시도’ | 브라우저에서 정상 법안 본문으로 전환 |
| 실제 화면 | CSS 375px 라이트·1440px 다크 404, 단일 제목과 이동 버튼, 375px 재시도 확인 |
| 웹 검증 | ESLint·TypeScript·Vitest 73건·Next production build 통과 |

HTTP 계약 검사는 PR #153의 백엔드 404 응답을 재현한 로컬 fixture를 사용했다. 정상 상세는 공개 API GET을 사용했고 조회수 PATCH는 로컬에서 처리했다. 운영 화면에는 이 변경을 아직 반영하지 않았다. W9의 목록별 빈 상태와 세부 실패 처리는 남아 있다.

## W7: 운영 구글 로그인 차단

운영 로그인 페이지에서 실제 사용자 시도로 구글의 ‘액세스 차단됨’과 `redirect_uri_mismatch`를 확인했다. 운영 OAuth 시작 API의 HTTP 302가 전달한 `redirect_uri`는 `https://api.lawdigest.kr/v1/login/oauth2/code/google`이며 코드와 일치한다. 운영 OAuth 클라이언트의 승인 URI 설정을 확인할 수 있도록 [이슈 #156](https://github.com/DigestWorks/LawDigest/issues/156)을 등록했다. 계정 정보·토큰·인증 요청의 비공개 값은 기록하지 않는다.

실제 로그인 성공 뒤에 30분 만료·재발급·스크랩·팔로우·알림을 재현한다. 현재까지 인증 코드 변경은 없다. 정책 문안의 운영 주체·공개 문의·보관 기준은 사용자 결정 대기 상태다.

## 관련 근거

- [승인된 handoff](./2026-11-02-handoff.md), [결함 목록](./2026-11-02-ux-polish-findings.md), `.intent/intent_ux-polish-round-two.md`·`spec_ux-polish-round-two.md`·`plan_ux-polish-round-two.md`.
- [Next.js의 not-found 응답 규칙](https://nextjs.org/docs/app/api-reference/file-conventions/not-found), [구글 OAuth 오류 안내](https://developers.google.com/identity/protocols/oauth2/web-server#authorization-errors).
