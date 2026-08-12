import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Top, Paragraph, Spacing, Border, Badge, Button, Toast } from "@toss/tds-mobile";
import { setClipboardText, loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SubmitFooter } from "@/components/BottomCTA";
import { EmptyState, LoadingState } from "@/components/StateView";
import { getPromptById } from "@/lib/promptStore";
import { getPurchases } from "@/lib/purchaseStore";
import { incrementUsed } from "@/lib/settlement";
import { formatNumber } from "@/lib/utils";
import type { Prompt } from "@/lib/types";

const AD_SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID ?? "prompt-sample-reward";

export default function PromptDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<Prompt | undefined>(undefined);
  const [purchased, setPurchased] = useState(false);
  const [sampleUnlocked, setSampleUnlocked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const found = getPromptById(id);
      setPrompt(found);
      if (found) {
        setPurchased(getPurchases().some((purchase) => purchase.promptId === found.id));
      }
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    if (!prompt) return;
    try {
      loadFullScreenAd({
        options: { adGroupId: AD_SLOT_ID },
        onEvent: () => {},
        onError: () => {},
      });
    } catch {
      /* 앱인토스 WebView 밖(로컬 브라우저 등) — throw 무시, 시청 시점에 재시도 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt?.id]);

  const handleWatchSample = () => {
    try {
      showFullScreenAd({
        options: { adGroupId: AD_SLOT_ID },
        onEvent: () => setSampleUnlocked(true),
        onError: () => setToastMessage("광고를 불러오지 못했어요"),
      });
    } catch {
      setToastMessage("광고를 불러오지 못했어요");
    }
  };

  const handleCopy = () => {
    if (!prompt) return;
    try {
      Promise.resolve(setClipboardText(prompt.body)).catch(() => {});
    } catch {
      /* 앱인토스 WebView 밖 — throw 무시 */
    }
    incrementUsed(prompt.id);
    setPrompt((prev) => (prev ? { ...prev, usedCount: prev.usedCount + 1 } : prev));
    setToastMessage("복사했어요");
  };

  if (loading) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>프롬프트</Top.TitleParagraph>} />}>
        <LoadingState rows={5} />
      </ScreenScaffold>
    );
  }

  if (!prompt) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>프롬프트</Top.TitleParagraph>} />}>
        <EmptyState
          title="프롬프트를 찾을 수 없어요"
          description="삭제되었거나 잘못된 링크예요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate("/")}>
              마켓으로
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  const locked = prompt.priceWon > 0 && !purchased;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{prompt.title}</Top.TitleParagraph>} />}
      bottom={
        <SubmitFooter
          label={locked ? "구매하고 전체 보기" : "프롬프트 복사"}
          onClick={locked ? () => {} : handleCopy}
        />
      }
    >
      <Card testId="prompt-detail-card">
        <Paragraph.Text typography="t3">{prompt.title}</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="st11">
          {`${prompt.jobRole} · v${prompt.version} · 사용 ${prompt.usedCount}회`}
        </Paragraph.Text>
        <Spacing size={12} />
        <span data-testid="price-hero" style={{ display: "inline-block", whiteSpace: "nowrap" }}>
          <Paragraph.Text typography="t2">
            {prompt.priceWon === 0 ? "무료" : `₩${formatNumber(prompt.priceWon)}`}
          </Paragraph.Text>
        </span>
        {prompt.priceWon === 0 ? (
          <>
            <Spacing size={4} />
            <Badge size="medium" variant="weak" color="blue">
              무료
            </Badge>
          </>
        ) : null}
      </Card>

      <Spacing size={20} />
      <Paragraph.Text typography="t4">샘플 결과</Paragraph.Text>
      <Spacing size={12} />
      {sampleUnlocked ? (
        <Paragraph.Text typography="st11">{prompt.sampleOutput}</Paragraph.Text>
      ) : (
        <Button variant="weak" display="block" onClick={handleWatchSample}>
          샘플 결과 보기
        </Button>
      )}

      <Spacing size={24} />
      <Border />
      <Spacing size={16} />

      <Paragraph.Text typography="t4">프롬프트 본문</Paragraph.Text>
      <Spacing size={12} />
      <Paragraph.Text typography="st11">
        {locked ? "구매하면 전체 본문을 볼 수 있어요" : prompt.body}
      </Paragraph.Text>

      <Spacing size={24} />

      <Toast
        open={!!toastMessage}
        text={toastMessage ?? ""}
        position="bottom"
        onClose={() => setToastMessage(null)}
      />
    </ScreenScaffold>
  );
}
