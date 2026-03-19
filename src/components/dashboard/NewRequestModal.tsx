"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { MatchRequest } from "@/types/matching";

const categories = [
  "CRO",
  "CMO/CDMO",
  "SMO",
  "RA/인허가",
  "임상시험 보험",
  "소모품 공급",
  "마케팅 대행",
];

interface Props {
  onClose: () => void;
}

export default function NewRequestModal({ onClose }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    budget: "",
    deadline: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newRequest: MatchRequest = {
      id: crypto.randomUUID(),
      clientId: user.id,
      clientCompany: user.company,
      title: form.title,
      category: form.category,
      description: form.description,
      budget: form.budget || "협의",
      deadline: form.deadline || "미정",
      status: "pending",
      createdAt: new Date().toISOString(),
      offers: [],
      quotes: [],
    };

    const requests = JSON.parse(localStorage.getItem("sonjobda_requests") || "[]");
    requests.push(newRequest);
    localStorage.setItem("sonjobda_requests", JSON.stringify(requests));

    alert("매칭 요청이 등록되었습니다. 손잡다매칭에서 최적의 파트너를 찾아드리겠습니다.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">새 매칭 요청</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-foreground/40 transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground">
              요청 제목 *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={form.title}
              onChange={handleChange}
              placeholder="예: Phase III 항암제 임상시험 CRO 매칭"
              className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-foreground">
              카테고리 *
            </label>
            <select
              id="category"
              name="category"
              required
              value={form.category}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">선택해주세요</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground">
              상세 내용 *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={4}
              value={form.description}
              onChange={handleChange}
              placeholder="프로젝트에 대한 상세 설명, 요구사항 등을 작성해주세요."
              className="mt-1 w-full resize-none rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-foreground">
                예산 범위
              </label>
              <input
                type="text"
                id="budget"
                name="budget"
                value={form.budget}
                onChange={handleChange}
                placeholder="예: 5억~10억"
                className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-foreground">
                희망 마감일
              </label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:bg-muted"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              요청 등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
