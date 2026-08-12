# PromptPortfolio

앱인토스 (Vite + React + TDS) 생성형 AI 활용 능력이 직무 역량이 된 시대, 한국 직장인이 검증된 프롬프트를 공유·판매하고 커리어 포트폴리오로 활용하는 마켓플레이스 ChatGPT·Claude 등 AI 도구를 쓰고 싶은데 '어떻게 써야 잘 쓰는 건지' 모르는 직장인이 넘쳐남. 유튜브 강의는 너무 일반적이고, 내 직무(마케터, PM, 재무담당 등)에 맞는 실전 프롬프트를 찾기가 없음. 프롬프트 작성 잘하는 사람은 공유 채널이 없어 수익화 불가.

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Dashboard` | Dashboard |
| `/Home` | Home |
| `/Library` | Library |
| `/MarketHome` | MarketHome |
| `/PromptDetail` | PromptDetail |
| `/SellPrompt` | SellPrompt |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-08-12
