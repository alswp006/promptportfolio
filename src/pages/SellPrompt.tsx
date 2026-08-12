import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Top,
  TextField,
  TextArea,
  Chip,
  ChipItem,
  Paragraph,
  Spacing,
  AlertDialog,
  Toast,
} from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { savePrompt } from "@/lib/promptStore";
import { getFlags, setOnboardedSeller } from "@/lib/settlement";
import type { PromptCategory } from "@/lib/types";

const CATEGORIES: PromptCategory[] = ["마케팅", "재무", "PM", "법무", "개발", "디자인", "HR", "기타"];

const SELLER_ID = "seller-me";
const SELLER_NAME = "나";

interface FormErrors {
  title?: string;
  body?: string;
  price?: string;
}

function validateForm(title: string, body: string, priceNum: number): FormErrors {
  const errors: FormErrors = {};
  if (title.trim() === "") {
    errors.title = "제목을 입력해주세요";
  }
  if (body.trim().length < 20) {
    errors.body = "프롬프트 본문은 20자 이상이어야 해요";
  }
  const priceValid = priceNum === 0 || (priceNum >= 1000 && priceNum <= 50000);
  if (!priceValid) {
    errors.price = "가격은 0원 또는 1,000~50,000원이어야 해요";
  }
  return errors;
}

export default function SellPrompt() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PromptCategory>(CATEGORIES[0]);
  const [jobRole, setJobRole] = useState("");
  const [body, setBody] = useState("");
  const [sampleOutput, setSampleOutput] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !getFlags().onboardedSeller);

  const savingRef = useRef(false);

  const handleOnboardingConfirm = () => {
    setOnboardedSeller(true);
    setShowOnboarding(false);
  };

  const handleSubmit = () => {
    if (savingRef.current) return;

    const priceNum = Number(price);
    const nextErrors = validateForm(title, body, priceNum);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    savingRef.current = true;
    setSaving(true);

    const result = savePrompt({
      title: title.trim(),
      category,
      jobRole: jobRole.trim(),
      body: body.trim(),
      sampleOutput: sampleOutput.trim(),
      priceWon: priceNum,
      sellerId: SELLER_ID,
      sellerName: SELLER_NAME,
    });

    if (!result.ok) {
      savingRef.current = false;
      setSaving(false);
      setToastMessage(result.error);
      return;
    }

    setToastMessage("등록됐어요");
    navigate(`/prompt/${result.id}`);
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>프롬프트 등록</Top.TitleParagraph>} />}
      bottom={
        <SubmitFooter label={saving ? "등록 중" : "등록하기"} onClick={handleSubmit} disabled={saving} />
      }
    >
      <TextField
        variant="box"
        label="제목"
        placeholder="예: 3줄 회의록 요약 프롬프트"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        hasError={!!errors.title}
        help={errors.title}
      />

      <Spacing size={12} />
      <Paragraph.Text typography="t6">카테고리</Paragraph.Text>
      <Spacing size={8} />
      <Chip kind="select" wrap style={{ flexWrap: "wrap" }}>
        {CATEGORIES.map((cat) => (
          <ChipItem key={cat} selected={category === cat} onClick={() => setCategory(cat)}>
            {cat}
          </ChipItem>
        ))}
      </Chip>

      <Spacing size={12} />
      <TextField
        variant="box"
        label="직무"
        placeholder="예: PM 매니저"
        value={jobRole}
        onChange={(e) => setJobRole(e.target.value)}
      />

      <Spacing size={12} />
      <TextArea
        variant="box"
        label="본문"
        placeholder="붙여넣으면 바로 쓸 수 있는 프롬프트 본문을 20자 이상 입력해주세요"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        hasError={!!errors.body}
        help={errors.body}
      />

      <Spacing size={12} />
      <TextArea
        variant="box"
        label="샘플 출력"
        placeholder="예: 1) 예산 승인 2) 출시일 연기 3) 담당자 재배정"
        value={sampleOutput}
        onChange={(e) => setSampleOutput(e.target.value)}
      />

      <Spacing size={12} />
      <TextField
        variant="box"
        label="가격"
        placeholder="0 또는 1,000~50,000"
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        hasError={!!errors.price}
        help={errors.price}
      />

      <Spacing size={80} />

      <AlertDialog
        open={showOnboarding}
        title="정산 안내"
        description="수수료 20%가 차감되어 정산돼요"
        onClose={() => setShowOnboarding(false)}
        alertButton={
          <AlertDialog.AlertButton onClick={handleOnboardingConfirm}>확인</AlertDialog.AlertButton>
        }
      />

      <Toast
        open={!!toastMessage}
        text={toastMessage ?? ""}
        position="bottom"
        onClose={() => setToastMessage(null)}
      />
    </ScreenScaffold>
  );
}
