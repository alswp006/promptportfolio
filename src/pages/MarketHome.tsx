import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, TextField, Tab, ListRow, Badge, Asset, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { AdSlot } from "@/components/AdSlot";
import { EmptyState, LoadingState } from "@/components/StateView";
import { getPrompts } from "@/lib/promptStore";
import { formatCurrency } from "@/lib/utils";
import type { Prompt, PromptCategory } from "@/lib/types";

const CATEGORIES: PromptCategory[] = [
  "마케팅",
  "재무",
  "PM",
  "법무",
  "개발",
  "디자인",
  "HR",
  "기타",
];

const TABS: Array<PromptCategory | "전체"> = ["전체", ...CATEGORIES];

const AD_GROUP_ID = import.meta.env.VITE_TOSS_AD_GROUP_ID ?? "market-home-banner";

function matchesQuery(prompt: Prompt, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return prompt.title.toLowerCase().includes(q) || prompt.jobRole.toLowerCase().includes(q);
}

export default function MarketHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [category, setCategory] = useState<PromptCategory | "전체">("전체");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = setTimeout(() => {
      setPrompts(getPrompts());
      setLoading(false);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const filtered = prompts.filter(
    (p) => (category === "전체" || p.category === category) && matchesQuery(p, query),
  );

  const handleSelectTab = (tab: PromptCategory | "전체") => {
    setCategory(tab);
    try {
      Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
    } catch {
      /* WebView 밖에서는 throw — 무시 */
    }
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>프롬프트 마켓</Top.TitleParagraph>} />}>
      <TextField
        variant="box"
        label="검색"
        placeholder="제목·직무 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <Spacing size={12} />

      <Tab onChange={(index: number) => handleSelectTab(TABS[index])}>
        {TABS.map((tab) => (
          <Tab.Item key={tab} selected={category === tab} onClick={() => handleSelectTab(tab)}>
            {tab}
          </Tab.Item>
        ))}
      </Tab>

      <Spacing size={16} />

      <AdSlot adGroupId={AD_GROUP_ID} />

      <Spacing size={16} />

      {loading ? (
        <LoadingState rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="illustSearch" alt="검색 결과 없음" />}
          title="검색 결과가 없어요"
          description="다른 키워드로 찾아보세요"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {filtered.map((p) => (
            <ListRow
              key={p.id}
              onClick={() => navigate(`/prompt/${p.id}`)}
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={p.title}
                  bottom={`${p.jobRole} · 사용 ${p.usedCount}회`}
                />
              }
              right={
                <Badge size="medium" variant="weak" color="blue">
                  {p.priceWon === 0 ? "무료" : formatCurrency(p.priceWon)}
                </Badge>
              }
            />
          ))}
        </div>
      )}

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
