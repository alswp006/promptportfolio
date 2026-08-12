The validation errors come from the field labels being wrapped in bold markdown (`**DoD**:`) instead of the plain template format (`- DoD:`). I'll rewrite using the exact template field labels.

# TASK — PromptPortfolio

## Epic 1. TypeScript Types + Interfaces

### Task 1.1 데이터 모델 & RouteState 타입 정의
- Description: 앱 전역 엔티티(Prompt, Purchase, SaleRecord)와 보조 타입(PromptCategory, UsedCounts, Flags), 저장소 헬퍼 반환형(`SaveResult = { ok:true; id:string } | { ok:false; error:string }`), 그리고 페이지 간 이동 계약 `RouteState`를 순수 타입으로만 정의한다. 런타임 코드 없음.
- DoD:
  - `src/lib/types.ts`에 `Prompt`(SPEC 필드 12종 정확히), `Purchase`, `SaleRecord`, `PromptCategory`(8종 유니온), `Flags`, `UsedCounts = Record<string, number>` export
  - `SaveResult` 유니온 타입 export (성공/실패 판별 가능)
  - `RouteState` export — 모든 라우트가 `location.state = undefined` 계약(카드/등록 후 이동은 URL param 사용)이므로 다음 형태 포함: `export type RouteState = { "/": undefined; "/prompt/:id": undefined; "/sell": undefined; "/dashboard": undefined; "/library": undefined; };`
  - `npx tsc --noEmit` 통과, 파일에 import 문 외 실행 코드 0줄
- Covers: (타입 기반 — 전 F 공통 계약, 런타임 AC 없음)
- Files: `src/lib/types.ts`
- Depends on: none

Risk (Epic 1) — Complexity: Low / Risk factors: RouteState가 실제 네비게이션 계약과 어긋나면 하위 페이지가 잘못된 캐스팅을 하게 됨 / Mitigation: SPEC의 모든 화면이 `state=undefined`(id는 URL param)로 통일돼 있어 RouteState를 undefined로 고정 → 페이지에서 `useParams`만 사용하도록 강제, state 오사용 원천 차단.

---

## Epic 2. Data Layer (localStorage)

### Task 2.1 저장소 기반 헬퍼 (안전 read/write, 손상·용량 방어)
- Description: 모든 store가 통과하는 저수준 헬퍼 `safeRead<T>(key, fallback)` / `safeWrite(key, value): SaveResult`를 구현한다. JSON 파싱 실패와 QuotaExceededError를 방어하고 console.error를 발생시키지 않는다.
- DoD:
  - `safeRead`: 값 없음/`"{invalid"` 등 파싱 실패 시 예외 없이 `fallback` 반환
  - `safeWrite`: 성공 시 `{ ok:true }`, `QuotaExceededError`(및 `name==='QuotaExceededError'`) catch 시 `{ ok:false, error:"저장 공간이 부족합니다" }` 반환, 크래시 없음
  - 두 함수 모두 내부에서 `console.error` 호출 없음 (에러는 반환값으로만 표현)
  - `npx tsc --noEmit` 통과
- Covers: [F1-AC4, F1-AC5, F1-AC7]
- Files: `src/lib/storage.ts`
- Depends on: Task 1.1

### Task 2.2 프롬프트 store + 시드 데이터
- Description: `pp.prompts`에 대한 CRUD와 시드 초기화를 구현한다. 카테고리 8종 각 1건 이상, 총 8건 이상의 시드를 제공한다.
- DoD:
  - `ensureSeeded()`: `pp.prompts` 비었거나 손상 시 8종 카테고리 각 1건 포함 ≥8건 시드 저장 (`safeRead` 손상 폴백 후 재초기화 경로 포함)
  - `getPrompts(): Prompt[]` 항상 배열 반환, `getPromptById(id): Prompt | undefined`
  - `savePrompt(input): SaveResult`: `crypto.randomUUID()` id 부여, `version=1`, `usedCount=0`, `createdAt===updatedAt`(동일 epoch ms) 설정 후 배열에 1건 추가
  - `npx tsc --noEmit` 통과
- Covers: [F1-AC1, F1-AC2]
- Files: `src/lib/promptStore.ts`, `src/lib/seed.ts`
- Depends on: Task 2.1

