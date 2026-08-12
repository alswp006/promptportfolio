# SPEC — PromptPortfolio

## Common Principles
- **플랫폼**: Vite + React + TypeScript, TDS(@toss/tds-mobile) 전용 UI, react-router-dom 클라이언트 라우팅, localStorage 영속화.
- **인증**: 토스 세션 자동 제공. 별도 로그인 함수 호출 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 연동 상태만 확인.
- **결제(IAP)**: 프롬프트 구매는 템플릿 `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} .../>`. Stripe 등 외부 결제 금지.
- **광고**: 배너 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, 보상형 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>...</TossRewardAd>`. 콘텐츠와 겹치지 않게 섹션 사이/결과 하단 배치.
- **네비게이션**: 하단 4탭은 템플릿 `src/components/FloatingTabBar`(마켓/라이브러리/판매/정산). 상단 콘텐츠 전환은 TDS Tab.
- **색상**: HEX 하드코딩 금지 → `var(--tds-color-*)` 또는 TDS 컴포넌트만. 다크모드 지원 필수.
- **외부 이동**: `window.location.href`/`window.open`로 외부 URL 이동 금지. 외부 분석 툴(GA/Amplitude) 금지.
- **AI 고지**: 본 MVP의 "결과 미리보기"는 판매자가 사전 첨부한 **정적 샘플 텍스트**이며, 앱이 실시간으로 AI를 호출·생성하지 않는다. 따라서 생성형 AI 고지 의무 대상이 아니다(런타임 AI 생성 기능이 추가되면 F에 AI 고지 AC를 편입한다).
- **금액 단위**: 모든 금액은 원(₩) 정수. 정산 수수료 20%(플랫폼) → 판매자 순수익 80%.

## Data Models

### Prompt — 판매 프롬프트
| field | type | 제약 |
|---|---|---|
| id | `string` | uuid, PK |
| title | `string` | 1~40자, 필수 |
| category | `PromptCategory` | 아래 enum 중 1 |
| jobRole | `string` | 1~20자 (예: "퍼포먼스 마케터") |
| body | `string` | 20~2000자, 실제 프롬프트 본문 |
| sampleOutput | `string` | 10~1000자, 정적 AI 출력 샘플 |
| priceWon | `number` | 0 또는 1000~50000 정수 (0=무료) |
| sellerId | `string` | 판매자 식별자 |
| sellerName | `string` | 1~20자 |
| version | `number` | 1부터 시작, 수정 시 +1 |
| usedCount | `number` | 사용(복사) 횟수, 기본 0 |
| createdAt | `number` | epoch ms |
| updatedAt | `number` | epoch ms |

```ts
type PromptCategory = '마케팅' | '재무' | 'PM' | '법무' | '개발' | '디자인' | 'HR' | '기타';

