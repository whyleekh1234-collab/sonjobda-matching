"use client";

import { useState } from "react";
import { FlaskConical, Factory, ClipboardList, FileCheck2, ShieldCheck, Package, Megaphone } from "lucide-react";

const services = [
  {
    id: "compare",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    title: "견적 비교",
    description:
      "하나의 의뢰로 여러 파트너사의 견적을 한눈에 비교하세요. 금액, 기간, 업무범위를 한 화면에서 검토할 수 있습니다.",
  },
  {
    id: "matching",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: "전문 파트너 연결",
    description:
      "CRO, CMO, SMO, RA 등 7개 카테고리에서 프로젝트에 맞는 파트너사에게 견적을 요청하고 직접 비교하여 선택할 수 있습니다.",
  },
  {
    id: "saving",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    title: "예산 절감",
    description:
      "복수 견적 비교를 통해 최적 비용의 파트너를 선택하세요. 예산 대비 절감액을 실시간으로 확인할 수 있습니다.",
  },
  {
    id: "private",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "비공개 매칭",
    description:
      "매칭 성사 전까지 상호 연락처가 비공개됩니다. 수락 후에만 담당자 정보가 공개되어 안전하게 협업을 시작합니다.",
  },
];

// 견적 비교 예시 데이터
const sampleQuotes = [
  { company: "A바이오", amount: "1억 2,000만", duration: "12개월", highlight: false },
  { company: "B메디컬", amount: "9,800만", duration: "10개월", highlight: true },
  { company: "C리서치", amount: "1억 500만", duration: "11개월", highlight: false },
];

