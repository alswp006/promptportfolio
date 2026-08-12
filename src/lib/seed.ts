/**
 * Seed data initialization.
 * Ensures pp.prompts is populated with default prompts on first use.
 */

import type { Prompt } from "@/lib/types";
import { safeRead, safeWrite } from "@/lib/storage";

const STORAGE_KEY = "pp.prompts";

function buildSeedPrompts(): Prompt[] {
  const now = Date.now();
  const base: Array<Omit<Prompt, "id" | "version" | "usedCount" | "createdAt" | "updatedAt">> = [
    {
      title: "SNS 바이럴 캠페인 기획",
      category: "마케팅",
      jobRole: "마케팅 매니저",
      body: "타깃 고객층과 제품 특징을 입력하면 SNS 채널별 바이럴 캠페인 기획안을 생성합니다.",
      sampleOutput: "인스타그램 릴스 3종, 챌린지 해시태그, 인플루언서 협업 제안...",
      priceWon: 8900,
      sellerId: "seller-marketing-01",
      sellerName: "김마케팅",
    },
    {
      title: "월간 손익 리포트 자동 작성",
      category: "재무",
      jobRole: "재무 담당자",
      body: "매출·비용 데이터를 입력하면 경영진 보고용 월간 손익 리포트를 작성합니다.",
      sampleOutput: "매출 3억 2천만 원, 영업이익률 18%, 전월 대비 증감 분석...",
      priceWon: 12000,
      sellerId: "seller-finance-01",
      sellerName: "이재무",
    },
    {
      title: "스프린트 회고 정리 도우미",
      category: "PM",
      jobRole: "프로덕트 매니저",
      body: "스프린트 동안의 이슈와 성과를 입력하면 구조화된 회고 문서를 만들어줍니다.",
      sampleOutput: "잘한 점 3가지, 개선할 점 3가지, 다음 스프린트 액션 아이템...",
      priceWon: 6500,
      sellerId: "seller-pm-01",
      sellerName: "박피엠",
    },
    {
      title: "계약서 조항 리스크 검토",
      category: "법무",
      jobRole: "사내 변호사",
      body: "계약서 초안을 입력하면 리스크가 있는 조항을 짚어주고 대안 문구를 제안합니다.",
      sampleOutput: "손해배상 조항 상한선 누락, 관할 법원 조항 검토 필요...",
      priceWon: 15000,
      sellerId: "seller-legal-01",
      sellerName: "최법무",
    },
    {
      title: "코드 리뷰 체크리스트 생성",
      category: "개발",
      jobRole: "시니어 백엔드 엔지니어",
      body: "PR 설명과 변경 파일 목록을 입력하면 리뷰 시 확인할 체크리스트를 생성합니다.",
      sampleOutput: "N+1 쿼리 여부, 에러 핸들링 누락, 테스트 커버리지 확인...",
      priceWon: 9900,
      sellerId: "seller-dev-01",
      sellerName: "정개발",
    },
    {
      title: "모바일 앱 온보딩 화면 카피",
      category: "디자인",
      jobRole: "UX 라이터",
      body: "앱의 핵심 기능 3가지를 입력하면 온보딩 화면에 쓸 카피를 제안합니다.",
      sampleOutput: "화면 1: '한눈에 보는 내 지출', 화면 2: '알아서 분류되는 카드 내역'...",
      priceWon: 5000,
      sellerId: "seller-design-01",
      sellerName: "한디자인",
    },
    {
      title: "채용 공고 초안 작성",
      category: "HR",
      jobRole: "채용 담당자",
      body: "직무와 필요 역량을 입력하면 지원자 관점에서 매력적인 채용 공고 초안을 만듭니다.",
      sampleOutput: "주요 업무 5가지, 자격 요건, 우대사항, 근무 조건 안내...",
      priceWon: 4500,
      sellerId: "seller-hr-01",
      sellerName: "오인사",
    },
    {
      title: "여행 일정 3박 4일 짜기",
      category: "기타",
      jobRole: "여행 플래너",
      body: "여행지와 예산을 입력하면 일자별 동선과 맛집을 포함한 일정표를 만들어줍니다.",
      sampleOutput: "1일차: 공항 도착 후 숙소 체크인, 근처 맛집 저녁 식사...",
      priceWon: 3000,
      sellerId: "seller-etc-01",
      sellerName: "서여행",
    },
  ];

  return base.map((input, i) => ({
    ...input,
    id: crypto.randomUUID(),
    version: 1,
    usedCount: 0,
    createdAt: now + i,
    updatedAt: now + i,
  }));
}

/**
 * Initialize seed data if pp.prompts is empty or corrupted.
 *
 * Idempotent: if valid seed data already exists, does nothing.
 * On first run, writes 8+ prompts covering all 8 categories:
 * "마케팅", "재무", "PM", "법무", "개발", "디자인", "HR", "기타"
 */
export async function ensureSeeded(): Promise<void> {
  const existing = safeRead<Prompt[]>(STORAGE_KEY, []);
  if (Array.isArray(existing) && existing.length > 0) {
    return;
  }
  safeWrite(STORAGE_KEY, buildSeedPrompts());
}