### Task 2.3 구매·정산·사용횟수 store + 정산 계산
- Description: `pp.purchases`, `pp.sales`, `pp.usedCounts`, `pp.flags` store와 정산 파생 계산을 구현한다.
- DoD:
  - `getPurchases(): Purchase[]` 빈 값일 때 `[]` 반환(null/undefined 아님), `addPurchase(promptId, pricePaidWon)`
  - `incrementUsed(id)`: `pp.usedCounts[id]` +1 **및** 해당 Prompt의 `usedCount` +1 갱신
  - `recordSale(prompt)`: `commissionWon = Math.floor(gross*0.2)`, `netWon = gross-commission`인 SaleRecord 1건 `pp.sales`에 추가
  - `getSales(): SaleRecord[]`, `getFlags()/setOnboardedSeller()` 구현
  - `npx tsc --noEmit` 통과
- Covers: [F1-AC3, F1-AC6]
- Files: `src/lib/purchaseStore.ts`, `src/lib/settlement.ts`
- Depends on: Task 2.1, Task 2.2

Risk (Epic 2) — Complexity: Medium / Risk factors: ①손상 JSON/용량초과가 앱을 크래시시킬 수 있음 ②usedCount 이중 소스(usedCounts 맵 ↔ Prompt.usedCount) 불일치 / Mitigation: 기반 헬퍼(2.1)를 먼저 완성해 모든 store가 방어 계층을 공유; incrementUsed를 단일 함수에 캡슐화(2.3)해 두 소스를 원자적으로 갱신.

---

## Epic 3. Core UI Pages

### Task 3.1 마켓 홈 페이지 `/` (F2)
- Description: 프롬프트 카드 리스트 + 카테고리 Tab + 검색 + 배너 광고 + 상태(로딩/빈) 화면. ScreenScaffold + FloatingTabBar.
- DoD:
  - `getPrompts()` 로드해 TDS ListRow 카드로 렌더, 각 카드에 가격(`₩` 또는 "무료" Chip)과 `사용 N회` 표시, 카드 높이 ≥44px
  - TDS Tab 카테고리 8종 → 선택 시 `category` 일치 항목만 노출(각 Tab ≥44px)
  - TextField 검색어가 title 또는 jobRole에 포함(대소문자 무시)되는 항목만 표시
  - read 완료 전 Skeleton 카드 6개 표시(카드 리스트 미렌더), 결과 0건 시 `Asset.ContentIcon`+"검색 결과가 없어요"
  - `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID}/>`를 상단 섹션과 카드 리스트 사이 1회 배치(카드와 겹침 없음)
  - 카드 탭 → `navigate('/prompt/'+id)` (state 없음); 200건 이상에서도 세로 스크롤 탐색 가능
- Covers: [F2-AC1, F2-AC2, F2-AC3, F2-AC4, F2-AC5, F2-AC6, F2-AC7]
- Files: `src/pages/MarketHome.tsx`
- Depends on: Task 2.2

