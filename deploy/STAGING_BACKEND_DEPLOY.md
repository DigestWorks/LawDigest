# Staging Backend Deploy Guide

운영 API를 바꾸지 않고 브랜치의 백엔드를 서버에서 실데이터로 확인하는 테스트 백엔드 절차다.

`deploy-test-backend.sh`는 이름과 달리 운영 API(`api.lawdigest.kr`)를 교체한다. 운영 전 검증에는 이 문서의 staging을 쓴다.

## 구성

| 항목 | 값 |
| --- | --- |
| 스크립트 | [`deploy-staging-backend.sh`](./deploy-staging-backend.sh) |
| 컨테이너 | `lawdigest-backend-staging` |
| 이미지 | `lawdigest-backend-staging` |
| 포트 | `127.0.0.1:8090` (외부 도메인·nginx 없음) |
| Spring profile | `prod` |
| DB | 운영 DB(`services/backend/.env`)를 함께 쓴다 |
| 로그 | `.runtime/staging-backend/logs` |

## 배포

서버의 공유 저장소에서 대상 브랜치의 워크트리를 만든 뒤 실행한다.

```bash
cd /home/ubuntu/project/Lawdigest
git fetch origin <branch>
git worktree add .worktrees/staging-<topic> origin/<branch>
./deploy/deploy-staging-backend.sh /home/ubuntu/project/Lawdigest/.worktrees/staging-<topic>
```

스크립트는 컨테이너·이미지·포트가 운영 값(`lawdigest-backend-test`, `:808`)과 겹치거나 대상 워크트리에 `.env.preview`가 있으면 멈춘다.

## 확인

```bash
curl -s http://127.0.0.1:8090/actuator/health
```

로컬 웹을 staging에 붙이려면 SSH 터널을 연 뒤 dev 서버의 API 주소를 바꾼다.

```bash
ssh -N -L 8090:127.0.0.1:8090 Oracle-Server
INTERNAL_API_ORIGIN=http://127.0.0.1:8090 NEXT_PUBLIC_URL=http://127.0.0.1:8090/ npm run dev
```

## 정리

```bash
docker rm -f lawdigest-backend-staging
git worktree remove .worktrees/staging-<topic>
```

## 주의

- 운영 DB를 쓰므로 staging에서 북마크·좋아요·알림 설정을 바꾸면 운영 데이터에 기록된다. 검증은 조회 위주로 한다.
- 백엔드에 예약 작업(`@Scheduled`)이 생기면 staging에서도 돈다. 그때는 staging용 비활성 설정을 먼저 추가한다.
