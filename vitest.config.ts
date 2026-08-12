import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    // react-router(v7)는 vitest의 vi.mock 그래프(모킹된 SDK를 transitively import하는 src
    // 컴포넌트)에서 별도 인스턴스로 다시 로드된다 → Router 컨텍스트가 갈려 test의 MemoryRouter가
    // 준 location을 src의 useLocation이 못 본다(활성 탭/실네비 검증 실패). 절대경로 ESM 파일로
    // 고정해 모든 importer가 동일 모듈을 쓰게 강제한다. (더 구체적인 패턴을 먼저 둔다.)
    alias: [
      { find: /^react-router-dom$/, replacement: path.resolve(__dirname, 'node_modules/react-router-dom/dist/index.mjs') },
      { find: /^react-router\/dom$/, replacement: path.resolve(__dirname, 'node_modules/react-router/dist/development/dom-export.mjs') },
      { find: /^react-router$/, replacement: path.resolve(__dirname, 'node_modules/react-router/dist/development/index.mjs') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // react-router(v7)를 vite ESM 그래프로 인라인해 CJS/ESM 이중 로드를 막는다
    // (이중 로드 시 Router 컨텍스트가 갈려 src의 useLocation이 test MemoryRouter를 못 봄).
    server: { deps: { inline: true } },
    // Playwright 비주얼 스펙은 e2e/에 있다 — vitest 실행에서 제외(기본 제외 + e2e).
    // scripts/__tests__는 node:test 러너 전용(`node --test`) — vitest collector가 못 읽어 제외.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', 'scripts/**'],
    // 워커 폭발 방지(실사고 2026-07-21 global OOM/exit 137): vitest 기본은 CPU 코어 수만큼
    // 포크를 띄운다(16스레드 머신=최대 16개, 각 수백 MB) → jsdom 로드까지 겹쳐 WSL 총 메모리
    // 소진. 미니앱은 테스트 파일이 3~5개라 2포크로 충분하고 메모리를 8배 이상 줄인다.
    pool: 'forks',
    poolOptions: { forks: { minForks: 1, maxForks: 2 } },
  },
});
