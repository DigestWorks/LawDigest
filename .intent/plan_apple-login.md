---
title: Apple로 로그인 추가
slug: apple-login
stage: plan
status: accepted
intent: .intent/intent_apple-login.md
spec: .intent/spec_apple-login.md
date: 2026-11-08
---

# Apple로 로그인 추가 — 구현 계획

## 바뀌는 파일

백엔드 경로 접두어 `services/backend/src/main/java/com/everyones/lawmaking/`는 생략한다.

| 파일 | 무엇을 |
|---|---|
| `domain/entity/Provider.java` | `APPLE` 추가 |
| `global/config/OAuthConfig/AppleProperties.java` (새) | `app.auth.apple.*` 바인딩, `isConfigured()` |
| `global/auth/apple/AppleClientSecretGenerator.java` (새) | ES256 `client_secret` 생성, private key 정규화 |
| `global/auth/apple/AppleIdTokenVerifier.java` (새) | JWKS 서명·iss·aud 검증 |
| `global/auth/apple/AppleAwareTokenRequestConverter.java` (새) | 토큰 요청 `client_secret` 교체 |
| `global/config/OAuthConfig/OAuthClientRegistrationConfig.java` (새) | 기존 등록 + 조건부 Apple 등록 |
| `global/config/SecurityConfig.java` | `tokenEndpoint` 연결 |
| `global/auth/socialInfo/AppleOAuth2UserInfo.java` (새), `OAuth2UserInfoFactory.java` | Apple 속성 해석 |
| `global/service/CustomOAuth2UserService.java` | Apple 분기 |
| `global/config/OAuthConfig/AppleClientProperties.java` (새), `service/AppleOAuthService.java` (새) | 탈퇴 시 refresh·revoke |
| `src/main/resources/application*.properties` | `app.auth.apple.*` 환경 변수와 프로필별 redirect-uri |
| `src/test/.../apple/*Test.java` (새) | 생성기, 검증기, 변환기, 등록, 사용자 정보 테스트 |
| `services/web/lib/loginNavigation.ts`, `app/login/page.tsx`, `app/login/appleLogin/page.tsx` (새) | 버튼과 콜백 |
| `deploy/APPLE_LOGIN_SETUP.md` (새) | Apple 콘솔·`.env`·DB 확인 절차 |

## 작업 순서

1. `Provider`, `AppleProperties`, `AppleClientSecretGenerator`와 테스트 — 테스트에서 만든 EC 키로 서명한 JWT를 공개키로 파싱해 header·claims를 확인한다.
2. `OAuthClientRegistrationConfig`와 테스트 — 설정 없으면 `apple` 없음, 있으면 authorize URI에 `response_mode=form_post`가 붙는다.
3. `AppleAwareTokenRequestConverter`, `SecurityConfig` 연결과 테스트 — `apple` 요청 본문에 생성된 `client_secret`, 다른 제공자는 그대로.
4. `AppleIdTokenVerifier`, `AppleOAuth2UserInfo`, `CustomOAuth2UserService` 분기와 테스트 — 로컬 RSA 키로 만든 id_token에서 잘못된 aud가 거부되고, 이름·이메일 대체 규칙이 맞다.
5. `AppleClientProperties`, `AppleOAuthService` — 기존 `UserFacadeWithdrawalTest` 통과, revoke 요청 파라미터 테스트.
6. properties 파일 — `./gradlew test`로 컨텍스트가 뜨는지 확인.
7. 웹 버튼·콜백 — `npm run lint`, `npm test`.
8. `deploy/APPLE_LOGIN_SETUP.md` — 콘솔 설정, `.env` 키 이름, DB ENUM 확인 SQL.

## 가장 위험한 단계

2단계. `ClientRegistrationRepository` 빈을 직접 만들면 Boot 자동 구성이 물러나므로, 매핑이 잘못되면 카카오·구글·네이버 로그인이 모두 깨진다. 테스트에서 세 등록의 authorization/token URI와 redirect-uri가 properties 값과 같은지 확인한다. 깨지면 이 설정 클래스만 지우면 Boot 자동 구성으로 돌아간다.

## 검증

```
cd services/backend && ./gradlew test
cd services/web && npm ci && npm run lint && npm test && npm run build
```

실제 Apple 로그인은 Apple 콘솔 값을 넣은 뒤 `test.lawdigest.kr` 로그인 화면 → Apple로 계속하기 → 마이페이지 이름 확인 → 탈퇴 → Apple 계정 설정에서 앱 사라짐 순으로 확인한다.