interface Prompt {
  id: string;
  title: string;
  category: PromptCategory;
  jobRole: string;
  body: string;
  sampleOutput: string;
  priceWon: number;
  sellerId: string;
  sellerName: string;
  version: number;
  usedCount: number;
  createdAt: number;
  updatedAt: number;
}
```

### Purchase — 구매 기록
```ts
interface Purchase {
  promptId: string;
  pricePaidWon: number;
  purchasedAt: number;   // epoch ms
}
```

### SaleRecord — 판매(정산) 기록
```ts
interface SaleRecord {
  id: string;
  promptId: string;
  promptTitle: string;
  grossWon: number;      // 판매가
  commissionWon: number; // grossWon * 0.2 (내림)
  netWon: number;        // grossWon - commissionWon
  soldAt: number;        // epoch ms
}
```

### localStorage 키 / 데이터 형태 / 크기
| key | shape | 크기 추정 |
|---|---|---|
| `pp.prompts` | `Prompt[]` | 프롬프트 1건 ≈ 3.5KB, 500건 ≈ 1.75MB |
| `pp.purchases` | `Purchase[]` | 1건 ≈ 80B, 1000건 ≈ 80KB |
| `pp.sales` | `SaleRecord[]` | 1건 ≈ 200B, 1000건 ≈ 200KB |
| `pp.usedCounts` | `Record<string, number>` | promptId→count, 500건 ≈ 25KB |
| `pp.flags` | `{ onboardedSeller?: boolean }` | < 1KB |
> 합계 상한 시나리오 ≈ 2.1MB < 5MB. 저장 실패(QuotaExceededError) 시 에러 처리 AC 적용.

## Feature List

### F1. 데이터 계층 & localStorage 저장소
- **Description**: 앱 전체가 사용하는 Prompt/Purchase/SaleRecord CRUD 헬퍼와 시드 데이터를 제공한다. 모든 읽기/쓰기는 이 계층을 통과하며 JSON 파싱 실패·용량 초과를 방어한다. UI 없는 순수 로직 패킷이다.
- **Data**: Prompt, Purchase, SaleRecord, usedCounts, flags
- **API**: 없음(내부 localStorage)
- **Requirements**:
- AC-1 [U][P0]: Scenario: 저장소 초기화
  - Given `pp.prompts` 키가 비어있을 때
  - When 앱이 최초 로드됨
  - Then 최소 8건의 시드 Prompt(카테고리 8종 각 1건 이상)가 `pp.prompts`에 저장됨
- AC-2 [E][P0]: Scenario: 프롬프트 저장
  - Given 저장소 헬퍼가 초기화됨
  - When `savePrompt({ title:"광고 카피 3안", category:"마케팅", priceWon:3000, ... })` 호출
  - Then `pp.prompts` 배열에 id가 부여된 항목이 1건 추가되고 `createdAt`/`updatedAt`이 동일 값으로 설정됨
- AC-3 [E][P0]: Scenario: 사용 횟수 증가
  - Given `usedCount:0`인 프롬프트 id="p1"
  - When `incrementUsed("p1")` 호출
  - Then `pp.usedCounts["p1"]`가 1이 되고 해당 Prompt의 `usedCount`가 1로 갱신됨
- AC-4 [W][P1]: Scenario: 손상된 JSON 복구
  - Given `pp.prompts`에 `"{invalid"` 문자열이 저장됨
  - When 저장소 read 헬퍼 호출
  - Then 예외를 던지지 않고 빈 배열을 반환하며 시드로 재초기화됨
- AC-5 [W][P1]: Scenario: 용량 초과 처리
  - Given `localStorage.setItem`이 QuotaExceededError를 던지는 상황
  - When `savePrompt` 호출
  - Then `{ ok:false, error:"저장 공간이 부족합니다" }`를 반환하고 앱이 크래시하지 않음
- AC-6 [U][P1]: Scenario: 빈 목록 상태값
  - Given `pp.purchases`가 빈 배열일 때
  - When `getPurchases()` 호출
  - Then `[]`를 반환함(null/undefined 아님)
- AC-7 [U][P0]: Scenario: 콘솔 에러 0개
  - Given 프로덕션 빌드 실행
  - When F1 헬퍼 전체 경로 실행
  - Then `console.error` 출력이 0건임

### F2. 마켓 홈 · 카테고리 탐색
- **Description**: 등록된 프롬프트를 카드 리스트로 노출하고 직무 카테고리 Tab과 검색으로 필터링한다. 각 카드는 제목·카테고리·직무·가격·사용횟수를 표시한다. 상단 배너 광고를 리스트 섹션 사이에 배치한다.
- **Data**: Prompt (read), usedCounts
- **API**: 없음
- **Requirements**:
- AC-1 [U][P0]: Scenario: 목록 렌더
  - Given `pp.prompts`에 12건이 있을 때
  - When 마켓 홈(`/`) 진입
  - Then TDS ListRow 기반 카드 12개가 렌더되고 각 카드에 가격(₩ 또는 "무료")과 `사용 N회`가 표시됨
- AC-2 [E][P0]: Scenario: 카테고리 필터
  - Given TDS Tab에 카테고리 8종이 있을 때
  - When "재무" Tab 탭
  - Then `category==="재무"`인 프롬프트만 노출되고 그 외는 숨김
- AC-3 [E][P1]: Scenario: 검색
  - Given 검색어 입력(TDS TextField)
  - When "카피" 입력
  - Then title 또는 jobRole에 "카피"를 포함한 프롬프트만 표시(대소문자 무시)
- AC-4 [S][P1]: Scenario: 로딩 상태
  - While 저장소 read가 완료되기 전
  - Then TDS Skeleton(또는 로딩 인디케이터)가 표시되고 카드 리스트는 렌더되지 않음
- AC-5 [W][P1]: Scenario: 빈 검색 결과
  - Given "존재하지않음zzz" 검색
  - When 결과가 0건
  - Then Asset.ContentIcon과 "검색 결과가 없어요" 안내가 표시되고 카드 리스트 영역은 비어있음
- AC-6 [U][P2]: Scenario: 배너 광고 배치
  - Given 마켓 홈 렌더
  - Then `<AdSlot>` 배너가 리스트 상단 섹션과 카드 리스트 사이에 1회 배치되며 카드와 겹치지 않음
- AC-7 [U][P1]: Scenario: 긴 리스트 스크롤
  - Given 프롬프트 200건
  - When 홈 스크롤
  - Then 세로 스크롤로 전체 탐색 가능하고 터치 타깃(카드) 높이 ≥ 44px

### F3. 프롬프트 상세 · 결과 미리보기(보상형 광고 게이트)
- **Description**: 프롬프트 상세에서 제목·직무·설명·가격·버전·사용횟수를 보여준다. 무료 프롬프트의 샘플 출력은 보상형 광고 시청 후 공개하고, 프롬프트 본문 전체는 무료면 즉시/유료면 구매 후 공개한다. 본문 복사 시 사용 횟수를 증가시킨다.
- **Data**: Prompt(read), Purchase(read), usedCounts
- **API**: 없음
- **Requirements**:
- AC-1 [U][P0]: Scenario: 상세 렌더
  - Given `/prompt/:id`로 id="p1" 진입
  - When 화면 로드
  - Then title, jobRole, sampleOutput 자리(가림), `v{version}`, `사용 {usedCount}회`, 가격이 Card 안에 표시됨
- AC-2 [E][P0]: Scenario: 결과 미리보기 전 보상형 광고
  - Given 무료/유료 무관 프롬프트 상세에서 sampleOutput이 가려진 상태
  - When 사용자가 "샘플 결과 보기" 버튼 탭 후 `<TossRewardAd>` 광고 시청 완료
  - Then sampleOutput 전문이 Card에 표시됨
- AC-3 [S][P0]: Scenario: 유료 본문 잠금
  - While 해당 promptId가 `pp.purchases`에 없고 priceWon>0인 동안
  - Then 프롬프트 body는 흐림/마스킹되고 "구매하고 전체 보기" 버튼이 노출됨
- AC-4 [E][P0]: Scenario: 본문 복사 시 사용횟수 증가
  - Given 구매 완료(또는 무료) 프롬프트
  - When "프롬프트 복사" 버튼 탭
  - Then 클립보드에 body가 복사되고 성공 토스트 "복사했어요" 표시, `usedCount`가 1 증가함
- AC-5 [W][P1]: Scenario: 존재하지 않는 상세
  - Given `/prompt/nope` 진입
  - When 해당 id 프롬프트 없음
  - Then "프롬프트를 찾을 수 없어요" 안내와 "마켓으로" 버튼(→ `navigate('/')`)이 표시됨
- AC-6 [W][P1]: Scenario: 광고 로드 실패
  - Given `<TossRewardAd>` 광고 로드 실패
  - When "샘플 결과 보기" 탭
  - Then 에러 토스트 "광고를 불러오지 못했어요" 표시, sampleOutput은 계속 가려진 상태 유지
- AC-7 [S][P1]: Scenario: 로딩 상태
  - While 상세 데이터 read 중
  - Then TDS Skeleton 카드가 표시됨
- AC-8 [U][P0]: Scenario: 레이아웃 계약
  - Given 상세 화면 렌더
  - Then ScreenScaffold로 감싸이고 `data-testid="prompt-detail-card"` Card와 `data-testid="price-hero"`(가격 강조 t2~t3 타이포)를 포함하며, 1차 액션 버튼은 SubmitFooter 하단 고정 `display="block"`임

### F4. 프롬프트 구매 (IAP)
- **Description**: 유료 프롬프트를 토스 IAP로 결제하고, 결제 성공 시 Purchase 및 판매자 SaleRecord(수수료 20% 반영)를 기록한다. 구매 완료 후 상세 본문 잠금이 해제된다.
- **Data**: Purchase(write), SaleRecord(write), Prompt(read)
- **API**: 없음(TossPurchase 컴포넌트)
- **Requirements**:
- AC-1 [E][P0]: Scenario: 구매 성공
  - Given priceWon=3000, id="p1" 유료 프롬프트 상세
  - When `<TossPurchase>` 결제 성공 → `processProductGrant` 실행
  - Then `pp.purchases`에 `{ promptId:"p1", pricePaidWon:3000 }`가 추가되고 성공 토스트 "구매 완료" 표시
- AC-2 [E][P0]: Scenario: 판매 정산 기록 생성
  - Given AC-1 구매 성공
  - When grant 처리
  - Then `pp.sales`에 `{ grossWon:3000, commissionWon:600, netWon:2400 }` SaleRecord 1건이 추가됨
- AC-3 [S][P0]: Scenario: 구매 후 잠금 해제
  - While promptId="p1"이 `pp.purchases`에 존재하는 동안
  - Then 상세 body가 전체 노출되고 "구매하고 전체 보기" 버튼은 "프롬프트 복사"로 대체됨
- AC-4 [W][P1]: Scenario: 중복 구매 방지
  - Given `pp.purchases`에 promptId="p1"이 이미 있음
  - When 상세 재진입
  - Then 구매 버튼 대신 "구매함" 상태가 표시되고 TossPurchase 버튼은 렌더되지 않음
- AC-5 [W][P1]: Scenario: 결제 취소
  - Given 결제 진행 중 사용자가 취소
  - When `<TossPurchase>` onError/취소 콜백
  - Then Purchase/SaleRecord 미기록, 토스트 "결제가 취소되었어요" 표시
- AC-6 [W][P1]: Scenario: 무료 프롬프트 구매 차단
  - Given priceWon=0 프롬프트
  - When 상세 진입
  - Then TossPurchase 버튼이 노출되지 않고 "무료" 배지와 즉시 복사 버튼만 표시됨
- AC-7 [U][P0]: Scenario: 외부 결제 금지
  - Given 결제 플로우
  - Then Stripe/외부 결제 링크·`window.open` 호출이 존재하지 않음

### F5. 프롬프트 등록 (판매자 업로드)
- **Description**: 판매자가 제목·카테고리·직무·본문·샘플출력·가격을 입력해 새 프롬프트를 등록한다. 첫 등록 시 판매자 온보딩 안내를 1회 표시한다. 유효성 검사를 통과해야 저장된다.
- **Data**: Prompt(write), flags
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 등록 성공
  - Given 판매 폼(`/sell`)에서 `{ title:"광고 카피 3안", category:"마케팅", jobRole:"퍼포먼스 마케터", body:"(20자 이상)...", sampleOutput:"(10자 이상)...", priceWon:3000 }` 입력
  - When "등록하기" 탭
  - Then `pp.prompts`에 version=1, usedCount=0으로 추가되고 성공 토스트 후 `navigate('/prompt/{id}')`
- AC-2 [W][P1]: Scenario: 빈 제목 거부
  - Given title=""
  - When "등록하기" 탭
  - Then 에러 메시지 "제목을 입력해주세요" 표시, 저장되지 않음
- AC-3 [W][P1]: Scenario: 본문 길이 미달 거부
  - Given body 길이 5자
  - When "등록하기" 탭
  - Then 에러 메시지 "프롬프트 본문은 20자 이상이어야 해요" 표시
- AC-4 [W][P1]: Scenario: 가격 범위 검증
  - Given priceWon=500
  - When "등록하기" 탭
  - Then 에러 메시지 "가격은 0원 또는 1,000~50,000원이어야 해요" 표시
- AC-5 [E][P1]: Scenario: 판매자 첫 등록 온보딩
  - Given `pp.flags.onboardedSeller`가 없음
  - When `/sell` 최초 진입
  - Then AlertDialog "수수료 20%가 차감되어 정산돼요" 안내가 1회 표시되고 확인 시 `onboardedSeller:true` 저장
- AC-6 [E][P1]: Scenario: 모바일 키보드
  - Given TDS TextField(제목/본문) 포커스
  - When 키보드 노출
  - Then 포커스된 입력 필드가 키보드에 가려지지 않게 스크롤되고 body는 멀티라인 입력 가능
- AC-7 [S][P1]: Scenario: 등록 중 로딩
  - While 저장 처리 중
  - Then "등록하기" 버튼이 로딩/비활성 상태가 되어 중복 제출이 차단됨
- AC-8 [W][P1]: Scenario: 앱 설치 유도 금지
  - Given 등록 화면 문구
  - Then "앱 설치/다운로드" 유도 텍스트·배너·외부 링크가 존재하지 않음

### F6. 판매자 수익 정산 대시보드
- **Description**: 판매 기록을 집계해 총 매출·순수익(80%)·수수료·판매 건수를 시각화한다. 히어로 숫자와 최근 판매 내역 리스트를 제공한다. 판매 데이터가 없으면 빈 상태를 안내한다.
- **Data**: SaleRecord(read)
- **API**: 없음
- **Requirements**:
- AC-1 [U][P0]: Scenario: 정산 집계
  - Given `pp.sales`에 netWon 2400/4000 두 건
  - When 정산(`/dashboard`) 진입
  - Then 순수익 합계 "6,400원", 판매 2건, 총 매출/수수료가 표시됨
- AC-2 [U][P0]: Scenario: 히어로 표현 계약
  - Given 대시보드 렌더
  - Then `data-testid="net-hero"` SummaryHero가 순수익을 CountUp t2~t3 강조 타이포로 표시하고 Card로 묶임
- AC-3 [O][P2]: Scenario: 판매 추이 시각화
  - Where 판매 건수 ≥ 2
  - Then 최근 판매 netWon 추이를 Sparkline으로 표시함
- AC-4 [W][P1]: Scenario: 빈 정산 상태
  - Given `pp.sales`가 빈 배열
  - When `/dashboard` 진입
  - Then Asset.ContentIcon과 "아직 판매 내역이 없어요" 안내가 표시되고 히어로 숫자는 "0원"
- AC-5 [S][P1]: Scenario: 로딩 상태
  - While sales read 중
  - Then TDS Skeleton 히어로/리스트가 표시됨
- AC-6 [U][P1]: Scenario: 내역 리스트
  - Given 판매 3건
  - Then TDS ListRow로 각 건의 promptTitle·netWon·판매일이 표시되고 최신순 정렬됨
- AC-7 [U][P0]: Scenario: HEX 하드코딩 금지
  - Given 대시보드 스타일
  - Then 색상은 `var(--tds-color-*)`/TDS 컴포넌트만 사용하며 `#RRGGBB` 리터럴이 없음