export default function ServicesSection() {
  const [activeDetail, setActiveDetail] = useState<string | null>(null);

  return (
    <section id="services" className="bg-surface py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 섹션 헤더 */}
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Services
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            손잡다매칭 서비스
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-foreground-muted">
            임상시험부터 바이오 의약품 개발까지, 필요한 전문 파트너를 한 곳에서 찾으세요.
          </p>
        </div>

        {/* 서비스 카드 */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setActiveDetail(activeDetail === service.id ? null : service.id)}
              className={`group rounded-2xl border p-6 text-left shadow-card transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-card-hover ${
                activeDetail === service.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface hover:border-primary/30"
              }`}
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
                activeDetail === service.id
                  ? "bg-primary text-white"
                  : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
              }`}>
                {service.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                {service.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                {service.description}
              </p>
            </button>
          ))}
        </div>

        {/* 견적 비교 상세 */}
        {activeDetail === "compare" && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-blue-50">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* 좌측: 예시 화면 */}
              <div className="p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">Preview</p>
                <h3 className="mt-2 text-lg font-bold text-foreground">견적 비교 화면 미리보기</h3>
                <div className="mt-5 space-y-3">
                  {sampleQuotes.map((q) => (
                    <div key={q.company} className={`rounded-xl border p-4 transition-all ${q.highlight ? "border-primary bg-white shadow-md" : "border-border bg-white/80"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white ${q.highlight ? "bg-primary" : "bg-foreground/20"}`}>
                            {q.company.charAt(0)}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${q.highlight ? "text-primary" : "text-foreground"}`}>{q.company}</p>
                            <p className="text-xs text-foreground/40">{q.duration}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-bold ${q.highlight ? "text-primary" : "text-foreground"}`}>{q.amount}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 우측: 장점/특징 */}
              <div className="flex flex-col justify-center border-t border-primary/10 p-6 sm:p-8 lg:border-l lg:border-t-0">
                <h3 className="text-xl font-bold text-foreground">왜 견적 비교가 필요한가요?</h3>
                <div className="mt-6 space-y-5">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">1</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">한 번의 의뢰, 복수의 견적</p>
                      <p className="mt-0.5 text-sm text-foreground/50">의뢰서 하나로 여러 파트너사에게 동시에 견적을 받을 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">2</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">금액 / 기간 / 업무범위 한눈에</p>
                      <p className="mt-0.5 text-sm text-foreground/50">견적서를 나란히 비교하여 가장 합리적인 파트너를 선택하세요.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">3</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">보류 / 검토 / 수락 유연하게</p>
                      <p className="mt-0.5 text-sm text-foreground/50">바로 결정하지 않아도 됩니다. 보류 후 나중에 다시 검토할 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-600">%</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">평균 15~30% 비용 절감</p>
                      <p className="mt-0.5 text-sm text-foreground/50">경쟁 견적을 통해 합리적인 가격에 프로젝트를 진행하세요.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 예산 절감 상세 */}
        {activeDetail === "saving" && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-blue-50">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* 좌측: 예시 화면 */}
              <div className="p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">Dashboard</p>
                <h3 className="mt-2 text-lg font-bold text-foreground">예산 절감 미리보기</h3>
                <div className="mt-5 rounded-xl border border-border bg-white p-5">
                  <p className="text-sm font-medium text-foreground/50">Phase III CRO 위탁 프로젝트</p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground/50">예상 예산</span>
                        <span className="font-semibold text-foreground">1억 5,000만</span>
                      </div>
                      <div className="mt-1.5 h-3 w-full rounded-full bg-foreground/10">
                        <div className="h-3 rounded-full bg-foreground/30" style={{ width: "100%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground/50">수락 견적</span>
                        <span className="font-semibold text-primary">9,800만</span>
                      </div>
                      <div className="mt-1.5 h-3 w-full rounded-full bg-primary/10">
                        <div className="h-3 rounded-full bg-primary" style={{ width: "65%" }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between rounded-lg bg-green-50 p-3">
                    <span className="text-sm font-medium text-green-700">절감액</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">5,200만</span>
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">-34.7%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 우측: 장점/특징 */}
              <div className="flex flex-col justify-center border-t border-primary/10 p-6 sm:p-8 lg:border-l lg:border-t-0">
                <h3 className="text-xl font-bold text-foreground">왜 예산이 절감되나요?</h3>
                <div className="mt-6 space-y-5">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">1</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">복수 견적으로 경쟁 유도</p>
                      <p className="mt-0.5 text-sm text-foreground/50">여러 파트너사가 경쟁적으로 견적을 제출하여 합리적인 가격이 형성됩니다.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">2</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">실시간 절감액 확인</p>
                      <p className="mt-0.5 text-sm text-foreground/50">대시보드에서 예산 대비 실제 비용 절감액을 바로 확인할 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">3</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">미결정 프로젝트 관리</p>
                      <p className="mt-0.5 text-sm text-foreground/50">결정 대기 중인 프로젝트를 한눈에 파악하고 빠르게 결정할 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">4</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">투명한 비용 구조</p>
                      <p className="mt-0.5 text-sm text-foreground/50">금액, 기간, 업무범위가 명확히 기재된 견적서로 합리적 판단이 가능합니다.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 전문 파트너 연결 상세 */}
        {activeDetail === "matching" && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-blue-50">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* 좌측: 카테고리 예시 */}
              <div className="p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">Categories</p>
                <h3 className="mt-2 text-lg font-bold text-foreground">7개 전문 분야 파트너</h3>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    { icon: FlaskConical, label: "CRO", desc: "임상시험 수탁기관" },
                    { icon: Factory, label: "CMO/CDMO", desc: "위탁생산" },
                    { icon: ClipboardList, label: "SMO", desc: "임상시험 운영" },
                    { icon: FileCheck2, label: "RA/인허가", desc: "인허가 컨설팅" },
                    { icon: ShieldCheck, label: "임상시험 보험", desc: "보험가입" },
                    { icon: Package, label: "소모품 공급", desc: "인쇄물/키트" },
                    { icon: Megaphone, label: "마케팅 대행", desc: "심포지엄/웨비나/CSO 등" },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    return (
                    <div key={cat.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                        <p className="text-xs text-foreground-muted">{cat.desc}</p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* 우측: 장점/특징 */}
              <div className="flex flex-col justify-center border-t border-primary/10 p-6 sm:p-8 lg:border-l lg:border-t-0">
                <h3 className="text-xl font-bold text-foreground">왜 전문 파트너 연결인가요?</h3>
                <div className="mt-6 space-y-5">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">1</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">카테고리 기반 자동 분류</p>
                      <p className="mt-0.5 text-sm text-foreground/50">서비스 유형을 선택하면 해당 분야의 파트너사에게만 의뢰가 전달됩니다.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">2</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">구분별 맞춤 양식</p>
                      <p className="mt-0.5 text-sm text-foreground/50">의약품, 의료기기, 화장품 등 구분에 따라 최적화된 의뢰서 양식을 제공합니다.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">3</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">위탁업무 세부 선택</p>
                      <p className="mt-0.5 text-sm text-foreground/50">필요한 업무만 골라서 요청하세요. 세부 항목까지 정밀하게 지정할 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">4</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">5분 만에 의뢰 완료</p>
                      <p className="mt-0.5 text-sm text-foreground/50">4단계 간편 양식으로 복잡한 의뢰도 빠르게 등록할 수 있습니다.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
