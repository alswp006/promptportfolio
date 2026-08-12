import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, ListRow, Asset, Button, Spacing } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { EmptyState, LoadingState } from "@/components/StateView";
import { getPurchases } from "@/lib/purchaseStore";
import { getPromptById } from "@/lib/promptStore";
import type { Prompt, Purchase } from "@/lib/types";

type LibraryItem = {
  purchase: Purchase;
  prompt: Prompt | undefined;
};

export default function Library() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const purchases = [...getPurchases()].sort((a, b) => b.purchasedAt - a.purchasedAt);
      setItems(purchases.map((purchase) => ({ purchase, prompt: getPromptById(purchase.promptId) })));
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>내 라이브러리</Top.TitleParagraph>} />}>
        <LoadingState rows={4} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>내 라이브러리</Top.TitleParagraph>} />}>
      {items.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="illustBox" alt="구매한 프롬프트 없음" />}
          title="구매한 프롬프트가 없어요"
          action={
            <Button variant="weak" onClick={() => navigate("/")}>
              마켓 둘러보기
            </Button>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map(({ purchase, prompt }) =>
            prompt ? (
              <ListRow
                key={purchase.promptId}
                data-testid="library-item"
                style={{ minHeight: 44 }}
                onClick={() => navigate(`/prompt/${prompt.id}`)}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={prompt.title}
                    bottom={`v${prompt.version} · 사용 ${prompt.usedCount}회`}
                  />
                }
              />
            ) : (
              <ListRow
                key={purchase.promptId}
                data-testid="library-item"
                style={{ minHeight: 44 }}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top="삭제된 프롬프트"
                    bottom="원본을 찾을 수 없어요"
                  />
                }
              />
            ),
          )}
        </div>
      )}

      <Spacing size={80} />
    </ScreenScaffold>
  );
}