### F7. 내 라이브러리 (구매 프롬프트 · 버전/사용 통계)
- **Description**: 구매했거나 무료로 확보한 프롬프트를 모아 보여주고, 각 항목의 버전과 사용(복사) 횟수를 표시한다. 항목 탭 시 상세로 이동한다. 항목이 없으면 빈 상태를 안내한다.
- **Data**: Purchase(read), Prompt(read), usedCounts
- **API**: 없음
- **Requirements**:
- AC-1 [U][P0]: Scenario: 라이브러리 렌더
  - Given `pp.purchases`에 promptId="p1","p2"
  - When 라이브러리(`/library`) 진입
  - Then p1,p2 카드가 TDS ListRow로 표시되고 각 카드에 `v{version}`·`사용 {usedCount}회`가 표시됨
- AC-2 [E][P0]: Scenario: 상세 이동
  - Given 라이브러리 카드
  - When 카드(터치 타깃 ≥ 44px) 탭
  - Then `navigate('/prompt/{id}')`로 이동
- AC-3 [W][P1]: Scenario: 빈 라이브러리
  - Given `pp.purchases`가 빈 배열
  - When `/library` 진입
  - Then Asset.ContentIcon과 "구매한 프롬프트가 없어요" + "마켓 둘러보기" 버튼(→`/`) 표시
