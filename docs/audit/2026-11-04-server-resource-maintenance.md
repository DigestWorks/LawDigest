# 서버 리소스 정리와 운영 복구

2026년 11월 4일 캐시를 정리하고 로그 회전·Docker CPU·개발 watchdog을 복구했다.

- 최초 루트 디스크 사용률 92%, 가용 약 17GiB. Docker 및 npm 캐시 정리 후 89%, 약 23GiB.
- Docker CPU 프로파일의 99.4%가 로그 tail 경로에 집중됐다. 83일간 멈춘 `docker logs --tail 30 couchdb` 조회 프로세스를 종료한 뒤 Docker CPU 표본이 약 100%에서 1%로 감소했다. CouchDB는 계속 실행 중이다.
- 디스크 부족으로 시작에 실패한 기존 Expresso MongoDB 컨테이너를 기존 설정과 데이터로 시작했고 healthy를 확인했다.
- 오래된 개발 watchdog 40개와 그 자식 40개를 종료했다. PM2 데몬과 앱 12개 프로세스는 제외했다.
- 빈 nginx·PM2 PID 파일은 실제 실행 프로세스 신원을 확인해 복구했다. nginx 설정 검사와 공식 reload, PM2 현재 앱 목록 저장을 통과했다.
- 사용자 지시에 따라 papers 도메인의 nginx 활성 링크와 인증서 갱신 설정을 제거·백업하고 `papers-webdav.service`를 중지·비활성화했다. 별도 `research-webdav.service`, 연구 문서, 기존 인증서와 키는 보존했다.

## 정리 범위

Docker 빌드 캐시는 7일 이상 사용되지 않은 항목을 대상으로 1GB 보존 설정을 사용했다. Docker 이미지는 7일 이상 지났고 어떤 컨테이너도 참조하지 않는 항목만 정리했다. Docker 보고 회수량은 빌드 캐시 2.799GB, 이미지 3.694GB다. npm 다운로드 캐시도 정리했다. DB 볼륨과 사용자 파일은 삭제하지 않았다.

`/etc/logrotate.d/rsyslog.bak.20260822-161201`가 기존 rsyslog 로그 경로를 중복 등록해 매일 회전이 실패했다. 백업 파일을 include 디렉터리 밖으로 옮긴 뒤 debug 검사와 실제 `logrotate.service` 실행이 성공했다.

복구 전 설정은 서버 `/var/backups/lawdigest-resource-20261104/`에 root 전용 권한으로 보관했다. 서버 저장소에 있던 다른 세션의 almanac 변경은 수정하지 않았다.

## watchdog 변경

- 전체 실행과 자식 프로세스에 45초 제한, 종료 지연 시 5초 뒤 강제 종료.
- 런타임별 `flock`으로 중복 실행 차단.
- 정상 앱에서 매분 `pm2 save`를 실행하던 동작 제거.
- cron 환경을 `cd` 이후 실제 스크립트에 전달하고 기존 `RUNTIME_ROOT`를 명시.
- watchdog 변경은 운영 웹의 빌드·배포 대상으로 분류하지 않음. 셸 문법 검사는 CI에서 수행.

격리된 PM2 대역으로 동시 실행 시 조회 1회·정상 앱 저장/재시작 0회, 응답 정지 시 45초 종료를 확인했다. 셸 문법과 배포 정책 검사를 통과했다.

## 남은 운영 항목

1. nginx·PM2 프로세스는 정상 실행 중이지만 systemd 관리 그룹 밖에 있다. 강제 편입은 자동 승인 검토가 서비스 중단 및 관리 상태 손상 위험으로 거절해 실행하지 않았다. 재부팅 시 복구 설정이 활성화돼 있는 사실과 실제 재부팅 검증은 구분한다.
2. 만료된 `api.lawdigest.net`, `dev.lawdigest.net`, `test.api.lawdigest.net`, `test.lawdigest.net`은 현재 다른 IP를 가리킨다. 네 도메인의 자동 갱신 설정 일괄 보관 작업은 자동 승인 검토가 영향 범위를 이유로 거절했다. papers 종료 지시를 네 도메인 변경 승인으로 확대하지 않았다.
3. MongoDB와 CouchDB의 Docker 로그가 각각 약 11.4GB, 3.1GB이며 회전 제한이 없다. 외부 도구로 Docker JSON 로그를 자르지 않았다. 데이터 소유 프로젝트에서 로그 보존 기준과 컨테이너 재생성 절차를 정해 적용해야 한다.
4. `expresso.ai.kr-wildcard` 인증서는 manual 인증 방식이며 현재 만료까지 약 82일이다. 다음 갱신의 DNS 자동화 여부 확인이 필요하다.
5. 별도 research WebDAV는 보존 중이다. 사용자에게 추가 폐기 지시가 있으면 연결 클라이언트를 확인한 뒤 종료한다.

## 공식 근거

- [Docker 이미지 prune](https://docs.docker.com/reference/cli/docker/image/prune/)
- [Docker 빌드 캐시 prune](https://docs.docker.com/reference/cli/docker/builder/prune/)
- [nginx 프로세스 제어](https://nginx.org/en/docs/control.html)
- [PM2 시작 및 앱 목록 저장](https://pm2.keymetrics.io/docs/usage/startup/)
- [Docker JSON 로그 회전과 외부 수정 주의](https://docs.docker.com/engine/logging/drivers/json-file/)
