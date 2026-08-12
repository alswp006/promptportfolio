import { ScreenScaffold } from "@/components/ScreenScaffold";
import { LoadingState } from "@/components/StateView";

/**
 * TDD stub — satisfies module resolution / tsc only.
 * Real behavior (net-hero SummaryHero, Sparkline, sale rows, empty state)
 * is implemented by the Coder against src/__tests__/packet-0009.test.ts.
 */
export default function Dashboard() {
  return (
    <ScreenScaffold>
      <LoadingState rows={3} />
    </ScreenScaffold>
  );
}
