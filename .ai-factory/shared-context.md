# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 프롬프트 메타데이터 / 모든 페이지가 참조 (구현: 패킷 0001) */
export type Prompt = { id: string; title: string; description: string; content: string; category: string; price: number; createdBy: string; createdAt: string };

/** 구매 기록 / 0007,0009에서 사용 (구현: 패킷 0001) */
export type PurchaseRecord = { id: string; promptId: string; buyerId: string; sellerId: string; amountKrw: number; purchasedAt: string };

/** 정산 기록 / 0009에서 대시보드 렌더링 (구현: 패킷 0001) */
export type SettlementRecord = { id: string; sellerId: string; period: string; totalRevenue: number; platformFee: number; settlementAmountKrw: number; status: 'pending' | 'completed' | 'failed'; settledAt?: string };

/** 사용자/판매자 정보 (구현: 패킷 0001) */
export type User = { id: string; name: string; email: string; role: 'buyer' | 'seller' | 'both'; createdAt: string };

/** 라우팅 상태 / 0011 네비 연동 (구현: 패킷 0001) */
export type RouteState = { path: string; params?: Record<string, string | number> };

/** 프롬프트 조회/추가/수정/삭제 훅 (구현: 패킷 0003) */
export type usePromptStoreFn = () => { prompts: Prompt[]; getPrompt: (id: string) => Prompt | undefined; addPrompt: (data: Omit<Prompt, 'id' | 'createdAt'>) => Promise<Prompt>; updatePrompt: (id: string, updates: Partial<Prompt>) => Promise<void>; deletePrompt: (id: string) => Promise<void> };

/** 구매 기록 조회/추가 훅 (구현: 패킷 0004) */
export type usePurchaseStoreFn = () => { purchases: PurchaseRecord[]; addPurchase: (data: Omit<PurchaseRecord, 'id' | 'purchasedAt'>) => Promise<PurchaseRecord>; getPurchases: (filter?: { buyerId?: string; sellerId?: string }) => PurchaseRecord[] };

/** 정산 기록 조회 훅 (구현: 패킷 0004) */
export type useSettlementStoreFn = () => { settlements: SettlementRecord[]; getSettlements: (sellerId: string) => SettlementRecord[] };

/** 현재 사용자 정보 조회/수정 (구현: 패킷 0004) */
export type useMyProfileFn = () => { user: User | null; updateProfile: (updates: Partial<User>) => Promise<void> };

/** 가격 포매팅 (모든 페이지에서 필요) (구현: 패킷 0002) */
export type formatPriceFn = (amountKrw: number, opts?: { currency?: string }) => string;

/** 날짜 포매팅 (구현: 패킷 0002) */
export type formatDateFn = (date: string | Date) => string;

/** 구매 기록들의 총 수익 계산 (0009 대시보드) (구현: 패킷 0004) */
export type calculateRevenueFn = (purchases: PurchaseRecord[]) => number;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
export type PromptCategory = "마케팅" | "재무" | "PM" | "법무" | "개발" | "디자인" | "HR" | "기타";

export interface Prompt {
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

export interface Purchase {
  promptId: string;
  pricePaidWon: number;
  purchasedAt: number;
}

export interface SaleRecord {
  id: string;
  promptId: string;
  promptTitle: string;
  grossWon: number;
  commissionWon: number;
  netWon: number;
  soldAt: number;
}

export type UsedCounts = Record<string, number>;

export interface Flags {
  onboardedSeller?: boolean;
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

export type RouteState = {
  "/": undefined;
  "/prompt/:id": undefined;
  "/sell": undefined;
  "/dashboard": undefined;
  "/library": undefined;
};

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    contract.ts
    promptStore.ts
    purchaseStore.ts
    seed.ts
    settlement.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    MarketHome.tsx
    PromptDetail.tsx
    SellPrompt.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type Prompt =; export type PurchaseRecord =; export type SettlementRecord =; export type User =; export type RouteState =; export type usePromptStoreFn = () =>; export type usePurchaseStoreFn = () =>; export type useSettlementStoreFn = () =>
- promptStore.ts: export function getPrompts(): Prompt[]; export function getPromptById(id: string): Prompt | undefined; export function savePrompt( input: Omit<Prompt, "id" | "version" | "usedCount" | "createdAt" | "updatedAt">, ): SaveResu
- purchaseStore.ts: export function getPurchases(): Purchase[]; export function addPurchase(promptId: string, pricePaidWon: number): void
- seed.ts: export async function ensureSeeded(): Promise<void>
- settlement.ts: export function getUsedCounts(): UsedCounts; export function incrementUsed(id: string): void; export function getSales(): SaleRecord[]; export function recordSale(prompt: Prompt): void; export function getFlags(): Flags; export function setOnboardedSeller(value: boolean): void
- storage.ts: export interface SaveResult; export function safeRead<T>(key: string, fallback: T): T; export function safeWrite(key: string, value: unknown): SaveResult
- types.ts: export type PromptCategory = "마케팅" | "재무" | "PM" | "법무" | "개발" | "디자인" | "HR" | "기타"; export interface Prompt; export interface Purchase; export interface SaleRecord; export type UsedCounts = Record<string, number>; export interface Flags; export type SaveResult =; export type RouteState =
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/promptStore.ts → imports: lib/types, lib/storage
  lib/purchaseStore.ts → imports: lib/types, lib/storage
  lib/seed.ts → imports: lib/types, lib/storage
  lib/settlement.ts → imports: lib/types, lib/storage
  pages/MarketHome.tsx → imports: components/ScreenScaffold, components/AdSlot, components/StateView, lib/promptStore, lib/utils, lib/types
  pages/PromptDetail.tsx → imports: components/ScreenScaffold, components/Card, components/BottomCTA, components/StateView, lib/promptStore, lib/purchaseStore, lib/settlement, lib/utils, lib/types
  pages/SellPrompt.tsx → imports: components/ScreenScaffold, components/BottomCTA, lib/promptStore, lib/settlement, lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 데이터 모델 & RouteState 타입 정의 (files: src/lib/types.ts)
- 0002: 저장소 기반 헬퍼 (안전 read/write) (files: src/lib/storage.ts)
- 0003: 프롬프트 store + 시드 데이터 (files: src/lib/promptStore.ts, src/lib/seed.ts)
- 0004: 구매·정산·사용횟수 store + 정산 계산 (files: src/lib/purchaseStore.ts, src/lib/settlement.ts)
- 0005: 마켓 홈 페이지 `/` (files: src/pages/MarketHome.tsx)
- 0006: 프롬프트 상세 — 렌더·샘플 광고 게이트·복사 (files: src/pages/PromptDetail.tsx)
- 0008: 판매 등록 페이지 `/sell` (files: src/pages/SellPrompt.tsx)
- 0007: 프롬프트 상세 — 구매(IAP)·정산 기록 연동 (files: src/pages/PromptDetail.tsx)
- 0009: 정산 대시보드 페이지 `/dashboard` (files: src/pages/Dashboard.tsx)