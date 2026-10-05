"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GROUPS, type QA } from "@/lib/faq";

// 자주 묻는 질문의 검색과 펼침.
//
// 스물다섯 개를 눈으로 훑어 내려가게 두면 결국 안 읽는다. 찾는 말을
// 적으면 그것만 남는다.
//
// 찾을 글의 띄어쓰기는 지우고, 검색어는 낱말로 나눠 전부 들어 있는지
// 본다. "연락처 공개"라고 치면 두 낱말이 서로 떨어져 있는 문장
// ("상대방 연락처는 언제 공개되나요")에도 걸린다. 통째로 맞추면 이런
// 문장을 놓친다.
//
// 검색 중에는 찾은 항목을 펼쳐 둔다. 답을 찾으러 온 사람에게 제목만
// 보여주고 한 번 더 누르게 할 이유가 없다.
//
// 검색어가 없을 때의 모습은 서버에서 그린 것과 같다 — 닫힌 답도 HTML에
// 들어 있어 검색엔진이 읽는다.

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function hit(text: string, tokens: string[]) {
  const hay = norm(text);
  return tokens.every((t) => hay.includes(t));
}

// 찾은 낱말에 표시를 해준다. 원문에 띄어쓰기가 끼어 있으면 그 낱말을
// 그대로 찾지 못하는데, 그때는 표시 없이 둔다 — 글이 틀리게 보이는 것보다
// 표시가 없는 편이 낫다.
function Mark({ text, tokens }: { text: string; tokens: string[] }) {
  if (tokens.length === 0) return <>{text}</>;
  const pattern = tokens
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length)
    .join("|");
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        tokens.includes(part.toLowerCase()) ? (
          <mark key={i} className="rounded bg-primary/15 px-0.5 text-foreground">{part}</mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Item({ item, tokens }: { item: QA; tokens: string[] }) {
  return (
    <details className="group" open={tokens.length > 0}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 text-left">
        <span className="break-keep text-[15px] font-medium text-foreground">
          <Mark text={item.q} tokens={tokens} />
        </span>
        <span
          aria-hidden
          className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-foreground/40 transition-transform group-open:rotate-45"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      </summary>
      <p className="-mt-1 break-keep pb-5 pr-9 text-sm leading-relaxed text-foreground/70">
        <Mark text={item.a} tokens={tokens} />
      </p>
    </details>
  );
}

export default function FaqList() {
  const [query, setQuery] = useState("");

  const tokens = useMemo(() => tokenize(query), [query]);

  const groups = useMemo(() => {
    if (tokens.length === 0) return GROUPS;
    return GROUPS.map((g) => ({
      ...g,
      // 묶음 이름으로도 찾을 수 있게 둔다. "광고"라고 치면 비용과 광고
      // 묶음이 통째로 나오는 편이 낫다.
      items: hit(g.heading, tokens)
        ? g.items
        : g.items.filter((it) => hit(it.q, tokens) || hit(it.a, tokens)),
    })).filter((g) => g.items.length > 0);
  }, [tokens]);

  const hits = groups.reduce((n, g) => n + g.items.length, 0);
  const searching = tokens.length > 0;

  return (
    <>
      <div className="mt-8">
        <label htmlFor="faq-search" className="sr-only">
          질문 검색
        </label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/35">
            <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]">
              <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="궁금한 내용을 검색해보세요 (예: 연락처, 수수료, 승인)"
            className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-4 text-[15px] outline-none transition-colors placeholder:text-foreground/40 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        {searching && (
          <p aria-live="polite" className="mt-2.5 text-sm text-foreground/55">
            {hits > 0 ? `${hits}개 찾았습니다.` : "찾는 내용이 없습니다."}
          </p>
        )}
      </div>

      {hits === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface-subtle p-10 text-center">
          <p className="break-keep text-sm leading-relaxed text-foreground/70">
            &lsquo;{query.trim()}&rsquo;에 대한 답을 찾지 못했습니다.
            <br />
            문의를 남겨주시면 직접 답변해 드립니다.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/inquiry"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              문의하기
            </Link>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-surface-subtle"
            >
              전체 보기
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {groups.map((group) => (
            <section key={group.heading}>
              <h2 className="text-lg font-bold tracking-tight text-foreground">{group.heading}</h2>
              <div className="mt-4 divide-y divide-border border-y border-border">
                {group.items.map((item) => (
                  <Item key={item.q} item={item} tokens={tokens} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
