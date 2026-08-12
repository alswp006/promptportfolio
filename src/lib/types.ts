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
