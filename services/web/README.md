# 모두의입법 웹

Next.js 15 App Router로 피드, 법안 상세, 타임라인, 탐색, 검색과 계정 화면을 제공합니다.

## 로컬 실행

- CI와 같은 Node.js 22.17.1을 사용합니다.
- 로컬 백엔드를 먼저 실행합니다. [백엔드 실행](../backend/README.md)

저장소 루트에서 다음 명령을 실행한 뒤 `http://localhost:3000`에서 확인합니다.

```bash
cd services/web
npm ci
INTERNAL_API_ORIGIN=http://127.0.0.1:8080 npm run dev
```

`INTERNAL_API_ORIGIN`은 서버 조회와 웹의 `/v1` 프록시가 사용할 API 주소입니다. OAuth를 검증할 때는 `NEXT_PUBLIC_DOMAIN`과 `NEXT_PUBLIC_URL`을 대상 웹과 API 주소에 맞추고, 인증 제공자의 콜백 설정을 확인합니다. 이미지 검증에는 `NEXT_PUBLIC_IMAGE_URL`과 `NEXT_PUBLIC_HOSTNAME`을 사용합니다.

## 검증과 프로덕션 미리보기

```bash
npm run lint
npm test
INTERNAL_API_ORIGIN=http://127.0.0.1:8080 npm run build
INTERNAL_API_ORIGIN=http://127.0.0.1:8080 HOSTNAME=127.0.0.1 PORT=3000 npm start
```

배포 대상과 스크립트는 도메인별 기준을 따릅니다. [웹 배포 환경](../../deploy/WEB_DEPLOY_ENVIRONMENTS.md)
