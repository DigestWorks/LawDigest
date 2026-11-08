# Apple로 로그인 설정

Apple로 로그인을 켜는 절차다. 백엔드는 Apple 값 다섯 개가 모두 있을 때만 Apple 로그인을 등록하고, 웹은 `NEXT_PUBLIC_APPLE_LOGIN_ENABLED=true`일 때만 버튼을 보인다. 값을 넣기 전에는 기존 로그인만 동작한다.

이 문서는 비밀값을 기록하지 않는다.

## 1. 운영 DB 컬럼 확인

`auth_info.provider`가 MySQL `ENUM`이면 Apple 가입 저장이 실패한다. Hibernate 6.2는 MySQL에서 `@Enumerated(STRING)` 컬럼을 `enum(...)`으로 만들고, `ddl-auto=update`는 기존 컬럼 타입을 바꾸지 않는다.

```sql
SELECT COLUMN_TYPE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auth_info' AND COLUMN_NAME = 'provider';
```

결과가 `varchar(...)`면 그대로 둔다. `enum('KAKAO','NAVER','GOOGLE')`이면 Apple 값을 넣기 전에 아래 DDL을 실행한다. 운영 테이블 구조를 바꾸는 작업이므로 백업 후 실행한다.

```sql
ALTER TABLE auth_info MODIFY provider VARCHAR(20) NOT NULL;
```

## 2. Apple Developer 콘솔

Apple Developer Program 멤버십과 Account Holder 또는 Admin 역할이 필요하다. 모두 Certificates, Identifiers & Profiles에서 한다.

1. App ID: Identifiers → + → App IDs → App에서 Explicit Bundle ID(예: `kr.lawdigest.app`)를 만들고 Capabilities에서 Sign in with Apple을 켠다. iOS 앱이 없어도 웹 설정의 기준(primary App ID)으로 필요하다.
2. Services ID: Identifiers → + → Services IDs에서 식별자(예: `kr.lawdigest.web`)를 등록한다. 이 값이 `APPLE_CLIENT_ID`다.
3. Services ID의 Sign in with Apple → Configure에서 1의 App ID를 고르고 Website URLs에 아래를 넣는다. 도메인 확인 파일은 필요 없다.
   - Domains: `api.lawdigest.kr`, `test.api.lawdigest.kr`
   - Return URLs: `https://api.lawdigest.kr/v1/login/oauth2/code/apple`, `https://test.api.lawdigest.kr/v1/login/oauth2/code/apple`
4. Key: Keys → +에서 Sign in with Apple을 체크하고 Configure에서 1의 App ID를 고른 뒤 저장한다. `.p8` 파일은 한 번만 내려받을 수 있다. 키 상세의 Key ID가 `APPLE_KEY_ID`다.
5. Team ID: 계정 Membership details의 Team ID가 `APPLE_TEAM_ID`다.

참고: [Configure Sign in with Apple for the web](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web), [Create a private key](https://developer.apple.com/help/account/keys/create-a-private-key)

## 3. 백엔드 환경 변수

서버의 `services/backend/.env`에 추가한다. 테스트와 운영 백엔드가 같은 파일을 쓰고, 반환 주소는 프로필(`ACTIVE=test`, `ACTIVE=prod`)이 정한다.

```dotenv
APPLE_CLIENT_ID=kr.lawdigest.web
APPLE_TEAM_ID=<Team ID>
APPLE_KEY_ID=<Key ID>
APPLE_PRIVATE_KEY=<.p8 본문>
```

`APPLE_PRIVATE_KEY`는 `.p8` 파일에서 `-----BEGIN PRIVATE KEY-----`, `-----END PRIVATE KEY-----` 줄을 빼고 나머지 줄을 이어 붙인 한 줄로 넣는다. 따옴표는 쓰지 않는다. BEGIN/END 줄과 `\n`이 섞여 있어도 서버가 본문만 읽는다.

넣은 뒤 백엔드를 다시 배포한다. 테스트는 [TEST_BACKEND_DEPLOY.md](./TEST_BACKEND_DEPLOY.md), 운영은 [PROD_BACKEND_DEPLOY.md](./PROD_BACKEND_DEPLOY.md)를 따른다.

## 4. 웹 버튼 켜기

`NEXT_PUBLIC_APPLE_LOGIN_ENABLED`는 빌드 때 들어가므로 값을 바꾸면 웹을 다시 배포한다.

- 테스트 웹만: 배포할 워크트리의 `services/web/.env.preview`에 `NEXT_PUBLIC_APPLE_LOGIN_ENABLED=true`를 넣고 `deploy/deploy-test-web.sh <target-worktree>`로 배포한다.
- 운영 웹: `.runtime/prod-web/service.env`에 같은 줄을 넣고 [PROD_WEB_DEPLOY.md](./PROD_WEB_DEPLOY.md) 절차로 배포한다.

## 5. 확인

1. `https://test.lawdigest.kr/login`에 "Apple로 계속하기" 버튼이 보인다.
2. Apple 계정으로 로그인하면 원래 보던 화면으로 돌아오고, 마이페이지에 Apple 이름(이름 공유를 거부했으면 이메일 @ 앞부분)이 보인다.
3. 마이페이지에서 탈퇴하면 iPhone 설정 → Apple 계정 → 로그인 및 보안 → Apple로 로그인 목록에서 모두의입법이 사라진다.

Apple은 `localhost` 반환 주소를 허용하지 않으므로 로컬 프로필에서는 Apple 로그인을 켜지 않는다.
