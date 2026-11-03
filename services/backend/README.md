# 모두의입법 API

Spring Boot 3.1과 Java 17로 법안·의원·정당·계정 API를 제공합니다. 서비스 데이터는 MySQL에 저장합니다. 로컬 인프라는 MySQL과 Redis로 구성합니다.

## 로컬 실행

- Java 17과 Docker Compose를 준비합니다.
- 로컬 MySQL·Redis 접속 정보, JWT와 OAuth 테스트 설정을 실행 환경에 주입합니다. 필요한 변수 이름은 Spring 설정 파일에서 확인할 수 있습니다. [공통 설정](src/main/resources/application.properties) · [로컬 설정](src/main/resources/application-local.properties)

저장소 루트에서 인프라를 시작한 뒤 `local` 프로필로 실행합니다. 이 프로필의 스키마 갱신 대상은 로컬 개발 DB로 지정합니다.

```bash
docker compose up -d mysql redis
cd services/backend
ACTIVE=local ./gradlew bootRun
```

API가 준비되면 헬스체크와 공개 피드 응답을 확인합니다.

```bash
curl --fail http://127.0.0.1:8080/actuator/health
curl --fail 'http://127.0.0.1:8080/v1/bill/mainfeed?page=0&size=1'
```

## 검증과 배포

```bash
./gradlew test bootJar
```

운영 API는 배포 스크립트의 헬스체크와 전환 절차를 따릅니다. [운영 API 배포](../../deploy/PROD_BACKEND_DEPLOY.md)