- AC-4 [W][P1]: Scenario: 삭제된 원본 처리
  - Given 구매 목록에 promptId="pX"가 있으나 `pp.prompts`에 없음
  - When 라이브러리 렌더
  - Then "삭제된 프롬프트" 라벨 카드로 표시되고 탭 시 이동하지 않음
- AC-5 [S][P1]: Scenario: 로딩 상태
  - While read 중
  - Then TDS Skeleton 리스트가 표시됨
- AC-6 [U][P1]: Scenario: 정렬
  - Given 구매 3건
  - Then 최근 구매(purchasedAt desc)순으로 정렬됨

## Screen Definitions

### S1. 마켓 홈 — `/` (F2)
- **TDS**: Top(타이틀), Tab(카테고리 8종), TextField(검색), ListRow(카드), Chip(가격/무료 배지), Paragraph.Text, Spacing, `<AdSlot>` 배너, FloatingTabBar
- **골격**: ScreenScaffold(PageShell) 사용, raw div 금지. 카드 리스트는 세로 스크롤.
- **상태**: 로딩=Skeleton 카드 6개 / 빈=Asset.ContentIcon+"검색 결과가 없어요" / 에러=토스트 후 시드 재초기화
- **터치**: 카드 높이 ≥ 44px, Tab 각 ≥ 44px
- **네비게이션 계약**:
  - Outgoing: 카드 탭 → `navigate('/prompt/' + id)` (state 없음, id는 URL param)
  - Incoming: `location.state = undefined`

