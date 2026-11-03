# 의원 공동발의 페이지 경계 구현

1. 기존 `BillReposiotryTest`에 같은 날짜의 공동발의 법안을 삽입하고 두 페이지의 순서를 검사한다.
2. `BillRepository.findBillByPublicProposer`의 단계 미지정 쿼리에 `b.id DESC`를 추가한다. 다른 목록이 사용하는 보조 정렬 기준이다.
3. 백엔드 회귀 테스트와 `bootJar`를 실행한다. 배포 뒤 이해식 의원의 공개 API 첫 두 페이지와 브라우저 추가 로딩을 대조한다.
