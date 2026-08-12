import { ScreenScaffold } from "@/components/ScreenScaffold";
import { LoadingState } from "@/components/StateView";

/**
 * TDD stub — satisfies module resolution / tsc only.
 * Real behavior (purchase↔prompt join, library-item cards, deleted-prompt
 * handling, empty state, skeleton loading) is implemented by the Coder
 * against src/__tests__/packet-0010.test.ts.
 */
export default function Library() {
  return (
    <ScreenScaffold>
      <LoadingState rows={3} />
    </ScreenScaffold>
  );
}