### S2. 프롬프트 상세 — `/prompt/:id` (F3, F4)
- **TDS**: Top, Card, Paragraph.Text, Chip(카테고리/버전/무료), Button, BottomSheet(구매 확인 선택), Toast, Spacing, `<TossRewardAd>`, `<TossPurchase>`, SubmitFooter
- **골격**: ScreenScaffold + 하단 SubmitFooter 고정. `data-testid="prompt-detail-card"`, `data-testid="price-hero"`(가격 t2~t3 강조).
- **상태**: 로딩=Skeleton 카드 / 빈(없는 id)="프롬프트를 찾을 수 없어요"+마켓 버튼 / 에러(광고 실패)=토스트, 샘플 가림 유지
- **터치**: "샘플 결과 보기"/"프롬프트 복사"/구매 버튼 각 높이 ≥ 44px, `display="block"`
- **네비게이션 계약**:
  - Incoming: URL param `:id: string`, `location.state = undefined`
  - Outgoing: 등록 후 진입 시 없음 / "마켓으로" → `navigate('/')`

### S3. 판매 등록 — `/sell` (F5)
- **TDS**: Top, TextField(제목/직무/본문 멀티라인/샘플출력/가격), Tab 또는 Chip(카테고리 선택), Button, AlertDialog(온보딩), Toast, Spacing, SubmitFooter
- **골격**: ScreenScaffold + SubmitFooter "등록하기" `display="block"` 하단 고정
- **상태**: 로딩=등록 버튼 비활성 / 빈=초기 폼 / 에러=필드별 인라인 에러 메시지
- **키보드**: 포커스 필드 키보드 위로 스크롤, body 멀티라인
- **네비게이션 계약**:
  - Outgoing: 등록 성공 → `navigate('/prompt/' + newId)` (state 없음, id는 URL param)
  - Incoming: `location.state = undefined`

