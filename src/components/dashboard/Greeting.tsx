"use client";

import { useEffect, useState } from "react";

// 대시보드 첫 줄 인사. 시간대에 맞는 인사말 + 날짜에 따라 바뀌는 한 줄.
// 같은 날에는 같은 문장이 나온다(새로고침마다 바뀌면 산만하다).

const LINES = [
  "오늘도 좋은 파트너를 만나시길 바랍니다.",
  "새로 들어온 의뢰와 견적을 확인해 보세요.",
  "마감이 가까운 의뢰가 있는지 살펴보세요.",
  "받은 견적은 확인한 뒤에는 파트너사가 수정할 수 없어요. 신중히 열어보세요.",
  "매칭이 성사되면 상대 회사의 연락처가 공개됩니다.",
  "회사 동료를 초대하면 의뢰와 견적을 함께 관리할 수 있어요.",
  "궁금한 점은 오른쪽 아래 상담 버튼으로 바로 물어보세요.",
  "오늘 처리할 일이 있다면 여기서 시작하세요.",
  "천천히, 그러나 확실하게. 좋은 매칭은 꼼꼼한 비교에서 나옵니다.",
  "한 주의 흐름을 정리하기 좋은 날입니다.",
  "새로운 협업의 시작이 될 수 있는 하루입니다.",
  "견적을 비교할 때는 금액만이 아니라 기간과 범위도 함께 보세요.",
  "파트너사 분야를 정확히 고르면 딱 맞는 의뢰만 보입니다.",
  "오늘도 손잡다매칭을 찾아주셔서 감사합니다.",
];

function timeGreeting(h: number) {
  if (h < 6) return "늦은 시간까지 수고가 많으십니다";
  if (h < 12) return "좋은 아침입니다";
  if (h < 18) return "안녕하세요";
  return "좋은 저녁입니다";
}

export default function Greeting({ name, company }: { name?: string; company?: string }) {
  // 시간은 브라우저 기준. 서버 렌더와 어긋나지 않게 마운트 후에 채운다.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  if (!now) return <div className="h-14" />;

  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  const line = LINES[dayIndex % LINES.length];
  const date = now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {timeGreeting(now.getHours())}, {name ? `${name}님` : "반갑습니다"}
      </h1>
      <p className="mt-1.5 text-sm text-foreground/60">
        <span className="text-foreground/40">{date}</span>
        {company && <span className="text-foreground/40"> · {company}</span>}
        <span className="mx-2 text-foreground/20">|</span>
        {line}
      </p>
    </div>
  );
}
