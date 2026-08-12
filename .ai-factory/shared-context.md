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
// Domain types — add your app-specific types here
export {};

```