### S4. 정산 대시보드 — `/dashboard` (F6)
- **TDS**: Top, Card, SummaryHero(순수익 CountUp), Sparkline(추이), ListRow(판매 내역), Paragraph.Text, Spacing, FloatingTabBar
- **골격**: ScreenScaffold. `data-testid="net-hero"` SummaryHero Card + 판매 내역 리스트.
- **상태**: 로딩=Skeleton 히어로/리스트 / 빈=Asset.ContentIcon+"아직 판매 내역이 없어요"+"0원" / 에러=빈 배열 폴백
- **터치**: 내역 ListRow ≥ 44px
- **네비게이션 계약**:
  - Outgoing: 없음(집계 전용) — 필요 시 내역 탭 → `navigate('/prompt/' + promptId)`
  - Incoming: `location.state = undefined`

### S5. 내 라이브러리 — `/library` (F7)
- **TDS**: Top, ListRow(카드), Chip(버전/사용횟수), Button("마켓 둘러보기"), Paragraph.Text, Spacing, FloatingTabBar
- **골격**: ScreenScaffold. 세로 스크롤 리스트.
- **상태**: 로딩=Skeleton 리스트 / 빈=Asset.ContentIcon+"구매한 프롬프트가 없어요"+버튼 / 에러(삭제 원본)="삭제된 프롬프트" 카드
- **터치**: 카드 ≥ 44px
- **네비게이션 계약**:
  - Outgoing: 카드 탭 → `navigate('/prompt/' + id)`; "마켓 둘러보기" → `navigate('/')`
  - Incoming: `location.state = undefined`

