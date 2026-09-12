"use client";

import { useState } from "react";

const clientSteps = [
  {
    step: "01",
    title: "견적 요청",
    description: "서비스 유형을 선택하고 프로젝트 정보를 입력하세요. 4단계 간편 양식으로 5분이면 완료됩니다.",
  },
  {
    step: "02",
    title: "견적 비교",
    description: "파트너사들이 제출한 견적서를 금액, 일정, 업무범위별로 한눈에 비교하세요.",
  },
  {
    step: "03",
    title: "파트너 선택",
    description: "최적의 파트너를 수락하세요. 보류, 검토 등 유연하게 결정할 수 있습니다.",
  },
  {
    step: "04",
    title: "매칭 성사",
    description: "수락 즉시 상호 연락처가 공개됩니다. 바로 업무 협의를 시작하세요.",
  },
];

const partnerSteps = [
  {
    step: "01",
    title: "의뢰 확인",
    description: "등록한 카테고리에 맞는 의뢰가 자동으로 도착합니다. 프로젝트 상세 내용을 확인하세요.",
  },
  {
    step: "02",
    title: "견적 제출",
    description: "업무범위, 금액, 일정을 포함한 견적서를 작성하여 제출합니다.",
  },
  {
    step: "03",
    title: "검토 대기",
    description: "의뢰사가 견적을 검토합니다. 제출 후에도 수정이 가능합니다.",
  },
  {
    step: "04",
    title: "매칭 성사",
    description: "의뢰사가 수락하면 상호 연락처가 공개됩니다. 바로 업무를 시작하세요.",
  },
];

export default function ProcessSection() {
  const [activeTab, setActiveTab] = useState<"client" | "partner">("client");
  const steps = activeTab === "client" ? clientSteps : partnerSteps;

  return (
    <section id="process" className="bg-surface-subtle py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 섹션 헤더 */}
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Process
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            매칭 프로세스
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-foreground-muted">
            간단한 4단계로 최적의 파트너를 만나보세요.
          </p>
        </div>

        {/* 탭 전환 (세그먼트 컨트롤) */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-surface p-1 shadow-soft">
            {(["client", "partner"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-primary text-white shadow-sm"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {tab === "client" ? "의뢰사" : "파트너사"}
              </button>
            ))}
          </div>
        </div>

        {/* 프로세스 스텝 */}
        <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((item, index) => (
            <div key={item.step} className="relative text-center">
              {/* 연결선 (데스크톱) */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-10 hidden h-px w-full bg-gradient-to-r from-primary/30 to-border lg:block" />
              )}

              {/* 스텝 번호 */}
              <div className="relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-surface text-2xl font-bold text-primary shadow-card ring-1 ring-border">
                {item.step}
              </div>

              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
