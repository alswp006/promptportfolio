# 패킷 0011: 라우팅 배선 · 탭 네비 · 진입점 통합

## 만들 항목
- `src/App.tsx`: React Router 설정 (마켓홈/상세/판매/정산/라이브러리), FloatingTabBar 조건부 렌더, ensureSeeded() 마운트 시 1회 호출
- `src/components/FloatingTabBar.tsx`: 마켓/라이브러리/판매/정산 탭 네비 컴포넌트 (이미 존재)

## 사용할 타입
- `Prompt`, `Purchase`, `SaleRecord`, `UsedCounts`, `Flags` (src/lib/types.ts에서 import)

## 검증 방법
1. 5개 페이지(/, /prompt/:id, /sell, /dashboard, /library) 모두 라우팅됨
2. FloatingTabBar가 4개 탭 경로(/, /library, /sell, /dashboard)에서만 표시됨
3. /prompt/:id에서는 탭 네비 미표시 (상세 페이지)
4. 미매칭 경로(/foo 등)는 즉시 '/'로 리다이렉트
5. 새로고침/직접 URL 진입 시 크래시 없음
6. 마운트 시 ensureSeeded() 1회 실행 (console에서 확인 가능)

## 절대 하면 안 되는 것
- `src/main.tsx` (@AI:ANCHOR) 수정 금지
- FloatingTabBar 외부에서 navigation 직접 구현 금지
- 페이지별 별도 라우터 생성 금지 (App.tsx가 유일한 라우터)