## API Contract
외부 API 없음 — 모든 데이터는 localStorage 영속화, 결제는 TossPurchase(IAP), 광고는 AdSlot/TossRewardAd 컴포넌트로 처리한다. (향후 프롬프트 원격 동기화가 필요하면 별도 Railway API 서버를 설계하고 응답 에러는 `{ error: string }` 통일 형태를 사용한다.)

## Assumptions
- "결과 미리보기"는 판매자가 등록 시 첨부하는 정적 샘플 텍스트이며 앱이 런타임에 AI를 호출하지 않는다 → 생성형 AI 고지 의무 비대상.
- 판매자와 구매자는 동일 토스 세션에서 역할을 겸할 수 있다(MVP는 단일 디바이스 localStorage 기준, 서버 없는 데모 정산).
- 팀 플랜(B2B 구독)·크로스 디바이스 동기화는 MVP 범위 외(서버 필요) — 추후 별도 서버 도입 시 확장.
- 정산 수수료는 20% 고정, 순수익 = gross - floor(gross*0.2).
- 프롬프트 삭제/수정 기능은 MVP 범위 외(등록·조회·구매·정산·라이브러리 우선). version 필드는 향후 수정 기능을 위한 예약 필드.

## Open Questions
1. 팀 플랜(월 ₩29,000 구독)은 IAP 구독 SKU가 필요한데 MVP에 포함할지, 별도 서버 정산이 필수라 후속 릴리스로 미룰지?
2. 실제 AI 출력 샘플을 판매자가 붙여넣는 방식 대신 앱이 직접 생성해준다면 외부 LLM API + 서버 + 생성형 AI 고지 AC가 필요 — 로드맵에 넣을지?
3. 크로스 디바이스에서 구매/정산 데이터를 유지하려면 외부 API 서버가 필요 — 단일 디바이스 데모로 충분한지 확정 필요.
4. 무료 프롬프트 샘플에 보상형 광고 게이트를 두는 정책이 UX상 과한지(무료인데 광고) 검토 필요.