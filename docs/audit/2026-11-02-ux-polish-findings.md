# 모두의입법 사용자 화면 감사 — 결함 전체 목록

작성일: 2026-11-02

본 보고서: [2026-11-02-ux-polish-audit.md](./2026-11-02-ux-polish-audit.md)

각 항목의 근거는 감사 시점(main `48c52a4`, 운영 lawdigest.kr)의 파일 위치와 운영 응답이다. "검증"은 반박 검증자의 판정이다. confirmed는 그대로 확인, adjusted는 심각도나 수정안을 고쳐 확인, critic은 누락 점검자가 새로 찾아 직접 확인한 항목이다.

## 전역 셸 (SHELL)

### SHELL-01 검색어 지우기(x) 버튼이 존재하지 않는 /search 경로로 이동해 404가 뜬다

- 분류: major · bug · 작업량 S · 검증 adjusted
- 사용자 영향: 검색 모달에서 입력값을 지우려고 x를 누르면 '페이지를 찾을 수 없습니다' 화면으로 이동합니다. 사용자는 검색을 다시 시작하려면 뒤로 가기를 눌러야 합니다.
- 근거: services/web/components/common/SearchBar/SearchBar.tsx:58 `onClear={() => router.push('/search')}`. app/search 아래에는 [id]와 apis만 있고 page.tsx가 없습니다. curl https://lawdigest.kr/search → 404.
- 수정안: onClear는 입력값만 비우도록 `setValue('')`로 바꿉니다. 검색 진입 화면이 필요하면 app/search/page.tsx를 만들어 최근 검색어와 추천을 보여 줍니다.
- 검증 메모: SearchBar.tsx:58 `onClear={() => router.push('/search')}`를 확인했습니다. HeroUI handleClear(node_modules/@heroui/input/dist/chunk-MSLIMGMJ.mjs:68-73)는 setInputValue('') 뒤에 onClear를 호출합니다. 따라서 값이 지워진 뒤 /search로 이동합니다. app/search에는 [id]와 apis만 있고 curl https://lawdigest.kr/search 는 404입니다. SearchModal은 루트 레이아웃(app/layout.tsx:89)에 있고 SearchBarButton(헤더, /following, /search/[id])에서 열리므로 재현 경로가 실재합니다. 검색 자체는 동작하고 입력 지우기 동작만 깨지므로 blocker가 아니라 major로 조정합니다.
- 파일: `services/web/components/common/SearchBar/SearchBar.tsx`

### SHELL-02 데스크톱의 피드·타임라인·탐색·마이페이지에 검색 진입점이 없다

- 분류: major · ux · 작업량 M · 검증 confirmed
- 사용자 영향: 768px 이상 화면에서는 모바일 검색 FAB가 숨겨집니다. 헤더에는 테마 토글과 알림 종만 있습니다. 데스크톱 사용자는 법안 상세 페이지에 들어가기 전까지 검색할 방법이 없습니다.
- 근거: Header의 SearchButton은 `search` prop이 있을 때만 렌더됩니다(components/Layout/Header/Header.tsx:110-119). `search` prop은 app/bill/[id]/layout.tsx:11, app/congressman/[id]/layout.tsx:11, app/party/[id]/layout.tsx:11에만 있습니다. styles/mobile-floating-nav.css:414-418에서 48rem 이상이면 FAB를 숨깁니다. 데스크톱 피드 스크린샷(f5jpeo)의 헤더에는 해와 종 아이콘만 있습니다.
- 수정안: 헤더 오른쪽 컨트롤을 전 화면에서 같은 묶음(검색, 테마, 알림)으로 고정합니다. Layout의 logo/search/notification/theme 조합 prop을 없애고 Header가 한 가지 컨트롤 세트를 항상 렌더하게 합니다. 데스크톱 검색은 헤더 안의 인라인 검색 필드로 바로 입력받게 합니다.
- 검증 메모: Header.tsx:110-119에서 SearchButton은 search prop일 때만 렌더됩니다. search prop은 bill/congressman/party layout에만 있습니다. 피드(app/page.tsx:23), timeline, explore, mypage layout은 `logo notification`입니다. mobile-floating-nav.css:563-567에서 48rem 이상이면 wrapper를 숨깁니다. 보완 사항으로 /following은 lg 이상에서 SearchBarButton을 보여 주고(app/following/page.tsx:34-36) 탐색의 TrendingKeywords는 고정 키워드 링크(/search/{kw})를 제공합니다. 자유 입력 검색 진입점이 피드·타임라인·탐색·마이페이지 데스크톱에 없다는 지적은 맞습니다.
- 파일: `services/web/components/Layout/Header/Header.tsx`, `services/web/components/Layout/Layout/Layout.tsx`, `services/web/app/timeline/layout.tsx`, `services/web/app/explore/layout.tsx`, `services/web/app/mypage/layout.tsx`, `services/web/app/following/layout.tsx`, `services/web/app/page.tsx`

### SHELL-03 모바일 검색 FAB가 대화형 질의응답을 약속하지만 실제로는 키워드 검색이라 엉뚱한 결과가 나온다

- 분류: major · trust · 작업량 S · 검증 confirmed
- 사용자 영향: 검색 버튼을 열면 '최근 통과된 주요 법안은?', '의료법 개정안 진행 상황이 궁금해요', '이번 회기 국회 일정 알려줘' 버블과 '궁금한 입법 현황을 질문해 보세요' 안내가 나옵니다. 버블을 누르면 질문과 무관한 법안 목록이 나옵니다. 국회 일정 기능은 없습니다. 사용자는 서비스가 질문을 이해하지 못한다고 판단합니다.
- 근거: components/Layout/Nav/Nav.tsx:11-15 SEARCH_SUGGESTIONS 하드코딩, :322 placeholder. GET https://api.lawdigest.kr/v1/search/bill?search_word=의료법 개정안 진행 상황이 궁금해요 → 지방세특례제한법, 항공안전법. '이번 회기 국회 일정 알려줘' → 외국환거래법(대안), 가사소송법. '최근 통과된 주요 법안은?' → 소득세법, 마약류 관리법(모두 발의 단계).
- 수정안: 검색 엔진이 지원하는 입력(법안명, 의원명, 정당명)에 맞춰 placeholder를 헤더 검색과 같은 '법안, 의원, 정당명으로 검색'으로 통일합니다. 추천 버블은 실제 결과가 있는 키워드(최근 검색어, 인기 키워드 API)로 바꿉니다. 자연어 질의 기능을 만들기 전까지 질문형 문구를 쓰지 않습니다.
- 검증 메모: Nav.tsx:11-15 SEARCH_SUGGESTIONS와 :322 placeholder '궁금한 입법 현황을 질문해 보세요'를 확인했습니다. 버블 클릭은 handleSearchSubmit으로 /search/{문장}에 이동합니다(:289, :76). GET https://api.lawdigest.kr/v1/search/bill?search_word=의료법 개정안 진행 상황이 궁금해요 → 첫 결과 '지방세특례제한법 일부개정법률안', '이번 회기 국회 일정 알려줘' → '외국환거래법 일부개정법률안(대안)', '최근 통과된 주요 법안은?' → '소득세법 일부개정법률안'(발의일 2026-07-09)을 직접 받았습니다. 인기 키워드 API(app/explore/apis/apis.ts:16 getTrendingKeywords)가 이미 있어 수정안도 실행 가능합니다.
- 파일: `services/web/components/Layout/Nav/Nav.tsx`

### SHELL-04 회원탈퇴 기능이 어떤 화면에서도 도달할 수 없다

- 분류: major · trust · 작업량 S · 검증 confirmed
- 사용자 영향: OAuth로 가입한 사용자는 계정을 삭제할 방법이 없습니다. 개인정보를 다루는 서비스에서 탈퇴 경로가 없으면 신뢰를 크게 잃습니다.
- 근거: WithdrawModal은 SettingButton 안에서만 열립니다(components/common/Button/SettingButton.tsx:12,20). SettingButton은 Header의 `setting` prop이 참일 때만 렌더됩니다(Header.tsx:99-108). `setting` prop을 넘기는 layout이 없습니다(grep 결과 Layout.tsx, Header.tsx 내부 정의만 존재). '탈퇴' 문자열은 Modal과 SettingButton 밖에 없습니다. DropdownMenu aria-label은 템플릿 문자열 'Static Actions'입니다(SettingButton.tsx:19).
- 수정안: 마이페이지 계정 영역에 로그아웃 옆으로 회원탈퇴 진입점을 둡니다. 사용되지 않는 Header의 setting 분기를 지웁니다. 탈퇴 확인 모달에는 되돌릴 수 없다는 경고를 둡니다.
- 검증 메모: '탈퇴'/'withdraw' grep 결과는 SettingButton.tsx, WithdrawModal.tsx뿐입니다. SettingButton은 Header.tsx:99-108 setting 분기에서만 렌더되고 `<Layout ... setting` 을 넘기는 곳은 14개 Layout 사용처 중 없습니다. app/mypage/components/UserInfo에는 LogoutButton만 있습니다. SettingButton.tsx:19 aria-label 'Static Actions'도 확인했습니다. WithdrawModal.tsx:26-28은 '주의' / '회원탈퇴를 진행하시겠습니까 ?'만 있고 되돌릴 수 없다는 결과 경고가 없습니다.
- 파일: `services/web/components/common/Button/SettingButton.tsx`, `services/web/components/common/Modal/WithdrawModal.tsx`, `services/web/components/Layout/Header/Header.tsx`, `services/web/app/mypage/components/UserInfo/LogoutButton.tsx`

### SHELL-05 푸터가 없어 서비스 소개, 데이터 출처, 문의, 이용약관, 개인정보처리방침에 접근할 수 없다

- 분류: major · trust · 작업량 M · 검증 confirmed
- 사용자 영향: 사용자는 이 서비스를 누가 운영하는지, 데이터가 어디서 오고 언제 갱신됐는지, 문제를 어디에 알려야 하는지 알 수 없습니다. 소셜 로그인으로 개인정보를 받으면서 개인정보처리방침 링크가 없습니다. 운영 DB 최신 발의일이 2026-07-09인데 데이터 기준일을 보여 주는 곳도 없습니다.
- 근거: app, components 전체에서 `<footer`, '이용약관', '개인정보', 'privacy', 'terms', '문의하기', 'contact' grep 결과 0건. app/layout.tsx:86-95에는 main과 Nav만 있습니다. 로그인 화면(app/login/page.tsx)에도 약관 동의 링크가 없습니다.
- 수정안: 루트 레이아웃에 데스크톱 푸터와 마이페이지 하단 링크 묶음을 추가합니다. 서비스 소개, 데이터 출처(국회 의안정보시스템), 데이터 최종 갱신일, 문의 채널, 이용약관, 개인정보처리방침을 둡니다. 로그인 버튼 아래에 약관과 개인정보처리방침 링크를 둡니다. 모바일에서는 플로팅 내비 높이만큼 하단 여백을 확보한 뒤 푸터를 배치합니다.
- 검증 메모: app, components에서 `<footer|이용약관|개인정보|privacy|terms|문의하기|contact` grep 결과 0건입니다. '출처|기준일|의안정보' grep도 사용자 화면 문구로는 0건입니다. app/layout.tsx:86-95에는 main(children, SearchModal, Snackbar, GoToTopButton)과 Nav만 있습니다. app/login/page.tsx는 로고와 OAuth 버튼 3개만 있고 약관·개인정보처리방침 링크가 없습니다.
- 파일: `services/web/app/layout.tsx`, `services/web/app/login/page.tsx`

### SHELL-07 탐색 화면 아이콘 3개를 위해 4MB Material Symbols 폰트를 모든 페이지에서 render-blocking으로 불러온다

- 분류: major · perf · 작업량 S · 검증 adjusted
- 사용자 영향: 모든 페이지가 head에서 Google Fonts CSS를 기다립니다. 탐색 화면에서는 font-display: block 때문에 아이콘 자리가 최대 3초 비어 있습니다. 그 뒤에는 폰트가 늦으면 'account_balance', 'monitoring' 같은 영문 단어가 그대로 보입니다. 모바일 데이터 사용량도 늘어납니다.
- 근거: app/layout.tsx:68-72 `Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block`. 브라우저 UA로 받은 woff2 크기 4,005,964 bytes, CSS의 font-display: block. 사용처는 app/explore/components/* 10개 파일뿐입니다. /explore SSR HTML 텍스트에 'tag 분야 account_balance 국회 monitoring 통계'가 그대로 들어 있습니다.
- 수정안: 범위를 '모든 페이지 render-blocking CSS 요청 + 탐색 화면의 4MB 폰트와 아이콘 공백'으로 바로잡습니다. 수정안(루트에서 제거, SVG 컴포넌트로 교체, 또는 icon_names subset + display=swap을 explore에서만 로드)은 유효합니다.
- 검증 메모: app/layout.tsx:69-72 Material Symbols 링크(display=block)와 woff2 4,005,964 bytes, CSS font-display: block을 확인했습니다. /explore SSR 텍스트에 'tag 분야 account_balance 국회 monitoring 통계'가 있습니다. 두 가지 근거가 틀렸습니다. 첫째, 사용 아이콘은 3개가 아니라 calendar_month, chevron_right, close, local_fire_department, trending_up과 데이터 기반 이름(tag, account_balance, monitoring 등)을 포함한 여러 개입니다. 둘째, 브라우저는 해당 font-family를 쓰는 글리프가 있을 때만 woff2를 내려받습니다. 사용처는 app/explore/components 10개 파일뿐이므로 4MB 다운로드는 탐색 화면에서만 발생합니다. 다른 페이지에서는 작은 Google Fonts CSS 요청만 render-blocking입니다. 탐색은 주 탭이고 모바일에서 4MB와 최대 3초 빈 아이콘이 생기므로 major는 유지합니다.
- 파일: `services/web/app/layout.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`, `services/web/app/explore/components/ExploreSidebar.tsx`

### SHELL-08 페이지 제목에 '타임라인 페이지' 같은 잔재가 남아 있고 사이트 이름이 붙지 않으며 공유 미리보기가 모두 홈과 같다

- 분류: major · seo · 작업량 S · 검증 confirmed
- 사용자 영향: 브라우저 탭과 검색 결과에 '타임라인 페이지', '탐색 페이지', '마이 페이지', '알림 페이지', '검색 페이지'가 보입니다. 로그인 화면 제목은 '회원가입 페이지'입니다. 탭이 여러 개 열리면 어느 서비스인지 알 수 없습니다. /timeline 링크를 공유해도 홈과 같은 제목, 설명, URL이 미리보기에 나옵니다.
- 근거: curl 결과: /timeline `<title>타임라인 페이지</title>`, /explore '탐색 페이지', /search/abc '검색 페이지', /login '회원가입 페이지'. 모든 목록 페이지의 og:title='모두의입법', og:url='https://www.lawdigest.kr', canonical 없음. app/layout.tsx:20 `title: siteConfig.title`이 template 객체가 아닙니다. app/following/layout.tsx:6 설명 '내가 정보한 정보들을'(오탈자). app/congressman/[id]/layout.tsx:5 '의원 페이지'와 헤더 '의원 프로필'이 다릅니다. 검색 결과 제목에 검색어가 없습니다.
- 수정안: 루트 metadata를 `title: { default: '모두의입법', template: '%s | 모두의입법' }`으로 바꿉니다. 각 layout 제목을 '타임라인', '탐색', '팔로잉', '알림', '마이페이지', '로그인'으로 고칩니다. 검색은 generateMetadata로 '"{검색어}" 검색 결과'를 씁니다. 목록 페이지마다 alternates.canonical과 openGraph.url을 경로별로 지정합니다. 설명문은 사용자가 얻는 내용을 적습니다.
- 검증 메모: curl 결과 /timeline '타임라인 페이지', /explore '탐색 페이지', /login '회원가입 페이지', /mypage '마이 페이지', /notification '알림 페이지', /following '팔로잉 페이지', /search/abc '검색 페이지'입니다. 모든 목록 페이지의 og:title='모두의입법', og:url='https://www.lawdigest.kr'이고 canonical이 없습니다. app/layout.tsx:20 `title: siteConfig.title`은 template이 아닙니다. app/following/layout.tsx:6 '내가 정보한 정보들을', app/congressman/[id]/layout.tsx:5 '의원 페이지'를 확인했습니다. 법안 상세는 getMetadata로 '{제목} | 모두의입법'이 붙습니다.
- 파일: `services/web/app/layout.tsx`, `services/web/app/timeline/layout.tsx`, `services/web/app/explore/layout.tsx`, `services/web/app/following/layout.tsx`, `services/web/app/mypage/layout.tsx`, `services/web/app/notification/layout.tsx`, `services/web/app/login/layout.tsx`, `services/web/app/search/[id]/layout.tsx`

### SHELL-09 존재하지 않는 법안·의원·정당 URL이 404가 아니라 HTTP 200과 '페이지가 작동하지 않습니다' 오류 화면을 낸다

- 분류: major · bug · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 오래된 링크나 잘못된 링크로 들어온 사용자는 서비스가 고장 났다고 판단합니다. 검색 엔진은 오류 화면을 정상 페이지로 색인합니다(soft 404). 페이지 제목도 비어 있습니다.
- 근거: curl https://lawdigest.kr/bill/NOPE, /bill/1, /congressman/NOPE, /party/99999 → 모두 200. /bill/1 HTML에 `<title>` 없음, RSC payload에 `E{"digest":"88453202"}` 오류 항목, 404 이미지 없음. 백엔드 GET https://api.lawdigest.kr/v1/bill/detail/NOPE → HTTP 500 '서버 내부 오류입니다.'. app/bill/[id]/page.tsx:13-24, 26-33에 notFound() 처리가 없습니다.
- 수정안: 수정안에 더해 서버 스택이 HTML payload로 직렬화되지 않게 합니다. 오류 객체를 그대로 넘기지 말고 notFound() 또는 메시지만 담은 오류로 바꿉니다.
- 검증 메모: curl 결과 /bill/NOPE, /bill/1, /congressman/NOPE, /party/99999 모두 HTTP 200입니다. /bill/1 HTML에는 `<title>`이 없고 RSC payload에 E{"digest":"88453202"} 등 오류 항목이 있습니다. GET https://api.lawdigest.kr/v1/bill/detail/NOPE → 500 '서버 내부 오류입니다.'입니다. app/bill/[id]/page.tsx:13-34에 notFound() 처리가 없고 app 전체 grep에도 notFound 호출이 없습니다. 추가로 /bill/1 HTML에 'AxiosError: Request failed with status code 500 at ... /home/ubuntu/project/Lawdigest/.runtime/prod-web/releases/20260715215023-a53c4dc/services/web/.next/server/chunks/23.js' 서버 스택과 경로가 노출됩니다.
- 파일: `services/web/app/bill/[id]/page.tsx`, `services/web/app/congressman/[id]/page.tsx`, `services/web/app/party/[id]/page.tsx`

### SHELL-10 전역 loading 화면이 'AI 기반 입법정보 제공 플랫폼' 문구와 큰 로고로 모든 페이지 전환을 덮고 헤더 구성까지 바뀐다

- 분류: major · ux · 작업량 M · 검증 confirmed
- 사용자 영향: 섹션을 옮길 때마다 콘텐츠 대신 거대한 로고, 수식어 문구, 스피너가 먼저 그려집니다. 법안 상세로 이동할 때는 로딩 동안 로고+종 헤더가 보였다가 뒤로가기+검색 헤더로 바뀌어 헤더가 흔들립니다. 첫 바이트가 느린 /timeline(측정 1.35초)에서는 이 스플래시가 1초 이상 보입니다.
- 근거: app/loading.tsx:8 `<Layout nav logo notification>`, :17 'AI 기반 입법정보 제공 플랫폼', :14 로고 alt '500 에러 이미지', :6 템플릿 주석 'Or a custom loading skeleton component'. 운영 HTML(/, /timeline, /explore, /bill/{id}, 404 페이지)에 모두 'AI 기반 입법정보' 문자열이 스트리밍 fallback으로 포함됩니다. 사용자 지침은 'AI 기반' 같은 수식을 금지합니다.
- 수정안: 루트 loading.tsx를 헤더를 다시 그리지 않는 콘텐츠 영역 스켈레톤으로 바꿉니다. 각 섹션(feed, timeline, bill/[id] 등)에 그 화면 구조와 같은 모양의 loading.tsx를 둡니다. 헤더를 루트 레이아웃으로 올려서 로딩 중에도 헤더가 바뀌지 않게 합니다(SHELL-21과 함께 처리).
- 검증 메모: app/loading.tsx:6 템플릿 주석, :8 `<Layout nav logo notification>`, :14 alt '500 에러 이미지', :17 'AI 기반 입법정보 제공 플랫폼'을 확인했습니다. 운영 / HTML에 해당 문구가 스트리밍 fallback으로 들어 있습니다. 하위 segment에 loading.tsx가 없어 루트 fallback이 모든 전환에 쓰이고 bill/[id] layout의 `goBack search` 헤더와 구성이 다릅니다. /timeline 응답 완료 시간은 1.30-1.47초로 재현했습니다. 첫 바이트는 0.07초이고 1.3초는 fallback이 보인 뒤 본문이 도착하는 시간이므로 '첫 바이트가 느린'이라는 표현만 부정확합니다.
- 파일: `services/web/app/loading.tsx`, `services/web/components/common/Loading/Loading.tsx`

### SHELL-12 모바일 플로팅 내비에 다크 모드 스타일이 없어 어두운 화면 위에 밝은 유리판이 뜬다

- 분류: major · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 다크 모드 사용자는 모든 화면 하단에서 반투명 흰 내비, 흰 검색 버튼, 흰 추천 버블, 흰 검색 입력창을 봅니다. 나머지 화면은 어두운데 내비만 밝아서 테마가 깨져 보입니다.
- 근거: styles/mobile-floating-nav.css 전체에 'dark' 또는 'prefers-color-scheme' 규칙이 0건입니다. 쉘 배경 :55 rgba(255,255,255,0.42), 아이템 색 :205 #3a3a3a, 검색 버튼 :510 rgba(250,250,250,1), 입력창 :432 rgba(250,250,250,0.92), 버블 :307 rgba(255,255,255,0.82). 앱은 class 방식 다크 모드를 씁니다(tailwind.config.js darkMode: 'class').
- 수정안: `.dark .mobile-floating-nav`, `.dark .mobile-floating-nav-search-btn`, `.dark .mobile-floating-nav-search-expanded-inner`, `.dark .mobile-floating-nav-suggestion` 등에 DESIGN.md의 dark-panel(#1E1E1E)/dark-line(#2E2E2E) 기반 값을 정의합니다. 색값은 CSS 변수로 묶어 라이트/다크를 한 곳에서 바꿉니다.
- 검증 메모: styles/mobile-floating-nav.css 567줄 전체에 'dark'와 'prefers-color-scheme' 규칙이 없습니다. 운영 CSS에서도 `.dark .mobile-floating` 0건입니다. 쉘 배경 rgba(255,255,255,0.42), 아이템 #3a3a3a, 버블 rgba(255,255,255,0.82), 입력 inner rgba(250,250,250,0.92), 검색 버튼 rgba(250,250,250,1)를 확인했습니다. tailwind.config.js:85 darkMode: 'class'입니다. 보고서의 줄 번호는 현재 파일과 다르지만 값은 일치합니다.
- 파일: `services/web/styles/mobile-floating-nav.css`

### SHELL-13 모바일 플로팅 내비 최소 폭이 374px이라 360~390px 기기에서 좌우 여백이 사라지고 360px에서는 잘린다

- 분류: major · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 390px iPhone에서는 내비 좌우 여백이 8px로 줄고, 375px에서는 화면 끝에 붙습니다. 앱이 최소 폭으로 선언한 360px Android 기기에서는 왼쪽 탭과 오른쪽 검색 버튼이 각각 약 7px 화면 밖으로 나갑니다.
- 근거: styles/mobile-floating-nav.css: 아이템 4.5rem×4 + 쉘 패딩 0.25rem×2 + gap 0.125rem×3 = 302px(:24-31), 검색 버튼 3.875rem=62px(:372-373), 그룹 gap 0.625rem=10px(:18). 합계 374px. nav(:69)와 검색 그룹(:285) 모두 flex-shrink: 0이고 wrapper는 justify-content: center(:17). app/layout.tsx:86 min-w-[360px]. 제공된 모바일 스크린샷은 약 450px 폭이라 이 현상이 드러나지 않습니다. 실제 기기 확인이 필요합니다.
- 수정안: --mobile-nav-item-min-width를 `clamp(3.75rem, (100vw - 2rem - 62px - 10px - 0.875rem) / 4, 4.5rem)`처럼 뷰포트 기준으로 계산하거나, nav에 flex-shrink: 1과 min-width: 0을 줍니다. 360px, 375px, 390px에서 16px 여백이 유지되는지 확인합니다.
- 검증 메모: 현재 CSS 기준으로 계산을 재확인했습니다. nav 폭 = 4×4.5rem + 0.25rem×2 + 0.125rem×3 = 302px(:25-31, :47), flex-shrink: 0(:69). 검색 wrap 3.875rem=62px, flex-shrink: 0(:356, :361). 그룹 gap 0.625rem=10px(:18). 합계 374px입니다. wrapper는 left/right 0, padding 0 1rem, justify-content: center(:11-19)라 넘친 폭이 양쪽으로 나뉩니다. 390px에서 좌우 8px, 375px에서 0.5px, 360px에서 각각 7px가 화면 밖으로 나갑니다. app/layout.tsx:86 min-w-[360px]이고 Galaxy S 시리즈 다수가 360px 폭입니다.
- 파일: `services/web/styles/mobile-floating-nav.css`

### SHELL-15 아이콘 전용 컨트롤에 접근 가능한 이름이 없고 일부는 href="#" 링크로 구현돼 있으며 포커스 표시가 제거돼 있다

- 분류: major · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 스크린리더 사용자는 헤더의 뒤로가기, 검색, 알림, 테마 전환, 맨 위로, 닫기 버튼을 '링크' 또는 '버튼'으로만 듣습니다. 검색과 비로그인 알림 아이콘은 href="#"라 누르면 URL에 #이 붙고 스크롤이 맨 위로 튑니다. 키보드 사용자는 모바일 내비 탭과 검색 버튼에서 포커스 위치를 볼 수 없습니다.
- 근거: aria-label grep 결과 components/common, components/Layout에서 Nav.tsx:268,330,338만 존재합니다. 이름 없는 컨트롤: GoBackButton.tsx:16, SearchButton.tsx:6 (`<Link href="#">`), NotifcationButton.tsx:18-25 (`href="#"`), :32,:39, ThemeSwitchButton.tsx:29-36, GoToTopButton.tsx:33, SearchModal.tsx:63, Snackbar.tsx:56. public/svgs 아이콘에도 title/aria 속성이 없습니다. styles/mobile-floating-nav.css:226-229, 384-386 `:focus-visible { outline: none; }`. Logo alt '로고이미지'(Header/Logo.tsx:20).
- 수정안: 동작하는 아이콘은 `<button type="button" aria-label="검색">`처럼 버튼과 이름을 줍니다. 이동하는 아이콘만 Link로 두고 aria-label을 붙입니다. 테마 버튼은 '다크 모드로 전환'처럼 결과를 이름으로 씁니다. focus-visible에는 2px 링을 정의합니다. Logo alt는 '모두의입법'으로 바꿉니다.
- 검증 메모: components/common과 components/Layout의 aria-label은 Nav.tsx:268, :330, :338과 SettingButton.tsx:19뿐입니다. GoBackButton.tsx:16, ThemeSwitchButton.tsx:29-36, GoToTopButton.tsx:33-38, SearchModal.tsx:63, Snackbar.tsx 닫기 Button은 아이콘만 있습니다. SearchButton.tsx:6과 NotifcationButton.tsx:18-25는 `<Link href="#">`입니다. public/svgs에 title/aria 속성은 0건입니다. mobile-floating-nav.css:226-229와 :533-536에서 focus-visible outline을 제거합니다. Logo.tsx alt는 '로고이미지'입니다.
- 파일: `services/web/components/common/Button/GoBackButton.tsx`, `services/web/components/common/Button/SearchButton.tsx`, `services/web/components/common/Button/NotifcationButton.tsx`, `services/web/components/common/Button/ThemeSwitchButton.tsx`, `services/web/components/common/Button/GoToTopButton.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`, `services/web/components/common/Snackbar/Snackbar.tsx`, `services/web/components/Layout/Header/Logo.tsx`

### SHELL-16 robots.txt와 sitemap.xml이 없다

- 분류: major · seo · 작업량 M · 검증 confirmed
- 사용자 영향: 검색 엔진이 법안·의원·정당 상세 페이지를 찾을 경로가 없습니다. 시민이 포털에서 법안명으로 검색해도 모두의입법 페이지가 잘 나오지 않습니다.
- 근거: curl https://lawdigest.kr/robots.txt → 404, /sitemap.xml → 404. app 아래에 robots.ts, sitemap.ts가 없습니다.
- 수정안: app/robots.ts와 app/sitemap.ts를 추가합니다. sitemap은 주요 목록 경로와 법안·의원·정당 상세 URL을 API에서 받아 생성합니다(대량이면 generateSitemaps로 분할). robots에는 sitemap 위치와 /mypage, /notification, /login 제외를 적습니다.
- 검증 메모: curl https://lawdigest.kr/robots.txt → 404, /sitemap.xml → 404를 확인했습니다. app 최상위에 robots.ts, sitemap.ts가 없습니다.
- 파일: `services/web/app/robots.ts`, `services/web/app/sitemap.ts`

### SHELL-06 홈 서버 prefetch가 dehydrate되지 않아 SSR 데이터가 버려지고 클라이언트가 다시 가져온다

- 분류: minor · perf · 작업량 S · 검증 adjusted
- 사용자 영향: 첫 방문 시 서버가 메인 피드 3페이지를 미리 가져오지만 결과가 브라우저로 넘어가지 않습니다. 클라이언트가 같은 데이터를 다시 요청하므로 피드 아래에 스피너가 다시 보이고 첫 화면이 늦게 완성됩니다(스크린샷 qt7sda, cnrjx6에서 탭 아래 스피너만 보이는 상태).
- 근거: app/page.tsx:10-20에서 `prefetchInfiniteQuery(... pages: 3)`만 하고 HydrationBoundary/dehydrate가 없습니다. components/Feed 안에도 HydrationBoundary가 없습니다(grep 0건). curl https://lawdigest.kr/ HTML에서 'dehydratedAt'/'queryHash' 0건입니다. Feed는 useSuspenseInfiniteQuery를 씁니다(components/Feed/Feed/apis/queries.ts:12). `export const dynamic = 'force-dynamic'`이라 매 요청마다 API 3회 호출이 낭비됩니다.
- 수정안: Feed를 `<HydrationBoundary state={dehydrate(queryClient)}>`로 감싸고 pages를 1로 줄이는 수정안은 맞습니다. 사용자 영향 설명은 '서버 prefetch 3회가 버려지고 SSR과 클라이언트가 첫 페이지를 각각 다시 요청한다'로 바꿉니다.
- 검증 메모: app/page.tsx:10-20 prefetchInfiniteQuery(pages: 3)만 있고 HydrationBoundary가 없습니다. getQueryClient(lib/getQueryClient.tsx)는 RSC용 cache 클라이언트이고 QueryClientProvider는 별도 QueryClient를 만들므로 prefetch 결과는 버려집니다. 운영 HTML에 'dehydratedAt/queryHash' 0건입니다. 그러나 운영 HTML에는 피드 카드 제목(예: '어업기반 세제지원 연장을 위한 지방세특례제한법 일부개정법률안')이 스트리밍 SSR로 이미 들어 있습니다. Feed의 useSuspenseInfiniteQuery가 SSR 중에 다시 가져오기 때문입니다. 따라서 '피드 아래 스피너가 다시 보인다'는 사용자 영향은 재현되지 않습니다. 실재하는 결함은 요청마다 버려지는 API 3회 호출과 하이드레이션 후 클라이언트의 재요청입니다. 체감 영향이 작으므로 minor로 조정합니다.
- 파일: `services/web/app/page.tsx`

### SHELL-11 세션 만료 시 알림 버튼의 조건부 hook 호출로 페이지가 오류 화면으로 바뀐다

- 분류: minor · bug · 작업량 S · 검증 adjusted
- 사용자 영향: 로그인한 사용자의 토큰이 만료되면 알림 개수 요청이 401을 받습니다. 재발급이 실패하면 쿠키가 삭제되고 알림 버튼이 다시 렌더될 때 hook 개수가 달라져 React 오류가 납니다. 사용자는 갑자기 '페이지가 작동하지 않습니다' 화면을 봅니다.
- 근거: components/common/Button/NotifcationButton.tsx:13-28: 쿠키가 없으면 early return하고, 있으면 `useGetNotificationCount()`를 호출합니다(eslint rules-of-hooks 비활성화 주석). api/config/core.ts:49-58 401 → reissue 실패 시 handleFailReissueToken 호출. api/auth/handlers.ts:23-26은 deleteCookie 후 컴포넌트 밖에서 useRouter()를 호출해 /login 이동도 실패합니다. 쿼리 오류 상태 변경이 NotificationButton을 다시 렌더하면서 hook 수가 줄어듭니다.
- 수정안: useGetNotificationCount를 항상 호출하고 enabled: !!accessToken으로 제어하는 수정은 유지합니다. handleFailReissueToken은 window.location.assign('/login')으로 바꿉니다. 재발급 요청에는 인터셉터 재시도를 건너뛰는 플래그(예: config._retry)를 둡니다.
- 검증 메모: NotifcationButton.tsx:16-28 조건부 hook 호출과 api/auth/handlers.ts:23-26의 컴포넌트 밖 useRouter() 호출을 확인했습니다. handleFailReissueToken은 deleteCookie 후 useRouter에서 예외를 던지므로 /login 이동은 일어나지 않습니다. 그러나 '페이지 오류 화면으로 바뀐다'는 시나리오는 확인하지 못했습니다. @tanstack/react-query 5.59.0은 접근한 속성만 추적하고 이 컴포넌트는 data만 읽으므로 쿼리 오류 상태 변경으로 NotificationButton이 다시 렌더되지 않습니다. 크래시는 같은 마운트에서 다른 이유로 재렌더될 때만 발생하는 잠재 결함입니다. 확인된 사용자 영향은 세션 만료 시 쿠키만 삭제되고 로그인 화면 이동이 실패하는 것입니다. 또한 core.ts:49-58은 /auth/reissue/token 자체가 401이면 같은 인터셉터로 다시 재발급을 시도하는 재귀 구조입니다.
- 파일: `services/web/components/common/Button/NotifcationButton.tsx`, `services/web/api/auth/handlers.ts`, `services/web/api/config/core.ts`

### SHELL-14 플로팅 내비가 하단 콘텐츠를 가리지만 탐색 화면 외에는 하단 여백이 없다

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 법안 상세, 피드, 타임라인, 검색 결과의 마지막 내용과 버튼이 하단 내비(높이 62px + 하단 16px + safe area) 뒤에 가려집니다. 스크린샷(yzv9tp, zhnmj8)에서 본문 줄이 내비 뒤로 겹쳐 보입니다.
- 근거: 하단 여백을 둔 곳은 app/explore/components/ExploreBoard.tsx:21 `pb-28` 하나뿐입니다(grep 'pb-2[0-9]|pb-\[|safe-area'). components/Layout/Layout/Layout.tsx:38 콘텐츠 section에는 하단 패딩이 없습니다.
- 수정안: Layout의 콘텐츠 영역에 모바일 전용 `pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0`을 한 번만 둡니다. ExploreBoard의 개별 pb-28은 제거합니다.
- 검증 메모: app·components grep에서 하단 내비 여백은 app/explore/components/ExploreBoard.tsx:21 `pb-28` 하나뿐입니다. Layout.tsx:38 콘텐츠 section에 하단 패딩이 없고 BillDetail 마지막 영역에도 모바일 하단 여백이 없습니다. 내비는 bottom: calc(1rem + safe-area)에 높이 3.875rem으로 고정됩니다. 스크린샷(yzv9tp, zhnmj8)은 스크롤 도중의 겹침이라 플로팅 내비에서는 정상입니다. 결함은 페이지 끝에서 마지막 콘텐츠가 가려지는 점이며 코드로 확인했습니다.
- 파일: `services/web/components/Layout/Layout/Layout.tsx`, `services/web/app/explore/components/ExploreBoard.tsx`

### SHELL-17 www와 apex 도메인이 둘 다 200을 반환하고 canonical·og:url은 사용자가 쓰지 않는 www를 가리킨다

- 분류: minor · seo · 작업량 S · 검증 confirmed
- 사용자 영향: 같은 페이지가 두 주소로 색인되어 검색 순위가 나뉩니다. 사용자가 lawdigest.kr에서 공유해도 미리보기 URL은 www로 표시됩니다.
- 근거: curl -sI https://www.lawdigest.kr/ → HTTP/2 200(리다이렉트 없음). config/site.ts:8 `url: 'https://www.lawdigest.kr/'`. 법안 상세 canonical `https://www.lawdigest.kr/bill/PRC_...`. 운영 기준 도메인은 https://lawdigest.kr 입니다.
- 수정안: 대표 도메인을 하나로 정합니다(lawdigest.kr 권장). nginx에서 다른 쪽을 301로 보냅니다. siteConfig.url을 대표 도메인으로 바꿉니다.
- 검증 메모: curl -sI https://www.lawdigest.kr/ → HTTP/2 200(리다이렉트 없음)입니다. config/site.ts:8 url 'https://www.lawdigest.kr/'입니다. 법안 상세 canonical은 https://www.lawdigest.kr/bill/PRC_Y2Y6X0Y4W1W7U1D7D2B0C5B3B1Z1H1 이고 og:image도 www 도메인입니다.
- 파일: `services/web/config/site.ts`

### SHELL-19 상세·검색·알림 화면에서 하단 내비가 '피드'를 현재 위치로 잘못 표시한다

- 분류: minor · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 법안 상세에 있는데 하단 내비에는 '피드'가 선택돼 보입니다(스크린샷 yzv9tp). 타임라인에서 상세로 들어가면 이전 탭 표시가 그대로 남습니다. 사용자는 현재 위치를 잘못 이해합니다.
- 근거: components/Layout/Nav/Nav.tsx:32-34 /bill, /search, /notification 등은 activeIndex가 -1입니다. :112-113 registerNavRef가 -1이면 인덱스 0을 지정합니다. :45-47은 activeIndex가 0 이상일 때만 갱신합니다. :254 aria-current는 설정되지 않아 시각 표시와 접근성 정보가 서로 다릅니다.
- 수정안: activeIndex가 -1이면 인디케이터와 활성 오버레이를 숨기는 상태 클래스를 nav에 붙입니다. 또는 상세 경로를 출발 탭에 매핑하는 규칙(/bill → 피드 등)을 siteConfig.navItems에 명시합니다.
- 검증 메모: Nav.tsx:32-34에서 /bill, /search, /notification 등은 activeIndex -1입니다. registerNavRef(:112)와 handlePointerDown(:146)은 -1일 때 0을 씁니다. useLayoutEffect(:45-47)는 0 이상일 때만 갱신하므로 이전 탭 위치가 남습니다. :254 aria-current는 -1이면 어느 탭에도 붙지 않아 시각 표시와 다릅니다. 스크린샷 yzv9tp(법안 상세)에서 '피드'가 선택돼 보입니다.
- 파일: `services/web/components/Layout/Nav/Nav.tsx`, `services/web/styles/mobile-floating-nav.css`

### SHELL-20 헤더 검색이 버튼→읽기 전용 입력→모달의 3단계이고 모바일 FAB 검색과 동작이 다르다

- 분류: minor · ux · 작업량 M · 검증 confirmed
- 사용자 영향: 상세 화면 헤더의 돋보기를 누르면 헤더 아래에 입력창 모양이 생기며 콘텐츠가 밀립니다. 그 입력창을 다시 눌러야 모달이 열립니다. FAB 검색은 최근 검색어를 저장하지 않고, 헤더 검색은 저장합니다. 헤더 검색은 검색어를 인코딩하지 않아 '/', '?', '#'이 들어간 검색어가 깨집니다. 모달은 Esc로 닫히지 않고 하단 내비(z-70) 아래(z-10)에 깔립니다.
- 근거: Header.tsx:41-43,141 toggleSearch → SearchBarButton(isReadOnly, SearchBarButton.tsx:21-22) → onClick으로 SearchModal 열기(:12-14). SearchBar.tsx:39 `router.push(`/search/${value.trim()}`)` 인코딩 없음, Nav.tsx:76은 encodeURIComponent 사용. SearchModal.tsx:59 `z-10`, role=dialog·Esc 처리 없음. SearchModal.tsx:17 localStorage 키 'recentkeywords'(소문자)와 나머지 'recentKeywords' 불일치.
- 수정안: 검색을 하나의 컴포넌트로 통합합니다. 헤더 돋보기는 곧바로 입력 포커스가 있는 검색 화면(또는 /search 페이지)을 엽니다. 최근 검색어 저장, encodeURIComponent, Esc 닫기, 포커스 트랩, z-index를 공통 로직으로 맞춥니다.
- 검증 메모: Header.tsx:41-43, :141 toggleSearch → SearchBarButton(isReadOnly, SearchBarButton.tsx:21-22) → 클릭 시 setSearchModal(:12-14)의 3단계를 확인했습니다. SearchBar.tsx:39와 SearchModal.tsx:30은 검색어를 인코딩하지 않고 Nav.tsx:76은 encodeURIComponent를 씁니다. Nav의 handleSearchSubmit은 최근 검색어를 저장하지 않습니다. SearchModal.tsx:59 z-10, role/Esc 처리 없음, :17 'recentkeywords'(소문자)를 확인했습니다. 소문자 키는 :43-47 useEffect가 마운트 직후 'recentKeywords'로 다시 읽으므로 영향은 첫 렌더에 한정됩니다.
- 파일: `services/web/components/Layout/Header/Header.tsx`, `services/web/components/common/SearchBar/SearchBar.tsx`, `services/web/components/common/SearchBar/SearchBarButton.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`, `services/web/components/Layout/Nav/Nav.tsx`

### SHELL-21 헤더 오른쪽 컨트롤 구성이 화면마다 다르고 페이지마다 Header가 새로 마운트된다

- 분류: minor · visual · 작업량 M · 검증 confirmed
- 사용자 영향: 목록 화면은 테마+알림, 상세 화면은 테마+검색, 로그인·검색·알림 화면은 테마만 보입니다(스크린샷 8bomkz 로그인 헤더). 화면을 옮길 때마다 아이콘이 나타났다 사라지고 위치가 바뀝니다.
- 근거: 각 route layout과 app/page.tsx, error.tsx, not-found.tsx, loading.tsx가 각자 `<Layout ...>`을 렌더합니다(grep '<Layout' 14곳). Layout.tsx:22 `nav: _nav` prop은 사용되지 않습니다. Header.tsx:99-138에서 setting/search/notification/theme 분기마다 ThemeSwitchButton을 중복 렌더합니다.
- 수정안: Header를 루트 레이아웃으로 올리고 컨트롤 세트를 고정합니다. 화면별로 다른 것은 좌측(로고/뒤로가기)과 모바일 제목만 prop 또는 segment 기반으로 바꿉니다. 사용하지 않는 nav, setting prop을 제거합니다.
- 검증 메모: `<Layout` 사용처 14곳(app/page.tsx, loading, error, not-found, 10개 route layout)을 확인했습니다. 목록은 `logo notification`, 상세는 `goBack search`, login·search·notification은 `theme`입니다. Layout.tsx:21-22 nav prop은 사용되지 않습니다. Header.tsx:99-138의 네 분기가 각각 ThemeSwitchButton을 렌더합니다.
- 파일: `services/web/components/Layout/Layout/Layout.tsx`, `services/web/components/Layout/Header/Header.tsx`, `services/web/app/layout.tsx`

### SHELL-22 테마 토글과 로고·아이콘이 마운트 전후로 바뀌어 헤더가 흔들리고 다크 모드 첫 화면에 밝은 로고가 보인다

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 페이지를 열면 테마 버튼이 늦게 나타나며 헤더 아이콘이 자리 이동합니다. 다크 모드 사용자는 첫 화면에서 검은 로고와 검은 아이콘을 잠깐 봅니다. 토글 아이콘은 라이트에서 파란 해, 다크에서 노란 달로 디자인 시스템에 없는 색을 씁니다.
- 근거: ThemeSwitchButton.tsx:24-26 마운트 전 null 반환, :31 `color={theme === 'dark' ? 'warning' : 'primary'}`. Header/Logo.tsx:12,17 `theme`로 src 분기(resolvedTheme 아님, SSR은 항상 light). public/svgs/header/Notification.tsx:6-8 JS로 아이콘 색 분기. NextThemesProvider.tsx:9 defaultTheme 'light'로 시스템 설정을 따르지 않습니다. 스크린샷 cnrjx6 등에서 파란 해 아이콘 확인.
- 수정안: 마운트 전에도 같은 크기의 자리 표시 버튼을 렌더합니다. 로고와 아이콘은 `currentColor`와 `dark:` 클래스로 CSS에서 분기해 SSR과 클라이언트가 같게 합니다. 토글 아이콘 색은 text-secondary/primary-ink로 맞춥니다. defaultTheme을 'system'으로 바꿉니다.
- 검증 메모: ThemeSwitchButton.tsx:24-26 마운트 전 null, :31 color warning/primary를 확인했습니다. Logo.tsx는 useTheme().theme로 src를 분기하고 SSR에서는 theme가 없어 밝은 로고를 냅니다. public/svgs/header/Notification.tsx도 theme로 JSX를 분기합니다. lib/provider/NextThemesProvider.tsx defaultTheme 'light'입니다.
- 파일: `services/web/components/common/Button/ThemeSwitchButton.tsx`, `services/web/components/Layout/Header/Logo.tsx`, `services/web/public/svgs/header/Notification.tsx`, `services/web/lib/provider/NextThemesProvider.tsx`

### SHELL-23 404·오류 화면의 이미지 대체 텍스트, 복구 동작, 다크 모드 버튼이 다듬어지지 않았다

- 분류: minor · ux · 작업량 S · 검증 adjusted
- 사용자 영향: 404 화면 이미지를 스크린리더가 '500 에러 이미지'로 읽습니다. 오류 화면에는 '다시 시도'가 없고 '이전 페이지'는 외부에서 바로 들어온 사용자를 사이트 밖으로 보냅니다. 다크 모드에서 주 버튼 배경이 페이지 배경과 같아 버튼 경계가 보이지 않고 보조 버튼은 흰 블록으로 튑니다. 404 문서 제목은 '모두의입법'뿐입니다.
- 근거: app/not-found.tsx:18 alt '500 에러 이미지', 불필요한 'use client'(:1). app/error.tsx:9 reset prop 미사용, :31-33 `router.back(); router.refresh();`, :30 `dark:bg-dark-pb lg:dark:bg-dark-b`와 app/layout.tsx:81 body `dark:bg-dark-b dark:lg:bg-dark-pb`가 같은 색, :38 `bg-white ... dark:text-black`. app/global-error.tsx 없음. 404 HTML `<title>모두의입법</title>`.
- 수정안: not-found를 서버 컴포넌트로 바꾸려면 '이전 페이지'(router.back)를 없애고 '홈으로'를 Link로 바꿔야 합니다. 다크 모드 버튼 문제는 '같은 색'이 아니라 '#1E1E1E와 #101012의 낮은 대비'로 기술합니다.
- 검증 메모: not-found.tsx:18 alt '500 에러 이미지', error.tsx reset 미사용(:9), :31-34 router.back()+refresh, app/global-error.tsx 부재, 404 문서 제목 '모두의입법'을 확인했습니다. 두 근거가 틀렸습니다. not-found.tsx의 'use client'는 useRouter와 onClick 때문에 현재 구현에서는 필요합니다. 주 버튼 `dark:bg-dark-pb lg:dark:bg-dark-b`와 body `dark:bg-dark-b dark:lg:bg-dark-pb`는 같은 색이 아니라 서로 뒤집힌 값(#1E1E1E와 #101012)입니다. 실제 문제는 두 값의 대비가 매우 낮아 버튼 경계가 거의 보이지 않는 점입니다. 보조 버튼의 bg-white는 다크 모드에서 흰 블록으로 보입니다.
- 파일: `services/web/app/not-found.tsx`, `services/web/app/error.tsx`, `services/web/app/global-error.tsx`

### SHELL-24 비로그인 사용자에게 알림 종을 보여 주고 누르면 빨간 오류 스낵바를 띄운다

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 처음 온 사용자가 종을 누르면 빨간 '로그인이 필요한 서비스입니다.' 오류가 뜹니다. 정상적인 안내를 오류처럼 받아들입니다. 로그인 링크는 메시지 문자열이 정확히 같을 때만 붙습니다.
- 근거: NotifcationButton.tsx:16-25 `href="#"`, type 'ERROR'. Snackbar.tsx:51 `snackbar.message === '로그인이 필요한 서비스입니다.'` 문자열 비교로 로그인 링크 표시. Snackbar.tsx:34 성공 메시지까지 aria-live="assertive". globals.css:112 '.DAFAULT' 오탈자 클래스.
- 수정안: 비로그인 상태의 종은 /login으로 바로 이동하는 링크로 바꿉니다. 스낵바 상태에 action({label, href}) 필드를 추가해 문자열 비교를 없앱니다. aria-live는 polite로 바꾸고 ERROR만 assertive로 둡니다.
- 검증 메모: NotifcationButton.tsx:16-25 `href="#"`와 type 'ERROR' 스낵바, Snackbar.tsx의 `snackbar.message === '로그인이 필요한 서비스입니다.'` 문자열 비교, section aria-live="assertive", styles/globals.css:112 '.DAFAULT'를 확인했습니다.
- 파일: `services/web/components/common/Button/NotifcationButton.tsx`, `services/web/components/common/Snackbar/Snackbar.tsx`, `services/web/styles/globals.css`

### SHELL-25 상세 화면 헤더 제목 '의안 자세히 보기'·'의원 프로필'이 화면 종류만 반복하고 데스크톱에서 SubHeader로 한 번 더 나온다

- 분류: polish · copy · 작업량 S · 검증 adjusted
- 사용자 영향: 사용자는 헤더와 바로 아래 줄에서 같은 레이블을 두 번 봅니다. 본문 제목이 이미 법안명을 보여 주므로 레이블은 정보를 더하지 않습니다. 같은 서비스 안에서 '법안'과 '의안'이 섞입니다.
- 근거: app/bill/[id]/layout.tsx:11 title='의안 자세히 보기', app/bill/[id]/page.tsx:39 `<SubHeader title="의안 자세히 보기" />`. congressman/party도 같은 구조(layout.tsx:11, page.tsx:35-36). 내비와 카드는 '법안'을 씁니다(config/site.ts).
- 수정안: 중복 표시 제거가 아니라 용어 통일('법안')과 화면 종류 레이블 제거로 범위를 줄입니다. 768-1023px에서 뒤로가기와 제목이 모두 없는 점도 함께 처리합니다.
- 검증 메모: app/bill/[id]/layout.tsx:11 title='의안 자세히 보기'와 page.tsx:39 SubHeader title을 확인했습니다. 그러나 두 레이블은 동시에 보이지 않습니다. Header의 title은 `md:hidden`(Header.tsx:94)이고 SubHeader는 `hidden lg:flex`(SubHeader.tsx:5)입니다. 768px 미만에서는 헤더 제목만, 1024px 이상에서는 SubHeader만 보이고 768-1023px에서는 둘 다 없습니다. '두 번 본다'는 사용자 영향은 틀렸습니다. 제목이 화면 종류만 반복하고 '의안'과 '법안'이 섞이는 문구 문제는 실재합니다.
- 파일: `services/web/app/bill/[id]/layout.tsx`, `services/web/app/bill/[id]/page.tsx`, `services/web/app/congressman/[id]/page.tsx`, `services/web/app/party/[id]/page.tsx`, `services/web/components/Layout/Header/SubHeader.tsx`

### SHELL-26 사이트 설명과 키워드가 기술 중심 문구('자연어 처리 기술', 'ChatGPT', 'LLM')로 쓰였고 로딩 문구와도 다르다

- 분류: polish · copy · 작업량 S · 검증 adjusted
- 사용자 영향: 검색 결과와 공유 미리보기에 '자연어 처리 기술을 이용한 법률 개정안 요약 플랫폼'이 나옵니다. 시민은 이 서비스로 무엇을 할 수 있는지 알기 어렵습니다. 로딩 화면은 'AI 기반 입법정보 제공 플랫폼'이라고 다르게 소개합니다.
- 근거: config/site.ts:7 description, :14 keywords에 'AI','ChatGPT','LLM'. app/loading.tsx:17. curl 결과 모든 페이지 meta description이 동일합니다.
- 수정안: 근거를 'og:description과 twitter description이 모든 목록 페이지에서 동일'로 바로잡습니다.
- 검증 메모: config/site.ts:7 description '자연어 처리 기술을 이용한 법률 개정안 요약 플랫폼', :14 keywords의 'AI','ChatGPT','LLM', app/loading.tsx:17 문구를 확인했습니다. '모든 페이지 meta description이 동일'은 틀렸습니다. curl 결과 /timeline, /explore의 name=description은 layout별 문장입니다. 동일한 것은 og:description(모든 목록 페이지에서 사이트 설명)입니다.
- 파일: `services/web/config/site.ts`, `services/web/app/loading.tsx`

### SHELL-27 파비콘·manifest·테마 색 설정이 불완전하다

- 분류: polish · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 브라우저가 기본 요청하는 /favicon.ico가 404입니다. 홈 화면에 추가하면 manifest 없이 standalone 메타만 있어 앱 이름과 아이콘이 기기마다 다르게 나옵니다. 모바일 브라우저 상단 색이 테마와 맞지 않습니다. 고해상도 탭 아이콘이 흐립니다.
- 근거: curl /favicon.ico → 404, /manifest.json·/manifest.webmanifest → 404. file 결과: images/favicon.ico는 16×16 PNG, images/favicon-16x16.png는 실제 32×32. app/layout.tsx:66-67 apple-mobile-web-app-capable/mobile-web-app-capable만 있습니다. viewport(:12-16)에 themeColor 없음.
- 수정안: app/icon.png(32, 192, 512)과 app/apple-icon.png, app/favicon.ico를 Next 파일 규칙으로 둡니다. app/manifest.ts로 name, short_name, icons, theme_color, background_color를 정의합니다. viewport에 라이트/다크 themeColor를 media별로 지정합니다.
- 검증 메모: curl /favicon.ico, /manifest.json, /manifest.webmanifest → 404입니다. file 결과 images/favicon.ico는 16×16 PNG, images/favicon-16x16.png는 32×32입니다. app/layout.tsx:12-16 viewport에 themeColor가 없고 :66-67에 capable 메타만 있습니다. 운영 HTML에는 /images/ 경로의 icon 링크가 있어 탭 아이콘은 표시되고 루트 /favicon.ico 404는 이 링크를 읽지 않는 클라이언트에만 영향을 줍니다.
- 파일: `services/web/app/layout.tsx`, `services/web/app/manifest.ts`, `services/web/public/images/favicon.ico`, `services/web/public/images/favicon-16x16.png`

### SHELL-28 공유 미리보기 이미지가 로고만 있고 선언 크기와 실제 크기가 다르다

- 분류: polish · seo · 작업량 M · 검증 confirmed
- 사용자 영향: 법안 링크를 공유해도 모든 미리보기 이미지가 같은 로고입니다. 받는 사람은 어떤 법안인지 이미지로 알 수 없습니다.
- 근거: public/images/opengraph-image.png는 4800×2520(file 결과)인데 metadata는 1200×630으로 선언합니다(app/layout.tsx:44-46, utils/getMetadata.ts:46-48). 법안 상세 og:image도 같은 파일입니다(curl /bill/PRC_Z2Z6... 결과).
- 수정안: 기본 OG 이미지를 1200×630으로 다시 내보냅니다. app/bill/[id]/opengraph-image.tsx로 법안 제목, 처리 단계, 발의일을 넣은 이미지를 생성합니다.
- 검증 메모: public/images/opengraph-image.png는 4800×2520(175,882 bytes)이고 app/layout.tsx:41-47, utils/getMetadata.ts:43-49는 1200×630으로 선언합니다. 법안 상세 og:image도 https://www.lawdigest.kr/images/opengraph-image.png로 같은 파일입니다. 비율은 같으므로 선언 크기 불일치와 법안별 이미지 부재가 결함입니다.
- 파일: `services/web/public/images/opengraph-image.png`, `services/web/app/layout.tsx`, `services/web/utils/getMetadata.ts`

### SHELL-29 모바일 검색 FAB의 무한 회전 애니메이션에 reduced-motion 대응이 없고 입력창에 레이블이 없다

- 분류: polish · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 움직임 줄이기를 켠 사용자도 검색을 여는 동안 5초 주기로 회전하는 무지개 테두리와 흐림 효과를 봅니다. 스크린리더는 입력창을 placeholder로만 읽습니다. Esc로 검색을 닫을 수 없고 닫기 버튼은 24px로 터치 영역이 작습니다.
- 근거: styles/mobile-floating-nav.css:393-420 `animation: search-border-spin 5s linear infinite`, 파일 내 prefers-reduced-motion 0건. :480-482 닫기 버튼 1.5rem. Nav.tsx:316-324 input에 aria-label 없음, keydown(Escape) 처리 없음.
- 수정안: @media (prefers-reduced-motion: reduce)에서 회전 애니메이션과 width 전환을 끕니다. input에 aria-label='검색어'를 줍니다. Escape로 closeSearch를 호출합니다. 닫기 버튼 터치 영역을 44px로 넓힙니다.
- 검증 메모: mobile-floating-nav.css:398, :417 `animation: search-border-spin 5s linear infinite`, 파일 내 prefers-reduced-motion 0건, :483-484 닫기 버튼 1.5rem을 확인했습니다. Nav.tsx:316-324 input에 aria-label이 없고 Escape keydown 처리가 없습니다.
- 파일: `services/web/styles/mobile-floating-nav.css`, `services/web/components/Layout/Nav/Nav.tsx`

### SHELL-30 랜드마크 구조가 맞지 않고 본문 바로가기 링크가 없다

- 분류: polish · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 스크린리더 사용자는 헤더 영역이 main 안에 들어 있어 본문 시작 위치를 찾기 어렵습니다. 두 개의 nav에 이름이 없어 구분할 수 없습니다. 모바일 내비 탭은 링크가 아니라 버튼이라 새 탭 열기와 prefetch가 되지 않습니다.
- 근거: app/layout.tsx:87-92 main 안에서 각 Layout이 Header를 렌더합니다. Header는 HeroUI Navbar(nav), Nav.tsx:215 `<nav>` 모두 aria-label 없음. Nav.tsx:242-257 탭이 `<button onClick={router.push}>`입니다. 본문 바로가기 링크 없음.
- 수정안: 헤더를 main 밖의 header 요소로 옮깁니다. 두 nav에 aria-label('주 메뉴')을 줍니다. 모바일 탭을 next/link로 바꿉니다. body 첫 요소로 '본문으로 건너뛰기' 링크를 둡니다.
- 검증 메모: app/layout.tsx:87-92 main 안에서 children(각 Layout → Header)이 렌더됩니다. HeroUI Navbar는 기본 요소가 nav입니다(node_modules/@heroui/navbar/dist/chunk-LTNGAWBY.mjs:35 `as || "nav"`). Nav.tsx:215 `<nav>`와 함께 둘 다 aria-label이 없습니다. Nav.tsx:242-257 탭은 `<button onClick={router.push}>`입니다. '본문으로'/skip 링크 grep 결과 0건입니다.
- 파일: `services/web/app/layout.tsx`, `services/web/components/Layout/Nav/Nav.tsx`, `services/web/components/Layout/Header/Header.tsx`

### SHELL-31 웹 패키지에 Next.js/NextUI 템플릿 흔적이 남아 있다

- 분류: polish · dead-code · 작업량 S · 검증 confirmed
- 사용자 영향: 사용자 화면에는 직접 보이지 않습니다. 저장소를 보는 기여자와 외부 검토자는 템플릿 프로젝트로 오해합니다.
- 근거: services/web/package.json:2 name 'next-app-template', version '0.0.1'. services/web/README.md:1 '# Next.js & NextUI Template'. services/web/LICENSE 'Copyright (c) 2023 Next UI'. app/loading.tsx:6 'Or a custom loading skeleton component' 주석. body 텍스트 색 `text-black`(app/layout.tsx:81)은 DESIGN.md primary-ink #191919와 다릅니다.
- 수정안: package.json name을 'lawdigest-web'으로 바꿉니다. README를 실행·배포 방법 중심으로 다시 씁니다. LICENSE 저작권자를 정리합니다. body 기본 텍스트 색을 primary-ink 토큰으로 바꿉니다.
- 검증 메모: services/web/package.json name 'next-app-template', version '0.0.1', README.md 1행 '# Next.js & NextUI Template', LICENSE 3행 'Copyright (c) 2023 Next UI', app/loading.tsx:6 주석을 확인했습니다. app/layout.tsx:81 body `text-black`이고 DESIGN.md:13 primary-ink는 #191919입니다.
- 파일: `services/web/package.json`, `services/web/README.md`, `services/web/LICENSE`, `services/web/app/layout.tsx`

## 홈 피드 (FEED)

### FEED-01 리포트 탭과 법안 탭이 같은 목록을 보여 준다

- 분류: blocker · bug · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 기본 탭 '리포트'와 '법안'을 오가도 같은 카드가 같은 순서로 나온다. 사용자는 탭 하나가 동작하지 않는다고 느낀다. 리포트라는 기능이 없는데 있는 것처럼 보인다.
- 근거: services/web/components/Feed/Feed/Feed.tsx:130-146 과 148-164 가 같은 FeedTab, StageDropdown, BillList(bills/popularBills)를 그대로 복제한다. contentType 값은 데이터 요청에 쓰이지 않는다(Feed.tsx:67-74).
- 수정안: 리포트 탭이 보여 줄 데이터 계약(예: 에이전트 리포트가 생성된 법안만, summary_tags 기반)을 백엔드에 정의하고 별도 쿼리로 연결한다. 계약이 준비되기 전에는 리포트 탭을 제거하고 법안 탭을 기본으로 둔다. 두 탭 JSX 중복은 하나의 렌더 함수로 합친다.
- 검증 메모: Feed.tsx:131-146(report)과 149-164(bill)가 같은 FeedTab, StageDropdown, BillList(bills/popularBills)를 렌더한다. contentType은 67-74의 useGetBillByStage 인자에 들어가지 않는다. 기본값은 useState<ContentType>('report')(63행)다. 동작하지 않는 탭이 기본 탭으로 노출된다.
- 파일: `services/web/components/Feed/Feed/Feed.tsx`

### FEED-02 피드 최신 법안이 4개월 전(2026-07-09)에 멈춰 있다

- 분류: blocker · data · 백엔드 · 운영 데이터 작업 · 작업량 L · 검증 confirmed
- 사용자 영향: 2026-11-02에 접속한 사용자가 보는 '시간순' 첫 화면이 전부 7월 법안이다. 국회 활동이 없는 것처럼 보이거나 서비스가 방치된 것처럼 보인다.
- 근거: GET https://api.lawdigest.kr/v1/bill/mainfeed?page=0&size=50&stage= 응답의 propose_date 분포: {'2026-07-09': 32, '2026-07-08': 18}. page 0~3 전부 2026-07-09. 운영 홈 HTML의 카드 날짜도 2026-07-09.
- 수정안: 법안 수집 파이프라인을 재가동하고 2026-07-10 이후 누락분을 백필한다. 재발 방지를 위해 최신 발의일이 N일 이상 갱신되지 않으면 알림을 보내는 모니터링을 둔다.
- 검증 메모: curl GET https://api.lawdigest.kr/v1/bill/mainfeed?page=0&size=50&stage= 응답의 propose_date 분포는 {'2026-07-09': 32, '2026-07-08': 18}이다. 운영 스크린샷(f5jpeo.jpg)의 첫 카드 날짜도 2026-07-09다.

### FEED-03 피드에 데이터 최신성 표시가 없고 날짜가 원시 ISO 형식이다

- 분류: major · trust · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 사용자는 목록이 언제 갱신됐는지 알 수 없다. 카드 날짜 '2026-07-09'가 발의일인지 갱신일인지도 드러나지 않는다. PRODUCT.md 원칙 4(최신성 노출)를 지키지 못한다.
- 근거: services/web/utils/getTimeRemaining.ts:5 는 720시간 초과 시 time.split(' ')[0] 을 그대로 반환한다. Bill.tsx:304 가 이 값을 단계 칩 옆에 표시한다. Feed.tsx 어디에도 수집 시각이나 갱신 시각이 없다.
- 수정안: mainfeed 응답에 last_collected_at(또는 별도 메타 API)을 추가하고 피드 상단 정렬 컨트롤 줄에 '11월 2일 갱신'처럼 표시한다. 카드 날짜는 Intl.DateTimeFormat('ko-KR')로 '7월 9일 발의' 형식으로 바꾸고 연도가 다를 때만 연도를 붙인다.
- 검증 메모: getTimeRemaining.ts:5-6은 720시간을 넘으면 time.split(' ')[0]을 반환한다. propose_date가 '2026-07-09'이므로 원문 그대로 나온다. Bill.tsx:304가 이 값을 단계 Chip 옆에 표시한다. Feed.tsx에는 갱신 시각 표시가 없다. PRODUCT.md:43은 피드에 최신성을 드러내라고 요구한다.
- 파일: `services/web/utils/getTimeRemaining.ts`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Feed/Feed/Feed.tsx`

### FEED-04 하이드레이션 직후 목록을 비우고 다시 불러와 빈 화면과 스피너가 뜬다

- 분류: major · perf · 작업량 S · 검증 confirmed
- 사용자 영향: 서버가 그린 카드가 보였다가 사라지고 스피너만 남은 빈 화면이 나온 뒤 다시 카드가 나온다. 첫 로딩이 깜빡이고 레이아웃이 크게 이동한다.
- 근거: services/web/components/Feed/Feed/Feed.tsx:94-97 의 useEffect(() => { setBills([]); refetch(); }, [selectedStageType]) 가 최초 마운트에도 실행된다. 운영 스크린샷 mcp-Claude_Browser-blob-1793624849978-qt7sda.jpg(데스크톱)와 ...1793624918877-cnrjx6.jpg(모바일)에 탭 아래 스피너만 있는 빈 피드가 찍혀 있다.
- 수정안: stage를 queryKey에 넣고(FEED-07) 이 effect를 삭제한다. bills 로컬 state 복제도 없애고 data.pages에서 useMemo로 파생한다. 단계 변경 시에는 placeholderData(keepPreviousData) 또는 skeleton으로 전환한다.
- 검증 메모: Feed.tsx:94-97의 effect는 의존성이 [selectedStageType]이라 마운트 때도 실행된다. 같은 commit에서 82-86 effect가 setBills(data)를 먼저 실행하고, 이 effect가 setBills([])로 덮은 뒤 refetch한다. 운영 스크린샷 qt7sda.jpg(데스크톱)와 cnrjx6.jpg(모바일)에는 탭 아래에 스피너만 있는 빈 피드가 찍혀 있다. 보충: 구조적 공유 때문에 refetch 결과가 같으면 data 참조가 바뀌지 않는다. 이 경우 목록은 빈 채로 남고, 센티널이 다음 페이지를 불러온 뒤에야 카드가 다시 나온다.
- 파일: `services/web/components/Feed/Feed/Feed.tsx`, `services/web/components/Feed/Feed/apis/queries.ts`

### FEED-05 서버 prefetch 결과를 dehydrate 하지 않아 요청이 중복된다

- 분류: major · perf · 작업량 S · 검증 confirmed
- 사용자 영향: 홈 요청마다 서버가 mainfeed를 3번 순차 호출한 뒤 버린다. 이 대기 동안 loading.tsx 스플래시가 먼저 스트리밍된다. 클라이언트는 캐시가 비어 있어 같은 데이터를 다시 요청한다. 첫 화면이 늦게 안정된다.
- 근거: services/web/app/page.tsx:10-20 이 prefetchInfiniteQuery(pages: 3)를 await 하지만 HydrationBoundary/dehydrate 로 감싸지 않는다. 같은 패턴을 쓰는 app/bill/[id]/page.tsx:37 은 HydrationBoundary를 쓴다. 운영 HTML에는 카드가 3개(자세히 보기 3회)만 있고 <template id="B:0"> 로 loading.tsx 폴백이 먼저 내려온다.
- 수정안: page.tsx에서 prefetch 후 <HydrationBoundary state={dehydrate(queryClient)}>로 Feed를 감싼다. queryKey와 queryFn을 queries.ts의 공통 옵션 객체(queryOptions)로 한 곳에서 정의해 서버와 클라이언트 키가 어긋나지 않게 한다. pages: 3 대신 첫 페이지만 prefetch 하고 페이지 크기를 키운다(FEED-09).
- 검증 메모: app/page.tsx:10-20은 prefetchInfiniteQuery(pages: 3)를 await한다. 그런데 HydrationBoundary/dehydrate가 없다. app/bill/[id]/page.tsx:37, app/party/[id]/page.tsx:34는 HydrationBoundary를 쓴다. Feed는 lib/provider/QueryClientProvider.tsx의 다른 QueryClient 인스턴스를 쓰므로 prefetch 결과를 버린다. SSR 중 Feed가 1페이지를 다시 받는다. 클라이언트에서 한 번 더 받는다. 운영 HTML에는 '자세히 보기'가 3회 있고 <template id="B:0">와 loading.tsx 문구 'AI 기반 입법정보 제공 플랫폼'이 들어 있다.
- 파일: `services/web/app/page.tsx`, `services/web/components/Feed/Feed/apis/queries.ts`

### FEED-06 법안 상세에서 뒤로 오면 탭·정렬·필터·스크롤 위치가 모두 초기화된다

- 분류: major · ux · 작업량 M · 검증 confirmed
- 사용자 영향: 카드의 '자세히 보기'로 들어갔다가 돌아오면 목록 맨 위의 '리포트·시간순·전체' 상태로 돌아가고 목록도 다시 로딩된다. 피드를 훑어보며 상세를 여는 기본 흐름이 매번 끊긴다.
- 근거: Feed.tsx:63-65 에서 contentType, feedType, stageType 을 컴포넌트 로컬 useState로만 보관한다. Feed.tsx:94-97 effect가 재마운트 때마다 setBills([])로 목록 높이를 0으로 만들어 스크롤 복원이 불가능하다.
- 수정안: 탭·정렬·단계를 URL 검색 파라미터(?tab=bill&sort=hot&stage=접수)로 옮기고 useSearchParams로 읽는다. FEED-04 수정으로 캐시된 데이터를 즉시 렌더하면 Next 기본 스크롤 복원이 동작한다. 팔로잉 탭도 URL로 직접 열 수 있게 된다.
- 검증 메모: Feed.tsx:63-65는 contentType, feedType(useTabType), stageType을 컴포넌트 로컬 state로만 보관한다. App Router에서 /bill/[id]에서 '/'로 돌아오면 페이지 세그먼트가 다시 마운트되어 state가 초기값으로 돌아간다. 94-97 effect가 목록을 비워 스크롤 복원 높이도 사라진다.
- 파일: `services/web/components/Feed/Feed/Feed.tsx`, `services/web/app/page.tsx`

### FEED-07 단계 필터 값이 queryKey에 없어 캐시가 섞이고 전환이 느리다

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 단계를 바꿀 때 지금까지 스크롤로 불러온 페이지 수만큼 요청이 순차로 다시 나간다. 그동안 목록은 비어 있다. 다른 단계로 갔다 '전체'로 돌아와도 캐시를 쓰지 못한다.
- 근거: services/web/components/Feed/Feed/apis/queries.ts:13 queryKey: ['/bill/mainfeed'] 에 stage가 없다. Feed.tsx:94-97 이 refetch()로 같은 키의 모든 페이지를 새 stage로 다시 받는다. app/page.tsx:11 도 같은 고정 키를 쓴다.
- 수정안: queryKey를 ['/bill/mainfeed', stage]로 바꾸고 refetch 호출과 setBills([])를 삭제한다. usePatchBookmark의 invalidateQueries({ queryKey: ['/bill/mainfeed'] })는 접두 일치로 그대로 동작한다.
- 검증 메모: queries.ts:13 queryKey: ['/bill/mainfeed']에 stage가 없다. app/page.tsx:11도 같은 키를 쓴다. Feed.tsx:94-97은 단계가 바뀔 때 refetch()를 호출한다. 이 호출은 무한 쿼리의 로드된 모든 페이지를 새 stage 클로저로 순차 재요청한다. usePatchBookmark(app/bill/[id]/apis/queries.ts:25)의 invalidateQueries는 접두 일치로 계속 동작한다.
- 파일: `services/web/components/Feed/Feed/apis/queries.ts`, `services/web/components/Feed/Feed/Feed.tsx`, `services/web/app/page.tsx`

### FEED-08 피드에 오류 상태와 빈 상태가 없다

- 분류: major · bug · 작업량 M · 검증 confirmed
- 사용자 영향: 단계 전환이나 추가 로딩이 실패하면 빈 화면이 아무 안내 없이 남는다. 첫 로딩 실패 시에는 홈 전체가 '페이지가 작동하지 않습니다' 화면으로 바뀐다. HOT 탭은 로딩 중에도 스피너 없이 비어 있다. 결과가 0건인 단계를 고르면 빈 영역만 보인다.
- 근거: Feed.tsx:67-74 는 error/isError/isLoading 을 읽지 않는다. BillList.tsx:25-33 은 목록이 비었을 때 렌더할 내용이 없다. 스피너는 feedType === 'sorted_by_latest' 일 때만 표시된다(BillList.tsx:28). useGetBillPopular(queries.ts:23-27)의 isLoading은 쓰이지 않는다. 첫 로딩은 useSuspenseInfiniteQuery 오류가 app/error.tsx 전체 페이지로 전파된다.
- 수정안: 피드 영역 안에 QueryErrorResetBoundary 기반 인라인 오류 블록(다시 시도 버튼)을 둔다. 추가 페이지 실패는 목록 끝에 다시 시도 버튼으로 표시한다. 빈 결과는 '이 단계의 법안이 없어요'와 필터 초기화 버튼으로 처리한다. HOT 로딩은 카드 skeleton을 공통으로 쓴다.
- 검증 메모: Feed.tsx:67-74는 error, isError, isLoading을 읽지 않는다. BillList.tsx:25-33에는 빈 목록 분기가 없다. 스피너는 feedType === 'sorted_by_latest'일 때만 나온다(28행). useGetBillPopular는 suspense가 아닌 useQuery다(queries.ts:23-27). 그래서 HOT 탭은 로딩 중에 빈 영역이 된다. 첫 로딩 오류는 useSuspenseInfiniteQuery가 throw하여 app/error.tsx의 '페이지가 작동하지 않습니다.' 전체 화면으로 전파된다.
- 파일: `services/web/components/Feed/Feed/Feed.tsx`, `services/web/components/Bill/BillList/BillList.tsx`

### FEED-09 페이지 크기가 3건이라 첫 화면과 스크롤 로딩이 잦다

- 분류: major · perf · 작업량 S · 검증 confirmed
- 사용자 영향: 서버가 그린 첫 화면에 법안이 3건뿐이다. 스크롤할 때마다 3건씩 네트워크 왕복을 기다려야 하고 스피너가 자주 보인다.
- 근거: services/web/components/Feed/Feed/apis/apis.ts:12 params: { page, size: 3, stage }. app/following/apis/apis.ts:12 도 size: 3. 운영 HTML에서 '자세히 보기'가 3회만 나온다.
- 수정안: size를 10~20으로 올린다. 센티널에 rootMargin(예: '800px 0px')을 줘 화면 끝에 닿기 전에 다음 페이지를 미리 불러온다.
- 검증 메모: components/Feed/Feed/apis/apis.ts:12에 size: 3이 있다. app/following/apis/apis.ts:12에도 size: 3이 있다. 운영 HTML에서 '자세히 보기'는 3회만 나온다. useIntersect.ts는 options를 받지만 Feed.tsx:76에서 rootMargin 없이 호출한다.
- 파일: `services/web/components/Feed/Feed/apis/apis.ts`, `services/web/app/following/apis/apis.ts`, `services/web/hooks/useIntersect.ts`

### FEED-10 요약 본문 전체가 role=button 이라 스크린리더가 요약 내용을 읽지 못한다

- 분류: major · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 스크린리더 사용자는 각 카드에서 '법안 요약 더 보기, 버튼'만 듣는다. 핵심 콘텐츠인 요약 문장이 aria-label에 가려진다. 버튼 안에 용어 풀이 버튼이 중첩되어 키보드 순서도 혼란스럽다. 본문을 드래그해 선택해도 펼침이 토글된다.
- 근거: services/web/components/Bill/BillList/Bill/SafeBillSummaryHtml.tsx:210-217 <div role="button" tabIndex={0} aria-label={ariaLabel}> 가 요약 전체를 감싼다. 같은 파일 192-205 에서 내부에 <button class="lawdigest-term-tooltip"> 를 만든다. 운영 HTML: role="button" tabindex="0" aria-label="법안 요약 더 보기" 3회.
- 수정안: 요약 컨테이너는 일반 div로 두고 role, tabIndex, aria-label, onClick을 제거한다. 펼치기/접기는 하나의 실제 <button aria-expanded aria-controls>로만 처리한다.
- 검증 메모: SafeBillSummaryHtml.tsx:210-217의 <div role="button" tabIndex={0} aria-label={ariaLabel}>가 요약 전체를 감싼다. button 역할은 자식을 presentational로 처리하고 aria-label이 이름을 대체한다. 191-205는 그 안에 <button class="lawdigest-term-tooltip">을 만들어 중첩 interactive가 된다. 운영 HTML에서 aria-label="법안 요약 더 보기"가 3회 나온다.
- 파일: `services/web/components/Bill/BillList/Bill/SafeBillSummaryHtml.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### FEED-12 다크 모드에서 콘텐츠 탭(리포트·법안·팔로잉) 글자가 보이지 않는다

- 분류: major · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 다크 모드 사용자는 피드 최상단 탭 레이블을 읽을 수 없다. 활성 탭 글자와 배경의 대비가 1.05:1이다.
- 근거: services/web/styles/globals.css:355-381 .feed-content-tab color: rgba(25,25,25,0.4), .is-active color: #191919. .dark 변형 규칙이 없다(grep 결과 globals.css 외 정의 없음). 배경은 dark-b #101012 / dark-pb #1E1E1E. 계산한 대비: #191919 vs #101012 = 1.08, vs #1E1E1E = 1.05.
- 수정안: 탭 색을 Tailwind 토큰 클래스(text-gray-2 / text-primary-3 dark:text-white)로 옮기거나 .dark .feed-content-tab 규칙을 추가한다. focus-visible 링과 prefers-reduced-motion 시 인디케이터 전환 제거도 함께 넣는다.
- 검증 메모: globals.css:355-381의 .feed-content-tab은 color rgba(25,25,25,0.4)이고 .is-active는 #191919이다. .dark 변형은 없다(globals.css의 .dark 규칙은 135, 163, 282행뿐이다). Header.tsx:102 등에 ThemeSwitchButton이 있어 사용자가 다크 모드로 바꿀 수 있다. body 배경은 dark:bg-dark-b(#101012)와 dark:lg:bg-dark-pb(#1E1E1E)다. 계산한 대비는 1.08과 1.05다.
- 파일: `services/web/styles/globals.css`, `services/web/components/Feed/Feed/Feed.tsx`

### FEED-13 카드 보조 텍스트와 '자세히 보기' 버튼 대비가 WCAG AA에 못 미친다

- 분류: major · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 원 법안명, '○○ 의원 등 N인', '더 보기'가 흰 배경에서 흐리게 보인다. 다크 모드에서는 날짜, 스크랩·조회수, '자세히 보기'가 배경에 묻힌다.
- 근거: Bill.tsx:300 text-gray-2(#999) on white = 2.85:1. Bill.tsx:304 날짜 text-gray-3(#555), 341·348 스크랩·조회수 text-gray-3 은 dark 변형이 없어 #101012 위 2.55:1, #1E1E1E 위 2.24:1. Bill.tsx:366 다크 '자세히 보기' dark:bg-gray-3 + dark:text-gray-2 = 2.62:1.
- 수정안: 보조 텍스트를 text-gray-3(#555, 7.46:1)로 올리고 다크 변형 dark:text-gray-2(#999, 6.67:1)를 짝으로 지정한다. '자세히 보기' 다크 스타일은 배경 #2E2E2E + 글자 #EBEBEB 수준으로 바꾼다.
- 검증 메모: tailwind.config.js의 gray-2는 #999999, gray-3는 #555555다. 대비 계산값은 다음과 같다. Bill.tsx:300 #999 on #fff = 2.85, 304와 341·348의 text-gray-3(다크 변형 없음) on #101012 = 2.55, on #1E1E1E = 2.24, 366 dark:bg-gray-3 + dark:text-gray-2 = 2.62. 300행의 다크 변형 dark:text-gray-3도 2.55다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`

### FEED-14 정당색을 요약 본문 강조에 쓰고 미등록 정당은 경고 빨강으로 표시한다

- 분류: major · trust · 작업량 M · 검증 confirmed
- 사용자 영향: 요약의 형광펜, 소제목 밑줄, 불릿이 발의 의원 정당색으로 칠해진다. 같은 내용도 정당에 따라 다른 정서로 보인다. 목록에 없는 정당(예: 더불어민주연합)은 #e63946 빨강으로 표시되어 특정 정당처럼 보인다. 중립성 원칙을 해친다.
- 근거: renderBillSummaryMarkdown.ts:29-43 PARTY_ACCENT_COLORS 와 fallback '#e63946'. Bill.tsx:103-110 이 이를 --lawdigest-summary-accent 로 주입한다. globals.css:116-310 이 mark, heading, li::before 에 적용한다. DESIGN.md 'The Party Color Is Data Rule'은 소속 표식에만 쓰고 감정적 강조에 쓰지 말라고 하며 source of truth를 constants/party/party.ts 로 정한다. party.ts:112 UNKNOWN_PARTY_COLOR = '#797C85', 119-134 getPartyColor().
- 수정안: 요약 본문 강조색은 정당과 무관한 중립 토큰(primary-ink 또는 primary-soft-blue) 하나로 고정한다. 정당색은 발의자 카드 테두리·로고에만 남긴다. 중복 정의 PARTY_ACCENT_COLORS와 globals.css 정당 클래스는 getPartyColor()로 대체한다.
- 검증 메모: renderBillSummaryMarkdown.ts:29-43의 PARTY_ACCENT_COLORS에는 자유통일당, 한국의희망 등이 없다. 목록에 없으면 fallback '#e63946'(빨강)을 쓴다. Bill.tsx:103-110이 이 값을 --lawdigest-summary-accent로 주입한다. globals.css:116 이후 mark, heading, 불릿이 이 값을 쓴다. DESIGN.md:165는 정당색을 소속 표식에만 쓰고 감정적 강조에는 쓰지 말라고 한다. 같은 줄은 PARTY_COLOR나 getPartyColor()를 쓰라고 한다. party.ts의 UNKNOWN_PARTY_COLOR는 '#797C85'로, 이 fallback과 다르다.
- 파일: `services/web/components/Bill/BillList/Bill/renderBillSummaryMarkdown.ts`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/styles/globals.css`

### FEED-15 피드 카드의 AI 요약에 AI 생성 표시와 출처 경로가 없다

- 분류: major · trust · 작업량 S · 검증 confirmed
- 사용자 영향: 사용자는 피드에서 읽는 '쉬운 요약'이 AI가 만든 글인지 알 수 없다. 원문으로 가는 경로도 상세 페이지에 들어가야만 보인다. PRODUCT.md 원칙 4를 지키지 못한다.
- 근거: Bill.tsx:338-373 피드(detail=false) 푸터에는 스크랩·조회수·공유·자세히 보기만 있다. AI 주의 문구, GPTSummary, '원문 확인하기'는 Bill.tsx:400-424 의 detail 분기에만 있다.
- 수정안: 카드 메타 줄(날짜·단계 칩 옆)에 작은 'AI 요약' 표식을 둔다. 표식에서 주의 문구 툴팁과 의안정보시스템 원문 링크를 열 수 있게 한다. 문구는 짧게 유지한다.
- 검증 메모: Bill.tsx:338-373의 피드 푸터에는 스크랩, 조회수, 링크 복사, 자세히 보기만 있다. AI 주의 문구(407-409)와 '원문 확인하기' 링크(411-419)는 400행 detail 분기에만 있다. 피드 카드는 gpt_summary의 '쉬운 요약'을 그대로 본문으로 보여 준다(98행).
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`

### FEED-16 한 줄 제목이 법안명을 반복하고 카드에 법안명이 두 번 나온다

- 분류: major · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 카드 첫 줄 '공직선거법 제도 정비를 위한 공직선거법 일부개정법률안' 바로 아래에 '공직선거법 일부개정법률안'이 다시 나온다. '무엇이 바뀌는지'를 첫 시선에 전하지 못한다.
- 근거: API 예시: mainfeed?stage=공포 첫 항목 title '공직선거법 제도 정비를 위한 공직선거법 일부개정법률안', bill_name '공직선거법 일부개정법률안'. 시간순 1~12건 모두 '…을 위한 {bill_name}' 형식. /bill/popular 의 '반려동물복지기본법안.'(끝 마침표), '위법명령거부하기 위한'(띄어쓰기). Bill.tsx:298-300 이 title과 bill_name을 연달아 렌더한다. docs/roadmap/2026-11-02-completion-roadmap.md:159 항목 1-1 이 같은 제목 재생성을 다룬다.
- 수정안: 제목 생성 프롬프트에서 법안명 반복을 금지하고 변경 내용 중심 문장으로 재생성한다(로드맵 1-1). 프론트는 title이 bill_name으로 끝나면 bill_name 줄을 숨기거나 title에서 접미 법안명을 떼어 내는 규칙을 둔다.
- 검증 메모: mainfeed 시간순 1~12건의 title이 모두 '…을/를 위한 {bill_name}' 형식이다. 예: '내부 관리 감독 강화를 위한 선거관리위원회법 일부개정법률안' / '선거관리위원회법 일부개정법률안'. /bill/popular에서는 '…반려동물복지기본법안.'(끝 마침표)와 '위법명령거부하기 위한'을 확인했다. Bill.tsx:298과 300이 title과 bill_name을 연달아 렌더한다. 스크린샷 f5jpeo.jpg에서도 두 줄이 반복된다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`

### FEED-17 HOT 탭 기준이 불명확하고 오래된 법안이 섞인다

- 분류: major · data · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: HOT 10건 중 다수가 스크랩 0~1건이고 2024년 법안이 포함된다. '지금 주목받는 법안'이라는 기대와 다르다. 영문 'HOT' 레이블도 다른 한국어 UI와 어긋난다.
- 근거: GET https://api.lawdigest.kr/v1/bill/popular → 10건, bill_like_count 0 또는 1, propose_date 2026-07-09부터 2024-09-30까지 섞임. config/site.ts:47-50 feedTabs label 'HOT'.
- 수정안: 최근 7일 조회·스크랩 증가량 기반의 인기 점수를 백엔드에서 정의한다. 레이블은 '인기'로 바꾼다. 데이터가 부족한 기간에는 탭을 감추거나 기간 기준을 메타 줄에 표시한다.
- 검증 메모: GET /v1/bill/popular는 10건을 반환한다. bill_like_count는 0 또는 1이다. propose_date는 2026-07-09부터 2024-09-30까지 섞여 있다. config/site.ts:49의 레이블은 'HOT'이다.
- 파일: `services/web/config/site.ts`

### FEED-19 팔로잉 빈 상태가 원인을 구분하지 않고 다음 행동도 제시하지 않는다

- 분류: major · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 팔로우한 의원이 없는 사용자는 '팔로잉한 의원이 없거나 관련 법안이 없어요.'만 본다. 무엇을 해야 하는지 모른다. 위에는 '팔로우한 의원 0' 카드가 빈 채로 나온다.
- 근거: FollowingFeed.tsx:51-53 문구. FollowingCongressmanStrip.tsx:18-19 은 congressmanList가 빈 배열이어도 렌더한다([]는 truthy). 팔로우 수는 이미 /following-tab/congressman 으로 알고 있다.
- 수정안: 팔로우 0명이면 스트립을 숨기고 의원·정당 찾기(탐색/검색) 버튼이 있는 빈 상태를 보여 준다. 팔로우는 있지만 법안이 0건이면 '팔로우한 의원의 새 법안이 아직 없어요'로 구분한다.
- 검증 메모: FollowingFeed.tsx:51-53의 문구는 '팔로잉한 의원이 없거나 관련 법안이 없어요.' 하나뿐이고 이동 버튼이 없다. FollowingCongressmanStrip.tsx:19는 !congressmanList로만 검사한다. 빈 배열은 truthy이므로 카드가 렌더되고 33행에 '0'이 표시된다.
- 파일: `services/web/components/Feed/Feed/FollowingFeed.tsx`, `services/web/components/Feed/Feed/FollowingCongressmanStrip.tsx`

### FEED-22 토큰 재발급 핸들러가 컴포넌트 밖에서 useRouter를 호출해 401 처리 시 피드가 오류 화면으로 바뀐다

- 분류: major · bug · 작업량 M · 검증 confirmed
- 사용자 영향: 액세스 토큰이 만료된 로그인 사용자가 홈에 오면 401 → 재발급 경로에서 예외가 나 피드 요청이 실패한다. 첫 로딩이면 홈 전체가 오류 페이지가 된다. 재발급에 성공해도 재요청 응답이 버려진다.
- 근거: services/web/api/config/core.ts:49-57 이 401에서 handleSuccessReissueToken/handleFailReissueToken 을 호출한다. api/auth/handlers.ts 에서 두 함수 모두 일반 함수 안에서 useRouter() 를 호출한다(react-hooks/rules-of-hooks 를 eslint-disable). handleSuccessReissueToken 은 axios(newConfig).then(() => router.refresh()) 를 반환해 데이터 대신 undefined가 된다.
- 수정안: 재발급 성공 시 원 요청을 axiosInstance(newConfig)로 재시도해 그 응답을 반환한다. 실패 시 라우터 대신 window.location.assign('/login?next=...') 또는 전역 상태 이벤트로 이동한다. 동시 401 요청은 하나의 재발급 Promise를 공유한다.
- 검증 메모: api/auth/handlers.ts:14와 25는 렌더 밖에서 useRouter()를 호출한다(파일 상단에서 rules-of-hooks를 비활성화했다). React 19.2.7에서는 렌더 밖 디스패처가 null이라 useContext가 TypeError를 던진다. core.ts:49-57 흐름은 다음과 같다. handleSuccessReissueToken이 14행에서 throw하면 .catch가 handleFailReissueToken을 실행한다. 이 함수가 deleteCookie(ACCESS_TOKEN)를 실행한 뒤 다시 throw한다. 결과적으로 재발급에 성공해도 401이 한 번 나면 토큰 쿠키가 지워진다. 사용자는 안내 없이 로그아웃되고 요청은 reject된다. 20행은 axios(newConfig).then(() => router.refresh())라서 원 응답도 버린다. 백엔드 CustomAuthenticationEntryPoint.java:25가 401을 반환하므로 이 경로에 도달할 수 있다.
- 파일: `services/web/api/auth/handlers.ts`, `services/web/api/config/core.ts`

### FEED-11 '더 보기'가 잘리지 않은 요약에도 나오고 펼친 뒤 접는 컨트롤이 없다

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 8줄 안에 다 보이는 요약에도 '더 보기'가 붙는다. 눌러도 변화가 없다. 펼친 뒤에는 다시 접는 버튼이 사라져 긴 요약을 지나 스크롤해야 한다. 모바일에서는 글자만 있는 작은 터치 영역이다.
- 근거: renderBillSummaryMarkdown.ts:82-85 moreButtonClassName 은 expanded가 아니면 항상 표시한다. 실제 넘침 여부를 측정하지 않는다. Bill.tsx:328-335 의 span은 펼친 뒤 hidden 처리되고 접기 문구가 없다.
- 수정안: ResizeObserver로 scrollHeight > clientHeight 일 때만 버튼을 렌더한다. 펼친 상태에서는 같은 버튼을 '접기'로 바꾼다. 터치 영역을 최소 44px 높이로 둔다.
- 검증 메모: renderBillSummaryMarkdown.ts:82-85의 moreButtonClassName은 detail이나 expanded가 아니면 넘침 여부와 관계없이 항상 보인다. 펼치면 'hidden'이 되고 접기 컨트롤이 없다. Bill.tsx:328-335는 글자만 있는 span role=button이다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Bill/BillList/Bill/renderBillSummaryMarkdown.ts`

### FEED-18 카드의 공동발의자 수가 국회 공식 표기와 다를 수 있다

- 분류: minor · data · 백엔드 · 운영 데이터 작업 · 작업량 S · 검증 confirmed
- 사용자 영향: 공식 '민형배의원 등 10인' 법안이 카드에서는 '민형배 의원 등 9인'으로 나온다. 숫자 불일치는 서비스 전체 신뢰를 떨어뜨린다.
- 근거: /bill/popular 응답: 군형법 일부개정법률안 proposers '민형배의원 등 10인', public_proposer_dto_list 9명. 해양관할구역 법안 '주철현의원 등 14인' vs 13명, 행정심판법 '신장식의원 등 11인' vs 10명. Bill.tsx:240-243 이 public_proposer_dto_list.length 로 인원수를 만든다.
- 수정안: 인원수는 백엔드가 공식 proposers 문자열에서 파싱한 total_proposer_count를 내려 주고 이를 표시한다. 명단 누락분(퇴직 의원 등)은 수집 단계에서 보강한다.
- 검증 메모: /bill/popular 응답에서 다음 세 건을 확인했다. 군형법 법안은 proposers '민형배의원 등 10인'이고 public_proposer_dto_list는 9명이다. 해양관할구역 법안은 '주철현의원 등 14인'에 13명이다. 행정심판법 법안은 '신장식의원 등 11인'에 10명이다. 다른 건(이해식 14인, 14명)은 일치하므로 목록에 대표발의자가 포함된다. Bill.tsx:240-243이 public_proposer_dto_list.length로 인원수를 만든다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`

### FEED-20 팔로잉 의원 스트립이 /following 사이드바용 컴포넌트를 그대로 써서 데스크톱 배치가 깨진다

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 1024px 이상에서 의원 목록이 세로로 쌓여 높이 200px 카드 안에 내부 스크롤이 생긴다. 1280px 이상에서는 이름이 xl 크기로 커지고 정당 로고 버튼이 나온다. 탭 이름과 같은 '팔로잉' 제목과 '팔로우한 의원' 레이블이 반복된다.
- 근거: app/following/components/FollowingHeader/CongressmanList.tsx:6 'flex w-full gap-3 lg:flex-col'. FollowingCongressmanStrip.tsx:26 'md:h-[200px]', 30 'overflow-x-scroll'. CongressmanItem.tsx:24 xl:flex-row, 34 xl:text-xl, 41-42 xl:block 와 오타 'bg-tranparent'. CongressmanList는 <ul> 안에 <li> 없이 <div>를 넣는다(CongressmanItem.tsx:24). FollowingCongressmanStrip.tsx:28,32 제목·레이블.
- 수정안: 피드 전용 가로 아바타 스트립 컴포넌트를 만들어 모든 폭에서 가로 스크롤로 고정한다. 항목은 <li>로 감싼다. 탭과 중복되는 '팔로잉' 제목과 '팔로우한 의원' 레이블은 지운다.
- 검증 메모: CongressmanList.tsx:6에 'lg:flex-col'이 있다. FollowingCongressmanStrip.tsx:26에 'md:h-[200px]'이 있고, 30행에 overflow-x-scroll이 있다(overflow-y가 auto로 계산된다). CongressmanItem.tsx에서 24행은 xl:flex-row, 34행은 xl:text-xl, 41-42행은 hidden xl:block이고 'bg-tranparent' 오타가 있다. 24행의 루트는 <li>가 아니라 <div>다. 28행의 '팔로잉' 제목은 탭 이름과 겹친다. 32행에는 '팔로우한 의원' 레이블이 있다.
- 파일: `services/web/components/Feed/Feed/FollowingCongressmanStrip.tsx`, `services/web/app/following/components/FollowingHeader/CongressmanList.tsx`, `services/web/app/following/components/FollowingHeader/CongressmanItem.tsx`

### FEED-21 비로그인 팔로잉 탭: 로그인 후 돌아오지 못하고 불필요한 요청이 반복된다

- 분류: minor · ux · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 팔로잉 탭에서 '로그인하기'를 누르고 로그인하면 마이페이지로 이동한다. 사용자는 팔로잉 피드로 다시 찾아가야 한다. 비로그인 상태에서도 팔로잉 API가 호출되고 실패 후 재시도된다.
- 근거: FollowingFeed.tsx:37 router.push('/login') 에 복귀 경로가 없다. app/login/kakaoLogin/page.tsx:11, googleLogin/page.tsx:11, naverLogin/page.tsx:11 모두 router.push('/mypage'). FollowingFeed.tsx:15 useGetFollowingBill 에 enabled 조건이 없다(app/following/apis/queries.ts:10-20). 비로그인 GET https://api.lawdigest.kr/v1/following-tab/bill?page=0&size=3 → 404 '해당 유저를 찾을 수 없습니다.'
- 수정안: 로그인 진입 시 ?next=/?tab=following 을 넘기고 OAuth 콜백에서 next로 복귀한다(오픈 리다이렉트 방지를 위해 내부 경로만 허용). useGetFollowingBill에 enabled: Boolean(accessToken) 을 준다. 비로그인 응답은 백엔드에서 401로 통일한다.
- 검증 메모: FollowingFeed.tsx:37은 복귀 경로 없이 router.push('/login')을 호출한다. kakaoLogin/googleLogin/naverLogin page.tsx:11은 모두 router.push('/mypage')다. FollowingFeed.tsx:15의 useGetFollowingBill은 accessToken 검사(31행)보다 먼저 호출된다. app/following/apis/queries.ts:10-20에는 enabled가 없다. 비로그인 GET /v1/following-tab/bill?page=0&size=3은 404 '해당 유저를 찾을 수 없습니다.'를 반환한다.
- 파일: `services/web/components/Feed/Feed/FollowingFeed.tsx`, `services/web/app/following/apis/queries.ts`, `services/web/app/login/page.tsx`, `services/web/app/login/kakaoLogin/page.tsx`, `services/web/app/login/googleLogin/page.tsx`, `services/web/app/login/naverLogin/page.tsx`

### FEED-23 스크랩이 실패해도 성공으로 표시되고 스크랩마다 로드된 피드 전체를 다시 받는다

- 분류: minor · bug · 작업량 M · 검증 confirmed
- 사용자 영향: 네트워크 오류로 스크랩이 저장되지 않아도 아이콘과 카운트가 바뀌고 '스크랩했습니다'가 뜬다. 새로고침하면 되돌아간다. 피드를 깊이 내린 상태에서 스크랩하면 불러온 모든 페이지가 다시 요청된다. HOT 목록은 갱신되지 않는다.
- 근거: Bill.tsx:128-145 가 상태와 스낵바를 mutate 전에 바꾸고 onError 롤백이 없다. app/bill/[id]/apis/queries.ts:21-28 onSuccess 가 ['/bill/mainfeed'] 전체를 invalidate 하고 ['/bill/popular'] 은 invalidate 하지 않는다. Bill.tsx:70-71 useState(is_book_mark) 는 이후 props 변화를 반영하지 않는다.
- 수정안: useMutation의 onMutate/onError/onSettled 로 낙관적 업데이트와 롤백을 구현하고 스낵바는 성공 후 띄운다. 피드 전체 invalidate 대신 setQueriesData로 해당 bill_id 항목만 갱신하고 popular 캐시도 같은 방식으로 갱신한다.
- 검증 메모: Bill.tsx:132-141은 setIsLiked, setLikeCount, 성공 스낵바를 mutate 전에 실행하고 onError 롤백이 없다. app/bill/[id]/apis/queries.ts:23-28의 onSuccess는 ['/bill/mainfeed'] 전체를 invalidate하고 ['/bill/popular']은 invalidate하지 않는다. Bill.tsx:70-71의 useState 초기값은 props가 바뀌어도 갱신되지 않는다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/app/bill/[id]/apis/queries.ts`

### FEED-24 링크 복사 실패에도 성공 스낵바가 뜨고 모바일 공유 시트를 쓰지 않는다

- 분류: minor · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 클립보드 권한이 없거나 실패한 환경에서도 '링크를 복사했습니다.'가 뜬다. 모바일 사용자는 카카오톡 등으로 바로 공유하지 못한다.
- 근거: utils/handleCopyClipBoard.ts:1-7 은 async 이고 오류를 console.log로만 삼킨다. Bill.tsx:147-150 은 await 없이 성공 스낵바를 띄운다.
- 수정안: navigator.share 가 있으면 공유 시트를 열고 없으면 클립보드 복사 결과를 await 해서 성공/실패 스낵바를 나눈다. copyClipBoard는 boolean을 반환하게 바꾼다.
- 검증 메모: utils/handleCopyClipBoard.ts:1-7은 오류를 console.log로만 처리하고 결과를 반환하지 않는다. Bill.tsx:147-150은 await 없이 '링크를 복사했습니다.' 스낵바를 띄운다. 코드에 navigator.share 호출이 없다.
- 파일: `services/web/utils/handleCopyClipBoard.ts`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### FEED-25 카드 컨트롤의 마크업과 레이블이 접근성 기준에 맞지 않는다

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 키보드 사용자는 '자세히 보기'에서 링크와 버튼에 두 번 포커스가 간다. 스크린리더는 공유 버튼을 'Export Button'으로 읽는다. 스크랩 아이콘 버튼은 이름도 눌림 상태도 없다. '스크랩', '0', '조회수' 같은 숫자가 제목(h4)으로 읽혀 제목 탐색이 무의미해진다. 페이지에 h1이 없다.
- 근거: 운영 HTML: <a href="/bill/..."><button ...>자세히 보기 (Bill.tsx:364-371). aria-label="Export Button" 3회(Bill.tsx:357). Bill.tsx:342 스크랩 Button에 aria-label/aria-pressed 없음. Bill.tsx:345-350 h4, 304 h5, 236-245 Button 안 Tooltip 안 h4(tabindex=0). 운영 HTML의 <h1 개수 0.
- 수정안: '자세히 보기'는 Button as={Link} 하나로 만든다. 공유 버튼 aria-label='링크 복사', 스크랩 버튼 aria-label='스크랩' + aria-pressed={isLiked}. 메타 숫자는 span/dl로 바꾸고 카드 제목만 h2(또는 h3)로 둔다. 피드 제목을 h1으로 올린다.
- 검증 메모: 운영 HTML에서 <a href="/bill/..."><button 중첩이 3회 나온다. aria-label="Export Button"도 3회 나온다(Bill.tsx:357). Bill.tsx:342의 스크랩 Button에는 aria-label과 aria-pressed가 없다. 345-350은 숫자와 레이블을 h4로 쓴다. 운영 HTML에는 <h4 class="text-xs text-gray-2" tabindex="0">이 있다(Tooltip 트리거). 운영 HTML의 <h1 개수는 0이다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Feed/Feed/Feed.tsx`

### FEED-26 탭과 드롭다운에 탭 의미가 없고 HeroUI 예제 레이블이 남아 있다

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 스크린리더는 리포트·법안·팔로잉 중 어느 것이 선택됐는지 알려 주지 않는다. 정렬 탭은 'Options', 단계 메뉴는 'Static Actions'로 읽힌다.
- 근거: Feed.tsx:107-125 일반 <button> 나열, role=tablist/aria-selected 없음. 선택은 색으로만 표시된다. FeedTab.tsx:20 aria-label="Options", StageDropdown.tsx:27 aria-label="Static Actions". 운영 HTML aria-label="Options" 2회. 인디케이터 위치는 85+5px 하드코딩(Feed.tsx:112).
- 수정안: 콘텐츠 탭을 HeroUI Tabs(또는 role=tablist + aria-selected + 화살표 키 이동)로 바꾼다. aria-label을 '정렬', '처리 단계'로 고친다. 인디케이터는 선택된 탭 요소의 offsetLeft/width로 계산한다.
- 검증 메모: Feed.tsx:115-124는 일반 <button>을 나열한다. role=tablist와 aria-selected가 없고 선택은 색으로만 드러난다. 112행은 85+5px를 하드코딩한다. FeedTab.tsx:20에 aria-label="Options"가 있고 운영 HTML에서 role="tablist"와 함께 확인된다. StageDropdown.tsx:27에 aria-label="Static Actions"가 있다(메뉴가 열릴 때만 렌더되어 HTML에는 없다).
- 파일: `services/web/components/Feed/Feed/Feed.tsx`, `services/web/components/Feed/FeedTab/FeedTab.tsx`, `services/web/components/Feed/StageDropdown/StageDropdown.tsx`

### FEED-27 단계 필터가 선택 상태를 표시하지 않고 실제 단계 일부가 빠져 있다

- 분류: minor · bug · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: 드롭다운을 열어도 현재 선택한 단계에 체크 표시가 없다. 데이터에 있는 '체계자구 심사', '철회' 법안은 필터로 볼 수 없다. 다른 화면의 단계명 상수에는 '체계지구 심사' 오타가 있다.
- 근거: StageDropdown.tsx:31 selectedKeys={type} 에 문자열을 넘긴다. React Stately는 'all'이 아니면 new Set(selection)으로 변환하므로 '전체'가 {'전','체'}가 되어 어떤 항목과도 일치하지 않는다. config/site.ts:41-46 stageTabs 는 4개뿐이다. API: mainfeed?stage=체계자구 심사 → 200, 2026-05-06 법안 반환. stage=철회 → 200, 2025-09-29 법안 반환. constants/bill.ts:23 '체계지구 심사'.
- 수정안: selectedKeys={new Set([type])} 로 넘기고 key와 표시값을 하나의 상수 배열에서 만든다. 단계 목록은 백엔드가 제공하는 실제 bill_stage 목록(또는 PROGRESS_STAGE_KO + 철회/폐기)으로 맞춘다. 오타를 '체계자구 심사'로 고친다.
- 검증 메모: StageDropdown.tsx:31은 selectedKeys={type}에 문자열을 넘긴다. node_modules/react-stately/dist/private/selection/useMultipleSelectionState.mjs:89-91의 convertSelection은 'all'이 아니면 new Selection(selection)을 만든다. Selection은 Set을 상속하므로 '전체'가 {'전','체'}가 되어 어떤 key와도 일치하지 않는다. config/site.ts:41-46의 stageTabs는 4개다. API에서 stage=체계자구 심사는 200과 2026-05-06 법안 3건을 반환한다. stage=철회는 200과 2025-09-29 법안을 반환한다. constants/bill.ts:23에 '체계지구 심사' 오타가 있다.
- 파일: `services/web/components/Feed/StageDropdown/StageDropdown.tsx`, `services/web/config/site.ts`, `services/web/constants/bill.ts`

### FEED-28 로딩 화면이 금지 수식 'AI 기반'과 잘못된 alt를 쓰는 스플래시다

- 분류: minor · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 홈을 열 때 큰 로고와 'AI 기반 입법정보 제공 플랫폼' 문구, 스피너가 먼저 보이고 피드로 바뀐다. 스크린리더는 로고를 '500 에러 이미지'로 읽는다. 콘텐츠 형태를 미리 보여 주지 않아 화면이 크게 바뀐다.
- 근거: services/web/app/loading.tsx:14 alt="500 에러 이미지", 17 'AI 기반 입법정보 제공 플랫폼', 6 템플릿 주석 '// Or a custom loading skeleton component'. 운영 HTML 에 이 문구가 <template id="B:0"> 폴백으로 포함된다.
- 수정안: 홈 전용 loading을 피드 헤더 + 카드 skeleton 3개로 바꾼다. 'AI 기반' 문구와 템플릿 주석을 지운다. 로고 alt는 '모두의입법'으로 고친다.
- 검증 메모: app/loading.tsx에서 6행은 템플릿 주석 '// Or a custom loading skeleton component', 14행은 alt="500 에러 이미지", 17행은 'AI 기반 입법정보 제공 플랫폼'이다. 운영 HTML에 이 문구가 <template id="B:0"> 폴백과 함께 들어 있다.
- 파일: `services/web/app/loading.tsx`

### FEED-29 화면 구조를 반복하는 레이블이 많다

- 분류: minor · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 내비게이션에 이미 '피드'가 활성인데 본문 첫 줄이 다시 '피드'다. 모든 카드가 '쉬운 요약', '주요 내용' 소제목을 반복한다. 두 섹션 내용도 많이 겹쳐 카드가 길어진다.
- 근거: Feed.tsx:102-104 <h2>피드</h2>. renderBillSummaryMarkdown.ts:27 FEED_SECTION_HEADINGS = {'쉬운 요약','주요 내용'} 을 피드에 모두 노출한다(getFeedSummaryMarkdown 45-80). 운영 HTML 카드마다 두 소제목이 나온다. 예: 선관위법 카드의 쉬운 요약 '위원장 상임화·상임위원 3인' 문장이 주요 내용 첫 두 항목과 같은 내용이다.
- 수정안: 피드 카드에는 '쉬운 요약' 목록만 소제목 없이 보여 주고 '주요 내용'은 상세로 넘긴다. '피드' 제목은 시각적으로 감추고 h1으로만 남기거나 최신성 메타 줄로 대체한다.
- 검증 메모: Feed.tsx:102-104에 <h2>피드</h2>가 있다. 내비게이션 site.ts:21에도 '피드'가 활성 상태로 표시된다. renderBillSummaryMarkdown.ts:27의 FEED_SECTION_HEADINGS는 '쉬운 요약'과 '주요 내용'을 모두 피드에 남긴다. 스크린샷 f5jpeo.jpg에서 쉬운 요약의 '위원장 상임화, 상임위원 1명→3명' 문장이 주요 내용 첫 두 항목과 겹친다.
- 파일: `services/web/components/Feed/Feed/Feed.tsx`, `services/web/components/Bill/BillList/Bill/renderBillSummaryMarkdown.ts`

### FEED-30 홈 메타데이터가 제품을 설명하지 못하고 대표 URL이 어긋난다

- 분류: minor · seo · 운영 데이터 작업 · 작업량 S · 검증 confirmed
- 사용자 영향: 검색 결과와 공유 미리보기 설명이 '자연어 처리 기술을 이용한 법률 개정안 요약 플랫폼'이다. 시민이 얻는 가치가 아니라 기술을 말한다. lawdigest.kr 과 www.lawdigest.kr 이 둘 다 200을 반환하고 canonical이 없어 검색 색인이 나뉜다.
- 근거: curl https://lawdigest.kr/ : <title>모두의입법</title>, meta description/og:description 위 문구, og:url https://www.lawdigest.kr, <link rel="canonical"> 없음. www.lawdigest.kr 도 200(리다이렉트 없음). config/site.ts:7-8, app/layout.tsx:18-60. app/page.tsx 에 metadata export 없음.
- 수정안: site.ts description을 시민 관점 문장(예: '국회 법안을 쉬운 말로 읽고 처리 단계를 따라가세요')으로 바꾼다. metadata.alternates.canonical 을 지정하고 www → apex(또는 반대) 301 리다이렉트를 nginx에 둔다. og:url 을 실제 대표 도메인과 맞춘다.
- 검증 메모: curl https://lawdigest.kr/ 결과는 다음과 같다. <title>모두의입법</title>이 있다. description, og:description, twitter:description은 모두 '자연어 처리 기술을 이용한 법률 개정안 요약 플랫폼'이다. og:url은 https://www.lawdigest.kr이다. rel="canonical"은 없다. https://www.lawdigest.kr/도 리다이렉트 없이 200을 반환한다. 관련 코드는 config/site.ts:7-8과 app/layout.tsx:18-60이다.
- 파일: `services/web/config/site.ts`, `services/web/app/layout.tsx`, `services/web/app/page.tsx`

### FEED-31 알림 카드가 탭과 정렬 컨트롤 사이에 끼어 있고 문구가 과하다

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 로그인 사용자는 탭을 누른 뒤 알림 카드를 지나야 시간순/HOT와 단계 필터가 나온다. 컨트롤과 목록이 떨어져 보인다. 로딩 중에는 '불러오는 중...' 글자가 뜬다. 읽지 않은 알림이 0개여도 '0개의 읽지 않은 알림이 있습니다.'가 나온다. 알림을 읽을 때마다 '해당 알림을 읽었습니다.' 스낵바가 뜬다.
- 근거: Feed.tsx:128 NotificationTopThree 가 탭(107-125)과 정렬 컨트롤(133-138) 사이에 있다. NotificationTopThree.tsx:80 텍스트 로딩, 104-109 notificationCount 객체 존재만 검사, 27-34 읽음 성공 스낵바.
- 수정안: 알림 카드는 피드 제목 위나 정렬 컨트롤 아래로 옮기고 읽지 않은 알림이 있을 때만 보인다. 로딩은 skeleton, 0개일 때 문장 숨김, 읽음 스낵바는 제거하고 항목 시각 상태 변화로만 표시한다.
- 검증 메모: Feed.tsx:128의 NotificationTopThree는 콘텐츠 탭(107-125)과 정렬 컨트롤(133-138) 사이에 있다. NotificationTopThree.tsx:80은 '불러오는 중...' 텍스트를 쓴다. 104-109는 notificationCount 객체가 있는지만 검사하므로 0개일 때도 문장이 나온다. 27-34는 읽음 성공 스낵바를 띄운다. 84행 '최근 알림' 제목도 있다.
- 파일: `services/web/components/Feed/Feed/Feed.tsx`, `services/web/app/notification/components/NotificationTopThree.tsx`

### FEED-32 SSR에서 로그인 상태를 읽지 못해 서버 HTML과 클라이언트 렌더가 다르다

- 분류: minor · bug · 작업량 M · 검증 confirmed
- 사용자 영향: 서버는 항상 비로그인으로 렌더한다. 로그인 사용자는 알림 카드가 뒤늦게 끼어들며 화면이 밀린다. 서버에서 받은 법안의 스크랩 상태는 항상 false다. 현재는 FEED-04의 목록 비우기가 이를 우연히 덮고 있어 FEED-04만 고치면 스크랩 표시가 틀린다.
- 근거: api/config/core.ts:32 getCookie(ACCESS_TOKEN) 은 서버에서 요청 쿠키 없이 호출되어 undefined. NotificationTopThree.tsx:18,79 과 FollowingFeed.tsx:14 가 렌더 중 getCookie 로 분기한다. 운영 mainfeed 응답 is_book_mark 전부 False(비인증). Bill.tsx:70 useState(is_book_mark).
- 수정안: page.tsx(서버 컴포넌트)에서 next/headers cookies()로 토큰을 읽어 prefetch 요청에 Authorization을 붙인다. 로그인 여부는 서버에서 판단해 props나 컨텍스트로 내려 준다. 클라이언트 분기는 마운트 이후 값으로만 한다.
- 검증 메모: cookies-next 4.3.0의 lib/index.js:79-86은 서버에서 req 없이 호출되면 {}를 반환한다. 그래서 core.ts의 getCookie(ACCESS_TOKEN)는 SSR에서 undefined다. NotificationTopThree.tsx:18,79와 FollowingFeed.tsx:14는 렌더 중 getCookie로 분기한다. 이 때문에 서버 HTML과 클라이언트 렌더가 달라진다. 비인증 mainfeed 응답의 is_book_mark는 전부 False다.
- 파일: `services/web/app/page.tsx`, `services/web/api/config/core.ts`, `services/web/app/notification/components/NotificationTopThree.tsx`, `services/web/components/Feed/Feed/FollowingFeed.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### FEED-33 카드 구성 순서와 간격이 디자인 시스템과 다르다

- 분류: polish · visual · 작업량 M · 검증 confirmed
- 사용자 영향: 모바일에서 발의자 카드가 스크랩·자세히 보기 줄 뒤에 와서 다음 법안의 머리처럼 보인다. 발의자 카드만 그림자가 있어 떠 보인다. 팔로잉 탭 카드 간격(gap-4)과 법안 탭 카드 간격(10px 구분선)이 다르다.
- 근거: Bill.tsx:338-373 액션 푸터 뒤 427-459 에 발의자 Card(shadow="sm", 432). DESIGN.md 'The Flat Trust Rule'은 정보 카드 shadow none. FollowingFeed.tsx:47 'flex flex-col gap-4' vs Bill.tsx:464 Divider h-[10px].
- 수정안: 발의자 정보를 제목·메타 바로 아래로 올리고 액션 줄을 카드 맨 끝에 둔다. 발의자 카드 그림자를 제거하고 정당색 테두리만 남긴다. 팔로잉 목록도 BillList를 재사용해 같은 간격을 쓴다.
- 검증 메모: Bill.tsx:338-373의 액션 푸터 뒤에 427-459의 발의자 Card(shadow="sm", 433행)가 온다. 모바일에서는 이 순서대로 쌓인다. DESIGN.md:205 Flat Trust Rule은 정보 카드를 띄우지 말라고 한다. FollowingFeed.tsx:47은 gap-4를 쓴다. Bill이 자체로 Divider h-[10px](464행)를 넣으므로 팔로잉 탭은 간격이 겹친다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Feed/Feed/FollowingFeed.tsx`

### FEED-34 목록 끝과 로딩 중 상태 표시가 단순하다

- 분류: polish · ux · 작업량 S · 검증 confirmed
- 사용자 영향: HOT 10건이나 단계 필터 결과를 끝까지 보면 아무 표시 없이 끝난다. 추가 로딩은 회색 스피너만 보여 콘텐츠 형태를 예측할 수 없다.
- 근거: BillList.tsx:28-33 은 스피너와 센티널만 렌더한다. hasNextPage=false 일 때 표시가 없다. HOT 분기에는 센티널도 끝 표시도 없다.
- 수정안: 마지막 페이지 도달 시 '맨 위로' 버튼이 있는 끝 표시를 둔다. 추가 로딩은 카드 skeleton 1~2개로 바꾼다.
- 검증 메모: BillList.tsx:28-33은 스피너와 센티널만 렌더한다. hasNextPage=false를 받지 않으므로 끝 표시가 없다. HOT 분기(feedType이 sorted_by_latest가 아닐 때)에는 센티널도 끝 표시도 없다.
- 파일: `services/web/components/Bill/BillList/BillList.tsx`

### FEED-35 미사용 코드와 중복 구현이 남아 있다

- 분류: polish · dead-code · 작업량 S · 검증 confirmed
- 사용자 영향: 직접 노출되지는 않는다. 같은 기능을 두 곳에서 고쳐야 해 피드와 팔로잉 화면이 계속 어긋날 위험이 있다.
- 근거: renderBillSummaryMarkdown.ts:89-149 renderBillSummaryMarkdown(HTML 문자열 버전)은 테스트 외 사용처가 없다(grep). Feed.tsx:130-164 리포트/법안 분기 JSX 중복. app/following/page.tsx 는 내비게이션·링크 어디에서도 연결되지 않는 고아 라우트인데 피드 팔로잉 탭과 같은 기능을 따로 구현한다. FollowingFeed.tsx:47-59 는 <ul> 안에 <section>(Bill), <p>, <div>를 넣는다.
- 수정안: 미사용 HTML 렌더러와 테스트를 삭제한다. /following 라우트는 홈 팔로잉 탭(?tab=following)으로 리다이렉트하고 컴포넌트를 피드 쪽으로 옮긴다. 목록 마크업은 <ul><li>로 맞춘다.
- 검증 메모: renderBillSummaryMarkdown(89행 이후)은 renderBillSummaryMarkdown.test.ts에서만 import된다. Bill.tsx:41-45는 다른 세 export만 가져온다. /following을 연결하는 href는 grep으로 찾지 못했다. Header.tsx:39는 pathname 비교만 한다. site.ts navItems에도 /following이 없다. FollowingFeed.tsx:47-59는 <ul> 안에 Bill(<section>), <p>, <div>를 넣는다.
- 파일: `services/web/components/Bill/BillList/Bill/renderBillSummaryMarkdown.ts`, `services/web/components/Feed/Feed/Feed.tsx`, `services/web/app/following/page.tsx`, `services/web/components/Feed/Feed/FollowingFeed.tsx`

### FEED-36 mainfeed가 알 수 없는 stage 값에 500을 반환한다

- 분류: polish · bug · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: 현재 UI에서는 도달하지 않는다. 단계 목록을 데이터에 맞춰 늘리면(FEED-27) 일부 값에서 서버 오류가 난다.
- 근거: GET https://api.lawdigest.kr/v1/bill/mainfeed?page=0&size=3&stage=정부 이송 → 500 '서버 내부 오류입니다.' stage=위원회심사, stage=committeeJudge, stage=대안반영폐기 도 500.
- 수정안: 백엔드에서 stage를 enum으로 검증하고 알 수 없는 값은 400과 허용 목록을 반환한다. 결과가 없는 유효 값은 빈 목록 200으로 응답한다.
- 검증 메모: 다음 요청은 모두 code 500 '서버 내부 오류입니다.'를 반환한다. mainfeed?page=0&size=3&stage=정부 이송, stage=위원회심사, stage=committeeJudge, stage=대안반영폐기, stage=xyz. 유효한 stage인 공포, 철회, 체계자구 심사는 200이다.
- 파일: `services/backend`

## 법안 상세 (DETAIL)

### DETAIL-01 심사 진행 단계가 체계자구 심사·정부이송·철회 법안에서 '위원회 심사'로 잘못 표시되고 단계명에 오타가 있음

- 분류: blocker · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 정부이송·체계자구 심사·철회 법안을 연 사용자는 현재 단계가 '위원회 심사'라고 읽는다. 이미 정부로 넘어간 법안도 위원회 심사 중으로 보인다. 단계 목록에는 '체계지구 심사'라는 존재하지 않는 용어가 노출된다.
- 근거: services/web/constants/bill.ts:39 '체계지구 심사', :41 '정부 이송'(공백 포함). 백엔드·파이프라인 값은 '체계자구 심사','정부이송'(services/backend/.../global/constant/BillStageType.java:16-18, services/data/src/lawdigest_data/bills/DataFetcher.py:410-416). ProgressStage.tsx:7 indexOf 실패 시 stageNum=1로 대체. 운영 확인: GET /v1/bill/mainfeed?stage=정부이송 → PRC_O2N6N0V1V2U0V1T4T4S0A5A4Z4Z9Y9 bill_stage='정부이송'. 같은 id의 https://lawdigest.kr/bill/... HTML에서 STEP 01·02에만 번호가 없고 3~6에 번호가 있음(=02가 현재 단계). '철회' 단계(PRC_J2H5H0G9H2P6P1N7O3M2L5L6T0T8S9)와 2021년 임기만료폐기 법안(PRC_S2D1U0K9D1G0T1S1X0K2H5S3M3K5N0)도 동일하게 위원회 심사를 현재 단계로 표시.
- 수정안: 단계 값의 단일 기준을 백엔드 BillStageType으로 정하고 웹 상수를 '체계자구 심사','정부이송'으로 맞춘다. ProgressStage는 알 수 없는 값을 1로 대체하지 말고, 철회·폐기 같은 종료 상태를 별도 표시(마지막 도달 단계 + 종료 사유)한다. 장기적으로 API가 stage_order를 내려주게 해 문자열 비교를 없앤다.
- 검증 메모: services/web/constants/bill.ts:39에 '체계지구 심사', :41에 '정부 이송'이 있다. 백엔드 BillStageType.java와 DataFetcher.py _derive_bill_stage는 '체계자구 심사', '정부이송', '철회'를 쓴다. ProgressStage.tsx:7은 indexOf가 -1이면 1을 쓴다. API GET /v1/bill/detail/PRC_O2N6...의 bill_stage는 '정부이송'이다. 같은 법안의 운영 HTML에서 '위원회 심사' 행에만 text-black(현재 단계)이 붙고, 'STEP 03 체계지구 심사', 'STEP 05 정부 이송'이 노출된다. mainfeed?stage=정부이송은 43건, stage=체계자구 심사는 60건 이상(last_page=false), stage=철회는 6건이다. 이 법안 모두 현재 단계가 틀리게 보인다. PRC_S2D1...은 DB bill_stage 자체가 '위원회 심사'이다. 이 사례는 매핑 오류가 아니라 DETAIL-05 데이터 모순에 속한다.
- 파일: `services/web/constants/bill.ts`, `services/web/app/bill/[id]/components/ProgressStage/ProgressStage.tsx`

### DETAIL-02 로그인 사용자에게 상세 화면의 스크랩 상태가 항상 '안 함'으로 표시되고, 다시 누르면 실패한 요청에 성공 안내가 뜸 (코드 근거)

- 분류: major · bug · 작업량 M · 검증 confirmed
- 사용자 영향: 이미 스크랩한 법안을 열어도 빈 아이콘이 보인다. 아이콘을 누르면 '해당 법안을 스크랩했습니다.'와 함께 숫자가 1 늘지만 서버는 400으로 거절한다. 화면 상태와 실제 상태가 어긋난다.
- 근거: page.tsx:30 서버에서 useGetBillDetail 호출 → api/config/core.ts:32 getCookie(ACCESS_TOKEN)는 서버에서 node_modules/cookies-next/lib/index.js:79-85에 따라 {}를 반환 → Authorization 헤더 없음 → BillFacade.getBillByBillId가 userId 없이 응답, is_book_mark=false. Bill.tsx:70 useState(is_book_mark)로 고정. 클릭 시 Bill.tsx:132-141 낙관적 갱신 후 mutate(true) → LikeService.java:45-47 이미 존재하면 UpdateParameterException. queries.ts:21-29 onError 없음(롤백 없음). 비로그인 안내 Bill.tsx:143은 로그인 이동 수단이 없음. 로그인 금지 규칙 때문에 실제 로그인 상태 화면은 확인하지 못함.
- 수정안: is_book_mark와 bill_like_count는 클라이언트에서 인증 쿠키로 별도 조회(useQuery)하거나, 서버 컴포넌트에서 next/headers cookies()로 토큰을 읽어 요청에 전달한다. usePatchBookmark에 onError 롤백과 실패 스낵바를 추가한다. 비로그인 스낵바에 로그인 이동 액션을 둔다. 버튼에 aria-pressed를 단다.
- 검증 메모: 코드로만 확인했고 로그인 상태 화면은 확인하지 못했다. page.tsx:30은 서버에서 useGetBillDetail을 호출한다. core.ts:32의 getCookie는 cookies-next 4.3.0 lib/index.js getCookies에서 서버이고 req가 없으면 {}를 반환한다. 웹 전체에 next/headers cookies() 사용이 없다. 따라서 상세 API 요청에 Authorization이 없다. BillFacade.java:45-47은 userId가 비면 is_book_mark를 설정하지 않는다. Bill.tsx:70은 그 값을 초기 상태로 고정한다. Bill.tsx:132-141은 낙관적 갱신 후 mutate(!isLiked)를 보낸다. LikeService.likeBill은 이미 존재하는데 true가 오면 UpdateParameterException을 던진다. GlobalExceptionHandler.java:15-19가 이를 400으로 응답한다. queries.ts:18-30에는 onError가 없다.
- 파일: `services/web/app/bill/[id]/page.tsx`, `services/web/api/config/core.ts`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/app/bill/[id]/apis/queries.ts`

### DETAIL-03 존재하지 않는 법안 id: API 500, 페이지는 HTTP 200·제목 없음·범용 오류 화면, HTML에 서버 스택트레이스 노출

- 분류: major · bug · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: 삭제되었거나 잘못된 링크로 들어온 사용자는 '페이지가 작동하지 않습니다.'라는 서버 고장 화면을 본다. 법안이 없다는 사실을 알 수 없다. 응답 HTML에는 서버 파일 경로와 내부 API 설정이 그대로 실려 누구나 볼 수 있다.
- 근거: curl https://api.lawdigest.kr/v1/bill/detail/PRC_A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0 → 500 '서버 내부 오류입니다.' 원인: GlobalExceptionHandler.java:23-25 404 처리 목록에 BillException.BillNotFound 없음(ErrorCode.java:32는 404로 정의). curl https://lawdigest.kr/bill/NOPE_123 → 200, <title> 없음. HTML 내 RSC 페이로드: "stack":"AxiosError: Request failed with status code 500\n at aO (/home/ubuntu/project/Lawdigest/.runtime/prod-web/releases/20260715215023-a53c4dc/services/web/.next/server/chunks/23.js..." 및 "baseURL":"https://api.lawdigest.kr/v1". page.tsx:13-24, 26-34에 오류 처리·notFound() 호출 없음. app/bill/[id]에 not-found.tsx 없음. 공통 error.tsx:20-27 이미지 alt '500 에러 이미지'.
- 수정안: 백엔드 GlobalExceptionHandler 404 목록에 BillNotFound를 추가한다. 웹은 getBillDetail 실패 시 status 404면 notFound()를 호출하고, 나머지 오류는 원본 AxiosError가 아니라 정제된 Error를 던진다(generateMetadata 포함). app/bill/[id]/not-found.tsx에 '찾는 법안이 없어요' 화면과 피드·검색 이동을 둔다.
- 검증 메모: curl https://api.lawdigest.kr/v1/bill/detail/PRC_A0A0...은 500과 '서버 내부 오류입니다.'를 반환했다. GlobalExceptionHandler.java:23-25의 404 목록에 BillException.BillNotFound가 없다. ErrorCode.java:32는 BILL_NOT_FOUND를 404로 정의한다. curl https://lawdigest.kr/bill/NOPE_123은 200, 56,854B를 반환했고 <title>이 0개였다. HTML에 '"stack":"AxiosError: Request failed with status code 500\n at aO (/home/ubuntu/project/Lawdigest/.runtime/prod-web/releases/20260715215023-a53c4dc/...'와 '"baseURL":"https://api.lawdigest.kr/v1"'가 포함되어 있다. error.tsx는 클라이언트에서 렌더링되어 curl 응답에 '페이지가 작동하지 않습니다.' 문구가 없다. 코드상 그 문구가 표시된다(error.tsx:27). page.tsx에 notFound() 호출이 없다. app/bill/[id]에 not-found.tsx가 없다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/global/error/GlobalExceptionHandler.java`, `services/web/app/bill/[id]/page.tsx`, `services/web/app/error.tsx`

### DETAIL-04 가결 법안의 표결 카드가 찬성 수 없이 '수정가결 / 300'으로 깨져 표시되고, 분모 300과 수치 의미가 표시되지 않음

- 분류: major · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 가결된 법안 대부분에서 처리 결과 카드에 숫자 없이 '/ 300'만 보인다. 표결 데이터가 있는 법안도 '209 / 300'만 보여 209가 찬성인지, 300이 무엇인지 알 수 없다. 재석·반대·기권은 볼 수 없다.
- 근거: GET /v1/bill/detail/PRC_O2N6N0V1V2U0V1T4T4S0A5A4Z4Z9Y9 → bill_result='수정가결', vote_result_response={approval_count:null,total_vote_count:null,party_vote_list:[]}. 같은 페이지 HTML: '법안 처리 결과 / 수정가결 / / / 300'. PRC_Z2Y6K0Z4W2W7T1B7U5L9I4C7F6N8C3(공포)도 '원안가결 / 300'. 공포·정부이송 103건 중 표결 데이터 보유 12건. ProcessResult.tsx:65-82가 결과값만 보고 차트를 그림. HalfDonutChart.tsx:58 MAX_COUNT=300 고정, :152 threshold=total*0.5(null이면 0), :355-356 '{approvalCount} / {MAX_COUNT}'. PRC_K2J4I0P6O1N7K1I4F1N0M1M6V8P2P5는 approval 209, total 232인데 화면은 '209 / 300'.
- 수정안: approval_count가 null이면 차트 대신 '표결 기록 없음'과 결과·원문 링크만 보여 준다. 차트 문구는 '찬성 209 · 재석 232'처럼 실제 값과 단위를 쓰고, 기준선은 재석 과반으로 계산한다. 백엔드 표결 적재(VoteRecord/VoteParty) 누락분을 재수집한다.
- 검증 메모: PRC_O2N6... API의 bill_result는 '수정가결', approval_count와 total_vote_count는 null이다. 운영 HTML 텍스트는 '법안 처리 결과|수정가결| / 300'이다. ProcessResult.tsx:65-82는 결과값만으로 HalfDonutChart를 그린다. HalfDonutChart.tsx:58은 MAX_COUNT=300, :152는 threshold=totalVoteCount*0.5, :355-356은 '{approvalCount} / {MAX_COUNT}'이다. mainfeed?stage=공포 첫 50건 상세를 직접 조회한 결과 원안가결 49건과 수정가결 1건 모두 approval_count가 null이었다. 정부이송 43건 중 표결 데이터는 12건이다. PRC_K2J4...은 approval 209, total 232이다. 화면 분모는 300으로 고정된다.
- 파일: `services/web/app/bill/[id]/components/ProcessResult/ProcessResult.tsx`, `services/web/components/common/Chart/HalfDonutChart.tsx`

### DETAIL-05 단계와 처리 결과가 서로 모순되고, 종료된 법안의 결과가 단계 표시에 반영되지 않음

- 분류: major · trust · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 같은 화면에서 '위원회 심사' 진행 중 표시와 '임기만료폐기' 카드가 동시에 보인다. 공포된 법안이 '투표 정보가 없습니다.'로 끝나기도 한다. 사용자는 어느 정보를 믿어야 할지 판단할 수 없다.
- 근거: PRC_S2D1U0K9D1G0T1S1X0K2H5S3M3K5N0(2021-09-24 발의): bill_stage='위원회 심사', bill_result='임기만료폐기' → HTML에 위원회 심사 현재 단계 + '임기만료폐기 국회의원 임기가 만료되어 자동으로 폐기되었어요'. PRC_G2F6N0L3K3I1J1S6Q4P4O1J1K0Q1Z6: bill_stage='본회의 심의', bill_result='철회'. 공포·정부이송 103건 중 bill_result=None 19건 → ProcessResult.tsx:84-89 '투표 정보가 없습니다.'. 철회 단계 PRC_J2H5...도 결과 None.
- 수정안: bill_result가 종료 사유(임기만료폐기·대안반영폐기·철회·부결)이면 진행 단계 컴포넌트를 '도달한 마지막 단계 + 종료' 형태로 그린다. 데이터는 파이프라인에서 stage/bill_result를 재계산해 모순 행을 정리한다(21대 미처리 법안 일괄 임기만료폐기 반영 포함).
- 검증 메모: API로 확인했다. PRC_S2D1...은 bill_stage '위원회 심사', bill_result '임기만료폐기', propose_date 2021-09-24이다. PRC_G2F6...은 '본회의 심의'와 '철회'이다. 정부이송 43건 상세를 조회한 결과 bill_result None 19건, '철회' 1건이었다. 철회 단계 6건은 모두 bill_result None이다. ProcessResult.tsx:84-89는 None이면 '투표 정보가 없습니다.'를 출력한다. ProgressStage는 bill_result를 받지 않는다(BillDetail.tsx:48).
- 파일: `services/web/app/bill/[id]/components/ProgressStage/ProgressStage.tsx`, `services/web/app/bill/[id]/components/ProcessResult/ProcessResult.tsx`

### DETAIL-06 AI 요약이 없는 법안에 원문 제안이유를 그대로 보여 주면서 'Summarized by GPT-4o'와 AI 요약 경고를 붙임

- 분류: major · trust · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 사용자는 국회 원문 문장을 AI 요약으로 오인한다. 제목 자리에도 원문 첫 문장('선거관리위원회는 헌법상 ... 책무가 있음.')이 들어가 페이지 제목·공유 제목까지 문장이 된다.
- 근거: GET /v1/bill/detail/PRC_C2A6B0Z7Y0Y9U1V0T2T8S5Q5R5Y0Z5 → gpt_summary 없음, title='선거관리위원회는 헌법상 독립기관으로서 ...'. 페이지 <title>도 같은 문장. HTML: '제안이유 ... 주요내용 가. ... 더 보기 ... Summarized by GPT-4o AI 기반의 요약은 내용이 불완전할 수 있습니다.' Bill.tsx:98 gpt_summary || summary 대체, :404-409 GPTSummary·경고 무조건 렌더. 이 법안은 유사 법안 목록(PRC_Z2Z6... 상세)에서 링크됨. Bill.java:170-181은 gpt_summary 없으면 READY가 아니어야 하나 운영 행은 상세가 열림(ingest_status 재계산 누락 추정).
- 수정안: gpt_summary가 없으면 'AI 요약 준비 중' 상태와 원문 요약(제안이유)을 원문 표기로 구분해 보여 주고 GPT 표기·AI 경고를 숨긴다. title이 비정상(문장형·요약 없음)이면 bill_name을 제목으로 쓴다. 운영 DB에서 gpt_summary 없는 READY 행의 ingest_status를 재계산하고, 유사 법안 쿼리도 READY+요약 보유 조건을 맞춘다.
- 검증 메모: PRC_C2A6... API의 gpt_summary는 비어 있다. title은 '선거관리위원회는 헌법상 독립기관으로서 ...' 문장이다. 운영 페이지 <title>도 같은 문장이다. HTML에 'Summarized by'가 1회 있다. Bill.tsx:98은 gpt_summary || summary로 원문을 대체한다. :404-409는 GPTSummary와 AI 경고를 조건 없이 렌더링한다. 이 법안은 PRC_Z2Z6... 상세의 similar_bills에 포함되어 링크된다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Bill/GPTSummary/GPTSummary.tsx`, `services/web/app/bill/[id]/page.tsx`

### DETAIL-07 '다른 개정안' 목록에 개수 제한·정렬이 없어 최대 761건을 한 번에 렌더링

- 분류: major · perf · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 공직선거법 개정안 상세를 열면 761개 카드가 한 화면에 쌓여 스크롤이 끝나지 않는다. HTML이 2.2MB라 저사양 휴대폰과 느린 망에서 첫 화면이 늦게 뜬다. 목록 순서도 날짜순이 아니라 원하는 법안을 찾기 어렵다.
- 근거: GET /v1/bill/detail/PRC_Z2Y6K0Z4W2W7T1B7U5L9I4C7F6N8C3 → similar_bills 761건, API 295,684B. 페이지 HTML 2,209,082B(gzip 248,527B), 첫 요청 6.12s·재요청 0.89s. BillRepository.java:117-122 findSimilarBills에 ORDER BY·LIMIT 없음. SimilarBill.java에 발의일 필드 없음. AnotherBillList.tsx:17-19 전부 map. 유사 법안 제목 문자열이 HTML에 3회 등장(HTML+RSC props+HydrationBoundary dehydrate, page.tsx:37).
- 수정안: API에 발의일 내림차순 정렬과 페이지네이션(size, total)을 추가하고 SimilarBill에 propose_date·bill_result를 넣는다. 화면은 최근 5건과 '전체 N건 보기'(무한 스크롤 또는 별도 목록)로 바꾼다. 쓰지 않는 HydrationBoundary를 제거해 중복 페이로드를 없앤다.
- 검증 메모: PRC_Z2Y6... API의 similar_bills는 761건, API 응답은 295,684B이다. 페이지 HTML은 2,209,082B, gzip 248,528B이다. 이번 측정의 응답 시간은 1.05s였다. 6.12s는 재현하지 못했다. 유사 법안 제목 '잔임기간을 남은 임기로 개정'이 HTML에 3회 나온다. BillRepository.java:117-122 findSimilarBills에는 ORDER BY와 LIMIT이 없다. 응답 순서는 billId 문자열순으로 보인다. AnotherBillList.tsx:17-19는 전부 map한다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/common/dto/SimilarBill.java`, `services/web/app/bill/[id]/components/AnotherBill/AnotherBillList.tsx`, `services/web/app/bill/[id]/page.tsx`

### DETAIL-08 '다른 개정안' 목록에 21대 폐기 법안이 '위원회 심사'로 섞여 있고 발의자 문자열 형식이 제각각

- 분류: major · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 이미 2024년에 임기만료로 폐기된 법안이 지금 심사 중인 것처럼 보인다. 대수·날짜 표시가 없어 사용자는 현재 국회 법안과 구분할 수 없다. '임호선의원등15인'과 '이해식의원 등 14인'처럼 같은 정보가 다르게 보인다.
- 근거: PRC_Z2Z6I0I7G0H8F1E3E0A9A3Y0A9Y8Y1 상세 similar_bills에 PRC_S2D1U0K9D1G0T1S1X0K2H5S3M3K5N0(전주혜의원 등 20인, billStage='위원회 심사') 포함. 이 법안 상세: propose_date=2021-09-24, bill_result='임기만료폐기'. 같은 목록에 '임호선의원등15인', '정경희의원등53인' 원문 문자열 노출. AnotherBill.tsx:46-48 billStage·billProposers 그대로 출력. SimilarBill.java from()은 대표발의자의 현재 소속 정당을 사용.
- 수정안: SimilarBill에 assembly_number·propose_date·bill_result를 추가하고 화면에 '21대 · 2021.09 · 임기만료폐기'처럼 표시한다. 기본 목록은 현재 대수만, 이전 대수는 접어서 둔다. 발의자 문자열은 '{대표발의자} 의원 등 N인' 형식으로 서버에서 정규화한다.
- 검증 메모: PRC_Z2Z6... similar_bills에 PRC_S2D1...(전주혜의원 등 20인, billStage '위원회 심사')이 있다. 이 법안은 2021-09-24 발의, 임기만료폐기이다. 같은 목록에 '임호선의원등15인', '정경희의원등53인'과 '백혜련의원 등 11인' 형식이 섞여 있다. SimilarBill.java에 대수, 발의일, 결과 필드가 없다. from()은 congressman.getParty()(현재 소속)를 쓴다. 참고로 similar_bills의 키는 billId, billStage 같은 camelCase이다. 다른 필드는 snake_case여서 응답 규약이 일관되지 않는다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/common/dto/SimilarBill.java`, `services/web/app/bill/[id]/components/AnotherBill/AnotherBill.tsx`

### DETAIL-09 요약 본문의 제목 강조·형광펜·글머리표를 발의 의원 정당색으로 칠함

- 분류: major · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 민주당 법안은 파란 강조, 국민의힘 법안은 빨간 강조로 요약 전체가 칠해진다. 같은 서비스에서 법안마다 정당 색으로 본문 분위기가 달라져 중립성이 흔들려 보인다.
- 근거: Bill.tsx:103-110 --lawdigest-summary-accent = getPartyAccentColor(partyName). 운영 HTML: style="--lawdigest-summary-accent:#152484;..." role="button". globals.css:147-170(제목 배경), :116-145(mark), :297-310(글머리표), :246(용어 밑줄)에 적용. DESIGN.md 'The Party Color Is Data Rule': 배경 장식·감정적 강조에 사용 금지. 색상표도 renderBillSummaryMarkdown.ts:29-43에 별도 정의되어 constants/party/party.ts PARTY_COLOR(단일 기준)와 중복.
- 수정안: 요약 강조색을 정당과 무관한 중립 토큰(primary-ink 계열 또는 primary-soft-blue)으로 고정한다. 정당색은 발의자 카드 테두리·로고 링에만 쓴다. renderBillSummaryMarkdown.ts의 PARTY_ACCENT_COLORS를 삭제한다.
- 검증 메모: 운영 HTML(PRC_Z2Z6...)에 '<div style="--lawdigest-summary-accent:#152484;..." role="button" tabindex="0" aria-label="법안 요약 더 보기">'가 있다. Bill.tsx:103-110은 getPartyAccentColor(partyName)를 쓴다. renderBillSummaryMarkdown.ts:29-43은 별도 정당 색상표를 정의한다. globals.css:125-225가 이 변수로 mark, 제목 배경, 글머리표를 칠한다. DESIGN.md:165 'The Party Color Is Data Rule'은 배경 장식과 감정적 강조에 정당색 사용을 금지한다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Bill/BillList/Bill/renderBillSummaryMarkdown.ts`, `services/web/styles/globals.css`

### DETAIL-10 상세 요약 전체가 aria-label '법안 요약 더 보기'인 버튼으로 감싸져 스크린리더가 본문을 읽지 못함

- 분류: major · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 스크린리더 사용자는 요약 본문 대신 '법안 요약 더 보기, 버튼'만 듣는다. 버튼 역할은 하위 내용을 표현 요소로 취급하므로 제목·목록·용어 버튼 구조가 사라진다. 눌러도 상세에서는 아무 변화가 없다.
- 근거: 운영 HTML(PRC_Z2Z6...): <div ... role="button" tabindex="0" aria-label="법안 요약 더 보기">가 요약 전체를 감쌈. SafeBillSummaryHtml.tsx:210-219, Bill.tsx:320-327(detail에서도 onClick 토글 전달). renderBillSummaryMarkdown.ts:82-85 detail이면 클래스 변화 없음. 용어 버튼(SafeBillSummaryHtml.tsx:191-205)이 버튼 안에 중첩.
- 수정안: detail일 때는 role·tabIndex·aria-label·onClick을 주지 않는 일반 article로 렌더링한다. 피드 접기/펼치기는 본문 밖의 별도 button(aria-expanded)으로만 처리한다.
- 검증 메모: 운영 HTML에서 요약 전체를 role="button" aria-label="법안 요약 더 보기" div가 감싼다. SafeBillSummaryHtml.tsx:210-219가 role, tabIndex, aria-label을 조건 없이 단다. Bill.tsx:320-327은 detail에서도 onClickToggleMore를 전달한다. renderBillSummaryMarkdown.ts getSummaryVisibilityClassNames는 detail이면 클래스 변화가 없다. 용어 button(SafeBillSummaryHtml.tsx:192-205)이 role=button 요소 안에 중첩된다.
- 파일: `services/web/components/Bill/BillList/Bill/SafeBillSummaryHtml.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### DETAIL-11 상세로 이동할 때마다 전체 화면 로고 스플래시와 'AI 기반 입법정보 제공 플랫폼' 문구가 뜸

- 분류: major · perf · 작업량 S · 검증 confirmed
- 사용자 영향: 피드에서 법안을 누르면 헤더까지 바뀌는 로고·스피너 화면이 잠깐 나온 뒤 상세가 뜬다. 화면이 두 번 바뀌어 느리게 느껴지고, 뒤로가기 헤더가 사라졌다가 다시 나타난다.
- 근거: app/bill/[id]에 loading.tsx 없음 → app/loading.tsx가 적용. app/loading.tsx:8 Layout(logo notification)으로 헤더 교체, :10-17 로고 이미지(alt '500 에러 이미지') + 'AI 기반 입법정보 제공 플랫폼' + Spinner. 운영 상세 HTML 본문 앞부분에 'AI 기반 입법정보 제공 플랫폼'과 alt '500 에러 이미지' 이미지가 포함됨.
- 수정안: app/bill/[id]/loading.tsx를 추가해 상세 레이아웃과 같은 골격(제목 2줄, 요약 블록, 발의자 카드 자리)을 보여 준다. 공통 loading의 홍보 문구와 잘못된 alt를 제거한다.
- 검증 메모: app/bill/[id]에 loading.tsx가 없다. 루트 app/loading.tsx가 적용된다. app/loading.tsx:8은 Layout(logo notification)으로 헤더를 바꾼다. :14는 alt '500 에러 이미지', :17은 'AI 기반 입법정보 제공 플랫폼'이다. 운영 상세 HTML에 이 문구가 1회 있고 aria-label="Loading" 스피너가 있다.
- 파일: `services/web/app/loading.tsx`, `services/web/app/bill/[id]/layout.tsx`

### DETAIL-13 단계별 날짜·소관위원회·의안번호·데이터 기준일이 없어 정보의 최신성을 판단할 수 없음

- 분류: major · trust · 백엔드 · 운영 데이터 작업 · 작업량 L · 검증 confirmed
- 사용자 영향: 사용자는 '정부이송'이 언제 일어났는지, 어느 위원회에서 심사 중인지 알 수 없다. 파이프라인이 2026-07 이후 멈춰 실제로는 공포된 법안도 '정부이송'으로 남아 있을 수 있으나 화면은 아무 경고 없이 현재 상태처럼 보여 준다.
- 근거: ProgressStage.tsx:12-31 단계명만 출력(날짜 없음). Bill.java:109 billTimelineList, :34 billNumber, :96 billPdfUrl 존재하나 BillInfoDto(필드: bill_id … category)에 미포함. API 응답 committee는 PRC_Z2Z6...에서 null, PRC_O2N6...에서 '기후에너지환경노동위원회'지만 화면 어디에도 출력하지 않음. 오늘 2026-11-02, 최신 발의일 2026-07-09.
- 수정안: API에 stage별 일자(BillTimeline), bill_number, committee, 마지막 갱신 시각을 추가한다. 진행 단계 각 행 오른쪽에 날짜를, 제목 메타 줄에 의안번호·소관위를 표시한다. 마지막 갱신이 일정 기간 넘으면 단계 영역에 갱신 일자를 함께 보인다.
- 검증 메모: BillInfoDto.java:21-34 필드는 bill_id부터 category까지이다. bill_number, timeline, pdf URL이 없다. Bill.java:34 billNumber, :96 billPdfUrl, :109 billTimelineList는 존재한다. API committee는 PRC_O2N6...에서 '기후에너지환경노동위원회'이다. 그러나 Bill.tsx는 committee를 위원장안 판별(getChairmanProposerInfo)에만 쓰고 화면에 출력하지 않는다. ProgressStage.tsx:12-31은 단계명만 출력한다. PRC_K2J4...의 committee는 '-'로, 데이터 품질 문제도 있다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/common/dto/BillInfoDto.java`, `services/web/app/bill/[id]/components/ProgressStage/ProgressStage.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### DETAIL-14 보조 텍스트·미래 단계·단계 번호의 명도 대비가 WCAG AA에 크게 못 미침

- 분류: major · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 아직 도달하지 않은 단계 이름은 흰 배경 위 거의 보이지 않는다. 법률명·날짜·'등 14인'·단계 칩 같은 보조 정보도 야외나 저시력 환경에서 읽기 어렵다.
- 근거: tailwind.config.js:44-50 gray-1 #E0E0E0, gray-2 #999999. ProgressStage.tsx:15 미래 단계 text-gray-1(대비 약 1.3:1), :22 흰 숫자 on bg-gray-1(약 1.3:1). Bill.tsx:300 bill_name text-gray-2(약 2.8:1, 14px), :294 날짜, :238 'N인' text-xs text-gray-2. GPTSummary.tsx:5 opacity-30 12px. AnotherBill.tsx:42 단계 칩 text-gray-2.
- 수정안: 보조 텍스트는 text-secondary(#555, 약 7.5:1)로 올린다. 미래 단계는 색이 아니라 아이콘 형태(빈 원)와 굵기로 구분하고 텍스트는 4.5:1 이상을 유지한다. 출처 표기의 opacity를 제거한다.
- 검증 메모: tailwind.config.js:46-49에서 gray-1은 #E0E0E0, gray-2는 #999999이다. 흰 배경 대비를 계산하면 #E0E0E0은 1.32:1, #999999는 2.85:1이다. ProgressStage.tsx:15는 미래 단계에 text-gray-1을 쓴다. :22는 흰 숫자를 bg-gray-1 위에 둔다. Bill.tsx:294(날짜), :300(bill_name), :238('N인')은 text-gray-2이다. GPTSummary.tsx:5는 opacity-30이다. AnotherBill.tsx:42 칩은 text-gray-2이다.
- 파일: `services/web/app/bill/[id]/components/ProgressStage/ProgressStage.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Bill/GPTSummary/GPTSummary.tsx`, `services/web/app/bill/[id]/components/AnotherBill/AnotherBill.tsx`

### DETAIL-12 법률용어 툴팁 기능이 운영 데이터에 한 건도 없어 사용자에게 보이지 않음

- 분류: minor · data · 운영 데이터 작업 · 작업량 M · 검증 adjusted
- 사용자 영향: 어려운 법률 용어 설명이라는 상세 화면의 핵심 기능을 사용자가 한 번도 볼 수 없다.
- 근거: GET /v1/bill/mainfeed 최근 100건 + page 10·30·60·120·250 표본 100건, 총 200건의 gpt_summary 중 '{{용어:정의}}' 포함 0건(<mark>는 100%). 프런트 파서는 SafeBillSummaryHtml.tsx:29-30에 구현됨. 주입 로직은 services/ai/src/lawdigest_ai/processor/agentic_bill_report.py:1459, 1489에 있으나 운영 데이터에 반영 안 됨.
- 수정안: 기존 요약에 후처리 함수만 적용하는 백필로는 툴팁이 생기지 않는다. 기존 요약에는 LLM이 낸 tooltip_decisions가 없기 때문이다. 정지된 파이프라인을 먼저 복구한다. 기존 법안은 툴팁 판단 턴만 다시 실행하는 LLM 배치(후보 용어 추출, 판단, 적용 순서)로 재생성한다. 표본으로 렌더링을 확인한다.
- 검증 메모: mainfeed page 0, 5, 20, 80의 200건을 조회했다. gpt_summary에 '{{'가 0건, <mark>가 184건이다. 사실관계는 맞다. 사용자에게 보이지 않는 미출시 기능이라 화면 결함으로는 major에 미치지 않는다. agentic_bill_report.py에서 _parse_structured_report_output(:1430)이 strip을 먼저 하고, _apply_structured_report_tooltips(:2217, :2392)가 그 뒤에 툴팁을 넣는다. 현재 코드는 툴팁을 저장 본문에 남긴다. 툴팁 통합 커밋 7c1653f는 2026-07-09이다. 이 날짜는 마지막 적재일과 같다. 운영 요약 대부분은 기능 이전에 생성된 것으로 보인다. 툴팁 결정(tooltips)은 LLM 구조화 출력에서 나온다. _apply_legal_term_tooltip_decisions만 기존 요약에 돌려서는 넣을 결정이 없다.
- 파일: `services/ai/src/lawdigest_ai/processor/agentic_bill_report.py`, `services/web/components/Bill/BillList/Bill/SafeBillSummaryHtml.tsx`

### DETAIL-15 공유 미리보기가 모든 법안에서 같은 사이트 로고 이미지와 틀에 맞춘 설명 문장을 씀

- 분류: minor · seo · 작업량 M · 검증 adjusted
- 사용자 영향: 카카오톡·SNS로 공유하면 어떤 법안이든 같은 로고 이미지와 '2026-07-09 발의, 현재 접수 단계, '...' 관련 발의안' 문장이 보인다. 받는 사람은 법안 내용을 미리 알 수 없다.
- 근거: curl https://lawdigest.kr/bill/PRC_Z2Z6... → og:image=https://www.lawdigest.kr/images/opengraph-image.png, og:description='2026-07-09 발의, 현재 접수 단계, '선거관리위원회법 일부개정법률안' 관련 발의안', og:type=website. page.tsx:19-23, getMetadata.ts:36-50. JSON-LD 없음. 추가로 UA 'kakaotalk-scrap/1.0'로 요청 시 og:title 위치 54198 > </head> 2702(메타데이터가 body로 스트리밍). next 15.5 HTML_LIMITED_BOT_UA_RE에 kakao 항목 없음. 실제 카카오 스크래퍼 UA 문자열은 확인하지 못함.
- 수정안: next.config.js htmlLimitedBots에 kakaotalk-scrap을 추가하는 항목은 뺀다. Kakao 스크래퍼 UA에 facebookexternalhit가 포함되어 이미 head에 메타데이터를 받는다. 법안별 description(쉬운 요약 첫 항목), 법안별 OG 이미지, og:type article만 남긴다.
- 검증 메모: 운영 HTML의 og:image는 공통 opengraph-image.png, og:type은 website이다. og:description은 '2026-01-26 발의, 현재 정부이송 단계, ...' 틀 문장이다(page.tsx:19-23). JSON-LD가 없다. og:title은 법안 제목이라 받는 사람은 어떤 법안인지 알 수 있다. 영향은 major보다 작다. 카카오 부분은 반박한다. Kakao 공식 문서(devtalk.kakao.com/t/scrap/33984)의 실제 UA는 'facebookexternalhit/1.1; kakaotalk-scrap/1.0'이다. next 15.5 HTML_LIMITED_BOT_UA_RE에 facebookexternalhit가 있다. UA 'facebookexternalhit/1.1' 요청에서 og:title 위치는 2889, </head>는 4768로 head 안에 있었다.
- 파일: `services/web/app/bill/[id]/page.tsx`, `services/web/utils/getMetadata.ts`, `services/web/next.config.js`

### DETAIL-16 공유 링크로 바로 들어오면 상단 뒤로가기 버튼이 동작하지 않거나 사이트를 벗어남

- 분류: minor · ux · 작업량 S · 검증 adjusted
- 사용자 영향: 카카오톡 등에서 링크를 열어 상세에 들어온 사용자가 왼쪽 화살표를 누르면 아무 일도 없거나 이전 앱으로 나간다. 서비스의 다른 화면으로 이어지지 않는다.
- 근거: GoBackButton.tsx:11-13 router.back()만 호출(히스토리 길이·리퍼러 확인 없음). layout.tsx:11 goBack, SubHeader.tsx:7에서 사용. not-found.tsx:25, error.tsx:31-34 '이전 페이지'도 동일.
- 수정안: window.history.length가 1이거나 document.referrer가 다른 출처이면 '/'(피드)로 이동하도록 GoBackButton에 대체 경로를 둔다. 버튼에 aria-label '뒤로 가기'를 단다.
- 검증 메모: GoBackButton.tsx:11-13은 router.back()만 호출한다. 히스토리가 1개인 새 탭에서는 아무 동작도 하지 않는다. '사이트를 벗어난다'는 주장은 확인하지 못했다. 상세 레이아웃은 Layout nav를 쓰고 루트에 하단 Nav(app/layout.tsx:95)가 있다. 다른 화면으로 이동할 수단이 남아 있으므로 minor로 낮춘다. 버튼에 aria-label이 없다(GoBackButton.tsx:16).
- 파일: `services/web/components/common/Button/GoBackButton.tsx`

### DETAIL-17 다크 모드에서 표결 차트 글자와 '무소속' 표식이 검은색으로 남아 보이지 않음 (코드 근거)

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 다크 모드 사용자는 표결 카드의 결과명·찬성 수와 무소속 의원 묶음 표식을 읽을 수 없다.
- 근거: HalfDonutChart.tsx:339-357 <text>에 fill 지정 없음(SVG 기본 fill 검정), Tailwind text-lg는 색을 바꾸지 않음. :301 배경 호 #e6e6e6 고정. ProposerList.tsx:155-156 '무소속' text-black, 배경 없음. VoteResultBoard.tsx:31 '무' text-black. IconKebab.tsx 색 고정(#999/#E0E0E0). 브라우저 패널 사용 금지로 화면은 확인하지 못함.
- 수정안: SVG 텍스트에 className 'fill-current'를 주고 부모에 text 색을 지정한다. 배경 호·점선·아이콘 색을 CSS 변수로 바꿔 dark 값을 정의한다. 무소속 표식에 bg-white dark:bg-dark-l과 대비색 텍스트를 쓴다.
- 검증 메모: 코드로만 확인했고 다크 모드 화면은 확인하지 못했다. HalfDonutChart.tsx:339-357 <text>에 fill이 없다. text-lg와 font-semibold 클래스는 SVG fill을 바꾸지 않는다. :301 배경 호는 #e6e6e6으로 고정되어 있다. ProposerList.tsx:156 '무소속'과 VoteResultBoard.tsx:31 '무'는 text-black이다. 감싸는 Link에는 배경색이 없다. globals.css:64 .무소속은 border-color만 지정한다. Kebab.tsx는 #999999/#E0E0E0으로 고정되어 있다. next-themes는 attribute="class"이고 Tailwind darkMode는 'class'이다. 토글로 다크 모드에 들어가면 위 요소가 적용된다.
- 파일: `services/web/components/common/Chart/HalfDonutChart.tsx`, `services/web/app/bill/[id]/components/ProposerList/ProposerList.tsx`, `services/web/app/bill/[id]/components/ProcessResult/VoteResultBoard.tsx`, `services/web/public/svgs/common/Kebab.tsx`

### DETAIL-18 모바일 하단 플로팅 내비게이션이 상세 마지막 콘텐츠를 가림 (코드 근거)

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 모바일에서 끝까지 스크롤해도 마지막 '다른 개정안' 카드 하단이 내비게이션 아래에 남아 누르기 어렵다.
- 근거: styles/mobile-floating-nav.css:14 bottom: calc(1rem + env(safe-area-inset-bottom)). app/layout.tsx:86-95, page.tsx:38-42, BillDetail.tsx:64에 하단 여백 없음(md:mb-10만 존재). 저장소 전체에서 내비게이션 높이만큼의 padding-bottom 정의 없음. 운영 모바일 스크린샷에서 본문이 내비게이션 뒤로 지나감.
- 수정안: 루트 main에 모바일 전용 padding-bottom: calc(내비 높이 + 1rem + env(safe-area-inset-bottom))을 한 곳에서 정의한다.
- 검증 메모: 코드로만 확인했다. 제시된 스크린샷은 피드와 탐색 화면이라 상세 근거가 되지 않는다. mobile-floating-nav.css:10-14는 position fixed, bottom calc(1rem + safe-area)이다. :563 이후 md 이상에서만 숨긴다. app/layout.tsx:86-95, Layout.tsx, BillDetail.tsx:64(px-4 pt-[34px])에 하단 여백이 없다. 웹 전체에 내비게이션 높이만큼의 padding-bottom 정의가 없다.
- 파일: `services/web/app/layout.tsx`, `services/web/styles/mobile-floating-nav.css`

### DETAIL-19 발의자 수를 공동발의자 배열 길이로 계산해 공식 인원과 다르게 표시

- 분류: minor · data · 운영 데이터 작업 · 작업량 S · 검증 confirmed
- 사용자 영향: 국회 기록은 '전주혜의원 등 20인'인데 화면은 '전주혜 의원 등 18인'으로 보인다. 원문과 숫자가 달라 신뢰가 떨어진다. 대표발의자가 명단에 포함된 법안과 빠진 법안이 섞여 있다.
- 근거: PRC_S2D1U0K9D1G0T1S1X0K2H5S3M3K5N0: proposers='전주혜의원 등 20인', public_proposer_dto_list 18명(전주혜 미포함) → HTML '전주혜 의원 등 18인'. PRC_Z2Z6...은 public 14명에 대표발의자 이해식 포함. Bill.tsx:239-243, ProposerList.tsx:143 `등 ${publicProposerLength}인`. 명단에서 대표발의자를 구분하는 표시 없음(ProposerList.tsx:168-183).
- 수정안: 인원 수는 proposers 문자열의 'N인'을 우선 사용하고 배열 길이와 다르면 데이터 점검 대상으로 로깅한다. 명단에서 대표발의자를 첫 자리에 굵게 둔다. 파이프라인에서 공동발의자 누락분을 재수집한다.
- 검증 메모: PRC_S2D1... API의 proposers는 '전주혜의원 등 20인'이다. public_proposer_dto_list는 18명이고 대표발의자 전주혜가 없다. PRC_Z2Z6...은 14명이고 이해식이 포함된다. PRC_O2N6...은 12명이고 김형동이 포함된다. Bill.tsx:240, 243과 ProposerList.tsx:143은 배열 길이로 'N인'을 만든다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/app/bill/[id]/components/ProposerList/ProposerList.tsx`

### DETAIL-20 처리 결과·유사 법안 문구가 상황에 맞지 않고 말투가 섞임

- 분류: minor · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 접수된 지 얼마 안 된 법안에 '투표 정보가 없습니다.'가 떠 데이터가 빠진 것처럼 보인다. 새로 만드는 법(제정안)에도 '다른 개정안 보기'가 붙는다. 같은 화면에서 '-습니다'와 '-어요'가 섞인다.
- 근거: ProcessResult.tsx:86-88 '투표 정보가 없습니다.'(접수·위원회 심사 법안 모두). AnotherBillList.tsx:9 '{bill_name}의 다른 개정안 보기' → PRC_J2H5... '전남 에너지·해양 특화도시 조성에 관한 특별법안의 다른 개정안 보기', :14 '...존재하지 않습니다.'. ProcessResult.tsx:36 '반영되었어요!', :49 마침표 없음. Bill.tsx:408 '꼭 원문을 확인해주세요 !'(느낌표 앞 공백).
- 수정안: 미표결 법안은 처리 결과 영역을 숨기거나 '본회의 표결 전' 상태로 바꾼다. 제목은 '같은 법률의 다른 법안'처럼 제정·개정 모두에 맞는 표현으로 바꾸고, 0건이면 섹션 자체를 숨긴다. 화면 문구 말투를 해요체로 통일하고 문장부호를 정리한다.
- 검증 메모: ProcessResult.tsx:84-89는 bill_result가 없는 모든 법안(접수, 위원회 심사 포함)에 '투표 정보가 없습니다.'를 출력한다. AnotherBillList.tsx:9는 '{bill_name}의 다른 개정안 보기'이다. PRC_J2H5...의 bill_name은 제정안('...특별법안')이고 similar_bills는 0건이다. 이 경우 :14 '...존재하지 않습니다.'가 나온다. ProcessResult.tsx:36은 '반영되었어요!', :49는 마침표가 없다. Bill.tsx:408은 '꼭 원문을 확인해주세요 !'이다.
- 파일: `services/web/app/bill/[id]/components/ProcessResult/ProcessResult.tsx`, `services/web/app/bill/[id]/components/AnotherBill/AnotherBillList.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### DETAIL-21 섹션 이름 레이블과 같은 정보의 반복 문구가 많음

- 분류: minor · copy · 작업량 S · 검증 adjusted
- 사용자 영향: '의안 자세히 보기'가 헤더와 부제목에 두 번 나온다. 대표발의자 이름이 카드 제목·카드 부제목·명단 머리말에 세 번 반복된다. 제목 바로 아래에 제목 일부인 법률명이 다시 나온다. 읽을 내용보다 안내 문구가 많아진다.
- 근거: layout.tsx:11 title '의안 자세히 보기', page.tsx:39 SubHeader 같은 문구. HTML: '이해식 의원 / 이해식 의원 등 14인 / 발의자 명단 / 이해식 등 14인'(Bill.tsx:226-243, ProposerList.tsx:137-144, BillDetail.tsx:32). Bill.tsx:298-300 title과 bill_name 연속. ProgressStage.tsx:26 'STEP 0N' 영문 레이블. Bill.tsx:237 툴팁 '발의자 명단 보기'와 Popover는 상세에서 바로 아래 명단을 중복. BillDetail.tsx:65 title 없는 SectionContainer가 빈 <h3> 출력(SectionContainer.tsx:9). '의안'과 '법안' 용어 혼용.
- 수정안: '의안 자세히 보기' 중복 항목은 지운다. 헤더 문구 제거는 섹션 이름 레이블 원칙에 따라 유지한다. md~lg 구간에서 뒤로가기 버튼이 사라지는 문제를 함께 고친다. Header의 goBack은 lg:hidden, SubHeader는 lg:flex여서 이 구간에 뒤로가기가 하나도 없다.
- 검증 메모: '의안 자세히 보기가 두 번 나온다'는 주장은 틀렸다. Header.tsx:93-95 제목은 md:hidden이다. SubHeader.tsx:5는 hidden lg:flex이다. 두 문구는 같은 화면 폭에서 동시에 보이지 않는다. HTML에 2회 있는 것은 반응형 대체본이기 때문이다. md~lg 구간에서는 제목과 뒤로가기가 모두 사라진다. 나머지는 확인했다. 대표발의자 이름은 Bill.tsx:226-243의 카드 제목과 부제목, ProposerList.tsx:137-144 머리말에 반복된다. Bill.tsx:298-300에서 title 바로 아래 bill_name이 반복된다. ProgressStage.tsx:26에 'STEP 0N'이 있다. BillDetail.tsx:65는 title 없이 SectionContainer를 호출한다. 이때 SectionContainer.tsx:9가 빈 <h3>를 출력한다. '의안'과 '법안'이 혼용된다.
- 파일: `services/web/app/bill/[id]/layout.tsx`, `services/web/app/bill/[id]/page.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/app/bill/[id]/components/ProgressStage/ProgressStage.tsx`, `services/web/app/bill/[id]/components/SectionContainer/SectionContainer.tsx`

### DETAIL-22 아이콘 버튼 이름 없음, 제목 계층 혼란, 단계 상태가 보조기기에 전달되지 않음

- 분류: minor · a11y · 작업량 M · 검증 confirmed
- 사용자 영향: 스크린리더는 스크랩·링크 복사·뒤로가기를 이름 없는 '버튼'으로 읽는다. 페이지에 h1이 없고 요약 소제목이 페이지 제목과 같은 h2라 구조를 파악하기 어렵다. 진행 단계는 현재 단계가 어디인지 소리로 알 수 없다.
- 근거: 운영 HTML 버튼 20개 중 aria-label 있는 것은 3개('clear input','검색 닫기','검색'). Bill.tsx:379(스크랩), :391(링크 복사, 피드용 :357은 영문 'Export Button'), GoBackButton.tsx:16. 제목 태그 순서: h2(제목)·h3(법률명)·요약 ## → h2(SafeBillSummaryHtml.tsx:125), 수치에 h4/h5(Bill.tsx:294, 382-387). ProgressStage.tsx:12-31 aria-current 없음, 미래 단계만 숫자 표시. ProposerList.tsx:174-178 두 글자 이름을 글자마다 <p>로 분리. AnotherBill.tsx:73-86 Avatar onClick만 있고 키보드 접근 불가.
- 수정안: 아이콘 버튼에 한국어 aria-label과 aria-pressed를 단다. 법안 제목을 h1로, 요약 ##를 h2, ###를 h3로 두고 수치는 dl/span으로 바꾼다. 진행 단계를 ol로 만들고 현재 항목에 aria-current="step"을 단다. 두 글자 이름 정렬은 CSS(letter-spacing 또는 grid)로 처리한다. 정당 아바타는 Link로 감싼다.
- 검증 메모: 운영 HTML(PRC_Z2Z6...)의 <button>은 20개이다. aria-label은 'clear input', '검색 닫기', '검색', 'Loading', 요약 div에만 있다. Bill.tsx:379(스크랩), :391(링크 복사), GoBackButton.tsx:16에 이름이 없다. 제목 태그에 h1이 없다. 첫 제목은 h2이다. 요약 ##도 h2이다(SafeBillSummaryHtml.tsx:125). ProgressStage.tsx:12-31에 ol과 aria-current가 없다. ProposerList.tsx:174-178은 두 글자 이름을 글자마다 <p>로 나눈다. AnotherBill.tsx:73-86 Avatar는 onClick만 있다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Bill/BillList/Bill/SafeBillSummaryHtml.tsx`, `services/web/app/bill/[id]/components/ProgressStage/ProgressStage.tsx`, `services/web/app/bill/[id]/components/ProposerList/ProposerList.tsx`, `services/web/app/bill/[id]/components/AnotherBill/AnotherBill.tsx`, `services/web/components/common/Button/GoBackButton.tsx`

### DETAIL-23 링크 복사가 실패해도 성공 안내가 뜨고, 모바일 공유 시트와 정규 주소가 맞지 않음

- 분류: minor · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 클립보드 권한이 없는 환경(일부 인앱 브라우저)에서도 '링크를 복사했습니다.'가 뜨지만 실제로는 복사되지 않는다. 모바일에서 카카오톡 공유 시트를 바로 열 수 없다. 복사 주소(lawdigest.kr)와 canonical(www.lawdigest.kr)이 다르다.
- 근거: handleCopyClipBoard.ts:2-6 오류를 console.log로만 처리. Bill.tsx:147-150 결과와 무관하게 SUCCESS 스낵바. 운영 번들 js/9001-7511a40fa916ac1d.js 내 도메인 'https://lawdigest.kr'. 운영 HTML <link rel="canonical" href="https://www.lawdigest.kr/bill/...">, curl -I https://www.lawdigest.kr/bill/... → 200(리다이렉트 없음).
- 수정안: copyClipBoard가 성공 여부를 반환하게 하고 실패 시 오류 스낵바를 띄운다. navigator.share가 있으면 공유 시트를 먼저 연다. www와 apex 중 하나로 301 리다이렉트하고 siteConfig.url과 NEXT_PUBLIC_DOMAIN을 같은 값으로 맞춘다.
- 검증 메모: handleCopyClipBoard.ts:1-6은 async 함수이다. 오류는 console.log로만 처리한다. Bill.tsx:147-150은 await하지 않고 SUCCESS 스낵바를 띄운다. 운영 번들 9001-7511a40fa916ac1d.js에 '"https://lawdigest.kr","/bill/"'가 있다. 운영 canonical과 og:url은 https://www.lawdigest.kr/bill/...이다. config/site.ts의 url은 'https://www.lawdigest.kr/'이다. curl -I www.lawdigest.kr/bill/...과 lawdigest.kr/ 모두 200이고 리다이렉트가 없다.
- 파일: `services/web/utils/handleCopyClipBoard.ts`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/config/site.ts`

### DETAIL-24 원문 확인 링크가 a 안에 button을 중첩하고 같은 탭에서 외부 사이트로 이동

- 분류: minor · a11y · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: 원문 확인을 누르면 서비스 탭이 국회 사이트로 바뀌어 돌아오기 어렵다. 보조기기는 링크와 버튼을 이중으로 읽는다. 법안 PDF 원문으로 바로 가는 길은 없다.
- 근거: 운영 HTML: <a href="https://likms.assembly.go.kr/bill/billDetail.do?billId=..."><button ...>원문 확인하기</button></a>, target/rel 없음. Bill.tsx:411-419. API bill_link 필드가 있으나 사용하지 않고 URL을 직접 조합. Bill.java:96 billPdfUrl은 API 미노출. curl로 likms 링크 요청 시 400(브라우저 아닌 요청)이라 실제 동작은 확인하지 못함.
- 수정안: HeroUI Button as={Link} 또는 a 단독으로 바꾸고 target="_blank" rel="noopener noreferrer"와 외부 링크 아이콘을 둔다. URL은 API bill_link를 사용한다. billPdfUrl을 API에 추가해 PDF 링크를 보조 액션으로 둔다.
- 검증 메모: 운영 HTML에 '<a href="https://likms.assembly.go.kr/bill/billDetail.do?billId=PRC_Z2Z6...">'가 있다. target과 rel이 없다. 그 안에 button이 있다(Bill.tsx:411-419). URL은 bill_id로 직접 조합한다. API 응답의 bill_link 필드는 쓰지 않는다. billPdfUrl은 BillInfoDto에 없다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`

### DETAIL-25 조회수를 서버 렌더링마다 증가시켜 크롤러·미리보기 요청까지 집계

- 분류: minor · data · 작업량 S · 검증 confirmed
- 사용자 영향: 검색 로봇, 메신저 미리보기, 새로고침이 모두 조회수로 집계되어 '조회수'와 인기 정렬의 의미가 흐려진다.
- 근거: page.tsx:32-34 서버 컴포넌트에서 usePatchViewCount 호출(PATCH /v1/bill/view_count). 이 감사에서 curl GET만 보냈는데 PRC_Z2Z6... view_count가 API 121 → HTML 122로 증가함(감사 요청 자체가 조회수를 올림). BillService.updateViewCount는 중복 방지 없음.
- 수정안: 조회수 증가는 클라이언트 마운트 후 1회 호출로 옮기고, 봇 UA를 제외하며 세션 단위로 중복을 막는다. 서버 렌더링은 view_count를 읽기만 한다.
- 검증 메모: page.tsx:32-34는 서버 컴포넌트 렌더링마다 PATCH view_count를 호출한다. 이번 검증에서 PRC_Z2Z6... API view_count는 처음 126이었다. 페이지 HTML GET 뒤에는 128이었다. BillService.java:84-90은 중복 방지 없이 +1한다. middleware.ts는 GPTBot과 OAI-SearchBot만 차단한다.
- 파일: `services/web/app/bill/[id]/page.tsx`, `services/web/app/bill/[id]/apis/queries.ts`

### DETAIL-26 요약 출처 표기 'Summarized by GPT-4o'가 실제 사용 모델과 다르고 영문으로 노출

- 분류: minor · trust · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 사용자는 특정 모델이 요약했다고 안내받지만 실제 파이프라인 모델과 다르다. 한국어 화면에 영문 문구와 영문 alt('gpt-logo')가 섞인다.
- 근거: GPTSummary.tsx:6-8 'Summarized by' + gpt.png(alt 'gpt-logo') + 'GPT-4o' 고정. services/ai/src/lawdigest_ai/config.py:29 CODEX_CLI_MODEL 기본 'gpt-5.4-mini', :19 GEMINI_MODEL 'gemini-3-flash-preview', agentic_bill_report.py:25 기본 'gpt-5.4-mini'. 법안별 요약 모델 정보는 API에 없음.
- 수정안: 모델명을 고정 문자열로 쓰지 않는다. 요약 생성 시 모델·생성 시각을 저장해 API로 내려주고 'AI 요약 · 2026.07.10'처럼 한국어로 표기한다. 경고 문구와 한 줄로 합친다.
- 검증 메모: GPTSummary.tsx:6-8은 'Summarized by', alt 'gpt-logo', 'GPT-4o'를 고정 문자열로 쓴다. services/ai 운영 코드에 gpt-4o 참조가 없다. 테스트에만 gpt-4o-mini가 있다. 기본 모델은 config.py:29 CODEX_CLI_MODEL 'gpt-5.4-mini'와 agentic_bill_report.py:25 'gpt-5.4-mini'이다. 운영 환경변수 값은 확인하지 못했다.
- 파일: `services/web/components/Bill/GPTSummary/GPTSummary.tsx`

### DETAIL-27 공동발의 인원 배지와 현재 단계 표시에 경고용 빨간색을 사용

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 정당 로고 위 빨간 숫자 배지가 알림이나 오류처럼 보이고 특정 정당 색으로도 읽힌다. 공포까지 끝난 법안도 마지막 단계가 경고색으로 표시된다.
- 근거: ProposerList.tsx:151 Badge color="danger". public/svgs/common/Pointed.tsx:4-5 fill #E63946(alert-red). DESIGN.md Alert Red: 오류·경고·주의가 필요한 순간에만 사용.
- 수정안: 인원 배지는 중립색(primary-ink 배경, 흰 글자)으로 바꾼다. 현재 단계 표시는 primary-ink 또는 nav-active-blue로 바꾸고, 공포 완료는 체크 아이콘으로 표시한다.
- 검증 메모: ProposerList.tsx:151은 Badge color="danger"이다. public/svgs/common/Pointed.tsx:4-5는 fill #E63946이다. 이 아이콘이 공포 완료 법안의 마지막 단계에도 쓰인다. tailwind theme.alert는 #E63946이다.
- 파일: `services/web/app/bill/[id]/components/ProposerList/ProposerList.tsx`, `services/web/public/svgs/common/Pointed.tsx`

### DETAIL-29 유사 법안 카드의 누를 수 있는 영역과 표식이 일관되지 않음

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 카드를 눌러도 제목 글자를 정확히 누르지 않으면 이동하지 않는다. 카드 오른쪽 정당 로고는 정당 페이지로 이동해 같은 카드에 목적지가 둘이다. 위원장안·정부안은 로고 자리가 비어 있다. 모바일에서는 목록 오른쪽에 세로선이 생긴다.
- 근거: AnotherBill.tsx:37-39 제목 p만 Link. :52-89 로고 클릭 시 /party/{id}. SimilarBill.java from()은 대표발의자 없는 위원장안·정부안에서 party=[] → AvatarGroup 빈 영역(AnotherBill.tsx:71-88). BillDetail.tsx:64 border-r-[1px]가 모든 화면 폭에 적용.
- 수정안: 카드 전체를 Link로 만들고 정당 로고는 정보 표식으로만 둔다. party가 비면 위원회·정부 로고를 표시한다. border-r를 md: 이상에만 적용한다.
- 검증 메모: AnotherBill.tsx:37-39에서 제목 p만 Link이다. :52-69 단독 로고와 :81-85 Avatar는 /party/{id}로 이동한다. SimilarBill.java from()은 대표발의자가 없으면 party=[]를 만든다. 그러면 isRepresentativeSolo=false가 되어 빈 AvatarGroup이 렌더링된다(AnotherBill.tsx:71-88). BillDetail.tsx:64 border-r-[1px]에는 반응형 접두사가 없다.
- 파일: `services/web/app/bill/[id]/components/AnotherBill/AnotherBill.tsx`, `services/web/app/bill/[id]/components/BillDetail/BillDetail.tsx`

### DETAIL-30 법률용어 툴팁에 포커스 표시가 없고 스크롤·탭·Escape 처리가 없음

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 키보드 사용자는 어느 용어에 포커스가 있는지 볼 수 없다. 모바일에서 툴팁을 연 채 스크롤하면 툴팁이 원래 위치에 고정되어 본문과 떨어진다. 같은 용어를 다시 탭해도 닫히지 않는다. 현재는 데이터가 없어 노출되지 않지만 DETAIL-12 백필 후 바로 드러난다.
- 근거: globals.css:250 .lawdigest-term-tooltip { outline: none }. globals.css:261-264 position: fixed + 표시 시점 좌표(SafeBillSummaryHtml.tsx:164-176), scroll/resize 리스너 없음. SafeBillSummaryHtml.tsx:198 onClick은 stopPropagation만, Escape 처리 없음.
- 수정안: focus-visible 링을 정의한다. 클릭(탭)으로 열고 닫는 토글 상태를 두고, scroll·resize·Escape·바깥 탭에서 닫는다. aria-describedby로 툴팁과 용어를 연결한다.
- 검증 메모: 코드로만 확인했다. 운영 데이터에 툴팁이 없어 화면에는 노출되지 않는다. globals.css:250 .lawdigest-term-tooltip은 outline: none이다. 대체 focus-visible 규칙이 없다. :261-264는 position fixed이다. 좌표는 표시 시점 getBoundingClientRect로만 계산한다(SafeBillSummaryHtml.tsx:164-176). scroll, resize, Escape 처리가 없다. :198 onClick은 stopPropagation만 해서 다시 탭해도 닫히지 않는다.
- 파일: `services/web/components/Bill/BillList/Bill/SafeBillSummaryHtml.tsx`, `services/web/styles/globals.css`

### DETAIL-31 섹션 제목 크기가 법안 제목과 거의 같아 정보 위계가 약함

- 분류: polish · visual · 작업량 S · 검증 confirmed
- 사용자 영향: '발의자 명단' 같은 섹션 제목(24px)이 법안 제목(26px)과 비슷해 무엇이 이 페이지의 주제인지 한눈에 들어오지 않는다.
- 근거: SectionContainer.tsx:9 text-2xl font-semibold, AnotherBillList.tsx:8 text-2xl. Bill.tsx:298 제목 text-[26px] font-semibold. DESIGN.md typography: headline 26px/700(법안 상세 제목), title 20px/600(섹션 제목).
- 수정안: 섹션 제목을 20px/600, 법안 제목을 26px/700으로 맞춰 DESIGN.md 위계를 따른다.
- 검증 메모: SectionContainer.tsx:9와 AnotherBillList.tsx:8은 text-2xl(24px) font-semibold이다. Bill.tsx:298 제목은 text-[26px] font-semibold이다. DESIGN.md Hierarchy는 Headline 700/26px(법안 상세 제목), Title 600/20px(섹션 제목)이다.
- 파일: `services/web/app/bill/[id]/components/SectionContainer/SectionContainer.tsx`, `services/web/app/bill/[id]/components/AnotherBill/AnotherBillList.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### DETAIL-32 날짜만 있는 발의일을 UTC 자정으로 해석해 '9시간 전' 같은 부정확한 상대 시간을 만들 수 있고 날짜의 의미 표시가 없음

- 분류: polish · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 오늘 발의된 법안이 '9시간 전'처럼 실제와 다른 시간으로 보일 수 있다. 시계 아이콘 옆 날짜가 발의일인지 갱신일인지 알 수 없다.
- 근거: getTimeRemaining.ts:2 new Date('2026-07-09')는 UTC 자정(KST 09:00)으로 해석, :11 시간 단위 출력. API propose_date는 날짜만('2026-07-09'). Bill.tsx:292-295 IconClock + 날짜만 출력. 서버 렌더링 시각 기준 계산이라 클라이언트와 값이 달라질 수 있음.
- 수정안: 날짜만 있는 값은 일 단위로만 비교(오늘/어제/N일 전/날짜)한다. 메타 줄을 '2026.07.09 발의'처럼 값 자체에 동사를 붙여 표기한다.
- 검증 메모: getTimeRemaining.ts:2는 new Date('2026-07-09')로 계산한다. 날짜만 있는 ISO 문자열은 UTC 자정으로 해석된다. :11은 시간 단위('N시간 전')를 출력한다. API propose_date는 날짜만 있다. Bill.tsx:292-295는 IconClock과 값만 출력한다. 이 값이 발의일이라는 표시가 없다. Bill은 'use client'이지만 SSR된다. 서버와 클라이언트 시각 차이로 값이 달라질 수 있다.
- 파일: `services/web/utils/getTimeRemaining.ts`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### DETAIL-33 개발 흔적과 사용하지 않는 코드가 남아 있음

- 분류: polish · dead-code · 작업량 S · 검증 confirmed
- 사용자 영향: 직접 보이지는 않지만 쓰지 않는 직렬화 데이터가 페이지 크기를 늘리고, 비활성 툴팁 핸들러가 마우스 이벤트마다 상태를 갱신한다.
- 근거: queries.ts:1 'use clinet' 오타. handleCopyClipBoard.ts:5 console.log. Bill.tsx:357 aria-label 'Export Button'. HalfDonutChart.tsx:267 'visible: false, // TODO', :332 TODO 주석, :361-396 도달 불가 툴팁. BillContainer.tsx 미사용(page.tsx:40-42에 같은 마크업 중복). renderBillSummaryMarkdown.ts:89-149 renderBillSummaryMarkdown은 테스트에서만 사용. page.tsx:37 HydrationBoundary + queries.ts:24 invalidateQueries(['/bill/detail'])는 클라이언트 useQuery가 없어 효과 없음.
- 수정안: 위 항목을 삭제하거나 정리한다. 상세 데이터를 클라이언트 캐시로 쓸 계획이 없으면 HydrationBoundary를 제거하고, 쓸 계획이면 useQuery로 소비하게 바꾼다.
- 검증 메모: queries.ts:1에 'use clinet' 오타가 있다. handleCopyClipBoard.ts:5는 console.log이다. Bill.tsx:357은 aria-label 'Export Button'이다. HalfDonutChart.tsx:267에 visible false TODO가 있다. :361-396 툴팁은 도달할 수 없다. BillContainer는 components/index.tsx에서 재수출만 되고 사용처가 없다. renderBillSummaryMarkdown은 테스트에서만 import된다. ['/bill/detail'] 키를 소비하는 useQuery가 없다. 그래서 HydrationBoundary(page.tsx:37)와 invalidateQueries(queries.ts:24)는 효과가 없다.
- 파일: `services/web/app/bill/[id]/apis/queries.ts`, `services/web/utils/handleCopyClipBoard.ts`, `services/web/components/common/Chart/HalfDonutChart.tsx`, `services/web/app/bill/[id]/components/BillContainer/BillContainer.tsx`, `services/web/app/bill/[id]/page.tsx`, `services/web/components/Bill/BillList/Bill/renderBillSummaryMarkdown.ts`

### DETAIL-34 다크 모드 판별을 theme 값으로 해 첫 화면에서 밝은 정당 로고가 먼저 보임

- 분류: polish · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 다크 모드 사용자는 상세 진입 직후 밝은 배경용 정당 로고가 보였다가 바뀌는 깜빡임을 본다.
- 근거: Bill.tsx:96-97, ProposerList.tsx:57-58, AnotherBill.tsx:30-31, VoteResultBoard.tsx:18-19 모두 useTheme().theme === 'dark'. 서버 렌더링 시 theme는 undefined라 항상 wide 로고(getPartyLogoSrc.ts:17). resolvedTheme 미사용.
- 수정안: resolvedTheme으로 바꾸는 수정은 효과가 없다. next-themes 0.2.1에서는 resolvedTheme도 마운트 전에 undefined이다. 로고 두 벌을 렌더링하고 dark: 클래스(또는 <picture>와 CSS)로 표시를 전환하는 방식만 SSR 깜빡임을 없앤다.
- 검증 메모: 코드로만 확인했다. Bill.tsx:96-97, ProposerList.tsx:57-58, AnotherBill.tsx:30-31, VoteResultBoard.tsx:18-19는 useTheme().theme === 'dark'를 쓴다. 서버 렌더링 시점의 theme는 undefined이다. 그래서 밝은 배경용 로고가 먼저 나오고 마운트 뒤 교체된다. NextThemesProvider는 defaultTheme 'light', attribute 'class'이다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/app/bill/[id]/components/ProposerList/ProposerList.tsx`, `services/web/app/bill/[id]/components/AnotherBill/AnotherBill.tsx`, `services/web/app/bill/[id]/components/ProcessResult/VoteResultBoard.tsx`

## 타임라인 (TIMELINE)

### TIMELINE-01 타임라인 최신 날짜가 2026-03-27에 멈춰 있다 (단계 동기화 파이프라인 중단)

- 분류: blocker · data · 운영 데이터 작업 · 작업량 M · 검증 adjusted
- 사용자 영향: 오늘(2026-11-02) 타임라인을 열면 맨 위에 '3.27 금'이 나온다. 피드에는 2026-07-09 발의 법안이 있으므로 사용자는 타임라인이 7개월 넘게 갱신되지 않았다고 판단한다. 최근 국회에서 무슨 일이 있었는지 보여 주는 화면의 목적이 성립하지 않는다.
- 근거: GET https://api.lawdigest.kr/v1/time-line/feed/paging?page=0&size=3 → timeline_response_list[0].date = "2026-03-27". 날짜 목록은 BillTimelineRepository.java:47-49 findTopProposeDates(DISTINCT status_update_date DESC)에서 나온다. BillTimeline 행은 services/data/src/lawdigest_data/connectors/DatabaseManager.py:657-764 update_bill_stage ← core/bill_status_sync.py:128 에서만 쓰인다. 피드 스크린샷과 /bill/detail 응답에는 propose_date 2026-07-09 법안이 있다. 즉 단계 동기화가 법안 수집보다 약 3.5개월 먼저 멈췄다.
- 수정안: 원인 조사 대상에 bill_status_sync.py:128뿐 아니라 WorkFlowManager.update_bills_timeline(WorkFlowManager.py:725-763)과 백엔드 DataService.java:94-111 경로를 포함한다. 세 경로 중 운영에서 실제로 쓰는 경로를 하나로 정하고 그 경로에 마지막 status_update_date 감시를 붙인다.
- 검증 메모: GET /v1/time-line/feed/paging?page=0&size=3의 첫 date는 2026-03-27이다(응답 1.18s). /v1/bill/detail 법안 발의일 2026-07-09와 비교하면 타임라인이 약 3.5개월 먼저 멈췄다. 핵심 주장은 맞다. 근거 중 'BillTimeline 행은 bill_status_sync.py:128에서만 쓰인다'는 틀렸다. WorkFlowManager.py:763 update_bills_timeline도 db.update_bill_stage를 호출한다. 백엔드 DataService.java:110-111도 billTimelineRepository.save로 행을 쓴다.
- 파일: `services/data/src/lawdigest_data/core/bill_status_sync.py`, `services/data/src/lawdigest_data/connectors/DatabaseManager.py`, `services/backend/src/main/java/com/everyones/lawmaking/repository/BillTimelineRepository.java`

### TIMELINE-02 날짜 제목에 연도와 데이터 기준일이 없어 오래된 데이터인지 알 수 없다

- 분류: major · trust · 작업량 S · 검증 confirmed
- 사용자 영향: '3.27 금'만 보이므로 사용자는 2026년 3월인지, 지난해인지, 최근 데이터인지 구분하지 못한다. 데이터가 갱신되지 않았다는 사실도 화면에 드러나지 않는다. PRODUCT.md:43의 최신성 노출 원칙에 어긋난다.
- 근거: services/web/app/timeline/components/ListContainer.tsx:44-49: `{convertDateFormat(date)[0]}.{convertDateFormat(date)[1]}` + 요일만 렌더한다. utils/convertDateFormat.ts:1-13은 [월, 일, 요일]만 반환한다. 운영 HTML(curl https://lawdigest.kr/timeline)의 텍스트는 '3 . 27 금 위원회 심사 …'이다.
- 수정안: 오늘과 연도가 다른 날짜, 또는 일정 기간 이상 지난 날짜에는 연도를 함께 표시한다. TimelineBoard에 가장 최근 status_update_date를 '기준일'로 표시한다. 이 값은 피드 첫 항목 date 또는 별도 API 필드에서 가져온다.
- 검증 메모: ListContainer.tsx:44-49는 convertDateFormat(date)의 [월, 일, 요일]만 렌더한다. utils/convertDateFormat.ts:12는 [month, day, dayOfWeek]만 반환한다. 연도와 데이터 기준일은 화면 어디에도 없다. 최신 날짜가 7개월 전인데 화면은 이 사실을 드러내지 않는다. PRODUCT.md 원칙 4(최신성 노출)와 어긋난다.
- 파일: `services/web/app/timeline/components/ListContainer.tsx`, `services/web/app/timeline/components/TimelineBoard.tsx`, `services/web/utils/convertDateFormat.ts`

### TIMELINE-03 본회의 심사 항목 960건 전부가 '투표 정보가 없습니다'로 표시된다

- 분류: major · data · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 본회의 심사 카드마다 가결·부결 결과와 정당별 찬성표 대신 '투표 정보가 없습니다'만 보인다. 2026-01-29(288건), 2026-02-12(192건)처럼 실제 본회의가 열린 날도 결과가 비어 있다. 법안 상세 화면도 같은 법안을 '본회의 심의' 단계에 머문 상태로 보여 준다.
- 근거: page=0&size=60 응답 집계: plenary_list 960건 모두 bill_result=null, approval_vote_count=null, total_vote_count=null, party_vote_list=[]. GET /v1/bill/detail/PRC_A2A5I0H2I2G5G1F4F1B5B0A8Y9Z6X1 → bill_stage='본회의 심의', bill_result=None, total_vote_count=None. 프론트 분기: app/bill/[id]/components/ProcessResult/ProcessResult.tsx:84-89 default → '투표 정보가 없습니다.'
- 수정안: 본회의 결과·표결 수집 작업(DatabaseManager.py:963-980 BillTimeline bill_result 갱신, VoteRecord/VoteParty 적재)이 운영에서 돌고 있는지 확인하고 백필한다. 결과가 아직 없는 경우에는 '투표 정보가 없습니다' 대신 '의결 결과 집계 전' 상태를 단계 칩으로 보여 준다.
- 검증 메모: page=0&size=60(2026-03-27~2025-12-11) 응답의 plenary_list 960건이 모두 bill_result=None, approval_vote_count=None, total_vote_count=None, party_vote_list=[]이다. 날짜별 건수는 2026-01-29 288건, 2026-02-12 192건이다. 본회의 항목 가운데 bill_stage '공포' 70건, '정부이송' 29건도 bill_result가 null이다. 가결된 법안의 결과가 비어 있다는 뜻이다. /v1/bill/detail/PRC_A2A5I0H2I2G5G1F4F1B5B0A8Y9Z6X1의 값은 bill_stage='본회의 심의', bill_result=None이다. ProcessResult.tsx:84-89 default 분기가 '투표 정보가 없습니다.'를 출력한다.
- 파일: `services/data/src/lawdigest_data/connectors/DatabaseManager.py`, `services/web/app/bill/[id]/components/ProcessResult/ProcessResult.tsx`, `services/web/app/timeline/components/PlenaryList.tsx`

### TIMELINE-04 '처리법안 17,481'은 처리된 법안이 아니라 위원회 회부 이상 단계의 법안 수다

- 분류: major · data · 백엔드 · 작업량 S · 검증 adjusted
- 사용자 영향: 접수 17,982건 중 97%가 '처리'되었다고 읽힌다. 국회 용어에서 처리는 가결·부결·폐기·철회로 결론이 난 상태를 뜻한다. 통계 API 기준 계류 15,373건을 빼면 실제 처리는 약 2,609건이다. 사용자가 잘못된 수치를 사실로 받아들인다.
- 근거: GET /v1/time-line/bill-state → treatment_count 17481. GET /v1/statistics/stage → committee_count 17481 (같은 값). GET /v1/statistics/overview → total_count 17982, pending_count 15373. 쿼리: services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepository.java:154-161 `SUM(CASE WHEN b.stage IN ('위원회 심사','본회의 심의','체계자구 심사','정부이송','공포') …)`
- 수정안: 처리 법안을 bill_result 확정 건수로 정의하는 것은 TIMELINE-03의 bill_result 백필이 끝난 뒤에만 정확하다. 먼저 bill_result를 백필한다. 집계는 '최종 결과(가결·부결·폐기·철회) 또는 정부이송·공포 단계' 중 하나로 정의를 정하고 StatisticsRepository의 단일 쿼리로 두 화면에 함께 쓴다.
- 검증 메모: /v1/time-line/bill-state의 treatment_count 17481은 /v1/statistics/stage의 committee_count 17481과 같다. BillRepository.java:154-161 쿼리는 stage IN ('위원회 심사', …)으로 센다. 그래서 '처리법안'은 위원회 회부 이상 법안 수다. 결함은 실재한다. 수정안의 'total − pending' 정의는 그대로 쓸 수 없다. StatisticsRepository.java:25의 pending은 bill_result IS NULL이다. 그런데 bill_result 적재가 비어 있다(TIMELINE-03에서 공포·정부이송 단계 99건의 result가 null). 공포 858건이 가결 828건보다 많은 것도 같은 증거다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/service/BillService.java`

### TIMELINE-05 '가결법안' 수치가 화면마다 다르다 (896 / 828 / 858)

- 분류: major · trust · 백엔드 · 작업량 S · 검증 adjusted
- 사용자 영향: 타임라인은 가결 896건, 통계 화면은 가결 828건, 공포 858건을 보여 준다. 같은 서비스 안에서 가결 수가 세 가지로 나오면 모든 수치의 신뢰가 떨어진다.
- 근거: GET /v1/time-line/bill-state → passed_count 896 (BillRepository.java:157 stage IN ('정부이송','공포') 기준). GET /v1/statistics/overview → passed_count 828 (원안가결+수정가결 기준). GET /v1/statistics/stage → promulgated_count 858. 본회의 의결 후에도 stage가 '본회의 심의'에 머문 법안이 많아 단계 기준 집계도 부정확하다(TIMELINE-03).
- 수정안: 가결 정의를 하나로 정하기 전에 bill_result를 백필한다(TIMELINE-03). 백필 뒤 bill_result IN ('원안가결','수정가결') 기준으로 통일한다. 백필 전에는 '정부이송·공포 단계 또는 가결 결과' 합집합으로 센다. 두 API가 같은 StatisticsRepository 쿼리를 호출하게 한다.
- 검증 메모: 확인한 값은 time-line/bill-state passed_count 896(stage IN 정부이송·공포), statistics/overview passed_count 828(bill_result IN 원안가결·수정가결), statistics/stage promulgated_count 858(stage='공포')이다. 858은 공포 수치이고 통계 화면도 공포로 표시한다. 따라서 '가결 수치가 세 가지'라는 표현은 틀렸다. 실제 불일치는 가결 896 대 828 두 가지다. 공포 858이 가결 828보다 많은 점은 bill_result 누락을 보여 준다. 수정안처럼 bill_result 기준으로만 통일하면 828이 되어 공포 건수보다 작은 값이 나온다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/controller/BillTimelineController.java`

### TIMELINE-07 위원회 카드의 '심사한 법안 N개 >'를 누르면 보이는 모든 카드의 모달이 한꺼번에 열린다

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 데스크톱에서 2026-03-27의 문화체육관광위원회 카드 화살표를 누르면 두 카드의 모달이 동시에 열린다. 맨 위에는 누르지 않은 정치개혁특별위원회 목록이 보인다. 사용자는 클릭한 위원회와 다른 법안 목록을 보게 된다.
- 근거: services/web/app/timeline/components/CommitteeAuditList.tsx:34 useDisclosure 하나(isOpenIndividual)를 만들고, :117-200 currentItems.map 안의 모든 카드가 :138 `<TimelineModal isOpen={isOpenIndividual}>`를 공유한다. lg 이상에서 itemsPerPage=3 (:41-42).
- 수정안: 열린 위원회 이름(또는 index)을 state로 보관하고 모달은 리스트 밖에 하나만 렌더한다. 선택한 위원회의 bill_outline_dto_list만 넘긴다.
- 검증 메모: CommitteeAuditList.tsx:34에서 useDisclosure를 하나만 만든다. :117 currentItems.map 안의 모든 카드가 :138에서 같은 isOpenIndividual로 TimelineModal을 렌더한다. :135 버튼 하나를 누르면 화면에 보이는 모든 카드(lg에서 최대 3개)의 모달이 동시에 열린다. 2026-03-27 응답에는 위원회가 2개(문화체육관광위원회 14건, 정치개혁특별위원회 1건) 있어 재현 조건이 맞는다.
- 파일: `services/web/app/timeline/components/CommitteeAuditList.tsx`

### TIMELINE-08 법안 공포 모달의 모든 법안 링크가 같은 법안으로 이동한다

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 2026-03-17(공포 6건)의 '공포한 법안 6개 >' 모달에서 어떤 제목을 눌러도 같은 법안 상세로 이동한다. 사용자는 원하는 공포 법안을 열 수 없다.
- 근거: services/web/app/timeline/components/PromulgationList.tsx:87 `<Link href={`/bill/${promulgation_list[currentPage].bill_id}`}>` — map 변수 bill_id(:70) 대신 현재 캐러셀 페이지 index의 법안을 쓴다.
- 수정안: href를 map에서 구조분해한 bill_id로 바꾼다. 네 개 리스트의 모달 행을 공통 컴포넌트 하나로 합쳐 같은 실수가 반복되지 않게 한다(TIMELINE-24).
- 검증 메모: PromulgationList.tsx:87은 href로 `/bill/${promulgation_list[currentPage].bill_id}`를 쓴다. :70 map에서 구조분해한 bill_id를 쓰지 않는다. 모달 안 모든 행이 캐러셀 현재 페이지 번호 위치의 법안 하나로 이동한다. SubmittedList.tsx:87은 같은 자리에 bill_id를 쓴다(diff로 확인). 2026-03-17 공포 6건은 응답에서 확인했다.
- 파일: `services/web/app/timeline/components/PromulgationList.tsx`

### TIMELINE-09 위원회 심사 캐러셀의 이전 버튼이 소수 페이지를 만들어 카드와 인디케이터가 깨진다

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 데스크톱에서 위원회가 2개인 날(2026-03-27)에 이전 버튼을 누르면 currentPage가 -1/3이 되어 slice(-1, 2)로 마지막 위원회 하나만 보이고 페이지 점이 활성 상태를 잃는다. 창 크기를 바꾸면 currentPage가 범위를 넘어 빈 영역이 보일 수 있다.
- 근거: services/web/app/timeline/components/CommitteeAuditList.tsx:218 `committee_audit_list.length / itemsPerPage - 1` (Math.ceil 누락). 다른 리스트는 Math.ceil을 쓴다(PlenaryList.tsx:195). 네 리스트 모두 resize 시 itemsPerPage만 바꾸고 currentPage를 보정하지 않는다(PlenaryList.tsx:48-62 등).
- 수정안: 페이지 수 계산을 `Math.ceil(len / itemsPerPage)` 한 곳으로 모으고 이전/다음/리사이즈 모두 그 값으로 범위를 보정한다. 가능하면 네 리스트를 공통 캐러셀 컴포넌트로 합친다.
- 검증 메모: CommitteeAuditList.tsx:218은 `committee_audit_list.length / itemsPerPage - 1`을 쓰고 Math.ceil이 없다. PlenaryList.tsx:195는 Math.ceil을 쓴다. node로 계산한 결과, 위원회 2개·itemsPerPage 3이면 currentPage=-0.333이다. 이때 startIndex=-1이고 [0,1].slice(-1,2)=[1]이 되어 마지막 위원회 하나만 보인다. Pagination page는 0.667이 되어 활성 점이 사라진다. 네 리스트 모두 resize 핸들러(:39-53 등)에서 currentPage를 보정하지 않는다.
- 파일: `services/web/app/timeline/components/CommitteeAuditList.tsx`, `services/web/app/timeline/components/PlenaryList.tsx`, `services/web/app/timeline/components/PromulgationList.tsx`, `services/web/app/timeline/components/SubmittedList.tsx`

### TIMELINE-12 '법안 접수' 섹션이 2025-12-04 이후 한 번도 나오지 않는다

- 분류: major · data · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 매일 수십 건씩 법안이 발의되는데 최근 4개월(2025-12 ~ 2026-03) 타임라인에는 접수 항목이 없다. 사용자는 이 기간에 발의가 없었다고 오해한다.
- 근거: page=0&size=60(2026-03-27~2025-12-11): submitted_list 합계 0. page=1&size=60(2025-12-10~2025-09-03): 접수 있는 날짜 37개, 마지막은 2025-12-04(51건). page=3&size=60(2025-06~03): submitted 1,454건. 접수 이벤트는 projectors.py:9(PPSL_DT)와 :120-133(fallback)에서만 만든다.
- 수정안: 2025-12-05 이후 접수 이벤트가 BillTimeline에 쓰이지 않은 원인을 확인한다(새 법안 수집 경로가 타임라인 행을 쓰지 않는지 등). 법안 INSERT 시 접수 이벤트를 함께 쓰도록 단일 경로로 만들고 누락 구간을 백필한다.
- 검증 메모: page=0&size=60(2026-03-27~2025-12-11) 응답의 submitted_list 합계는 0이다. page=1&size=60(2025-12-10~2025-09-03)에서는 접수 있는 날짜가 37개이고 가장 최근은 2025-12-04(51건)다. 같은 기간에도 위원회·본회의 행은 계속 있으므로 접수 이벤트만 빠졌다. 원인은 코드만으로 특정할 수 없다. 수정안도 원인 확인부터 하므로 타당하다.
- 파일: `services/data/src/lawdigest_data/status/projectors.py`, `services/data/src/lawdigest_data/connectors/DatabaseManager.py`

### TIMELINE-15 본회의 법안 수백 건을 한 장씩 넘기는 캐러셀과 점 인디케이터로 보여 준다

- 분류: major · ux · 작업량 M · 검증 adjusted
- 사용자 영향: 2026-01-29 본회의 288건은 모바일에서 카드 1장씩 288페이지로 나뉘고 6px 점이 늘어선다. 전체를 보려면 모달을 열어야 한다. 사용자는 그날 가결된 법안을 훑어볼 수 없다.
- 근거: PlenaryList.tsx:43-66 itemsPerPage 1/2/3, :199-207 Pagination item w-[6px] h-[6px] text-transparent. 데이터: 2026-01-29 plenary_list 288건, 2026-02-12 192건, 2025-12-30 125건. DESIGN.md '모달을 첫 선택으로 쓰지 않는다'.
- 수정안: 날짜별 섹션은 상위 몇 건을 목록으로 보여 주고 '전체 N건'을 인라인 펼치기(progressive disclosure)로 처리한다. 본회의는 결과(가결/부결/폐기)별로 묶어 건수를 먼저 보여 준다. 점 인디케이터와 캐러셀은 없앤다.
- 검증 메모: PlenaryList.tsx:43-66은 itemsPerPage 1/2/3로 카드를 나눈다. 2026-01-29 본회의는 288건이므로 모바일에서 288페이지가 된다. 문제는 실재한다. '6px 점이 늘어선다'는 틀렸다. HeroUI 2.6.14 use-pagination 기본값은 siblings=1, boundaries=1이고 DOTS로 축약한다(node_modules/@heroui/use-pagination/dist/index.js:40-41, 96-112). 그래서 점은 7개 안팎만 보인다. 사용자가 그날 법안을 훑어볼 수 없다는 영향은 그대로다.
- 파일: `services/web/app/timeline/components/PlenaryList.tsx`, `services/web/app/timeline/components/CommitteeAuditList.tsx`, `services/web/app/timeline/components/PromulgationList.tsx`, `services/web/app/timeline/components/SubmittedList.tsx`, `services/web/app/timeline/components/TimelineModal.tsx`

### TIMELINE-16 타임라인 API가 캐시 없이 N+1 쿼리를 돌고 size 파라미터 검증이 없다

- 분류: major · perf · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 3일치 페이지에 1.2초, 60일치에 25~29초가 걸린다. size에 음수를 주면 500, 큰 값을 주면 100초 넘게 응답하지 않아 누구나 GET 한 번으로 서버 부하를 만들 수 있다.
- 근거: global/BillTimelineScheduler.java:12-13 @Component/@Configuration이 없고 다른 곳에서 빈으로 등록하지 않는다(grep 결과 참조 없음) → Redis 타임라인 캐시가 채워지지 않는다(TimelineFacade.java:44). TimelineFacade.java:68-80 본회의 법안마다 voteRecord, voteParty 쿼리를 따로 실행한다. curl: size=-1 → {"code":500,"message":"서버 내부 오류입니다."}, page=0&size=60 → 25.6s/29.3s, size=100000 → 100초 이상 무응답(중단함). BillTimelineController.java:62-72 page/size 검증 없음.
- 수정안: size에 @Min(1) @Max(10) 같은 범위 검증을 걸고 400을 반환한다. 표결 정보를 bill_id IN 일괄 조회로 바꾼다. 날짜별 응답 캐시를 실제 빈으로 등록하거나 @Cacheable로 대체하고, 단계 동기화 시 해당 날짜 캐시를 무효화한다.
- 검증 메모: BillTimelineScheduler.java:12-13에는 @RequiredArgsConstructor만 있고 @Component가 없다. 저장소 어디에도 이 클래스를 등록하는 코드와 @EnableScheduling이 없다(grep). RedisService에는 타임라인 캐시를 쓰는 메서드가 없다. 그래서 TimelineFacade.java:44의 캐시 확인은 항상 실패한다. TimelineFacade.java:72-76은 법안마다 voteRecord·voteParty를 따로 조회한다. 측정값은 size=-1 → HTTP 500, page=0&size=60 → 24.5s, page=1&size=60 → 28.4s다. size=100000은 서버 부하를 피하려고 재현하지 않았다. BillTimelineController.java:62-70에 범위 검증이 없다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/controller/BillTimelineController.java`, `services/backend/src/main/java/com/everyones/lawmaking/facade/TimelineFacade.java`, `services/backend/src/main/java/com/everyones/lawmaking/global/BillTimelineScheduler.java`

### TIMELINE-06 'D-526'이 무엇까지 남은 날인지 표시되지 않고, 기준일도 하루 어긋난다

- 분류: minor · copy · 백엔드 · 작업량 S · 검증 adjusted
- 사용자 영향: '제 22대 국회 | D-526'만 보이므로 사용자는 무엇을 세는 숫자인지 알 수 없다. 코드는 2028-04-11까지 남은 날을 센다. 공직선거법 산식(임기만료일 2028-05-29 전 50일인 04-09 이후 첫 수요일)으로 계산한 23대 총선일은 2028-04-12이다. 22대 임기 만료일(05-29)과도 다르다. 또 표시 값이 자정이 아니라 오전 9시(KST)에 바뀐다.
- 근거: services/web/app/timeline/components/TimelineBoard.tsx:31 `D-${getDDay('2028-04-11')}`. utils/getDDay.ts:2-5: `new Date(targetDate)`는 UTC 자정으로 해석되고 Math.ceil을 쓰므로 KST 09:00에 값이 바뀐다. python으로 계산: (2028-04-11 − 2026-11-02) = 526일. 2024년 검산: 2024-05-29 전 50일 = 04-09, 첫 수요일 04-10 = 22대 총선일과 일치. 2028-04-12 선거일은 2차 자료(foxcg.com/2028-general-election, itwiki.kr/w/2028년)에서 확인했고 선관위 공고는 확인하지 못했다. 백엔드는 days_since_opening(886)을 내려주지만 프론트는 쓰지 않는다(BillStateCountResponse.java:15-25).
- 수정안: D-day가 가리키는 대상을 정한다(총선일 또는 임기 만료일). 대상 날짜는 백엔드 상수(BillInfoConstant)에서 API로 내려주고, 대상 이름(예: '총선')을 숫자 옆 내용으로 함께 표시한다. 날짜 계산은 KST 날짜 단위로 한다. 쓰지 않는 days_since_opening은 화면에 쓰거나 응답에서 뺀다.
- 검증 메모: TimelineBoard.tsx:31은 getDDay('2028-04-11')을 쓴다. 공직선거법 산식으로 계산한 23대 총선일은 2028-04-12다(임기만료 2028-05-29 전 50일은 2028-04-09 일요일, 그 뒤 첫 수요일). 2028-04-11까지 남은 날은 526일로 화면 값과 같다. getDDay.ts는 new Date('YYYY-MM-DD')를 UTC 자정으로 해석하고 Math.ceil을 쓴다. 그래서 KST 00:00~08:59에는 527이 나오고 09:00에 526으로 바뀐다. 백엔드 days_since_opening(886)은 프론트에서 쓰지 않는다. 결함은 실재한다. 영향은 라벨 없는 숫자 하나와 하루 오차이므로 major보다 minor가 맞다.
- 파일: `services/web/app/timeline/components/TimelineBoard.tsx`, `services/web/utils/getDDay.ts`, `services/backend/src/main/java/com/everyones/lawmaking/global/constant/BillInfoConstant.java`, `services/backend/src/main/java/com/everyones/lawmaking/common/dto/response/BillStateCountResponse.java`

### TIMELINE-10 같은 법안이 여러 날짜의 위원회 심사에 반복 등장한다

- 분류: minor · data · 운영 데이터 작업 · 작업량 M · 검증 adjusted
- 사용자 영향: '관람료 감면 지원 규제 완화를 위한 문화유산법' 같은 법안이 3.27, 3.26에 모두 나온다. 사용자는 같은 법안을 여러 번 보게 되고 하루 심사 건수도 부풀려진다.
- 근거: page=0&size=60 응답 집계: 위원회 심사 법안 1,363건 중 568건이 두 개 이상의 날짜에 나타난다. 예: PRC_C2A5B0I5H0H9G1G6F3F1B4C0A8A6Z0 → 2026-03-27, 2026-03-25 (문화체육관광위원회). 중복 판정 키가 (bill_id, stage, status_update_date)라서 날짜가 바뀐 같은 단계 이벤트가 새 행으로 들어간다(DatabaseManager.py:678-743).
- 수정안: (bill_id, stage, committee) 유일 제약을 걸면 실제로 다른 날 일어난 위원회 이벤트(상정·의결)가 사라진다. 먼저 운영 DB에서 같은 법안 위원회 행의 날짜가 어떤 원천 필드에서 왔는지 확인한다. 서로 다른 이벤트이면 이벤트 종류(회부·상정·의결) 컬럼을 추가하고 화면에 종류를 표시한다. 같은 이벤트의 중복일 때만 병합한다.
- 검증 메모: page=0&size=60 집계에서 위원회 심사 행 2,157건, 고유 법안 1,363건, 여러 날짜에 나오는 법안 567건을 확인했다(보고값 568과 1 차이). 예시 PRC_C2A5B0I5H0H9G1G6F3F1B4C0A8A6Z0는 2026-03-25와 2026-03-27에 나온다. 이 법안의 발의일은 2025-06-12다(/bill/detail). 두 날짜가 이틀 간격이므로 소위·전체회의 상정이나 의결처럼 서로 다른 위원회 이벤트일 수 있다. 행이 같은 이벤트의 중복이라는 근거는 DB를 보지 않고는 확인할 수 없다. DatabaseManager.py:693-743의 중복 키가 (bill_id, stage, status_update_date)라는 사실만 코드로 확인된다.
- 파일: `services/data/src/lawdigest_data/connectors/DatabaseManager.py`, `services/data/src/lawdigest_data/status/projectors.py`

### TIMELINE-11 '심의한 법안'이라는 문구와 실제 이벤트(회부일), 단계 칩이 서로 맞지 않는다

- 분류: minor · copy · 작업량 S · 검증 adjusted
- 사용자 영향: 위원회 심사 날짜는 대부분 회부일인데 화면은 '심의한 법안'이라고 쓴다. 같은 '위원회 심사' 아래 카드 칩에는 '본회의 심의', '공포'가 섞여 있어 사용자는 그날 무슨 일이 있었는지 오해한다.
- 근거: projectors.py:10 위원회 심사 날짜 = JRCMIT_CMMT_DT(회부일) 우선. CommitteeAuditList.tsx:67-68 '심의한 법안', :128-129 '심사한 법안'으로 한 화면에 두 표현을 쓴다. page=0&size=60 집계: 위원회 심사 아래 bill_stage '본회의 심의' 386건, '공포' 13건, '체계자구 심사' 130건. 본회의 심사 아래 '공포' 70건, '정부이송' 29건. 칩은 현재 단계(PlenaryList.tsx:152, bill_stage)이고 제목은 그날 이벤트 단계다.
- 수정안: 이벤트 이름을 '위원회 회부'로 바꾸는 수정은 근거가 없다. 먼저 위원회 행 날짜의 원천 필드를 운영 DB에서 확인한다. 그 뒤 이벤트 이름을 정한다. 화면 문구는 한 단어로 통일한다. 칩이 현재 단계라는 점은 레이아웃으로 구분한다.
- 검증 메모: 문구 불일치는 실재한다. CommitteeAuditList.tsx:68은 '심의한 법안', :129는 '심사한 법안'이다. 위원회 심사 아래 칩 집계는 '본회의 심의' 386건, '체계자구 심사' 130건, '공포' 13건이다. 칩은 현재 단계이고 섹션은 그날 이벤트라 둘이 섞인다. '날짜는 대부분 회부일'이라는 근거는 확인되지 않는다. projectors.py:10이 JRCMIT_CMMT_DT를 우선하는 것은 맞다. 그러나 예시 법안 PRC_C2A5B0I5H0H9G1G6F3F1B4C0A8A6Z0(발의 2025-06-12)의 위원회 행 날짜는 2026-03-25와 03-27이다. 회부일로 보기 어렵다. BillTimeline에는 다른 기록 경로(WorkFlowManager.py:763, DataService.java:111)도 있다.
- 파일: `services/web/app/timeline/components/CommitteeAuditList.tsx`, `services/web/app/timeline/components/PlenaryList.tsx`, `services/data/src/lawdigest_data/status/projectors.py`

### TIMELINE-13 내용 없는 날짜가 날짜 제목만 덩그러니 표시된다

- 분류: minor · bug · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: 2026-01-30, 2026-01-19, 2025-10-14, 2025-09-05는 날짜 제목만 있고 아래가 비어 있다. 사용자는 화면이 덜 불러와졌거나 깨졌다고 느낀다.
- 근거: API 응답에서 네 날짜 모두 submitted/plenary/promulgation/committee 리스트가 비어 있고 bill_count=0. 원인: findTopProposeDates(BillTimelineRepository.java:47-49)는 단계 필터 없이 날짜를 고르지만 TimelineFacade.java:47-50은 접수/본회의 심의/공포/위원회 심사만 조회한다. projectors.py:11,13은 '체계자구 심사', '정부이송' 행도 쓴다. 다른 가능성: findBillsWithPartiesByIds(BillRepository.java:146-152)의 READY 필터로 법안이 빠진 경우. ListContainer.tsx:52-57은 비어 있는 날짜에 대한 처리가 없다.
- 수정안: 백엔드에서 표시 단계가 하나도 없는 날짜를 페이지 결과에서 제외한다(날짜 쿼리에 단계·READY 조건을 같이 건다). 체계자구 심사·정부이송을 보여 줄 가치가 있으면 섹션을 추가한다.
- 검증 메모: API 응답에서 2026-01-30, 2026-01-19(page0), 2025-10-14, 2025-09-05(page1)는 네 리스트가 모두 비어 있다. 2026-01-30과 01-19는 bill_count=0이다. BillTimelineRepository.java:47-49 findTopProposeDates는 단계 필터 없이 날짜를 고른다. BillTimelineService.java:21-31은 접수·공포·본회의 심의·위원회 심사만 조회한다. projectors.py:11,13은 체계자구 심사·정부이송 행도 만든다. ListContainer.tsx:51-58은 빈 날짜를 처리하지 않아 날짜 제목만 남는다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/BillTimelineRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/facade/TimelineFacade.java`, `services/web/app/timeline/components/ListContainer.tsx`

### TIMELINE-14 날짜로 이동하는 수단이 없고 무한 스크롤만 있다

- 분류: minor · ux · 백엔드 · 작업량 M · 검증 adjusted
- 사용자 영향: 특정 날짜(예: 2025년 12월 본회의)를 보려면 3일치씩 수십 번 스크롤해야 하고 페이지마다 약 1.2초가 걸린다. 날짜 선택, 월 이동, 단계 필터가 없다.
- 근거: apis/apis.ts:4-8 size:3 고정. queries.ts:6-16 무한 스크롤만 구현. 측정: page=0&size=3 1.22s, page=1&size=3 1.26s. 날짜 지정 API(BillTimelineController.java:49-61 GET /feed?billProposeDate)는 @Deprecated 상태로 프론트에서 쓰지 않는다.
- 수정안: 페이징 API에 기준 날짜(before/date) 파라미터를 추가하고, 상단에 월·날짜 선택과 단계 필터를 둔다. 선택 상태는 URL 쿼리(?date=)에 반영해 공유와 뒤로 가기가 되게 한다.
- 검증 메모: apis.ts:7 size 3 고정, queries.ts:6-16 무한 스크롤만 있다. BillTimelineController.java:49-50 /feed는 @Deprecated다. page=0·1 size=3 응답 시간은 1.18s, 1.23s로 측정했다. 사실관계는 맞다. 날짜 이동 수단이 없는 것은 기능 부족이다. 사용자가 최근 내역을 보는 기본 흐름은 동작하므로 major보다 minor가 맞다.
- 파일: `services/web/app/timeline/apis/apis.ts`, `services/web/app/timeline/apis/queries.ts`, `services/web/app/timeline/components/ListContainer.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/controller/BillTimelineController.java`

### TIMELINE-17 첫 화면에서 카드 열 수와 집계 숫자가 늦게 바뀌어 레이아웃이 움직인다

- 분류: minor · perf · 작업량 M · 검증 confirmed
- 사용자 영향: 서버 HTML은 섹션마다 카드 1장과 점 2개로 그려지고, 하이드레이션 후 데스크톱에서 3열로 다시 배치된다. 상단 접수/처리/가결 숫자는 빈 칸으로 그려진 뒤 나타난다. 첫 화면이 눈에 띄게 흔들린다.
- 근거: PlenaryList.tsx:43 등 네 리스트 모두 useState(1)로 시작해 useEffect(:48-62)에서 3으로 바꾼다. curl https://lawdigest.kr/timeline HTML: 3.27 아래 문화체육관광위원회만 있고 정치개혁특별위원회는 없으며 'pagination item 1 active', 'pagination item 2'가 있다. 같은 HTML의 집계 span은 `text-2xl font-semibold"><` 로 비어 있다(TimelineBoard.tsx:10-17 useQuery+useEffect 복사, SSR 미적용).
- 수정안: 열 수는 CSS 그리드(grid-cols-1 md:grid-cols-2 lg:grid-cols-3)로만 정하고 JS 폭 감지를 없앤다. 집계는 서버에서 prefetch하거나 숫자 자리에 고정 폭 스켈레톤을 둔다. useState로 data를 복사하는 코드는 지운다.
- 검증 메모: curl https://lawdigest.kr/timeline HTML에는 '문화체육관광위원회'가 1회, '정치개혁특별위원회'가 0회 나온다. 'pagination item 1 active'와 'pagination item 2'는 각 3회 나온다. 집계 span은 `text-2xl font-semibold"><` 형태로 3개 모두 비어 있다. 원인은 네 리스트의 useState(1)과 TimelineBoard.tsx:10-17의 useQuery + useEffect 복사다.
- 파일: `services/web/app/timeline/components/PlenaryList.tsx`, `services/web/app/timeline/components/CommitteeAuditList.tsx`, `services/web/app/timeline/components/PromulgationList.tsx`, `services/web/app/timeline/components/SubmittedList.tsx`, `services/web/app/timeline/components/TimelineBoard.tsx`

### TIMELINE-18 집계 숫자에 천 단위 구분 기호가 없다

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: '17982 17481 896'으로 표시되어 자릿수를 바로 읽기 어렵다. 탐색 화면은 '6,331건'처럼 구분 기호를 쓰므로 화면 간 표기도 다르다.
- 근거: TimelineBoard.tsx:37,41,45 `{billState && billState.receipt_count}`를 그대로 렌더한다. 운영 스크린샷(데스크톱·모바일 타임라인)에서 '17982', '17481' 확인.
- 수정안: toLocaleString('ko-KR')로 표기하고 tabular-nums를 적용한다. 프로젝트 공통 숫자 포맷 유틸이 있으면 재사용한다.
- 검증 메모: TimelineBoard.tsx:37,41,45는 receipt_count 등을 포맷 없이 렌더한다. API 값은 17982, 17481, 896이다.
- 파일: `services/web/app/timeline/components/TimelineBoard.tsx`

### TIMELINE-19 아이콘 버튼에 접근 가능한 이름이 없고 터치 영역이 16px이다

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 스크린리더는 '심의한 법안 15개' 옆 화살표, 이전/다음 버튼을 이름 없는 '버튼'으로 읽는다. 모바일에서 16px 화살표와 6px 점은 누르기 어렵다. 페이지에 h1이 없다.
- 근거: curl 운영 HTML: `<button class="… w-4 h-4 p-0 bg-transparent" type="button">`에 aria-label 없음. 코드: PlenaryList.tsx:79, :190-198, :208-216 (다른 리스트 동일). 페이지네이션 aria-label은 영어('pagination item 1 active'). TimelineBoard.tsx:27 최상위 제목이 h2. DESIGN.md 모바일 조작부 56px 터치 크기 원칙.
- 수정안: 아이콘 버튼에 '문화체육관광위원회 법안 14개 전체 보기', '이전', '다음' 같은 aria-label을 단다. 화살표는 텍스트와 함께 하나의 버튼으로 만들어 터치 영역을 44px 이상으로 넓힌다. 페이지 최상위 제목을 h1로 바꾼다.
- 검증 메모: 운영 HTML의 아이콘 버튼은 `<button class="… min-w-8 … w-4 h-4 p-0 bg-transparent" type="button">` 형태이고 aria-label이 없다. 페이지네이션 aria-label은 영어('pagination item 1 active')다. HTML에 <h1>이 없고 TimelineBoard.tsx:27 최상위 제목은 h2다. 터치 영역은 min-w-8 때문에 가로 32px, 세로 16px이다. '16px'은 세로 기준이다. 어느 쪽이든 DESIGN.md:258의 56px 기준에 못 미친다.
- 파일: `services/web/app/timeline/components/PlenaryList.tsx`, `services/web/app/timeline/components/CommitteeAuditList.tsx`, `services/web/app/timeline/components/PromulgationList.tsx`, `services/web/app/timeline/components/SubmittedList.tsx`, `services/web/app/timeline/components/TimelineBoard.tsx`

### TIMELINE-20 보조 텍스트 대비가 부족하고 다크 모드에서 타임라인 표식 테두리가 사라진다

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 발의자, '심의한 법안', '접수법안' 같은 12~14px 회색(#999999) 글자는 흰 배경에서 대비 약 2.8:1로 WCAG AA(4.5:1)에 못 미친다. 다크 모드에서는 날짜·단계 원형 표식의 검은 테두리가 #101012 배경에 묻힌다.
- 근거: text-gray-2(#999999, tailwind.config.js:47) 사용: PlenaryList.tsx:76,107,154, TimelineBoard.tsx:29,38,42,46. 표식: ListContainer.tsx:43 `border-black`, PlenaryList.tsx:71 `border border-black` (dark 변형 없음).
- 수정안: 보조 텍스트는 DESIGN.md text-secondary(#555555)를 쓰거나 크기·굵기를 올린다. 표식 테두리에 dark:border-dark-l 또는 dark:border-gray-2를 지정한다.
- 검증 메모: tailwind.config.js:47 gray-2=#999999이고 흰 배경 대비는 2.85:1이다(WCAG 산식 계산). TimelineBoard.tsx:29,38,42,46은 다크 변형 없이 text-gray-2를 쓴다. ListContainer.tsx:43과 PlenaryList.tsx:71의 border-black에는 dark 변형이 없다. dark 배경 #101012(tailwind.config.js:64)에서 이 테두리는 보이지 않는다. 표식 면(bg-gray-3/4)은 남지만 테두리는 사라진다.
- 파일: `services/web/app/timeline/components/ListContainer.tsx`, `services/web/app/timeline/components/PlenaryList.tsx`, `services/web/app/timeline/components/TimelineBoard.tsx`

### TIMELINE-21 타이포그래피와 카드 표현이 DESIGN.md와 다르다 (extralight 단계명, 그림자 겹친 가짜 카드)

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 단계 이름이 얇은 글꼴이라 날짜·카드보다 위계가 약하다. 모바일 카드 아래 빈 카드 두 장이 그림자와 함께 겹쳐 있어 정보 없는 장식이 정보보다 먼저 보인다.
- 근거: PlenaryList.tsx:73 `text-[26px] font-extralight` (DESIGN.md:180 Headline 700/26px). ListContainer.tsx:46 날짜 42px(토큰 없음). TimelineBoard.tsx:27 `md:text-[48px] md:font-bold`. 빈 카드: PlenaryList.tsx:166-171, PromulgationList.tsx:146-151, CommitteeAuditList.tsx:203-208, SubmittedList.tsx:146-151 `<Card …><CardBody /></Card>`. DESIGN.md 'The Flat Trust Rule'. ListContainer.tsx:37 선 가림용 absolute div.
- 수정안: 단계명은 Headline 토큰(700/26px), 날짜는 Display 토큰으로 맞춘다. 빈 장식 카드와 선 가림 div를 지우고 카드는 shadow-none + border로 통일한다.
- 검증 메모: PlenaryList.tsx:73과 다른 리스트의 단계 제목은 `text-[26px] font-extralight`다. DESIGN.md:180은 타임라인 단계를 Headline 700/26px로 정한다. 네 리스트 모두 md:hidden 빈 Card 두 장을 렌더한다(PlenaryList.tsx:166-171, CommitteeAuditList.tsx:203-208 등). DESIGN.md:205 Flat Trust Rule과 어긋난다.
- 파일: `services/web/app/timeline/components/ListContainer.tsx`, `services/web/app/timeline/components/PlenaryList.tsx`, `services/web/app/timeline/components/PromulgationList.tsx`, `services/web/app/timeline/components/CommitteeAuditList.tsx`, `services/web/app/timeline/components/SubmittedList.tsx`, `services/web/app/timeline/components/TimelineBoard.tsx`

### TIMELINE-22 문구 불일치: 모든 모달 제목이 '심사한 법안', '본회의 심사' 대 '본회의 심의', '제 22대'

- 분류: minor · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 공포·접수 목록 모달도 제목이 '심사한 법안'으로 나와 내용과 맞지 않는다. 섹션명 '본회의 심사'는 데이터와 법안 칩의 '본회의 심의'와 다르다. '제 22대'는 띄어쓰기가 틀렸다(제22대). 본회의 카드 칩 '본회의 심의'는 섹션 제목을 반복한다.
- 근거: TimelineModal.tsx:15 `<ModalHeader>심사한 법안</ModalHeader>` 고정, PromulgationList.tsx:68, SubmittedList.tsx:68에서 그대로 사용. PlenaryList.tsx:73 '본회의 심사' vs BillTimelineService.java:30 '본회의 심의'. TimelineBoard.tsx:29 '제 22대 국회'.
- 수정안: 모달 제목을 prop으로 받아 '날짜 + 단계 + 위원회명'처럼 내용을 담는다. 단계 용어는 국회 용어 '본회의 심의'로 통일한다. '제22대 국회'로 고친다. 섹션 제목과 같은 칩은 숨긴다.
- 검증 메모: TimelineModal.tsx:15는 ModalHeader를 '심사한 법안'으로 고정한다. 공포·접수·본회의 모달도 같은 제목을 쓴다. PlenaryList.tsx:73은 '본회의 심사'이고 BillTimelineService.java:30 단계 값은 '본회의 심의'다. TimelineBoard.tsx:29는 '제 22대 국회'다. '제'는 접두사이므로 '제22대'로 붙여 쓴다.
- 파일: `services/web/app/timeline/components/TimelineModal.tsx`, `services/web/app/timeline/components/PlenaryList.tsx`, `services/web/app/timeline/components/TimelineBoard.tsx`

### TIMELINE-23 페이지 제목·설명·공유 미리보기가 타임라인에 맞지 않는다

- 분류: minor · seo · 작업량 S · 검증 confirmed
- 사용자 영향: 브라우저 탭과 검색 결과에 '타임라인 페이지'만 나오고 서비스 이름이 없다. 링크를 공유하면 제목은 '모두의입법', 설명은 사이트 공통 문구, og:url은 루트로 나와 어떤 화면인지 알 수 없다.
- 근거: curl https://lawdigest.kr/timeline: `<title>타임라인 페이지</title>`, description '법안들의 타임라인을 날짜별로 자세히 확인할 수 있는 페이지', og:title '모두의입법', og:url 'https://www.lawdigest.kr', canonical 없음. app/timeline/layout.tsx:4-7, app/layout.tsx:20 title template 없음.
- 수정안: 루트 metadata에 title.template('%s | 모두의입법')을 두고 타임라인 title을 '국회 타임라인'처럼 내용으로 바꾼다. description은 화면이 담는 정보(날짜별 위원회 회부·본회의 의결·공포)로 쓰고 openGraph title/url/canonical을 /timeline으로 지정한다.
- 검증 메모: 운영 HTML 확인 결과: title '타임라인 페이지', description '법안들의 타임라인을 날짜별로 자세히 확인할 수 있는 페이지', og:title '모두의입법', og:description은 사이트 공통 문구, og:url 'https://www.lawdigest.kr', canonical 없음. app/timeline/layout.tsx:4-7과 app/layout.tsx:20의 title에 template이 없다.
- 파일: `services/web/app/timeline/layout.tsx`, `services/web/app/layout.tsx`

### TIMELINE-24 빈 상태 분기가 실행되지 않는 죽은 코드이고 리스트 4종이 같은 코드를 중복한다

- 분류: polish · dead-code · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 빈 상태 디자인이 실제로는 없다(TIMELINE-13). 중복 코드 때문에 TIMELINE-08, 09 같은 버그가 리스트마다 따로 생긴다. 정당 색·로고 처리도 공통 유틸과 달라 화면 간 표식이 어긋날 수 있다.
- 근거: ListContainer.tsx:52-57은 length !== 0일 때만 리스트를 마운트하므로 PlenaryList.tsx:163-165, PromulgationList.tsx:139-145, SubmittedList.tsx:139-145, CommitteeAuditList.tsx:119,125,196-198의 빈 상태 분기는 실행되지 않는다. 정당 표식 JSX가 네 파일에 3번씩 반복되고 `party_image_url.replace('wide','dark')`를 직접 쓴다(utils/getPartyLogoSrc.ts 미사용). 정당 색은 styles/globals.css:28-60 정당명 CSS 클래스로 처리한다(DESIGN.md:151은 getPartyColor()를 기준으로 정함). BillTimelineResponse.java:45 bill_count는 리스트 종류 수를 더한 값이라 법안 수가 아니다(미사용). 위원회 순서는 BillTimelineRepository.java:26-31에 ORDER BY가 없어 정해지지 않는다.
- 수정안: 날짜 섹션 컴포넌트 하나(단계 제목, 법안 행, 전체 보기)와 PartyMarker 컴포넌트 하나로 합치고 getPartyLogoSrc/getPartyColor를 쓴다. 죽은 분기와 bill_count를 지우거나 bill_count를 실제 법안 수로 고친다. 위원회 목록에 ORDER BY(건수 내림차순 등)를 추가한다.
- 검증 메모: ListContainer.tsx:52-57은 length !== 0일 때만 리스트를 마운트한다. 그래서 각 리스트의 빈 상태 분기는 실행되지 않는다. CommitteeAuditList.tsx:119,125는 map 안에서 committee_audit_list.length를 다시 확인하므로 항상 참이다. BillTimelineResponse.java:45의 bill_count는 committeeAuditList.size()(위원회 수)를 더한 값이다. BillTimelineRepository.java:26-31에는 ORDER BY가 없다. utils/getPartyLogoSrc.ts가 있으나 타임라인은 replace('wide','dark')를 직접 쓴다.
- 파일: `services/web/app/timeline/components/ListContainer.tsx`, `services/web/app/timeline/components/PlenaryList.tsx`, `services/web/app/timeline/components/PromulgationList.tsx`, `services/web/app/timeline/components/CommitteeAuditList.tsx`, `services/web/app/timeline/components/SubmittedList.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/common/dto/response/BillTimelineResponse.java`, `services/backend/src/main/java/com/everyones/lawmaking/repository/BillTimelineRepository.java`

### TIMELINE-25 로딩·오류·목록 끝 상태가 다듬어지지 않았다

- 분류: polish · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 타임라인으로 이동하면 전체 화면 로고와 'AI 기반 입법정보 제공 플랫폼' 문구, 스피너가 먼저 뜨고, 로고 대체 텍스트는 '500 에러 이미지'다. 다음 페이지 요청이 실패하면 아무 표시 없이 멈춘다. 집계 API가 실패하면 숫자가 계속 빈 칸이다. 마지막 날짜에 도달해도 끝 표시가 없다.
- 근거: app/loading.tsx:14 alt="500 에러 이미지", :16 'AI 기반 입법정보 제공 플랫폼'. 운영 /timeline HTML에 이 fallback이 포함되어 있다(aria-label="Loading"). ListContainer.tsx:63-68 isFetching 스피너만 있고 isError/재시도/끝 상태 없음. TimelineBoard.tsx:10 error 처리 없음. 초기 실패는 useSuspenseInfiniteQuery가 throw하여 app/error.tsx 전체 오류 화면으로 간다.
- 수정안: /timeline 전용 loading.tsx에 보드·날짜 섹션 모양의 스켈레톤을 둔다. 로고 alt를 '모두의입법'으로 고친다. 다음 페이지 실패 시 행 단위 재시도 버튼을, 마지막 페이지에서는 목록 끝을 레이아웃으로 표시한다. 집계 실패 시 숫자 자리를 '-'로 두고 재시도한다.
- 검증 메모: app/loading.tsx:14 alt는 '500 에러 이미지', :17 문구는 'AI 기반 입법정보 제공 플랫폼'이다. 운영 /timeline HTML에 두 문자열(각 2회)과 aria-label="Loading"이 있다. app/timeline/loading.tsx와 error.tsx는 없다. ListContainer.tsx:63-68에는 isFetching 스피너만 있고 오류·재시도·목록 끝 처리가 없다. TimelineBoard.tsx:10은 error를 처리하지 않는다.
- 파일: `services/web/app/loading.tsx`, `services/web/app/timeline/components/ListContainer.tsx`, `services/web/app/timeline/components/TimelineBoard.tsx`

### TIMELINE-26 날짜를 UTC로 해석해 서쪽 시간대 사용자에게 하루 전 날짜가 보인다

- 분류: polish · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 한국보다 시간이 늦은 시간대(해외 거주 교민 등)의 브라우저에서는 '2026-03-27'이 '3.26 목'으로 표시된다.
- 근거: utils/convertDateFormat.ts:3 `new Date(dateStr)`는 'YYYY-MM-DD'를 UTC 자정으로 해석하고 :6-9 getMonth/getDate/toLocaleDateString은 로컬 시간대를 쓴다. ListContainer.tsx:46-48에서 같은 함수를 세 번 호출한다.
- 수정안: 문자열을 split으로 파싱하거나 timeZone:'Asia/Seoul'을 지정한 Intl.DateTimeFormat을 쓴다. 한 번만 계산해 변수에 담는다.
- 검증 메모: TZ=America/New_York에서 node로 실행한 new Date('2026-03-27')의 getMonth()+1, getDate(), 요일 결과는 '3 26 목요일'이다. 2026-03-27은 금요일이므로 날짜가 하루 앞당겨진다. convertDateFormat.ts:3이 원인이다. ListContainer.tsx:46-48은 같은 함수를 세 번 호출한다.
- 파일: `services/web/utils/convertDateFormat.ts`, `services/web/app/timeline/components/ListContainer.tsx`

## 탐색 (EXPLORE)

### EXPLORE-01 분야 목록에 2026-05 중순 이후 법안이 나오지 않고 미분류 법안으로 가는 진입점이 없음

- 분류: major · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 adjusted
- 사용자 영향: 사용자가 분야 카드를 눌러도 가장 최근 법안은 2026-05~06 법안입니다. 피드에 있는 2026-07-09 법안은 어느 분야에서도 찾을 수 없습니다. 제22대 법안 약 26%(4,751건)는 분야 탭에서 볼 방법이 없습니다.
- 근거: curl /v1/bill/category?category=<17개>&page=0&size=1 → 최신 propose_date: economy 2026-05-15, justice·transport·welfare·education 2026-05-18, family 2026-05-08, politics·tech·safety 2026-06-04. /v1/bill/mainfeed 최신 2026-07-09. /v1/statistics/overview total_count 17982, /v1/statistics/by-category 합계 13231. 후보 원인 두 가지: services/backend/.../repository/BillRepositoryImpl.java:93 `bill.category.eq(category)`(분류 미적재)와 `hasText(bill.gptSummary)`(요약 미적재). 프런트는 unknown을 걸러 냄: services/web/app/explore/components/CategoryGrid.tsx:14, StatsCategoryDonut.tsx:25
- 수정안: 원인 확인 단계는 빼도 됩니다. 원인은 category 미적재입니다. 2026-07 피드 표본 200건 모두 gpt_summary는 있고 category는 null입니다. 운영 DB에서 category가 null인 제22대 READY 법안을 다시 분류합니다. 분류 단계를 적재 배치에 연결합니다. 미분류 건수는 화면에 노출합니다.
- 검증 메모: curl /v1/bill/category 결과는 보고와 같습니다. 최신 propose_date는 economy 2026-05-15, justice·transport·welfare·education 2026-05-18, family 2026-05-08, politics·tech·safety 2026-06-04입니다. /v1/bill/mainfeed?size=200 표본 200건(2026-07-01~07-09)은 모두 gpt_summary가 있습니다. 그런데 200건 모두 category가 None입니다. 원인은 분류 미적재입니다. 요약 미적재는 원인이 아닙니다. findPagedBillsByCategory(BillRepositoryImpl.java:93)의 bill.category.eq 조건 때문에 이 법안들은 분야 목록에서 빠집니다. overview total 17982에서 by-category 합계 13231을 빼면 4751건입니다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepositoryImpl.java`, `services/web/app/explore/components/CategoryGrid.tsx`, `services/web/config/categories.ts`

### EXPLORE-02 분야 카드 건수와 통계 도넛 건수가 서로 다른 기준이라 같은 분야 수치가 2.6배 차이 남

- 분류: major · data · 백엔드 · 작업량 S · 검증 adjusted
- 사용자 영향: '경제·세금' 카드는 6,331건, 통계 탭 도넛은 2,406건을 보여 줍니다. 카드 건수만큼 목록이 나오지도 않습니다. 사용자는 어느 숫자를 믿어야 할지 판단할 수 없습니다.
- 근거: curl /v1/bill/categories → economy 6331, 합계 35492. curl /v1/statistics/by-category → economy 2406, 합계 13231. BillRepositoryImpl.java:59-67 countByCategory에 assemblyNumber 조건이 없음(전 대수 집계). 목록 쿼리 BillRepositoryImpl.java:93은 title·gptSummary가 있는 법안만 반환하지만 건수 쿼리는 이 조건이 없음. 카드 문구 CategoryGrid.tsx:55 `관련 법안 {count}건`
- 수정안: countByCategory에만 대수 조건을 넣으면 카드(제22대)와 목록(전 대수, BillRepositoryImpl.java:93)이 새로 어긋납니다. findPagedBillsByCategory에도 같은 assemblyNumber 조건을 넣습니다. 그러면 세 쿼리가 하나의 공용 BooleanExpression을 씁니다. 다른 방법은 탐색 분야를 전 대수로 정하고 통계 화면에 범위를 표시하는 것입니다. 둘 중 하나를 제품 기준으로 먼저 정합니다.
- 검증 메모: countByCategory(BillRepositoryImpl.java:59-67)에는 assemblyNumber 조건이 없습니다. 통계 findBillCountByCategory(StatisticsRepository.java:49-56)는 제22대만 셉니다. 그래서 economy 값이 6331과 2406으로 다릅니다. 이 부분은 확인했습니다. 보고의 '카드 건수만큼 목록이 나오지 않는다'는 틀렸습니다. economy 목록은 page 1265(size 5)까지 있습니다. page 1270에서 last_page=true입니다. 약 6330건이고 2020-06-01 법안까지 나옵니다. 따라서 카드와 목록은 둘 다 전 대수 기준이고 서로 일치합니다. 실제로 어긋나는 쌍은 카드·목록(전 대수)과 통계(제22대)입니다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepositoryImpl.java`, `services/backend/src/main/java/com/everyones/lawmaking/repository/StatisticsRepository.java`

### EXPLORE-03 통계·분야 화면 어디에도 데이터 기준일이 없고 추이 차트는 빈 달을 생략함

- 분류: major · trust · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 2026-11-02에 보는 사용자에게 '최근 12개월' 차트가 2026-07에서 끝납니다. 기준일 표시가 없어 사용자는 8~10월 발의가 0건이라고 오해하거나 통계 전체를 현재 수치로 받아들입니다.
- 근거: StatsPanel.tsx:16-19 헤더는 '제22대 국회' 문자열과 calendar_month 아이콘만 표시. curl /v1/statistics/trend-detail?months=12 → 2025-08 ~ 2026-07. StatisticsRepository.java:58-66, 78-87 `GROUP BY ym ORDER BY ym DESC LIMIT :months` — 데이터가 있는 달만 세므로 빈 달은 0으로 나오지 않고 사라짐
- 수정안: 백엔드 통계 응답에 기준 시각(마지막 적재 법안 발의일 또는 집계 시각)을 넣고, StatsPanel 헤더의 '제22대 국회' 옆에 'YYYY.MM.DD 기준'으로 표시합니다. 추이 쿼리는 달력 기준 최근 N개월을 생성해 빈 달을 0으로 채웁니다. 파이프라인 정지 상태에서는 기준일이 오늘과 멀다는 것이 화면에서 바로 드러나게 합니다.
- 검증 메모: StatsPanel.tsx:16-19 헤더는 calendar_month 아이콘과 '제22대 국회'만 표시합니다. explore 코드에서 '기준'으로 grep하면 StatsResultComposition.tsx:68의 'n건 기준'만 나옵니다. 데이터 기준일 표시는 없습니다. StatisticsRepository.java:78-87은 데이터가 있는 달만 GROUP BY하고 LIMIT :months를 겁니다. curl trend-detail?months=12의 결과는 2025-08~2026-07입니다. 오늘(2026-11) 기준으로 비어 있는 2026-08~10은 0으로 나오지 않습니다. 그 세 달은 창에서 빠지고 창 전체가 과거로 밀립니다. 이 결함은 지금 운영 화면에 드러나 있습니다.
- 파일: `services/web/app/explore/components/StatsPanel.tsx`, `services/web/app/explore/components/StatsTrendArea.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/repository/StatisticsRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/service/StatisticsService.java`

### EXPLORE-05 '가결' 수치가 화면마다 828, 858, 896으로 다르고 같은 통계 패널에서 공포가 가결보다 많음

- 분류: major · data · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 통계 탭에서 KPI '가결 828건'과 퍼널 '공포 858건'이 함께 보입니다. 공포가 가결보다 많아 사용자는 통계 전체를 의심합니다. 타임라인 화면은 '가결법안 896'을 보여 줍니다.
- 근거: curl /v1/statistics/overview → passed_count 828 (StatisticsRepository.java:24 `billResult IN ('원안가결','수정가결')`). curl /v1/statistics/stage → promulgated_count 858 (StatisticsRepository.java:35 `stage = '공포'`). 타임라인 스크린샷 mcp-Claude_Browser-blob-1793624889136-21ughd.jpg '896 가결법안' (BillRepository.java findStateCount: stage IN ('정부이송','공포'))
- 수정안: '가결'의 정의를 하나로 정하고(예: billResult 정규화 값 기준) overview, stage, timeline 집계가 같은 조건 상수를 쓰게 합니다. 퍼널에는 '가결' 단계를 별도로 두거나 '공포'가 가결의 부분집합이 되도록 조건을 맞춥니다.
- 검증 메모: curl 값은 overview passed_count 828(원안가결 586 + 수정가결 242), stage promulgated_count 858, /v1/time-line/bill-state passed_count 896입니다. 각 기준은 StatisticsRepository.java:24, :35, BillRepository.java:157(stage IN ('정부이송','공포'))입니다. 같은 통계 패널에서 공포 858이 가결 828보다 많습니다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/StatisticsRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepository.java`, `services/web/app/explore/components/StatsStageFunnel.tsx`, `services/web/app/explore/components/StatsOverview.tsx`

### EXPLORE-06 처리 결과 구성 범례에 '수정가결 수정가결' 같은 오염된 결과값이 0.0% 항목으로 노출됨

- 분류: major · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 범례 11개 중 4개가 '수정가결 원안가결', '원안가결 원안가결'처럼 중복된 값이고 모두 0.0%로 보입니다. 사용자는 이를 데이터 오류로 인식합니다. 이 7건은 가결 수치에서도 빠집니다.
- 근거: curl /v1/statistics/result-breakdown → {'result':'수정가결 수정가결','count':3}, {'result':'수정가결 원안가결','count':2}, {'result':'원안가결 수정가결','count':1}, {'result':'원안가결 원안가결','count':1}. StatsResultComposition.tsx:46-51 알 수 없는 값을 EXTRA_PALETTE로 칠해 그대로 범례(85-93)에 출력. StatisticsRepository.java:24 정확 일치 조건이라 가결 집계에서 제외
- 수정안: 운영 DB의 bill_result 값을 정규화합니다(중복 토큰 제거 후 마지막 결과 또는 규칙에 따른 단일 값). 수집 파이프라인에서 같은 정규화를 적용합니다. 프런트는 0.1% 미만 항목을 '기타'로 합칩니다.
- 검증 메모: curl result-breakdown에 '수정가결 수정가결' 3건, '수정가결 원안가결' 2건, '원안가결 수정가결' 1건, '원안가결 원안가결' 1건이 있습니다. 전체 항목은 11개입니다. StatsResultComposition.tsx:47-51은 이 값을 EXTRA_PALETTE로 칠합니다. 85-93행은 이 값을 그대로 범례에 출력합니다. 3/17982는 toFixed(1)로 0.0%가 됩니다. StatisticsRepository.java:24의 IN 조건은 정확히 일치하는 값만 세므로 이 7건은 가결 집계에서 빠집니다.
- 파일: `services/web/app/explore/components/StatsResultComposition.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/repository/StatisticsRepository.java`

### EXPLORE-07 의석 좌석도와 의원 전체 목록의 정당별 인원이 서로 다름(298석·무소속 없음 vs 293명·무소속 8명)

- 분류: major · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 좌석도는 더불어민주당 170석, 진보당 3석, 재적 298석, 과반 150석을 보여 줍니다. 바로 아래 의원 목록에는 더불어민주당 156명, 진보당 4명, 무소속 8명이 있습니다. 무소속 의원은 좌석도에 아예 없습니다.
- 근거: curl /v1/party/parliamentary → 170+108+12+3+3+1+1=298, 무소속 없음. /v1/congressman/list page 0~16 전체 → 293명, Counter {'더불어민주당':156,'국민의힘':108,'조국혁신당':12,'무소속':8,'진보당':4,'개혁신당':3,'기본소득당':1,'사회민주당':1}. PartyRepository.java:39-44는 Party 엔티티의 districtCongressmanCount+proportionalCongressmanCount 저장값을 읽고, 목록은 CongressmanRepositoryCustom.java:26-52에서 congressman.state 실시간 값을 씀. SeatDistribution.tsx:43-44 total·majority를 정당 합계로 계산, 125·163행에 '재적'으로 표기
- 수정안: 원내 정당 의석 수를 congressman 테이블(state=true)에서 정당별로 집계하도록 바꿉니다. 무소속도 좌석도에 포함합니다. 재적 수와 과반 기준은 실제 현원 집계에서 계산합니다. 운영 Party 테이블의 저장값은 재계산하거나 제거합니다.
- 검증 메모: curl /v1/party/parliamentary의 합계는 298입니다(170·108·12·3·3·1·1). 무소속은 없습니다. /v1/congressman/list를 전 페이지(0~14) 받으면 293명입니다. 정당별 인원은 더불어민주당 156, 국민의힘 108, 조국혁신당 12, 무소속 8, 진보당 4, 개혁신당 3, 기본소득당 1, 사회민주당 1입니다. PartyRepository.java:39-44는 저장값 districtCongressmanCount와 proportionalCongressmanCount를 읽습니다. 이 저장값은 수동 POST /congressman/party/count(DataController.java:179)로만 갱신됩니다. SeatDistribution.tsx:43-44는 정당 합계로 '재적'과 과반을 계산합니다. 목록 293명도 발의 0건 의원이 빠진 수입니다(EXPLORE-08).
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/PartyRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/service/PartyService.java`, `services/web/app/explore/components/SeatDistribution.tsx`

### EXPLORE-08 의원 랭킹·목록의 '대표발의 n건'에 대수 조건과 적재 상태 조건이 없고, 발의 0건 의원은 목록에서 빠짐

- 분류: major · data · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: '윤준병 대표발의 594건'은 제22대 기준인지 사용자가 알 수 없습니다. 의원 건수 합계는 제22대 정당별 대표발의 합계보다 1만 건 이상 많습니다. 대표발의가 없는 현직 의원은 '의원 전체' 목록에 나오지 않습니다.
- 근거: CongressmanRepositoryCustom.java:26-52 representativeProposer.count()에 bill.assemblyNumber·ingestStatus 조건 없음, representativeProposer에서 inner join 시작. /v1/congressman/list 전체 propose_count 합계 28163 vs /v1/statistics/by-party 합계 17606. 윤준병 detail elected '재선'. MemberRanking.tsx:49, MemberList.tsx:59 '대표발의 n건'
- 수정안: 랭킹 쿼리를 congressman 기준 left join으로 바꾸고 bill.assemblyNumber=현재 대수, ingestStatus=READY 조건으로 셉니다. 화면 문구는 '22대 대표발의 n건'처럼 기준을 숫자 옆에 둡니다.
- 검증 메모: CongressmanRepositoryCustom.java:26-52는 representativeProposer에서 시작하는 inner join입니다. bill.assemblyNumber 조건과 ingestStatus 조건이 없습니다. curl list 전체의 propose_count 합계는 28163입니다. by-party(제22대 READY) 합계는 17606입니다. 윤준병 594건은 1위입니다. inner join이므로 대표발의가 없는 현직 의원은 목록에 나오지 않습니다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/CongressmanRepositoryCustom.java`, `services/web/app/explore/components/MemberRanking.tsx`, `services/web/app/explore/components/MemberList.tsx`

### EXPLORE-09 월별 추이의 '가결'이 발의월 기준이라 최근 달이 '가결 0건'으로 보임

- 분류: major · ux · 백엔드 · 작업량 M · 검증 adjusted
- 사용자 영향: 툴팁에 '2026년 7월 가결 0'이 보입니다. 사용자는 그 달에 국회가 법안을 하나도 가결하지 않았다고 읽습니다. 실제 값은 '그 달에 발의된 법안 중 나중에 가결된 수'입니다.
- 근거: StatisticsRepository.java:78-87 passed를 propose_date의 월로 묶음. curl /v1/statistics/trend-detail?months=12 → 2026-06 passed_count 0, 2026-07 passed_count 0. StatsTrendArea.tsx:25-28 범례 라벨 '가결', 제목 '월별 발의·가결 추이'
- 수정안: 의결일 기준 집계는 지금 할 수 없습니다. Bill 엔티티에 의결일 필드가 없기 때문입니다. 이 방법을 쓰려면 수집 파이프라인에 의결일 적재를 추가해야 합니다. 이 변경은 스키마와 백필이 필요한 별도 작업입니다. 지금 바로 적용할 방법은 시리즈 이름을 '해당 월 발의 중 가결'로 바꾸는 것입니다. 바꾼 이름은 범례, 툴팁, 제목에 같이 씁니다.
- 검증 메모: StatisticsRepository.java:78-87은 passed를 propose_date의 월로 묶습니다. curl trend-detail에서 2026-06과 2026-07의 passed_count는 0입니다. StatsTrendArea.tsx:27의 라벨은 '가결'이고 70행의 제목은 '월별 발의·가결 추이'입니다. Bill 엔티티에는 날짜 필드가 proposeDate(Bill.java:70) 하나뿐입니다. 의결일 필드가 없습니다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/StatisticsRepository.java`, `services/web/app/explore/components/StatsTrendArea.tsx`

### EXPLORE-11 탐색 화면에 오류 상태가 없음: 일부는 조용히 사라지고, 목록 오류는 페이지 전체를 오류 화면으로 바꿈

- 분류: major · bug · 작업량 M · 검증 confirmed
- 사용자 영향: API가 실패하면 분야 그리드는 제목만 남고 빈 공간이 됩니다. 통계 탭은 '제22대 국회' 한 줄만 남습니다. 분야 법안 목록이나 의원 목록 요청이 실패하면 탐색 페이지 전체가 '페이지가 작동하지 않습니다' 화면으로 바뀝니다.
- 근거: app/explore에 error.tsx·ErrorBoundary 없음(grep 결과). CategoryGrid.tsx:13-21 isError 처리 없음, SeatDistribution.tsx:99 `if (total === 0) return null`, MemberRanking.tsx:17, StatsOverview.tsx:92 `if (!overview) return null`, StatsStageFunnel.tsx:40, PartyList.tsx:14-22. CategoryBills·MemberList는 useSuspenseInfiniteQuery(queries.ts:47-57, 110-120)라 오류가 app/error.tsx까지 전파
- 수정안: 섹션 단위 ErrorBoundary(QueryErrorResetBoundary 연동)를 FieldPanel의 CategoryBills, AssemblyPanel의 MemberList에 둡니다. useQuery 섹션은 isError일 때 같은 크기의 카드 안에 짧은 실패 문구와 '다시 시도' 버튼을 보여 줍니다. 공용 SectionError 컴포넌트 하나를 만들어 모든 섹션이 재사용합니다.
- 검증 메모: app/explore에는 error.tsx가 없습니다. 오류는 app/error.tsx('페이지가 작동하지 않습니다.', 27행)까지 올라갑니다. CategoryGrid.tsx:13-21은 isError를 처리하지 않습니다. 오류가 나면 빈 grid div가 남습니다. StatsOverview.tsx:92, StatsStageFunnel.tsx:40, SeatDistribution.tsx:99, MemberRanking.tsx:17, StatsResultComposition.tsx:44는 오류일 때 null을 돌려줍니다. 그러면 StatsPanel.tsx:16-19의 '제22대 국회' 헤더만 남습니다. useGetBillsByCategory와 useGetCongressmanList(queries.ts:47-57, 110-120)는 useSuspenseInfiniteQuery라서 오류를 throw합니다.
- 파일: `services/web/app/explore/components/FieldPanel.tsx`, `services/web/app/explore/components/AssemblyPanel.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`, `services/web/app/explore/components/SeatDistribution.tsx`, `services/web/app/explore/components/MemberRanking.tsx`, `services/web/app/explore/components/PartyList.tsx`, `services/web/app/explore/components/StatsOverview.tsx`, `services/web/app/explore/components/StatsStageFunnel.tsx`

### EXPLORE-13 분야 카드를 누르면 결과가 17개 카드 아래에 생겨 모바일에서 보이지 않고, 선택을 해제할 수 없음

- 분류: major · ux · 작업량 M · 검증 confirmed
- 사용자 영향: 모바일 2열 그리드는 9줄입니다. 위쪽 카드를 누르면 화면 밖 아래에 목록이 생겨 사용자는 아무 일도 일어나지 않았다고 느낍니다. 같은 카드를 다시 눌러도 선택이 풀리지 않습니다.
- 근거: FieldPanel.tsx:16-35 선택 결과 section을 그리드 뒤에 렌더, scrollIntoView 등 이동 코드 없음. FieldPanel.tsx:18 onSelect={setSelected}로 같은 값 재설정만 함. CategoryGrid.tsx:21 `grid-cols-2`
- 수정안: 분야 선택을 별도 화면(/explore/category/[code])으로 이동시키거나, 선택 시 결과 섹션으로 스크롤하고 그리드는 선택 분야 칩 한 줄로 접습니다. 같은 카드를 다시 누르면 선택을 해제합니다.
- 검증 메모: FieldPanel.tsx:21-35는 선택 결과 섹션을 그리드 뒤에 렌더합니다. scrollIntoView 같은 이동 코드는 없습니다. 18행 onSelect={setSelected}는 같은 값을 다시 넣으므로 선택이 풀리지 않습니다. CategoryGrid.tsx:21은 grid-cols-2이고 카드는 17개입니다. 모바일에서는 9줄이 됩니다.
- 파일: `services/web/app/explore/components/FieldPanel.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`

### EXPLORE-04 추이 차트의 '전체' 버튼이 실제로는 24개월이라 제22대 첫 3개월이 빠짐

- 분류: minor · bug · 백엔드 · 작업량 S · 검증 adjusted
- 사용자 영향: '전체'를 누른 사용자는 제22대 국회 전 기간을 본다고 생각하지만 2024-05~2024-07 발의(개원 직후 집중 발의 기간 포함)가 빠져 있습니다.
- 근거: StatsTrendArea.tsx:18-22 `{ months: 24, label: '전체' }`. curl /v1/statistics/trend-detail?months=40 → 27행, 첫 행 {'month':'2024-05','proposed_count':68}, 마지막 '2026-07'
- 수정안: '전체'는 months 파라미터 대신 대수 시작일부터 집계하는 별도 모드(예: months=0 또는 range=all)로 요청합니다. 백엔드는 제22대 첫 달부터 마지막 달까지 빈 달을 채워 반환합니다.
- 검증 메모: StatsTrendArea.tsx:21에 { months: 24, label: '전체' }가 있습니다. curl trend-detail?months=40은 27행을 돌려줍니다. 첫 행은 2024-05입니다. 따라서 '전체'를 눌러도 2024-05~07(68·1058·1099건)이 빠집니다. 이 부분은 확인했습니다. 다만 차트 모양은 정상으로 보입니다. 사용자가 누락을 알아채기 어렵고 기능도 동작합니다. 그래서 심각도를 minor로 낮춥니다.
- 파일: `services/web/app/explore/components/StatsTrendArea.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/service/StatisticsService.java`

### EXPLORE-10 정당별 발의·가결 차트에서 가결 구간이 막대의 1~2%라 보이지 않고, 정당 가결률이 모두 전체 가결률보다 낮음

- 분류: minor · data · 백엔드 · 작업량 M · 검증 adjusted
- 사용자 영향: 더불어민주당 막대의 가결 부분은 1.9% 폭이라 화면에서 구분되지 않습니다. 수치는 hover 툴팁에만 있어 모바일에서는 확인이 어렵습니다. 정당 가결률(1.9%, 2.3% 등)이 KPI 가결률 4.6%보다 모두 낮아 사용자는 숫자를 맞춰 볼 수 없습니다.
- 근거: curl /v1/statistics/party-performance → 더불어민주당 count 10489 passed 195 (1.9%), 국민의힘 5792/134 (2.3%), 정당 passed 합계 342 vs overview passed 828. StatsPartyPerformance.tsx:62 subtitle '진한 색 = 가결', 112-122 스택 막대, 82-108 수치는 툴팁 formatter 안에만 존재
- 수정안: 정당 행마다 '발의 n건 · 가결 n건(n%)'을 막대 옆 텍스트로 항상 표시하고, 가결률은 별도 점 또는 짧은 막대로 0~최댓값 축에 그립니다. 위원장 대안처럼 정당에 귀속되지 않는 가결 486건은 '정당 미귀속' 행으로 따로 보여 합계가 KPI와 맞게 합니다.
- 검증 메모: curl party-performance 값은 더불어민주당 10489/195(1.9%), 국민의힘 5792/134(2.3%)입니다. 정당 passed 합계는 342입니다. overview는 828입니다. 차이 486건은 대표발의 의원이 없는 법안입니다. by-committee의 '-' 항목은 passed 267입니다. 수치는 StatsPartyPerformance.tsx:82-108의 툴팁 안에만 있습니다. 이 부분은 확인했습니다. 막대의 가결 구간은 몇 px로 좁지만 있습니다. Recharts 툴팁은 탭해도 열립니다. 기능은 동작합니다. 그래서 심각도를 minor로 낮춥니다.
- 파일: `services/web/app/explore/components/StatsPartyPerformance.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/repository/StatisticsRepository.java`

### EXPLORE-12 인기 키워드 기능이 운영에서 데이터 0건이라 화면에 나오지 않고, '지금 뜨는'이라는 이름과 달리 기간 조건이 없음

- 분류: minor · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 adjusted
- 사용자 영향: 분야 탭 첫 섹션으로 설계된 키워드 탐색이 사용자에게 보이지 않습니다. 데이터가 채워지더라도 전 기간 누적 빈도라서 '지금 뜨는' 키워드가 아닙니다.
- 근거: curl /v1/bill/trending-keywords?size=12 → {"data":[]}. TrendingKeywords.tsx:14 `if (keywords.length === 0) return null`, 20행 제목 '지금 뜨는 키워드'. BillRepository.java:163-172 findTopTrendingKeywords에 propose_date 조건 없음
- 수정안: 운영 DB의 summary_tags를 채우는 작업을 돌립니다. 쿼리에 최근 N일(예: 최근 적재일 기준 30일) 조건을 넣습니다. 데이터 기준 기간을 제목 옆에 표시합니다.
- 검증 메모: curl trending-keywords?size=12는 data []를 돌려줍니다. TrendingKeywords.tsx:14는 키워드가 없으면 null을 돌려줍니다. 20행의 제목은 '지금 뜨는 키워드'입니다. BillRepository.java:163-172에는 propose_date 조건이 없습니다. 이 부분은 확인했습니다. 지금은 섹션이 깨끗하게 숨겨집니다. 사용자는 깨진 화면을 보지 않습니다. 그래서 심각도를 minor로 낮춥니다. '지금 뜨는'과 기간 조건이 맞지 않는 문제는 데이터를 채우면 드러나는 잠재 결함입니다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepository.java`, `services/web/app/explore/components/TrendingKeywords.tsx`

### EXPLORE-14 탭·분야·기간 선택이 URL에 남지 않아 공유·새로고침·뒤로 가기에서 초기화됨

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: '통계' 탭 링크를 공유해도 받는 사람은 '분야' 탭을 봅니다. 법안 상세로 갔다가 뒤로 오면 선택한 분야와 스크롤 위치가 사라집니다. 탭을 바꿨다 돌아오면 선택 분야, 추이 기간이 초기화되고 카운트업 애니메이션이 다시 재생됩니다.
- 근거: ExploreBoard.tsx:12 `useState<ExploreTab>('field')`, 22-24 조건부 렌더로 패널 unmount. FieldPanel.tsx:10 useState, StatsTrendArea.tsx:43 useState. curl https://lawdigest.kr/explore?tab=stats → 200이지만 searchParams를 읽는 코드 없음
- 수정안: tab, category, period를 useSearchParams와 router.replace로 URL 쿼리에 동기화합니다. 패널은 URL 값에서 초기 상태를 읽습니다.
- 검증 메모: ExploreBoard.tsx:12는 useState('field')입니다. 22-24행은 조건부 렌더라서 탭을 바꾸면 패널이 unmount됩니다. FieldPanel.tsx:10과 StatsTrendArea.tsx:43도 로컬 state입니다. page.tsx는 searchParams를 읽지 않습니다.
- 파일: `services/web/app/explore/components/ExploreBoard.tsx`, `services/web/app/explore/components/FieldPanel.tsx`, `services/web/app/explore/components/StatsTrendArea.tsx`

### EXPLORE-15 Material Symbols 아이콘에 aria-hidden이 없어 스크린리더가 'account_balance', 'payments' 같은 영문 리거처를 읽음

- 분류: minor · a11y · 작업량 S · 검증 adjusted
- 사용자 영향: 스크린리더 사용자는 사이드바 버튼을 'tag 분야', 'account_balance 국회'로 듣고, 분야 카드를 'payments 경제·세금'으로, 통계 제목을 'filter_alt 입법 진행 단계'로 듣습니다.
- 근거: ExploreSidebar.tsx:33, CategoryGrid.tsx:51, FieldPanel.tsx:24, TrendingKeywords.tsx:19, MemberRanking.tsx:22, StatsCard.tsx:32, StatsOverview.tsx:114, StatsPanel.tsx:17, PartyList.tsx:54, SeatDistribution.tsx:195 — 모두 <span className="material-symbols-outlined"> 에 aria-hidden 없음
- 수정안: 공용 Icon 컴포넌트를 만들어 기본으로 aria-hidden="true"를 붙이고 탐색 화면의 모든 아이콘 span을 교체합니다.
- 검증 메모: explore 안의 material-symbols-outlined span 10곳에 aria-hidden이 없습니다(grep). 예외가 하나 있습니다. SeatDistribution.tsx:195는 aria-label='정당 포커스 해제'가 있는 버튼 안에 있습니다. 버튼 이름이 대체되므로 이 아이콘은 읽히지 않습니다. 나머지는 리거처 문자열이 접근 가능한 이름에 들어갑니다. 소음은 생기지만 조작은 막지 않습니다. 그래서 심각도를 minor로 낮춥니다.
- 파일: `services/web/app/explore/components/ExploreSidebar.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`, `services/web/app/explore/components/StatsCard.tsx`, `services/web/app/explore/components/StatsOverview.tsx`, `services/web/app/explore/components/FieldPanel.tsx`, `services/web/app/explore/components/TrendingKeywords.tsx`, `services/web/app/explore/components/MemberRanking.tsx`, `services/web/app/explore/components/PartyList.tsx`

### EXPLORE-16 보조 문구와 정당 칩의 명도 대비가 WCAG AA(4.5:1)에 못 미침

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 저시력 사용자나 야외 모바일 사용자는 분야 카드 건수, 차트 부제, KPI 라벨, 정당 칩 글자를 읽기 어렵습니다. 다크 모드에서 더불어민주당 이름 텍스트와 좌석 점은 배경과 거의 구분되지 않습니다.
- 근거: text-gray-2(#999999) on #FFFFFF = 2.85:1 — CategoryGrid.tsx:55, StatsCard.tsx:35, StatsOverview.tsx:113, SeatDistribution.tsx:124·163(10px). 흰 글자 정당 칩 MemberList.tsx:54-58: 기본소득당 #00D2C3 1.91:1, 개혁신당 #FF7210 2.74:1, 사회민주당 #F58400 2.57:1. MemberRanking.tsx:45 정당명 텍스트 색 #152484 on dark-b #101012 = 1.46:1. MemberRanking.tsx:10 3위 배지 bg-gray-2 흰 글자 2.85:1
- 수정안: 12~13px 보조 문구는 text-gray-3(#555555) 이상을 씁니다. 정당 칩은 정당색 점과 중립 글자색 조합으로 바꾸거나 정당색 배경일 때 대비에 따라 글자색을 고르는 유틸을 party 레지스트리에 둡니다. 다크 모드에서는 정당명 텍스트에 정당색을 쓰지 않습니다.
- 검증 메모: tailwind.config.js:47에서 gray-2는 #999999입니다. 흰 배경 대비는 2.85:1입니다. MemberList.tsx:54-58의 흰 글자 칩 대비는 기본소득당 #00D2C3 1.91:1, 개혁신당 #FF7210 2.74:1, 사회민주당 #F58400 2.57:1입니다(party.ts:98·103·108). MemberRanking.tsx:45의 정당명 글자색 #152484는 dark-b #101012 위에서 1.46:1입니다. 10행 3위 배지 bg-gray-2 위 흰 글자는 2.85:1입니다.
- 파일: `services/web/app/explore/components/MemberList.tsx`, `services/web/app/explore/components/MemberRanking.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`, `services/web/app/explore/components/StatsCard.tsx`, `services/web/constants/party/party.ts`

### EXPLORE-17 차트에 키보드 포커스 표시와 텍스트 대체 수단이 없음

- 분류: minor · a11y · 작업량 M · 검증 adjusted
- 사용자 영향: 키보드 사용자는 차트에 포커스가 들어가도 위치를 볼 수 없습니다. 스크린리더 사용자는 수치를 얻을 방법이 없습니다. 범례 강조는 마우스 hover로만 동작합니다. 좌석 원은 마우스로만 누를 수 있습니다.
- 근거: components/ui/chart.tsx:108 `[&_.recharts-surface]:outline-none [&_.recharts-layer]:outline-none`, chart.tsx:292-293 범례는 onMouseEnter/onMouseLeave만 있음. SeatDistribution.tsx:132-155 role="img" svg 안에 클릭 가능한 motion.circle(키보드 핸들러 없음, 범례 버튼 254-271이 대체 경로). StatsCategoryDonut.tsx:105-124 범례가 button인데 onClick 없음
- 수정안: 도넛 범례의 키보드 강조는 이미 동작합니다. 도넛에 남은 문제는 onClick 없는 button 요소입니다. 이 요소는 목록 요소로 바꾸거나 클릭 시 분야 목록으로 이동하게 합니다. onFocus와 onBlur 연결은 chart.tsx ChartLegendContent에만 하면 됩니다.
- 검증 메모: chart.tsx:108에 [&_.recharts-surface]:outline-none과 [&_.recharts-layer]:outline-none이 있습니다. recharts 3.9.2(package.json:65)는 accessibilityLayer가 기본으로 켜져 있어 surface가 포커스를 받습니다. outline-none 때문에 포커스 표시가 보이지 않습니다. chart.tsx:292-293 범례에는 onMouseEnter와 onMouseLeave만 있습니다. SeatDistribution.tsx:142-152의 motion.circle에는 키보드 핸들러가 없습니다. 보고에서 틀린 부분이 있습니다. StatsCategoryDonut.tsx:111-112 범례에는 이미 onFocus와 onBlur가 있습니다. 도넛 범례는 키보드로도 강조됩니다.
- 파일: `services/web/components/ui/chart.tsx`, `services/web/app/explore/components/StatsCard.tsx`, `services/web/app/explore/components/StatsCategoryDonut.tsx`, `services/web/app/explore/components/SeatDistribution.tsx`

### EXPLORE-18 탭과 세그먼트의 ARIA 구조가 불완전함

- 분류: minor · a11y · 작업량 M · 검증 confirmed
- 사용자 영향: 스크린리더는 사이드바 버튼을 '현재 페이지'로 안내하지만 실제로는 같은 페이지 안의 패널 전환입니다. 탭 목록에서 화살표 키로 이동할 수 없고, 탭이 어떤 패널을 여는지 연결 정보가 없습니다.
- 근거: ExploreSidebar.tsx:23 button에 aria-current="page". ExploreSubTabs.tsx:18-29, AssemblySegment.tsx:18-30, StatsTrendArea.tsx:73-79 role=tablist/tab만 있고 aria-controls·role=tabpanel·화살표 키 처리 없음. SeatDistribution.tsx:258-266 범례 토글 버튼에 aria-pressed 없음
- 수정안: 사이드바는 aria-current 대신 탭 패턴(또는 aria-pressed)을 씁니다. 탭 컴포넌트 하나를 만들어 aria-controls, tabpanel id, 좌우 화살표·Home·End 이동, roving tabindex를 구현하고 세 곳이 재사용합니다. 의석 범례 버튼에 aria-pressed를 붙입니다.
- 검증 메모: ExploreSidebar.tsx:23은 button에 aria-current='page'를 붙입니다. ExploreSubTabs.tsx:13-29, AssemblySegment.tsx:18-30, StatsTrendArea.tsx:73-79에는 role=tablist와 role=tab만 있습니다. aria-controls, tabpanel, 화살표 키 처리가 없습니다. SeatDistribution.tsx:258-266 범례 버튼에는 aria-pressed가 없습니다.
- 파일: `services/web/app/explore/components/ExploreSidebar.tsx`, `services/web/app/explore/components/ExploreSubTabs.tsx`, `services/web/app/explore/components/AssemblySegment.tsx`, `services/web/app/explore/components/StatsTrendArea.tsx`, `services/web/app/explore/components/SeatDistribution.tsx`

### EXPLORE-19 페이지에 h1이 없고 main 랜드마크가 중첩됨

- 분류: minor · a11y · 작업량 S · 검증 adjusted
- 사용자 영향: 스크린리더 사용자가 제목 목록으로 이동하면 페이지 제목이 없습니다. 피드·타임라인은 큰 페이지 제목이 있지만 탐색은 없어 화면 간 구조가 다릅니다.
- 근거: curl https://lawdigest.kr/explore → <h1> 0개, <main> 2개. app/layout.tsx:87 <main> 안에 ExploreBoard.tsx:21 <main>. 피드 스크린샷 mcp-Claude_Browser-blob-1793624862489-f5jpeo.jpg '피드' 제목, 탐색 스크린샷 ccvvx2.jpg 제목 없음
- 수정안: h1 누락은 탐색만의 문제가 아닙니다. 피드에도 h1이 없으므로 화면 공통 페이지 제목 규칙으로 고칩니다. 중첩 main은 루트 layout.tsx:87의 main 때문에 생깁니다. 루트를 div로 바꿀지, 각 페이지의 main을 없앨지 하나로 정해 사이트 전체에 적용합니다.
- 검증 메모: curl https://lawdigest.kr/explore 결과 h1은 0개이고 main은 2개입니다. 바깥 main은 app/layout.tsx:87에 있고 안쪽 main은 ExploreBoard.tsx:21에 있습니다. 보고의 비교 근거는 틀렸습니다. curl https://lawdigest.kr/ 피드 SSR HTML에도 h1이 없습니다. '피드는 큰 제목이 있다'는 HTML 구조로 뒷받침되지 않습니다.
- 파일: `services/web/app/explore/components/ExploreBoard.tsx`, `services/web/app/explore/components/ExploreSidebar.tsx`

### EXPLORE-20 로딩 표현이 탭마다 다르고 섹션이 순서대로 튀어나오며 레이아웃이 이동함

- 분류: minor · perf · 작업량 M · 검증 confirmed
- 사용자 영향: 분야 탭은 '분야를 불러오는 중…' 한 줄이 17개 카드로 바뀌며 화면이 크게 밀립니다. 국회 탭은 좌석도와 랭킹이 데이터가 올 때까지 아무것도 그리지 않다가 나타나 아래 목록이 밀립니다. 통계 탭만 스켈레톤을 씁니다.
- 근거: curl https://lawdigest.kr/explore SSR HTML에 '<div class="py-10 text-center text-[14px] text-gray-2">분야를 불러오는 중…</div>' 포함. CategoryGrid.tsx:16-18, PartyList.tsx:17-19, FieldPanel.tsx:31 텍스트 로딩. SeatDistribution.tsx:99, MemberRanking.tsx:17 로딩 중 null. page.tsx:3 force-dynamic이지만 서버 prefetch 없음
- 수정안: StatsSkeleton의 SkeletonBar로 카드 그리드·좌석도·랭킹·정당 목록 스켈레톤을 최종 크기와 같게 만듭니다. page.tsx에서 분야 건수와 원내 정당을 서버에서 prefetch하고 HydrationBoundary로 넘깁니다.
- 검증 메모: curl explore SSR HTML에 '<div class="py-10 text-center text-[14px] text-gray-2">분야를 불러오는 중…</div>'가 있습니다. CategoryGrid.tsx:16-18, PartyList.tsx:17-19, FieldPanel.tsx:31은 텍스트로 로딩을 표시합니다. SeatDistribution.tsx:99와 MemberRanking.tsx:17은 로딩 중에 null을 돌려줍니다. 통계 컴포넌트는 SkeletonBar를 씁니다. page.tsx에는 서버 prefetch가 없습니다.
- 파일: `services/web/app/explore/page.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`, `services/web/app/explore/components/PartyList.tsx`, `services/web/app/explore/components/FieldPanel.tsx`, `services/web/app/explore/components/SeatDistribution.tsx`, `services/web/app/explore/components/MemberRanking.tsx`

### EXPLORE-21 섹션 이름 레이블, 설명 캡션, 반복 문구가 화면에 남아 있음

- 분류: minor · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 같은 정보가 두 번 보이고 레이블이 내용을 밀어내 화면이 설명서처럼 보입니다.
- 근거: ExploreSidebar.tsx:15 섹션 레이블 '탐색'(상단 내비 활성 탭과 중복). FieldPanel.tsx:17 '분야별 둘러보기'(사이드바 '분야'와 중복). CategoryGrid.tsx:55 '관련 법안' 17회 반복. SeatDistribution.tsx:124-126 '재적 298석 · 과반 150석'과 160-163 중앙 '298 재적 의석' 중복, 226-228 '의석수' 라벨 + '석' 단위 중복. StatsPartyPerformance.tsx:62 캡션 '진한 색 = 가결'. StatsPanel.tsx:16-19 '제22대 국회'에 calendar_month 아이콘(날짜가 아님)
- 수정안: 사이드바 '탐색' 레이블과 '분야별 둘러보기' 제목을 지웁니다. 카드 건수는 숫자와 '건'만 남깁니다. 좌석도 중앙 숫자를 지우고 헤더 한 곳에만 둡니다. '진한 색 = 가결'은 막대 옆 수치 라벨(EXPLORE-10)로 대체합니다. StatsPanel 헤더는 기준일(EXPLORE-03)로 바꿉니다.
- 검증 메모: ExploreSidebar.tsx:15에 '탐색' 레이블이 있습니다. 같은 이름이 상단 내비 config/site.ts:31의 '탐색'에 있습니다. FieldPanel.tsx:17에는 '분야별 둘러보기'가 있습니다. CategoryGrid.tsx:55에는 '관련 법안 n건'이 17개 카드마다 반복됩니다. SeatDistribution.tsx:124-126의 '재적 n석 · 과반'과 160-163의 중앙 '재적 의석'이 같은 내용을 반복합니다. 226-228에는 '의석수' 라벨과 '석' 단위가 함께 있습니다. StatsPartyPerformance.tsx:62에는 '진한 색 = 가결'이 있습니다.
- 파일: `services/web/app/explore/components/ExploreSidebar.tsx`, `services/web/app/explore/components/FieldPanel.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`, `services/web/app/explore/components/SeatDistribution.tsx`, `services/web/app/explore/components/StatsPartyPerformance.tsx`, `services/web/app/explore/components/StatsPanel.tsx`

### EXPLORE-22 의원 전체 목록에 검색·정당 필터·지역구 정보가 없어 내 지역 의원을 찾을 수 없음

- 분류: minor · ux · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 293명을 발의 건수 순으로만 스크롤해야 합니다. 시민이 가장 자주 찾는 '내 지역구 의원'을 찾을 방법이 없습니다. 좌석도에서 정당을 눌러도 목록은 그대로입니다. 상위 3명 랭킹 카드는 바로 아래 목록의 첫 3명과 같습니다.
- 근거: queries.ts:47-57 useGetCongressmanList(partyId) 지원, apis.ts:49-53 party_id 파라미터 지원, MemberList.tsx:14 인자 없이 호출. MemberList.tsx:51-60 카드에 이름·정당·건수만 표시. MemberRanking과 MemberList 모두 /congressman/ranking·/list 같은 정렬(CongressmanRepositoryCustom.java:49)
- 수정안: 목록 위에 이름·지역구 검색 입력과 정당 칩 필터를 둡니다. 좌석도의 정당 포커스 상태를 목록 필터와 연결합니다. 카드에 지역구(또는 비례대표)를 표시합니다. 백엔드 list에 name·district 검색 파라미터를 추가합니다.
- 검증 메모: MemberList.tsx:14는 useGetCongressmanList()를 인자 없이 호출합니다. queries.ts:47과 apis.ts:49-53은 partyId를 지원합니다. curl list 응답 필드에 district가 없습니다. 랭킹과 목록은 같은 쿼리와 정렬을 씁니다(CongressmanRepositoryCustom.java:49). 그래서 랭킹 상위 3명(윤준병·이수진·김성원)은 목록의 첫 3명과 같습니다.
- 파일: `services/web/app/explore/components/MemberList.tsx`, `services/web/app/explore/components/AssemblyPanel.tsx`, `services/web/app/explore/components/SeatDistribution.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/repository/CongressmanRepositoryCustom.java`

### EXPLORE-23 위원회별 집계가 이전·현재 명칭으로 나뉘어 상위 8개 순위가 왜곡됨

- 분류: minor · data · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: '환경노동위원회'(648)와 '기후에너지환경노동위원회'(700)가 따로 집계되어 둘 다 상위 8개에서 빠집니다. 합치면 1,348건으로 3위입니다. '기획재정위원회'(735)와 '재정경제기획위원회'(542)도 나뉘어 있습니다.
- 근거: curl /v1/statistics/by-committee → 기후에너지환경노동위원회 700, 환경노동위원회 648, 기획재정위원회 735, 재정경제기획위원회 542, 여성가족위원회 71, 성평등가족위원회 84, '-' 442(passed 267). StatsCommitteeBars.tsx:9 TOP_N=8, 35행 slice
- 수정안: 위원회 명칭 변경 매핑 테이블을 백엔드에 두고 집계 시 현재 명칭으로 합칩니다. '-' 값은 수집 단계에서 정리하거나 집계에서 제외합니다. 매핑 근거(국회 위원회 개편 일자)를 주석으로 남깁니다.
- 검증 메모: curl by-committee 결과는 기후에너지환경노동위원회 700, 환경노동위원회 648, 기획재정위원회 735, 재정경제기획위원회 542, 여성가족위원회 71, 성평등가족위원회 84, '-' 442입니다. 지금 상위 8개 중 8위는 산업통상자원중소벤처기업위원회 702입니다. 그래서 기후에너지환경노동위원회 700은 빠집니다. 두 이름을 합친 1348은 3위가 됩니다. StatsCommitteeBars.tsx:9 TOP_N은 8입니다. StatisticsRepository.java:96은 '-'를 제외하지 않습니다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/StatisticsRepository.java`, `services/web/app/explore/components/StatsCommitteeBars.tsx`

### EXPLORE-24 분야별 분포 도넛에서 '기타'가 가장 큰 조각이고 미분류 법안 비중은 보이지 않음

- 분류: minor · visual · 작업량 M · 검증 confirmed
- 사용자 영향: 11개 분야를 묶은 '기타'가 약 42%로 가장 큰 조각이 됩니다. 도넛이 분야 분포를 보여 주지 못합니다. 제22대 법안의 26%가 미분류라는 사실은 어디에도 나오지 않습니다.
- 근거: StatsCategoryDonut.tsx:13 TOP_N=6, 43-53 나머지를 '기타'로 합침. /v1/statistics/by-category 상위 6개 합 7703, 나머지 5528(13231 중 41.8%). 94행 중앙 라벨 '분류된 법안'
- 수정안: 17개 분야 전체를 가로 막대(정렬된 순위)로 바꾸고 막대를 누르면 분야 법안 목록으로 이동하게 합니다. 미분류 건수를 마지막 회색 막대로 표시합니다.
- 검증 메모: StatsCategoryDonut.tsx:13 TOP_N은 6이고 43-53행에서 나머지를 '기타'로 합칩니다. by-category 상위 6개 합계는 7703입니다. 나머지 11개 합계는 5528이고 13231의 41.8%입니다. 이 값은 단일 조각 중 가장 큽니다. 1위 economy는 2406입니다. 미분류 4751건은 API에서 제외되어 화면에 없습니다.
- 파일: `services/web/app/explore/components/StatsCategoryDonut.tsx`

### EXPLORE-26 다크 모드 카드 배경이 페이지 배경과 같거나 반전되고, 정보 카드 전체에 그림자가 있음

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 모바일 다크 모드에서 카드와 배경이 같은 색이라 얇은 테두리로만 구분됩니다. 데스크톱 다크 모드에서는 카드가 배경보다 더 어두워 층위가 뒤집혀 보입니다.
- 근거: app/layout.tsx:81 body `dark:bg-dark-b dark:lg:bg-dark-pb`. 카드 `dark:bg-dark-b`: StatsCard.tsx:27, CategoryGrid.tsx:33, SeatDistribution.tsx:121, MemberList.tsx:43, StatsOverview.tsx:83·110. DESIGN.md 'Dark Reading Layer'는 패널에 dark-panel(#1E1E1E) 사용, 'The Flat Trust Rule'은 정보 카드 shadow none — 위 카드 모두 shadow-sm
- 수정안: 탐색 카드 공용 클래스(또는 Card 컴포넌트)를 만들어 다크 모드는 dark:bg-dark-pb, 페이지는 dark-b로 고정합니다. 정보 카드의 shadow-sm을 제거하고 테두리로만 구분합니다.
- 검증 메모: app/layout.tsx:81 body는 dark:bg-dark-b dark:lg:bg-dark-pb입니다. 카드는 dark:bg-dark-b입니다(StatsCard.tsx:27, CategoryGrid.tsx:33, SeatDistribution.tsx:121, MemberList.tsx:43, StatsOverview.tsx:83·110). 모바일에서는 카드와 배경이 둘 다 #101012입니다. 데스크톱에서는 카드 #101012가 배경 #1E1E1E보다 어둡습니다. DESIGN.md:205 Flat Trust Rule과 227행은 정보 카드에 shadow none을 요구합니다. 위 카드는 모두 shadow-sm을 씁니다.
- 파일: `services/web/app/explore/components/StatsCard.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`, `services/web/app/explore/components/SeatDistribution.tsx`, `services/web/app/explore/components/MemberList.tsx`, `services/web/app/explore/components/MemberRanking.tsx`, `services/web/app/explore/components/PartyList.tsx`, `services/web/app/explore/components/StatsOverview.tsx`

### EXPLORE-28 페이지 제목·설명·공유 미리보기가 탐색 화면 내용을 반영하지 않음

- 분류: minor · seo · 작업량 S · 검증 adjusted
- 사용자 영향: 브라우저 탭과 검색 결과에 '탐색 페이지'만 보이고 서비스 이름이 없습니다. 링크를 공유하면 미리보기가 루트 URL과 '자연어 처리 기술을 이용한 법률 개정안 요약 플랫폼'이라는 기술 설명을 보여 줍니다. 설명은 분야만 언급하고 국회·통계는 빠져 있습니다.
- 근거: curl https://lawdigest.kr/explore → <title>탐색 페이지</title>, description '생활 분야별로 법안을 탐색합니다.', og:url 'https://www.lawdigest.kr', og:title '모두의입법', og:description '자연어 처리 기술을 이용한 법률 개정안 요약 플랫폼'. app/explore/layout.tsx:4-7, app/layout.tsx:20 title template 없음
- 수정안: metadataBase 설정 단계는 뺍니다. app/layout.tsx:19에 이미 new URL(siteConfig.url)로 설정되어 있습니다. 남은 작업은 세 가지입니다. title.template을 둡니다. explore title을 '탐색'으로 바꿉니다. explore openGraph의 url, title, description을 지정합니다.
- 검증 메모: curl /explore 결과에서 title은 '탐색 페이지'이고 description은 '생활 분야별로 법안을 탐색합니다.'입니다. og:url은 https://www.lawdigest.kr, og:description은 '자연어 처리 기술을 이용한 법률 개정안 요약 플랫폼'입니다. app/explore/layout.tsx:4-7과 app/layout.tsx:20(title: siteConfig.title 문자열, template 없음)을 확인했습니다. 다만 metadataBase는 app/layout.tsx:19에 이미 설정되어 있습니다.
- 파일: `services/web/app/explore/layout.tsx`, `services/web/app/layout.tsx`

### EXPLORE-25 통계 2열 그리드 카드 높이가 제각각이고 분야 그리드 마지막 줄에 카드 1개만 남음

- 분류: polish · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 데스크톱 통계 탭에서 카드 옆에 큰 빈 공간이 생겨 정렬이 흐트러져 보입니다. 분야 그리드는 4열에서 17번째 카드 하나만 마지막 줄에 남습니다.
- 근거: StatsPanel.tsx:25 `grid ... items-start lg:grid-cols-2`, 차트 높이 StatsStageFunnel 190px, StatsResultComposition 52px+범례, StatsPartyPerformance rows*34+8, StatsCategoryPartyStack 240px, StatsCommitteeBars rows*30+8. 스크린샷 mcp-Claude_Browser-blob-1793624889136-ccvvx2.jpg 마지막 줄 '가족·청소년' 단독
- 수정안: 같은 행 카드는 items-stretch로 높이를 맞추고, 짝을 높이가 비슷한 차트끼리 재배치합니다(퍼널+처리결과, 정당+위원회, 분야+분야×정당). 분야 그리드는 미분류 카드를 추가해 18개로 맞추거나 lg에서 3열 또는 6열로 둡니다.
- 검증 메모: StatsPanel.tsx:25는 grid items-start lg:grid-cols-2입니다. 카드 높이는 서로 다릅니다. 퍼널은 190px, 처리 결과는 52px에 범례, 정당은 rows*34+8, 위원회는 rows*30+8입니다. 분야 카드는 17개입니다. lg 4열에서 마지막 줄에 1개가 남고 sm 3열에서는 2개가 남습니다(CategoryGrid.tsx:21).
- 파일: `services/web/app/explore/components/StatsPanel.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`

### EXPLORE-27 디자인 토큰을 우회한 하드코딩 색과 용도 밖 강조색 사용

- 분류: polish · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 인기 키워드·의원 랭킹 제목 아이콘이 오류용 빨간색으로 보여 경고처럼 읽힙니다. 차트 색이 테마 토큰과 따로 관리되어 다크 모드나 토큰 변경 때 일부만 바뀝니다.
- 근거: TrendingKeywords.tsx:19, MemberRanking.tsx:22 `text-theme-alert`(DESIGN: Alert Red는 오류·경고 전용). TrendingKeywords.tsx:28 `style={{ color: '#0088FF' }}`(DESIGN: Mobile Active Blue는 모바일 내비 전용). StatsStageFunnel.tsx:17 '#96BCFA', StatsResultComposition.tsx:13-23, StatsCategoryDonut.tsx:14, StatsCategoryPartyStack.tsx:22 '#999999' 하드코딩
- 수정안: 제목 아이콘은 text-gray-2 중립색으로 바꾸거나 지웁니다. 차트 색은 tailwind 토큰(primary-2, gray-2 등)을 CSS 변수로 노출해 ChartConfig에서 참조합니다.
- 검증 메모: MemberRanking.tsx:22와 TrendingKeywords.tsx:19는 text-theme-alert를 씁니다. DESIGN.md:152는 Alert Red를 오류·경고 전용으로 정합니다. TrendingKeywords.tsx:28은 #0088FF를 씁니다. DESIGN.md:144는 이 색을 모바일 내비 전용으로 정합니다. 차트 hex는 하드코딩되어 있습니다(StatsStageFunnel.tsx:17, StatsResultComposition.tsx:13-23, StatsCategoryDonut.tsx:14). TrendingKeywords 섹션은 지금 렌더되지 않으므로 이 화면의 영향은 잠재적입니다.
- 파일: `services/web/app/explore/components/TrendingKeywords.tsx`, `services/web/app/explore/components/MemberRanking.tsx`, `services/web/app/explore/components/StatsStageFunnel.tsx`, `services/web/app/explore/components/StatsResultComposition.tsx`, `services/web/app/explore/components/StatsCategoryDonut.tsx`, `services/web/app/explore/components/StatsCategoryPartyStack.tsx`

### EXPLORE-29 좌석도와 분야 선택 애니메이션이 reduced-motion 설정을 무시함

- 분류: polish · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 움직임 줄이기를 켠 사용자에게도 298개 좌석이 0.7초 동안 이동하고 분야 선택 테두리가 카드 사이를 미끄러집니다.
- 근거: SeatDistribution.tsx:24-30, 142-152 motion.circle에 useReducedMotion 미사용. CategoryGrid.tsx:38-49 layoutId 애니메이션에 reduced-motion 분기 없음. 비교: StatsCard.tsx:18-22, StatsOverview.tsx:17·25는 useReducedMotion 사용
- 수정안: 두 컴포넌트에 useReducedMotion을 적용해 duration 0으로 전환합니다. 또는 앱 최상위에 MotionConfig reducedMotion="user"를 둡니다.
- 검증 메모: SeatDistribution.tsx:24-30과 142-152의 motion.circle은 useReducedMotion을 쓰지 않습니다. CategoryGrid.tsx:38-49의 layoutId 애니메이션에도 reduced-motion 분기가 없습니다. 앱에서 MotionConfig로 grep한 결과는 없습니다. 비교 대상인 StatsCard.tsx:18과 StatsOverview.tsx:17·45는 useReducedMotion을 씁니다.
- 파일: `services/web/app/explore/components/SeatDistribution.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`

### EXPLORE-30 모바일 터치 대상이 작음(기간 버튼 약 24px, 세그먼트 약 30px, 의석 범례 약 20px)

- 분류: polish · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 모바일에서 '6개월/12개월/전체', '의원/정당', 정당 범례를 정확히 누르기 어렵습니다.
- 근거: StatsTrendArea.tsx:82 `px-2.5 py-1 text-[11px]`, AssemblySegment.tsx:32 `px-5 py-1.5`(13px), SeatDistribution.tsx:264 `px-2 py-0.5`(12px). DESIGN.md 'Do' 항목: 모바일 조작부 56px 안팎
- 수정안: 세 컨트롤의 최소 높이를 40~44px로 올립니다. 시각 크기를 유지하려면 투명 패딩이나 ::after 확장 영역을 씁니다.
- 검증 메모: StatsTrendArea.tsx:82는 py-1에 text-[11px]입니다. 높이는 약 24px입니다. AssemblySegment.tsx:32는 py-1.5에 13px이고 높이는 약 31px입니다. SeatDistribution.tsx:264는 py-0.5에 12px이고 높이는 약 22px입니다. DESIGN.md:258은 모바일 조작부를 56px 안팎으로 정합니다.
- 파일: `services/web/app/explore/components/StatsTrendArea.tsx`, `services/web/app/explore/components/AssemblySegment.tsx`, `services/web/app/explore/components/SeatDistribution.tsx`

### EXPLORE-31 배포 전 폴백 코드가 남아 매번 통계 API를 두 번씩 호출함

- 분류: polish · dead-code · 작업량 S · 검증 adjusted
- 사용자 영향: 추이 기간을 바꿀 때마다 /trend와 /trend-detail을 함께 요청하고, 정당 차트도 두 API를 함께 요청해 네트워크 요청이 늘어납니다. 신규 API가 실패하면 의미가 다른 차트(가결 없는 막대)로 조용히 바뀝니다.
- 근거: queries.ts:74 주석 '신규 통계 API — 배포 전 백엔드에는 없을 수 있어'. StatsTrendArea.tsx:45-47 useGetStatisticsTrendDetail과 useGetStatisticsTrend 동시 호출. StatsPartyPerformance.tsx:19-21, 35-42, 119-120 폴백 경로. 운영 curl에서 신규 API 6종 모두 200 응답
- 수정안: /statistics/by-party는 정리 대상에서 뺍니다. SeatDistribution.tsx:37이 정당별 발의 건수를 표시하는 데 이 API를 계속 씁니다. 제거 대상은 /statistics/trend 호출(useGetStatisticsTrend, getStatisticsTrend)과 두 컴포넌트의 폴백 분기입니다.
- 검증 메모: queries.ts:74 주석과 retry:false를 확인했습니다. StatsTrendArea.tsx:45-47은 trend-detail과 trend를 함께 호출합니다. StatsPartyPerformance.tsx:19-21은 party-performance와 by-party를 함께 호출합니다. 신규 API 6종(party-performance, trend-detail, by-committee, category-party, result-breakdown, stage)은 운영 curl에서 모두 200입니다.
- 파일: `services/web/app/explore/apis/queries.ts`, `services/web/app/explore/apis/apis.ts`, `services/web/app/explore/components/StatsTrendArea.tsx`, `services/web/app/explore/components/StatsPartyPerformance.tsx`

### EXPLORE-32 모바일 서브탭이 스크롤과 함께 사라짐

- 분류: polish · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 긴 통계 탭이나 의원 목록을 내려 본 뒤 다른 탭으로 가려면 맨 위까지 다시 올라가야 합니다.
- 근거: ExploreSubTabs.tsx:18-21 className에 sticky 없음(bg-white·backdrop-blur만 있음). ExploreBoard.tsx:18 서브탭은 일반 흐름에 배치
- 수정안: 서브탭에 sticky top-0(헤더 높이만큼 오프셋)과 z-index를 줍니다. 탭 전환 시 패널 상단으로 스크롤 위치를 맞춥니다.
- 검증 메모: ExploreSubTabs.tsx:13-16의 className에 sticky가 없습니다. bg-white와 backdrop-blur만 있습니다. ExploreBoard.tsx:19는 이 탭을 일반 흐름에 둡니다.
- 파일: `services/web/app/explore/components/ExploreSubTabs.tsx`

### EXPLORE-33 분야 법안 목록에 총 건수와 목록 끝 표시가 없음

- 분류: polish · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 사용자는 목록이 몇 건인지, 끝까지 봤는지 알 수 없습니다. 마지막 페이지 뒤에는 아무 표시 없이 스크롤이 멈춥니다.
- 근거: FieldPanel.tsx:27-29 제목 '{label} 분야 법안'만 표시. CategoryBills.tsx:33-45, MemberList.tsx:36-71 hasNextPage=false일 때 표시 없음
- 수정안: 분야 제목 옆에 EXPLORE-02에서 맞춘 건수를 숫자로 둡니다. hasNextPage가 false가 되면 목록 끝 구분선을 보여 줍니다.
- 검증 메모: FieldPanel.tsx:27-29 제목은 '{label} 분야 법안'만 표시합니다. CategoryBills.tsx:33-45와 MemberList.tsx:36-71은 hasNextPage가 false여도 끝 표시를 하지 않습니다.
- 파일: `services/web/app/explore/components/FieldPanel.tsx`, `services/web/app/explore/components/CategoryBills.tsx`, `services/web/app/explore/components/MemberList.tsx`

### EXPLORE-34 좌석 배치 순서에 '진보당' 이름이 하드코딩됨

- 분류: polish · dead-code · 작업량 S · 검증 confirmed
- 사용자 영향: 정당 구성이나 당색이 바뀌면 비슷한 색 정당이 다시 붙어 좌석도 경계가 구분되지 않습니다.
- 근거: services/web/app/explore/lib/seatingOrder.ts:15-16 `party.party_name.trim() === '진보당'`
- 수정안: 이웃 정당 색 사이 거리(예: Lab ΔE)를 계산해 가장 비슷한 색이 붙지 않도록 가운데 그룹 순서를 정하는 규칙으로 바꿉니다. 기존 seatingOrder.test.ts에 색 충돌 사례를 추가합니다.
- 검증 메모: seatingOrder.ts:15-16에 party_name.trim() === '진보당' 하드코딩이 있습니다. 이 코드는 진보당 색 #D6001C와 국민의힘 색 #E61E2B가 비슷해서 넣은 예외입니다(주석 7-8행).
- 파일: `services/web/app/explore/lib/seatingOrder.ts`, `services/web/app/explore/lib/seatingOrder.test.ts`

## 검색 (SEARCH)

### SEARCH-01 법안 검색 결과가 첫 5건에서 멈추고 더 불러오지 않음

- 분류: blocker · bug · 작업량 S · 검증 confirmed
- 사용자 영향: '의료법'처럼 결과가 수백 건인 검색어도 법안 5건만 보인다. 스크롤해도 다음 결과가 나오지 않는다. 더보기 버튼도 없다. 사용자는 검색 결과가 5건뿐이라고 오해한다.
- 근거: components/Bill/BillList/BillList.tsx:28-33 — 스피너와 무한스크롤 센티널(`<div ref={fetchRef}>`)이 `feedType === 'sorted_by_latest'`일 때만 렌더링된다. app/search/[id]/SearchResultClient.tsx:69 는 feedType 없이 `<BillList ... fetchRef={fetchRefBill} detail={false} />`를 호출한다. SearchFacade.java:42 `PageRequest.of(page, 5)`. curl GET https://api.lawdigest.kr/v1/search/bill?search_word=소방&page=0 → n=5, pagination_response {page_number:0, last_page:false}
- 수정안: BillList의 센티널 렌더링 조건을 feedType이 아니라 '다음 페이지 존재 여부(hasNextPage)' prop으로 바꾼다. 검색과 피드가 같은 기준을 쓰게 한다. 검색 페이지 크기는 5에서 10~20으로 늘린다. 마지막 페이지에서는 센티널을 제거한다.
- 검증 메모: BillList.tsx:28,33 에서 스피너와 센티널은 feedType === 'sorted_by_latest'일 때만 렌더링된다. SearchResultClient.tsx:69 는 feedType 없이 BillList를 호출한다. SearchFacade.java:42 PageRequest.of(page, 5). curl /v1/search/bill?search_word=소방&page=0 → 5건, pagination_response {page_number:0, last_page:false}. useIntersect.ts 는 매 렌더링마다 ref를 다시 observe하므로 센티널만 렌더링되면 수정안대로 동작한다.
- 파일: `services/web/components/Bill/BillList/BillList.tsx`, `services/web/app/search/[id]/SearchResultClient.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/facade/SearchFacade.java`

### SEARCH-02 1글자 검색어가 서버 500과 전체 페이지 오류로 이어짐

- 분류: blocker · bug · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: '김', '이', 'a'처럼 한 글자를 검색하면 전체 화면 스플래시가 길게 돈 뒤 '페이지가 작동하지 않습니다.' 오류 화면이 뜬다. 검색어가 짧다는 안내는 없다. 의원 결과는 API가 정상으로 주는데도 볼 수 없다.
- 근거: SearchController.java:143-145 가 2자 미만이면 BillException.SearchParameterInvalid를 던진다. GlobalExceptionHandler.java:15-54 에 이 예외 매핑이 없어서 Exception 핸들러가 500을 반환한다. curl /v1/search/bill?search_word=김&page=0 → HTTP500 '서버 내부 오류입니다.' (이, a도 동일). /v1/search/congressman/party?search_word=%20 → HTTP500. /v1/search/bill?search_word=소방&page=-1 → HTTP500. 프론트 SearchBar.tsx:24-39, Nav.tsx:73-77 은 길이 검증 없이 이동한다. SSR HTML(https://lawdigest.kr/search/%EC%9D%B4)에 `$RX("B:1",...)`가 있어 서버 렌더링 오류 후 클라이언트로 전환된다. app/search/apis/queries.ts:13 useSuspenseInfiniteQuery 오류는 app/error.tsx 전체 화면으로 올라간다.
- 수정안: 백엔드: SearchParameterInvalid(Bill/Congressman)를 GlobalExceptionHandler 400 목록에 추가한다. ErrorCode.SEARCH_PARAMETER_INVALID를 쓴다. page 음수는 400으로 처리한다. 프론트: 제출 전에 trim 길이 2 미만이면 이동하지 않고 입력창 아래 상태로 표시한다. 결과 페이지에서는 법안 쿼리 오류를 섹션 단위로 받아 의원·정당 결과는 그대로 보여 준다(useSuspense 대신 useInfiniteQuery + 섹션 오류 상태).
- 검증 메모: SearchController.java:143-145 가 2자 미만이면 BillException.SearchParameterInvalid를 던진다. GlobalExceptionHandler.java 에는 이 예외 매핑이 없고 Exception 핸들러(49-54행)가 500을 반환한다. curl(URL 인코딩) search_word=김/이/a → HTTP500 '서버 내부 오류입니다.'. congressman/party?search_word=%20 → 500. bill?page=-1 → 500. SSR https://lawdigest.kr/search/%EC%9D%B4 HTML에 $RX("B:1",...)와 app/loading.tsx 스플래시('AI 기반 입법정보 제공 플랫폼')가 있다. 같은 '김'에 대해 congressman/party API는 200, 89건을 반환한다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/controller/SearchController.java`, `services/backend/src/main/java/com/everyones/lawmaking/global/error/GlobalExceptionHandler.java`, `services/web/components/common/SearchBar/SearchBar.tsx`, `services/web/components/Layout/Nav/Nav.tsx`, `services/web/app/search/[id]/SearchResultClient.tsx`, `services/web/app/search/apis/queries.ts`

### SEARCH-03 특수문자가 들어간 검색어가 FULLTEXT 문법 오류로 500

- 분류: blocker · bug · 백엔드 · 작업량 S · 검증 adjusted
- 사용자 영향: '(주)', '소방+', '-', '@@', '%', '*'처럼 기호가 들어간 검색어를 입력하면 오류 화면이 뜬다. 법률명에는 괄호·가운뎃점 같은 기호가 흔하다.
- 근거: BillRepository.java:124-133 `match(bsd.search_text) against(concat('*',:keyword,'*') in boolean mode)` 에 사용자 입력을 그대로 넣는다. curl /v1/search/bill?search_word=(주) → HTTP500 1.96s, 소방+ → 500, - → 500, @@ → 500, % → 500, * → 500. 앞쪽 '*'는 InnoDB boolean mode에서 의미 있는 연산자가 아니다.
- 수정안: 근거에서 '-', '%', '*'를 빼고 '(대안)'이 붙은 법안명, '소방~', '소방(주)'를 근거로 둔다. 수정안은 그대로 유효하다. 연산자 제거 후 토큰 길이가 2 미만이면 SEARCH-02와 같은 400 경로로 보낸다.
- 검증 메모: 결함은 실재한다. curl search_word=(주), 소방+, @@, 소방~, 소방(주), %%, '외국환거래법 일부개정법률안(대안)' → 모두 HTTP500. 2자 이상이므로 길이 검사가 아니라 BillRepository.java:128-131 FULLTEXT boolean mode 조립이 원인이다. 법안명을 '(대안)'까지 붙여 넣는 흔한 입력이 500이 된다. 다만 보고된 근거 중 '-', '%', '*'는 1글자라서 SEARCH-02의 길이 검사 경로로 500이 난다. FULLTEXT 문법 오류 근거가 아니다. 가운뎃점('5·18', '소방·안전')과 '소방-안전', '"소방'은 200이다. 보고된 1.96s 응답 시간은 재현되지 않았다(약 0.05s).
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/service/BillService.java`

### SEARCH-04 검색 모달 입력창의 지우기(X) 버튼이 404 페이지로 이동

- 분류: blocker · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 검색어를 고치려고 입력창의 X를 누르면 입력만 지워지지 않고 '페이지를 찾을 수 없습니다.' 화면으로 이동한다.
- 근거: components/common/SearchBar/SearchBar.tsx:58 `onClear={() => router.push('/search')}`. app/search 아래에는 [id]와 apis만 있고 page.tsx가 없다. curl https://lawdigest.kr/search → HTTP404, 본문 '페이지를 찾을 수 없습니다.'
- 수정안: onClear에서 라우팅을 제거한다. setValue('')와 입력 포커스 유지만 한다.
- 검증 메모: SearchBar.tsx:58 onClear={() => router.push('/search')}. app/search 아래에는 [id]와 apis만 있고 page.tsx가 없다. curl https://lawdigest.kr/search → HTTP404, 본문 '페이지를 찾을 수 없습니다.'
- 파일: `services/web/components/common/SearchBar/SearchBar.tsx`

### SEARCH-05 쿼리 키에 검색어가 없어 이전 검색 결과가 새 검색어 아래에 표시됨

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: '의료법'을 검색한 뒤 '소방'을 검색하면 상단에는 '소방'이 표시된다. 그런데 목록에는 잠시 '의료법' 결과가 보였다가 바뀐다. 네트워크가 느리면 틀린 결과를 그대로 읽게 된다. 요청도 검색마다 두세 번 반복된다.
- 근거: app/search/apis/queries.ts:8 `queryKey: ['/search/congressman/party']`, :14 `queryKey: ['/search/bill']` — 검색어가 키에 없다. lib/provider/QueryClientProvider.tsx:12 staleTime 5분이므로 같은 키의 캐시를 신선한 데이터로 즉시 반환한다. SearchResultClient.tsx:40-43 `useEffect(() => { refetchCP(); refetchBill(); }, [dataCP, dataBill])` 로 수동 재조회해 증상을 가린다. 이 effect는 데이터가 바뀔 때마다 다시 실행된다. infinite query refetch는 로드된 모든 페이지를 다시 받는다.
- 수정안: queryKey를 ['search','congressman-party', searchWord], ['search','bill', searchWord]로 바꾼다. 수동 refetch useEffect와 data를 state로 복사하는 useState/useEffect(19-38행)를 삭제한다. data에서 바로 파생한다.
- 검증 메모: queries.ts:8 queryKey ['/search/congressman/party'], :14 ['/search/bill'] 에 검색어가 없다. QueryClientProvider.tsx:12 staleTime 5분. SearchResultClient.tsx:40-43 이 dataCP·dataBill 변화마다 refetchCP/refetchBill을 호출한다. 새 검색어로 이동하면 같은 키의 캐시가 먼저 반환된 뒤 수동 refetch로 바뀐다.
- 파일: `services/web/app/search/apis/queries.ts`, `services/web/app/search/[id]/SearchResultClient.tsx`

### SEARCH-06 의원·정당 결과 로딩 중에 '검색 결과가 존재하지 않습니다.'가 먼저 보임

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: '이재명'을 검색하면 의원 결과가 있는데도 처음에는 '검색 결과가 존재하지 않습니다.'가 보인다. 잠시 뒤 결과가 나타난다. 사용자는 결과가 없다고 판단하고 떠날 수 있다.
- 근거: SearchResultClient.tsx:11,19 useQuery(비 suspense)의 초기값이 [] 이다. 56-60행은 길이 0이면 빈 상태 문구를 렌더링하고 isLoading 분기가 없다. curl https://lawdigest.kr/search/%EC%9D%B4%EC%9E%AC%EB%AA%85 SSR 텍스트: "'이재명'에 대한 검색 결과입니다. 의원 · 정당 검색 결과가 존재하지 않습니다. 법안 지방자치 자율성과..." — 같은 검색어로 API는 1건(이재명)을 반환한다.
- 수정안: isPending일 때 의원 행 높이에 맞춘 스켈레톤 2~4개를 표시한다. 빈 상태는 isSuccess && length===0 일 때만 표시한다. 법안 섹션과 같은 로딩 방식으로 맞춘다.
- 검증 메모: SearchResultClient.tsx:11 useQuery(비 suspense)이고 :19 초기 state는 dataCP가 없으면 []이다. :56-60 은 길이 0이면 빈 상태 문구를 렌더링하고 로딩 분기가 없다. curl https://lawdigest.kr/search/%EC%9D%B4%EC%9E%AC%EB%AA%85 SSR 텍스트에 '의원 · 정당 검색 결과가 존재하지 않습니다.'가 있다. 같은 검색어로 API는 1건(이재명)을 반환한다.
- 파일: `services/web/app/search/[id]/SearchResultClient.tsx`

### SEARCH-07 모바일 검색이 AI 질문을 유도하지만 실제로는 키워드 검색이라 엉뚱한 결과가 나옴

- 분류: major · trust · 작업량 S · 검증 confirmed
- 사용자 영향: 모바일 검색 버튼을 누르면 '궁금한 입법 현황을 질문해 보세요'와 예시 질문 버블이 나온다. 버블 '최근 통과된 주요 법안은?'을 누르면 통과 여부와 무관한 소득세법 개정안이 첫 결과로 나온다. 서비스가 질문을 이해하지 못한다고 느낀다.
- 근거: components/Layout/Nav/Nav.tsx:11-15 SEARCH_SUGGESTIONS(자연어 질문 3개), :322 placeholder '궁금한 입법 현황을 질문해 보세요', :289 버블 클릭 시 handleSearchSubmit(suggestion) → /search/{질문}. curl /v1/search/bill?search_word=최근 통과된 주요 법안은? → 첫 결과 '소득세법 일부개정법률안'(2026-07-09). '이번 회기 국회 일정 알려줘'는 일정 데이터와 연결되지 않는다.
- 수정안: 키워드 검색 기능에 맞게 placeholder를 '법안, 의원, 정당 검색'으로 통일한다. 버블은 최근 검색어 또는 /v1 trending keywords(TrendingKeywords와 같은 데이터)로 교체한다. 자연어 질의 기능을 실제로 붙이기 전까지 질문형 예시를 쓰지 않는다.
- 검증 메모: Nav.tsx:11-15 SEARCH_SUGGESTIONS 자연어 질문 3개, placeholder '궁금한 입법 현황을 질문해 보세요', 버블 onClick={() => handleSearchSubmit(suggestion)}. curl search_word='최근 통과된 주요 법안은?' → 첫 결과 '소득세법 일부개정법률안'(2026-07-09, 접수). '이번 회기 국회 일정 알려줘' → 외국환거래법·가사소송법 등 일정과 무관한 법안.
- 파일: `services/web/components/Layout/Nav/Nav.tsx`

### SEARCH-08 법안 검색 정렬이 발의일 우선이라 관련도가 낮은 법안이 맨 위에 옴

- 분류: major · data · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: '의료법 개정안'을 검색하면 첫 결과가 농어업재해보험법이다. '소방 관리'의 첫 결과는 선거관리위원회법이다. 검색어 중 한 단어만 맞아도 최신 법안이 먼저 나와서 원하는 법안을 찾기 어렵다.
- 근거: BillRepository.java:128-131 `order by b.propose_date desc, match(...) desc` — 관련도가 2순위이고, '+' 없이 조립해서 다중 단어가 OR로 매칭된다. curl search_word=의료법 개정안 → 첫 결과 '농어업재해보험법 일부개정법률안', 응답 3.23s. search_word=소방 관리 → 첫 결과 '선거관리위원회법'(SSR https://lawdigest.kr/search/소방%20관리).
- 수정안: 토큰마다 '+' 필수 연산자를 붙여 AND로 매칭한다. 정렬은 법안명(bill_name/title) 일치 가중치 → match 점수 → 발의일 순으로 바꾼다. 필요하면 '관련도순/최신순' 정렬 토글을 결과 상단에 둔다.
- 검증 메모: BillRepository.java:128-131 order by b.propose_date desc 가 1순위이고 match 점수는 2순위다. concat('*',:keyword,'*')에 '+'가 없어서 다중 단어가 OR로 매칭된다. curl '의료법 개정안' → 첫 결과 농어업재해보험법(1.66s). '소방 관리' → 첫 결과 선거관리위원회법(2.88s).
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepository.java`

### SEARCH-09 데스크톱의 피드·타임라인·탐색·마이페이지에 검색 진입점이 없음

- 분류: major · ux · 작업량 M · 검증 confirmed
- 사용자 영향: PC 사용자는 첫 화면(피드)에서 검색할 방법이 없다. 법안 상세 페이지에 들어가야 헤더 돋보기가 보인다.
- 근거: styles/mobile-floating-nav.css:563-566 `@media (min-width: 48rem) { .mobile-floating-nav-wrapper { display: none; } }`. Header 검색 버튼은 `search` prop이 있을 때만 나온다(Header.tsx:110-119). search prop은 app/bill/[id], party/[id], congressman/[id] layout에만 있다. app/page.tsx:23, explore/layout.tsx:11, timeline/layout.tsx:11, mypage/layout.tsx:11 은 `nav logo notification`이다. 데스크톱 피드·탐색·타임라인 스크린샷의 헤더 오른쪽에는 테마 버튼과 알림 아이콘만 있다.
- 수정안: 데스크톱 헤더 오른쪽 영역에 모든 페이지 공통으로 검색 입력(또는 돋보기 버튼)을 고정한다. 모바일 플로팅 검색과 같은 검색 컴포넌트를 공유한다. 단축키 '/'로 포커스한다.
- 검증 메모: Header.tsx:110-119 검색 버튼은 search prop일 때만 렌더링된다. search prop은 app/bill/[id], party/[id], congressman/[id] layout에만 있다. app/page.tsx:23, explore/timeline/mypage layout:11 은 nav logo notification 이다. mobile-floating-nav.css:563-566 이 48rem 이상에서 플로팅 검색을 숨긴다. 탐색 페이지의 TrendingKeywords 링크와 following 페이지의 SearchBarButton은 있지만 피드·타임라인·탐색·마이페이지에서 자유 검색어를 입력할 곳은 없다.
- 파일: `services/web/components/Layout/Header/Header.tsx`, `services/web/app/page.tsx`, `services/web/app/explore/layout.tsx`, `services/web/app/timeline/layout.tsx`, `services/web/app/mypage/layout.tsx`

### SEARCH-10 검색어 URL 인코딩·디코딩이 경로마다 달라 '&', '/', '#'가 든 검색어가 깨짐

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 'R&D'를 검색하면 화면에 'R%26D'가 표시되고 결과가 0건이다. 모달에서 '/'가 든 검색어를 입력하면 경로가 나뉘어 404가 된다. '?'나 '#'는 잘린 검색어로 검색된다.
- 근거: SearchBar.tsx:39 `router.push(`/search/${value.trim()}`)`, SearchModal.tsx:30 `router.push(`/search/${searchWord}`)` — 인코딩하지 않는다. Nav.tsx:76, TrendingKeywords.tsx:26 은 encodeURIComponent를 쓴다. SearchResultClient.tsx:11,18,49 는 decodeURI를 쓴다. decodeURI는 %26 %2F %23 %3F를 풀지 않는다. curl https://lawdigest.kr/search/R%26D → "'R%26D'에 대한 검색 결과입니다. ... 법안 검색 결과가 존재하지 않습니다." /search/a%2Fb → "'a%2Fb'에 대한". 반면 API search_word=R&D 는 HTTP200이다.
- 수정안: 검색 이동을 하나의 함수(예: buildSearchHref(keyword) = `/search/${encodeURIComponent(keyword)}`)로 모은다. 결과 페이지는 decodeURIComponent를 try/catch로 한 번만 적용한다. 장기적으로 /search?q= 쿼리스트링 방식으로 옮기면 경로 분할 문제가 사라진다.
- 검증 메모: SearchBar.tsx:39, SearchModal.tsx:30 은 인코딩 없이 /search/${...}로 이동한다. Nav.tsx:76, TrendingKeywords.tsx:26 은 encodeURIComponent를 쓴다. SearchResultClient.tsx:11,18,49 는 decodeURI를 쓴다. curl https://lawdigest.kr/search/R%26D → "'R%26D'에 대한 검색 결과입니다. ... 법안 검색 결과가 존재하지 않습니다.", /search/a%2Fb → "'a%2Fb'에 대한". API search_word=R&D 는 200, 5건이다.
- 파일: `services/web/components/common/SearchBar/SearchBar.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`, `services/web/app/search/[id]/SearchResultClient.tsx`, `services/web/components/Layout/Nav/Nav.tsx`, `services/web/app/explore/components/TrendingKeywords.tsx`

### SEARCH-11 의원 결과가 전·현직 구분 없이 수십 건 한꺼번에 나오고 법안 결과를 밀어냄

- 분류: major · data · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: '김'을 검색하면 의원 89명이 한 번에 나온다. 그중 24명은 21대 전직 의원이지만 현직처럼 보인다. 정렬도 이름순이 아니다. 법안 결과를 보려면 89행을 지나 스크롤해야 한다. 이재명은 더불어민주당 의원으로 표시된다.
- 근거: CongressmanRepository.java:26-29 `WHERE c.name LIKE %:searchWord%` — state 필터, 정렬, 페이지 제한이 없다. curl /v1/search/congressman/party?search_word=김 → 89건, 이미지 경로 기준 22대 65명·21대 24명. 첫 결과 '김한정'(/congressman/21/09I2323E.jpg)이다. search_word=이재명 → party_name '더불어민주당', /congressman/21/. SearchCongressman.tsx:20-23 에는 대수·현직 표시가 없다. SearchList.tsx:8 는 전체를 그리드로 렌더링한다.
- 수정안: 현직(state=true)을 먼저, 이름 완전 일치를 먼저, 그다음 가나다순으로 정렬한다. 전직 의원에는 대수 배지(예: 21대)를 붙인다. 결과 페이지에서는 상위 6명만 보여 주고 '의원 N명 모두 보기'로 확장한다. 의원·정당·법안을 탭이나 세그먼트로 나눠 각 결과 건수를 보여 준다.
- 검증 메모: CongressmanRepository.java 의 findBySearchWord 는 WHERE c.name LIKE %:searchWord% 만 있고 state 필터·정렬·제한이 없다. curl congressman/party?search_word=김 → 89건, 이미지 경로 기준 22대 65명·21대 24명. 앞 순서 김한정, 김영주, 김경만... 으로 이름순이 아니다. 첫 결과는 /congressman/21/ 이미지다. search_word=이재명 → party_name 더불어민주당, /congressman/21/IUD9392R.jpg. SearchCongressman.tsx 에 대수·현직 표시가 없다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/CongressmanRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/common/dto/SearchCongressmanDto.java`, `services/web/app/search/[id]/components/SearchList.tsx`, `services/web/app/search/[id]/components/SearchCongressman.tsx`

### SEARCH-16 검색 UI가 두 벌이라 진입점마다 동작이 다름

- 분류: major · ux · 작업량 L · 검증 confirmed
- 사용자 영향: 모바일 법안 상세에서는 헤더 돋보기와 하단 무지개 검색 버튼이 동시에 보인다. 헤더 돋보기는 가짜 입력창을 펼친다. 그 입력창을 다시 눌러야 최근 검색어가 있는 모달이 열린다. 하단 버튼은 최근 검색어가 없는 인라인 바를 연다. 같은 검색인데 저장 여부, 문구, 단계 수가 다르다.
- 근거: Nav.tsx:61-80 플로팅 검색은 최근 검색어를 저장하지 않고 placeholder가 '궁금한 입법 현황을 질문해 보세요'이다. SearchBar.tsx:27-37 은 localStorage에 저장하고 placeholder가 '법안, 의원, 정당명으로 검색'이다. Header.tsx:41-43,141 돋보기는 SearchBarButton을 토글만 한다. SearchModal.tsx:59 z-10 이고 mobile-floating-nav.css 의 wrapper는 z-index 70이라 하단 내비가 모달 위에 겹친다. DESIGN.md:268 'Don't 모달을 첫 선택으로 쓰지 않는다'. 모바일 법안 상세 스크린샷에 두 진입점이 모두 있다.
- 수정안: 검색 입력·최근 검색어·추천 키워드를 담는 단일 컴포넌트를 만든다. 모바일 플로팅 확장 바와 데스크톱 헤더가 이 컴포넌트를 공유한다. 헤더 돋보기는 바로 그 입력에 포커스한다. 중간의 SearchBarButton 단계를 없앤다. 모달을 유지할 경우 z-index를 내비 위로 올린다.
- 검증 메모: Nav.tsx:72-80 플로팅 검색은 최근 검색어를 저장하지 않고 placeholder가 '궁금한 입법 현황을 질문해 보세요'이다. SearchBar.tsx:27-37 은 localStorage에 저장하고 placeholder가 '법안, 의원, 정당명으로 검색'이다. Header.tsx:41-43,141 돋보기는 SearchBarButton 표시만 토글한다. SearchModal.tsx:59 z-10, mobile-floating-nav.css:20 wrapper z-index 70이고 Nav는 main 밖 루트에 있어 모달 위에 겹친다. DESIGN.md:268 '모달을 첫 선택으로 쓰지 않는다'.
- 파일: `services/web/components/Layout/Nav/Nav.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`, `services/web/components/common/SearchBar/SearchBar.tsx`, `services/web/components/common/SearchBar/SearchBarButton.tsx`, `services/web/components/Layout/Header/Header.tsx`

### SEARCH-17 검색 모달이 대화상자 접근성 요건을 갖추지 않음

- 분류: major · a11y · 작업량 M · 검증 confirmed
- 사용자 영향: 스크린리더는 모달이 열린 것을 알리지 않는다. Esc로 닫히지 않는다. Tab을 누르면 포커스가 가려진 뒤쪽 페이지로 빠져나간다. 모달 뒤 페이지가 휠로 스크롤된다. 닫기 버튼은 이름 없는 버튼으로 읽힌다.
- 근거: SearchModal.tsx:58-59 일반 `<section>`이고 role="dialog", aria-modal, aria-labelledby가 없다. keydown(Escape) 처리, 포커스 트랩, 스크롤 잠금이 없다. :63-65 닫기 Button은 IconX만 있고 aria-label이 없다. 닫은 뒤 원래 트리거로 포커스를 돌려주지 않는다.
- 수정안: HeroUI Modal(또는 react-aria useDialog/FocusScope)로 감싼다. Esc 닫기, 포커스 트랩, 스크롤 잠금, 트리거로 포커스 복귀를 적용한다. 닫기 버튼에 aria-label='검색 닫기'를 준다.
- 검증 메모: SearchModal.tsx:58-59 는 일반 section이고 role/aria-modal/aria-labelledby가 없다. 파일 안에 Escape keydown 처리, 포커스 트랩, 스크롤 잠금, 포커스 복귀 코드가 없다. :63-65 닫기 Button은 IconX만 있고 aria-label이 없다.
- 파일: `services/web/components/common/SearchBar/SearchModal.tsx`

### SEARCH-12 해산된 위성정당이 검색 결과에 현재 정당처럼 나옴

- 분류: minor · data · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: '민주'를 검색하면 더불어민주연합이, '국민'을 검색하면 국민의미래가 나온다. 들어가 보면 소속 의원이 0명인 빈 프로필이다.
- 근거: PartyRepository.java:26-28 `WHERE p.name LIKE %:searchWord%` — 활동 여부 필터가 없다. curl search_word=민주 → 더불어민주연합(id 3), search_word=국민 → 국민의미래(id 4). /v1/party/detail?party_id=3 → proportional 0, district 0. party_id=4 도 0명.
- 수정안: 원내 정당(is_parliamentary) 또는 소속 의원이 있는 정당을 먼저 보여 준다. 소멸 정당은 뒤로 보내고 '해산' 같은 상태 배지를 붙인다. 이름 완전 일치를 맨 앞에 둔다.
- 검증 메모: PartyRepository.java findBySearchWord 는 WHERE p.name LIKE %:searchWord% 만 있다. curl search_word=민주 → 더불어민주연합(id 3), 국민 → 국민의미래(id 4). /v1/party/detail?party_id=3, 4 → proportional_congressman_count 0, district_congressman_count 0.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/PartyRepository.java`, `services/web/app/search/[id]/components/SearchParty.tsx`

### SEARCH-13 LIKE 와일드카드(%, _)를 이스케이프하지 않아 전체 의원·정당 목록이 반환됨

- 분류: minor · bug · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: '%'나 '_'를 검색하면 의원 468명과 정당 14개가 한 화면에 쏟아진다. 렌더링이 느려진다.
- 근거: curl /v1/search/congressman/party?search_word=%25 → 482건(CONGRESSMAN 468, PARTY 14). search_word=_ → 482건. CongressmanRepository.java:28, PartyRepository.java:27 는 입력을 그대로 LIKE 패턴에 넣는다.
- 수정안: 검색어의 %, _, \ 를 이스케이프하고 `LIKE ... ESCAPE '\\'`를 지정한다. 의원·정당 응답에도 상한(limit)을 둔다.
- 검증 메모: curl congressman/party?search_word=% → 482건(CONGRESSMAN 468, PARTY 14). search_word=_ → 482건. Congressman/PartyRepository 는 입력을 그대로 LIKE 패턴에 넣는다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/CongressmanRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/repository/PartyRepository.java`

### SEARCH-14 검색 모달을 열어도 입력창에 포커스가 가지 않음

- 분류: minor · ux · 작업량 S · 검증 adjusted
- 사용자 영향: 검색창 모양 버튼을 눌러 모달을 열면 입력창을 한 번 더 눌러야 한다. 모바일에서는 키보드가 바로 올라오지 않는다.
- 근거: SearchModal은 루트 레이아웃에 항상 마운트되고(app/layout.tsx:89) CSS `hidden`/`fixed`로만 표시를 바꾼다(SearchModal.tsx:59). SearchBar.tsx:55 `autoFocus={searchModal.show}` 는 마운트 시점 값(false)만 반영된다. react-aria useFocusable(node_modules/react-aria/dist/private/interactions/useFocusable.mjs:57-63)은 autoFocusRef를 최초 effect에서만 읽고 false로 바꾼다.
- 수정안: show가 true로 바뀔 때 inputRef.current?.focus()를 호출하는 effect를 둔다. 또는 모달을 show일 때만 마운트한다.
- 검증 메모: 결함은 실재한다. SearchModal은 app/layout.tsx 루트에 항상 마운트되고 SearchModal.tsx:59 에서 hidden/fixed 클래스만 바꾼다. SearchBar.tsx:55 autoFocus={searchModal.show}는 마운트 시점 false만 반영된다. react-aria useFocusable.mjs 는 autoFocusRef를 최초 effect에서만 읽고 false로 바꾼다. 영향은 한 번 더 탭해야 하는 마감 부족이다. 기능을 막거나 신뢰를 크게 해치지 않으므로 minor로 낮춘다.
- 파일: `services/web/components/common/SearchBar/SearchBar.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`

### SEARCH-18 아이콘 전용 검색 버튼에 접근 가능한 이름이 없음

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 스크린리더 사용자는 '버튼', '링크'로만 듣고 검색 버튼인지 알 수 없다. 헤더 돋보기를 누르면 URL에 '#'가 붙고 페이지가 맨 위로 튄다.
- 근거: SearchBar.tsx:73-75 검색 실행 Button(isIconOnly), SearchBarButton.tsx:36-38, components/common/Button/SearchButton.tsx:6 `<Link href="#" onClick={onClick}>`, components/common/Button/EnterButton.tsx:6 화살표 버튼 — 모두 aria-label이 없다. Nav.tsx:338 은 aria-label='검색'이 있다.
- 수정안: SearchButton은 `<button type="button" aria-label="검색 열기">`로 바꾼다. 검색 실행 버튼은 type="submit" aria-label="검색"으로 바꾼다. EnterButton은 링크 이름으로 대상명(예: '{의원명} 프로필')을 쓴다.
- 검증 메모: SearchButton.tsx:6 <Link href="#" onClick={onClick}> 에 aria-label이 없고 IconSearch SVG에 title도 없다. SearchBar.tsx:73-75, SearchBarButton.tsx:36-38, EnterButton.tsx:6 아이콘 전용 버튼에 aria-label이 없다. Nav.tsx 플로팅 버튼만 aria-label='검색'이 있다. onClick에서 preventDefault를 하지 않아 URL에 '#'가 붙는 것은 코드로 확인했다. 페이지가 맨 위로 이동하는지는 브라우저로 확인하지 않았다.
- 파일: `services/web/components/common/Button/SearchButton.tsx`, `services/web/components/common/SearchBar/SearchBar.tsx`, `services/web/components/common/SearchBar/SearchBarButton.tsx`, `services/web/components/common/Button/EnterButton.tsx`

### SEARCH-19 최근 검색어 칩을 키보드로 선택할 수 없고 삭제 버튼 이름이 영어임

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 키보드 사용자는 최근 검색어를 다시 검색할 수 없다. 스크린리더는 삭제 버튼을 'close chip'으로 읽는다.
- 근거: SearchModal.tsx:82-91 Chip에 onClick만 있다. HeroUI Chip 본체는 div이고 role·tabIndex가 없다(node_modules/@heroui/chip/dist/chunk-P5JPZ5W3.mjs:60-66 getChipProps). 삭제 버튼은 같은 파일 :68-74 `"aria-label": "close chip"`이다.
- 수정안: 칩 본문을 `<button>`(또는 Link)으로 렌더링하고 삭제 버튼을 별도 `<button aria-label="'{검색어}' 삭제">`로 둔다.
- 검증 메모: SearchModal.tsx:82-91 Chip에 onClick만 있다. @heroui/chip chunk-P5JPZ5W3.mjs:60-66 getChipProps는 ref·className·otherProps만 넘기고 role·tabIndex가 없다. Component 기본값은 div다. :68-74 닫기 버튼은 role button, tabIndex 0, aria-label 'close chip'이다.
- 파일: `services/web/components/common/SearchBar/SearchModal.tsx`

### SEARCH-20 최근 검색어가 오래된 순으로 표시됨

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 방금 검색한 단어가 목록 맨 끝에 붙는다. 일반적인 검색 서비스와 순서가 반대라서 찾기 어렵다.
- 근거: SearchBar.tsx:30,34 새 검색어를 배열 끝에 추가한다. SearchModal.tsx:50-53 10개 초과 시 slice(1)로 맨 앞(가장 오래된 것)을 지운다. :81 배열 순서대로 렌더링한다.
- 수정안: 새 검색어를 배열 앞에 넣고(중복 제거 후 unshift) 10개로 자른다. 저장·삭제 로직을 SearchBar와 SearchModal 두 곳에서 각자 하지 말고 useRecentKeywords 훅 하나로 모은다.
- 검증 메모: SearchBar.tsx:30,34 새 검색어를 배열 끝에 붙인다. SearchModal.tsx:50-53 10개 초과 시 slice(1)로 가장 오래된 항목을 지운다. :81 배열 순서대로 렌더링한다.
- 파일: `services/web/components/common/SearchBar/SearchBar.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`

### SEARCH-21 빈 검색어로 Enter를 누르면 모달이 닫힘

- 분류: minor · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 아무것도 입력하지 않고 Enter를 누르면 검색 모달이 사라진다. 사용자는 기능이 고장 났다고 느낀다.
- 근거: SearchBar.tsx:40-45 빈 값 분기에서도 마지막에 `setValue(''); resetSearchModal();`가 실행된다.
- 수정안: 빈 값이거나 2자 미만이면 return하고 모달을 유지한다. 입력창 포커스를 유지한다.
- 검증 메모: SearchBar.tsx:40-45 빈 값 분기 뒤에도 setValue('')와 resetSearchModal()이 실행되어 모달이 닫힌다.
- 파일: `services/web/components/common/SearchBar/SearchBar.tsx`

### SEARCH-22 결과 페이지 상단 검색창에 현재 검색어가 없음

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 검색어를 조금 고쳐 다시 검색하려면 처음부터 다시 입력해야 한다. 상단은 빈 입력창 모양인데 실제로는 읽기 전용이라 누르면 모달이 따로 열린다.
- 근거: SearchResultClient.tsx:47 `<SearchBarButton />` — 검색어 prop이 없다. SearchBarButton.tsx:21-22 Input isReadOnly, value 없음. SearchBarButton.tsx:17-19 는 eslint 규칙(click-events-have-key-events)을 끄고 form에 onClick을 단다.
- 수정안: 결과 페이지 상단에 실제 편집 가능한 검색 입력을 두고 현재 검색어로 초기화한다. 이 입력이 SEARCH-16의 공통 검색 컴포넌트를 쓴다. 그러면 "'소방'에 대한 검색 결과입니다." 문장이 필요 없어진다.
- 검증 메모: SearchResultClient.tsx:47 <SearchBarButton /> 에 검색어 prop이 없다. SearchBarButton.tsx:21-22 Input isReadOnly이고 value가 없다. :17-19 eslint-disable click-events-have-key-events 후 form에 onClick을 단다.
- 파일: `services/web/app/search/[id]/SearchResultClient.tsx`, `services/web/components/common/SearchBar/SearchBarButton.tsx`

### SEARCH-23 결과 화면 문구가 화면 설명 문장이고 결과 건수와 다음 행동이 없음

- 분류: minor · copy · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: "'소방'에 대한 검색 결과입니다."는 이미 보이는 내용을 반복한다. 반면 몇 건이 나왔는지는 알 수 없다. 결과가 없을 때 '검색 결과가 존재하지 않습니다.'만 있어서 다음에 무엇을 할지 알 수 없다.
- 근거: SearchResultClient.tsx:49 설명 문장, :52 '의원 · 정당', :64 '법안' 제목에 건수가 없다. :59, :71 빈 상태 문구. PaginationResponse.java 필드는 isLastPage, pageNumber뿐이라 총건수를 표시할 수 없다. SearchModal.tsx:94 '최근 검색어가 존재하지 않습니다.'(번역투).
- 수정안: 설명 문장은 삭제하고 검색어는 상단 입력창이 보여 준다. 섹션 제목 옆에 건수를 숫자로 둔다(의원·정당은 목록 길이, 법안은 API에 total_count 추가). 빈 상태에는 지금 뜨는 키워드 칩이나 철자 확인 대안 같은 다음 행동을 둔다. 최근 검색어가 없으면 영역 자체를 숨긴다.
- 검증 메모: SearchResultClient.tsx:49 "'{검색어}'에 대한 검색 결과입니다.", :52 '의원 · 정당', :64 '법안' 제목에 건수가 없다. :59, :71 빈 상태 문구만 있다. PaginationResponse.java 필드는 isLastPage, pageNumber뿐이다. SearchModal.tsx:94 '최근 검색어가 존재하지 않습니다.'
- 파일: `services/web/app/search/[id]/SearchResultClient.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/common/dto/response/PaginationResponse.java`

### SEARCH-24 첫 검색 시 전체 화면 스플래시가 뜨고 헤더가 사라짐

- 분류: minor · perf · 작업량 S · 검증 confirmed
- 사용자 영향: 검색하면 결과 자리 스켈레톤 대신 큰 로고, 'AI 기반 입법정보 제공 플랫폼' 문구, 스피너가 화면 전체를 덮는다. 검색 중이라는 맥락이 끊긴다. 스크린리더는 로고를 '500 에러 이미지'로 읽는다.
- 근거: app/search/[id]/ 에 loading.tsx가 없어서 app/loading.tsx 가 Suspense 경계가 된다. app/loading.tsx:8 `<Layout nav logo notification>`, :14 alt="500 에러 이미지", :17 'AI 기반 입법정보 제공 플랫폼'. queries.ts:13 useSuspenseInfiniteQuery 가 suspend한다. 오류도 app/error.tsx 전체 화면('페이지가 작동하지 않습니다.')으로 간다.
- 수정안: app/search/[id]/loading.tsx에 헤더와 검색 입력은 유지하고 결과 카드 스켈레톤만 보여 주는 화면을 둔다. app/search/[id]/error.tsx는 검색 영역 안에서 '다시 시도' 버튼을 보여 준다.
- 검증 메모: app/search/[id]/ 에 loading.tsx, error.tsx가 없다. app/loading.tsx:8 <Layout nav logo notification>, :14 alt="500 에러 이미지", :17 'AI 기반 입법정보 제공 플랫폼'. /search/%EC%9D%B4 SSR HTML에 이 스플래시 문구가 들어 있다. 오류는 app/error.tsx '페이지가 작동하지 않습니다.'로 간다.
- 파일: `services/web/app/loading.tsx`, `services/web/app/search/[id]/layout.tsx`, `services/web/app/search/apis/queries.ts`

### SEARCH-25 검색 결과 페이지 제목·설명이 고정 문구이고 공유 미리보기가 홈을 가리킴

- 분류: minor · seo · 작업량 S · 검증 confirmed
- 사용자 영향: 브라우저 탭과 북마크에 모든 검색이 '검색 페이지'로 표시된다. 링크를 공유하면 미리보기 URL이 홈이다. 검색 결과 페이지가 noindex 없이 검색엔진에 노출될 수 있다.
- 근거: app/search/[id]/layout.tsx:4-7 `title: '검색 페이지', description: '검색결과를 자세히 확인할 수 있는 페이지'`. curl https://lawdigest.kr/search/소방 → <title>검색 페이지</title>, og:url https://www.lawdigest.kr, canonical 없음, robots meta 없음.
- 수정안: page.tsx에 generateMetadata를 두어 title을 `'{검색어}' 검색 · 모두의입법`으로 만든다. robots는 noindex, follow로 둔다. og:url은 현재 검색 URL로 둔다.
- 검증 메모: app/search/[id]/layout.tsx:4-7 고정 title·description. curl https://lawdigest.kr/search/%EC%86%8C%EB%B0%A9 → <title>검색 페이지</title>, og:url https://www.lawdigest.kr, canonical·robots meta 없음.
- 파일: `services/web/app/search/[id]/layout.tsx`, `services/web/app/search/[id]/page.tsx`

### SEARCH-26 검색 결과 행 전체가 아니라 작은 화살표만 눌리고 a 안에 button이 중첩됨

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 의원 사진이나 이름을 눌러도 이동하지 않는다. 오른쪽 작은 화살표만 눌린다. 모바일에서는 터치 영역이 좁다. 의원 사진에는 대체 텍스트가 없다.
- 근거: SearchCongressman.tsx:13-28 링크가 :25-27 화살표(EnterButton)만 감싼다. SearchParty.tsx:31-33 도 같다. EnterButton.tsx:5-8 은 HeroUI `<Button>`(button 요소)이라 `<a>` 안에 대화형 요소가 중첩된다. SearchCongressman.tsx:15-19 Avatar에 name/alt가 없다.
- 수정안: 행 전체를 Link로 감싼다. 화살표는 장식 아이콘(aria-hidden)으로 바꾼다. Avatar에 alt={congressman_name}을 준다. 이미지가 없을 때를 위해 name fallback을 준다.
- 검증 메모: SearchCongressman.tsx:25-27, SearchParty.tsx:31-33 에서 Link가 EnterButton만 감싼다. EnterButton.tsx 는 HeroUI Button(button 요소)이라 a 안에 button이 중첩된다. SearchCongressman.tsx:15-19 Avatar에 name/alt가 없다.
- 파일: `services/web/app/search/[id]/components/SearchCongressman.tsx`, `services/web/app/search/[id]/components/SearchParty.tsx`, `services/web/components/common/Button/EnterButton.tsx`

### SEARCH-27 검색 모달 입력 글꼴이 14px이라 iOS에서 화면이 확대됨

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: iPhone Safari에서 모달 입력창을 누르면 페이지가 자동으로 확대된다. 닫은 뒤에도 확대 상태가 남는다.
- 근거: SearchBar.tsx:54-71 HeroUI Input 기본 size md는 input 'text-small'(14px)이다(node_modules/@heroui/theme/dist/chunk-3ZDIPBHM.mjs:125-128). DESIGN.md:258 '검색 입력은 iOS 확대를 피하기 위해 16px 이상'. 플로팅 검색은 mobile-floating-nav.css:466 에서 font-size 1rem으로 지킨다.
- 수정안: 검색 입력의 input 클래스에 text-base(16px)를 지정한다. SEARCH-16 공통 컴포넌트로 합칠 때 기준값으로 둔다.
- 검증 메모: SearchBar.tsx Input은 size 기본값 md이고 HeroUI 테마(chunk-3ZDIPBHM.mjs size.md)에서 input은 text-small(14px)이다. classNames.input에 글꼴 크기 지정이 없다. 운영 viewport meta는 'width=device-width, initial-scale=1, viewport-fit=cover'로 maximum-scale이 없어 iOS 자동 확대가 일어난다. DESIGN.md:258 16px 이상 규칙과 어긋난다. mobile-floating-nav.css:466 은 1rem이다.
- 파일: `services/web/components/common/SearchBar/SearchBar.tsx`

### SEARCH-29 검색 결과에 데이터 기준일이 없어 4개월 전 법안이 최신처럼 보임

- 분류: minor · trust · 백엔드 · 운영 데이터 작업 · 작업량 S · 검증 confirmed
- 사용자 영향: 오늘은 2026-11-02인데 최신순 검색 결과의 맨 위는 2026-07-09 발의 법안이다. 그 사이 법안이 없는 이유를 알 수 없어서 검색이 불완전하다고 느끼거나, 반대로 최신 정보라고 믿는다.
- 근거: curl /v1/search/bill?search_word=소방 → 첫 결과 propose_date 2026-07-09. 의료법 → 2026-07-01. SearchResultClient.tsx 에 수집 기준일 표시가 없다. PRODUCT.md:43 '검색 결과에는 필요할 때 출처, 최신성, 처리 상태... 를 드러내야 한다'.
- 수정안: 법안 섹션 제목 줄에 '{마지막 수집일} 기준' 날짜를 작게 표시한다. 수집일은 백엔드의 최신 적재 시각 API에서 받는다. 파이프라인이 멈춘 문제는 별도로 복구한다.
- 검증 메모: curl search_word=소방 → 첫 결과 propose_date 2026-07-09. 오늘은 2026-11-02다. SearchResultClient.tsx 에 수집 기준일 표시가 없다. PRODUCT.md:43 '검색 결과에는 필요할 때 출처, 최신성, 처리 상태, 불확실성을 드러내야 한다'.
- 파일: `services/web/app/search/[id]/SearchResultClient.tsx`

### SEARCH-28 검색어 하이라이트가 없어 결과가 왜 나왔는지 알 수 없음

- 분류: polish · ux · 작업량 M · 검증 confirmed
- 사용자 영향: '소방' 검색의 첫 결과는 제목이 '항공안전법'이라 왜 결과에 나왔는지 바로 알 수 없다. 본문 어디에 검색어가 있는지 표시가 없다.
- 근거: SearchResultClient.tsx:69 는 피드와 같은 BillList를 그대로 쓴다. components/Bill/BillList/Bill/Bill.tsx:98 summary 렌더링에 검색어 전달 경로가 없다. SafeBillSummaryHtml.tsx:54 `<mark>`는 요약 강조용이고 검색어용이 아니다.
- 수정안: BillList/Bill에 highlightTerms prop을 추가한다. 제목과 요약에서 검색어 토큰을 `<mark>`로 감싼다. 검색 결과에서는 일치 문장 주변 1~2줄 발췌를 보여 준다.
- 검증 메모: SearchResultClient.tsx:69 는 피드와 같은 BillList를 쓰고 BillList props(bills, isFetching, fetchRef, detail, feedType)에 검색어 전달 경로가 없다. curl '소방' 첫 결과는 '항공안전법 일부개정법률안'이다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Bill/BillList/BillList.tsx`, `services/web/app/search/[id]/SearchResultClient.tsx`

### SEARCH-30 백엔드 최근 검색어 API가 오타 경로이고 프론트에서 쓰이지 않음

- 분류: polish · dead-code · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 로그인 사용자도 최근 검색어가 기기마다 따로 저장된다. 다른 기기에서 이어서 쓸 수 없다. 비로그인 GET은 401이 아니라 404 '해당 유저를 찾을 수 없습니다.'를 반환한다.
- 근거: SearchController.java:47,68,87 `/recent-keword`(keyword 오타). 웹 코드에서 recent-keword 호출이 0건이다(grep). curl GET https://api.lawdigest.kr/v1/search/recent-keword → HTTP404 '해당 유저를 찾을 수 없습니다.' SearchModal.tsx:17 초기 state는 'recentkeywords'(소문자 k)를 읽고, 다른 곳은 'recentKeywords'를 쓴다.
- 수정안: 방향을 정한다. 로그인 사용자 동기화를 할 거라면 /recent-keyword로 경로를 고친다. 비로그인은 401을 반환한다. useRecentKeywords 훅에서 로그인 여부에 따라 서버와 localStorage를 고른다. 하지 않을 거라면 엔드포인트와 SearchKeyword 엔티티를 제거한다. 소문자 키 초기화 코드는 삭제한다.
- 검증 메모: SearchController.java POST/GET/DELETE 모두 '/recent-keword'다. services/web 의 app·components·lib·api·hooks 에서 recent-keword/recent-keyword 호출이 0건이다. curl GET https://api.lawdigest.kr/v1/search/recent-keword → HTTP404 '해당 유저를 찾을 수 없습니다.'. SearchModal.tsx:17 은 'recentkeywords'(소문자)를 읽고 :26,38,45,53 은 'recentKeywords'를 쓴다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/controller/SearchController.java`, `services/backend/src/main/java/com/everyones/lawmaking/facade/SearchFacade.java`, `services/web/components/common/SearchBar/SearchModal.tsx`

### SEARCH-32 검색 타입 정의와 리스트 key가 실제 응답과 맞지 않음

- 분류: polish · dead-code · 작업량 S · 검증 confirmed
- 사용자 영향: 지금 사용자에게 보이는 문제는 없다. 다만 타입이 틀려서 SEARCH-01·05 같은 결함을 컴파일 단계에서 잡지 못한다.
- 근거: types/type/search/searchBill.ts:5 `search_response: BillProps` — 실제 응답은 배열이다(SearchBillResponse.java:17 List<BillDto>). searchCongressmanParty.ts:1-9 는 정당/의원 필드를 한 타입에 섞는다(discriminated union 아님). SearchList.tsx:11 key `${searchResult.party_id + index}`는 숫자 덧셈이라 서로 다른 정당이 같은 key를 가질 수 있다.
- 수정안: search_response를 BillResponse[]로 고친다. 의원/정당을 search_type 기준 union 타입으로 나눈다. key는 `${search_type}-${party_id|congressman_id}`로 쓴다.
- 검증 메모: types/type/search/searchBill.ts:5 search_response: BillProps(단일 객체 타입)이고 API 응답은 배열이다. searchCongressmanParty.ts 는 정당·의원 필드를 한 인터페이스에 섞는다. SearchList.tsx:11 key `${searchResult.party_id + index}`는 숫자 덧셈이라 party 1·index 2와 party 2·index 1이 같은 key '3'이 된다.
- 파일: `services/web/types/type/search/searchBill.ts`, `services/web/types/type/search/searchCongressmanParty.ts`, `services/web/app/search/[id]/components/SearchList.tsx`

## 의원·정당 프로필 (PROFILE)

### PROFILE-01 대표/공동발의 탭이 법안 3건만 보여 주고 더 불러올 수 없다

- 분류: blocker · bug · 작업량 M · 검증 confirmed
- 사용자 영향: 대표발의 197건, 공동발의 1634건인 의원(이해식)의 프로필에서도 법안이 3건만 보인다. 스크롤해도 다음 페이지를 불러오지 않는다. '더 보기' 버튼도 없다. 정당 페이지(16,487건)도 같다. 프로필의 핵심 기능인 의원·정당 발의 이력을 볼 수 없다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/components/Bill/BillList/BillList.tsx:28-33 — 스피너와 무한스크롤 센티널 `<div ref={fetchRef} className="h-16">`을 `feedType === 'sorted_by_latest'`일 때만 렌더한다. /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/BillContainer/BillContainer.tsx:35 와 /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/BillContainer/BillContainer.tsx:35 는 feedType을 넘기지 않는다. 운영 HTML https://lawdigest.kr/congressman/CCU1009B , /party/1 , /party/60 에서 '>자세히 보기<'는 각각 정확히 3개이고 `aria-hidden="true" class="h-16` 센티널은 0개다. 같은 시점의 API GET /v1/congressman/bill_info?congressman_id=CCU1009B&type=represent_proposer&page=0&size=3 응답은 `"last_page": false`다. 함께 드러날 결함: apis/queries.ts:21(두 파일 모두) `getNextPageParam`이 `last_page ? (page_number === 0 ? 1 : undefined) : page_number + 1`로 첫 페이지가 마지막 페이지여도 page 1을 다시 요청한다. queryKey가 `['/congressman/bill_info', id]`, `['/party/bill', id]`로 탭 type을 포함하지 않는다. 그래서 탭 전환을 `setBills([])` 다음 `refetch()`(BillContainer.tsx:27-30)로 처리한다.
- 수정안: 프로필 BillContainer가 공용 무한스크롤을 실제로 쓰게 한다. BillList의 센티널·스피너 노출 조건을 `feedType` 대신 `hasNextPage`/`isFetchingNextPage` 같은 명시적 prop으로 바꾼다. 피드와 프로필이 같은 기준을 쓰게 한다. queryKey에 type을 넣어 `['/congressman/bill_info', id, type]`으로 만든다. 탭마다 캐시를 분리하고 `useEffect(refetch)`와 `useState(bills)` 복제 상태를 없앤다. data.pages를 그대로 렌더한다. getNextPageParam은 `last_page ? undefined : page_number + 1`로 고친다. 페이지 크기 3은 10~20으로 늘린다.
- 검증 메모: BillList.tsx:28,33에서 스피너와 센티널 `<div ref={fetchRef} className="h-16">`은 `feedType === 'sorted_by_latest'`일 때만 렌더된다. 의원 BillContainer.tsx:35와 정당 BillContainer.tsx:35는 feedType을 넘기지 않는다. 운영 HTML을 확인했다. /congressman/CCU1009B, /party/1, /party/60, /party/36, /congressman/7469929V, /congressman/CC78321E 모두 '>자세히 보기<'가 3개이고 h-16 센티널은 0개다. 같은 시점 API GET /v1/congressman/bill_info?congressman_id=CCU1009B&type=represent_proposer&page=0&size=3의 pagination_response는 {"page_number":0,"last_page":false}다. 두 queries.ts:21의 getNextPageParam은 last_page가 true여도 page_number 0이면 1을 반환한다. queryKey는 type을 포함하지 않는다(queries.ts:14). apis.ts:13과 api.ts:13의 size는 3이다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/components/Bill/BillList/BillList.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/BillContainer/BillContainer.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/BillContainer/BillContainer.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/apis/queries.ts`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/apis/queries.ts`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/apis/apis.ts`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/apis/api.ts`

### PROFILE-03 정당 간부 이름이 하드코딩 상수에서 나와 운영 화면에 틀린 인물이 표시된다

- 분류: major · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 더불어민주당 페이지가 원내대표 홍익표, 사무총장 조정식, 정책위의장 이개호를 보여 준다. 같은 시점 API 값은 박찬대·김윤덕·진성준이다. 개혁신당(이준석/양향자 vs API 허은아/천하람)과 진보당(윤희숙/강성희 vs API 김재연/윤종오)도 다르다. 사회민주당·기본소득당은 API에 값이 있는데도 4칸 모두 '없음'이다. 국민의힘 원내대표는 '윤재욱'으로 이름이 틀렸다. 2026-11 기준으로는 '당대표 이재명'(2025년 대통령 취임), '당대표 한동훈'(2024-12 사퇴)처럼 현실과 맞지 않는 값이 그대로 노출된다. 정치 정보 서비스의 신뢰를 직접 해친다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/constants/party/party.ts:40-90 PARTY_LEADER/PARTY_FLOOR_LEADER/PARTY_SECRETARY_GENERAL/PARTY_POLISY_COMMITTEE_CHAIRMAN 하드코딩(2024년 초 값, '녹새정의당' 오타, '윤재욱'). /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx:72-91이 이 상수를 party_name 키로 조회한다. 운영 HTML https://lawdigest.kr/party/1 본문: '당대표 이재명 원내대표 홍익표 사무총장 조정식 정책위의장 이개호'. 같은 시점 API GET /v1/party/detail?party_id=1 응답: "party_leader": "이재명", "parliamentary_leader": "박찬대", "secretary_general": "김윤덕", "policy_committee_chairman": "진성준". party_id=7: "허은아"/"천하람". party_id=9: "김재연"/"윤종오". party_id=36: "한창민". /Users/minjaepark/code/LawDigest/services/web/types/type/party/party.ts:1-13 PartyDetailResponse에 이 필드들이 없다.
- 수정안: PartyDetailResponse 타입에 party_leader, parliamentary_leader, secretary_general, policy_committee_chairman(nullable)을 추가한다. 화면은 API 값만 쓴다. constants의 간부 상수 4종은 삭제한다. API 값 자체도 2026-11 기준 최신이 아니다(국민의힘 당대표 한동훈 등). 그러므로 간부 데이터의 갱신 경로(수집 파이프라인 또는 관리자 입력)와 기준일 표기를 함께 만든다. 값이 없는 칸은 '없음' 대신 칸 자체를 숨긴다.
- 검증 메모: constants/party/party.ts:40-90에 간부 상수가 하드코딩되어 있다. 국민의힘 원내대표가 '윤재욱'으로 적혀 있고 실제 인물은 윤재옥이다. '녹새정의당' 오타도 있다. PartyDetail.tsx:72-91이 이 상수를 party_name 키로 조회하고, 값이 없으면 '없음'을 표시한다. 운영 HTML /party/1 본문은 '당대표 이재명 원내대표 홍익표 사무총장 조정식 정책위의장 이개호'다. 같은 시점 API /v1/party/detail?party_id=1의 값은 박찬대/김윤덕/진성준이다. party_id=7 API는 허은아/천하람이고 상수는 이준석/양향자다. party_id=9 API는 김재연/윤종오이고 상수는 윤희숙/강성희다. party_id=36 API는 한창민/한창민/김보경이다. 그런데 운영 HTML /party/36은 4칸 모두 '없음'이다. types/type/party/party.ts:1-13에는 간부 필드가 없다. API 값 자체도 최신이 아니다. 예를 들어 party_id=2 party_leader는 '한동훈'이다. 그래서 데이터 운영 작업도 필요하다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/constants/party/party.ts`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/types/type/party/party.ts`

### PROFILE-04 '원내 N당' 순위가 하드코딩이라 틀리거나 비어 있고 메타 설명에 'undefined'가 찍힌다

- 분류: major · data · 작업량 S · 검증 confirmed
- 사용자 영향: 조국혁신당(12석, 실제 3위)이 '원내 8당'으로 표시된다. 진보당과 자유통일당도 똑같이 '원내 8당'이다. 이미 합당해 없어진 더불어민주연합·국민의미래가 3·4위를 차지한다. 사회민주당·기본소득당·무소속 페이지에서는 정당명 아래 빈 h3가 생긴다. 검색 결과·공유 미리보기 설명에는 '사회민주당 상세 페이지, undefined, ...'가 노출된다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/constants/party/party.ts:27-38 PARTY_POSITION. /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx:46, /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/page.tsx:24. 운영 HTML https://lawdigest.kr/party/36: `<meta name="description" content="사회민주당 상세 페이지, undefined, 지역구 0 석, 비례대표 1 석"/>`, 빈 `<h3 class="text-gray-3 dark:text-gray-2">`. https://lawdigest.kr/party/60 의 description: '무소속 상세 페이지, undefined, 지역구 1 석, ...'. API GET /v1/party/parliamentary 응답 순서: 민주당 170, 국민의힘 108, 조국혁신당 12, 개혁신당 3, 진보당 3, 사회민주당 1, 기본소득당 1.
- 수정안: 순위를 상수로 두지 않는다. /v1/party/parliamentary의 congressman_count로 계산하거나 백엔드가 rank를 내려준다. 순위가 없는 정당(무소속, 원외)에는 해당 줄과 메타 문구를 빼고, 메타 설명은 값이 있는 항목만 이어 붙인다. PARTY_POSITION 상수는 삭제한다.
- 검증 메모: PARTY_POSITION(party.ts:27-38)은 하드코딩이다. 자유통일당·진보당·조국혁신당이 모두 '원내 8당'이다. 운영 /party/10은 `<h3 ...>원내 8당</h3>`과 description '조국혁신당 상세 페이지, 원내 8당, 지역구 0 석, 비례대표 12 석'을 보여 준다. /party/36의 description은 '사회민주당 상세 페이지, undefined, 지역구 0 석, 비례대표 1 석'이고 h3는 비어 있다. /party/60도 'undefined'를 출력하고 h3가 비어 있다. API /v1/party/parliamentary 응답 순서는 다음과 같다. 1 더불어민주당 170, 2 국민의힘 108, 10 조국혁신당 12, 7 개혁신당 3, 9 진보당 3, 36 사회민주당 1, 62 기본소득당 1.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/constants/party/party.ts`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/page.tsx`

### PROFILE-05 무소속 정당 페이지 로고가 깨진 이미지(…/onull)로 나오고 다크 모드에서는 런타임 오류가 난다

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 무소속(party/60) 페이지의 가장 큰 시각 요소인 130px 원 안에 깨진 이미지 아이콘이 뜬다. 다크 모드 사용자는 `null.replace` 예외로 프로필 영역이 오류 화면으로 바뀐다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyLogo.tsx:13 `${IMAGE_URL}${isDark ? party_img_url.replace('wide', 'dark') : party_img_url}` — null 처리가 없다. API GET /v1/party/detail?party_id=60 → "party_img_url": null. 운영 HTML https://lawdigest.kr/party/60 : `<img alt="무소속 로고 이미지" ... src="/_next/image?url=...lawDigestBucket%2Fonull&w=640&q=75"/>`. 이 이미지 URL을 GET하면 404다. 의원 쪽 PartyLogo(app/congressman/[id]/components/Congressman/PartyLogo.tsx:21-36)는 null일 때 PartyLogoReplacement로 대체하는데 정당 쪽에는 이 처리가 없다. 타입(types/type/party/party.ts:4)도 `party_img_url: string`으로 null을 표현하지 않는다.
- 수정안: 정당 PartyLogo도 `party_img_url`이 없으면 기존 `PartyLogoReplacement circle`을 쓴다. 두 PartyLogo를 하나의 공용 컴포넌트로 합친다. 응답 타입의 이미지·URL 필드를 `string | null`로 고쳐 같은 유형의 누락을 컴파일 단계에서 잡는다.
- 검증 메모: 정당 PartyLogo.tsx:13에는 null 처리가 없다. API /v1/party/detail?party_id=60의 party_img_url은 null이다. 운영 HTML /party/60의 이미지 srcSet은 `...lawDigestBucket%2Fonull`이다. 원본 URL과 /_next/image URL을 GET하면 둘 다 404다. 원은 PartyLogo.tsx:11에서 w-[130px] h-[130px]다. ThemeSwitchButton(Header.tsx:102,113)이 setTheme('dark')를 호출하면 theme==='dark'가 되어 null.replace TypeError가 난다. 의원 쪽 PartyLogo.tsx:22-36에는 PartyLogoReplacement 분기가 있다. 표현 하나를 바로잡는다. 가장 가까운 오류 경계는 app/error.tsx다. 그래서 프로필 영역만이 아니라 페이지 전체가 '페이지가 작동하지 않습니다.' 화면으로 바뀐다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyLogo.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/PartyLogo.tsx`, `/Users/minjaepark/code/LawDigest/services/web/types/type/party/party.ts`

### PROFILE-06 존재하지 않는 의원·정당 id가 404가 아니라 HTTP 200과 오류 화면으로 응답한다

- 분류: major · bug · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: 오래된 링크나 잘못된 공유 링크로 들어온 사용자는 '페이지를 찾을 수 없습니다' 대신 '페이지가 작동하지 않습니다' 같은 서버 오류 화면을 본다. 브라우저 탭 제목도 없다. 검색엔진은 빈 페이지를 200으로 색인한다.
- 근거: curl https://lawdigest.kr/congressman/NOPE → 200, `<title>` 없음, 본문에 '의원 프로필'만 있고 `$RX`(Suspense 클라이언트 렌더 폴백). https://lawdigest.kr/party/9999 → 200, `<title>` 없음, 프로필 없이 '대표발의한 법안 공동발의한 법안 발의한 법안이 존재하지 않습니다.'만 렌더된다. API GET /v1/congressman/detail?congressman_id=NOPE → {"status":"INTERNAL_SERVER_ERROR","code":500}. GET /v1/party/detail?party_id=9999 → 404 "해당 파티를 찾을 수 없습니다."('정당'을 '파티'로 표기). GET /v1/party/detail?party_id=abc → 500. 프론트 app 전체에서 `notFound()` 호출이 0건이다(grep).
- 수정안: page.tsx에서 상세를 먼저 가져오고 404(백엔드 수정 후)이면 `notFound()`를 호출해 app/not-found.tsx를 HTTP 404로 응답한다. generateMetadata도 같은 분기를 탄다. 백엔드는 없는 congressman_id에 500 대신 404를 반환한다. 잘못된 party_id 형식은 400으로 응답한다. 오류 메시지의 '파티'는 '정당'으로 고친다.
- 검증 메모: curl 결과는 다음과 같다. https://lawdigest.kr/congressman/NOPE, /party/9999, /party/abc 모두 HTTP 200이다. 셋 다 `<title>`이 없고 `$RX`가 3회 나온다. 본문은 '의원 프로필 ... 대표발의한 법안 공동발의한 법안 발의한 법안이 존재하지 않습니다.'뿐이다. API 응답은 다음과 같다. congressman/detail?congressman_id=NOPE는 500 '서버 내부 오류입니다.'다. party/detail?party_id=9999는 404 '해당 파티를 찾을 수 없습니다.'다. party_id=abc는 500이다. services/web/app 아래에서 notFound 호출을 grep하면 0건이다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/page.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/page.tsx`, `/Users/minjaepark/code/LawDigest/services/backend/src/main/java/com/everyones/lawmaking/controller/CongressmanController.java`, `/Users/minjaepark/code/LawDigest/services/backend/src/main/java/com/everyones/lawmaking/facade/CongressmanFacade.java`

### PROFILE-07 정당 의석수와 소속 의원 목록 수가 서로 다르다

- 분류: major · trust · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 더불어민주당 페이지 상단은 '의석수 170석'인데 아래 소속 의원 그리드는 161명이다. 무소속은 '1석, 지역구 1·비례 0'인데 소속 의원은 8명이다. 그중 최혁진 의원은 비례대표다. 진보당은 3석인데 4명이 나온다. 같은 화면 안에서 숫자가 어긋나 사용자는 데이터 전체를 의심한다.
- 근거: API GET /v1/party/detail?party_id=1 → district 160 + proportional 10 = 170. GET /v1/party/congressman?party_id=1 → 161명. party_id=2: 108 vs 110. party_id=9: 3 vs 4. party_id=60: 1(지역구1·비례0) vs 8. GET /v1/congressman/detail?congressman_id=CC78321E → 무소속, "district": "비례대표". 상세 의석수는 party 테이블에 저장된 컬럼이다(/Users/minjaepark/code/LawDigest/services/backend/src/main/java/com/everyones/lawmaking/common/dto/response/PartyDetailResponse.java:61-62). 의원 목록은 congressman 테이블 기준이다(PartyFacade.java:36-37). 화면: /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx:36-57.
- 수정안: 의석수를 저장 컬럼 대신 현직 congressman의 소속·선출 구분 집계로 계산하는 단일 기준을 백엔드에 둔다. 상세 응답과 /party/parliamentary, 소속 의원 목록이 같은 쿼리를 쓰게 한다. 운영 DB의 party 의석 컬럼은 재계산하거나 폐기한다.
- 검증 메모: API /v1/party/detail의 지역구+비례 합계와 /v1/party/congressman 목록 수를 비교했다. party_id=1은 160+10=170과 161명이다. party_id=2는 90+18=108과 110명이다. party_id=9는 1+2=3과 4명이다. party_id=60은 지역구 1·비례 0과 8명이다. /v1/congressman/detail?congressman_id=CC78321E(최혁진)는 party_name '무소속', district '비례대표'다. PartyDetailResponse.from은 party.getDistrictCongressmanCount() 같은 저장 컬럼을 쓴다. 목록은 congressmanService.getPartyCongressman(PartyFacade.java)이다.
- 파일: `/Users/minjaepark/code/LawDigest/services/backend/src/main/java/com/everyones/lawmaking/facade/PartyFacade.java`, `/Users/minjaepark/code/LawDigest/services/backend/src/main/java/com/everyones/lawmaking/common/dto/response/PartyDetailResponse.java`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx`

### PROFILE-08 프로필 어디에도 데이터 기준일이 없고 발의 목록은 2026-07에서 멈춰 있다

- 분류: major · trust · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 2026-11-02에 프로필을 연 사용자는 최신 법안이 2026-07-09로 끝나는 것을 보지만 그 이유를 알 수 없다. 의원의 활동이 멈춘 것으로 오해할 수 있다. 소속 위원회, 의석수, 간부도 언제 기준인지 알 수 없다.
- 근거: 운영 HTML https://lawdigest.kr/congressman/CCU1009B 첫 법안 '2026-07-09'. https://lawdigest.kr/party/1 첫 법안 '2026-07-10'. 의원·정당 컴포넌트(CongressmanDetail.tsx, PartyDetail.tsx) 전체에 업데이트 시각·출처 표기가 없다. 운영 DB 최신 발의일 2026-07-09(과제 전제), 2026-08~10 적재 0건.
- 수정안: 수집 파이프라인을 복구한다. 백엔드는 마지막 동기화 시각(예: `data_synced_at`)을 상세 응답에 넣는다. 프로필 통계 옆에 날짜 값 하나(예: '2026.07.10 기준')를 둔다. 출처(국회 열린국회정보)는 링크로 연결한다. 기준일이 일정 기간을 넘으면 같은 자리에서 색 변화로 상태를 표시한다.
- 검증 메모: 운영 HTML /congressman/CCU1009B의 날짜는 첫 값부터 '2026-07-09'다. /party/1의 첫 카드는 '2026-07-10 접수'다. app/congressman과 app/party 아래에서 '기준|updated|synced|출처'를 grep하면 0건이다. 프로필에는 데이터 기준일과 출처 표기가 없다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx`

### PROFILE-09 정당 페이지 첫 법안 카드 제목 자리에 제안이유 원문이 노출된다

- 분류: major · data · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 더불어민주당 페이지에 보이는 법안 3건(PROFILE-01 때문에 이것이 전부)이 모두 AI 요약 없이 '현행법은 “유아”를 … 유...' 같은 원문 문장 조각을 제목으로 보여 준다. 정당 페이지의 첫인상이 미가공 데이터가 된다.
- 근거: API GET /v1/party/bill?party_id=1&type=represent_proposer&page=0&size=3 → 3건 모두 gpt_summary=null이고 title이 '현행법은 “유아”를 “만 3세부터 초등학교 취학전까지의 어린이”로 규정하고 있으면서도 … 유...' 같은 제안이유 문장이다. 운영 HTML https://lawdigest.kr/party/1 첫 카드 헤드라인이 같은 문장이고 그 아래 '제안이유 및 주요내용' 원문이 이어진다.
- 수정안: 요약 파이프라인에서 누락된 최근 법안(2026-07-10 접수분)의 title/gpt_summary를 다시 생성한다. 카드는 요약이 없으면 title 대신 bill_name(정식 법안명)을 헤드라인으로 쓴다. 제안이유 원문은 접힌 영역에 둔다. 이 대체 규칙은 공용 Bill 카드 한곳에서 처리한다.
- 검증 메모: API /v1/party/bill?party_id=1&type=represent_proposer&page=0&size=3의 3건(유아교육법, 풍수해ㆍ지진재해보험법, 약사법 일부개정법률안, 모두 2026-07-10)은 gpt_summary가 비어 있다. title은 '현행법은 “유아”를 …'처럼 제안이유 문장 조각이다. Bill.tsx:298은 `<h2>{title}</h2>`, :300은 `<h3>{bill_name}</h3>`다. 운영 HTML /party/1의 첫 카드 헤드라인이 그 문장이다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/components/Bill/BillList/Bill/Bill.tsx`

### PROFILE-10 의원 사진 18명분이 404인데 fallback이 없어 빈 원으로 보인다

- 분류: minor · visual · 운영 데이터 작업 · 작업량 S · 검증 confirmed
- 사용자 영향: 한동훈·최혁진·김태규·이진숙 등 18명(조회한 279명 중)의 프로필과 정당 소속 의원 그리드에 이니셜도 아이콘도 없는 빈 회색 원이 나온다.
- 근거: 정당 1·2·60 소속 279명의 congressman_image_url을 HEAD 요청한 결과 404가 18건이다(예: /congressman/22/CC78321E.jpg, /congressman/22/5DC8083A.jpg). HeroUI Avatar 2.2.7(node_modules/@heroui/avatar/dist/chunk-SXMLSBOY.mjs:32-34)은 `showFallback`이 기본 false이고 src가 있으면 fallback을 null로 둔다. 이미지는 opacity-0으로 남는다. /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx:45-49, /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyCongressman/PartyCongressmanItem.tsx:12-16 — 둘 다 `showFallback`, `name`, 의미 있는 `alt`가 없다. 운영 HTML의 프로필 사진 alt는 'avatar'다.
- 수정안: 두 Avatar에 `showFallback name={congressman_name} alt={`${congressman_name} 의원`}`을 지정한다. 의원 Avatar를 공용 컴포넌트 하나로 묶는다. 누락된 18명의 사진을 이미지 버킷에 적재한다.
- 검증 메모: 이미지 버킷 HEAD 결과는 /congressman/22/CC78321E.jpg 404, 5DC8083A.jpg 404, CCU1009B.jpg 200이다. 18건 전체는 다시 세지 않았고 표본 2건을 재현했다. @heroui/avatar 2.2.7 chunk-LTC67JRI.mjs:39는 showFallback 기본값이 false다. chunk-SXMLSBOY.mjs:33에서 `!showFallback && src`이면 fallback이 없다. CongressmanDetail.tsx:45-49와 PartyCongressmanItem.tsx:12-16에는 showFallback, name, alt가 없다. 운영 HTML /congressman/CCU1009B의 프로필 사진은 alt="avatar"다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyCongressman/PartyCongressmanItem.tsx`

### PROFILE-11 홈페이지/웹사이트 버튼이 링크가 없거나 사이트 내부 상대경로로 깨진다

- 분류: minor · bug · 운영 데이터 작업 · 작업량 S · 검증 confirmed
- 사용자 영향: homepage가 없는 72명(279명 중)과 무소속 정당 페이지에서 '홈페이지 방문'/'웹사이트 방문'을 눌러도 아무 일도 일어나지 않는다. 백혜련·윤후덕·이상식·주철현·곽규택·장동혁 6명은 lawdigest.kr/congressman/blog.naver.com/... 같은 사이트 내부 404로 이동한다. 링크는 같은 탭에서 열려 서비스를 떠난다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx:120-128 `href={homepage}`, /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx:93-101 `href={website_url}` — null 분기, 스킴 보정, isExternal이 없다. PartyDetail.tsx:99 className에 오타 `2-[135px]`(w-[135px] 의도)가 있다. 운영 HTML https://lawdigest.kr/party/60 : href 없는 `<a ... tabindex="0" role="button">웹사이트 방문`. 279명 상세 분석 결과: homepage null 72명, 스킴 없는 값 6명('100hyeryun.blog.me', 'blog.naver.com/yuns609', 'www.youtube.com/@_jangdonghyuk_' 등).
- 수정안: URL이 없으면 버튼을 렌더하지 않는다. 스킴이 없는 값은 수집 단계에서 https://를 붙여 정규화한다. 외부 링크는 `isExternal`(target=_blank, rel=noopener)로 연다.
- 검증 메모: 279명의 API 상세를 직접 집계했다. homepage null이 72명이다. 스킴 없는 값은 6명이다. 백혜련 '100hyeryun.blog.me', 장동혁 'www.youtube.com/@_jangdonghyuk_', 이상식, 주철현, 윤후덕, 곽규택의 'blog.naver.com/...'다. CongressmanDetail.tsx:122 `href={homepage}`와 PartyDetail.tsx:95 `href={website_url}`에는 null 분기와 isExternal이 없다. PartyDetail.tsx:99에 `2-[135px]` 오타가 있다. 운영 HTML /party/60의 '웹사이트 방문'은 href 없는 `<a ... tabindex="0" role="button">`이다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx`

### PROFILE-12 의원 약력에 HTML 엔티티(&amp; &bull; &rsquo; 등)가 그대로 노출된다

- 분류: minor · data · 백엔드 · 운영 데이터 작업 · 작업량 S · 검증 confirmed
- 사용자 영향: 20명의 약력에 'Meagher &amp; Flom LLP', '&bull;', '&rsquo;' 같은 문자열이 그대로 보인다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx:115-117 — `&middot;`, `&nbsp;`, `&#39;` 세 가지만 replaceAll로 바꾼다. 279명 brief_history 분석: &bull; 51, &rsquo; 28, &lsquo; 9, &amp; 3, &shy; 2, &sim; 1회 미처리(20명, 예: FIE6569O 곽상언 'Skadden, Arps, Slate, Meagher &amp; Flom LLP').
- 수정안: 수집 또는 API 응답 단계에서 HTML 엔티티를 표준 디코더로 한 번에 디코딩해 저장한다. 프론트의 개별 replaceAll은 제거한다.
- 검증 메모: 279명의 brief_history를 직접 집계했다. 미처리 엔티티는 &bull; 51, &rsquo; 28, &lsquo; 9, &amp; 3, &shy; 2, &sim; 1회이고 대상은 20명이다. 보고와 정확히 일치한다. CongressmanDetail.tsx:116은 &middot;, &nbsp;, &#39; 세 가지만 replaceAll로 바꾼다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`

### PROFILE-13 소속 위원회가 없는 의원의 메타 설명에 'null'이 들어가고 빈 줄이 생긴다

- 분류: minor · seo · 작업량 S · 검증 confirmed
- 사용자 영향: 권성동·구자근 등 30명의 공유 미리보기·검색 설명이 '…경북 구미시갑 재선, null'로 끝난다. 프로필 카드에는 빈 p 태그가 남는다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/page.tsx:23 `${data.district} ${data.elected}, ${data.commits}`. 운영 HTML https://lawdigest.kr/congressman/7469929V : `<meta name="description" content="국민의힘 구자근 의원의 상세 프로필 페이지, 경북 구미시갑 재선, null"/>`, `<p class="text-xs"></p>`. 279명 중 commits null 30명.
- 수정안: 메타 설명과 카드 모두 값이 있는 항목만 배열로 모아 join한다. '상세 프로필 페이지' 같은 페이지 설명 문구 대신 정당·지역구·선수·위원회 같은 내용을 담는다. 타입의 nullable 필드를 `string | null`로 고친다.
- 검증 메모: 운영 HTML /congressman/7469929V의 description은 '국민의힘 구자근 의원의 상세 프로필 페이지, 경북 구미시갑 재선, null'이다. 같은 HTML에 `<p class="text-xs"></p>`가 있다. page.tsx:23은 `${data.commits}`를 그대로 넣는다. 279명 중 commits가 비어 있는 의원은 30명이다(직접 집계).
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/page.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/types/type/congressman/congressman.ts`

### PROFILE-14 의원 상세가 async 클라이언트 컴포넌트라 렌더할 때마다 새 Promise로 일시 중단된다

- 분류: minor · perf · 작업량 M · 검증 confirmed
- 사용자 영향: 클라이언트 이동으로 프로필에 들어오거나 상위가 다시 렌더될 때 가장 가까운 Suspense 경계까지 일시 중단된다. 프로필 세그먼트에는 loading.tsx가 없다. 그래서 헤더까지 포함한 루트 스플래시(로고와 스피너)로 화면 전체가 바뀔 수 있다. 운영 HTML에도 이 스플래시가 Suspense fallback으로 들어 있다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx:10-14 `export default async function` 안에서 `useQueryClient()`와 `await queryClient.fetchQuery(...)`를 쓰고 eslint rules-of-hooks를 끈다. /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx:19-23도 같다. 부모 CongressmanContainer.tsx:1과 PartyContainer.tsx:1이 'use client'이므로 둘 다 클라이언트 컴포넌트다(React 19.2.7은 async 클라이언트 컴포넌트를 지원하지 않는다). app/congressman/[id], app/party/[id]에 loading.tsx가 없다. 운영 HTML https://lawdigest.kr/congressman/CCU1009B 에 app/loading.tsx 마크업(`alt="500 에러 이미지"` 로고와 aria-label="Loading" 스피너)이 들어 있다. 로딩 화면 이미지 alt가 '500 에러 이미지'다(app/loading.tsx:14). 브라우저 검증은 하지 않았다.
- 수정안: 서버 page.tsx에서 `prefetchQuery`로 상세를 채운다. 클라이언트에서는 `useSuspenseQuery`로 읽고 async/rules-of-hooks 우회를 제거한다. 프로필 세그먼트에 카드 형태의 스켈레톤 loading.tsx(또는 Suspense 경계)를 두어 레이아웃 이동 없이 로딩한다. 로딩 이미지 alt는 '모두의입법'으로 고친다.
- 검증 메모: 다음 코드 근거를 직접 확인했다. CongressmanDetail.tsx:10-14와 PartyDetail.tsx:19-23은 `export default async function` 안에서 useQueryClient와 await fetchQuery를 호출한다. 두 파일 모두 rules-of-hooks를 끈다. 부모 CongressmanContainer.tsx:1과 PartyContainer.tsx:1은 'use client'다. React는 19.2.7, Next는 15.5.20이다. app/congressman/[id]와 app/party/[id]에는 loading.tsx가 없다. app/loading.tsx:14의 로고 alt는 '500 에러 이미지'이고 운영 HTML에서 2회 나온다. 운영 HTML에 루트 loading 마크업이 들어 있는 것은 스트리밍의 기본 fallback이다. 이것만으로 전체 스플래시 전환이 증명되지는 않는다. 규칙상 브라우저 재현은 하지 않았다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/page.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/page.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/loading.tsx`

### PROFILE-15 탭을 바꾸면 로딩 표시 없이 목록이 비었다가 채워진다

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: '공동발의한 법안' 탭을 누르면 목록이 사라지고 아무것도 없는 상태가 이어진다. 응답이 오면 갑자기 채워진다. 스피너와 스켈레톤이 없어 동작했는지 알 수 없다. 레이아웃도 크게 이동한다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/BillContainer/BillContainer.tsx:27-30 `setBills([]); refetch();`, :36 빈 상태는 `!isFetching`일 때만 보인다. 스피너는 BillList.tsx:28에서 feedType 조건에 묶여 프로필에서 렌더되지 않는다. 정당 BillContainer.tsx도 같다.
- 수정안: PROFILE-01의 queryKey 분리를 적용한다. 그러면 탭마다 캐시가 유지되고 처음 여는 탭만 스켈레톤 카드 2~3개를 보여 준다. 공용 BillList 스켈레톤을 피드와 같이 쓴다.
- 검증 메모: BillContainer.tsx:27-30(두 파일)은 탭이 바뀌면 `setBills([]); refetch();`를 실행한다. :36의 빈 상태 문구는 `!isFetching`일 때만 보인다. BillList.tsx:28의 스피너는 feedType 조건에 묶여 프로필에서는 렌더되지 않는다. 그래서 refetch 동안 목록 영역이 비어 있고 로딩 표시도 없다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/BillContainer/BillContainer.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/BillContainer/BillContainer.tsx`, `/Users/minjaepark/code/LawDigest/services/web/components/Bill/BillList/BillList.tsx`

### PROFILE-16 정당 소속 의원 그리드: 총원 표시 없이 8명만 보이고, 펼치는 컨트롤은 이름 없는 화살표 하나뿐이다

- 분류: minor · ux · 작업량 M · 검증 confirmed
- 사용자 영향: 161명 중 8명만 보인다. 목록이 잘렸다는 사실과 총인원을 알 수 없다. 펼치는 컨트롤은 작은 화살표 아이콘 하나뿐이고 스크린리더에서는 이름 없는 버튼이다. 펼치면 161장의 사진을 한 번에 요청한다. 이 목록은 SSR되지 않아 첫 로딩 때 스피너가 나오고 아래 영역이 밀린다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyCongressman/PartyCongressmanList.tsx:19-41 — slice(0, 8), `<Button isIconOnly ...>{isOpened ? <IconArrowUp /> : <IconArrowDown />}</Button>`에 aria-label·aria-expanded가 없다. 총원 표시가 없고 useQuery(서버 prefetch 없음, :10)를 쓴다. /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyCongressman/PartyCongressmanItem.tsx:18 모든 항목에 '의원' 라벨이 반복된다. API GET /v1/party/congressman?party_id=1 → 161명.
- 수정안: 그리드 위 제목 행에 인원수 값(161)을 둔다. 펼침 컨트롤은 '전체 161명' 같은 텍스트 버튼으로 만들고 aria-expanded를 붙인다. 항목마다 붙은 '의원' 라벨은 지운다. 목록은 서버에서 prefetch하고, 펼친 뒤의 이미지는 lazy 로딩한다. 인원이 많은 정당은 이름 검색이나 지역 묶음 같은 탐색 수단도 검토한다.
- 검증 메모: PartyCongressmanList.tsx:24-28은 slice(0, 8)로 자른다. :37-39의 펼침 버튼은 isIconOnly이고 aria-label과 aria-expanded가 없다. 총원 표시는 없다. :10은 서버 prefetch 없이 useQuery를 쓴다. 운영 HTML /party/1에 '강득구'가 0회이고 /congressman/ 링크도 2개뿐이다. 소속 의원 그리드가 SSR되지 않는다. PartyCongressmanItem.tsx:18은 항목마다 '의원' 라벨을 붙인다. API는 161명을 반환한다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyCongressman/PartyCongressmanList.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyCongressman/PartyCongressmanItem.tsx`

### PROFILE-17 접근성: 약력 펼침 버튼·탭 목록·뒤로가기·팔로우 토글에 접근 가능한 이름과 상태가 없다

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 스크린리더 사용자에게 약력 아코디언 버튼은 이름 없는 '버튼, 접힘'으로 읽힌다. 탭 목록은 'Options'로 읽힌다. 뒤로가기는 이름 없는 버튼이다. 팔로우 버튼은 눌림 상태를 전달하지 않는다. 시각 사용자에게도 의원 약력과 홈페이지 링크가 카드 맨 아래 작은 화살표 뒤에 숨어 있어 찾기 어렵다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx:103-110 `titleWrapper: ['hidden']` — 제목을 display:none으로 숨겨 운영 HTML에서 버튼 안 텍스트가 `<div class="... hidden"><span>후보약력</span></div>`뿐이다. 아이콘 svg는 aria-hidden이다. /Users/minjaepark/code/LawDigest/services/web/components/Bill/BillTab/BillTab.tsx:20 `aria-label="Options"`. /Users/minjaepark/code/LawDigest/services/web/components/common/Button/GoBackButton.tsx:16 aria-label 없음. FollowBoard.tsx:66-72(두 파일) aria-pressed 없음.
- 수정안: 약력은 '약력' 텍스트가 보이는 펼침 버튼으로 바꾸거나 기본 펼침으로 둔다. BillTab aria-label은 '발의 법안 구분'으로 바꾼다. 뒤로가기에 '뒤로 가기' aria-label을 붙인다. 팔로우 버튼에 `aria-pressed={isFollowed}`를 붙인다.
- 검증 메모: 운영 HTML /congressman/CCU1009B의 아코디언 버튼 안에는 `<div class="flex-1 flex-col text-start hidden"><span>후보약력</span></div>`와 aria-hidden 아이콘만 있다. 이 버튼은 aria-expanded="false"만 가진다. BillTab.tsx:20은 aria-label="Options"다. GoBackButton.tsx:16에는 aria-label이 없다. 두 FollowBoard.tsx:66-72에는 aria-pressed가 없다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/components/Bill/BillTab/BillTab.tsx`, `/Users/minjaepark/code/LawDigest/services/web/components/common/Button/GoBackButton.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/FollowBoard.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/FollowBoard.tsx`

### PROFILE-18 보조 라벨 색 gray-2(#999999)가 흰 배경에서 WCAG AA 대비에 못 미친다

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: '팔로워', '대표발의법안', '공동발의법안', 지역구·선수, '나이/성별/번호' 라벨, 빈 상태 문구가 저시력 사용자나 야외 환경에서 읽기 어렵다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/tailwind.config.js:47 `2: '#999999'` — 흰 배경 대비 약 2.85:1이다(AA 본문 기준 4.5:1). 이 색을 쓰는 곳: Congressman/FollowBoard.tsx:54,58,62(text-sm), CongressmanDetail.tsx:53,79,85,89,93,97, PartyDetail/FollowBoard.tsx:54,58,62, BillContainer.tsx:37(두 파일).
- 수정안: 정보 라벨에는 text-secondary(#555555, gray-3)를 쓴다. #999999는 비활성·장식 요소에만 남긴다. DESIGN.md Muted Text Ladder에 '본문 라벨 최소 gray-3' 규칙을 적는다.
- 검증 메모: tailwind.config.js:47의 gray 2는 '#999999'다. 흰 배경 대비는 약 2.85:1로 AA 본문 기준 4.5:1에 못 미친다. 의원 FollowBoard.tsx:54,58,62, 정당 FollowBoard.tsx:54,58,62, CongressmanDetail.tsx:53,79,85,89,93,97, 두 BillContainer.tsx:37에서 text-gray-2를 쓴다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/FollowBoard.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/FollowBoard.tsx`

### PROFILE-19 다크 모드 정당 로고가 SSR과 다르게 렌더되어 hydration 불일치와 로고 교체가 생긴다

- 분류: minor · visual · 작업량 S · 검증 adjusted
- 사용자 영향: 다크 모드 사용자는 밝은 배경용 로고가 잠깐 보인 뒤 어두운 배경용으로 바뀐다. theme가 'system'이면 다크 화면에서도 밝은 배경용 로고가 계속 남는다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/PartyLogo.tsx:17-28, /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyLogo.tsx:7-13 — `useTheme().theme === 'dark'`로 src를 고른다. 서버에서는 theme가 undefined라 항상 wide를 쓴다. resolvedTheme도 쓰지 않는다. /Users/minjaepark/code/LawDigest/services/web/lib/provider/NextThemesProvider.tsx:8 defaultTheme="light".
- 수정안: 'system' 관련 서술은 뺀다. 수정안(두 이미지를 렌더하고 dark:hidden / hidden dark:block으로 CSS 전환)은 그대로 유효하다.
- 검증 메모: 두 PartyLogo는 `useTheme().theme === 'dark'`로 src를 고른다. 서버에서는 theme가 없어 wide 이미지를 렌더한다. 다크를 저장한 사용자는 클라이언트에서 dark src로 바뀐다. 그래서 hydration 불일치와 로고 교체가 생긴다. 이 부분은 성립한다. 'system'일 때 밝은 로고가 남는다는 부분은 도달하지 않는다. NextThemesProvider.tsx:8은 defaultTheme="light"이고, 유일한 토글 ThemeSwitchButton.tsx:18,20은 'light'/'dark'만 설정한다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/PartyLogo.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyLogo.tsx`

### PROFILE-20 무소속 의원의 정당 로고 링크가 href=""로 렌더된다

- 분류: minor · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 무소속 의원 프로필의 정당 표식은 링크처럼 포커스되고 눌리지만, 누르면 같은 페이지를 다시 연다. 키보드 사용자에게 의미 없는 탭 정지 지점이 된다. 무소속 정당 페이지(party/60)는 실제로 있는데도 연결되지 않는다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/PartyLogo.tsx:21 `href={party_image_url !== null ? `/party/${party_id}` : ''}` — 이미지 유무로 링크 여부를 정한다. 운영 HTML https://lawdigest.kr/congressman/CC78321E : `<a class="" href="">`.
- 수정안: 링크 여부를 이미지 유무가 아니라 party_id 유무로 정한다. 로고가 없으면 PartyLogoReplacement를 링크 안에 렌더한다.
- 검증 메모: 의원 PartyLogo.tsx:21은 `href={party_image_url !== null ? `/party/${party_id}` : ''}`다. 운영 HTML /congressman/CC78321E(최혁진, 무소속 party_id 60)에 `<a class="" href="">`가 있다. /party/60 페이지는 실제로 존재한다(200).
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/PartyLogo.tsx`

### PROFILE-21 팔로우 결과를 서버 응답 전에 확정하고 실패해도 되돌리지 않는다

- 분류: minor · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 네트워크 오류나 토큰 만료 때도 '팔로우했습니다' 스낵바와 +1 카운트가 그대로 남는다. 새로고침하면 상태가 달라진다. 토큰 재발급 실패 경로는 컴포넌트 밖에서 useRouter를 호출해 로그인 페이지 이동도 되지 않는다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/FollowBoard.tsx:30-47 — 상태 변경과 성공 스낵바 다음에 `mutate()`를 호출한다. onError가 없다(apis/queries.ts:37-46). useCallback 의존성에서 mutationFollow가 빠졌다. 정당 FollowBoard.tsx:47은 followCount도 빠져 연속 클릭 때 카운트가 틀린다. /Users/minjaepark/code/LawDigest/services/web/api/auth/handlers.ts — handleFailReissueToken이 일반 함수 안에서 `useRouter()`를 호출한다.
- 수정안: 추가로 확인한 결함이 있다. handlers.ts:14의 handleSuccessReissueToken도 useRouter()를 먼저 호출해 예외가 난다. 그러면 core.ts:52-57의 .catch로 넘어가 handleFailReissueToken이 accessToken 쿠키를 지운다. 즉 토큰 재발급이 성공해도 401이 한 번 나면 사용자가 로그아웃된다. 재발급 처리 두 함수를 모두 훅이 아닌 방식(재요청은 axiosInstance(newConfig), 실패 시 window.location.assign('/login'))으로 바꾼다.
- 검증 메모: FollowBoard.tsx:34-43(두 파일)은 상태 변경과 성공 스낵바 다음에 mutate를 호출한다. queries.ts:40-45에는 onError가 없다. api/auth/handlers.ts:25에서 handleFailReissueToken이 일반 함수 안에서 useRouter()를 호출하므로 로그인 이동이 되지 않는다. 한 문장은 틀렸다. '정당 FollowBoard.tsx:47에 followCount가 빠져 연속 클릭 때 카운트가 틀린다'는 성립하지 않는다. deps의 isFollowed가 클릭마다 바뀌어 콜백이 다시 만들어지고, followCount도 새 값을 잡는다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/FollowBoard.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/FollowBoard.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/apis/queries.ts`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/apis/queries.ts`, `/Users/minjaepark/code/LawDigest/services/web/api/auth/handlers.ts`

### PROFILE-22 lg 구간(1024~1279px) 레이아웃: 프로필 카드는 430px로 가운데 놓이고 소속 의원 그리드는 전체 폭에 4열로 벌어진다

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 태블릿 가로나 작은 노트북에서는 의원 카드가 430px 폭으로 가운데에 떠 있다. 그 아래 법안 목록은 전체 폭이라 정렬이 어긋난다. 정당 페이지 소속 의원 그리드는 전체 폭인데 4열이라 항목 사이가 크게 벌어진다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx:39 `md:mx-auto xl:mx-0 ... md:w-[430px] xl:w-[320px]`, CongressmanContainer.tsx:8 `xl:flex`(lg에서는 세로 배치). /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyCongressman/PartyCongressmanList.tsx:19 `grid-cols-4 md:grid-cols-8 lg:grid-cols-4` — 사이드바용 4열이 사이드바가 없는 lg 구간에도 적용된다(PartyContainer.tsx:9 `xl:flex`).
- 수정안: 2단 전환 기준을 lg로 내리거나, 사이드바 전용 클래스를 xl:로 옮긴다. md~lg에서는 카드와 목록 폭을 같은 컨테이너 폭으로 맞춘다.
- 검증 메모: 클래스 문자열을 확인했다. CongressmanDetail.tsx:39는 `md:mx-auto xl:mx-0 ... md:w-[430px] xl:w-[320px]`다. CongressmanContainer.tsx:8과 PartyContainer.tsx:9는 `xl:flex`다. PartyCongressmanList.tsx:19는 `grid-cols-4 md:grid-cols-8 lg:grid-cols-4`다. lg 구간에서는 세로 배치인데 그리드는 4열로 줄어든다. 규칙상 브라우저 재현은 하지 않았다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/CongressmanContainer/CongressmanContainer.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyCongressman/PartyCongressmanList.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyContainer/PartyContainer.tsx`

### PROFILE-23 프로필 카드가 DESIGN.md의 평면 카드 규칙과 정당색 단일 기준을 따르지 않는다

- 분류: polish · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 의원 카드(shadow-md), 사진(shadow-lg), 정당 로고 원(shadow-lg)이 겹겹이 떠 있어 피드·상세의 평평한 카드와 결이 다르다. 정당색이 CSS 클래스와 PARTY_COLOR 두 곳에 있어, 한쪽만 바꾸면 화면마다 색이 달라진다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx:39-48 `shadow="md"`, `shadow-lg`, 카드·아바타에 `${party_name}` 클래스. /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyLogo.tsx:11 `shadow-lg`. /Users/minjaepark/code/LawDigest/services/web/styles/globals.css:28-70 정당명 클래스별 border-color 중복 정의. DESIGN.md 'The Flat Trust Rule', 'The Party Color Is Data Rule'(getPartyColor 사용).
- 수정안: 카드 그림자를 제거하고 얇은 경계선으로 층위를 만든다. 정당색은 `getPartyColor(party_name)`로 inline style 또는 CSS 변수에 넣는다. globals.css의 정당명 클래스를 삭제한다.
- 검증 메모: CongressmanDetail.tsx:40은 shadow="md", :48은 shadow-lg다. 정당 PartyLogo.tsx:11은 shadow-lg다. globals.css:28-70에 정당명 클래스별 border-color가 중복 정의되어 있다. DESIGN.md:205 'The Flat Trust Rule'과 :227 Shadow Strategy는 정보 카드에 shadow none을 정한다. DESIGN.md:151과 :165는 PARTY_COLOR/getPartyColor를 단일 기준으로 정한다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyLogo.tsx`, `/Users/minjaepark/code/LawDigest/services/web/styles/globals.css`

### PROFILE-24 섹션 이름 레이블과 반복 문구: '기본정보' 칩, '의원 프로필' 이중 제목, 항목마다 붙은 '의원'

- 분류: polish · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 내용이 아닌 구조 설명 글이 화면을 차지한다. 데스크톱은 상단 SubHeader '의원 프로필' 아래 다시 이름이 나온다. 모바일 헤더도 사람 이름 대신 '의원 프로필'/'정당 프로필'을 보여 준다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx:73-75 '기본정보' Chip. /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/page.tsx:35 `<SubHeader title="의원 프로필" />`와 layout.tsx:11 `title="의원 프로필"`. /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/page.tsx:36, layout.tsx:11 같은 구조. PartyCongressmanItem.tsx:18 항목마다 '의원' 라벨. 운영 HTML 본문 '의원 프로필 의원 프로필 이해식 의원'.
- 수정안: '기본정보' 칩을 지우고 라벨·값 목록의 간격과 정렬로 묶음을 표현한다. 헤더 제목에는 의원명·정당명을 넣거나 비워 두고, SubHeader의 중복 제목은 제거한다. 그리드의 '의원' 라벨은 삭제한다.
- 검증 메모: CongressmanDetail.tsx:73-75에 '기본정보' Chip이 있다. page.tsx:35에 `<SubHeader title="의원 프로필" />`, layout.tsx:11에 `title="의원 프로필"`이 있다. 정당 page.tsx:36과 layout.tsx:11도 같은 구조다. 운영 HTML 본문은 '의원 프로필 의원 프로필'과 '정당 프로필 정당 프로필'로 시작한다. PartyCongressmanItem.tsx:18은 항목마다 '의원'을 붙인다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/page.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/layout.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/page.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/layout.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyCongressman/PartyCongressmanItem.tsx`

### PROFILE-25 문구 품질: '후보약력', '번호', '62 세', '의석수:', 띄어쓰기 없는 통계 라벨, 천 단위 구분 없음

- 분류: polish · copy · 운영 데이터 작업 · 작업량 S · 검증 adjusted
- 사용자 영향: 현직 의원 약력을 '후보약력'으로 부른다. 전화번호를 '번호'로 표기한다. '62 세'처럼 단위를 띄운다. '의석수: 170석 / 300석 56.67%'는 콜론 레이블에 소수점 둘째 자리까지 쓴다. '대표발의법안'은 붙여 쓴다. 16487, 18640처럼 큰 수에 천 단위 구분이 없어 읽기 어렵다. 전화번호 형식이 '027849241'과 '02-784-2171'로 섞여 있고, 이메일·전화는 눌러서 연결할 수 없다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx:81 `${age} 세`, :89 '번호', :90 telephone 원문, :94 email 텍스트(mailto 없음), :110 title="후보약력". /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx:37,51 toFixed(2), '의석수:'. FollowBoard.tsx:53-62(두 파일) 숫자 원문과 '대표발의법안'/'공동발의법안'. 운영 HTML https://lawdigest.kr/party/1 '16487 대표발의법안 18640 공동발의법안', '56.67 %'. API CC78321E "telephone": "027849241".
- 수정안: 전화번호는 1건 이상치이므로 수집 단계 정규화 파이프라인 대신 해당 데이터를 수정한다. 이메일과 전화는 mailto:와 tel: 링크로 만든다. 나머지 문구 수정안은 그대로 둔다.
- 검증 메모: CongressmanDetail.tsx:81은 `${age} 세`, :89는 '번호', :110은 title="후보약력"이다. :94의 이메일은 텍스트일 뿐이다. PartyDetail.tsx:37은 toFixed(2), :51은 '의석수:'다. 운영 HTML /party/1은 '16487 대표발의법안 18640 공동발의법안', '56.67 %'다. 전화번호 형식이 섞여 있다는 주장은 과장이다. 279명 직접 집계 결과는 하이픈 형식 273, 하이픈 없음 1(CC78321E '027849241'), 빈 값 5다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/FollowBoard.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/FollowBoard.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx`

### PROFILE-26 팔로우 버튼 문구와 스낵바가 의원·정당 페이지에서 서로 다르다

- 분류: polish · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 의원 페이지는 '팔로우 하기' → '팔로우 중'(상태 표시)이다. 정당 페이지는 '팔로우' → '팔로우 취소'(동작 표시)다. 같은 기능이 페이지마다 다른 규칙을 쓴다. 스낵바는 대상 이름 대신 '해당 의원', '해당 정당'이라고 쓴다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/FollowBoard.tsx:39,71 vs /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/FollowBoard.tsx:39,71.
- 수정안: 두 FollowBoard를 대상 타입만 다른 공용 컴포넌트 하나로 합친다. 버튼 규칙은 하나로 정한다(예: '팔로우' / 선택 상태 '팔로잉'). 스낵바는 '이해식 의원을 팔로우했어요'처럼 이름을 넣는다.
- 검증 메모: 의원 FollowBoard.tsx:39,71은 '해당 의원을 팔로우했습니다.'와 '팔로우 중'/'팔로우 하기'다. 정당 FollowBoard.tsx:39,71은 '해당 정당을 팔로우했습니다.'와 '팔로우 취소'/'팔로우'다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/FollowBoard.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/FollowBoard.tsx`

### PROFILE-27 공유 미리보기 이미지가 모든 프로필에서 사이트 공통 로고다

- 분류: polish · seo · 작업량 M · 검증 confirmed
- 사용자 영향: 의원·정당 프로필 링크를 메신저에 공유하면 사람 사진이나 정당 로고 대신 공통 로고 이미지가 나와 어떤 프로필인지 구분할 수 없다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/utils/getMetadata.ts — openGraph.images가 항상 siteConfig.ogImage다. 운영 HTML https://lawdigest.kr/congressman/CCU1009B : `<meta property="og:image" content="https://www.lawdigest.kr/images/opengraph-image.png">`.
- 수정안: getMetadata에 선택적 image 인자를 추가한다. 프로필은 next/og로 이름·정당색·사진을 합성한 opengraph-image를 만들거나 사진 URL을 넘긴다.
- 검증 메모: 운영 HTML /congressman/CCU1009B의 og:image는 'https://www.lawdigest.kr/images/opengraph-image.png'다. utils/getMetadata.ts의 props는 title, description, asPath뿐이고 image 인자가 없다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/utils/getMetadata.ts`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/page.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/page.tsx`

### PROFILE-28 통계 숫자와 탭이 분리되어 있고 공동발의 탭의 빈 상태 문구가 탭과 맞지 않는다

- 분류: polish · ux · 작업량 S · 검증 confirmed
- 사용자 영향: '대표발의법안 197', '공동발의법안 1634' 숫자는 눌러도 아무 일이 없다. 바로 아래 탭은 숫자 없이 같은 구분을 다시 보여 준다. 공동발의 탭이 비어 있을 때도 '발의한 법안이 존재하지 않습니다.'라고 표시한다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/FollowBoard.tsx:56-63, /Users/minjaepark/code/LawDigest/services/web/components/Bill/BillTab/BillTab.tsx:31-33, /Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/BillContainer/BillContainer.tsx:36-40.
- 수정안: 탭 레이블 옆에 건수를 넣고 통계 블록의 중복 숫자는 줄이거나 탭 선택과 연결한다. 빈 상태 문구는 탭 type에 맞춘다(대표발의 / 공동발의).
- 검증 메모: FollowBoard.tsx:56-63의 통계는 클릭 핸들러가 없는 p 태그다. BillTab.tsx:31-33의 탭에는 건수가 없다. BillContainer.tsx:36-40의 빈 상태 문구는 탭과 관계없이 '발의한 법안이 존재하지 않습니다.'로 고정되어 있다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/Congressman/FollowBoard.tsx`, `/Users/minjaepark/code/LawDigest/services/web/components/Bill/BillTab/BillTab.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/congressman/[id]/components/BillContainer/BillContainer.tsx`, `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/BillContainer/BillContainer.tsx`

### PROFILE-29 뒤로가기가 router.back()만 호출해 공유 링크로 들어온 사용자를 서비스 밖으로 내보낸다

- 분류: polish · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 메신저나 검색에서 프로필로 바로 들어온 사용자가 상단 뒤로가기를 누르면 이전 사이트로 나가거나 아무 일도 일어나지 않는다.
- 근거: /Users/minjaepark/code/LawDigest/services/web/components/common/Button/GoBackButton.tsx:11-13 `router.back()`만 호출하고 이력 확인이 없다. 프로필 레이아웃은 goBack을 사용한다(app/congressman/[id]/layout.tsx:11, app/party/[id]/layout.tsx:11).
- 수정안: `window.history.length > 1`이고 referrer가 같은 출처일 때만 back을 호출한다. 그렇지 않으면 상위 화면(피드 또는 탐색)으로 push한다.
- 검증 메모: GoBackButton.tsx:11-13은 router.back()만 호출하고 이력을 확인하지 않는다. 의원 layout.tsx:11과 정당 layout.tsx:11은 goBack을 쓴다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/components/common/Button/GoBackButton.tsx`

### PROFILE-30 무소속 정당 페이지가 간부 4칸 '없음', 팔로우, 웹사이트 버튼을 일반 정당과 똑같이 보여 준다

- 분류: polish · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 무소속은 정당이 아닌데도 '당대표 없음 / 원내대표 없음 / 사무총장 없음 / 정책위의장 없음'과 '웹사이트 방문'(동작 안 함), '정당 팔로우'가 나온다. 템플릿을 그대로 채운 화면으로 보인다.
- 근거: 운영 HTML https://lawdigest.kr/party/60 본문: '당대표 없음 원내대표 없음 사무총장 없음 정책위의장 없음 웹사이트 방문'. /Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx:72-101.
- 수정안: 값이 없는 간부 칸과 웹사이트 버튼은 렌더하지 않는다. 무소속(party_id 60)은 의석 표기와 소속 의원 목록 중심으로 보여 준다.
- 검증 메모: 운영 HTML /party/60 본문은 '무소속 의석수: 1 석 / 300 석 0.33 % ... 팔로우 당대표 없음 원내대표 없음 사무총장 없음 정책위의장 없음 웹사이트 방문'이다. API의 간부 4개 필드와 website_url은 모두 null이다. PartyDetail.tsx:72-101은 값이 없으면 '없음'을 표시하고 웹사이트 버튼을 조건 없이 렌더한다.
- 파일: `/Users/minjaepark/code/LawDigest/services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx`

## 계정·개인화 (ACCOUNT)

### ACCOUNT-01 토큰 재발급 인터셉터가 컴포넌트 밖에서 useRouter를 호출해 401 처리 전체가 실패한다

- 분류: blocker · bug · 백엔드 · 작업량 M · 검증 adjusted
- 사용자 영향: 액세스 토큰(JWT 30분)이 만료된 뒤 처음 보내는 인증 요청이 항상 실패한다. 마이페이지에서는 '페이지가 작동하지 않습니다' 오류 화면이 뜬다. 세션이 완전히 끝난 사용자도 로그인 화면으로 이동하지 않고 실패만 반복한다.
- 근거: services/web/api/auth/handlers.ts:14,25 — 일반 함수 안에서 useRouter() 호출(React 렌더 밖이라 throw). api/config/core.ts:49-57 — 401이면 reissue 후 handleSuccessReissueToken 호출, 예외 시 handleFailReissueToken 호출(이것도 useRouter에서 throw). handlers.ts:20 — 재시도 결과 대신 router.refresh() 결과를 반환하므로 성공해도 원 요청의 data가 사라진다. 백엔드 services/backend/.../service/AuthService.java:41-45,52-61 — 리프레시 실패 시 logout만 하고 return하므로 /v1/auth/reissue/token은 실패해도 200 "success"를 준다(실수로 보낸 무쿠키 POST도 200). application.properties:24 access-token-expiry=30(분).
- 수정안: 백엔드가 reissue 실패 시 401을 반환하게 바꾸면 현재 인터셉터는 reissue 요청 자체의 401에도 reissue를 다시 시도한다. 이 경우 무한 재귀가 생긴다. reissue 호출은 인터셉터가 없는 별도 axios 인스턴스로 보내거나 config에 _retry 플래그를 둔다. 원 요청 재시도도 axios(newConfig) 대신 axiosInstance로 보내 response.data 변환을 유지한다. single-flight와 queryClient.clear() 후 /login?next= 이동 방안은 그대로 둔다.
- 검증 메모: 직접 확인함. api/auth/handlers.ts:14,25는 일반 함수 안에서 useRouter()를 호출한다. next 15.5.20의 useRouter는 React useContext를 호출한다(node_modules/next/dist/client/components/navigation.js:121-122). 그래서 axios 인터셉터처럼 렌더 밖에서 부르면 예외가 난다. core.ts:49-57 흐름은 reissue 성공 → handleSuccess에서 예외 → catch → handleFail 순서다. handleFail은 deleteCookie를 실행한 뒤 다시 useRouter에서 예외를 던진다. 결국 원 요청은 TypeError로 reject되고 재시도와 /login 이동은 일어나지 않는다. handlers.ts:20은 router.refresh()의 결과를 반환하므로 원 요청의 data도 버린다. 백엔드 AuthController.java:72-78은 항상 BaseResponse.ok를 반환한다. AuthService.java:41-61은 실패하면 logout만 하고 return한다. TokenAuthenticationFilter.java:33은 reissue 경로를 건너뛴다. app/error.tsx는 '페이지가 작동하지 않습니다.'를 렌더한다. 근거와 영향은 맞다.
- 파일: `services/web/api/auth/handlers.ts`, `services/web/api/config/core.ts`, `services/backend/src/main/java/com/everyones/lawmaking/service/AuthService.java`

### ACCOUNT-09 개인정보처리방침과 이용약관이 없다

- 분류: blocker · trust · 작업량 M · 검증 confirmed
- 사용자 영향: 이메일·닉네임·프로필 사진을 수집하는 소셜 로그인을 제공하면서 개인정보 처리방침과 약관을 볼 곳이 없다. 사용자는 무엇에 동의하는지 모른다. 개인정보 보호법 제30조의 처리방침 공개 의무를 충족하지 못한다.
- 근거: curl https://lawdigest.kr/privacy → 404, https://lawdigest.kr/terms → 404. /login HTML에 '개인정보'·'약관'·privacy·terms 문자열 없음. 웹 전체에 footer 컴포넌트 없음(grep footer/약관/개인정보 결과 없음). application.properties:56 kakao scope = profile_nickname, account_email, profile_image.
- 수정안: /privacy, /terms 정적 페이지를 만든다. 로그인 버튼 아래에 '시작하면 이용약관과 개인정보처리방침에 동의하게 됩니다' 한 줄과 두 링크를 둔다. 마이페이지 하단에도 두 링크와 문의처를 둔다. 수집 항목·보관 기간·탈퇴 시 파기 범위(UserFacade.deleteUserAccount 기준)를 처리방침에 적는다.
- 검증 메모: curl https://lawdigest.kr/privacy와 /terms는 404다(robots noindex 404 페이지). /login HTML에서 '개인정보', '약관', 'privacy', 'terms'는 0건이다. services/web의 app, components, config를 grep해도 해당 문자열이 없다. application.properties:56,72는 카카오와 네이버에서 profile_nickname, account_email, profile_image를 받는다. :88은 구글에서 profile, email을 받는다.
- 파일: `services/web/app/login/page.tsx`, `services/web/app/mypage/page.tsx`

### ACCOUNT-04 SSR이 항상 비로그인 분기를 렌더해 로그인 사용자에게 '회원 정보가 없습니다'가 먼저 보이고 hydration 불일치가 난다

- 분류: major · bug · 작업량 M · 검증 confirmed
- 사용자 영향: 로그인한 사용자가 마이페이지·팔로잉을 열면 '회원 정보가 없습니다.' '팔로잉 정보가 없습니다.'가 잠깐 보인 뒤 바뀐다. 비로그인 사용자도 리다이렉트 전에 사실과 다른 문장을 본다. 헤더 알림 버튼도 SSR과 클라이언트 결과가 달라진다.
- 근거: curl https://lawdigest.kr/mypage 본문: '회원 정보가 없습니다.', /following: '팔로잉 정보가 없습니다.'. cookies-next lib/index.js getCookies: 서버에서 req가 없으면 return {} → 'use client' 페이지 SSR에서 getCookie는 항상 undefined. app/mypage/page.tsx:14,25-26, app/following/page.tsx:15,26-27, components/common/Button/NotifcationButton.tsx:13-26.
- 수정안: 보호 페이지 판별을 서버로 옮긴다. layout 또는 middleware에서 next/headers cookies()로 세션을 확인하고 비로그인이면 redirect('/login?next=...')한다. 클라이언트 컴포넌트에는 서버가 확인한 세션 상태를 prop/context로 내려 SSR과 일치시킨다. 대기 중에는 문장 대신 프로필·목록 스켈레톤을 둔다.
- 검증 메모: curl https://lawdigest.kr/mypage SSR 본문에 '회원 정보가 없습니다.'가 있다. /following 본문에는 '팔로잉 정보가 없습니다.'가 있다. cookies-next getCookies는 서버에서 req가 없으면 {}를 반환한다(lib/index.js). 그래서 'use client' 페이지의 SSR은 항상 비로그인 분기를 렌더한다(mypage/page.tsx:14,25-26, following/page.tsx:15,26-27). 클라이언트는 document.cookie를 읽으므로 hydration 결과가 달라진다. NotifcationButton.tsx:13-26도 같다. middleware.ts는 봇 차단 전용이고 matcher에 계정 경로가 없다.
- 파일: `services/web/app/mypage/page.tsx`, `services/web/app/following/page.tsx`, `services/web/components/common/Button/NotifcationButton.tsx`, `services/web/middleware.ts`

### ACCOUNT-05 클라이언트 페이지 안에서 async 컴포넌트와 Suspense 쿼리를 경계 없이 써서 로딩·오류 처리가 없다

- 분류: major · bug · 작업량 M · 검증 confirmed
- 사용자 영향: 마이페이지·팔로잉 데이터 중 하나라도 실패하면 페이지 전체가 루트 오류 화면으로 바뀐다. 로딩 중에는 섹션별 스켈레톤 없이 전역 스피너만 보인다.
- 근거: app/mypage/page.tsx:1,31-33 ('use client' 페이지가 async 컴포넌트 렌더). mypage/components/UserInfo/UserInfo.tsx:7-9, Party/PartyList.tsx:6-8, following/components/FollowingHeader/FollowingNav.tsx:6-10 — async function 컴포넌트에서 queryClient.fetchQuery를 await(eslint rules-of-hooks 비활성 주석으로 우회). React 19.2.7은 async Client Component를 지원하지 않는다. mypage/apis/queries.ts:30-41 useSuspenseInfiniteQuery를 쓰지만 page에 Suspense/ErrorBoundary가 없다. 같은 queryClient를 dehydrate해 같은 클라이언트에 HydrationBoundary로 다시 넣는 코드(page.tsx:29)도 의미가 없다.
- 수정안: 각 섹션을 useQuery(또는 useSuspenseQuery + 섹션 단위 Suspense/ErrorBoundary)로 바꾸고 섹션마다 스켈레톤과 재시도 가능한 오류 상태를 둔다. HydrationBoundary/dehydrate 자기 복사 코드는 제거한다.
- 검증 메모: UserInfo.tsx:7-9, PartyList.tsx:6-8, FollowingNav.tsx:6-10은 async function 컴포넌트이고 rules-of-hooks 비활성 주석을 달고 있다. 이 컴포넌트들은 'use client' 페이지(mypage/page.tsx:1,31-33, following/page.tsx) 아래에서 렌더된다. React 19.2.7(설치 버전 확인)은 async Client Component를 지원하지 않는다. mypage/apis/queries.ts:30은 useSuspenseInfiniteQuery를 쓴다. app/mypage와 app/following에는 error.tsx와 loading.tsx가 없다. 그래서 실패는 루트 app/error.tsx로, 로딩은 루트 app/loading.tsx로 간다. page.tsx:29는 같은 queryClient를 dehydrate해 HydrationBoundary에 다시 넣는다.
- 파일: `services/web/app/mypage/page.tsx`, `services/web/app/mypage/components/UserInfo/UserInfo.tsx`, `services/web/app/mypage/components/Party/PartyList.tsx`, `services/web/app/mypage/apis/queries.ts`, `services/web/app/following/components/FollowingHeader/FollowingNav.tsx`, `services/web/app/following/page.tsx`

### ACCOUNT-06 OAuth 실패 시 콜백 페이지가 error 파라미터를 무시하고 마이페이지로 보낸다

- 분류: major · ux · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: 소셜 로그인 동의 취소나 서버 오류가 나면 사용자는 '로그인 중입니다.'를 본 뒤 마이페이지로 갔다가 '로그인이 필요한 서비스입니다.' 스낵바와 함께 로그인 화면으로 돌아온다. 무엇이 실패했는지 알 수 없다. 내부 예외 문자열은 URL에 그대로 노출된다.
- 근거: OAuth2AuthenticationFailureHandler.java:29-36 — redirect_uri(예: https://lawdigest.kr/login/kakaoLogin)에 ?error=exception.getLocalizedMessage()를 붙여 리다이렉트. app/login/kakaoLogin/page.tsx:10-12, googleLogin/page.tsx:10-12, naverLogin/page.tsx:10-12 — 쿼리 확인 없이 router.push('/mypage'). 세 파일은 내용이 같은 복제본이다.
- 수정안: 콜백을 /login/callback 하나로 합친다. error가 있으면 로그인 화면에 사용자용 문구(예: '로그인을 완료하지 못했어요. 다시 시도해 주세요.')와 다시 시도 버튼을 보여준다. 백엔드는 예외 메시지 대신 정해진 오류 코드(access_denied, server_error)만 넘긴다.
- 검증 메모: OAuth2AuthenticationFailureHandler.java:29-36은 redirect_uri 쿠키 값에 queryParam('error', exception.getLocalizedMessage())를 붙인다. kakaoLogin/googleLogin/naverLogin page.tsx는 함수 이름만 다르다(diff로 확인). 세 파일 모두 쿼리를 보지 않고 router.push('/mypage')를 호출한다.
- 파일: `services/web/app/login/kakaoLogin/page.tsx`, `services/web/app/login/googleLogin/page.tsx`, `services/web/app/login/naverLogin/page.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/global/handler/OAuth2AuthenticationFailureHandler.java`

### ACCOUNT-07 로그인 콜백이 router.push를 써서 뒤로 가기가 막힌다

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 로그인 직후 마이페이지에서 뒤로 가기를 누르면 콜백 페이지로 돌아가고 콜백이 다시 /mypage로 보낸다. 사용자가 이전 화면으로 돌아갈 수 없다.
- 근거: app/login/kakaoLogin/page.tsx:11, googleLogin/page.tsx:11, naverLogin/page.tsx:11 — router.push('/mypage'). 콜백 URL이 history에 남는다.
- 수정안: 콜백에서는 router.replace(next ?? '/')를 쓴다. 로그인 화면 진입도 replace로 처리해 history에 OAuth 중간 단계가 남지 않게 한다.
- 검증 메모: 세 콜백 page.tsx:11이 useEffect 안에서 router.push('/mypage')를 호출한다. 콜백 URL은 OAuth 제공자에서 전체 페이지 이동으로 들어오므로 history에 남는다. 마이페이지에서 뒤로 가면 콜백으로 돌아간다. 콜백이 마운트되면 다시 /mypage로 push한다.
- 파일: `services/web/app/login/kakaoLogin/page.tsx`, `services/web/app/login/googleLogin/page.tsx`, `services/web/app/login/naverLogin/page.tsx`

### ACCOUNT-08 로그인 후 원래 보던 위치로 돌아가지 않는다

- 분류: major · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 법안을 스크랩하거나 의원을 팔로우하려다 로그인한 사용자는 로그인 뒤 항상 마이페이지에 도착한다. 하던 일을 이어가려면 법안을 다시 찾아야 한다.
- 근거: components/common/Snackbar/Snackbar.tsx:51-55 — '로그인 하기' 링크가 /login 고정. components/Feed/Feed/FollowingFeed.tsx:37, app/mypage/page.tsx:21 — router.push('/login'). app/login/page.tsx:7-12 — redirect_uri가 콜백 경로 고정. 콜백 3개가 /mypage 고정 이동.
- 수정안: 로그인 진입 시 현재 경로를 next 쿼리로 넘긴다(/login?next=/bill/123). 로그인 페이지는 next를 콜백 redirect_uri의 쿼리로 포함하고, 콜백은 같은 출처 경로인지 검증한 뒤 replace로 이동한다. 백엔드 isAuthorizedRedirectUri는 host/port만 비교하므로 쿼리 추가와 호환된다.
- 검증 메모: Snackbar.tsx의 '로그인 하기' 링크는 href='/login'으로 고정이다. FollowingFeed.tsx:37은 router.push('/login')를 호출한다. login/page.tsx:7-12는 redirect_uri를 콜백 경로 고정값으로 만든다. 세 콜백은 /mypage로 고정 이동한다. next 파라미터를 처리하는 코드는 없다.
- 파일: `services/web/components/common/Snackbar/Snackbar.tsx`, `services/web/app/login/page.tsx`, `services/web/app/login/kakaoLogin/page.tsx`, `services/web/components/Feed/Feed/FollowingFeed.tsx`, `services/web/app/mypage/page.tsx`

### ACCOUNT-10 회원 탈퇴 진입점이 화면 어디에도 없다

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 사용자는 계정을 삭제할 방법을 찾을 수 없다. 탈퇴 모달과 API는 구현돼 있지만 도달할 수 없다.
- 근거: WithdrawModal은 SettingButton에서만 열린다(components/common/Button/SettingButton.tsx:12-23). SettingButton은 Header의 setting prop이 true일 때만 렌더된다(components/Layout/Header/Header.tsx:99-108). <Layout> 사용처 14곳(app/**/layout.tsx, page.tsx, error.tsx, not-found.tsx, loading.tsx) 중 setting을 넘기는 곳이 없다.
- 수정안: 마이페이지 하단에 계정 영역(로그아웃, 회원 탈퇴)을 두고 탈퇴는 별도 확인 화면으로 연결한다. 사용되지 않는 Header setting 분기와 SettingButton을 정리한다.
- 검증 메모: WithdrawModal은 SettingButton.tsx:12에서만 렌더된다. SettingButton은 Header.tsx:99의 setting 분기에서만 나온다. <Layout> 사용처 14곳(grep 결과)에는 setting prop이 하나도 없다. 마이페이지 UserInfo에는 로그아웃 버튼만 있다.
- 파일: `services/web/app/mypage/page.tsx`, `services/web/components/common/Button/SettingButton.tsx`, `services/web/components/Layout/Header/Header.tsx`

### ACCOUNT-11 탈퇴 흐름에 결과 안내·실패 처리·삭제 범위 설명이 없고 백엔드는 실패해도 쿠키를 지운다

- 분류: major · ux · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 탈퇴를 누르면 성공 시 아무 안내 없이 로그인 화면으로 이동한다. 실패하면 모달이 그대로 남고 반응이 없다. 소셜 연결 해제가 실패하면 계정은 남는데 로그아웃만 된다. 스크랩·팔로우·알림·검색 기록이 지워진다는 사실도 알려주지 않는다.
- 근거: components/common/Modal/WithdrawModal.tsx:12-19 — then에서 code 200만 처리, catch·로딩 상태 없음, 성공 안내 없음. 문구 :26 '주의', :28 '회원탈퇴를 진행하시겠습니까 ?'(물음표 앞 공백), :34 버튼 '확인'. UserFacade.java:55-59 — tokenService.logout(쿠키 삭제 헤더 기록)을 먼저 하고 deleteUserAccount·unlink 실패 시 롤백만 한다(헤더는 이미 응답에 들어간다). UserFacade.java:81-85 — 삭제 대상: 법안 스크랩, 의원 팔로우, 정당 팔로우, 알림, 검색어.
- 수정안: 탈퇴 화면에 삭제되는 항목(스크랩 N건, 팔로우 N명 등 실제 수치)과 되돌릴 수 없다는 경고를 두고 버튼 문구를 '탈퇴하기'로 바꾼다. 요청 중 로딩, 실패 시 오류 문구, 성공 시 queryClient.clear() 후 홈 이동과 완료 스낵바를 넣는다. 백엔드는 삭제·unlink가 모두 성공한 뒤에 logout(쿠키 삭제)을 수행한다.
- 검증 메모: WithdrawModal.tsx:12-19는 then에서 code 200만 처리한다. catch, 로딩 상태, 성공 안내가 없다. :26은 '주의', :28은 '회원탈퇴를 진행하시겠습니까 ?', :34는 '확인'이다. UserFacade.java:55는 tokenService.logout을 먼저 호출해 Set-Cookie 삭제 헤더를 response에 넣는다. 그 뒤 :56-59에서 삭제와 unlink를 한다. 실패하면 setRollbackOnly 후 예외를 던진다. GlobalExceptionHandler에는 response.reset 호출이 없다. 따라서 DB는 롤백돼도 쿠키 삭제 헤더는 응답에 남는다. :81-85는 스크랩, 의원 좋아요, 정당 팔로우, 알림, 검색어를 삭제한다. 현재 이 흐름에는 진입점이 없다(ACCOUNT-10). 그래서 ACCOUNT-10과 함께 처리한다.
- 파일: `services/web/components/common/Modal/WithdrawModal.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/facade/UserFacade.java`

### ACCOUNT-12 알림 페이지에 로그인 확인과 로딩 상태가 없어 '개의 읽지 않은 알림이 있습니다.'가 노출된다

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 비로그인 사용자나 로딩 중인 사용자는 숫자가 빠진 '개의 읽지 않은 알림이 있습니다.' 문장과 내용 없는 '지난 한 주/지난 한 달/지난 알림' 제목 3개를 본다. 비로그인 사용자는 로그인 안내 없이 이 화면에 머문다.
- 근거: curl https://lawdigest.kr/notification 본문: '알림 | 개 | 의 읽지 않은 알림이 있습니다. | 지난 한 주 | 지난 한 달 | 지난 알림'. app/notification/page.tsx:5-11 — 인증 확인 없음. NotificationList.tsx:149-156 — notificationCount가 undefined면 else 분기로 빈 숫자 출력. :176-231 — 데이터 없을 때도 제목 3개 렌더. GET /v1/notification/user/count 비인증 → 401(빈 본문).
- 수정안: 알림 라우트를 ACCOUNT-04의 서버 보호 대상으로 넣는다. 로딩 중에는 알림 행 스켈레톤을 보여준다. 개수 문장은 count가 확정됐을 때만 렌더하고, 알림이 0건이면 섹션 제목 없이 빈 상태 하나만 보여준다.
- 검증 메모: curl https://lawdigest.kr/notification SSR 본문에 '읽지 않은 알림이 있습니다.'와 기간 제목 3개가 있다. notification/page.tsx:5-11에는 인증 확인이 없다. NotificationList.tsx:149-156은 count가 undefined면 else 분기로 가서 빈 숫자와 '개'를 출력한다. :176,195,215는 데이터와 상관없이 h2 3개를 렌더한다. curl GET /v1/notification/user/count(비인증)는 401과 빈 본문을 반환한다.
- 파일: `services/web/app/notification/page.tsx`, `services/web/app/notification/components/NotificationList.tsx`

### ACCOUNT-13 정부·위원장 발의 법안 알림은 이미지 경로가 깨지고 다크 모드에서 알림 목록이 예외로 멈춘다

- 분류: major · bug · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 정부안·위원회안을 스크랩한 사용자가 단계 변경 알림을 받으면 라이트 모드에서는 깨진 이미지가 보인다. 다크 모드에서는 알림 목록 렌더가 TypeError로 실패해 오류 화면이 뜬다.
- 근거: 백엔드 NotificationFacade.java:108-111,125-128 — 의원 발의가 아니면 이미지 데이터로 proposers(예: '정부') 사용. NotificationConverter.java:63-67,73-77 — data.get(4)+'.png'를 'party:url' 형식 없이 그대로 넣음. 프론트 app/notification/components/NotificationItem.tsx:28 split(':') 결과가 ['정부.png'] 한 칸이 되어 :41의 imageUrlList[0][1]이 undefined → src '${IMAGE_URL}undefined', isDark이면 undefined.replace 호출로 TypeError. 운영 데이터에 해당 알림이 있는지는 로그인 없이 확인하지 못했다.
- 수정안: 알림 응답의 이미지 필드를 {kind, party_name, image_url} 객체 배열로 바꿔 문자열 분해를 없앤다. 프론트는 정부·위원장 로고를 법안 카드와 같은 getChairmanProposerInfo/government-logo 기준으로 렌더한다. 이미지가 없을 때의 fallback을 둔다.
- 검증 메모: NotificationFacade.java:108-111,125-128은 의원 발의가 아니면 List.of(billId, title, stage, kind, proposers)를 반환한다. NotificationConverter는 BILL_STAGE_UPDATE와 BILL_RESULT_UPDATE에서 data.get(4)+'.png'를 'party:url' 형식 없이 넣는다. NotificationItem.tsx:27-28에서 이 값은 길이 1 배열이 되고 split(':')은 ['정부.png']가 된다. :41의 imageUrlList[0][1]은 undefined다. 라이트 모드에서는 src가 '${IMAGE_URL}undefined'가 된다. theme==='dark'이면 undefined.replace로 TypeError가 난다. defaultTheme는 'light'이므로 사용자가 다크 모드를 직접 고른 경우에 해당한다(NextThemesProvider.tsx:8). 운영 데이터에 이 알림이 있는지는 확인하지 못했다.
- 파일: `services/web/app/notification/components/NotificationItem.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/global/util/NotificationConverter.java`, `services/backend/src/main/java/com/everyones/lawmaking/facade/NotificationFacade.java`, `services/backend/src/main/java/com/everyones/lawmaking/common/dto/response/NotificationResponse.java`

### ACCOUNT-15 알림 '모두 삭제'에 확인이 없고 성공 스낵바가 요청 결과 전에 뜬다

- 분류: major · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 메뉴에서 '모두 삭제'를 누르면 확인 없이 모든 알림이 영구 삭제된다. 요청이 실패해도 '알림을 모두 삭제했습니다.'가 표시돼 사용자가 결과를 믿을 수 없다.
- 근거: app/notification/components/NotificationList.tsx:135-143 — mutate 직후 성공 스낵바, 확인 단계 없음. :97-133 읽음·삭제·모두 읽음도 같은 방식. 백엔드 NotificationController.java:113-118 DELETE /delete/all은 하드 삭제. 같은 기능의 NotificationTopThree.tsx:27-63은 onSuccess/onError로 올바르게 처리한다.
- 수정안: '모두 삭제'는 확인 대화상자(삭제 개수 표시, 위험 문구)를 거치게 한다. 개별 삭제는 실행 취소 가능한 스낵바로 바꾼다. 모든 알림 mutation의 스낵바를 onSuccess/onError로 옮겨 TopThree와 같은 기준을 쓴다.
- 검증 메모: NotificationList.tsx:135-143은 mutateDeleteAll.mutate() 직후 성공 스낵바를 띄우고 확인 단계가 없다. :97-133의 읽음, 삭제, 모두 읽음도 같다. NotificationController.java:113-118 DELETE /delete/all은 deleteAllNotification을 호출한다. NotificationTopThree.tsx는 onSuccess와 onError로 스낵바를 띄운다.
- 파일: `services/web/app/notification/components/NotificationList.tsx`

### ACCOUNT-18 팔로우·스크랩 변경이 마이페이지·팔로잉 목록에 최대 5분 반영되지 않고 실패해도 성공으로 표시된다

- 분류: major · bug · 작업량 M · 검증 confirmed
- 사용자 영향: 의원이나 정당을 팔로우한 뒤 마이페이지로 가면 목록에 없다. 요청이 실패해도 버튼과 개수는 바뀐 채로 남고 '팔로우했습니다' 스낵바가 뜬다.
- 근거: app/congressman/[id]/apis/queries.ts:42-44 — '/congressman/detail'만 무효화. app/party/[id]/apis/queries.ts:42-43 — '/party/detail'만 무효화. 마이페이지 키 '/user/liking/congressman', '/user/following/party'(mypage/apis/queries.ts:18-28), 팔로잉 키 '/following-tab/congressman', '/following-tab/bill'은 갱신되지 않음. lib/provider/QueryClientProvider.tsx:12 staleTime 5분. app/congressman/[id]/components/Congressman/FollowBoard.tsx:30-47, components/Bill/BillList/Bill/Bill.tsx:128-145 — 낙관적 변경과 성공 스낵바를 mutate 전에 실행, onError 롤백 없음.
- 수정안: 팔로우·스크랩 mutation을 하나의 훅 계층에 모으고 관련 쿼리 키 상수를 공유해 onSuccess에서 함께 무효화한다. 낙관적 업데이트는 onMutate/onError 롤백 패턴으로 바꾸고 스낵바는 결과에 따라 띄운다.
- 검증 메모: congressman/[id]/apis/queries.ts:42-44는 ['/congressman/detail', id]만 무효화한다. party/[id]/apis/queries.ts:42-43은 ['/party/detail', id]만 무효화한다. 마이페이지 키 '/user/liking/congressman', '/user/following/party'와 '/following-tab/*'는 무효화하지 않는다. QueryClientProvider.tsx:12의 staleTime은 5분이다. FollowBoard.tsx:30-47과 Bill.tsx:128-145는 상태 변경과 성공 스낵바를 mutate 전에 실행하고 onError 롤백이 없다. 법안 스크랩은 bill/[id]/apis/queries.ts:24-27에서 마이페이지 키를 무효화하지만 '/following-tab/bill'은 무효화하지 않는다.
- 파일: `services/web/app/congressman/[id]/apis/queries.ts`, `services/web/app/party/[id]/apis/queries.ts`, `services/web/app/congressman/[id]/components/Congressman/FollowBoard.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/app/mypage/apis/queries.ts`

### ACCOUNT-02 인증 쿠키 maxAge 단위 오류로 쿠키가 토큰보다 수십 배 오래 남아 로그인 상태가 거짓으로 표시된다

- 분류: minor · bug · 백엔드 · 작업량 M · 검증 adjusted
- 사용자 영향: 리프레시 토큰(7일)이 만료된 사용자도 accessToken 쿠키가 약 20.8일 남아 있어 화면은 로그인 상태(알림 버튼, 마이페이지 진입)로 보인다. 실제 요청은 모두 실패한다.
- 근거: OAuth2AuthenticationSuccessHandler.java:56-59 — minutes = 1000*60을 곱해 maxAge에 넣는다. ResponseCookie.maxAge는 초 단위이므로 access 30분 → 1,800,000초(약 20.8일), refresh 10080분 → 604,800,000초(약 19년). AuthService.java:69-71도 동일. TokenService.java:60-71은 같은 값을 밀리초로 써서 JWT는 30분/7일로 만료된다. 프론트는 getCookie(ACCESS_TOKEN) 존재 여부로 로그인 상태를 판단한다(mypage/page.tsx:14, NotifcationButton.tsx:13, Bill.tsx:129).
- 수정안: access 쿠키 maxAge만 30분(1800초)으로 줄이면 안 된다. 프론트는 accessToken 쿠키가 있어야 로그인 상태로 보고 401과 reissue 흐름을 시작한다. 쿠키가 30분 뒤 사라지면 refresh 토큰이 유효해도 사용자는 30분마다 로그아웃된 것처럼 보인다. 선행 작업으로 로그인 상태 판단을 세션 API 기반으로 바꾼다. 그 전까지는 access 쿠키 maxAge를 refresh 수명(10080분×60초)에 맞춘다. 초 단위 변환 함수는 한 곳에 둔다.
- 검증 메모: 단위 오류는 실재한다. OAuth2AuthenticationSuccessHandler.java:56-59와 AuthService.java:69-71은 maxAge에 분×60000을 넣는다. ResponseCookie.maxAge는 초 단위이므로 access 쿠키는 1,800,000초(약 20.8일)가 된다. TokenService는 같은 값을 밀리초로 쓰므로 JWT는 30분과 7일에 만료된다. 사용자 영향은 과장됐다. 거짓 로그인 상태는 refresh 만료(7일) 뒤 첫 인증 요청까지만 이어진다. 그 요청에서 reissue 실패 경로가 tokenService.logout을 호출하고, logout은 Domain=.lawdigest.kr 쿠키를 지운다(CookieUtil.deleteCookieForClient). 따라서 '실제 요청은 모두 실패'하지 않는다. 화면은 다음 렌더부터 비로그인 상태가 된다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/global/handler/OAuth2AuthenticationSuccessHandler.java`, `services/backend/src/main/java/com/everyones/lawmaking/service/AuthService.java`, `services/web/app/mypage/page.tsx`, `services/web/components/common/Button/NotifcationButton.tsx`

### ACCOUNT-14 알림 시각이 날짜만 있는 값으로 계산돼 '14시간 전', '-30분 전' 같은 틀린 시간이 나온다

- 분류: minor · data · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: 오늘 받은 알림이 실제 시각과 무관하게 'N시간 전'으로 보인다. 한국 시간 00:00~09:00 사이에는 오늘 알림이 '-N분 전'으로 표시된다.
- 근거: NotificationResponse.java:44 — createdDate가 LocalDate(응답 예: '2026-07-09'). NotificationConverter.java:106 createdDate.toLocalDate(). utils/getTimeRemaining.ts:2 — new Date('2026-07-09')는 UTC 자정(KST 09:00)으로 해석되고, 그 전이면 timeDiff가 음수가 되어 :12에서 음수 분을 출력.
- 수정안: 백엔드가 created_date를 오프셋 포함 ISO 일시(LocalDateTime+Asia/Seoul)로 내려준다. 프론트는 하나의 상대시간 유틸(Intl.RelativeTimeFormat, 음수는 '방금')로 통일한다.
- 검증 메모: NotificationResponse.java의 createdDate는 LocalDate이고 NotificationConverter는 createdDate.toLocalDate()를 넣는다. NotificationItem.tsx:74는 getTimeRemaining(created_date)를 호출한다. getTimeRemaining.ts:2는 'T'만 치환하므로 new Date('2026-07-09')가 되고, 이 값은 UTC 자정(KST 09:00)으로 해석된다. 그래서 오늘 알림은 KST 기준 경과 시간과 관계없이 'N시간 전'으로 나온다. 00:00~09:00 KST에는 timeDiff가 음수가 되어 '-N분 전'이 나온다. 같은 유틸은 Bill.tsx:294,304의 propose_date에도 쓰인다.
- 파일: `services/web/utils/getTimeRemaining.ts`, `services/backend/src/main/java/com/everyones/lawmaking/common/dto/response/NotificationResponse.java`, `services/backend/src/main/java/com/everyones/lawmaking/global/util/NotificationConverter.java`

### ACCOUNT-16 알림이 비어 있을 때 같은 뜻의 빈 상태 문장이 4개 반복된다

- 분류: minor · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 알림이 없는 사용자는 '알림이 없습니다.', '지난 한 주 알림이 없습니다.', '지난 한 달 알림이 없습니다.', '지난 알림이 없습니다.'를 한 화면에서 모두 본다. 어떤 행동을 하면 알림을 받는지는 알 수 없다.
- 근거: app/notification/components/NotificationList.tsx:149-151,178-180,197-199,217-219. 상단 문장 :153-154는 읽지 않은 개수만 말하면서 전체 목록을 보여준다. 초기 더미 데이터 initialData(:19-59)도 남아 있다.
- 수정안: '알림이 없습니다.' 판단을 notification_count(읽지 않은 수) 대신 전체 목록 길이로 바꾸는 작업도 함께 넣는다.
- 검증 메모: 알림이 0건이면 NotificationList.tsx:150,180,199,219의 빈 상태 문장 4개가 함께 렌더된다. :149 분기는 읽지 않은 개수가 0이기만 하면 '알림이 없습니다.'를 보여준다. 그래서 읽은 알림이 목록에 있어도 이 문장이 나온다. initialData(:19-59)도 남아 있다.
- 파일: `services/web/app/notification/components/NotificationList.tsx`

### ACCOUNT-17 알림 설정이 없고 파이프라인 정지로 7월 이후 새 알림이 생성되지 않는다

- 분류: minor · trust · 백엔드 · 운영 데이터 작업 · 작업량 L · 검증 adjusted
- 사용자 영향: 사용자는 어떤 알림을 받을지 고를 수 없고 끌 수도 없다. 알림은 DB 변경 이벤트로만 만들어지므로 수집이 멈춘 2026-07-09 이후로는 팔로우·스크랩을 해도 알림이 오지 않는다. 화면은 이 상태를 알려주지 않는다.
- 근거: 백엔드에 알림 설정 엔티티·엔드포인트 없음(grep notification setting/preference 결과 없음). NotificationController.java는 조회·읽음·삭제만 제공. 알림 생성은 TableEventListener.java:266-286 → NotificationCreator.createNotification으로 테이블 변경 이벤트에 의존. 운영 최신 법안 발의일 2026-07-09(과제 전제).
- 수정안: 파이프라인 복구는 데이터 영역 결함으로 넘긴다. 이 항목은 알림 on/off 설정 기능 추가(minor, L)로만 남긴다.
- 검증 메모: 알림 설정 엔티티와 API가 없는 것은 확인했다(grep 결과 없음). 알림 생성은 TableEventListener.java의 테이블 변경 이벤트 → notificationCreator.createNotification 경로에만 의존한다. 그러나 설정 기능이 없는 것은 기능 범위의 공백이다. 깨진 기능이 아니다. 7월 이후 알림이 생성되지 않는 문제의 근본 원인은 수집 파이프라인 정지이고, 이는 데이터 파이프라인 결함과 중복이다. 두 문제를 하나의 major로 묶으면 우선순위가 왜곡된다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/controller/NotificationController.java`, `services/backend/src/main/java/com/everyones/lawmaking/global/config/NotificationCreator.java`, `services/web/app/mypage/page.tsx`

### ACCOUNT-19 마이페이지·팔로잉의 빈 상태와 개수 표시가 미완성이다

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 처음 가입한 사용자는 '팔로우한 정당 · 0', '팔로우한 의원 ·'(숫자 빈칸), '스크랩한 법안 · 0'과 빈 영역만 본다. 무엇을 하면 채워지는지, 어디로 가야 하는지 알 수 없다. 스크랩 개수는 0으로 보였다가 실제 값으로 바뀐다.
- 근거: mypage/components/Party/PartyList.tsx:13-21 — 0개일 때 빈 grid. Congressman/CongressmanList.tsx:22 — 로딩 중 {congressmanList?.length}가 비어 '팔로우한 의원 ·'만 표시, 0개면 아무것도 렌더 안 함(:25). BillContainer/BillBookmarkedCount.tsx:8 — 초기값 0. following/components/BillContainer/BillFollowedList.tsx:16-26 — 0건이면 빈 ul. mypage/apis/queries.ts:39 — 첫 페이지가 마지막이면 1을 반환해 빈 페이지를 한 번 더 요청하고 스피너가 깜빡인다.
- 수정안: 섹션마다 빈 상태 컴포넌트(한 줄 내용 + 탐색/타임라인으로 가는 버튼)를 둔다. 개수는 데이터 확정 전 스켈레톤으로 대체한다. getNextPageParam을 last_page ? undefined : page_number + 1로 고친다.
- 검증 메모: PartyList.tsx:17-21은 0개일 때 빈 grid를 렌더한다. CongressmanList.tsx:22는 로딩 중에 {congressmanList?.length}가 비어 '팔로우한 의원 ·'만 보인다. 0개이면 빈 items의 ExpandableList만 렌더된다. BillBookmarkedCount.tsx:8의 초기값은 0이다. BillFollowedList.tsx:16-26은 0건이면 빈 ul을 렌더한다. mypage/apis/queries.ts의 getNextPageParam은 last_page && page_number===0이면 1을 반환한다. 그래서 빈 페이지를 한 번 더 요청한다.
- 파일: `services/web/app/mypage/components/Party/PartyList.tsx`, `services/web/app/mypage/components/Congressman/CongressmanList.tsx`, `services/web/app/mypage/components/BillContainer/BillBookmarkedCount.tsx`, `services/web/app/mypage/apis/queries.ts`, `services/web/app/following/components/BillContainer/BillFollowedList.tsx`

### ACCOUNT-20 마이페이지 스크랩 섹션의 컴포넌트 설명 배너

- 분류: minor · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 섹션 제목 '스크랩한 법안' 바로 아래에 같은 뜻의 '이곳에서 스크랩한 법안들을 모아서 확인하세요!' 배너가 큰 면적을 차지한다. 실제 목록은 그만큼 아래로 밀린다.
- 근거: app/mypage/components/BillContainer/BillContainer.tsx:33-44 — scrab.png 아이콘과 설명 문구 카드(bg-primary-3). 화면 문구 원칙상 컴포넌트를 설명하는 캡션은 결함이다.
- 수정안: 배너를 제거한다. 스크랩이 0건일 때만 빈 상태로 행동 유도 문구를 보여준다.
- 검증 메모: BillContainer.tsx:33-44는 '스크랩한 법안' 제목 바로 아래에 scrab.png와 '이곳에서 스크랩한 법안들을 모아서 확인하세요!' 카드를 둔다. 이 카드는 컴포넌트를 설명하는 문구이고 화면 문구 원칙에 맞지 않는다.
- 파일: `services/web/app/mypage/components/BillContainer/BillContainer.tsx`

### ACCOUNT-21 /following 페이지가 내비게이션에서 빠진 채 피드 팔로잉 탭과 중복 구현돼 있다

- 분류: minor · dead-code · 작업량 S · 검증 confirmed
- 사용자 영향: 같은 팔로잉 정보가 피드 '팔로잉' 탭과 /following 두 곳에서 다른 레이아웃·다른 빈 상태로 보인다. /following에는 링크로 도달할 수 없어 검색이나 옛 링크로 들어온 사용자만 다른 화면을 본다.
- 근거: config/site.ts:19-40 navItems에 /following 없음. 웹 전체 grep에서 href='/following' 링크 없음(Header.tsx:39의 경로 비교만 존재). components/Feed/Feed/FollowingFeed.tsx, FollowingCongressmanStrip.tsx가 app/following의 API·CongressmanList를 재사용해 같은 기능을 피드 탭에 구현.
- 수정안: /following을 피드 팔로잉 탭으로 redirect하고 app/following 페이지 코드를 제거한다. 공유 API/컴포넌트는 components/Following으로 옮긴다.
- 검증 메모: config/site.ts navItems는 피드, 타임라인, 탐색, 마이페이지만 담는다. 웹 코드에서 /following 링크는 없고 Header.tsx:39의 경로 비교만 있다. FollowingFeed.tsx:8과 FollowingCongressmanStrip.tsx:7-8은 app/following의 API와 CongressmanList를 가져다 쓴다. /following은 200으로 응답한다.
- 파일: `services/web/app/following/page.tsx`, `services/web/components/Feed/Feed/FollowingFeed.tsx`, `services/web/components/Layout/Header/Header.tsx`, `services/web/config/site.ts`

### ACCOUNT-22 계정 화면의 페이지 제목·설명이 개발용 문구이고 개인 페이지가 색인 대상이다

- 분류: minor · seo · 작업량 S · 검증 confirmed
- 사용자 영향: 로그인 화면 탭 제목이 '회원가입 페이지'다. 브라우저 탭과 방문 기록에 서비스 이름이 없다. 팔로잉 설명에는 '내가 정보한 정보들을' 오탈자가 있다.
- 근거: curl 결과 <title>: /login '회원가입 페이지', /login/kakaoLogin '회원가입 페이지', /mypage '마이 페이지', /following '팔로잉 페이지', /notification '알림 페이지'. description: '회원가입 페이지', '내가 정보한 정보들을 자세히 확인할 수 있는 페이지'(app/following/layout.tsx:6). robots meta 없음. 브랜드 접미사를 붙이는 utils/getMetadata.ts:13('제목 | 모두의입법')이 있지만 계정 layout은 쓰지 않는다(app/login/layout.tsx:4-7 등).
- 수정안: getMetadata를 써서 '로그인 | 모두의입법', '마이페이지 | 모두의입법', '알림 | 모두의입법'으로 바꾼다. 콜백·마이페이지·알림·팔로잉에는 robots: { index: false }를 넣는다.
- 검증 메모: curl로 각 경로의 <title>을 확인했다. /login과 /login/kakaoLogin은 '회원가입 페이지'다. /mypage는 '마이 페이지', /following은 '팔로잉 페이지', /notification은 '알림 페이지'다. /following description은 '내가 정보한 정보들을 자세히 확인할 수 있는 페이지'다. 네 경로 모두 robots meta가 없다. 각 layout.tsx는 metadata를 직접 선언하고 utils/getMetadata.ts를 쓰지 않는다.
- 파일: `services/web/app/login/layout.tsx`, `services/web/app/mypage/layout.tsx`, `services/web/app/following/layout.tsx`, `services/web/app/notification/layout.tsx`

### ACCOUNT-23 카카오 로그인 버튼이 카카오 디자인 가이드를 따르지 않고 세 버튼이 구분되지 않는다

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 카카오 버튼이 흰 바탕 테두리 버튼이라 사용자가 익숙한 노란 카카오 버튼으로 인식하지 못한다. 세 버튼이 같은 모양이라 로고 크기 22px만으로 구분해야 한다. 로그인으로 무엇을 할 수 있는지(스크랩·팔로우·알림)도 화면에 없다.
- 근거: app/login/page.tsx:19-27 — variant bordered, bg-transparent, 문구 '카카오톡으로 시작하기'. 카카오 디자인 가이드(developers.kakao.com/docs/ko/kakaologin/design-guide): 컨테이너 #FEE500, 심볼 #000000, 레이블 #000000 85%, 국문 레이블 '카카오 로그인'. 스크린샷 mcp-Claude_Browser-blob-1793624889136-8bomkz.jpg: 로고와 동일한 회색 테두리 버튼 3개만 표시.
- 수정안: 카카오 버튼을 가이드 색과 레이블로 바꾸고 네이버·구글도 각 사 브랜드 가이드 버튼으로 맞춘다. 로고 아래에 로그인으로 쓸 수 있는 기능을 짧은 내용으로 한 줄 둔다.
- 검증 메모: login/page.tsx:19-27은 variant bordered, bg-transparent, 문구 '카카오톡으로 시작하기'를 쓴다. 카카오 디자인 가이드(developers.kakao.com/docs/ko/kakaologin/design-guide)를 직접 확인했다. 컨테이너 #FEE500, 심볼 #000000, 레이블 #000000 85%로 정해져 있다. 가이드는 정한 색상을 벗어나지 말라고 적는다. 국문 레이블은 '카카오 로그인' 또는 '로그인'이다.
- 파일: `services/web/app/login/page.tsx`

### ACCOUNT-24 계정 영역의 아이콘 버튼에 접근 가능한 이름이 없고 장식 이미지에 대체 텍스트가 붙어 있다

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 스크린리더 사용자는 헤더 알림 버튼, 알림 항목 메뉴, 뒤로 가기 버튼을 '링크' '버튼'으로만 듣는다. 비로그인 알림 버튼은 href='#'라 누르면 URL에 #이 붙고 페이지 맨 위로 이동한다. 로그인 버튼은 '카카오톡 로고 이미지 카카오톡으로 시작하기'처럼 중복으로 읽힌다.
- 근거: components/common/Button/NotifcationButton.tsx:18-43 — aria-label 없음, href='#'. app/notification/components/NotificationItem.tsx:83, NotificationList.tsx:159 — isIconOnly 케밥 버튼에 aria-label 없음. components/common/Button/GoBackButton.tsx:16 aria-label 없음. SettingButton.tsx:19 aria-label='Static Actions'. app/login/page.tsx:24,33,42 로고 alt. mypage/components/UserInfo/UserInfo.tsx:20 '프로필 사진 테두리' alt, :25 Avatar에 이름 없음. following/components/FollowingHeader/CongressmanList.tsx:6-10 ul 안에 li 없이 div. 배지(NotifcationButton.tsx:40)는 읽지 않은 개수를 전달하지 않는다.
- 수정안: 아이콘 버튼에 aria-label('알림, 읽지 않은 알림 N개', '알림 메뉴', '뒤로 가기')을 넣는다. 비로그인 알림 버튼은 /login?next=/notification 링크로 바꾼다. 장식 이미지와 텍스트가 있는 버튼의 로고는 alt=''로 둔다. 목록은 li로 감싼다.
- 검증 메모: NotifcationButton.tsx에는 aria-label이 없고 비로그인 분기는 href='#'다. NotificationItem.tsx:83과 NotificationList.tsx:159의 isIconOnly 케밥 버튼에는 aria-label이 없다. GoBackButton.tsx:16에도 aria-label이 없다. SettingButton.tsx:19는 aria-label='Static Actions'다. login/page.tsx:24,33,42의 로고 alt는 버튼 텍스트와 중복된다. UserInfo.tsx:20은 alt '프로필 사진 테두리'다. following CongressmanList.tsx:6-10의 ul 자식인 CongressmanItem의 루트는 div다(CongressmanItem.tsx:24). 배지 content는 빈 문자열이다.
- 파일: `services/web/components/common/Button/NotifcationButton.tsx`, `services/web/app/notification/components/NotificationItem.tsx`, `services/web/app/notification/components/NotificationList.tsx`, `services/web/components/common/Button/GoBackButton.tsx`, `services/web/app/login/page.tsx`, `services/web/app/mypage/components/UserInfo/UserInfo.tsx`, `services/web/app/following/components/FollowingHeader/CongressmanList.tsx`

### ACCOUNT-25 NotificationButton이 조건부로 훅을 호출한다

- 분류: minor · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 같은 화면에서 로그인 상태가 바뀌면(토큰 쿠키 삭제·발급) 헤더가 'Rendered more/fewer hooks' 오류로 깨질 수 있다.
- 근거: components/common/Button/NotifcationButton.tsx:16-28 — accessToken이 없으면 return한 뒤에 useGetNotificationCount 호출(eslint rules-of-hooks 비활성 주석).
- 수정안: useGetNotificationCount({ enabled: isLoggedIn })를 컴포넌트 최상단에서 항상 호출하고 렌더 분기만 나눈다. 로그인 상태는 ACCOUNT-02의 세션 훅에서 받는다.
- 검증 메모: NotifcationButton.tsx:16-28은 accessToken이 없으면 먼저 return한다. useGetNotificationCount는 그 뒤에 호출되고 rules-of-hooks 비활성 주석이 붙어 있다. 같은 인스턴스에서 쿠키 상태가 바뀌어 다시 렌더되면 훅 개수가 달라진다. useGetNotificationCount는 이미 enabled 옵션을 받는다(NotificationTopThree.tsx). 그래서 수정안을 바로 적용할 수 있다.
- 파일: `services/web/components/common/Button/NotifcationButton.tsx`

### ACCOUNT-26 로그아웃이 결과를 기다리지 않고, 모든 기기를 로그아웃시키며, 캐시를 남긴다

- 분류: minor · ux · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: 로그아웃 요청이 실패해도 '로그아웃을 성공했습니다.'가 뜬다. 로그아웃 뒤 도착지가 로그인 화면이라 하던 탐색이 끊긴다. 휴대폰에서 로그아웃하면 PC 세션도 다음 재발급 시 끊긴다. 이전 사용자의 마이페이지 데이터가 메모리 캐시에 남는다.
- 근거: app/mypage/components/UserInfo/LogoutButton.tsx:14-20 — postLogout() await 없음, 즉시 성공 스낵바와 router.push('/login'), queryClient 초기화 없음. 문구 '로그아웃을 성공했습니다.'는 비문. 백엔드 TokenService.java:162-165 → deleteByUserId(:182-184)로 해당 사용자의 모든 리프레시 토큰 삭제.
- 수정안: await postLogout() 후 queryClient.clear(), 홈으로 replace, '로그아웃했어요' 스낵바를 띄운다. 실패 시 오류 문구를 보여준다. 백엔드는 요청의 리프레시 토큰 한 건만 삭제하고, 전체 기기 로그아웃은 별도 기능으로 둔다.
- 검증 메모: LogoutButton.tsx:14-20은 postLogout()을 await하지 않는다. 바로 성공 스낵바 '로그아웃을 성공했습니다.'를 띄우고 router.push('/login')를 호출한다. queryClient 초기화는 없다. TokenService.logout은 invalidateToken → deleteByUserId로 해당 사용자의 토큰을 모두 지운다. Token 엔티티는 User와 ManyToOne이라 기기마다 토큰 행이 따로 있다.
- 파일: `services/web/app/mypage/components/UserInfo/LogoutButton.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/global/service/TokenService.java`

### ACCOUNT-27 비로그인 팔로잉 탭이 불필요한 API를 호출하고 백엔드는 401 대신 404를 준다

- 분류: minor · bug · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: 비로그인 사용자가 피드 팔로잉 탭을 열 때마다 실패하는 요청이 나간다. 401 처리 흐름과 다르게 404 '해당 유저를 찾을 수 없습니다.'가 오므로 오류 처리 기준이 엇갈린다.
- 근거: components/Feed/Feed/FollowingFeed.tsx:15 — useGetFollowingBill에 enabled 조건 없음(app/following/apis/queries.ts:10-20). curl GET https://api.lawdigest.kr/v1/following-tab/bill?page=0&size=3 → 404 {"message":"해당 유저를 찾을 수 없습니다."}, /v1/following-tab/congressman도 404. 같은 조건의 /v1/user/info는 401.
- 수정안: useGetFollowingBill에 enabled 옵션을 받게 하고 로그인 상태일 때만 호출한다. FollowingTabController는 AuthenticationUtil.requireUserId로 401을 반환하게 맞춘다.
- 검증 메모: curl GET https://api.lawdigest.kr/v1/following-tab/bill?page=0&size=3과 /v1/following-tab/congressman(비인증)은 404 {"message":"해당 유저를 찾을 수 없습니다."}를 반환한다. /v1/user/info와 /v1/notification/user/count는 401이다. FollowingFeed.tsx:15의 useGetFollowingBill에는 enabled 조건이 없다(app/following/apis/queries.ts:10-20). NotificationController는 이미 AuthenticationUtil.requireUserId를 쓴다.
- 파일: `services/web/components/Feed/Feed/FollowingFeed.tsx`, `services/web/app/following/apis/queries.ts`, `services/backend/src/main/java/com/everyones/lawmaking/controller/FollowingTabController.java`

### ACCOUNT-03 클라이언트 deleteCookie가 Domain=.lawdigest.kr 쿠키를 지우지 못한다

- 분류: polish · bug · 작업량 S · 검증 adjusted
- 사용자 영향: 토큰 재발급 실패나 탈퇴 직후 등 클라이언트가 쿠키를 지우는 경로에서 쿠키가 그대로 남아 계속 로그인된 것처럼 보인다.
- 근거: 백엔드는 accessToken을 domain=.lawdigest.kr로 발급한다(CookieUtil.java:37-46, application-prod.properties:23). 프론트는 deleteCookie(ACCESS_TOKEN)를 domain 없이 호출한다(api/auth/handlers.ts:24, mypage/components/UserInfo/LogoutButton.tsx:16, components/common/Modal/WithdrawModal.tsx:15). cookies-next 4.3.0 deleteCookie는 path '/'만 넣어 Set-Cookie를 만들므로(node_modules/cookies-next/lib/index.js setCookie) 호스트 전용 쿠키만 만료되고 도메인 쿠키는 남는다.
- 수정안: 프론트 deleteCookie(ACCESS_TOKEN) 호출 세 곳을 제거한다. 쿠키 삭제는 백엔드 Set-Cookie에 맡긴다. 로그아웃과 탈퇴는 응답을 await한 뒤 이동한다.
- 검증 메모: 코드 결함은 실재한다. cookies-next 4.3.0 setCookie와 deleteCookie는 기본 옵션으로 path '/'만 넣는다(node_modules/cookies-next/lib/index.js). 그래서 domain 없이 지우면 Domain=.lawdigest.kr 쿠키는 남는다. 하지만 세 경로 모두 백엔드가 같은 쿠키를 지운다. 로그아웃은 POST /v1/logout을 CustomLogoutFilter가 받아 tokenService.logout을 호출한다. 탈퇴는 UserFacade.java:55에서 logout을 먼저 호출한다. reissue 실패는 AuthService.java:43,54,59에서 logout을 호출한다. logout은 deleteCookieForClient로 도메인 쿠키를 만료한다. 그러므로 '쿠키가 그대로 남아 계속 로그인된 것처럼 보인다'는 영향은 재현되지 않는다. 남는 문제는 효과 없는 중복 코드뿐이다. 응답을 기다리지 않는 순서 문제는 ACCOUNT-26에 속한다.
- 파일: `services/web/api/auth/handlers.ts`, `services/web/app/mypage/components/UserInfo/LogoutButton.tsx`, `services/web/components/common/Modal/WithdrawModal.tsx`

### ACCOUNT-28 구글 로그인이 매번 동의 화면을 띄운다

- 분류: polish · ux · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 이미 가입한 사용자도 구글로 로그인할 때마다 권한 동의 화면을 다시 거친다.
- 근거: services/backend/src/main/resources/application.properties:91 additional-parameters.prompt = consent, :96 authorization-uri에 access_type=offline&prompt=consent. prompt=consent는 매 요청마다 동의를 요구한다.
- 수정안: 탈퇴 시 unlink에 필요한 리프레시 토큰이 저장돼 있지 않은 경우(최초 연결)에만 prompt=consent를 붙이도록 authorization request resolver를 커스터마이즈한다.
- 검증 메모: application.properties:91은 additional-parameters.prompt=consent다. :96 authorization-uri에도 access_type=offline&prompt=consent가 있다. 그래서 구글 로그인은 요청할 때마다 동의 화면을 띄운다. 이 설정은 탈퇴 시 unlink에 쓸 리프레시 토큰을 받으려는 목적으로 보인다. 그래서 수정안처럼 최초 연결일 때만 prompt=consent를 붙여야 한다.
- 파일: `services/backend/src/main/resources/application.properties`, `services/backend/src/main/java/com/everyones/lawmaking/global/config/SecurityConfig.java`

### ACCOUNT-29 마이페이지 시각 요소가 디자인 시스템과 어긋나고 클래스 오타가 남아 있다

- 분류: polish · visual · 작업량 M · 검증 confirmed
- 사용자 영향: 마이페이지 스크랩 카드는 피드 법안 카드와 모양(둥근 모서리, 정당색 테두리, 다른 정보 배치)이 달라 같은 법안이 다른 물건처럼 보인다. 프로필 영역은 화면 폭마다 글자색이 흰색·검은색으로 바뀐다.
- 근거: app/mypage/components/BillContainer/BillBookmarked.tsx:42 radius='md' + 정당 클래스 테두리, DESIGN.md '법안 피드 카드는 각진 형태(0px)'. 팔로잉은 같은 데이터에 components/Bill을 사용(following/components/BillContainer/BillFollowedList.tsx:18). UserInfo.tsx:13 md:text-white lg:text-black 등 중단점별 색 덮어쓰기, profileBorder.png 장식. 하드코딩 색 #E0E0E0, #555555, #999999(mypage/page.tsx:34,36, CongressmanList.tsx:22, LogoutButton.tsx:28). 오타: mypage/page.tsx:26·following/page.tsx:27 'h-full [140px]', following/components/FollowingHeader/CongressmanItem.tsx:42 'bg-tranparent'. app/bill/[id]/apis/queries.ts:1 'use clinet'.
- 수정안: 스크랩 목록은 피드와 같은 Bill 컴포넌트(축약 variant)를 쓴다. 프로필 영역은 토큰 색 하나로 단순화하고 장식 테두리 이미지를 제거한다. 하드코딩 색을 tailwind 토큰(border-default, text-secondary, text-muted)으로 바꾸고 오타를 고친다.
- 검증 메모: BillBookmarked.tsx는 radius='md'와 정당 클래스 테두리를 쓴다. DESIGN.md:225는 '법안 피드 카드는 각진 형태(0px)'로 정한다. 마이페이지에서 둥글릴 수 있는 것은 묶음 컨테이너뿐이다. UserInfo.tsx:13에는 md:text-white lg:text-black처럼 중단점마다 색을 덮어쓰는 클래스가 있다. 하드코딩 색은 mypage/page.tsx:34,36의 #E0E0E0, CongressmanList.tsx:22의 #555555, LogoutButton.tsx:28의 #999999에서 확인했다. 'h-full [140px]'(mypage/page.tsx:26, following/page.tsx:27), 'bg-tranparent'(CongressmanItem.tsx:42), 'use clinet'(bill/[id]/apis/queries.ts:1)도 확인했다.
- 파일: `services/web/app/mypage/components/BillContainer/BillBookmarked.tsx`, `services/web/app/mypage/components/UserInfo/UserInfo.tsx`, `services/web/app/mypage/page.tsx`, `services/web/app/following/page.tsx`, `services/web/app/following/components/FollowingHeader/CongressmanItem.tsx`, `services/web/app/bill/[id]/apis/queries.ts`

## 데이터 신뢰·최신성 (TRUST)

### TRUST-01 데이터 기준일이 어디에도 없고, 4개월 공백이 최신 정보처럼 보인다

- 분류: blocker · trust · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 adjusted
- 사용자 영향: 오늘(2026-11-02) 피드 첫 화면 맨 위 법안이 2026-07-09 발의 건이다. 이 사실을 알려 주는 표시가 없다. 사용자는 국회가 4개월 동안 법안을 내지 않았다고 오해하거나 서비스가 죽었다고 판단한다. 단계·결과·통계 수치도 모두 7월 이전 상태인데, 기준일 없이 '현재 상태'처럼 보인다.
- 근거: curl https://api.lawdigest.kr/v1/bill/mainfeed?page=0..9&size=50 → 최근 500건 propose_date 분포가 2026-06 279건, 2026-07 221건이다. 최신은 2026-07-09이고 8~10월은 0건이다. grep으로 '업데이트|기준|갱신|updated'를 web/app·components에서 찾으면 freshness 표시가 0건이다. 날짜 표기는 utils/getTimeRemaining.ts:5-6에서 720시간이 넘으면 'YYYY-MM-DD'만 보여 준다. 통계 탭에도 날짜 기준이 없고 StatsResultComposition.tsx:68 '17,982건 기준'만 있다.
- 수정안: 1순위는 수집과 AI 처리 파이프라인을 재가동하고 2026-07-10 이후 분량을 백필하는 것이다. 기준일 표시는 2순위다. 기준일은 피드 노출 조건(title·gpt_summary 생성 완료)이 아니라 수집 기준 최신 시각으로 계산한다. 요약이 아직 없는 적재 건 수도 함께 노출 기준에 넣는다.
- 검증 메모: web/app·components 전체에서 데이터 기준일 표시가 없다. grep 결과 '기준'은 StatsResultComposition.tsx:68 '건 기준'뿐이다. mainfeed page=0 첫 5건은 모두 2026-07-09이다. 4개 페이지 200건 표본에서 8~10월 발의 법안은 0건이다. getTimeRemaining.ts:5-6은 720시간을 넘으면 날짜만 보여 준다. 정정할 점이 하나 있다. 운영 /party/2 HTML에는 2026-07-10 발의 '모자보건법 일부개정법률안'이 원문 요약을 제목으로 단 채 나온다. 따라서 DB의 최신 적재일은 07-10이다. 이 법안은 AI 제목과 요약이 없어 피드에서 빠진 것으로 보인다(BillRepository.java:106-114는 title·gpt_summary가 NOT NULL인 건만 조회한다). blocker 판정의 근거는 기준일 표시 누락이 아니라 수집 파이프라인 정지다. 기준일 표시가 없는 것만 보면 major다.
- 파일: `services/web/components/Feed/Feed/Feed.tsx`, `services/web/utils/getTimeRemaining.ts`, `services/web/app/explore/components/StatsPanel.tsx`, `services/web/app/bill/[id]/components/BillDetail/BillDetail.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/controller/BillController.java`

### TRUST-02 가결된 법안 대부분에서 처리 결과 차트가 숫자 없이 '원안가결 / 300'으로 깨진다

- 분류: blocker · bug · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: '통과됐나?'를 확인하는 핵심 순간에 빈 반원 차트와 ' / 300'만 보인다. 정당별 표결 칸도 비어 있다. 공포된 법안 거의 전부가 이 상태다.
- 근거: 운영 HTML https://lawdigest.kr/bill/PRC_Z2Y6K0Z4W2W7T1B7U5L9I4C7F6N8C3(공포·원안가결)의 텍스트가 '법안 처리 결과|원안가결| / |300|'이다. 상세 API 표본을 보면 공포 20건 중 20건, 정부이송 가결 10건 중 4건, 본회의 심의·원안가결 19건 중 19건이 vote_result_response.total_vote_count=null, party_vote_list=[]이다. 표결 데이터가 있는 가결 건은 49건 중 6건뿐이다. ProcessResult.tsx:65-83은 표결 데이터 유무와 관계없이 HalfDonutChart를 그린다. HalfDonutChart.tsx:62는 null/300을 계산하고, 153행은 null>=0을 true로 판정해 초록색을 칠한다. 355행 {approvalCount}는 빈 값이다.
- 수정안: ProcessResult에서 결과(bill_result)와 표결(vote) 표시를 분리한다. 가결 계열이면서 total_vote_count가 null이면 결과 배지와 '본회의 표결 기록 미수집' 상태만 보여 주고 차트는 그리지 않는다. 운영 DB에는 본회의 표결 결과(열린국회정보 표결 API)를 백필한다.
- 검증 메모: 운영 HTML /bill/PRC_Z2Y6K0Z4W2W7T1B7U5L9I4C7F6N8C3(공포·원안가결)의 텍스트가 '법안 처리 결과|원안가결| / |300|'이다. API vote_result_response는 approval_count=null, total_vote_count=null, party_vote_list=[]이다. stage=본회의 심의 표본 20건 중 19건이 원안가결인데 19건 모두 표결 데이터가 없다. stage=정부이송 20건 중 가결 13건에서 표결 데이터는 6건뿐이다. ProcessResult.tsx:65-83은 표결 데이터가 있는지 확인하지 않고 HalfDonutChart를 그린다. HalfDonutChart.tsx:62는 null/300을 계산하고, 152-153행에서 null>=0이 true여서 초록색이 칠해진다. 355행 {approvalCount}는 빈 값으로 렌더링된다.
- 파일: `services/web/app/bill/[id]/components/ProcessResult/ProcessResult.tsx`, `services/web/components/common/Chart/HalfDonutChart.tsx`, `services/web/app/bill/[id]/components/ProcessResult/VoteResultBoard.tsx`

### TRUST-03 처리 단계가 '체계자구 심사'·'정부이송'·'철회'인 법안의 현재 단계가 '위원회 심사'로 잘못 표시되고, 단계명에 오타가 있다

- 분류: blocker · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 법사위 체계자구 심사 중이거나 정부로 이송된 법안을 열면 '심사 진행 단계'가 STEP 02 위원회 심사에 멈춰 있다. 제품의 핵심 정보인 처리 단계가 틀리게 보인다. 단계 목록에도 '체계지구 심사'라는 틀린 용어가 노출된다.
- 근거: constants/bill.ts:23,39는 '체계지구 심사', :24,41은 '정부 이송'(띄어쓰기 포함)이다. 백엔드 BillStageType.java:16-17은 '체계자구 심사', '정부이송'이다. ProgressStage.tsx:7은 indexOf가 -1이면 stageNum=1로 떨어진다. 운영 HTML https://lawdigest.kr/bill/PRC_Z2W6T0T4W0R1G1T5Z2C9D2P4Q6G2I4(bill_stage='체계자구 심사')의 단계별 class는 접수=text-gray-2(지남), 위원회 심사=text-black(현재), 체계지구 심사 이하=text-gray-1(미도달)이다. API에는 stage='체계자구 심사'와 '정부이송' 법안이 실제로 존재한다(mainfeed?stage=... 응답 확인).
- 수정안: 단계 문자열을 백엔드 BillStageType 값과 한 곳에서 맞춘다. 예를 들어 백엔드가 stage_code(order)를 내려 주고 프런트는 코드로 매핑한다. 모르는 값을 '위원회 심사'로 대체하는 fallback을 없앤다. 철회·폐기는 별도 종료 상태로 표시한다. 단계명은 '체계자구 심사'로 고친다.
- 검증 메모: constants/bill.ts는 '체계지구 심사'(23·39행)와 '정부 이송'(24·41행)을 쓴다. BillStageType.java:16-17은 '체계자구 심사'와 '정부이송'이다. ProgressStage.tsx:7은 indexOf가 -1이면 단계를 1로 둔다. 운영 HTML /bill/PRC_Z2W6T0T4W0R1G1T5Z2C9D2P4Q6G2I4(API bill_stage='체계자구 심사')의 class를 확인했다. 접수는 text-gray-2, 위원회 심사는 text-black(현재 단계)이다. 'STEP 03 체계지구 심사' 이하는 text-gray-1이다. mainfeed에 stage=체계자구 심사와 stage=정부이송을 넣으면 해당 법안이 실제로 응답에 나온다.
- 파일: `services/web/constants/bill.ts`, `services/web/app/bill/[id]/components/ProgressStage/ProgressStage.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/global/constant/BillStageType.java`

### TRUST-04 21대 국회에서 이미 폐기된 법안 약 2.3만 건이 피드에서 '위원회 심사' 중인 것처럼 보인다

- 분류: major · data · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 피드를 내리거나 '위원회 심사' 필터를 고르면 2020~2024년에 임기만료로 폐기된 법안이 계류 중인 법안처럼 섞여 나온다. 공유 미리보기 설명도 '현재 위원회 심사 단계'라고 쓴다.
- 근거: mainfeed 전체 건수를 이분 탐색하면 40,772건이다. 22대 집계(/statistics/overview total_count)는 17,982건이다. page=17981(size=1)부터 2024-01 법안이 나온다. 상세 API로 확인하면 PRC_C2C4Y0H1I1F8O0N9M5L4H1E7D2L4U1(2024-01-23)은 bill_stage='위원회 심사', bill_result='임기만료폐기'이다. PRC_A2O0R0Q6X0H1D1A8I1O7E2J5U5T5D3(2020-06-01)은 '본회의 심의', '대안반영폐기'이다. 21대 구간 30건 표본에서 위원회 심사 21건, 본회의 심의 8건이었다. BillInfoDto.java에는 billResult 필드가 없어 카드가 결과를 알 수 없다. Bill.tsx:305-311 칩은 bill_stage만 표시한다. bill/[id]/page.tsx:21 메타 설명도 bill_stage만 쓴다.
- 수정안: BillInfoDto에 bill_result와 assembly_number를 추가한다. 카드 칩과 메타 설명은 결과가 있으면 결과(임기만료폐기·대안반영폐기·가결 등)를 우선 표시한다. 피드 기본값을 현재 대수(22대)로 한정하고, 이전 대수는 명시적 필터로 연다.
- 검증 메모: mainfeed?size=1의 page=40771은 마지막 페이지(last_page=true)이고 page=40772는 빈 목록이다. 따라서 피드 전체는 40,772건이다. page=17981은 PRC_C2C4Y0H1I1F8O0N9M5L4H1E7D2L4U1(2024-01-23, 위원회 심사)이다. 이 법안의 상세 API 값은 bill_result=임기만료폐기이다. PRC_A2O0R0Q6X0H1D1A8I1O7E2J5U5T5D3(2020-06-01)은 본회의 심의, 대안반영폐기이다. 피드 bill_info_dto의 키 목록에는 bill_result가 없다. Bill.tsx:305-311 칩은 bill_stage만 표시한다. bill/[id]/page.tsx:21 메타 설명은 '현재 ${bill_stage} 단계'라고 쓴다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/common/dto/BillInfoDto.java`, `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepositoryImpl.java`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/app/bill/[id]/page.tsx`

### TRUST-05 단계와 결과 데이터가 서로 맞지 않고 갱신이 멈춰 있다

- 분류: major · data · 백엔드 · 운영 데이터 작업 · 작업량 L · 검증 confirmed
- 사용자 영향: 4개월 전 발의된 법안이 아직 '접수'로 보인다. 이미 가결된 법안이 '본회의 심의' 중으로 보인다. 정부로 이송된 법안의 결과는 비어 있다. 같은 화면에서 단계와 결과가 서로 모순된다.
- 근거: 최근 500건 중 2026-06 발의 98건이 아직 '접수'이다(가장 오래된 접수 건은 2026-06-19). 통상 수일 안에 소관위에 회부된다. stage=본회의 심의 표본 20건 중 19건의 상세 bill_result가 '원안가결'이다. stage=정부이송 20건 중 10건은 bill_result=null이다. PRC_G2F6N0L3K3I1J1S6Q4P4O1J1K0Q1Z6은 stage='본회의 심의', result='철회'이다. 타임라인 plenary 표본의 공포 1건과 정부이송 3건도 result=null이다. StatisticsRepository.java:24-25는 billResult IS NULL을 '계류'로 세기 때문에 공포된 법안이 계류로 집계된다.
- 수정안: 수집 파이프라인에서 단계·결과 동기화 잡을 재가동한다. 결과가 확정되면 단계를 결과와 일관되게 맞추는 정합성 규칙(가결 → 정부이송 이상, 철회·폐기 → 종료)을 적재 시점에 적용한다. 정합성 위반 건수를 모니터링 지표로 둔다.
- 검증 메모: stage=본회의 심의 표본 20건의 상세 bill_result는 원안가결 19건, 철회 1건이다(PRC_G2F6N0L3K3I1J1S6Q4P4O1J1K0Q1Z6은 본회의 심의·철회). stage=정부이송 20건 중 10건은 bill_result=null이다. 최근 피드 200건 중 '접수'인 법안의 최고 발의일은 2026-06-19이다. 2026-06 발의 법안 중 31건이 아직 접수 상태다. 타임라인 plenary 항목 771건 중 공포 49건과 정부이송 23건도 bill_result=null이다. StatisticsRepository.java:25는 billResult IS NULL을 계류로 센다.
- 파일: `services/data`, `services/backend/src/main/java/com/everyones/lawmaking/repository/StatisticsRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/global/constant/BillStageType.java`

### TRUST-06 타임라인이 7개월 전(2026-03-27)에서 멈췄고, 날짜에 연도가 없으며, 본회의 항목마다 '투표 정보가 없습니다'가 나온다

- 분류: major · trust · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 타임라인 첫 항목 '3.27 금'만 보고는 올해 3월인지 알 수 없다. 피드(7월)보다도 3개월 이상 오래된 내용이 최신 타임라인으로 보인다. 본회의 카드 아래에는 빈 결과 카드가 반복된다. '접수' 구간은 한 번도 나오지 않는다.
- 근거: curl /v1/time-line/feed/paging?page=0..15&size=3 → 날짜 48개 중 최신 2026-03-27, 최古 2026-01-12이다. plenary 항목 771건 전부 total_vote_count=null, bill_result=null이다. submitted_list는 48일 전부 빈 배열이다. ListContainer.tsx:46-48은 convertDateFormat의 월·일·요일만 표시한다(utils/convertDateFormat.ts:12). PlenaryList.tsx:170-180은 항목마다 ProcessResult를 그려서 ProcessResult.tsx:86 '투표 정보가 없습니다.'가 출력된다. TimelineFacade.java:44-45는 날짜별 Redis 캐시가 있으면 그대로 반환하므로 오래된 캐시도 원인 후보이다(확인 필요).
- 수정안: 타임라인 소스 테이블(bill_timeline) 적재를 재가동하고 캐시 무효화 규칙을 둔다. 날짜 헤더에 연도를 넣고, 올해가 아니거나 기준일과 차이가 크면 연도를 강조한다. 본회의 항목은 표결 데이터가 있을 때만 결과 카드를 그린다. 빈 submitted_list는 데이터 원인을 확인한다.
- 검증 메모: /v1/time-line/feed/paging page=0~15(size=3)를 확인했다. 날짜는 48개이고 최신은 2026-03-27, 가장 오래된 날은 2026-01-12이다. submitted_list는 48일 모두 빈 배열이다. plenary 항목 771건은 전부 total_vote_count=null이다. bill_info.bill_result도 771건 모두 null이며, 단계는 본회의 심의 699건, 공포 49건, 정부이송 23건이다. ListContainer.tsx:45-48은 월·일·요일만 표시한다(convertDateFormat.ts는 연도를 반환하지 않는다). PlenaryList.tsx:174-182는 항목마다 ProcessResult를 그린다. 그 결과 default 분기의 '투표 정보가 없습니다.'가 출력된다.
- 파일: `services/web/app/timeline/components/ListContainer.tsx`, `services/web/app/timeline/components/PlenaryList.tsx`, `services/web/utils/convertDateFormat.ts`, `services/backend/src/main/java/com/everyones/lawmaking/facade/TimelineFacade.java`, `services/backend/src/main/java/com/everyones/lawmaking/service/RedisService.java`

### TRUST-07 요약 모델 표기 'Summarized by GPT-4o'가 실제 생성 모델과 다르다

- 분류: major · trust · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: AI 요약의 출처를 사실과 다르게 알려 준다. 출처 신뢰를 내세우는 제품에서 검증 가능한 거짓 표기가 된다.
- 근거: components/Bill/GPTSummary/GPTSummary.tsx:6-8은 'Summarized by' + gpt.png + 'GPT-4o'를 하드코딩한다. 운영 요약의 섹션 구조(쉬운 요약/주요 내용/왜 나왔나/무엇이 달라지나/누구에게 영향이 있나/봐야 할 점)는 services/ai/src/lawdigest_ai/processor/agentic_bill_report.py에서만 정의된다. 이 파일 25행 기본 모델은 'gpt-5.4-mini'이다. config.py:19는 gemini-3-flash-preview, :29는 gpt-5.4-mini, README.md:44도 gpt-5.4-mini라고 쓴다. 법안 레코드와 API에는 생성 모델 필드가 없다.
- 수정안: 요약 생성 시 모델·생성 시각을 bill 레코드에 저장한다(summary_model, summary_generated_at). API로 내려 실제 값을 표시한다. 그 전까지는 특정 모델명을 지우고 'AI 요약' 표식과 생성일만 표시한다.
- 검증 메모: GPTSummary.tsx:6-8은 'Summarized by'와 gpt.png, 'GPT-4o'를 하드코딩한다. 저장소의 요약 생성 경로는 모두 다른 모델을 기본값으로 쓴다. agentic_bill_report.py:25는 gpt-5.4-mini, config.py:19는 gemini-3-flash-preview, config.py:29는 gpt-5.4-mini, config.py:58-59와 AISummarizer.py:32-33은 gpt-4o-mini이다. 운영 요약의 섹션 헤딩('봐야 할 점' 등)은 agentic_bill_report.py에만 있다. 상세 API bill_info_dto에는 생성 모델 필드가 없다. 운영 환경변수로 덮어쓴 값은 확인하지 못했다. 그래도 어느 경로의 기본값도 'GPT-4o'가 아니다.
- 파일: `services/web/components/Bill/GPTSummary/GPTSummary.tsx`, `services/ai/src/lawdigest_ai/processor/agentic_bill_report.py`, `services/backend/src/main/java/com/everyones/lawmaking/common/dto/BillInfoDto.java`

### TRUST-08 피드·검색·의원·정당·분야 목록의 요약이 AI 생성물이라는 표시가 없다

- 분류: major · trust · 작업량 S · 검증 confirmed
- 사용자 영향: 대부분의 사용자는 목록에서 요약만 읽고 떠난다. 그 요약이 AI가 만든 해석이라는 사실과 원문 경로는 상세 페이지 맨 아래에서만 보인다. PRODUCT.md 원칙 4('AI 결과에는 출처·불확실성을 드러낸다')와 어긋난다.
- 근거: Bill.tsx:400-424는 detail일 때만 GPTSummary, 경고문, '원문 확인하기'를 렌더링한다. 피드 카드(detail=false)는 Bill.tsx:316-373에서 요약과 스크랩·조회수만 보여 준다. 같은 Bill 컴포넌트를 SearchResultClient.tsx:69, CategoryBills, congressman·party BillContainer, FollowingFeed가 공유한다. 운영 홈 HTML에도 '쉬운 요약|중앙선거관리위원회의...' 뒤에 AI 표식이 없다. 상세 경고문 'AI 기반의 요약은 내용이 불완전할 수 있습니다. 꼭 원문을 확인해주세요 !'(Bill.tsx:408)는 느낌표 앞에 공백이 있고, alert-red 강조로 오류처럼 보인다.
- 수정안: 카드의 요약 블록 머리에 작은 'AI 요약' 라벨(형태로 구분되는 칩)을 붙인다. 이 라벨이 상세의 생성 정보와 원문 링크로 이어지게 한다. 상세 경고문은 행동 중심의 짧은 문장으로 다듬고, 경고색 대신 보조 텍스트 위계로 낮춘다.
- 검증 메모: Bill.tsx:400-424는 detail일 때만 GPTSummary, 경고문, '원문 확인하기'를 렌더링한다. 피드 카드에는 AI 생성 표식이 없다. 408행 문구는 'AI 기반의 요약은 내용이 불완전할 수 있습니다. 꼭 원문을 확인해주세요 !'이고 text-theme-alert를 쓴다. 이 처리는 PRODUCT.md:43(AI 결과에는 출처·불확실성을 드러낸다)과 어긋난다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Bill/GPTSummary/GPTSummary.tsx`

### TRUST-09 같은 '가결' 지표가 화면마다 896·858·828로 다르고, '처리법안' 수치는 다른 뜻이다

- 분류: major · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 타임라인에서 가결 896건을 본 사용자가 탐색 통계에서 가결 828건을 본다. 어느 숫자도 믿기 어려워진다. 타임라인 '처리법안 17,481'은 접수 17,982건의 97%가 처리된 것처럼 읽히지만, 실제로는 위원회에 회부된 건수이다.
- 근거: /v1/time-line/bill-state → receipt_count 17982, treatment_count 17481, passed_count 896이다. /v1/statistics/overview → passed_count 828이다. /v1/statistics/stage → promulgated_count 858이다. BillRepository.java:156-157은 treatment를 stage IN(위원회 심사…공포), passed를 stage IN(정부이송, 공포)로 센다. StatisticsRepository.java:24는 passed를 billResult IN(원안가결, 수정가결)로 센다. 결과값 '수정가결 수정가결' 등 7건은 이 집계에서 빠진다. TimelineBoard.tsx:42 라벨은 '처리법안'이다.
- 수정안: '가결' 정의를 bill_result 기준 하나로 통일한다. 비정규 결과값을 정규화한 뒤 한 쿼리를 두 화면이 공유한다. '처리법안'은 실제 정의에 맞는 이름(예: 위원회 회부)으로 바꾸거나, 처리 완료(가결+폐기+철회) 건수로 다시 계산한다.
- 검증 메모: /time-line/bill-state는 receipt 17982, treatment 17481, passed 896이다. /statistics/overview는 passed 828이고, /statistics/stage는 promulgated 858이다. BillRepository.java:156-157은 단계(stage) 기준으로 센다. StatisticsRepository.java:24는 billResult IN(원안가결, 수정가결) 기준으로 센다. result-breakdown에는 '수정가결 수정가결' 3건, '수정가결 원안가결' 2건, '원안가결 수정가결' 1건, '원안가결 원안가결' 1건이 있다. 이 7건은 가결 집계에서 빠진다. TimelineBoard.tsx:42 라벨은 '처리법안'이다.
- 파일: `services/web/app/timeline/components/TimelineBoard.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/repository/StatisticsRepository.java`

### TRUST-10 최근 법안에 분야가 없어 분야 탐색에서 빠지고, 분야 건수가 탭마다 다르다

- 분류: major · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: '경제·세금'을 눌러도 6~7월 법안은 나오지 않는다. 분야 탭은 '관련 법안 6,331건', 바로 옆 통계 탭은 같은 분야를 2,406건으로 보여 준다.
- 근거: 최근 피드 500건(2026-06~07) 모두 category=null이다. /v1/bill/categories → economy 6331, 합계 35,492이다(22대 전체 17,982건보다 많다). /v1/statistics/by-category → economy 2406, 합계 13,231이다(22대 중 약 4,751건이 미분류). BillRepositoryImpl.java:59-67 countByCategory에는 assemblyNumber 조건이 없고, StatisticsRepository.java:49-55에는 있다. /bill/category 목록도 대수 구분 없이 21대 법안을 섞는다.
- 수정안: 분류 배치를 재가동하고 22대 미분류 건을 백필한다. /bill/categories와 /bill/category에 현재 대수 필터를 넣어 통계 탭과 같은 모집단을 쓴다. 미분류 비율은 운영 지표로 추적한다.
- 검증 메모: /bill/categories 합계는 35,492건(economy 6331)이다. /statistics/by-category 합계는 13,231건(economy 2406)이다. BillRepositoryImpl.java:59-67 countByCategory에는 eqReady와 category NOT NULL 조건만 있고 대수 조건이 없다. StatisticsRepository.java:49-56에는 assemblyNumber 조건이 있다. 최근 피드 200건은 모두 category=null이다. CategoryGrid.tsx:55는 '관련 법안 {count}건'을 표시한다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepositoryImpl.java`, `services/backend/src/main/java/com/everyones/lawmaking/repository/StatisticsRepository.java`, `services/web/app/explore/components/CategoryGrid.tsx`

### TRUST-11 정당 상세의 지도부·의석 정보가 오래되어 제품 안의 다른 데이터와 모순된다

- 분류: major · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 adjusted
- 사용자 영향: 국민의힘 당대표가 '한동훈'으로 나온다. 그런데 같은 서비스의 법안 카드에서는 한동훈 의원이 무소속이다. 더불어민주당 당대표는 '이재명'인데, 정부 발의 카드는 '이재명 정부'라고 쓴다. 의석수도 화면마다 다르다.
- 근거: /v1/party/detail?party_id=2 → party_leader '한동훈', parliamentary_leader '추경호'이다. 피드 표본 PRC_C2C6A0J6J1H8I0G9H0G7B1C3A3B0Z0의 대표발의자는 한동훈, party_name '무소속'(party_id 60)이다. party_id=1 → party_leader '이재명', parliamentary_leader '박찬대'이다. utils/governmentProposer.ts:1,35는 2025-06-03 이후를 '이재명 정부'로 표시한다. party_id=7 → party_leader '허은아'이다. 의석: party/detail total_congressman_count 300, /party/parliamentary 합계 298(민주당 170), /party/congressman?party_id=1 161명, /congressman/list 293명(민주당 156)이다. party/detail representative_bill_count 16,487은 대수 구분이 없는 누적치인데 라벨이 없다(PartyDetail.tsx:27-55).
- 수정안: 프런트의 PARTY_LEADER, PARTY_FLOOR_LEADER, PARTY_SECRETARY_GENERAL, PARTY_POLISY_COMMITTEE_CHAIRMAN 상수를 삭제한다. 화면은 API 필드를 렌더링한다. 그다음 API의 지도부 원천 데이터를 수집 대상으로 바꾸고 갱신일을 함께 내려 준다. 의석은 congressman 테이블 집계 하나로 통일한다.
- 검증 메모: 결함은 실재한다. 다만 근거가 틀렸다. 화면의 지도부 값은 API party_leader 필드가 아니다. 프런트 하드코딩 상수 constants/party/party.ts:40-89(PARTY_LEADER·PARTY_FLOOR_LEADER 등)에서 온다(PartyDetail.tsx:72-89). web 코드 어디에서도 API의 party_leader나 parliamentary_leader를 쓰지 않는다. 운영 /party/2 HTML은 당대표 한동훈, 원내대표 윤재욱, 사무총장 장동혁, 정책위의장 유의동을 보여 준다. 같은 정당의 API 값은 추경호와 서범수로, 화면과 다르다. 개혁신당 당대표는 상수에서 '이준석'이고 API에서는 '허은아'이다. 민주당 원내대표는 상수에서 '홍익표'이고 API에서는 '박찬대'이다. 대표발의자가 한동훈이고 party_name이 '무소속'인 법안(PRC_C2C6A0J6J1H8I0G9H0G7B1C3A3B0Z0)이 실제로 있다. 의석 수치도 서로 다르다. party/detail 민주당은 160+10=170석이고 total은 300이다. party/parliamentary도 170이다. party/congressman?party_id=1 목록은 161명이다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/service/PartyService.java`, `services/backend/src/main/java/com/everyones/lawmaking/common/dto/response/ParliamentaryPartyResponse.java`, `services/web/app/party/[id]/components/PartyDetail/PartyDetail.tsx`, `services/web/app/explore/components/SeatDistribution.tsx`

### TRUST-12 월별 추이 차트가 수집이 끊긴 달을 빼고 그려 입법 활동이 줄어든 것처럼 보인다

- 분류: major · data · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: '12개월' 차트가 2026-07에서 끝난다. 6·7월 가결 0건, 7월 발의 250건(9일치)이 실제 급감처럼 보인다. 8~10월은 0도 아니고 아예 없다. '전체'는 24개월이라 22대 국회 전체(29개월)를 보여 주지 않는다.
- 근거: /v1/statistics/trend?months=12 → 2025-08~2026-07(마지막 2026-07 count 250)이다. /v1/statistics/trend-detail?months=6 → 2026-06 passed_count 0, 2026-07 passed_count 0이다. StatisticsRepository.java findMonthlyTrend는 존재하는 월만 GROUP BY하고 LIMIT :months로 자른다. StatsTrendArea.tsx:19-21은 6개월/12개월/전체(24)이다.
- 수정안: 백엔드에서 기준월까지 달력 월을 0으로 채워 반환한다. 수집 미완료 월은 별도 상태(점선·회색)로 표시한다. '전체'는 22대 개원월(2024-05)부터 계산한다.
- 검증 메모: /statistics/trend?months=12는 2025-08~2026-07 구간이고 마지막 값은 2026-07 250건이다. trend-detail?months=6에서 2026-06과 2026-07의 passed_count는 0이다. StatisticsRepository.java:58-66과 78-87은 데이터가 있는 월만 GROUP BY한 뒤 LIMIT :months로 자른다. StatsTrendArea.tsx:18-22의 '전체'는 24개월이다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/StatisticsRepository.java`, `services/web/app/explore/components/StatsTrendArea.tsx`

### TRUST-13 AI 요약 5%에서 섹션이 두 번 반복된다

- 분류: major · data · 운영 데이터 작업 · 작업량 S · 검증 confirmed
- 사용자 영향: 상세 화면에서 '무엇이 달라지나', '누구에게 영향이 있나', '봐야 할 점'이 내용만 바뀐 채 두 번 나온다. 생성물이 검수되지 않았다는 인상을 준다.
- 근거: 최근 피드 500건의 gpt_summary에서 '## ' 헤딩 중복을 검사하면 25건(5%)이 중복이다. 예: PRC_X2X6U0S6R2Q2X1W4X4W2U1C5D3C9B3(별거배우자 주거공제, 2026-07-09)은 오프셋 906과 2578에 '## 무엇이 달라지나', 1980과 3595에 '## 누구에게 영향이 있나', 2270과 3868에 '## 봐야 할 점'이 있다. 같은 문제가 PRC_W2X6V0W6U1T6T1B0C2A0A5Z0X9Y9G7 등에도 있다.
- 수정안: agentic_bill_report 저장 직전에 섹션 스키마 검증(헤딩 순서·유일성)을 넣고, 실패하면 재생성한다. 운영 DB의 중복 건은 재생성하거나 앞 섹션만 남기는 정리 배치를 돌린다. 렌더러에서 중복 헤딩을 숨기는 국소 처리는 하지 않는다.
- 검증 메모: PRC_X2X6U0S6R2Q2X1W4X4W2U1C5D3C9B3의 gpt_summary 헤딩 오프셋을 확인했다. '무엇이 달라지나'는 906과 2578, '누구에게 영향이 있나'는 1980과 3595, '봐야 할 점'은 2270과 3868에 있다. 내 표본(최근 피드 200건)에서는 7건(3.5%)의 헤딩이 중복됐다. 보고서의 5%와 같은 규모다.
- 파일: `services/ai/src/lawdigest_ai/processor/agentic_bill_report.py`

### TRUST-14 모바일 검색 제안 문구가 질의응답을 약속하지만 무관한 법안을 돌려준다

- 분류: major · trust · 작업량 S · 검증 confirmed
- 사용자 영향: '최근 통과된 주요 법안은?'을 누르면 아직 '접수' 단계인 소득세법 개정안이 나온다. '이번 회기 국회 일정 알려줘'를 누르면 외국환거래법이 나온다. 제품이 제공하지 않는 기능을 제안해 첫 검색부터 신뢰를 잃는다.
- 근거: components/Layout/Nav/Nav.tsx:11-15 SEARCH_SUGGESTIONS 3개, 76행에서 /search/{query}로 이동한다. curl /v1/search/bill?search_word=최근 통과된 주요 법안은?&page=0 → 첫 결과 '별거배우자 주거공제 확대를 위한 소득세법…'(stage 접수)이다. '이번 회기 국회 일정 알려줘' → '외국환거래법 제도 정비를 위한…'이다. '의료법 개정안 진행 상황이 궁금해요' → '어업기반 세제지원 연장을 위한 지방세특례제한법…'이다.
- 수정안: 제안 문구를 실제로 정확한 결과가 나오는 키워드(예: 현재 많이 검색되는 법률명, 트렌딩 태그)로 바꾼다. 데이터에서 생성하고 결과가 0건이거나 무관하면 노출하지 않는다. 자연어 질의를 지원하려면 별도 기능으로 설계한다.
- 검증 메모: Nav.tsx:11-15에 제안 문구 3개가 하드코딩되어 있고, 76행에서 /search/{query}로 이동한다. 운영 HTML에도 3개 문구가 렌더링된다. 각 문구를 /v1/search/bill에 넣은 결과는 다음과 같다. '최근 통과된 주요 법안은?'의 첫 결과는 별거배우자 소득세법(접수)이다. '이번 회기 국회 일정 알려줘'는 외국환거래법(대안)이다. '의료법 개정안 진행 상황이 궁금해요'는 어업기반 지방세특례제한법(접수)이다.
- 파일: `services/web/components/Layout/Nav/Nav.tsx`

### TRUST-15 HOT 탭이 인기순이 아니라 발의일 역순으로 정렬되고, 2년 전 스크랩 1건짜리 법안이 'HOT'에 오른다

- 분류: major · bug · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: HOT을 누르면 순위 의미가 없는 목록이 나온다. 2024년 법안과 스크랩 0~1건 법안이 섞여 '인기' 표시를 믿을 수 없다.
- 근거: curl /v1/bill/popular → 10건의 propose_date가 2026-07-09, 2025-12-04, 2025-12-04, 2025-11-25, 2025-08-14, 2025-02-21 … 2024-09-30으로 엄격한 내림차순이다. bill_like_count는 0~1이다. RedisService.getPopularBills는 점수로 상위 10개 ID를 뽑는다. 그 뒤 BillRepository.java:106-114 findFeedBillInfoByIdList가 'ORDER BY b.proposeDate desc'로 다시 정렬해 점수 순서가 사라진다.
- 수정안: ID 목록의 점수 순서를 보존해 응답한다(IN 조회 후 애플리케이션에서 재정렬). 집계 기간(예: 최근 7일)과 최소 임계치를 두고, 기준을 레이아웃(순위 번호)으로 드러낸다.
- 검증 메모: /bill/popular 10건의 propose_date는 2026-07-09부터 2024-09-30까지 엄격한 내림차순이다. bill_like_count는 0~1이다. RedisService.getPopularBills(35-56행)는 좋아요에 8점, 조회에 2점을 주고 점수순 상위 10개 ID를 고른다. 이 ID 목록은 BillFacade.getPopularBills를 거쳐 BillService.getFeedBillListResponse로 간다. 거기서 BillRepository.java:106-115 findFeedBillInfoByIdList가 'ORDER BY b.proposeDate desc'로 다시 정렬한다. 이 단계에서 점수 순서가 사라진다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/repository/BillRepository.java`, `services/backend/src/main/java/com/everyones/lawmaking/service/BillService.java`, `services/backend/src/main/java/com/everyones/lawmaking/service/RedisService.java`

### TRUST-16 없는 법안 링크가 HTTP 200 '페이지가 작동하지 않습니다' 오류 화면으로 열리고, 공개 API는 잘못된 입력에 500을 낸다

- 분류: major · bug · 백엔드 · 작업량 S · 검증 confirmed
- 사용자 영향: 오래된 공유 링크나 오타 URL을 열면 '서비스 고장' 화면이 나온다. 검색엔진에는 정상 페이지(200)로 잡힌다. 정당이 없을 때는 '해당 파티를 찾을 수 없습니다'라는 번역투 문구가 내려간다.
- 근거: curl /v1/bill/detail/NOPE_123 → 500 '서버 내부 오류입니다.'이다. /v1/congressman/detail?congressman_id=NOPE → 500이다. /v1/bill/mainfeed?page=-1 → 500이다. /v1/search/bill?search_word=&page=0 → 500이다. /v1/party/detail?party_id=99999 → 404 '해당 파티를 찾을 수 없습니다.'이다. curl https://lawdigest.kr/bill/NOPE_123 → HTTP 200, <title> 없음, error.tsx 500 화면이다. bill/[id]/page.tsx:13-34는 notFound()를 호출하지 않는다.
- 수정안: 백엔드는 존재하지 않는 리소스에 404, 잘못된 파라미터에 400을 일관되게 반환한다. 메시지는 '정당'처럼 제품 용어로 쓴다. 상세 페이지(bill·congressman·party)는 404를 받으면 notFound()로 not-found.tsx를 렌더링한다.
- 검증 메모: curl 응답은 다음과 같다. /v1/bill/detail/NOPE_123, /congressman/detail?congressman_id=NOPE, /bill/mainfeed?page=-1, /search/bill?search_word=&page=0은 모두 500 '서버 내부 오류입니다.'이다. /party/detail?party_id=99999는 404 '해당 파티를 찾을 수 없습니다.'이다(ErrorCode.java:34). https://lawdigest.kr/bill/NOPE_123은 HTTP 200이고 <title>이 없다. RSC 페이로드에는 오류 digest가 있어 클라이언트 error.tsx('페이지가 작동하지 않습니다.')로 넘어간다. app 전체에서 notFound() 호출은 0건이다.
- 파일: `services/web/app/bill/[id]/page.tsx`, `services/web/app/congressman/[id]/page.tsx`, `services/web/app/party/[id]/page.tsx`, `services/backend/src/main/java/com/everyones/lawmaking/controller/BillController.java`

### TRUST-20 AI 요약의 하이라이트와 헤딩 강조색이 대표발의자 정당색으로 칠해진다

- 분류: major · visual · 작업량 S · 검증 adjusted
- 사용자 영향: 같은 요약 문장이 민주당 법안이면 파랑, 국민의힘 법안이면 빨강으로 강조된다. 정보가 아니라 정치색이 먼저 보여 중립성 신뢰를 해친다.
- 근거: renderBillSummaryMarkdown.ts:29-43은 PARTY_ACCENT_COLORS를 별도로 정의한다. 이는 정당색 기준 원본(constants/party/party.ts:92 PARTY_COLOR)과 중복된다. Bill.tsx:103-110은 --lawdigest-summary-accent에 정당색을 넣는다. styles/globals.css:125-179는 mark·헤딩 배경을 이 변수로 칠한다. DESIGN.md 'The Party Color Is Data Rule'은 감정적 강조에 정당색을 쓰지 말라고 정한다. 스크린샷(상세·피드)에서 '쉬운 요약' 밑줄이 정당색이다.
- 수정안: 요약 강조는 중립 토큰(primary-soft-blue 등) 하나로 통일한다. 정당색은 발의자 카드의 avatar ring·로고에만 남긴다. PARTY_ACCENT_COLORS를 삭제한다.
- 검증 메모: renderBillSummaryMarkdown.ts:29-41은 PARTY_ACCENT_COLORS를 별도로 정의한다. Bill.tsx:103-110은 이 값을 --lawdigest-summary-accent에 넣는다. globals.css:125-179는 mark·헤딩 배경을 이 변수로 칠한다. 이 방식은 DESIGN.md:165(정당색은 감정적 강조에 쓰지 않는다)와 DESIGN.md:167(정치 정보 강조에 쓰지 않는다)을 어긴다. PRODUCT.md:36은 '중립성을 눈에 보이게 만든다'를 원칙 2로 둔다. 요약 강조색이 발의 정당에 따라 바뀌는 것은 핵심 원칙 위반이다. 그래서 minor가 아니라 major로 본다.
- 파일: `services/web/components/Bill/BillList/Bill/renderBillSummaryMarkdown.ts`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/styles/globals.css`

### TRUST-17 처리 결과 영역이 표결 전 법안과 비정규 결과값을 구분하지 못한다

- 분류: minor · copy · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 아직 위원회에 있는 법안에도 '투표 정보가 없습니다.'가 떠서 누락처럼 보인다. 결과가 '수정가결 수정가결'인 법안은 가결인데도 같은 문구가 나온다. 대안반영폐기 법안은 어느 대안에 반영됐는지 따라갈 수 없다.
- 근거: ProcessResult.tsx:84-89는 default에서 '투표 정보가 없습니다.'를 출력한다. /v1/statistics/result-breakdown에는 '수정가결 수정가결' 3, '수정가결 원안가결' 2, '원안가결 수정가결' 1, '원안가결 원안가결' 1, '폐기' 2가 있다. 모두 switch(26-83행) 밖이라 default로 간다. StatsResultComposition.tsx:14-21 색상표에도 이 값들이 없어 범례에 원시값이 노출된다. ProcessResult.tsx:36 대안반영폐기 문구에는 대안 법안 링크가 없다.
- 수정안: 적재 시 bill_result를 정규 집합으로 정규화한다. 결과가 null이면 현재 단계 기준 상태(예: 본회의 표결 전)를 보여 준다. 대안반영폐기는 반영된 대안 법안 ID를 API로 내려 링크한다.
- 검증 메모: ProcessResult.tsx:84-89 default 분기는 '투표 정보가 없습니다.'를 출력한다. result-breakdown에 있는 비정규 결과값 4종('수정가결 수정가결' 등)과 '폐기'는 switch(26-83행) 밖이다. 36행 대안반영폐기 문구에는 대안 법안 링크가 없다. 정정할 점이 하나 있다. StatsResultComposition.tsx:14-23 RESULT_COLORS에는 '폐기'가 있다. 색상표에 없는 값은 비정규 결과값 4종뿐이다. 이 4종은 EXTRA_PALETTE 색과 원시 문자열 라벨로 범례에 노출된다.
- 파일: `services/web/app/bill/[id]/components/ProcessResult/ProcessResult.tsx`, `services/web/app/explore/components/StatsResultComposition.tsx`

### TRUST-18 표결 차트가 분모를 300으로 고정하고 실제 투표수를 보여 주지 않는다

- 분류: minor · data · 백엔드 · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 투표 220표 중 찬성 205표인 법안이 '205 / 300'으로 보여 찬성률이 68%처럼 읽힌다. 반대·기권도 나오지 않는다.
- 근거: HalfDonutChart.tsx:59 MAX_COUNT=300 고정, :355-356 '{approvalCount} / {MAX_COUNT}'이다. total_vote_count는 152행 임계선 계산에만 쓰인다. 표본 PRC_M2K5K0J3H0I4Q0Q9P0P1N1M5N3U8V4는 approval_count 205, total_vote_count 220이다. 재적은 /party/parliamentary 합계 298이다.
- 수정안: 찬성/반대/기권/재적을 API로 받아 분모를 투표수 또는 재적 중 하나로 명시한다. 반대·기권을 함께 표시한다.
- 검증 메모: HalfDonutChart.tsx:59는 MAX_COUNT=300으로 고정한다. 355-356행은 '{approvalCount} / {MAX_COUNT}'를 출력한다. total_vote_count는 152행 임계선 계산에만 쓰인다. PRC_M2K5K0J3H0I4Q0Q9P0P1N1M5N3U8V4의 API 값은 approval_count 205, total_vote_count 220이다. API는 반대·기권 값을 내려 주지 않는다.
- 파일: `services/web/components/common/Chart/HalfDonutChart.tsx`, `services/web/app/bill/[id]/components/ProcessResult/VoteResultBoard.tsx`

### TRUST-19 AI 제목이 법안명을 그대로 포함해 카드에서 같은 문구가 두 번 나오고, 대안 법안끼리는 구별되지 않는다

- 분류: minor · copy · 운영 데이터 작업 · 작업량 M · 검증 confirmed
- 사용자 영향: 카드 제목 바로 아래에 같은 법안명이 다시 나온다. 일부 제목은 같은 구절이 두 번 들어간다. '다른 개정안 보기'에는 똑같은 제목 3개가 날짜 없이 나열된다.
- 근거: 최근 500건 모두 title이 bill_name으로 끝난다(500/500). Bill.tsx:298-300은 title과 bill_name을 연속 표시한다. 예: '서울대병원 집단학살 사건 진상규명과 명예회복을 위한 서울대병원 집단학살 사건 진상규명 및 희생자 명예회복에 관한 특별법안', '참정권 침해 진상규명을 위한 제9회 전국동시지방선거 … 국민참정권 침해 진상규명을 위한 특별검사…'. 상세 PRC_Z2W6T0T4W0R1G1T5Z2C9D2P4Q6G2I4의 similar_bills 3건은 billTitle이 모두 '대기환경보전법 제도 정비를 위한 대기환경보전법 일부개정법률안(대안)'이다. AnotherBillList.tsx:17-19는 날짜 없이 렌더링한다.
- 수정안: 제목 생성 프롬프트를 '목적 구절'만 생성하도록 바꾸고, 화면에서 목적 구절과 법안명을 위계로 분리한다. 목적 구절과 법안명이 겹치면 생성을 거부한다. 유사 법안 목록에 발의일과 처리 결과를 넣는다.
- 검증 메모: 최근 피드 200건은 모두 title이 bill_name으로 끝난다. Bill.tsx:298-300은 title과 bill_name을 연속으로 표시한다. PRC_Z2W6T0T4W0R1G1T5Z2C9D2P4Q6G2I4의 similar_bills 3건은 billTitle이 모두 '대기환경보전법 제도 정비를 위한 대기환경보전법 일부개정법률안(대안)'이고 단계도 모두 공포이다. similar_bills 응답에는 발의일 필드가 없다. AnotherBillList.tsx:17-19는 단계와 발의자만 렌더링한다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/app/bill/[id]/components/AnotherBill/AnotherBill.tsx`, `services/ai/src/lawdigest_ai/processor/agentic_bill_report.py`

### TRUST-21 타임라인 D-day가 하루 틀리고 무엇까지의 D-day인지 없다

- 분류: minor · data · 작업량 S · 검증 confirmed
- 사용자 영향: 'D-526'이 무엇을 세는지 알 수 없다. 총선까지라면 날짜도 하루 틀리다.
- 근거: TimelineBoard.tsx:31 getDDay('2028-04-11')이다. 공직선거법 제34조 기준 선거일은 임기만료일(2028-05-29) 전 50일(2028-04-09) 이후 첫 수요일인 2028-04-12이다(2028-04-11은 화요일). 공개 일정 안내(foxcg.com/2028-general-election)도 2028-04-12로 정리한다.
- 수정안: 선거일 상수를 2028-04-12로 고치고 근거를 주석에 남긴다. 숫자 옆에 대상(제23대 총선)을 고유명사로 표시한다.
- 검증 메모: TimelineBoard.tsx:31은 getDDay('2028-04-11')을 쓴다. 22대 임기만료일은 2028-05-29이다. 그 50일 전은 2028-04-09(일)이고, 이후 첫 수요일은 2028-04-12이다. 2028-04-11은 화요일이다. 위키백과(https://ko.wikipedia.org/wiki/대한민국_제23대_국회의원_선거)와 VoteForKorea(https://voteforkorea.com/guides/election-calendar/)도 선거일을 2028-04-12로 정리한다. 화면에는 D-day 대상이 표시되지 않는다.
- 파일: `services/web/app/timeline/components/TimelineBoard.tsx`

### TRUST-22 피드 단계 필터에 '체계자구 심사'와 '정부이송'이 없다

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 6개 처리 단계 중 2개를 필터로 고를 수 없다. 법사위에 묶인 법안이나 이송된 법안만 모아 볼 수 없다.
- 근거: constants/bill.ts:14-19 STAGE_TAB_KO는 접수, 위원회 심사, 본회의 심의, 공포뿐이다. StageDropdown.tsx:35가 이 목록만 쓴다. API는 stage=체계자구 심사, stage=정부이송 필터에 정상 응답한다(curl 확인).
- 수정안: TRUST-03에서 정한 단일 단계 정의로 드롭다운 항목을 생성한다.
- 검증 메모: StageDropdown.tsx:17은 siteConfig.stageTabs를 쓰고, 35행은 STAGE_TAB_KO를 쓴다. config/site.ts:41-46 stageTabs에는 접수, 위원회 심사, 본회의 심의, 공포만 있다. API에 stage=체계자구 심사와 stage=정부이송을 넣으면 정상 응답한다.
- 파일: `services/web/constants/bill.ts`, `services/web/components/Feed/StageDropdown/StageDropdown.tsx`

### TRUST-23 의원 상세에 빈 홈페이지 버튼, 디코딩되지 않은 HTML 엔티티, '후보약력' 라벨이 노출된다

- 분류: minor · data · 운영 데이터 작업 · 작업량 S · 검증 adjusted
- 사용자 영향: 홈페이지가 없는 의원에서도 '홈페이지 방문' 버튼이 눌리지만 아무 데도 가지 않는다. 약력에 '&lsquo;', '&bull;' 같은 문자가 그대로 보인다. 현직 의원 약력이 '후보약력'으로 불린다.
- 근거: 의원 상세 59명 표본에서 homepage=null이 17명이다. CongressmanDetail.tsx:120-130은 조건 없이 버튼을 렌더링한다. 같은 표본 brief_history의 미처리 엔티티는 &lsquo; 2, &bull; 2, &rsquo; 1, &sim; 1, &shy; 1, &amp; 1이다. 116행은 &middot;, &nbsp;, &#39;만 치환한다. 112행 title='후보약력'이다. commits는 '제9회전국동시지방선거투표용지부족사태등…' 원문 그대로 56행에 출력된다.
- 수정안: homepage가 없으면 버튼을 렌더링하지 않는다. 엔티티는 적재 단계에서 표준 HTML 디코더로 정리한다. '후보약력'은 숨겨진 title을 '약력'으로 고치는 문제가 아니다. 아코디언 트리거에 '약력' 같은 접근 가능한 이름을 보이게 둔다.
- 검증 메모: 홈페이지와 엔티티 결함은 재현된다. 의원 상세 40명 표본에서 homepage가 비어 있는 의원은 6명이다. CongressmanDetail.tsx:120-130은 조건 없이 '홈페이지 방문' 버튼을 렌더링한다. 같은 표본의 brief_history에는 &lsquo; 2, &rsquo; 1, &amp; 1이 디코딩되지 않은 채 남아 있다. 116행은 &middot;, &nbsp;, &#39;만 치환한다. 반면 '후보약력 라벨 노출'은 재현되지 않는다. 112행 title='후보약력'은 classNames.titleWrapper=['hidden']으로 화면에서 숨겨진다. 오히려 아코디언 트리거에 보이는 이름이 없다는 접근성 문제가 있다.
- 파일: `services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`

### TRUST-24 피드의 '리포트' 탭과 '법안' 탭이 같은 목록을 보여 준다

- 분류: minor · ux · 작업량 S · 검증 confirmed
- 사용자 영향: 탭을 바꿔도 내용이 같다. 사용자는 '리포트'가 다른 종류의 분석물이라고 기대하지만, 차이가 없어 기능이 미완성으로 보인다.
- 근거: components/Feed/Feed/Feed.tsx:131-146(report)과 149-164(bill)는 같은 FeedTab, StageDropdown, BillList(bills)를 렌더링한다.
- 수정안: 두 탭의 콘텐츠 정의를 정한다. 정의가 없으면 한 탭으로 합친다.
- 검증 메모: Feed.tsx:131-146(report)와 149-164(bill)는 같은 FeedTab, StageDropdown, BillList를 렌더링한다. 두 탭에 같은 bills와 popularBills가 들어간다. 데이터 조회(useGetBillByStage, useGetBillPopular)는 contentType에 따라 바뀌지 않는다.
- 파일: `services/web/components/Feed/Feed/Feed.tsx`

### TRUST-25 원문 출처가 상세 하단 버튼 하나뿐이고 출처 기관 이름이 없다(서버 측 링크 검증 불가)

- 분류: polish · trust · 작업량 S · 검증 confirmed
- 사용자 영향: 요약이 어느 기관의 원문에 근거하는지 이름으로 드러나지 않는다. 링크가 같은 탭에서 열려 서비스를 벗어난다.
- 근거: Bill.tsx:411은 next/link로 https://likms.assembly.go.kr/bill/billDetail.do?billId={bill_id}를 열고 target이 없다. 버튼 라벨은 '원문 확인하기'뿐이다. curl은 이 URL에 HTTP 400(12바이트)을 받았다. 서버 측 차단으로 보이며 실제 브라우저에서 열리는지는 확인하지 못했다(브라우저 확인 필요).
- 수정안: 하드코딩한 URL 대신 API bill_link를 쓴다. bill_link가 null이면 버튼을 숨기거나 의안정보시스템 검색 경로로 대체한다. 링크 텍스트에 출처 기관명을 넣고 새 탭으로 연다.
- 검증 메모: Bill.tsx:411은 next/link에 target 없이 https://likms.assembly.go.kr/bill/billDetail.do?billId={bill_id}를 하드코딩한다. 버튼 라벨은 '원문 확인하기'뿐이다. 상세 API에는 이미 bill_link 필드가 있다. 22대 법안은 이 필드에 같은 URL을 담는다. 21대 PRC_C2C4Y0H1I1F8O0N9M5L4H1E7D2L4U1은 bill_link=null이다. 링크가 실제 브라우저에서 열리는지는 확인하지 못했다. 기본 curl은 400을 받았고, 브라우저 UA로는 302를 받았다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`

### TRUST-26 발의자 'N인' 표기와 명단 수가 어긋나는 법안이 있다

- 분류: polish · data · 운영 데이터 작업 · 작업량 S · 검증 adjusted
- 사용자 영향: '한병도 의원 등 161인'을 눌렀는데 명단은 160명이다.
- 근거: 최근 500건 중 1건 불일치. PRC_D2Y6D0B7S0C9Q1T7E0V6J5U7I6P1X5의 proposers '한병도의원 등 161인', public_proposer_dto_list 160명이다. Bill.tsx:240은 'N인'을 명단 길이로 계산한다. 나머지 499건은 일치한다.
- 수정안: 수집 단계에서 공동발의자 매칭 실패 건을 로그로 남기고 재매칭한다. 화면의 발의자 수는 모든 컴포넌트가 같은 원천(공식 proposers 수 또는 명단 길이 중 하나)을 쓰도록 통일한다.
- 검증 메모: 데이터 불일치는 실재한다. PRC_D2Y6D0B7S0C9Q1T7E0V6J5U7I6P1X5의 proposers는 '한병도의원 등 161인'인데 public_proposer_dto_list는 160명이다. 그러나 보고된 사용자 영향('161인'을 눌렀는데 명단은 160명)은 재현되지 않는다. Bill.tsx:240은 명단 길이로 '등 160인'을 표시하므로 카드 숫자와 명단이 일치한다. 실제 노출 문제는 다른 화면과의 차이다. 카드는 공식 숫자보다 1명 적은 '160인'을 보여 준다. 원시 문자열 bill_proposers를 그대로 쓰는 화면은 '161인'을 보여 준다. 이런 화면은 타임라인 PlenaryList.tsx:108·155와 PromulgationList.tsx:90·132, AnotherBill.tsx:48이다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`

## 접근성·문구·시각 (A11Y)

### A11Y-01 법안 요약 본문 전체가 role=button + aria-label로 감싸져 스크린리더가 요약 내용을 읽지 못함

- 분류: blocker · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 스크린리더 사용자는 피드와 법안 상세의 핵심 콘텐츠인 쉬운 요약·주요 내용을 듣지 못하고 '법안 요약 더 보기, 버튼'만 듣는다. button 역할의 자식은 presentational로 처리되므로 요약 안의 h2/h3/목록 구조도 사라진다. 상세 화면은 토글이 필요 없는데도 같은 역할이 붙는다.
- 근거: components/Bill/BillList/Bill/SafeBillSummaryHtml.tsx:210-217 (<div role="button" tabIndex={0} aria-label={ariaLabel}>{renderedMarkdown}</div>), components/Bill/BillList/Bill/Bill.tsx:320-327 (detail에서도 ariaLabel='법안 요약 더 보기' 전달), 내부 용어 툴팁 <button> SafeBillSummaryHtml.tsx:192-205 → 중첩 인터랙티브
- 수정안: 요약 래퍼에서 role/tabIndex/aria-label/onClick을 제거하고 일반 콘텐츠 영역(<div> 또는 <article>)으로 둔다. 접기·펼치기는 Bill.tsx:328의 '더 보기' 컨트롤 하나만 <button aria-expanded aria-controls>로 담당하게 한다. detail=true에서는 토글 컨트롤을 렌더하지 않는다.
- 검증 메모: SafeBillSummaryHtml.tsx:210-217에서 요약 전체를 role="button" tabIndex=0 aria-label 래퍼로 렌더한다. Bill.tsx:320-327은 detail 여부와 관계없이 ariaLabel='법안 요약 더 보기'를 넘긴다. 운영 /bill/PRC_X2X6U0S6R2Q2X1W4X4W2U1C5D3C9B3 HTML에 role="button" tabindex="0" aria-label="법안 요약 더 보기"가 있다. 래퍼 안에는 용어 툴팁 <button>(:192-205)이 들어 있어 인터랙티브 요소가 중첩된다.
- 파일: `services/web/components/Bill/BillList/Bill/SafeBillSummaryHtml.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### A11Y-02 다크 모드에서 피드 콘텐츠 탭(리포트·법안·팔로잉) 글자가 배경과 같은 색이 되어 사라짐

- 분류: blocker · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 다크 모드 사용자는 첫 화면의 콘텐츠 탭 라벨을 읽을 수 없다. 활성 탭 글자 #191919가 다크 배경 #101012 위에 놓인다. 리포트 아이콘의 체크 표시는 stroke="white" 고정이라 다크에서 반전도 맞지 않는다.
- 근거: services/web/styles/globals.css:355-385 (.feed-content-tab color rgba(25,25,25,.4), .is-active color #191919, .dark 규칙 0건 — grep 'feed-content-tab' 결과 globals.css만), WCAG 상대휘도 계산 #191919/#101012 = 1.08:1, components/Feed/Feed/Feed.tsx:31 stroke="white"
- 수정안: 탭 색을 CSS 변수로 바꾸고 .dark 아래에서 활성 #EBEBEB(gray-0.5)·비활성 #999 이상으로 재정의한다. 체크 stroke는 배경색 토큰(currentColor의 반전 변수)으로 바꾼다. 같은 탭을 HeroUI Tabs 또는 tailwind 클래스로 옮기면 dark: 변형을 한 기준으로 관리할 수 있다.
- 검증 메모: globals.css:355-381의 .feed-content-tab은 color rgba(25,25,25,.4)이고 .is-active는 #191919이다. .dark 재정의는 globals.css에 .lawdigest-summary-*와 tooltip-layer만 있고 feed-content-tab 규칙은 없다. Feed.tsx 탭 아이콘도 stroke=currentColor라서 라벨과 아이콘이 함께 다크 배경(#101012)에 묻힌다.
- 파일: `services/web/styles/globals.css`, `services/web/components/Feed/Feed/Feed.tsx`

### A11Y-03 법안 진행 단계 이름 '체계지구 심사' 오기 (정식 용어: 체계·자구 심사)

- 분류: major · copy · 작업량 S · 검증 adjusted
- 사용자 영향: 모든 법안 상세의 '심사 진행 단계'에 틀린 법률 용어가 노출된다. 입법 정보 서비스의 신뢰를 직접 해친다.
- 근거: services/web/constants/bill.ts:23 districtJudge: '체계지구 심사', :39 동일; app/bill/[id]/components/ProgressStage/ProgressStage.tsx:6-27에서 PROGRESS_STAGE_KO 전체를 렌더
- 수정안: 표시 문구를 '체계·자구 심사'로 고치는 것만으로는 부족하다. 단계 판정은 API의 bill_stage 값('체계자구 심사', '정부이송')이나 단계 코드에 매핑하고, 표시 라벨은 별도 맵에서 가져온다. ProgressStage는 찾지 못한 값을 1로 대체하지 말고 철회 등 예외 단계를 따로 처리한다. 매핑 테스트를 추가한다.
- 검증 메모: constants/bill.ts:23·39에 '체계지구 심사'가 있다. 근본 원인은 오기만이 아니다. 백엔드 BillStageType.java는 '체계자구 심사'와 '정부이송'을 내려준다. 프런트는 '체계지구 심사'와 '정부 이송'을 쓰므로 ProgressStage.tsx:7의 indexOf가 -1이 되고 단계가 1(위원회 심사)로 떨어진다. 운영 API mainfeed?stage=체계자구 심사에서 PRC_Z2W6T0T4W0R1G1T5Z2C9D2P4Q6G2I4를 얻었다. 이 법안의 상세 RSC payload를 보면 '위원회 심사'가 현재 단계(text-black)로, '체계지구 심사'가 미도달 단계(text-gray-1)로 렌더된다. 정부이송·철회 단계 법안도 같은 오류를 겪는다.
- 파일: `services/web/constants/bill.ts`

### A11Y-05 모바일 검색이 자연어 질문을 받는 것처럼 안내하지만 실제로는 키워드 검색이라 무관한 결과를 보여줌

- 분류: major · trust · 작업량 S · 검증 confirmed
- 사용자 영향: 모바일 사용자가 추천 질문을 누르면 질문과 관계없는 법안 목록이 나온다. '의료법 개정안 진행 상황이 궁금해요'를 눌러도 지방세특례제한법·항공안전법이 나온다. 추천 질문 세 개가 반말('알려줘')과 존댓말('궁금해요')을 섞는다. 데스크톱 placeholder('법안, 의원, 정당명으로 검색')와도 다르다.
- 근거: services/web/components/Layout/Nav/Nav.tsx:11-15 SEARCH_SUGGESTIONS, :322 placeholder '궁금한 입법 현황을 질문해 보세요'; components/common/SearchBar/SearchBar.tsx:71 placeholder '법안, 의원, 정당명으로 검색'; curl https://api.lawdigest.kr/v1/search/bill?search_word=의료법 개정안 진행 상황이 궁금해요 → ['어업기반 세제지원 연장을 위한 지방세특례제한법 일부개정', '국가기관 항공기 자체 정비 허용을 위한 항공안전법 일부'], '이번 회기 국회 일정 알려줘' → 외국환거래법·가사소송법
- 수정안: 검색 기능이 지원하는 형태에 맞춰 추천을 실제 검색어(TrendingKeywords API의 상위 키워드 등)로 바꾸고 placeholder를 데스크톱과 한 문구로 통일한다. 자연어 질의 응답을 제공하려면 별도 기능으로 구현한 뒤 안내한다.
- 검증 메모: Nav.tsx:11-15 SEARCH_SUGGESTIONS와 placeholder '궁금한 입법 현황을 질문해 보세요'를 확인했다. handleSearchSubmit은 /search/{query}로 이동한다. 운영 API /v1/search/bill?search_word=의료법 개정안 진행 상황이 궁금해요 응답의 첫 결과는 지방세특례제한법 일부개정법률안이다. '이번 회기 국회 일정 알려줘'의 첫 결과는 외국환거래법 일부개정법률안(대안)이다. SearchBar.tsx:71 placeholder는 '법안, 의원, 정당명으로 검색'이다.
- 파일: `services/web/components/Layout/Nav/Nav.tsx`, `services/web/components/common/SearchBar/SearchBar.tsx`

### A11Y-06 Material Symbols 아이콘이 리가처 텍스트로 DOM에 남아 스크린리더가 'tag', 'account_balance'를 읽고, 폰트 로딩 전에는 화면에도 영문 단어가 보임

- 분류: major · a11y · 작업량 M · 검증 confirmed
- 사용자 영향: 스크린리더는 탐색 사이드바 버튼을 'tag 분야', 'account_balance 국회', 'monitoring 통계'로 읽는다. display=block 폰트가 늦게 오면 최대 3초간 빈 칸이 생기거나 영문 단어가 노출된다. 외부 폰트(가변 축 전체) 요청이 첫 로딩을 무겁게 한다.
- 근거: curl https://lawdigest.kr/explore → '<span class="material-symbols-outlined text-[22px]">tag</span>', 'account_balance', 'monitoring' 텍스트, 페이지 텍스트 '|탐색|tag|분야|account_balance|국회|monitoring|통계|'; app/layout.tsx:69-72 (Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block); aria-hidden 없는 사용처: app/explore/components/ExploreSidebar.tsx:31, StatsPanel.tsx:17, TrendingKeywords.tsx:19, MemberRanking.tsx:22, CategoryGrid.tsx:51, FieldPanel.tsx:24, StatsCard.tsx:32, StatsOverview.tsx:114, PartyList.tsx:54, SeatDistribution.tsx:195
- 수정안: 프로젝트가 이미 쓰는 SVG 아이콘 컴포넌트(public/svgs) 방식으로 통일하고 장식 아이콘에는 aria-hidden="true"를 기본으로 붙이는 Icon 래퍼를 만든다. 웹폰트를 유지하면 필요한 아이콘만 icon_names 파라미터로 subset하고 display=block을 swap이 아닌 사전 로드(preload)로 바꾼다.
- 검증 메모: curl /explore HTML에 <span class="material-symbols-outlined text-[22px]">tag</span>, account_balance, monitoring이 있다. app/layout.tsx:69-72는 전체 가변축과 display=block으로 폰트를 요청한다. app·components 안의 material-symbols 사용처 10곳 중 aria-hidden이 붙은 곳은 0곳이다.
- 파일: `services/web/app/layout.tsx`, `services/web/app/explore/components/ExploreSidebar.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`, `services/web/app/explore/components/StatsCard.tsx`, `services/web/app/explore/components/StatsOverview.tsx`, `services/web/app/explore/components/StatsPanel.tsx`, `services/web/app/explore/components/TrendingKeywords.tsx`, `services/web/app/explore/components/MemberRanking.tsx`

### A11Y-08 아이콘 전용 버튼·링크 다수에 접근 가능한 이름이 없음

- 분류: major · a11y · 작업량 M · 검증 confirmed
- 사용자 영향: 스크린리더 사용자는 뒤로가기, 테마 전환, 알림, 검색, 맨 위로, 설정, 스크랩, 닫기, 더보기 메뉴, 타임라인 화살표를 '버튼'·'링크'로만 듣는다. 알림·검색은 href="#"라서 누르면 URL에 #이 붙고 스크롤이 맨 위로 튄다.
- 근거: components/common/Button/GoBackButton.tsx:16, EnterButton.tsx:6, SettingButton.tsx:15, ThemeSwitchButton.tsx:29-36, GoToTopButton.tsx:33-39, NotifcationButton.tsx:18-25(href="#")·32·39, SearchButton.tsx:6(href="#"), common/SearchBar/SearchModal.tsx:63, common/Snackbar/Snackbar.tsx:56, Bill/BillList/Bill/Bill.tsx:342·379(스크랩)·391(링크 복사), app/notification/components/NotificationItem.tsx:83, app/timeline/components/CommitteeAuditList.tsx:73·131·213·231; curl https://lawdigest.kr/ → '<a href="#">' 2건
- 수정안: isIconOnly 버튼을 감싸는 IconButton 컴포넌트를 만들고 label prop을 필수로 받아 aria-label에 넣는다. 토글형(스크랩·테마)은 aria-pressed를 함께 준다. href="#" 링크는 <button>으로 바꾸고 로그아웃 상태 알림은 /login으로 보낸다. 배지에는 '읽지 않은 알림 있음' 같은 시각적으로 숨긴 텍스트를 붙인다.
- 검증 메모: GoBackButton.tsx:16, EnterButton.tsx:6, SettingButton.tsx:15, ThemeSwitchButton.tsx:29-36, GoToTopButton.tsx:33-39, SearchModal.tsx:63, Snackbar.tsx:56-62, Bill.tsx:342·379·391의 isIconOnly 버튼에 aria-label이 없다. header SVG(Search·Notification·ArrowLeft·Setting)에도 <title>이 없다. NotifcationButton.tsx:19와 SearchButton.tsx:6은 href="#"이다. 운영 / HTML에서 <a href="#">가 2건 나온다.
- 파일: `services/web/components/common/Button/GoBackButton.tsx`, `services/web/components/common/Button/EnterButton.tsx`, `services/web/components/common/Button/SettingButton.tsx`, `services/web/components/common/Button/ThemeSwitchButton.tsx`, `services/web/components/common/Button/GoToTopButton.tsx`, `services/web/components/common/Button/NotifcationButton.tsx`, `services/web/components/common/Button/SearchButton.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`

### A11Y-09 본문·메타 텍스트 기본색 #999(text-gray-2)가 흰 배경에서 WCAG AA 대비에 미달

- 분류: major · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 법안 원제목, 단계 칩, 발의자 '등 N인', 날짜, 빈 상태 문구, 분야 카드 건수처럼 12~14px 텍스트가 대부분 2.85:1로 표시된다. 저시력·야외 사용자가 읽기 어렵다. DESIGN.md의 text-muted 토큰 자체가 본문용으로 미달이다.
- 근거: WCAG 2.x 상대휘도 공식 계산: #999999/#FFFFFF = 2.85:1(기준 4.5:1). 사용처 예: components/Bill/BillList/Bill/Bill.tsx:300(bill_name text-sm text-gray-2), :306(단계 칩), :238(text-xs text-gray-2), app/explore/components/CategoryGrid.tsx:55(text-[13px] text-gray-2), app/search/[id]/SearchResultClient.tsx:49·59·71, MemberRanking.tsx:33 순위 배지 bg-gray-2+흰 글자 2.85:1; 피드 비활성 탭 rgba(25,25,25,.4)≈#A3A3A3 = 2.52:1(globals.css:367); DESIGN.md:62 text-muted '#999999'
- 수정안: DESIGN.md의 text-muted를 4.5:1 이상인 값(예: #767676 = 4.54:1)으로 올리고 tailwind gray-2를 같은 값으로 바꾼다. #999는 비활성·장식 선에만 남긴다.
- 검증 메모: tailwind.config.js의 gray-2는 #999999이고 DESIGN.md:10 text-muted도 #999999이다. #999/#FFF 대비는 2.85:1로 4.5:1에 미달한다. Bill.tsx:300(text-sm text-gray-2 원제목), :306 단계 칩, Bill.tsx:238 발의자 '등 N인'(text-xs text-gray-2) 등 본문 정보가 이 색을 쓴다. DESIGN.md:220이 칩에 text-muted를 지정하므로 토큰 자체를 고쳐야 한다는 진단이 맞다.
- 파일: `DESIGN.md`, `services/web/tailwind.config.js`, `services/web/styles/globals.css`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### A11Y-10 다크 모드 보조 텍스트(text-gray-3 #555)와 진행 단계 미도달 항목이 사실상 보이지 않음

- 분류: major · a11y · 작업량 M · 검증 confirmed
- 사용자 영향: 다크 모드에서 법안 원제목·단계 칩·날짜·빈 상태 문구가 2.2~2.6:1로 흐리다. 법안 상세 '심사 진행 단계'의 아직 도달하지 않은 단계는 라이트 1.32:1, 다크 1.26:1로 읽을 수 없다. 정당색 글자(더불어민주당 #152484)도 다크 배경에서 1.46:1이다.
- 근거: WCAG 계산: #555555/#101012 = 2.55:1, #555555/#1E1E1E = 2.24:1, #E0E0E0/#FFFFFF = 1.32:1, #262626/#101012 = 1.26:1, #152484/#101012 = 1.46:1. 사용처: components/Bill/BillList/Bill/Bill.tsx:300·306(dark:text-gray-3), app/bill/[id]/components/ProgressStage/ProgressStage.tsx:15(text-gray-1 dark:text-gray-4), app/bill/[id]/components/ProcessResult/ProcessResult.tsx:86, app/explore/components/MemberRanking.tsx:45(style color=getPartyColor), app/mypage/components/BillContainer 등 dark:text-gray-3 다수
- 수정안: 다크 텍스트 사다리를 토큰으로 정의(예: secondary #B3B3B3, muted #8A8A8A 이상)하고 dark:text-gray-3/gray-4를 일괄 교체한다. 미도달 단계는 색 대신 아이콘 형태와 굵기로 구분하고 글자는 4.5:1을 유지한다. 정당명 텍스트는 본문색으로 두고 정당색은 dot·ring으로만 표시한다(DESIGN.md Party Color Is Data Rule).
- 검증 메모: ProgressStage.tsx:15는 미도달 단계를 text-gray-1(#E0E0E0)·dark:text-gray-4(#262626)로 칠한다. 운영 상세 RSC payload에서도 이 클래스를 확인했다. MemberRanking.tsx:45는 11px 정당명을 style color=getPartyColor로 칠한다. 이 색은 #152484가 dark-b 배경 위에서 약 1.46:1이다. Bill.tsx:300·306은 dark:text-gray-3(#555)를 쓴다. 계산값은 보고와 일치한다.
- 파일: `services/web/tailwind.config.js`, `services/web/app/bill/[id]/components/ProgressStage/ProgressStage.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/app/explore/components/MemberRanking.tsx`

### A11Y-11 모바일 플로팅 내비게이션·검색바에 다크 모드 스타일이 전혀 없음

- 분류: major · visual · 작업량 M · 검증 confirmed
- 사용자 영향: 다크 모드 모바일 사용자는 어두운 화면 위에 밝은 유리 질감 탭 바, #3a3a3a 라벨, 흰 검색 버블을 본다. 모든 화면 하단에 상시 노출되는 컴포넌트라 다크 모드가 미완성으로 보인다.
- 근거: services/web/styles/mobile-floating-nav.css 567줄 중 'dark' 문자열 0건(grep 'dark\|@media' 결과 :563 @media (min-width:48rem) 1건만); :59 background rgba(255,255,255,0.42), :205 color #3a3a3a, :466 input color #1a1a1a, :545-560 폴백도 밝은 배경 고정
- 수정안: .dark .mobile-floating-nav 등 선택자로 쉘·인디케이터·라벨·검색 입력·추천 버블 색을 dark-panel(#1E1E1E)/dark-line(#2E2E2E)/gray-0.5 토큰으로 재정의한다. 하드코딩 색은 CSS 변수로 바꿔 한 곳에서 두 테마를 관리한다.
- 검증 메모: styles/mobile-floating-nav.css는 567줄이고 'dark' 문자열이 0건이다. @media는 :563의 min-width:48rem 1건뿐이다. :55 background rgba(255,255,255,0.42), :205 color #3a3a3a, :466 input color #1a1a1a가 테마와 관계없이 고정된다. 이 nav는 app/layout.tsx 루트에서 모든 페이지에 렌더된다.
- 파일: `services/web/styles/mobile-floating-nav.css`

### A11Y-13 전 페이지에 h1이 없고 heading 태그를 글자 크기용으로 남용함

- 분류: major · a11y · 작업량 M · 검증 confirmed
- 사용자 영향: 스크린리더의 제목 탐색이 쓸모없어진다. 피드 카드마다 '스크랩', 숫자, '조회수', 날짜가 h4/h5로 잡혀 법안 상세 한 페이지에 수백 개의 제목이 생긴다. 요약 마크다운이 카드마다 h2를 만들어 카드 제목(h2)과 같은 수준이 된다.
- 근거: curl lawdigest.kr /, /timeline, /explore, /bill/PRC_X2X6U0S6R2Q2X1W4X4W2U1C5D3C9B3 등 전부 '<h1' 0건; components/Bill/BillList/Bill/Bill.tsx:294(h5 날짜), :298(h2 제목), :300(h3 원제목), :304(h5), :345-350·382-387(h4 '스크랩'·숫자·'조회수'), :236-245(Button 안 h4), :407(h5 AI 경고); SafeBillSummaryHtml.tsx:114(h3)·125(h2); app/bill/[id]/components/SectionContainer/SectionContainer.tsx:9(title 없을 때 빈 <h3>), BillDetail.tsx:65
- 수정안: 각 페이지에 h1을 하나 둔다(피드: 사이트명 또는 시각적으로 숨긴 '피드', 상세: 법안 제목). 카드 제목은 h2, 요약 섹션은 h3/h4로 한 단계씩 내린다. 메타 정보(날짜·카운트·라벨)는 <p>/<span>/<dl>로 바꾼다. SectionContainer는 title이 없으면 heading을 렌더하지 않는다.
- 검증 메모: curl로 /, /timeline, /explore, /mypage, /login, /bill/..., /congressman/CCU1009B, /party/1을 받았다. 모든 페이지에서 <h1이 0건이다. 법안 상세 한 페이지에는 h2 12, h3 17, h4 374, h5 2개가 있다. Bill.tsx:345-350·382-387은 '스크랩'·숫자·'조회수'를 h4로 렌더한다. SectionContainer.tsx:9는 title이 없을 때도 빈 <h3>를 렌더한다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Bill/BillList/Bill/SafeBillSummaryHtml.tsx`, `services/web/app/bill/[id]/components/SectionContainer/SectionContainer.tsx`, `services/web/components/Feed/Feed/Feed.tsx`

### A11Y-16 피드 콘텐츠 탭 '리포트'와 '법안'이 같은 내용을 렌더하고, 탭 상태가 보조기기에 전달되지 않음

- 분류: major · bug · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 사용자가 리포트↔법안 탭을 바꿔도 화면이 바뀌지 않아 동작하지 않는 UI로 느낀다. 스크린리더는 어느 탭이 선택됐는지 알 수 없다(role/aria-selected/aria-pressed 없음).
- 근거: components/Feed/Feed/Feed.tsx:131-146과 :149-164가 동일한 FeedTab/StageDropdown/BillList를 렌더; :116-123 <button>에 aria-pressed·role=tab 없음
- 수정안: 두 탭에 서로 다른 데이터 소스(리포트 전용 콘텐츠)를 연결하거나, 리포트 콘텐츠가 준비될 때까지 탭을 하나로 합친다. 남는 탭은 role="tablist"/role="tab"/aria-selected와 좌우 화살표 키 이동을 갖춘다.
- 검증 메모: Feed.tsx의 리포트 블록(contentType==='report')과 법안 블록(contentType==='bill')은 같은 FeedTab, StageDropdown, BillList와 같은 bills/popularBills를 렌더한다. 탭 <button>에는 role=tab, aria-selected, aria-pressed가 없다.
- 파일: `services/web/components/Feed/Feed/Feed.tsx`

### A11Y-22 타임라인 위원회 카드의 개별 모달이 상태 하나를 공유해 한 번 누르면 모든 카드의 모달이 동시에 열림, 모달 제목은 목록과 무관하게 '심사한 법안' 고정

- 분류: major · bug · 작업량 S · 검증 confirmed
- 사용자 영향: 데스크톱(카드 3개)에서 한 위원회의 화살표를 누르면 모달 3개가 겹쳐 열리고 맨 위에는 다른 위원회의 법안이 보일 수 있다. 법안 접수·공포 목록의 모달에도 '심사한 법안'이라는 제목이 붙는다. 이전 버튼은 마지막 페이지 계산이 소수가 되어(4개/3개씩 → 0.33) 잘못된 묶음을 보여준다.
- 근거: app/timeline/components/CommitteeAuditList.tsx:34 useDisclosure 1개, :117-165 currentItems.map 안에서 각 카드가 <TimelineModal isOpen={isOpenIndividual}> 렌더, :218 committee_audit_list.length / itemsPerPage - 1(Math.ceil 없음); app/timeline/components/TimelineModal.tsx:15 <ModalHeader>심사한 법안</ModalHeader>; SubmittedList.tsx:68·PromulgationList.tsx:68에서 같은 모달 사용
- 수정안: 선택한 위원회 이름을 상태로 두고 모달 하나만 렌더한다. TimelineModal에 title prop을 받아 '접수된 법안', '공포된 법안' 등으로 표시한다. 이전 이동은 Math.ceil(length/itemsPerPage)-1로 계산한다.
- 검증 메모: CommitteeAuditList.tsx:34에서 useDisclosure 하나(isOpenIndividual)를 currentItems.map 안의 모든 카드 TimelineModal(:138)이 공유한다. 데스크톱 itemsPerPage 3에서 버튼 하나를 누르면 모달 3개가 함께 열린다. 이전 버튼은 committee_audit_list.length / itemsPerPage - 1로 계산해 정수가 아닌 페이지가 나온다. 그 값으로 slice(startIndex, endIndex)를 하면 잘못된 묶음이 선택된다. TimelineModal.tsx:15는 제목을 '심사한 법안'으로 고정하고, SubmittedList·PromulgationList·PlenaryList가 같은 모달을 쓴다.
- 파일: `services/web/app/timeline/components/CommitteeAuditList.tsx`, `services/web/app/timeline/components/TimelineModal.tsx`, `services/web/app/timeline/components/SubmittedList.tsx`, `services/web/app/timeline/components/PromulgationList.tsx`, `services/web/app/timeline/components/PlenaryList.tsx`

### A11Y-29 개인정보처리방침·이용약관·데이터 출처 표기가 서비스 어디에도 없음

- 분류: major · trust · 백엔드 · 작업량 M · 검증 confirmed
- 사용자 영향: 사용자는 소셜 로그인으로 계정을 만들면서 어떤 정보가 수집되는지 확인할 수 없다. 법안·의원 데이터의 출처(국회 의안정보시스템 등)와 기준 시점이 표시되지 않아 정보의 근거를 확인할 수 없다. 푸터 자체가 없다.
- 근거: grep '개인정보|이용약관|privacy|terms' services/web/app services/web/components → 0건; grep 'footer' → 0건; app/login/page.tsx:16-46 버튼 3개 외 안내 없음; 원문 링크만 Bill.tsx:411 likms.assembly.go.kr
- 수정안: 공통 푸터(데스크톱)와 마이페이지 하단(모바일)에 개인정보처리방침·이용약관·문의 링크와 '데이터 출처: 국회 의안정보시스템, 열린국회정보 · 최종 수집 {날짜}'를 둔다. 로그인 버튼 아래에 '시작하면 이용약관과 개인정보처리방침에 동의합니다' 고지를 링크와 함께 둔다. 문서 본문은 운영자가 작성해야 한다.
- 검증 메모: services/web/app·components에서 '개인정보|이용약관|privacy|terms' grep 결과는 0건이다. <footer>와 CardFooter·ModalFooter 외의 Footer도 0건이다. 운영 /privacy와 /terms는 404를 반환한다. /login HTML에도 관련 고지가 없다. 소셜 로그인으로 개인정보를 수집하는 서비스에 처리방침 공개 경로가 없다.
- 파일: `services/web/app/layout.tsx`, `services/web/app/login/page.tsx`, `services/web/app/mypage/page.tsx`

### A11Y-04 'Summarized by GPT-4o' 표기가 실제 요약 모델과 다름

- 분류: minor · trust · 백엔드 · 작업량 M · 검증 adjusted
- 사용자 영향: 사용자는 모든 법안 상세에서 요약 출처를 GPT-4o로 안내받는다. 실제 파이프라인 기본값은 Gemini·gpt-4o-mini 등이다. 출처 표기가 사실과 달라 AI 요약 신뢰 장치가 오히려 신뢰를 깎는다. 영어 문구, opacity-30(대비 미달), alt='gpt-logo'도 함께 걸린다.
- 근거: services/web/components/Bill/GPTSummary/GPTSummary.tsx:5-8 (opacity-30, 'Summarized by', alt="gpt-logo", 'GPT-4o' 하드코딩); services/ai/src/lawdigest_ai/config.py:19 GEMINI_MODEL 기본 'gemini-3-flash-preview', :29 'gpt-5.4-mini', :58 SUMMARY_STRUCTURED_MODEL 'openai:gpt-4o-mini'
- 수정안: 백엔드 필드를 기다리지 않는다. 우선 특정 모델명과 영어 문구를 지우고 'AI 요약' 한국어 표기로 바꾼다. 로고는 alt=""로 두고 대비를 올린다. 모델·생성일 표시는 요약 레코드에 해당 값이 저장되는지 확인한 뒤 별도 작업으로 진행한다.
- 검증 메모: GPTSummary.tsx:5-8에 opacity-30, 'Summarized by', alt="gpt-logo", 'GPT-4o' 하드코딩이 있다. ai/config.py의 모델은 환경변수 기본값일 뿐이라서 운영 요약에 실제로 쓴 모델은 확인하지 못했다. 과거 요약은 GPT-4o로 생성됐을 가능성도 있다. 따라서 '사실과 다르다'는 단정은 근거가 부족하다. 결함은 데이터와 연결되지 않은 출처 표기를 하드코딩한 것이다. 화면에서 30% 불투명도로 거의 보이지 않으므로 신뢰 손상의 정도는 minor로 본다.
- 파일: `services/web/components/Bill/GPTSummary/GPTSummary.tsx`, `services/backend`, `services/ai/src/lawdigest_ai/config.py`

### A11Y-07 키보드 포커스 링을 제거하고 대체 표시가 없음

- 분류: minor · a11y · 작업량 S · 검증 adjusted
- 사용자 영향: 키보드 사용자는 모바일 하단 내비게이션, 검색 버튼, 용어 툴팁, 스낵바 닫기에서 현재 포커스 위치를 볼 수 없다. 프로젝트 전체에 focus-visible 스타일 정의가 없다.
- 근거: services/web/styles/mobile-floating-nav.css:226-229 (.mobile-floating-nav__item:focus-visible { outline: none; }), :469 (검색 input outline:none), :534-536 (.mobile-floating-nav-search-btn:focus-visible { outline: none; }); styles/globals.css:250 (.lawdigest-term-tooltip outline: none); components/common/Snackbar/Snackbar.tsx:59 focus:outline-none; grep 'focus-visible' 결과 위 제거 규칙만 존재. DESIGN.md:267 '색보다 명확한 focus ring'
- 수정안: 전역 :focus-visible 규칙을 새로 만들지 않는다. 링을 제거한 커스텀 컨트롤(.mobile-floating-nav__item, .mobile-floating-nav-search-btn, 스낵바 닫기)에만 HeroUI focus 토큰과 같은 링을 준다. HeroUI 기본 링은 유지한다.
- 검증 메모: '프로젝트 전체에 focus-visible 스타일이 없다'는 주장은 틀렸다. HeroUI Button·AccordionItem은 data-[focus-visible=true]:outline-2 outline-focus 링을 기본으로 가진다. 운영 HTML의 버튼 class에서 이 링을 확인했다. 실제로 링이 제거된 곳은 커스텀 컨트롤이다. mobile-floating-nav.css:226-229의 nav item, :534-536의 search btn, Snackbar.tsx:59의 focus:outline-none이 해당한다. 용어 툴팁(globals.css:250)은 focus 시 툴팁 레이어가 뜨므로 대체 표시가 있다. 검색 input은 캐럿이 보인다. DESIGN.md 근거 줄은 267이 아니라 215이다. 영향 범위가 모바일 하단 내비 위주라 minor로 조정한다.
- 파일: `services/web/styles/globals.css`, `services/web/styles/mobile-floating-nav.css`, `services/web/components/common/Snackbar/Snackbar.tsx`

### A11Y-12 prefers-reduced-motion을 대부분의 모션에서 무시하고, 탭 인디케이터는 튀는(overshoot) 이징을 씀

- 분류: minor · a11y · 작업량 S · 검증 adjusted
- 사용자 영향: 전정 장애·모션 민감 사용자도 하단 내비 바운스, 피드 탭 슬라이드, 분야 카드 인디케이터, 의석 점 애니메이션, smooth scroll을 그대로 겪는다. DESIGN.md는 '튀는 모션 금지'를 명시한다.
- 근거: grep 'reduced-motion|motion-reduce' → CSS 0건, useReducedMotion은 app/explore/components/StatsCard.tsx:18, StatsOverview.tsx:17·45·74만. 미적용: styles/mobile-floating-nav.css:126·162 cubic-bezier(0.175,0.885,0.32,1.275), styles/globals.css:331 cubic-bezier(0.34,1.56,0.64,1), tailwind.config.js:35-41 animation, app/explore/components/CategoryGrid.tsx:38-49 motion layoutId, SeatDistribution.tsx motion.circle, components/common/Button/GoToTopButton.tsx:21 behavior:'smooth'; DESIGN.md:267, PRODUCT.md:52
- 수정안: globals.css에 @media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms!important; transition-duration:.01ms!important; scroll-behavior:auto!important } }를 추가한다. framer-motion은 루트에 <MotionConfig reducedMotion="user">를 둔다. overshoot 이징은 cubic-bezier(0.22,1,0.36,1)로 교체한다.
- 검증 메모: CSS 파일 어디에도 reduced-motion 처리가 없다. useReducedMotion은 StatsCard·StatsOverview에만 있다. overshoot 이징은 mobile-floating-nav.css:114·155(보고 줄번호 126·162는 틀림)와 globals.css:331에 있다. 다만 대상은 0.3~0.4초 짧은 전환과 탭 인디케이터 이동이다. 큰 시차 스크롤이나 자동 재생 모션은 아니다. prefers-reduced-motion 대응은 WCAG 2.3.3(AAA) 범위라 major는 과하다. overshoot는 DESIGN.md:215 '튀는 모션 금지'를 위반하므로 결함은 유지한다.
- 파일: `services/web/styles/globals.css`, `services/web/styles/mobile-floating-nav.css`, `services/web/lib/provider/index.tsx`, `services/web/app/explore/components/CategoryGrid.tsx`, `services/web/app/explore/components/SeatDistribution.tsx`, `services/web/components/common/Button/GoToTopButton.tsx`

### A11Y-14 개발용·템플릿 영문 문자열이 접근성 이름과 대체 텍스트로 노출됨

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 스크린리더가 'Options', 'Static Actions', 'Export Button', 'avatar', 'gpt-logo'를 영어로 읽는다. 한국어 서비스에서 미완성 흔적으로 들린다.
- 근거: components/Feed/FeedTab/FeedTab.tsx:20 aria-label="Options", components/Bill/BillTab/BillTab.tsx:20 "Options", components/Feed/StageDropdown/StageDropdown.tsx:27 "Static Actions", components/common/Button/SettingButton.tsx:19 "Static Actions", components/Bill/BillList/Bill/Bill.tsx:357 "Export Button", GPTSummary.tsx:7 alt="gpt-logo"; curl /bill/PRC_X2X6U0S6R2Q2X1W4X4W2U1C5D3C9B3 → alt="avatar" 1건(Bill.tsx:153-166 AvatarGroup의 Avatar에 name/alt 없음), /congressman/CCU1009B → alt="avatar"(CongressmanDetail.tsx:45); app/explore/components/AssemblySegment.tsx:20 '국회 하위 세그먼트', ExploreSubTabs.tsx:15 '탐색 하위 탭', SeatDistribution.tsx:193 '정당 포커스 해제'(개발 용어)
- 수정안: 각 aria-label을 화면 의미로 바꾼다(예: '정렬', '진행 단계 필터', '링크 복사', '의원·정당 보기 전환'). Avatar에는 정당명/의원명을 alt로 넘기고, 장식 로고는 alt=""로 둔다.
- 검증 메모: FeedTab.tsx:20·BillTab.tsx:20에 aria-label="Options"가 있다. StageDropdown.tsx:27·SettingButton.tsx:19에는 "Static Actions", Bill.tsx:357에는 "Export Button", GPTSummary.tsx:7에는 alt="gpt-logo"가 있다. 운영 /bill과 /congressman/CCU1009B HTML에서 alt="avatar"가 각 1건 나온다. CongressmanDetail.tsx:45의 Avatar에는 name·alt가 없다.
- 파일: `services/web/components/Feed/FeedTab/FeedTab.tsx`, `services/web/components/Bill/BillTab/BillTab.tsx`, `services/web/components/Feed/StageDropdown/StageDropdown.tsx`, `services/web/components/common/Button/SettingButton.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Bill/GPTSummary/GPTSummary.tsx`, `services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `services/web/app/explore/components/AssemblySegment.tsx`

### A11Y-15 이미지 대체 텍스트가 틀리거나 중복되거나 일관되지 않음

- 분류: minor · a11y · 작업량 S · 검증 adjusted
- 사용자 영향: 로딩 화면 로고와 404 이미지를 '500 에러 이미지'로 읽는다. 헤더 로고는 '로고이미지'로 읽혀 사이트명이 전달되지 않는다. 로그인 버튼은 '카카오톡 로고 이미지 카카오톡으로 시작하기'처럼 중복해서 읽힌다. 법안 상세 발의자 명단에서 정당 로고 alt가 수백 번 반복된다(국민의힘 이미지 140회, 더불어민주당 이미지 214회).
- 근거: app/loading.tsx:14 alt="500 에러 이미지"(로고), app/not-found.tsx:18 alt="500 에러 이미지"(404 이미지), components/Layout/Header/Logo.tsx:20 alt="로고이미지", app/login/page.tsx:24·33·42, app/mypage/components/BillContainer/BillContainer.tsx:38 '스크랩 아이콘 이미지', UserInfo '프로필 사진 테두리'; 정당 로고 alt 불일치 Bill.tsx:205 '{정당} 이미지' vs ProposerList.tsx:162·VoteResultBoard.tsx:37 '{정당} 로고 이미지' vs SeatDistribution '{정당} 로고'; curl /bill/PRC_X2X6U0S6R2Q2X1W4X4W2U1C5D3C9B3 → 140 alt="국민의힘 이미지", 214 alt="더불어민주당 이미지"
- 수정안: 정당 로고 alt 통일 대상에 AnotherBill.tsx:63과 BillBookmarked.tsx:114를 포함한다. 유사 법안 카드 안의 정당 로고는 링크 이름이 될 수 있으므로 정당명만 쓴다. 유사 법안 목록이 수백 건씩 렌더되는 문제는 성능 결함으로 따로 다룬다. 이 목록에는 개수 제한이나 페이지네이션을 둔다.
- 검증 메모: loading.tsx:14, not-found.tsx:18, error.tsx:24에 alt='500 에러 이미지'가 있다. Logo.tsx:20은 '로고이미지'이고 login/page.tsx:24·33·42의 alt는 버튼 텍스트와 중복된다. 반복 alt의 출처는 보고와 다르다. 운영 상세 HTML에서 alt="더불어민주당 이미지" 214건과 "국민의힘 이미지" 140건을 확인했다. 그중 353건은 class 'object-contain w-[60px] h-[30px]'이다. 이것은 발의자 명단이 아니라 유사 법안 카드 AnotherBill.tsx:63에서 나온다. Bill.tsx:205에서 나오는 것은 1건뿐이다. 같은 확인 과정에서 상세 페이지 하나가 유사 법안 카드 약 353개를 SSR한다는 사실도 드러났다. 이 때문에 HTML 크기가 1.1MB이다.
- 파일: `services/web/app/loading.tsx`, `services/web/app/not-found.tsx`, `services/web/app/error.tsx`, `services/web/components/Layout/Header/Logo.tsx`, `services/web/app/login/page.tsx`, `services/web/app/mypage/components/BillContainer/BillContainer.tsx`, `services/web/app/mypage/components/UserInfo/UserInfo.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### A11Y-17 의원 페이지 약력 아코디언이 라벨 없는 화살표 하나로만 표시되고, 제목 '후보약력'은 선거 화면 잔재

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 사용자는 의원 카드 하단 화살표가 약력과 홈페이지 링크를 펼친다는 것을 알 수 없다. titleWrapper를 hidden(display:none)으로 숨겨 스크린리더에서도 버튼 이름이 사라진다. 현직 의원 화면에 '후보약력'이라는 선거 용어가 남아 있다.
- 근거: app/congressman/[id]/components/Congressman/CongressmanDetail.tsx:103-110 (classNames.titleWrapper: ['hidden'], title="후보약력"), :73-75 '기본정보' Chip 레이블, :81 `${age} 세`(→'52세'), :89 '번호'(전화번호)
- 수정안: 아코디언 제목을 '약력'으로 바꾸고 시각적으로 보이게 둔다. 섹션 레이블 칩 '기본정보'는 지우고 dl/dt/dd 배치로 항목을 구분한다. '번호'는 '전화', 나이는 '52세'로 붙여 쓴다.
- 검증 메모: CongressmanDetail.tsx:103-110은 titleWrapper를 ['hidden']으로 두고 title='후보약력'을 준다. 운영 /congressman/CCU1009B HTML에서 accordion <button>의 내용은 class 'hidden'인 div 안의 '후보약력'과 aria-hidden 인디케이터뿐이다. 그래서 버튼에 접근 가능한 이름이 없다. :73 '기본정보' Chip, :81 `${age} 세`, :89 '번호'도 확인했다.
- 파일: `services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`

### A11Y-18 <a> 안에 <button>을 넣은 중첩 인터랙티브, 키보드로 못 쓰는 클릭 요소

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 키보드 사용자는 '자세히 보기'·'원문 확인하기'에서 탭이 두 번 멈춘다. 다른 법안 카드의 정당 아바타, 최근 검색어 칩은 마우스로만 누를 수 있다. 팔로잉 피드의 <ul>은 li 없이 section을 담아 목록 구조가 깨진다.
- 근거: components/Bill/BillList/Bill/Bill.tsx:364-371 <Link><Button>자세히 보기</Button></Link>, :411-419 <Link><Button>원문 확인하기</Button></Link>; app/bill/[id]/components/AnotherBill/AnotherBill.tsx:73-86 Avatar onClick(포커스 불가); components/common/SearchBar/SearchModal.tsx:82-90 Chip onClick; components/Feed/Feed/FollowingFeed.tsx:47-59 <ul> 안에 <Bill>(section)·<p>·<div>
- 수정안: HeroUI Button에 as={Link} href를 주어 요소 하나로 만든다. 원문 링크는 외부 이동임을 target/rel과 아이콘으로 표시한다. 아바타와 칩은 Link 또는 button으로 감싼다. FollowingFeed는 각 항목을 <li>로 감싸거나 <ul>을 <div>로 바꾼다.
- 검증 메모: Bill.tsx:364-371은 <Link><Button>자세히 보기</Button></Link>, :411-419는 <Link><Button>원문 확인하기</Button></Link> 구조이다. AnotherBill.tsx의 Avatar는 onClick만 있고 포커스를 받을 수 없다. SearchModal.tsx:82-90의 Chip은 onClick으로 동작한다. FollowingFeed.tsx:47-59의 <ul>은 li 없이 Bill(section)·p·div를 직접 담는다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/app/bill/[id]/components/AnotherBill/AnotherBill.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`, `services/web/components/Feed/Feed/FollowingFeed.tsx`

### A11Y-19 검색 모달과 모바일 검색이 대화상자 의미·포커스 관리·Esc 닫기·입력 라벨이 없음

- 분류: minor · a11y · 작업량 M · 검증 adjusted
- 사용자 영향: 키보드·스크린리더 사용자는 검색 모달이 열려도 뒤 화면으로 포커스가 빠져나가고 Esc로 닫을 수 없다. 검색 입력은 placeholder만 있어 라벨이 없다. 최근 검색어 초기값은 localStorage 키 대소문자가 달라 첫 렌더에서 비어 보인다.
- 근거: components/common/SearchBar/SearchModal.tsx:58-60 <section className="... fixed">(role=dialog·aria-modal 없음), :17 localStorage.getItem('recentkeywords') vs :26·38·45 'recentKeywords'; components/common/SearchBar/SearchBar.tsx:54-71 Input에 label/aria-label 없음; components/Layout/Nav/Nav.tsx:316-324 input type="text" aria-label 없음, Esc 핸들러 없음
- 수정안: 대화상자 의미, 포커스 트랩, Esc 닫기, 트리거로 포커스 복귀를 적용한다. 입력에는 type="search"와 enterKeyHint를 준다. 입력 라벨은 placeholder가 이름을 제공하므로 필수 수정이 아니다. 명시적 aria-label은 선택 사항이다. localStorage 키는 상수 하나로 통일하는 정리 작업으로 다룬다.
- 검증 메모: SearchModal.tsx:58-60은 role=dialog·aria-modal 없는 <section>이다. 포커스 트랩도 없다. Nav.tsx와 SearchBar에서 Escape 처리가 0건이다. 이 부분은 확인했다. 입력 라벨 주장은 틀렸다. HeroUI Input은 safeAriaLabel(aria-label, label, placeholder)로 placeholder를 aria-label에 넣는다(@heroui/input chunk-MSLIMGMJ.mjs:93-96). Nav의 native input도 accname 규칙에 따라 placeholder를 이름으로 쓴다. localStorage 키 불일치('recentkeywords' vs 'recentKeywords')는 실재한다. 다만 :43-47 useEffect가 마운트 즉시 'recentKeywords'를 다시 읽고 모달은 처음에 hidden 상태이므로 '첫 렌더에서 비어 보인다'는 증상은 사용자에게 나타나지 않는다.
- 파일: `services/web/components/common/SearchBar/SearchModal.tsx`, `services/web/components/common/SearchBar/SearchBar.tsx`, `services/web/components/Layout/Nav/Nav.tsx`

### A11Y-20 모바일 하단 탭이 링크가 아닌 button+router.push이고 nav 랜드마크에 이름이 없음, /explore에는 main 랜드마크가 두 개

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 하단 탭은 링크로 인식되지 않아 길게 눌러 새 탭 열기·프리페치가 되지 않는다. 데스크톱 헤더 nav와 모바일 nav가 둘 다 이름 없는 내비게이션으로 읽힌다. 탐색 페이지에서는 main이 중첩된다.
- 근거: components/Layout/Nav/Nav.tsx:215 <nav>(aria-label 없음), :242-257 <button onClick={() => router.push(href)}>; app/layout.tsx:87 <main>, app/explore/components/ExploreBoard.tsx:21 <main> 중첩; 본문 건너뛰기 링크 grep '건너뛰기|skip' 0건
- 수정안: 탭 항목을 next/link로 바꾸고 드래그 판정은 onClick에서 preventDefault로 처리한다. nav에 aria-label='주요 메뉴'를 준다. ExploreBoard의 <main>은 <div>로 바꾼다. 루트에 '본문으로 건너뛰기' 링크를 추가한다.
- 검증 메모: Nav.tsx의 <nav className="mobile-floating-nav">에 aria-label이 없다. 탭은 <button onClick={() => router.push(href)}>이다. 운영 HTML에서도 헤더 nav와 모바일 nav가 둘 다 이름 없이 렌더된다. /explore HTML에서 <main이 2건 나오고 ExploreBoard.tsx:21이 원인이다. '건너뛰기|skip' grep 결과는 0건이다.
- 파일: `services/web/components/Layout/Nav/Nav.tsx`, `services/web/app/layout.tsx`, `services/web/app/explore/components/ExploreBoard.tsx`, `services/web/components/Layout/Header/Header.tsx`

### A11Y-21 터치 타깃이 지나치게 작음 (16px 화살표, 6px 페이지 점, 22px 기간 버튼)

- 분류: minor · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: 모바일 사용자가 타임라인 '심사한 법안 >' 화살표, 위원회 카드 페이지 점, 통계 기간 전환 버튼을 정확히 누르기 어렵다.
- 근거: app/timeline/components/CommitteeAuditList.tsx:73·131 className="w-4 h-4 p-0"(16px), :227-228 Pagination item/cursor w-[6px] h-[6px] text-transparent; app/explore/components/StatsTrendArea.tsx:82 px-2.5 py-1 text-[11px]; 같은 패턴 PlenaryList/PromulgationList/SubmittedList; DESIGN.md:134 spacing.touch 56px, :310
- 수정안: 아이콘 버튼은 최소 44×44 히트 영역(min-w-11 min-h-11)을 주고 시각 크기는 유지한다. 6px 점 대신 '1/3' 텍스트나 44px 히트 영역을 가진 점을 쓴다. '심사한 법안 14개' 텍스트 전체를 버튼으로 만든다.
- 검증 메모: CommitteeAuditList.tsx:73·131은 className="w-4 h-4 p-0"(16px) 아이콘 버튼이다. Pagination item과 cursor는 w-[6px] h-[6px] text-transparent이다. StatsTrendArea.tsx:82는 px-2.5 py-1 text-[11px]이다. DESIGN.md:258은 56px 안팎의 터치 크기를 요구한다.
- 파일: `services/web/app/timeline/components/CommitteeAuditList.tsx`, `services/web/app/timeline/components/PlenaryList.tsx`, `services/web/app/timeline/components/PromulgationList.tsx`, `services/web/app/timeline/components/SubmittedList.tsx`, `services/web/app/explore/components/StatsTrendArea.tsx`

### A11Y-23 'AI 기반 입법정보 제공 플랫폼' 문구가 모든 페이지 전환 로딩 화면과 사이트 설명에 노출됨

- 분류: minor · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 페이지를 옮길 때마다 거대한 로고와 'AI 기반' 수식어, 스피너가 뜬다(모든 페이지 HTML에 포함 확인). 공유 미리보기 설명은 '자연어 처리 기술을 이용한 법률 개정안 요약 플랫폼'이라는 기술 설명이다. 사용자 지침상 넣지 않는 글이고 사용자에게 서비스 가치를 전달하지 않는다.
- 근거: app/loading.tsx:7 주석 '// Or a custom loading skeleton component'(템플릿 잔재), :17 'AI 기반 입법정보 제공 플랫폼'; curl https://lawdigest.kr/{,timeline,explore,mypage,login,...} 모두 '<h2 ...>AI 기반 입법정보 제공 플랫폼' 포함; config/site.ts description '자연어 처리 기술을 이용한 법률 개정안 요약 플랫폼', keywords 'ChatGPT', 'LLM'; package.json name 'next-app-template'
- 수정안: 루트 loading.tsx를 각 화면 레이아웃과 같은 골격(skeleton)으로 바꾸고 문구와 로고를 지운다. 사이트 설명은 시민이 얻는 가치('국회 법안을 쉬운 말로 요약하고 진행 상황을 추적합니다' 등)로 바꾸고 기술 키워드를 뺀다.
- 검증 메모: app/loading.tsx:6에 '// Or a custom loading skeleton component' 주석이 있고 :17에 'AI 기반 입법정보 제공 플랫폼'이 있다. :14 로고 alt는 '500 에러 이미지'이다. curl로 받은 /, /explore, /timeline, /mypage, /login, /notification, /following, /search, 404 HTML이 모두 이 문구를 포함한다. config/site.ts의 description은 '자연어 처리 기술을 이용한 법률 개정안 요약 플랫폼'이고 keywords에 'ChatGPT', 'LLM'이 있다.
- 파일: `services/web/app/loading.tsx`, `services/web/config/site.ts`, `services/web/package.json`

### A11Y-24 존댓말 문체(해요체/합니다체)와 반말이 같은 화면 안에서 섞임

- 분류: minor · copy · 작업량 M · 검증 confirmed
- 사용자 영향: 같은 법안 상세에서 요약은 '~이에요', 처리 결과는 '반영되었어요!', 빈 상태는 '투표 정보가 없습니다.', 경고는 '확인해주세요 !'로 말투가 계속 바뀐다. 검색 추천은 '알려줘'로 반말이다. 브랜드 톤이 정리되지 않은 인상을 준다.
- 근거: app/bill/[id]/components/ProcessResult/ProcessResult.tsx:36 '반영되었어요!', :49 '폐기되었어요', :62 '철회했어요', :87 '투표 정보가 없습니다.'; components/Bill/BillList/Bill/Bill.tsx:408 '꼭 원문을 확인해주세요 !'; components/Feed/Feed/FollowingFeed.tsx:34 '로그인이 필요해요.' vs Bill.tsx:143·Snackbar.tsx:51 '로그인이 필요한 서비스입니다.'; Nav.tsx:14 '알려줘' vs :13 '궁금해요'; app/search/[id]/SearchResultClient.tsx:59 '검색 결과가 존재하지 않습니다.', SearchModal '최근 검색어가 존재하지 않습니다.'; LogoutButton '로그아웃을 성공했습니다.'
- 수정안: UI 문구 톤을 해요체 하나로 정하고 문구 상수 파일(constants/copy.ts)로 모은다. '존재하지 않습니다'는 '없어요', '로그아웃을 성공했습니다'는 '로그아웃했어요'처럼 바꾼다. 느낌표와 문장부호 앞 공백을 없앤다.
- 검증 메모: ProcessResult.tsx:36 '반영되었어요!', :87 '투표 정보가 없습니다.', Bill.tsx:408 '확인해주세요 !', FollowingFeed.tsx:34 '로그인이 필요해요.' 대 Bill.tsx:143 '로그인이 필요한 서비스입니다.', LogoutButton.tsx:17 '로그아웃을 성공했습니다.', SearchResultClient.tsx:59 '검색 결과가 존재하지 않습니다.'를 확인했다. Nav.tsx는 '알려줘'와 '궁금해요'를 섞는다.
- 파일: `services/web/app/bill/[id]/components/ProcessResult/ProcessResult.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/Feed/Feed/FollowingFeed.tsx`, `services/web/components/common/Snackbar/Snackbar.tsx`, `services/web/components/Layout/Nav/Nav.tsx`, `services/web/app/search/[id]/SearchResultClient.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`, `services/web/app/mypage/components/UserInfo/LogoutButton.tsx`

### A11Y-25 같은 대상을 여러 이름으로 부름 (법안/의안/발의안, 심사/심의, 개/건, 팔로잉/팔로우)

- 분류: minor · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 법안 상세 헤더는 '의안 자세히 보기', 메타 설명은 '발의안', 나머지는 '법안'이다. 타임라인은 같은 위원회 단계에서 '심의한 법안 15개'와 '심사한 법안 14개'를 나란히 보여주고 본회의는 '본회의 심사'(필터는 '본회의 심의')로 부른다. 수량 단위가 탐색 '건'과 타임라인 '개'로 갈린다. 시민이 같은 개념인지 다른 개념인지 헷갈린다.
- 근거: app/bill/[id]/layout.tsx:5·11, page.tsx:21 '발의안'·:39 '의안 자세히 보기'; app/timeline/components/CommitteeAuditList.tsx:68 '심의한 법안', :129 '심사한 법안', PlenaryList.tsx:73 '본회의 심사', :77 '심의한 법안', :164 '심사한 법안이 없습니다.' vs constants/bill.ts:17 '본회의 심의'; app/explore/components/CategoryGrid.tsx:55 '건' vs 타임라인 '개'; 스크린샷 타임라인 '심의한 법안 15개'/'심사한 법안 14개'; FollowingFeed.tsx:52 '팔로잉한 의원' vs FollowingCongressmanStrip.tsx:32 '팔로우한 의원'; constants/bill.ts:67 '의원/정당' vs SearchResultClient.tsx:52 '의원 · 정당'
- 수정안: 용어집을 정한다: 법안, 위원회 심사, 본회의 심의, 수량 단위 '건', 행위 '팔로우'. 단계·라벨 문자열을 constants 한 곳에서만 가져오게 바꾼다.
- 검증 메모: bill/[id]/layout.tsx:5·11과 page.tsx:39는 '의안 자세히 보기'를, page.tsx:21은 '발의안'을 쓴다. CommitteeAuditList.tsx:68 '심의한 법안'과 :129 '심사한 법안'이 같은 단계에 함께 있다. PlenaryList.tsx:73은 '본회의 심사', constants/bill.ts:17은 '본회의 심의'이다. CategoryGrid는 '건', 타임라인은 '개'를 쓴다. FollowingFeed '팔로잉한 의원'과 FollowingCongressmanStrip '팔로우한 의원'도 다르다.
- 파일: `services/web/app/bill/[id]/layout.tsx`, `services/web/app/bill/[id]/page.tsx`, `services/web/app/timeline/components/CommitteeAuditList.tsx`, `services/web/app/timeline/components/PlenaryList.tsx`, `services/web/app/timeline/components/SubmittedList.tsx`, `services/web/app/timeline/components/PromulgationList.tsx`, `services/web/components/Feed/Feed/FollowingFeed.tsx`, `services/web/constants/bill.ts`

### A11Y-26 오탈자와 띄어쓰기 오류

- 분류: minor · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 검색 결과 미리보기와 화면 곳곳에 맞춤법 오류가 보인다.
- 근거: app/following/layout.tsx:5 description '내가 정보한 정보들을 자세히 확인할 수 있는 페이지'(curl /following 메타로 노출); app/timeline/components/TimelineBoard.tsx:29 '제 22대 국회'(explore는 '제22대'); components/common/Modal/WithdrawModal.tsx:28 '진행하시겠습니까 ?'; Bill.tsx:408 '확인해주세요 !'; app/congressman/[id]/components/Congressman/FollowBoard.tsx:71 '팔로우 하기', :58·62 '대표발의법안'·'공동발의법안'(config/site.ts는 '대표발의한 법안'); Snackbar.tsx:53 '로그인 하기'; party 메타 '지역구 160 석'(curl /party/1); styles/globals.css:112 클래스명 .DAFAULT
- 수정안: 각 문구를 고친다('내가 팔로우한 의원과 정당의 소식', '제22대 국회', '팔로우', '대표발의 법안', '로그인하기', '160석'). 메타 description 생성 시 숫자와 단위를 붙여 쓴다.
- 검증 메모: 운영 /following 메타 description은 '내가 정보한 정보들을 자세히 확인할 수 있는 페이지'(following/layout.tsx:6)이다. /party/1 메타는 '…지역구 160 석, 비례대표 10 석'이다. TimelineBoard.tsx:29는 '제 22대 국회'이고 explore는 '제22대'를 쓴다. 그 밖에 WithdrawModal.tsx:28 '진행하시겠습니까 ?', congressman FollowBoard.tsx:71 '팔로우 하기', :58 '대표발의법안', Snackbar.tsx:53 '로그인 하기', globals.css:112 .DAFAULT를 확인했다.
- 파일: `services/web/app/following/layout.tsx`, `services/web/app/timeline/components/TimelineBoard.tsx`, `services/web/components/common/Modal/WithdrawModal.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/app/congressman/[id]/components/Congressman/FollowBoard.tsx`, `services/web/app/party/[id]/components/PartyDetail/FollowBoard.tsx`, `services/web/components/common/Snackbar/Snackbar.tsx`, `services/web/app/party/[id]/page.tsx`

### A11Y-27 레이아웃이 전달해야 할 뜻을 글로 반복하는 섹션 레이블·안내 문장

- 분류: minor · copy · 작업량 M · 검증 confirmed
- 사용자 영향: 활성 탭과 같은 '피드'·'타임라인' 제목, '분야별 둘러보기', 사이드바의 '탐색', '이곳에서 스크랩한 법안들을 모아서 확인하세요!' 배너, ''X'에 대한 검색 결과입니다.', 'STEP 01' 같은 문장이 화면을 채워 정보 밀도를 낮춘다(사용자 화면 문구 원칙 위반).
- 근거: components/Feed/Feed/Feed.tsx:103 h2 '피드'(헤더 활성 탭과 중복, 스크린샷 확인); app/timeline/components/TimelineBoard.tsx:27 '타임라인'; app/explore/components/FieldPanel.tsx:17 '분야별 둘러보기'; ExploreSidebar.tsx:15 '탐색'(uppercase tracking-wide); app/mypage/components/BillContainer/BillContainer.tsx:33-44 안내 배너; app/search/[id]/SearchResultClient.tsx:49; app/notification/components/NotificationTopThree.tsx:105-108 '{N}개의 읽지 않은 알림이 있습니다.'(0개일 때도 표시); app/bill/[id]/components/ProgressStage/ProgressStage.tsx:26 'STEP 0N'; CongressmanDetail.tsx:73 '기본정보'; app/explore/components/CategoryGrid.tsx:55 카드 17개마다 '관련 법안' 반복; layout.tsx 헤더 title '의안 자세히 보기'
- 수정안: 섹션 이름 레이블과 안내 문장을 지우고 배치·크기로 구분한다. 페이지 제목은 시각적으로 숨긴 h1로 옮긴다. 검색 결과는 검색창에 질의를 채워 보여준다. 읽지 않은 알림은 0이면 숨기고 숫자 배지로 표시한다. 단계 번호는 아이콘 순서로 충분하므로 'STEP' 라벨을 지운다.
- 검증 메모: Feed.tsx:103 h2 '피드', TimelineBoard.tsx:27 '타임라인', FieldPanel.tsx:17 '분야별 둘러보기', mypage BillContainer.tsx:43 안내 배너, SearchResultClient.tsx:49, ProgressStage.tsx:26 'STEP 0N', CongressmanDetail.tsx:73 '기본정보', CategoryGrid.tsx:55의 카드마다 붙은 '관련 법안'을 확인했다. NotificationTopThree.tsx:104는 {notificationCount && …}로 객체가 있는지만 검사하므로 0개일 때도 '0개의 읽지 않은 알림이 있습니다.'가 표시된다.
- 파일: `services/web/components/Feed/Feed/Feed.tsx`, `services/web/app/timeline/components/TimelineBoard.tsx`, `services/web/app/explore/components/FieldPanel.tsx`, `services/web/app/explore/components/ExploreSidebar.tsx`, `services/web/app/mypage/components/BillContainer/BillContainer.tsx`, `services/web/app/search/[id]/SearchResultClient.tsx`, `services/web/app/notification/components/NotificationTopThree.tsx`, `services/web/app/bill/[id]/components/ProgressStage/ProgressStage.tsx`

### A11Y-28 목록 화면 페이지 제목·설명이 '~페이지' 템플릿이고 로그인 화면 제목은 '회원가입 페이지'

- 분류: minor · seo · 작업량 S · 검증 confirmed
- 사용자 영향: 브라우저 탭과 검색 결과에 '탐색 페이지', '마이 페이지', '알림 페이지'처럼 사이트명 없는 제목이 뜬다. 로그인 화면은 '회원가입 페이지'로 표시된다. 검색 결과 페이지 제목에는 검색어가 없다. 이 레이아웃들의 og:title/og:url은 루트 값으로 고정되어 공유 미리보기가 모두 같다. 404 페이지 제목은 '모두의입법'이라 오류임이 드러나지 않는다.
- 근거: curl: /explore '<title>탐색 페이지</title>', /mypage '마이 페이지', /notification '알림 페이지', /login '회원가입 페이지'(app/login/layout.tsx), /search/의료 '검색 페이지', /nonexistent-xyz(404) '<title>모두의입법</title>'; 모두 og:title '모두의입법', og:url 'https://www.lawdigest.kr'; 설명 '…을 자세히 확인할 수 있는 페이지'(app/*/layout.tsx); utils/getMetadata.ts는 상세 페이지만 사용; 메타 이미지 width '1200' height '630' 선언 vs 실제 opengraph-image.png 4800×2520
- 수정안: 루트 metadata에 title.template '%s | 모두의입법'을 두고 각 layout은 '탐색', '로그인', '알림'처럼 이름만 준다. 검색은 generateMetadata로 ''{검색어}' 검색 결과'를 만든다. 목록 레이아웃도 getMetadata를 거쳐 og:url을 경로별로 만든다. not-found에 '페이지를 찾을 수 없어요' 제목을 준다. OG 이미지를 1200×630으로 내보내거나 선언값을 실제 크기로 맞춘다.
- 검증 메모: curl 결과 /explore '탐색 페이지', /mypage '마이 페이지', /notification '알림 페이지', /login '회원가입 페이지', /search/의료 '검색 페이지', /timeline '타임라인 페이지', /following '팔로잉 페이지'이다. 404는 '<title>모두의입법</title>'이다. 이 레이아웃들은 모두 og:title '모두의입법', og:url 'https://www.lawdigest.kr'이다. og:image:width는 1200으로 선언되어 있다. sips로 확인한 opengraph-image.png 실제 크기는 4800×2520이다.
- 파일: `services/web/app/layout.tsx`, `services/web/app/login/layout.tsx`, `services/web/app/explore/layout.tsx`, `services/web/app/mypage/layout.tsx`, `services/web/app/notification/layout.tsx`, `services/web/app/following/layout.tsx`, `services/web/app/timeline/layout.tsx`, `services/web/app/search/[id]/layout.tsx`

### A11Y-30 회원탈퇴 확인 모달이 결과를 알리지 않고 버튼 이름이 모호함

- 분류: minor · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 되돌릴 수 없는 탈퇴를 '주의 / 회원탈퇴를 진행하시겠습니까 ?' 한 줄과 '확인' 버튼으로만 묻는다. 스크랩·팔로우 데이터가 삭제되는지 알 수 없다. 실패 시 아무 피드백이 없다.
- 근거: components/common/Modal/WithdrawModal.tsx:26 '주의', :28 '회원탈퇴를 진행하시겠습니까 ?', :31-36 취소(color=primary 파랑)/확인(danger), :13-18 실패 분기 없음
- 수정안: 제목을 '탈퇴하면 되돌릴 수 없어요'로, 본문에 삭제되는 데이터(스크랩, 팔로우, 알림)를 적는다. 확인 버튼을 '탈퇴하기'로 바꾸고 alert-red 토큰을 쓴다. 실패 시 스낵바로 알린다.
- 검증 메모: WithdrawModal.tsx:26 ModalHeader는 '주의', :28은 '회원탈퇴를 진행하시겠습니까 ?'이다. :31-36의 버튼은 취소(color=primary)와 확인(color=danger)이다. :13-18은 res.code가 200일 때만 처리하고 실패나 예외 분기가 없다.
- 파일: `services/web/components/common/Modal/WithdrawModal.tsx`

### A11Y-31 스낵바 색이 토큰과 다르고 흰 글자 대비 미달, 로그인 필요 안내를 오류(빨강)로 표시, 닫기 버튼 이름 없음

- 분류: minor · visual · 작업량 S · 검증 confirmed
- 사용자 영향: 성공(초록)·안내(파랑)·취소(회색) 스낵바의 흰 글자가 3.3:1·3.68:1·2.85:1로 읽기 어렵다. 로그인하지 않은 사용자가 스크랩·알림을 누르면 빨간 오류 스낵바가 떠 잘못한 것처럼 느낀다. 모든 메시지를 assertive로 읽어 다른 낭독을 끊는다. '로그인 하기' 링크는 문자열 일치로만 노출되어 문구를 바꾸면 사라진다.
- 근거: styles/globals.css:96-110 (.ERROR rgb(239 68 68), .SUCCESS rgb(22 163 74), .CANCEL rgb(153 153 153), .INFO rgb(59 130 246)); WCAG 계산 #FFF/#16A34A 3.3:1, #FFF/#3B82F6 3.68:1, #FFF/#999 2.85:1, #FFF/#EF4444 3.76:1; components/common/Snackbar/Snackbar.tsx:34 aria-live="assertive", :51 message === '로그인이 필요한 서비스입니다.', :56-62 닫기 버튼 aria-label 없음; Bill.tsx:143, NotifcationButton.tsx:21 type 'ERROR'
- 수정안: 스낵바 배경을 primary-ink(#191919) 단일 토큰으로 두고 상태는 아이콘으로 구분한다(DESIGN.md Feedback Toast). 오류만 alert-red를 쓴다. 로그인 필요는 INFO 타입과 action 필드({label:'로그인하기', href:'/login'})로 전달한다. aria-live는 polite, 오류만 role=alert로 둔다.
- 검증 메모: globals.css:96-110 스낵바 배경은 ERROR rgb(239 68 68), SUCCESS rgb(22 163 74), CANCEL rgb(153 153 153), INFO rgb(59 130 246)이다. 모두 흰 글자와의 대비가 4.5:1에 미달한다. Snackbar.tsx:34는 aria-live="assertive"이다. :51은 문자열 일치로 로그인 링크를 노출한다. :56-62 닫기 버튼에는 이름이 없다. Bill.tsx:143과 NotifcationButton.tsx:21은 로그인 필요 안내를 type 'ERROR'로 띄운다.
- 파일: `services/web/styles/globals.css`, `services/web/components/common/Snackbar/Snackbar.tsx`, `services/web/types/snackbar.ts`, `services/web/components/Bill/BillList/Bill/Bill.tsx`, `services/web/components/common/Button/NotifcationButton.tsx`

### A11Y-32 테마 판정에 theme을 써서 시스템 다크 설정·로고·정당 로고가 어긋나고, 헤더 아이콘이 하드코딩 색

- 분류: minor · visual · 작업량 M · 검증 confirmed
- 사용자 영향: 테마 전환 버튼은 마운트 전 null을 반환해 헤더 아이콘이 늦게 나타나며 자리가 밀린다. 헤더 아이콘은 다크에서 #999+검정 20% 덧칠(≈#7A7A7A)로 비활성처럼 보인다. 테마 버튼은 라이트에서 HeroUI 파랑(#016FEE), 다크에서 warning 노랑을 써 DESIGN.md의 'Mobile Active Blue는 모바일 내비 전용' 규칙과 어긋난다. 기본 테마가 light 고정이라 OS 다크 설정 사용자도 밝은 화면으로 시작한다.
- 근거: lib/provider/NextThemesProvider.tsx:8 defaultTheme="light"; components/Layout/Header/Logo.tsx:12-17·public/svgs/header/Notification.tsx:6-8·Bill.tsx:96-97·ProposerList.tsx:57-58·VoteResultBoard.tsx:18-19·CommitteeAuditList.tsx:36-37 theme === 'dark'(resolvedTheme 아님); components/common/Button/ThemeSwitchButton.tsx:24-26 mounted 전 null, :31 color warning/primary; public/svgs/common/LightMode.tsx fill="#016FEE"; public/svgs/header/Search.tsx:10-11·Notification.tsx:14-26 fill #999999 + black 0.2; DESIGN.md:196
- 수정안: useTheme().resolvedTheme 기반 useIsDark 훅 하나로 통일하고 defaultTheme='system'으로 둔다. 헤더 아이콘은 currentColor로 바꿔 text-primary-3 dark:text-gray-0.5로 칠한다. 테마 버튼은 마운트 전에도 같은 크기의 자리를 차지하게 하고 잉크 색을 쓴다. 다크 전용 로고는 CSS(dark:hidden/hidden dark:block)로 전환해 깜빡임을 없앤다.
- 검증 메모: NextThemesProvider.tsx:8은 defaultTheme="light"라서 OS 다크 설정을 따르지 않는다. ThemeSwitchButton.tsx는 마운트 전에 null을 반환해 헤더 자리가 비고, color는 warning/primary이다. LightMode.tsx fill은 #016FEE이다. Search.tsx와 Notification.tsx의 다크 분기는 #999999 위에 black 20%를 덧칠한다. 참고로 현재 UI에는 'system' 선택지가 없어서 theme과 resolvedTheme이 항상 같다. theme==='dark' 판정은 defaultTheme을 system으로 바꾸는 순간 결함이 된다.
- 파일: `services/web/lib/provider/NextThemesProvider.tsx`, `services/web/components/common/Button/ThemeSwitchButton.tsx`, `services/web/components/Layout/Header/Logo.tsx`, `services/web/public/svgs/header/Notification.tsx`, `services/web/public/svgs/header/Search.tsx`, `services/web/public/svgs/common/LightMode.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### A11Y-33 DESIGN.md 토큰과 실제 구현 불일치: 정당색 3중 정의, 하드코딩 hex, Tailwind 기본 회색, 카드 그림자, 음수 자간

- 분류: polish · visual · 작업량 L · 검증 confirmed
- 사용자 영향: 화면마다 회색·그림자·자간이 조금씩 달라 한 제품이라는 인상이 약해진다. 정당 색이 바뀌면 세 곳을 따로 고쳐야 해 어긋날 위험이 있다.
- 근거: 정당색: styles/globals.css:28-70 클래스(.더불어민주당 등), tailwind.config.js:69-81 party.*, constants/party/party.ts(DESIGN.md:203 단일 기준 명시); 하드코딩 hex 40건(renderBillSummaryMarkdown.ts 12, StatsResultComposition.tsx 5, HalfDonutChart.tsx 4, app/mypage/page.tsx:34·36 border-[#E0E0E0], TrendingKeywords.tsx:28 '#0088FF'); Tailwind 기본 팔레트 components/Feed/Feed/FollowingFeed.tsx:34 text-gray-500, :52 text-gray-400(다크 변형 없음); 그림자 CongressmanDetail.tsx:40 shadow="md", :48 shadow-lg, Bill.tsx:433 shadow="sm", CategoryGrid.tsx:33·StatsCard.tsx:27 shadow-sm(DESIGN.md:250 Card Rest none); 음수 자간 Bill.tsx:294·304 tracking-tight, mobile-floating-nav.css:470 letter-spacing:-0.01em(DESIGN.md:242); 페이지 배경 app/layout.tsx:81 dark:lg:bg-dark-pb(panel 토큰을 배경으로), TimelineBoard.tsx:24·FollowingCongressmanStrip.tsx:26 md:dark:bg-primary-3; components/ui/chart.tsx:108 stroke='#ccc' 의존
- 수정안: 정당색은 party.ts의 getPartyColor만 쓰고 globals.css 클래스와 tailwind party 색을 지운다(border는 style로 주입). hex와 text-gray-500류는 토큰 클래스로 교체하고 eslint 규칙(no-restricted-syntax로 '#[0-9a-f]{6}' 금지)을 추가한다. 정보 카드 그림자를 지우고 border로 층위를 만든다. tracking-tight를 제거한다.
- 검증 메모: 정당색이 globals.css:28 이하 클래스(.더불어민주당 border-color #152484 등), tailwind.config.js의 party.*, constants/party/party.ts 세 곳에 정의되어 있다. DESIGN.md:151·165는 party.ts를 단일 기준으로 명시한다. FollowingFeed.tsx:34·52는 text-gray-500·400을 다크 변형 없이 쓴다. Bill.tsx:294·304에 tracking-tight가 있다. CongressmanDetail은 shadow="md"와 shadow-lg를 쓴다. DESIGN.md:198·227은 정보 카드 그림자를 none으로 정한다. 보고서의 DESIGN.md 줄번호는 일부 다르지만 규칙 내용은 일치한다.
- 파일: `services/web/styles/globals.css`, `services/web/tailwind.config.js`, `services/web/constants/party/party.ts`, `services/web/components/Feed/Feed/FollowingFeed.tsx`, `services/web/app/mypage/page.tsx`, `services/web/app/explore/components/TrendingKeywords.tsx`, `services/web/app/congressman/[id]/components/Congressman/CongressmanDetail.tsx`, `services/web/components/Bill/BillList/Bill/Bill.tsx`

### A11Y-34 발의자 명단에서 두 글자 이름을 글자마다 <p>로 쪼개 스크린리더가 이름을 끊어 읽음, 정당 인원 배지가 빨간 경고색

- 분류: polish · a11y · 작업량 S · 검증 confirmed
- 사용자 영향: '김현' 같은 이름을 '김', '현' 두 단어로 읽는다. 정당별 인원 수 배지가 color="danger"(빨강)라 알림·오류처럼 보이고 DESIGN.md의 Alert Red 사용 범위를 벗어난다.
- 근거: app/bill/[id]/components/ProposerList/ProposerList.tsx:174-179 (proposer[1].split('').map(char => <p>{char}</p>)), :151 <Badge color="danger">; DESIGN.md:204
- 수정안: 이름은 한 텍스트 노드로 두고 정렬은 CSS(text-align-last: justify 또는 고정 폭 grid)로 맞춘다. 인원 배지는 무채색(primary-ink 또는 gray) 토큰으로 바꾼다.
- 검증 메모: ProposerList.tsx:174-179는 두 글자 이름을 split('')로 글자마다 <p>로 렌더하고 key={char}를 쓴다. 같은 글자가 반복되는 이름에서는 key도 중복된다. :151은 <Badge color="danger">이다. DESIGN.md:152 Alert Red의 사용 범위는 오류·경고이다.
- 파일: `services/web/app/bill/[id]/components/ProposerList/ProposerList.tsx`

### A11Y-35 진행 단계 필터 드롭다운의 선택 상태가 표시되지 않음

- 분류: polish · bug · 작업량 S · 검증 confirmed
- 사용자 영향: '전체' 드롭다운을 열어도 현재 선택 항목에 체크 표시가 나오지 않는다. 트리거는 '전체' 글자와 필터 아이콘만 있어 무엇을 거르는 필터인지 보조기기에 전달되지 않는다.
- 근거: components/Feed/StageDropdown/StageDropdown.tsx:31 selectedKeys={type}(문자열 '위원회 심사' 등을 그대로 전달 → react-stately가 new Set(string)으로 글자 단위 키를 만들어 항목 key(label)와 일치하지 않음), :22-24 트리거에 aria-label 없음
- 수정안: selectedKeys={new Set([type])}로 넘기고 트리거에 aria-label='진행 단계: {type}'을 준다.
- 검증 메모: StageDropdown.tsx:31은 selectedKeys={type}으로 문자열을 넘긴다. react-stately useMultipleSelectionState.mjs:89-91의 convertSelection은 'all'이 아니면 new Selection(selection)을 만든다. 그래서 '위원회 심사'가 글자 단위 Set이 되고 DropdownItem key(label)와 일치하지 않는다. 트리거 Button(:22-24)에도 aria-label이 없다.
- 파일: `services/web/components/Feed/StageDropdown/StageDropdown.tsx`

### A11Y-36 타임라인 상단 집계 숫자에 천 단위 구분이 없고 'D-526'에 기준 설명이 없음

- 분류: polish · copy · 작업량 S · 검증 confirmed
- 사용자 영향: '17982 / 17481 / 896'은 다른 화면('6,331건')과 숫자 표기가 달라 읽기 어렵다. 'D-526'이 무엇까지 남은 날인지(제23대 총선) 알 수 없다. 데이터가 오기 전에는 숫자 자리가 비어 있다가 채워지며 레이아웃이 흔들린다.
- 근거: app/timeline/components/TimelineBoard.tsx:31 `D-${getDDay('2028-04-11')}`, :37·41·45 billState.receipt_count 등 toLocaleString 없음, 로딩 중 빈 span; 스크린샷 타임라인 '17982 17481 896'
- 수정안: 숫자에 toLocaleString('ko-KR')을 적용하고 단위 '건'을 붙인다. D-day 옆에 '총선까지' 같은 대상을 표시하거나 '임기 만료 2028.5.29' 날짜로 바꾼다. 로딩 중에는 같은 크기의 skeleton을 둔다.
- 검증 메모: TimelineBoard.tsx:31은 `D-${getDDay('2028-04-11')}`만 표시하고 대상을 표기하지 않는다. :37·41·45의 billState.receipt_count 등에는 toLocaleString이 없다. billState가 없으면 span이 빈 채로 렌더된다.
- 파일: `services/web/app/timeline/components/TimelineBoard.tsx`

### A11Y-37 알림 본문 10px, 처리 결과 빈 상태 문구가 진행 중 법안에도 '투표 정보가 없습니다'로 표시

- 분류: polish · copy · 작업량 S · 검증 confirmed
- 사용자 영향: 모바일 알림 본문이 10px로 읽기 어렵다. 아직 접수 단계인 법안의 '법안 처리 결과'에 '투표 정보가 없습니다.'가 떠 데이터가 빠진 것처럼 보인다.
- 근거: app/notification/components/NotificationItem.tsx:78 text-[10px] md:text-sm; app/bill/[id]/components/ProcessResult/ProcessResult.tsx:84-89 default 분기 '투표 정보가 없습니다.'(bill_result 없음 = 계류 중 포함); DESIGN.md:235 Body Small 14px
- 수정안: 알림 본문을 최소 14px로 올린다. bill_result가 없으면 현재 단계(bill_stage)를 받아 '{단계} 단계에서 심사 중이에요'처럼 상태를 보여준다.
- 검증 메모: NotificationItem.tsx:78 본문은 text-[10px] md:text-sm이다. ProcessResult.tsx:84-89 default 분기는 bill_result가 없으면 진행 단계와 관계없이 '투표 정보가 없습니다.'를 표시한다. BillDetail.tsx는 '법안 처리 결과' 섹션을 항상 렌더한다.
- 파일: `services/web/app/notification/components/NotificationItem.tsx`, `services/web/app/bill/[id]/components/ProcessResult/ProcessResult.tsx`

## 사용자 여정 누락 점검 (JOURNEY)

### JOURNEY-01 모바일 플로팅 내비(z-70)가 모달, 검색 모달, 스낵바, 맨 위로 버튼 위에 그려진다

- 분류: major · bug · 작업량 M · 검증 critic
- 사용자 영향: 모바일에서 타임라인 '심사한 법안' 모달이나 회원탈퇴 확인 모달을 열면 화면 하단 내용과 버튼이 유리 내비에 가려집니다. 모달이 열린 상태에서도 내비를 눌러 다른 화면으로 이동할 수 있습니다. 스크랩과 링크 복사 뒤에 뜨는 스낵바는 홈 인디케이터가 있는 iPhone에서 아래쪽 약 32px가 내비 뒤로 들어가고, 그렇지 않은 기기에서도 내비와 2px 간격으로 붙어 보입니다. 맨 위로 버튼도 iPhone에서는 내비와 검색 FAB 뒤로 겹칩니다.
- 근거: styles/mobile-floating-nav.css:20 `.mobile-floating-nav-wrapper { z-index: 70; bottom: calc(1rem + env(safe-area-inset-bottom)) }`, :55 높이 3.875rem(62px). node_modules/@heroui/theme/dist/chunk-5WML3KKH.mjs:11-35에서 HeroUI Modal의 wrapper, base, backdrop은 모두 `z-50`입니다(TimelineModal.tsx, WithdrawModal.tsx가 사용). SearchModal.tsx:59 `z-10`. Snackbar.tsx:35 `fixed inset-0 ... py-20`이고 z-index가 없습니다. 스낵바 아래쪽 끝은 하단에서 80px이고, 내비 위쪽 끝은 safe-area가 34px일 때 16+34+62=112px입니다. GoToTopButton.tsx:35 `z-10 fixed bottom-24 right-10`에서 bottom-24는 96px로 112px보다 낮습니다. app/layout.tsx:14 `viewportFit: 'cover'` 설정 때문에 iPhone에서 env(safe-area-inset-bottom)가 0이 아닙니다.
- 수정안: z-index 계층을 토큰 하나로 정합니다(예: content < floating-nav < snackbar < modal). HeroUI Modal의 classNames.wrapper/backdrop 값이나 플로팅 내비의 z-index를 그 순서에 맞게 바꿉니다. 모달이나 검색 모달이 열려 있는 동안에는 플로팅 내비를 숨기거나 inert로 둡니다. 스낵바와 맨 위로 버튼의 bottom 값은 `calc(내비 높이 + 1rem + env(safe-area-inset-bottom) + 간격)`으로 계산하고, CSS 변수 하나를 내비와 같이 씁니다.
- 파일: `services/web/styles/mobile-floating-nav.css`, `services/web/components/common/Snackbar/Snackbar.tsx`, `services/web/components/common/Button/GoToTopButton.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`, `services/web/app/timeline/components/TimelineModal.tsx`, `services/web/components/common/Modal/WithdrawModal.tsx`, `services/web/components/Layout/Nav/Nav.tsx`

### JOURNEY-02 토큰 재발급 API가 실패해도 200 'success'를 돌려줘서 세션 만료를 클라이언트가 알 수 없다

- 분류: major · bug · 백엔드 · 작업량 M · 검증 critic
- 사용자 영향: 며칠 뒤 다시 방문해 refresh token이 만료된 사용자가 스크랩이나 팔로우를 누르면 서버는 사용자를 로그아웃 처리합니다. 그런데 응답은 성공으로 옵니다. 그래서 프런트는 로그인 화면으로 보내는 분기(handleFailReissueToken)에 들어가지 않습니다. 원래 요청은 토큰 없이 다시 보내지고, 그 결과도 호출한 쪽에 전달되지 않습니다. 사용자는 이유를 모른 채 동작이 안 되는 화면을 보게 됩니다. useRouter 오류(FEED-22/ACCOUNT-01)를 고쳐도 이 문제는 그대로 남습니다.
- 근거: AuthService.java:41-58에서 refresh 쿠키가 없거나 AuthException이 나면 `tokenService.logout(...)` 뒤 `return`합니다. AuthController.java:73-77은 무조건 `return BaseResponse.ok("success")`입니다. api/config/core.ts:52-58은 reissue POST가 resolve되면 항상 handleSuccessReissueToken으로 갑니다. api/auth/handlers.ts:17-21의 handleSuccessReissueToken은 interceptor가 없는 전역 `axios(newConfig)`로 다시 요청하고 `.then(() => router.refresh())`를 반환합니다. 그래서 재시도 결과 대신 undefined가 돌아가고, 응답 형태(`response.data` 언래핑)도 axiosInstance와 다릅니다.
- 수정안: 백엔드는 refresh 실패 시 401(AuthException.TokenNotValid/TokenNotFound)을 반환합니다. 프런트 interceptor는 reissue 요청을 재귀 처리 대상에서 빼고, 성공하면 `axiosInstance(originalConfig)`로 다시 요청해 그 결과를 반환합니다. 실패하면 쿼리 캐시를 비우고 현재 경로를 담아 `/login?next=`로 이동합니다. 라우팅은 hook 대신 window.location이나 이벤트 버스로 처리합니다. 동시에 들어온 401은 진행 중인 reissue 하나를 함께 기다리게 합니다.
- 파일: `services/backend/src/main/java/com/everyones/lawmaking/service/AuthService.java`, `services/backend/src/main/java/com/everyones/lawmaking/controller/AuthController.java`, `services/web/api/config/core.ts`, `services/web/api/auth/handlers.ts`

### JOURNEY-03 비로그인·라이트 테마 첫 방문에서도 모든 페이지가 hydration 오류(React #418)를 낸다

- 분류: major · bug · 작업량 M · 검증 critic
- 사용자 영향: 처음 방문한 사용자에게도 서버가 그린 HTML이 클라이언트 렌더와 맞지 않습니다. React는 이 경우 해당 영역을 버리고 클라이언트에서 다시 그립니다. 그 결과 첫 화면이 깜빡이거나, 서버에서 받은 피드를 버리고 다시 요청하며 스피너가 보입니다. 로그인 상태나 다크 테마와 무관하게 /login에서도 발생하므로 공통 셸에 원인이 있습니다. 기존 FEED-32, ACCOUNT-04, SHELL-22는 로그인 상태와 다크 테마 때문에 생기는 불일치만 다룹니다.
- 근거: 새 프로필로 headless Chromium(playwright chromium_headless_shell-1243)을 실행하고 GET만 보냈습니다. /, /bill/PRC_Z2Z6I0I7G0H8F1E3E0A9A3Y0A9Y8Y1, /timeline, /explore, /congressman/E6E2041D, /search/교육, /login 모두 콘솔에 `Uncaught Error: Minified React error #418; ...args[]=HTML` 1건이 찍혔습니다. 같은 방법으로 비교한 https://nextjs.org/와 https://vercel.com/에서는 오류가 0건입니다. 홈 SSR HTML(curl)에는 법안 카드가 들어 있습니다('일부개정법률안' 6회). 그런데 hydration 뒤에 클라이언트가 /v1/bill/mainfeed를 두 번, /v1/bill/popular를 한 번 다시 요청했습니다(chromium --v=1 network log). 불일치한 노드는 운영 minified 빌드에서 특정하지 못했습니다.
- 수정안: next dev에서 공통 셸(app/layout.tsx의 SearchModal, Snackbar, GoToTopButton, Nav, Header/Logo, next-themes 스크립트를 넣는 ThemeProvider)을 하나씩 끄며 hydration diff를 확인해 원인 노드를 찾습니다. 렌더 단계에서 typeof window, localStorage, getCookie, theme 값으로 분기하는 코드를 마운트 뒤 effect로 옮기거나 resolvedTheme+mounted 패턴으로 바꿉니다. 수정 뒤에는 위 7개 경로를 같은 headless 점검으로 다시 확인하는 스크립트를 CI에 둡니다.
- 파일: `services/web/app/layout.tsx`, `services/web/components/common/SearchBar/SearchModal.tsx`, `services/web/components/Layout/Nav/Nav.tsx`, `services/web/components/Layout/Header/Header.tsx`, `services/web/components/Layout/Header/Logo.tsx`, `services/web/lib/provider/NextThemesProvider.tsx`

### JOURNEY-04 카카오톡 링크 스크래퍼에는 og 메타가 </html> 뒤에 붙어 내려간다(Next.js streaming metadata)

- 분류: major · seo · 작업량 S · 검증 critic
- 사용자 영향: 국내 공유는 대부분 카카오톡에서 일어납니다. 그런데 카카오 스크래퍼 UA는 Next.js가 head에 메타를 넣어 주는 봇 목록에 없습니다. 그래서 법안 링크를 카톡에 붙였을 때 받는 HTML의 <head>에는 제목과 미리보기 정보가 없고, 문서 끝(</html> 뒤)에만 있습니다. 카카오 파서가 문서 끝의 태그를 읽지 않으면 미리보기가 사이트 기본값이나 빈 카드로 나옵니다.
- 근거: `curl -A '<UA>' https://lawdigest.kr/bill/PRC_Z2Z6I0I7G0H8F1E3E0A9A3Y0A9Y8Y1`를 보내고 첫 </head> 이전에 og:title이 있는지 셌습니다. facebookexternalhit=1, Yeti(네이버)=1, Slackbot=1, TelegramBot=1, `kakaotalk-scrap/1.0`=0, 일반 Mozilla=0입니다. 일반 응답에서는 `...</body></html><title>내부 관리 감독 강화를 위한 ... | 모두의입법</title>`처럼 메타가 문서 끝에 붙습니다. next.config.js에는 htmlLimitedBots 설정이 없습니다. 카카오 스크래퍼가 body 뒤쪽 메타를 실제로 읽는지는 확인하지 못했습니다(카카오 공유 디버거로 확인이 필요합니다).
- 수정안: next.config.js에 `htmlLimitedBots`를 지정하고 기본 목록에 `kakaotalk-scrap|Kakao` 계열 UA를 더합니다(Next.js 공식 next.config 옵션입니다). 배포한 뒤 developers.kakao.com 공유 디버거로 법안, 의원, 정당 링크의 미리보기를 확인합니다.
- 파일: `services/web/next.config.js`

### JOURNEY-05 API JSON 응답이 압축되지 않고 피드 카드마다 원문 제안이유와 공동발의자 전체 목록을 보낸다

- 분류: major · perf · 백엔드 · 작업량 M · 검증 critic
- 사용자 영향: 느린 모바일 네트워크에서 피드를 3건 불러올 때마다 약 38KB를 압축 없이 받습니다. 스크롤을 내릴 때마다 같은 크기를 다시 받으므로, 카드가 늦게 나타나고 데이터 사용량이 커집니다.
- 근거: `curl -D - -H 'Accept-Encoding: gzip, deflate, br' https://api.lawdigest.kr/v1/bill/mainfeed?page=0&stage=` 응답에 content-encoding 헤더가 없고 본문은 38150바이트입니다. 같은 요청을 Next 프록시(https://lawdigest.kr/v1/...)로 보내도 압축되지 않습니다. 한 건의 필드별 크기는 gpt_summary 6562B, public_proposer_dto_list 3771B, summary(원문 제안이유) 3283B입니다. 저장소에 server.compression 설정이나 nginx gzip 설정이 없습니다(`grep -rn compression services/backend/src/main/resources` 결과 0건). 비교로, 웹 HTML은 gzip으로 내려옵니다.
- 수정안: Spring `server.compression.enabled=true`와 `server.compression.mime-types=application/json`을 켜거나, api.lawdigest.kr nginx에 `gzip on; gzip_types application/json;`을 추가합니다. 목록 응답(mainfeed, search, 의원·정당 법안)은 카드에 필요한 필드만 담는 DTO로 나눕니다. 원문 summary와 공동발의자 전체 목록은 상세 응답에만 넣습니다.
- 파일: `services/backend/src/main/resources/application.properties`, `services/backend/src/main/java/com/everyones/lawmaking/common/dto/BillInfoDto.java`, `deploy/PROD_BACKEND_DEPLOY.md`

### JOURNEY-06 홈 첫 화면 JavaScript가 gzip 기준 약 476KB이고 HeroUI 전체 번들 청크 하나가 158KB다

- 분류: minor · perf · 작업량 L · 검증 critic
- 사용자 영향: 공유 링크로 처음 들어온 저사양 폰이나 3G 사용자는 JS를 받아 실행하는 동안 화면을 조작할 수 없습니다. 이 시간이 수 초 이어집니다.
- 근거: https://lawdigest.kr/ HTML이 참조하는 /_next/static/*.js 21개를 Accept-Encoding: gzip으로 받으면 합계 476,503바이트입니다. 가장 큰 청크는 /_next/static/chunks/1748-426076d6c04c32ae.js로, gzip 157,937B, 원본 487,942B입니다. 이 청크 안에서 'react-aria' 문자열이 22회, 'heroui'가 5회 나옵니다. 앱 코드 39개 파일이 `from '@heroui/react'` 통합 패키지를 import합니다(Snackbar, GoToTopButton, HeroUIProvider 등 루트 레이아웃 컴포넌트 포함). package.json에는 개별 @heroui/* 패키지와 통합 패키지가 함께 있습니다. chart.js, recharts, d3도 의존성에 함께 들어 있습니다.
- 수정안: import를 개별 패키지(@heroui/button 등)로 통일하고 @heroui/react를 제거합니다. 아니면 next.config의 experimental.optimizePackageImports에 '@heroui/react'를 지정합니다. 루트 레이아웃의 Snackbar와 GoToTop 같은 단순 버튼은 HeroUI 없이 구현합니다. 차트 라이브러리는 하나로 정리하고 탐색 화면에서만 동적 import합니다. @next/bundle-analyzer로 줄어든 결과를 확인합니다.
- 파일: `services/web/package.json`, `services/web/next.config.js`, `services/web/lib/provider/HeroUIProvider.tsx`, `services/web/components/common/Snackbar/Snackbar.tsx`, `services/web/components/common/Button/GoToTopButton.tsx`

### JOURNEY-07 API 요청에 타임아웃이 없고 SSR이 API 응답을 직렬로 기다린다

- 분류: minor · perf · 작업량 M · 검증 critic
- 사용자 영향: API 서버가 느려지거나 멈추면 홈과 법안 상세 링크를 연 사용자는 아무것도 없는 흰 화면을 무기한 봅니다. 클라이언트 쪽 요청도 React Query 기본값대로 세 번 재시도하므로, 오류를 알기까지 수 초가 더 걸립니다.
- 근거: api/config/core.ts:20-26의 `axios.create({ baseURL, headers, withCredentials })`에 timeout이 없습니다. 저장소 web/api, lib, next.config.js를 timeout으로 검색하면 0건입니다. app/page.tsx:10-20은 `prefetchInfiniteQuery({... pages: 3 })`로 3페이지를 순서대로 받은 다음에야 응답합니다(force-dynamic). app/bill/[id]/page.tsx:31-35는 상세 조회 뒤 `await usePatchViewCount(id)`까지 끝나야 렌더합니다. lib/provider/QueryClientProvider.tsx:11-14에는 retry 설정이 없어 기본값 3회가 적용됩니다.
- 수정안: 서버용과 클라이언트용 axios 인스턴스에 timeout을 둡니다(예: SSR 3초, 클라이언트 10초). SSR은 첫 페이지만 기다리고 나머지는 Suspense 스트리밍으로 넘깁니다. 조회수 증가는 응답을 기다리지 않는 클라이언트 요청으로 옮깁니다(DETAIL-25 수정과 함께). React Query의 retry는 1회 이하로 하고, 4xx는 재시도하지 않게 설정합니다.
- 파일: `services/web/api/config/core.ts`, `services/web/app/page.tsx`, `services/web/app/bill/[id]/page.tsx`, `services/web/lib/provider/QueryClientProvider.tsx`, `services/web/lib/getQueryClient.tsx`

### JOURNEY-08 검색 모달이 화면 이동 뒤에도 열려 있고 배경 스크롤이 잠기지 않는다

- 분류: minor · ux · 작업량 S · 검증 critic
- 사용자 영향: 법안 상세나 검색 결과에서 검색 모달을 연 상태로 플로팅 내비의 '타임라인'을 누르거나 브라우저 뒤로 가기를 하면, 주소는 바뀌는데 모달은 새 화면 위에 그대로 남습니다. 모달이 열린 동안에는 손가락으로 쓸면 뒤의 페이지가 스크롤됩니다.
- 근거: searchModalState(store/SearchModalState.tsx:7)는 전역 jotai atom입니다. 이 값을 reset하는 곳은 SearchModal.tsx:21(닫기 버튼), :32(칩 클릭), SearchBar.tsx:47(제출) 세 곳뿐입니다. pathname 변경이나 popstate에 반응하는 코드가 없습니다(`grep -rn searchModalState app components store hooks lib` 결과). SearchModal.tsx:59의 루트는 `fixed inset-0 ... z-10`이고, body overflow를 제어하는 코드가 없습니다(`grep overflow components/common/SearchBar` 0건). 플로팅 내비는 z-70이라 모달 위에서 눌립니다(JOURNEY-01).
- 수정안: usePathname 변경을 감지해 searchModalState를 reset합니다. 모달을 열 때 history에 항목을 하나 넣어 뒤로 가기가 모달 닫기로 동작하게 합니다. 모달은 HeroUI Modal이나 dialog 요소로 바꿔 스크롤 잠금과 포커스 가두기를 함께 얻습니다.
- 파일: `services/web/components/common/SearchBar/SearchModal.tsx`, `services/web/store/SearchModalState.tsx`, `services/web/components/common/SearchBar/SearchBarButton.tsx`

### JOURNEY-09 태블릿·데스크톱에서 헤더가 고정되지 않아 스크롤하면 내비게이션이 사라진다

- 분류: minor · ux · 작업량 S · 검증 critic
- 사용자 영향: 768px 이상에서는 하단 플로팅 내비가 숨겨지고 헤더가 유일한 내비게이션입니다. 그런데 헤더가 문서와 함께 올라가므로, 피드나 법안 상세를 내려 읽던 태블릿 사용자는 다른 탭으로 가려면 맨 위까지 돌아가야 합니다. 탐색 사이드바는 고정 헤더가 있다고 가정한 위치에 붙어 위쪽에 빈틈이 생깁니다.
- 근거: styles/mobile-floating-nav.css:563-566 `@media (min-width: 48rem) { .mobile-floating-nav-wrapper { display: none; } }`. components/Layout/Header/Header.tsx:47에서 `<Navbar position="static" ...>`을 씁니다. app/explore/components/ExploreSidebar.tsx:14에서 `sticky top-[112px]`을 씁니다. 헤더가 static이라 스크롤 뒤에는 상단에 112px 빈 공간이 남습니다. 820px headless 캡처(검색 결과, 법안 상세)에서 헤더가 md:h-[98px] 높이로 문서 위쪽에만 있는 것을 확인했습니다.
- 수정안: md 이상에서 Header를 `position="sticky"`로 바꾸고 높이를 64px 안팎으로 줄입니다. 스크롤 방향에 따라 숨기거나 보여 주는 동작은 플로팅 내비와 같은 기준으로 맞춥니다. 탐색 사이드바의 top 값은 헤더 높이 CSS 변수를 씁니다.
- 파일: `services/web/components/Layout/Header/Header.tsx`, `services/web/app/explore/components/ExploreSidebar.tsx`, `services/web/styles/mobile-floating-nav.css`

### JOURNEY-10 플로팅 내비의 축소·확장을 스크롤 위치가 아니라 손가락 좌표로 판단하고, touchmove마다 리스너를 다시 등록한다

- 분류: minor · ux · 작업량 S · 검증 critic
- 사용자 영향: 가로 캐러셀을 넘기거나, 스크롤이 없는 짧은 화면을 살짝 끌어도 내비가 작아집니다. 맨 위로 돌아와도 작아진 상태가 유지됩니다. 본문 링크로 다른 화면에 가도 작아진 상태가 이어집니다. 스크롤 중에는 이벤트마다 상태 업데이트와 리스너 재등록이 일어나 저사양 기기에서 스크롤이 버벅일 수 있습니다.
- 근거: components/Layout/Nav/Nav.tsx:128-137의 handleTouchMove는 `setIsCompact(currentTouch < lastScrollTop); setLastScrollTop(...)`로 touches[0].clientY만 비교합니다. 새 제스처의 첫 move는 이전 제스처의 마지막 좌표와 비교됩니다. :138-144의 effect deps가 `[lastScrollTop]`이라 touchmove마다 wheel/touchmove 리스너를 지웠다 다시 답니다. wheel 핸들러(:124-127)는 `deltaY > 0`만 봅니다. window.scrollY가 0일 때 펼치는 처리와 pathname 변경 시 펼치는 처리가 없습니다. 내비 버튼 onClick(:231-238)에서만 setIsCompact(false)를 호출합니다.
- 수정안: window scroll 이벤트에서 scrollY 변화량에 임계값(예: 8px)을 두고 방향을 판단합니다. scrollY<=0이면 항상 펼칩니다. 마지막 위치는 ref로 보관해 리스너는 한 번만 등록합니다(passive). pathname이 바뀌면 isCompact를 false로 되돌립니다.
- 파일: `services/web/components/Layout/Nav/Nav.tsx`

### JOURNEY-11 대표발의자가 여러 명인 법안 카드에서 의원 이름이 링크처럼 보이지만 이동하지 않는다

- 분류: minor · ux · 작업량 S · 검증 critic
- 사용자 영향: 공동 대표발의 법안 카드에 'A·B 의원'이 링크 요소로 렌더됩니다. 그런데 누르면 아무 일도 일어나지 않아 각 의원 페이지로 갈 방법이 없습니다. 같은 정당 의원이 둘 이상이면 정당 로고가 같은 key로 겹쳐 렌더됩니다.
- 근거: components/Bill/BillList/Bill/Bill.tsx:217-232에서 `<Link href={isRepresentativeSolo ? '/congressman/..' : {}} onClick={(e) => { if (!isRepresentativeSolo) e.preventDefault(); }}>`가 이름 전체를 감쌉니다. 대표발의자가 여럿이면 이름들을 `join('·')`한 한 덩어리가 클릭을 막은 링크가 됩니다. :154-155에서 정당 Avatar 목록은 `key={party_id}`라, 같은 정당 대표발의자가 둘 이상이면 key가 중복됩니다. 아바타(:436-452)도 isRepresentativeSolo일 때만 나옵니다.
- 수정안: 대표발의자를 한 명씩 각자의 /congressman/{id} 링크로 렌더하고 가운뎃점으로 구분합니다. 정당 로고는 party_id로 중복을 제거한 뒤 그립니다. 링크가 아닌 텍스트는 a 요소로 감싸지 않습니다.
- 파일: `services/web/components/Bill/BillList/Bill/Bill.tsx`

### JOURNEY-12 OAI-SearchBot과 GPTBot에 법안·의원·정당·검색 페이지를 429로 막는다

- 분류: minor · seo · 작업량 S · 검증 critic
- 사용자 영향: ChatGPT 검색에서 법안 이름으로 찾는 시민에게 모두의입법 페이지가 인용되지 않습니다. robots.txt가 없어서(SHELL-16) 봇 운영자는 이 차단을 정책이 아니라 서버 과부하 오류(429 Too Many Requests)로 받습니다.
- 근거: services/web/middleware.ts:3 `BLOCKED_BOT_PATTERN = /(GPTBot|OAI-SearchBot)/i`, :19-25에서 /bill/, /party/, /congressman/, /search, /_next/data/에 `status: 429, 'Retry-After': '120'`을 반환합니다. 의도적인 부하 대책인지 확인하지 못했습니다.
- 수정안: 학습용 수집(GPTBot)과 검색 인용(OAI-SearchBot)을 나눠 정책을 정합니다. 차단할 대상은 robots.txt(app/robots.ts)에 Disallow로 선언합니다. 부하가 문제라면 429 대신 rate limit을 nginx 수준에서 적용합니다. 검색 노출을 원하면 OAI-SearchBot은 허용합니다.
- 파일: `services/web/middleware.ts`, `services/web/app/robots.ts`

### JOURNEY-13 웹 응답에 HSTS·frame 차단 헤더가 없고 서버 버전과 프레임워크 이름이 노출된다

- 분류: polish · trust · 작업량 S · 검증 critic
- 사용자 영향: API(api.lawdigest.kr)에는 보안 헤더가 있습니다. 사용자가 실제로 여는 웹(lawdigest.kr)에는 없습니다. 다른 사이트가 iframe으로 감싸 클릭재킹에 쓸 수 있고, 첫 http 접속이 HSTS로 보호되지 않습니다. 보안 점검 도구에서 낮은 등급을 받아 신뢰도가 떨어집니다.
- 근거: `curl -sI https://lawdigest.kr/` 응답 헤더에 `server: nginx/1.18.0 (Ubuntu)`와 `x-powered-by: Next.js`가 있습니다. strict-transport-security, x-frame-options, content-security-policy는 없습니다. 반면 `curl -D - https://api.lawdigest.kr/v1/bill/mainfeed...`에는 `strict-transport-security: max-age=31536000 ; includeSubDomains`, `x-frame-options: DENY`, `x-content-type-options: nosniff`가 있습니다.
- 수정안: next.config.js에 `poweredByHeader: false`를 둡니다. headers()에서 Strict-Transport-Security, X-Frame-Options(또는 CSP frame-ancestors 'none'), X-Content-Type-Options, Referrer-Policy를 추가합니다. nginx에서는 `server_tokens off;`를 설정합니다.
- 파일: `services/web/next.config.js`, `deploy/PROD_WEB_DEPLOY.md`

## 반박되어 제외한 항목

| ID | 제목 | 제외 이유 |
| --- | --- | --- |
| SEARCH-15 | 다크 모드에서 검색 모달 입력 글자가 거의 보이지 않음 | HeroUI input 테마(node_modules/@heroui/theme/dist/chunk-3ZDIPBHM.mjs compoundVariants, variant flat + color default)가 input에 'group-data-[has-value=true]:text-default-foreground'를 붙인다. tailwind-merge는 수 |
| SEARCH-31 | 테마 판별이 system 설정을 무시해 다크 모드에서 정당 로고와 헤더 돋보기가 밝은 버전으로 나옴 | NextThemesProvider.tsx:8 defaultTheme="light"이고 ThemeSwitchButton.tsx:18,20 은 setTheme('light')/setTheme('dark')만 호출한다. 앱 안에서 theme가 'system'이 되는 경로가 없어서 보고된 'OS 다크 모드(system) 사용자' 시나리오가 생기지 않는다. Sear |
| SHELL-18 | 축소(compact) 상태의 모바일 내비 탭을 눌러도 아무 일이 없다 | 보고된 `.mobile-floating-nav.is-compact .mobile-floating-nav__item { pointer-events: none; }` 규칙은 현재 main(48c52a4)의 styles/mobile-floating-nav.css에 없습니다. 239-244줄 compact 규칙은 width, height, padding, gap만 |
| PROFILE-02 | 이미 팔로우한 로그인 사용자에게도 '팔로우 하기'가 뜬다 (SSR 데이터에 인증이 빠짐) | 보고서의 핵심 경로가 운영 데이터와 맞지 않는다. 운영 HTML /congressman/CCU1009B와 /party/1의 HydrationBoundary state는 `{"mutations":[],"queries":[]}`다. generateMetadata가 가져온 익명 응답은 클라이언트로 dehydrate되지 않는다. 클라이언트 QueryClient는  |
| DETAIL-28 | 좁은 휴대폰에서 발의자 명단 5열 그리드와 300px 고정 차트가 카드 폭을 넘음 (코드 계산 근거) | 계산 근거가 틀렸다. Tailwind grid-cols-5는 repeat(5, minmax(0,1fr))이다. 열은 이름 폭으로 늘어나지 않고 가용 폭만큼 줄어든다. 루트 최소폭 360px에서 열 폭은 (360-40 mx-5 -24 CardBody -80 배지와 gap -40 열 gap)/5 = 약 35px이다. 14px 세 글자 이름은 약 42px이다.  |

## 감사자가 기록한 강점

- [SEARCH] 모바일 플로팅 검색 바는 encodeURIComponent로 검색어를 인코딩하고, 입력 글꼴을 16px로 두어 iOS 확대를 막는다. 열 때 220ms 뒤 입력에 포커스하고, 닫기 버튼에는 aria-label='검색 닫기'가 있다(Nav.tsx:76, 82-89, 326-334, mobile-floating-nav.css:466).
- [SEARCH] 탐색 화면의 '지금 뜨는 키워드'는 encodeURIComponent로 검색 링크를 만들고, 데이터가 없으면 섹션을 숨긴다(TrendingKeywords.tsx:14, 26).
- [SEARCH] 법안 검색은 FULLTEXT 인덱스(BillSearchDocument)와 ingest_status='READY' 필터를 쓴다. 일반 키워드는 0.1~0.5초에 응답한다(curl 소방 0.46s, 민주 0.16s, 국민의힘 0.12s).
- [SEARCH] 법안 검색 결과를 SSR HTML에 포함해 첫 화면에 바로 그린다(curl /search/소방 본문에 법안 카드 텍스트가 있음).
- [SEARCH] 로그인 사용자는 검색 결과 법안에도 북마크 상태가 반영된다(SearchFacade.setBillListResponseBookMark).
- [SEARCH] 정당 이미지가 없으면 PartyLogoReplacement로 대체한다(SearchParty.tsx:16-28). 중복 법안은 filterUniqueBills로 제거한다(BillList.tsx:21).
- [FEED] 피드 첫 화면이 SSR로 실제 법안 텍스트를 렌더한다. 운영 HTML에 제목·요약·발의자가 들어 있어 검색 엔진이 읽을 수 있다.
- [FEED] 요약 마크다운을 dangerouslySetInnerHTML 없이 React 노드로 렌더한다(SafeBillSummaryHtml.tsx). 테스트(SafeBillSummaryHtml.test.tsx, renderBillSummaryMarkdown.test.ts)가 있다.
- [FEED] 용어 풀이 툴팁이 뷰포트 경계를 계산해 위치를 고정하고 포커스·호버 모두에서 열린다(SafeBillSummaryHtml.tsx:158-177).
- [FEED] 정부 제출 법안과 위원장 대안을 의원 발의와 구분해 로고·명칭·행정부 이름으로 보여 준다(Bill.tsx:74-94, 169-188, 264-280).
- [FEED] AI 요약 본문 자체는 '~하려는 내용이에요' 같은 시민 언어로 쓰여 있고 굵게 표시·용어 풀이가 이해를 돕는다.
- [FEED] filterUniqueBills로 페이지 경계 중복 카드를 제거하고 테스트로 고정했다.
- [FEED] 발의자 명단을 팝오버로 바로 열어 상세 페이지에 가지 않고도 공동발의자를 확인할 수 있다.
- [FEED] 운영 API 응답이 빠르다(mainfeed 약 0.12초, popular 약 0.09초).
- [ACCOUNT] OAuth 성공 핸들러가 redirect_uri를 허용 목록(host/port)과 대조해 임의 외부 리다이렉트를 막는다(OAuth2AuthenticationSuccessHandler.java:85-97).
- [ACCOUNT] 리프레시 토큰 쿠키는 HttpOnly·Secure로 발급된다(CookieUtil.java:26-35).
- [ACCOUNT] 로그인 버튼이 SSR된 실제 <a> 링크라 JS 로딩 전에도 키보드로 누를 수 있다(curl /login HTML에서 role=button tabindex=0 href 확인).
- [ACCOUNT] NotificationTopThree는 읽음·삭제 결과에 따라 성공/실패 스낵바를 구분해 보여준다(NotificationTopThree.tsx:27-63). 이 기준을 알림 페이지에 그대로 적용하면 된다.
- [ACCOUNT] 알림 mutation이 목록·개수·top3 쿼리를 함께 무효화한다(app/notification/apis/queries.ts:76-80 등).
- [ACCOUNT] 회원 탈퇴 백엔드는 스크랩·팔로우·알림·검색어를 함께 삭제하고 소셜 계정 연결 해제까지 한 트랜잭션으로 처리한다(UserFacade.java:46-98).
- [ACCOUNT] 피드 팔로잉 탭은 비로그인 안내와 로그인 버튼, 결과 0건 문구를 갖추고 있다(FollowingFeed.tsx:31-53).
- [ACCOUNT] 팔로우한 의원 목록이 길면 ExpandableList로 접고 펼친다(mypage/components/Congressman/CongressmanList.tsx:25-31).
- [EXPLORE] 통계 카드 대부분이 최종 크기에 가까운 스켈레톤(SkeletonBar)을 쓰고 StatsCard·StatsOverview는 useReducedMotion으로 등장 애니메이션을 끕니다.
- [EXPLORE] 정당 색을 모든 차트·아바타·좌석도에서 getPartyColor 단일 레지스트리로 가져와 DESIGN.md 'Party Color Is Data' 원칙을 지킵니다.
- [EXPLORE] 반원 좌석도는 좌석 수에 따라 행 수와 행별 좌석을 계산하는 순수 함수(lib/hemicycle.ts)로 분리되어 있고 단위 테스트(hemicycle.test.ts, seatingOrder.test.ts)가 있습니다.
- [EXPLORE] 좌석도에서 정당을 누르면 좌석이 직사각형으로 재배치되고 상세 패널 폭 전환과 같은 easing으로 이어져 상호작용 품질이 높습니다. 범례 버튼으로도 같은 동작을 할 수 있습니다.
- [EXPLORE] 분야 카드는 button과 aria-pressed로 선택 상태를 노출하고, 선택 인디케이터가 layoutId로 카드 사이를 이동합니다.
- [EXPLORE] 정당 로고는 다크 모드용 이미지를 분기하고(getPartyLogoSrc) 가로형 로고를 원형으로 자르지 않아 정당 표식이 정확합니다.
- [EXPLORE] 모바일은 밑줄형 서브탭, 데스크톱은 좌측 사이드바로 같은 탭 정의(tabs.ts)를 공유해 화면 크기별 구조가 일관됩니다.
- [EXPLORE] 추이 차트는 발의(수천)와 가결(수십)의 크기 차이를 고려해 y축을 분리하고, 연도가 바뀌는 달에만 연도를 붙이는 축 라벨을 씁니다.
- [EXPLORE] 위원회 막대는 축에는 짧은 이름, 툴팁에는 전체 이름을 보여 줘 긴 위원회 이름을 처리합니다.
- [SHELL] 존재하지 않는 경로는 실제 HTTP 404와 `<meta name="robots" content="noindex">`를 반환합니다(curl /nonexistent-page-xyz).
- [SHELL] 법안 상세는 generateMetadata로 '법안 요약 제목 | 모두의입법' 형식의 제목, 발의일·단계가 들어간 설명, canonical을 SSR로 제공합니다. 의원·정당 상세도 같은 구조입니다.
- [SHELL] `<html lang="ko">`, viewport-fit=cover, 플로팅 내비의 `env(safe-area-inset-bottom)` 처리로 노치 기기 하단 여백을 고려합니다.
- [SHELL] 모바일 검색 입력은 16px 글자 크기로 iOS 자동 확대를 막았고, backdrop-filter 미지원 브라우저용 @supports fallback이 있습니다.
- [SHELL] Nav를 루트 레이아웃에 두어 페이지 전환 중에도 하단 내비 상태와 애니메이션이 유지됩니다. 검색 열기/닫기 버튼에는 aria-label이 있고 활성 탭에 aria-current를 지정합니다.
- [SHELL] http → https 301 리다이렉트가 설정되어 있습니다.
- [SHELL] Pretendard 한 가족을 dynamic subset CSS로 불러와 DESIGN.md의 One Family Rule을 지킵니다.
- [SHELL] 데스크톱 상단 내비는 활성 탭 뒤 레인보우 테두리와 semibold 라벨로 현재 위치를 글 없이 레이아웃으로 표시합니다.
- [SHELL] 홈과 법안 상세 HTML에 본문 텍스트가 SSR로 포함되어 검색 엔진과 느린 기기에서도 내용이 보입니다.
- [A11Y] html lang="ko"가 루트에 지정되어 있다(services/web/app/layout.tsx:64).
- [A11Y] 모바일 하단 탭과 탐색 사이드바가 aria-current로 현재 위치를 알린다(Nav.tsx:254, ExploreSidebar.tsx:23).
- [A11Y] 탐색 서브탭·국회 세그먼트·통계 기간 전환은 role=tablist/tab과 aria-selected를 갖췄고, 분야 카드는 aria-pressed로 선택 상태를 전달한다(ExploreSubTabs.tsx, AssemblySegment.tsx, StatsTrendArea.tsx:73-79, CategoryGrid.tsx:31).
- [A11Y] 의석 분포 SVG에 role=img와 재적 의석 aria-label이 있고, 범례 버튼으로 마우스 없이도 정당 포커스를 조작할 수 있다(SeatDistribution.tsx).
- [A11Y] 통계 카드와 개요 카운트업은 useReducedMotion으로 모션 감소 설정을 존중한다(StatsCard.tsx:18, StatsOverview.tsx).
- [A11Y] 요약의 법률 용어 툴팁이 button + aria-label('용어: 정의')로 구현되어 키보드 포커스와 마우스 hover 모두에서 정의를 보여준다(SafeBillSummaryHtml.tsx:192-205).
- [A11Y] 법안·의원·정당 상세 페이지는 getMetadata로 '{제목} | 모두의입법' 제목, 개별 설명, canonical, og:url을 만든다(curl 확인).
- [A11Y] 모바일 검색 입력을 16px로 두어 iOS 자동 확대를 막았다(mobile-floating-nav.css 주석).
- [A11Y] dark: 변형이 245곳에 적용되어 대부분 화면의 다크 모드 기반은 갖춰져 있고, 쉬운 요약의 강조·헤딩 하이라이트는 .dark 규칙을 따로 둔다(globals.css:135-171).
- [A11Y] 정당색을 데이터로만 쓰는 원칙과 getPartyColor 레지스트리가 DESIGN.md에 명확히 정의되어 있어 정리의 기준이 이미 있다.
- [A11Y] 쉬운 요약 본문은 해요체로 일관되고 굵게·하이라이트로 핵심어를 드러내 시민이 읽기 쉽다(스크린샷 확인).
- [PROFILE] generateMetadata가 의원명·정당명으로 페이지별 title, og:title, canonical을 만든다(예: '이해식 의원 | 모두의입법', canonical https://www.lawdigest.kr/congressman/CCU1009B).
- [PROFILE] 프로필 핵심 정보(이름, 지역구, 선수, 통계, 기본정보, 첫 법안 카드)가 SSR HTML에 들어 있어 첫 화면 텍스트가 바로 보이고 검색엔진이 읽을 수 있다.
- [PROFILE] 의원 페이지 PartyLogo는 party_image_url이 null이면 PartyLogoReplacement(정당색 dot과 이름)로 대체해 무소속 의원 프로필이 정상 렌더된다.
- [PROFILE] 비로그인 사용자가 팔로우를 누르면 '로그인이 필요한 서비스입니다.' 스낵바에 '로그인 하기' 링크가 함께 나와 다음 행동이 명확하다.
- [PROFILE] 정당색은 getPartyColor로 일원화되어 있고 알 수 없는 정당·빈 값에 중립 fallback을 쓴다. 테스트(constants/party/party.test.ts)도 있다.
- [PROFILE] 의원 상세 API가 나이·성별·전화·이메일·의원회관·약력·소속 위원회를 제공하고, 279명 중 전화·이메일·약력 누락은 각각 4~6명 수준으로 데이터 충실도가 높다.
- [PROFILE] 정당 이미지(wide/dark)는 원내 7개 정당 모두 버킷에 존재해 다크 모드 전용 로고 자산이 준비되어 있다.
- [TIMELINE] 날짜 → 단계(본회의·공포·위원회·접수) → 법안 순서의 세로 타임라인 구조가 국회 절차를 시간순으로 읽게 해 준다.
- [TIMELINE] 위원회 심사를 위원회 단위로 묶고 위원회별 건수를 함께 보여 준다.
- [TIMELINE] 모든 법안 행이 /bill/{id} 상세로, 정당 표식이 /party/{id}로 연결되어 상세 정보로 돌아가는 경로가 있다.
- [TIMELINE] 타임라인 피드 본문은 서버에서 렌더되어 첫 HTML에 법안 제목과 발의자 텍스트가 포함된다.
- [TIMELINE] 목록 모달은 HeroUI Modal을 써서 포커스 이동과 ESC 닫기 같은 기본 접근성 동작을 갖춘다.
- [TIMELINE] AI 요약 제목(bill_title)과 발의자 표기('박덕흠의원 등 10인')가 카드마다 일관되게 노출된다.
- [TIMELINE] 백엔드 응답은 snake_case로 일관되고 페이지네이션 last_page로 무한 스크롤 종료 조건을 처리한다.
- [TRUST] 피드·분야 목록 쿼리가 제목과 AI 요약이 없는 법안을 제외한다(BillRepositoryImpl.java:83,93 hasText). 최근 500건 표본에서 요약·제목 누락이 0건이다.
- [TRUST] 피드 표본 500건의 bill_id가 모두 고유해 중복 노출이 없다. 클라이언트에도 filterUniqueBills 방어 로직이 있다.
- [TRUST] 공동발의자 'N인' 표기가 500건 중 499건에서 명단 수와 일치한다. 무소속 정당 로고 null은 PartyLogoReplacement로 대체한다.
- [TRUST] 법안 상세에 AI 요약 주의 문구와 국회 원문 링크가 고정 배치되어 있다(Bill.tsx:404-420).
- [TRUST] 법안 상세 메타 설명이 발의일·단계·법안명을 담아 법안마다 다르게 생성된다(bill/[id]/page.tsx:19-23).
- [TRUST] 지금 뜨는 키워드는 데이터가 없으면 섹션 전체를 숨겨 빈 껍데기를 노출하지 않는다(TrendingKeywords.tsx:14).
- [TRUST] 조회수 PATCH가 실패해도 상세 응답의 view_count로 대체해 페이지가 깨지지 않는다(bill/[id]/page.tsx:32-34).
- [TRUST] 정부 발의와 위원장 대안 발의를 구분해 정부 로고·위원회 이름으로 표시한다(Bill.tsx:169-188, 264-280).
- [TRUST] 통계 API(/statistics/*)는 22대 국회와 READY 상태로 모집단을 일관되게 제한한다(StatisticsRepository.java).
- [DETAIL] 페이지 <title>과 og:title·twitter:title에 법안별 실제 제목이 들어간다(https://lawdigest.kr/bill/PRC_Z2Z6... 확인). 일반 페이지 응답은 0.1~0.17초로 빠르다.
- [DETAIL] AI 요약 아래에 '원문 확인하기' 주요 버튼과 AI 주의 문구가 있어 원문으로 돌아가는 경로가 항상 보인다. 원문 URL은 API bill_link와 동일하다.
- [DETAIL] 요약 렌더러가 dangerouslySetInnerHTML 없이 React 노드로 파싱하고(SafeBillSummaryHtml.tsx), <mark>·굵게·목록·소제목만 허용한다. 렌더러 단위 테스트(SafeBillSummaryHtml.test.tsx, renderBillSummaryMarkdown.test.ts)가 있다.
- [DETAIL] gpt_summary의 '쉬운 요약 → 주요 내용 → 왜 나왔나 → 무엇이 달라지나 → 누구에게 영향 → 봐야 할 점' 구성이 시민 언어로 잘 정리되어 있고, 상세에서는 접지 않고 전체를 보여 준다.
- [DETAIL] 정부안(대한민국 정부·정부 로고)과 위원장안(위원회명·위원회 로고)을 일반 의원안과 구분해 처리하고, 위원회 로고 매핑과 특별위원회 대체 로고가 있다(utils/chairmanProposer.ts, governmentProposer.ts, 테스트 포함).
- [DETAIL] 공동발의자를 정당별로 묶고 정당·의원 페이지로 연결해 깊은 탐색으로 이어진다. 정당 로고는 로컬 자산과 다크 변형을 우선 사용한다(getPartyLogoSrc.ts).
- [DETAIL] 법률용어 툴팁은 button 요소로 구현되어 키보드 포커스·aria-label을 갖추고, 뷰포트 경계 안으로 위치를 보정한다(SafeBillSummaryHtml.tsx:158-205).
- [DETAIL] 유사 법안이 0건일 때 빈 상태 문구가 있고, 처리 결과(대안반영폐기·임기만료폐기·철회)별로 시민 언어 설명 카드가 있다.
- [JOURNEY] 법안 상세는 SSR HTML에 본문과 법안별 제목(`내부 관리 감독 강화를 위한 ... | 모두의입법`)이 들어 있습니다. 첫 응답이 약 0.06초(TTFB)이고, 페이스북·네이버(Yeti)·슬랙·텔레그램 스크래퍼에는 og 메타가 head에 들어갑니다.
- [JOURNEY] http→https 301 리다이렉트가 동작합니다. /_next/static 자산은 `public, max-age=31536000, immutable`로 캐시되고 HTML은 gzip으로 내려옵니다.
- [JOURNEY] OAuth redirect_uri가 세 공급자 모두 apex 도메인(https://lawdigest.kr/login/...)으로 일관됩니다.
- [JOURNEY] 820px 태블릿 폭에서 법안 상세 2단 배치(본문 / 발의자·단계·결과)와 검색 결과 카드 배치가 깨지지 않습니다(headless 캡처로 확인).
- [JOURNEY] 플로팅 내비는 드래그로 탭을 전환하고, 검색을 펼칠 때 입력창에 포커스를 줍니다. 모바일 상호작용의 기본 골격은 갖춰져 있습니다.
