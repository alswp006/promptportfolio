import { ScreenScaffold } from "@/components/ScreenScaffold";
import { LoadingState } from "@/components/StateView";

/**
 * TDD stub — satisfies module resolution / tsc only.
 * Real behavior (fields, validation, save+navigate, onboarding dialog,
 * duplicate-submit guard) is implemented by the Coder against
 * src/__tests__/packet-0008.test.ts.
 */
export default function SellPrompt() {
  return (
    <ScreenScaffold>
      <LoadingState rows={3} />
    </ScreenScaffold>
  );
}
