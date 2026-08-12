import { useEffect, useState } from "react";
import { Top, Paragraph, Spacing, ListRow, Asset } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SummaryHero } from "@/components/SummaryHero";
import { Amount } from "@/components/Amount";
import { CountUp } from "@/components/CountUp";
import { Sparkline } from "@/components/Sparkline";
import { EmptyState, LoadingState } from "@/components/StateView";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { getSales } from "@/lib/settlement";
import type { SaleRecord } from "@/lib/types";

const TABS = [
  { label: "마켓", path: "/" },
  { label: "판매 등록", path: "/sell" },
  { label: "정산", path: "/dashboard" },
  { label: "보관함", path: "/library" },
];

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SaleRecord[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSales(getSales());
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>정산</Top.TitleParagraph>} />}>
        <LoadingState rows={5} />
      </ScreenScaffold>
    );
  }

  const netTotal = sales.reduce((sum, s) => sum + s.netWon, 0);
  const grossTotal = sales.reduce((sum, s) => sum + s.grossWon, 0);
  const commissionTotal = sales.reduce((sum, s) => sum + s.commissionWon, 0);

  const recentFirst = [...sales].sort((a, b) => b.soldAt - a.soldAt);
  const trend = [...sales].sort((a, b) => a.soldAt - b.soldAt).map((s) => s.netWon);

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>정산</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      <SummaryHero
        testId="net-hero"
        label="총 순수익"
        value={<CountUp value={netTotal} unit="원" typography="t2" />}
        caption={`판매 ${sales.length}건`}
      />

      <Spacing size={16} />
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Paragraph.Text typography="st11">총매출</Paragraph.Text>
            <Spacing size={4} />
            <Amount value={grossTotal} unit="원" typography="t6" />
          </div>
          <div>
            <Paragraph.Text typography="st11">수수료</Paragraph.Text>
            <Spacing size={4} />
            <Amount value={commissionTotal} unit="원" typography="t6" />
          </div>
        </div>
      </Card>

      {trend.length >= 2 ? (
        <>
          <Spacing size={16} />
          <Card>
            <Paragraph.Text typography="st11">순수익 추이</Paragraph.Text>
            <Spacing size={8} />
            <Sparkline data={trend} />
          </Card>
        </>
      ) : null}

      <Spacing size={16} />
      <Paragraph.Text typography="t4">최근 내역</Paragraph.Text>
      <Spacing size={8} />

      {recentFirst.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="illustCoin" alt="판매 내역 없음" />}
          title="아직 판매 내역이 없어요"
          description="프롬프트를 등록하고 첫 판매를 만들어 보세요"
        />
      ) : (
        <Card>
          {recentFirst.map((sale) => (
            <div key={sale.id} data-testid="sale-row">
              <ListRow
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={sale.promptTitle}
                    bottom={dateFormatter.format(new Date(sale.soldAt))}
                  />
                }
                right={<Amount value={sale.netWon} unit="원" typography="st11" />}
              />
            </div>
          ))}
        </Card>
      )}

      <Spacing size={80} />
    </ScreenScaffold>
  );
}
