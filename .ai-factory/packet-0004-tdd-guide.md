# Packet 0004 TDD Guide — 구매·정산·사용횟수 store + 정산 계산

## Status: RED PHASE ✅
Tests have been written. They will FAIL until implementations are created. This is correct TDD behavior.

## Expected Test Failures
When running `npx vitest run src/__tests__/packet-0004.test.ts`, you will see:
```
Error: Failed to resolve import "@/lib/purchaseStore" from "..."
Error: Failed to resolve import "@/lib/settlement" from "..."
```

This is **intentional**. The Coder needs to create these files.

## Files to Create (Coder only — AI Tester does NOT create implementations)

### 1. `src/lib/purchaseStore.ts`
Must export these functions:

```typescript
/**
 * Get all purchases from localStorage (pp.purchases).
 * Returns empty array if missing or corrupted.
 */
export function getPurchases(): Purchase[]

/**
 * Add a new purchase to pp.purchases.
 * Auto-adds purchasedAt timestamp (current Date.now()).
 * 
 * @param promptId - the prompt ID being purchased
 * @param pricePaidWon - amount paid in won (integer)
 */
export function addPurchase(promptId: string, pricePaidWon: number): void
```

### 2. `src/lib/settlement.ts`
Must export these functions:

```typescript
/**
 * Get used counts map from localStorage (pp.usedCounts).
 * Returns empty object if missing or corrupted.
 */
export function getUsedCounts(): Record<string, number>

/**
 * Increment usage count for a prompt.
 * Updates BOTH pp.usedCounts[id] and the Prompt's usedCount field atomically.
 * 
 * @param promptId - the prompt ID to increment
 */
export function incrementUsed(promptId: string): void

/**
 * Record a sale for a prompt (used by purchase flow).
 * Calculates commission as Math.floor(gross * 0.2).
 * Adds SaleRecord to pp.sales with auto-generated id and soldAt timestamp.
 * 
 * @param prompt - Prompt object with priceWon field (becomes grossWon)
 */
export function recordSale(prompt: Prompt): void

/**
 * Get all sales from localStorage (pp.sales).
 * Returns empty array if missing or corrupted.
 */
export function getSales(): SaleRecord[]

/**
 * Get flags from localStorage (pp.flags).
 * Returns empty object if missing or corrupted.
 */
export function getFlags(): Flags

/**
 * Set the onboardedSeller flag in pp.flags.
 * 
 * @param value - true to mark seller as onboarded, false to reset
 */
export function setOnboardedSeller(value: boolean): void
```

## Test Coverage Summary

### AC-1: getPurchases() & addPurchase()
- ✅ Returns `[]` (not null/undefined) when empty
- ✅ Handles corrupted JSON gracefully
- ✅ addPurchase stores promptId, pricePaidWon, purchasedAt
- ✅ Persists to localStorage
- ✅ Allows multiple purchases of same prompt

**Tests: 7 (4 for getPurchases, 3 for addPurchase)**

### AC-2: incrementUsed()
- ✅ Increments pp.usedCounts[id] from 0 to 1
- ✅ Updates Prompt.usedCount atomically
- ✅ Accumulates on multiple calls
- ✅ Handles multiple prompts independently

**Tests: 5**

### AC-3: recordSale()
- ✅ Commission = Math.floor(grossWon * 0.2)
- ✅ NetWon = grossWon - commissionWon
- ✅ Handles floor division correctly on odd amounts
- ✅ Includes all required SaleRecord fields (id, promptId, promptTitle, grossWon, commissionWon, netWon, soldAt)
- ✅ Persists to localStorage
- ✅ Supports multiple sales of same prompt

**Tests: 6**

### AC-4: getSales()
- ✅ Returns `[]` (not null/undefined) when empty
- ✅ Returns all sales after recordSale
- ✅ Handles corrupted JSON gracefully

**Tests: 3**

### AC-5: getFlags() & setOnboardedSeller()
- ✅ Returns empty flags when pp.flags is empty
- ✅ setOnboardedSeller(true) persists correctly
- ✅ setOnboardedSeller(false) resets correctly
- ✅ Preserves other flags in object

**Tests: 5**

### Integration & Edge Cases
- ✅ Calculate total net income from multiple sales
- ✅ Handle used counts and sales independently
- ✅ Handle storage quota exceeded gracefully
- ✅ Accept 0 price (free prompt)
- ✅ Handle large amounts (max 50,000 won)

**Tests: 5**

## Total: 31 Tests

## Running Tests During Development

```bash
# Run just packet-0004 tests
npx vitest run src/__tests__/packet-0004.test.ts

# Run in watch mode (recommended during development)
npx vitest src/__tests__/packet-0004.test.ts

# Run all tests (after implementations are done)
npx vitest run
```

## Expected Timeline

1. **RED Phase (NOW)** ✅
   - Tests written: 31 tests covering 5 ACs
   - All imports fail: expected

2. **GREEN Phase (Coder)**
   - Create `src/lib/purchaseStore.ts` → pass AC-1 tests
   - Create `src/lib/settlement.ts` → pass AC-2/AC-3/AC-4/AC-5 tests
   - All tests should pass (31/31)

3. **REFACTOR Phase (if needed)**
   - Code review for simplification/reuse
   - Optimize storage access patterns (if needed)

## Key Implementation Notes for the Coder

1. **Storage keys follow pattern**: `pp.{storeName}` (pp.purchases, pp.usedCounts, pp.sales, pp.flags)
2. **Use safeRead/safeWrite helpers** from `@/lib/storage.ts` (they handle corruption gracefully)
3. **IDs auto-generate**: Use `crypto.randomUUID()` for SaleRecord.id
4. **Timestamps are epoch ms**: Use `Date.now()`
5. **Commission calculation**: Must use `Math.floor(grossWon * 0.2)` (not round)
6. **Atomic updates required**: When `incrementUsed()` is called, BOTH pp.usedCounts[id] AND Prompt.usedCount must be updated in the same write operation
7. **No external API calls**: All data is localStorage only
8. **TypeScript**: Ensure `npx tsc --noEmit` passes after implementation

## Acceptance Criteria From Spec

From `.ai-factory/spec.md` F1 (Data Layer & localStorage Storage):

- **AC-3 [E][P0]**: Scenario: 사용 횟수 증가
  - Given usedCount:0인 프롬프트 id="p1"
  - When incrementUsed("p1") 호출
  - Then pp.usedCounts["p1"]가 1이 되고 해당 Prompt의 usedCount가 1로 갱신됨

From F4 (프롬프트 구매 (IAP)):

- **AC-1 [E][P0]**: Scenario: 구매 성공
  - Given priceWon=3000, id="p1" 유료 프롬프트 상세
  - When <TossPurchase> 결제 성공 → processProductGrant 실행
  - Then pp.purchases에 { promptId:"p1", pricePaidWon:3000 }가 추가됨

- **AC-2 [E][P0]**: Scenario: 판매 정산 기록 생성
  - Given AC-1 구매 성공
  - When grant 처리
  - Then pp.sales에 { grossWon:3000, commissionWon:600, netWon:2400 } SaleRecord 1건이 추가됨

From F5 (프롬프트 등록):

- **AC-5 [E][P1]**: Scenario: 판매자 첫 등록 온보딩
  - Given pp.flags.onboardedSeller가 없음
  - When /sell 최초 진입
  - Then AlertDialog 안내가 1회 표시되고 확인 시 onboardedSeller:true 저장
