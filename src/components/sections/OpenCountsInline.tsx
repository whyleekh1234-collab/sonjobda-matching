"use client";

import { useEffect, useState } from "react";
import { listOpenCounts, type OpenCount } from "@/lib/data/openBoard";
import { reportFailure } from "@/lib/errorMessage";

// 안내 화면 안에 끼워 넣는 "지금 올라와 있는 의뢰".
//
// 메인 화면의 전광판(OpenBoardSection)과 같은 숫자를 쓰지만 생김새가
// 다르다. 저쪽은 화면 폭을 다 쓰는 어두운 띠고, 여기는 글 사이에 놓이는
// 밝은 상자다. 같은 컴포넌트를 억지로 양쪽에 쓰면 둘 다 어색해진다.
//
// 없으면 사라지는 것은 같다. "지금 0건"이라고 적힌 모집 안내는 안 적느니
// 만 못하다.

const ORDER = [
  "CRO", "CMO/CDMO", "SMO", "RA/인허가",
  "기업보험", "소모품 공급", "원료·첨가제 공급", "마케팅 대행",
];

export default function OpenCountsInline() {
  const [rows, setRows] = useState<OpenCount[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listOpenCounts();
        if (alive) setRows(data);
      } catch (err) {
        reportFailure("파트너사 안내 건수", err instanceof Error ? err.message : String(err));
        if (alive) setRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!rows) return null;
  const open = rows.filter((r) => r.count > 0);
  const total = open.reduce((s, r) => s + r.count, 0);
  if (total < 1) return null;

  const sorted = [...open].sort((a, b) => {
    const ia = ORDER.indexOf(a.category);
    const ib = ORDER.indexOf(b.category);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <p className="text-sm font-semibold text-foreground">
          지금 견적을 기다리는 의뢰 <span className="tabular-nums text-emerald-600">{total}</span>건
        </p>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {sorted.map((r) => (
          <li
            key={r.category}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
          >
            <span className="text-sm text-foreground/80">{r.category}</span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-emerald-700">
              {r.count}건
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-foreground/50">
        마감일이 지나지 않은 의뢰만 셉니다. 등록하신 분야의 의뢰만 열람할 수 있습니다.
      </p>
    </div>
  );
}
