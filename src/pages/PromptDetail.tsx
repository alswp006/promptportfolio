import { useParams } from "react-router-dom";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { LoadingState } from "@/components/StateView";

/**
 * TDD stub — satisfies module resolution / tsc only.
 * Real behavior (card render, reward-ad gate, purchase mask, copy+usedCount)
 * is implemented by the Coder against src/__tests__/packet-0006.test.ts.
 */
export default function PromptDetail() {
  useParams<{ id: string }>();

  return (
    <ScreenScaffold>
      <LoadingState rows={3} />
    </ScreenScaffold>
  );
}
