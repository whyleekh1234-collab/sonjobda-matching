"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { listOpenCounts, type OpenCount } from "@/lib/data/openBoard";
import { reportFailure } from "@/lib/errorMessage";

// 분야별 "견적 대기중" 전광판.
//
// 파트너사가 될 사람에게 "여기 일이 있다"고 말하는 자리다. 광고와 달리
// 비어 있으면 아예 사라진다. 광고 자리는 빈 칸 자체가 "이 자리를 팝니다"
// 라는 알림이지만, 여기 빈 칸은 "아직 아무도 안 쓰는 곳"이라는 뜻이 된다.
//
// 그래서 바닥을 둔다. 띄울 것이 FLOOR건보다 적으면 구역째 안 그린다.
// 0건일 때 "지금 견적을 기다리는 의뢰 0건"이라고 적힌 판을 걸어 두는 것은
// 아무 말도 안 하느니만 못하다.
//
// 처음에는 3으로 뒀다. 한 분야에 두 건만 떠 있는 전광판이 빈약해 보일까
// 봐서였는데, 그것은 내 판단이지 이 사업의 판단이 아니다. 1건이라도 있으면
// 보여 주는 쪽을 택한다 — 파트너사가 될 사람에게는 "두 건 있다"가 "아무
// 말도 없다"보다 낫다.
const FLOOR = 1;

// 분야 차례. 집계는 건수 순으로 오지만, 화면은 늘 같은 자리에 같은
// 분야가 있어야 눈에 익는다.
const ORDER = [
  "CRO", "CMO/CDMO", "SMO", "RA/인허가",
  "기업보험", "소모품 공급", "원료·첨가제 공급", "마케팅 대행",
];

function sortByOrder(rows: OpenCount[]): OpenCount[] {
  return [...rows].sort((a, b) => {
    const ia = ORDER.indexOf(a.category);
    const ib = ORDER.indexOf(b.category);
    // 목록에 없는 분야가 들어오면 뒤로 보낸다. 지우지는 않는다 —
    // 분야가 늘었는데 화면만 안 고친 경우에 소리 없이 사라지면 안 된다.
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

export default function OpenBoardSection() {
  const { user } = useAuth();
  const [rows, setRows] = useState<OpenCount[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listOpenCounts();
        if (alive) setRows(data);
      } catch (err) {
        // 전광판이 안 떠도 손님이 할 일은 없다. 화면에는 아무 말도 하지
        // 않고 구역만 사라진다. 대신 우리는 알아야 한다 — 조용히 꺼진
        // 채로 한 달이 지나는 것이 지금까지의 문제였다.
        reportFailure("전광판 불러오기", err instanceof Error ? err.message : String(err));
        if (alive) setRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!rows) return null; // 불러오는 동안에는 자리를 잡아 두지 않는다
  const open = rows.filter((r) => r.count > 0);
  const total = open.reduce((sum, r) => sum + r.count, 0);
  if (total < FLOOR) return null;

  // 비회원은 가입으로, 로그인한 사람은 받은 의뢰로 보낸다. 전광판을 보고
  // 움직이는 사람은 대개 아직 회원이 아니다.
  const href = user ? "/dashboard/partner" : "/signup";

  return (
    <section className="border-y border-border bg-slate-900">
      <div className="mx-auto max-w-6xl px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <p className="text-sm font-semibold text-white">
              지금 견적을 기다리는 의뢰{" "}
              <span className="board-count tabular-nums text-emerald-400">{total}</span>건
            </p>
          </div>

          <Link
            href={href}
            className="text-xs font-medium text-white/60 transition-colors hover:text-white"
          >
            파트너사로 견적 내기 →
          </Link>
        </div>

        <ul className="mt-4 flex flex-wrap gap-2">
          {sortByOrder(open).map((r, i) => (
            <li key={r.category}>
              <Link
                href={href}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 transition-colors hover:border-white/25 hover:bg-white/10"
              >
                <span className="text-sm text-white/85">{r.category}</span>
                {/* 칸마다 조금씩 늦게 깜빡인다. 다 같이 깜빡이면 화면
                    전체가 한 번에 번쩍여서 눈이 피로하고, 전광판보다는
                    경고등처럼 읽힌다. */}
                <span
                  className="board-count rounded bg-emerald-400/15 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-emerald-300"
                  style={{ animationDelay: `${i * 0.22}s` }}
                >
                  {r.count}건
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* 마감일이 지난 건은 세지 않는다는 것을 밝혀 둔다. 숫자를 보고
            들어온 사람이 목록에서 다른 수를 보면 그때부터 숫자를 안 믿는다. */}
        <p className="mt-3 text-[11px] text-white/35">
          마감일이 지나지 않은 의뢰만 셉니다. 분야는 가입할 때 고른 것만 보입니다.
        </p>
      </div>
    </section>
  );
}
