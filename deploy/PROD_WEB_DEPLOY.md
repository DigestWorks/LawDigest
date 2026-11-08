# Prod Web Deploy Guide

`lawdigest.kr` / `www.lawdigest.kr` 운영 프론트엔드 배포 절차 문서다.

운영 전체 기준은 [WEB_DEPLOY_ENVIRONMENTS.md](./WEB_DEPLOY_ENVIRONMENTS.md)를 먼저 참고한다.

## 기준

- 대상 브랜치: `main`
- 배포 도메인: `https://lawdigest.kr`, `https://www.lawdigest.kr`
- 배포 모드: production build + `npm run start`
- 스크립트: [`deploy-prod-web.sh`](./deploy-prod-web.sh)

## 사용법

```bash
./deploy/deploy-prod-web.sh <target-worktree>
```

예시:

```bash
WEB_PORT=3010 PM2_NAME=lawdigest-web-prod ./deploy/deploy-prod-web.sh /home/ubuntu/project/Lawdigest/.worktrees/prod-web-release
```

## 메모

- 운영 배포는 `main` 기준 상태만 올린다.
- PM2/포트/nginx 실제 운영 값은 서버 환경에 맞춰 override할 수 있다.
- release는 대상 worktree가 아니라 공유 저장소의 `.runtime/prod-web`에 유지한다.
- 릴리스에는 실행 산출물을 한 번 복사한다. Webpack 빌드 캐시는 제외한다. 복사에 실패하면 해당 배포가 만든 미완성 디렉터리를 정리한다.
- 상세 런타임 구조는 공통 release/symlink 방식으로 [deploy-web-release.sh](./deploy-web-release.sh)를 따른다.

- 의존성 설치 전에 최근 6개와 current·previous·PM2 실행 릴리스를 보존하고 이전 빌드 산출물을 정리한다. 보관 개수는 WEB_RELEASES_TO_KEEP으로 설정하며 최소 2개다.
- 복사 전 webpack 캐시를 제외한 예상 용량과 512MiB 여유를 확인한다. 공간이 부족하거나 PM2 정보를 읽지 못하면 배포를 중단한다.
- 성공한 배포는 previous 링크에 직전 정상 릴리스를 기록한다. 이후 실패한 산출물이 누적돼도 롤백본을 보존한다.