### Task 3.2 프롬프트 상세 — 렌더·샘플 광고 게이트·복사 (F3)
- Description: `/prompt/:id` 상세 카드, 보상형 광고 후 sampleOutput 공개, 본문 복사 시 usedCount 증가. 유료 본문 마스킹 표시(구매 로직은 3.3).
- DoD:
  - `useParams`로 id 조회. **없는 id면 크래시 없이** "프롬프트를 찾을 수 없어요"+"마켓으로"(→`navigate('/')`) 렌더 (state/param 방어; 직접 URL/새로고침 진입 시에도 크래시 없음)
  - `data-testid="prompt-detail-card"` Card에 title·jobRole·`v{version}`·`사용 {usedCount}회`·가격 표시, `data-testid="price-hero"` 가격 t2~t3 강조
  - "샘플 결과 보기" → `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 시청 완료 시 sampleOutput 전문 Card 표시; 광고 실패 시 토스트 "광고를 불러오지 못했어요" + 가림 유지
  - priceWon>0 & 미구매 시 body 마스킹 + "구매하고 전체 보기" 버튼(3.3에서 실동작 연결); 무료/구매 시 "프롬프트 복사" → 클립보드 복사 + "복사했어요" 토스트 + `incrementUsed`
  - read 중 Skeleton 카드, ScreenScaffold + SubmitFooter 하단 고정 `display="block"` 버튼(≥44px)
- Covers: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC6, F3-AC7, F3-AC8]
- Files: `src/pages/PromptDetail.tsx`
- Depends on: Task 2.3

### Task 3.3 프롬프트 상세 — 구매(IAP)·정산 기록 연동 (F4)
- Description: 상세 화면에 TossPurchase 결제·구매/판매 기록·잠금 해제 로직을 추가한다.
- DoD:
  - priceWon>0 & 미구매 시 `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} processProductGrant={...} onPurchased={...}/>` 노출; `processProductGrant`에서 `addPurchase(id, priceWon)` + `recordSale(prompt)`(gross 3000→commission 600/net 2400 형태) 기록 후 "구매 완료" 토스트
  - 결제 취소/onError 시 Purchase·SaleRecord 미기록 + "결제가 취소되었어요" 토스트
  - `pp.purchases`에 이미 있으면 TossPurchase 미렌더 + "구매함" 표시 + 본문 전체 노출, 버튼은 "프롬프트 복사"로 대체
  - priceWon=0이면 TossPurchase 미노출, "무료" 배지 + 즉시 복사 버튼만
  - 코드에 Stripe/`window.open`/외부 결제 링크 없음
- Covers: [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC6, F4-AC7]
- Files: `src/pages/PromptDetail.tsx` (Task 3.2 확장)
- Depends on: Task 3.2, Task 2.3

### Task 3.4 판매 등록 페이지 `/sell` (F5)
- Description: 판매자 프롬프트 등록 폼 + 유효성 + 온보딩 다이얼로그.
- DoD:
  - TextField(제목/직무/본문 멀티라인/샘플출력/가격) + Tab/Chip 카테고리 선택, ScreenScaffold + SubmitFooter "등록하기" `display="block"`
  - 유효성: 빈 제목→"제목을 입력해주세요"; body<20자→"프롬프트 본문은 20자 이상이어야 해요"; priceWon이 0도 아니고 1000~50000도 아니면→"가격은 0원 또는 1,000~50,000원이어야 해요" (필드별 인라인, 미저장)
  - 통과 시 `savePrompt`(version=1, usedCount=0) 후 성공 토스트 → `navigate('/prompt/'+newId)`
  - `pp.flags.onboardedSeller` 없으면 최초 진입 시 AlertDialog "수수료 20%가 차감되어 정산돼요" 1회 표시, 확인 시 `setOnboardedSeller()`
  - 저장 처리 중 "등록하기" 로딩/비활성(중복 제출 차단); 포커스 필드 키보드에 안 가려지게 스크롤·body 멀티라인
  - 화면 문구에 "앱 설치/다운로드" 유도·외부 링크 없음
- Covers: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6, F5-AC7, F5-AC8]
- Files: `src/pages/SellPrompt.tsx`
- Depends on: Task 2.2, Task 2.3

### Task 3.5 정산 대시보드 페이지 `/dashboard` (F6)
- Description: 판매 집계 히어로 + 추이 Sparkline + 최근 내역 + 빈 상태.
- DoD:
  - `getSales()` 로드 후 순수익 합계(예: 2400+4000→"6,400원"), 판매 건수, 총매출/수수료 표시
  - `data-testid="net-hero"` SummaryHero가 순수익 CountUp t2~t3 강조, Card로 묶임
  - 판매 ≥2건 시 최근 netWon 추이 Sparkline 표시
  - 빈 배열 시 `Asset.ContentIcon`+"아직 판매 내역이 없어요", 히어로 "0원" (크래시 없음)
  - 내역은 TDS ListRow로 promptTitle·netWon·판매일 최신순 정렬(≥44px), read 중 Skeleton, 색상은 `var(--tds-color-*)`/TDS만 — `#RRGGBB` 리터럴 없음
- Covers: [F6-AC1, F6-AC2, F6-AC3, F6-AC4, F6-AC5, F6-AC6, F6-AC7]
- Files: `src/pages/Dashboard.tsx`
- Depends on: Task 2.3

