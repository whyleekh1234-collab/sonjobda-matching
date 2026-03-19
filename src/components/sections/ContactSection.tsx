"use client";

import { useState } from "react";

export default function ContactSection() {
  const [formData, setFormData] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    type: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inquiry = {
      id: crypto.randomUUID(),
      ...formData,
      status: "new",
      createdAt: new Date().toISOString(),
    };
    const inquiries = JSON.parse(localStorage.getItem("sonjobda_inquiries") || "[]");
    inquiries.push(inquiry);
    localStorage.setItem("sonjobda_inquiries", JSON.stringify(inquiries));
    alert("상담 신청이 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.");
    setFormData({ company: "", name: "", email: "", phone: "", type: "", message: "" });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* 좌측: 안내 텍스트 */}
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              Contact
            </span>
            <h2 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
              무료 상담 신청
            </h2>
            <p className="mt-4 text-base leading-relaxed text-foreground/60">
              프로젝트에 대한 간단한 정보를 남겨주시면,
              <br />
              전문 컨설턴트가 최적의 파트너를 추천해 드립니다.
            </p>

            <div className="mt-8 space-y-4">
              {[
                { label: "빠른 응답", desc: "영업일 기준 24시간 내 회신" },
                { label: "무료 컨설팅", desc: "초기 상담 및 파트너 추천 무료" },
                { label: "맞춤 매칭", desc: "프로젝트 특성에 맞는 1:1 매칭" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-sm text-foreground/60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 우측: 폼 */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-muted p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-foreground">
                  회사명 *
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  required
                  value={formData.company}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground">
                  담당자명 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  이메일 *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground">
                  연락처
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="type" className="block text-sm font-medium text-foreground">
                문의 유형 *
              </label>
              <select
                id="type"
                name="type"
                required
                value={formData.type}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">선택해주세요</option>
                <option value="clinical">임상시험 파트너 매칭</option>
                <option value="bio">바이오 업무 매칭</option>
                <option value="consulting">컨설팅 의뢰</option>
                <option value="partner">파트너 등록</option>
                <option value="other">기타 문의</option>
              </select>
            </div>

            <div className="mt-4">
              <label htmlFor="message" className="block text-sm font-medium text-foreground">
                문의 내용
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                value={formData.message}
                onChange={handleChange}
                placeholder="프로젝트에 대한 간략한 설명을 남겨주세요."
                className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              상담 신청하기
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