### Task 3.6 내 라이브러리 페이지 `/library` (F7)
- Description: 구매/무료 확보 프롬프트 목록 + 버전/사용 통계 + 빈·삭제원본 상태.
- DoD:
  - `getPurchases()` 기준 각 promptId를 `getPromptById`로 조인해 TDS ListRow 카드로 표시, `v{version}`·`사용 {usedCount}회` 표시
  - 카드 탭(≥44px) → `navigate('/prompt/'+id)`
  - 빈 배열 시 `Asset.ContentIcon`+"구매한 프롬프트가 없어요"+"마켓 둘러보기"(→`/`)
  - 원본이 `pp.prompts`에 없으면 "삭제된 프롬프트" 라벨 카드로 표시 & 탭 시 이동 안 함(크래시 없음)
  - read 중 Skeleton 리스트, purchasedAt desc 정렬
- Covers: [F7-AC1, F7-AC2, F7-AC3, F7-AC4, F7-AC5, F7-AC6]
- Files: `src/pages/Library.tsx`
- Depends on: Task 2.3

Risk (Epic 3) — Complexity: High / Risk factors: ①상세가 F3+F4로 무거워 한 패킷 초과 위험 ②없는 id/삭제된 원본 조인에서 undefined `.map`/속성 접근 크래시(실사고 유형) / Mitigation: 상세를 3.2(렌더·광고·복사)와 3.3(구매)로 분리; 모든 페이지 DoD에 "state/param 없이 직접 진입해도 크래시 없이 폴백 렌더" 기준을 명시(3.2·3.5·3.6).

---

## Epic 4. Integration + Landing

### Task 4.1 라우팅 배선 · 탭 네비 · 진입점 통합
- Description: react-router-dom 라우터에 5개 페이지를 연결하고, FloatingTabBar(마켓/라이브러리/판매/정산)를 배선하며, 앱 부팅 시 시드 초기화를 1회 실행한다. 최종 UX 점검.
- DoD:
  - `createBrowserRouter`(또는 `<Routes>`)에 `/`, `/prompt/:id`, `/sell`, `/dashboard`, `/library` 라우트 등록, 미매칭 경로는 `/`로 리다이렉트
  - 앱 마운트 시 `ensureSeeded()` 1회 호출(F1-AC1 부팅 경로), 이후 홈에 시드 카드 렌더
  - `src/components/FloatingTabBar`를 4탭(마켓→`/`, 라이브러리→`/library`, 판매→`/sell`, 정산→`/dashboard`)에 연결, 현재 경로 활성 표시
  - 전체 `npm run build` 성공, 콘솔 `console.error` 0건(F1-AC7 프로덕션 경로)
  - 새로고침/직접 URL 진입 시 5개 라우트 모두 크래시 없이 렌더
- Covers: [F1-AC1(부팅), F1-AC7(빌드)]
- Files: `src/App.tsx`, `src/main.tsx`
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5, Task 3.6

Risk (Epic 4) — Complexity: Low / Risk factors: 시드 초기화가 렌더 후 실행돼 첫 화면이 빈 상태로 보이거나, 라우트 직접 진입 시 데이터 미로드 / Mitigation: 데이터 계층(Epic 2)을 먼저 완성해 `ensureSeeded`를 App 마운트 최상단에서 동기 호출 → 모든 페이지가 항상 초기화된 store 위에서 렌더.

---

## AC Coverage
- Total ACs in SPEC: 50 (F1:7, F2:7, F3:8, F4:7, F5:8, F6:7, F7:6)
- Covered by tasks: 50
  - F1-AC1 → Task 2.2, 4.1 / F1-AC2 → 2.2 / F1-AC3 → 2.3 / F1-AC4 → 2.1 / F1-AC5 → 2.1 / F1-AC6 → 2.3 / F1-AC7 → 2.1, 4.1
  - F2-AC1~AC7 → Task 3.1
  - F3-AC1~AC8 → Task 3.2
  - F4-AC1~AC7 → Task 3.3
  - F5-AC1~AC8 → Task 3.4
  - F6-AC1~AC7 → Task 3.5
  - F7-AC1~AC6 → Task 3.6
- Uncovered: 0 ✅