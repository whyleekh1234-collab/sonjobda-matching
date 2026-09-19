"use client";

import { useEffect, useState } from "react";
import CompanyLogo from "@/components/CompanyLogo";
import { getMatchContacts, type MatchContact } from "@/lib/data/requests";

// 매칭이 성사된 뒤에만 상대방 연락처가 열린다. 서버가 "이 매칭의 당사자인가"를
// 확인한 뒤에야 값을 내주므로, 화면에서 숨기는 게 아니라 아예 받아오지 못한다.
export default function MatchContactPanel({
  requestId,
  show,
}: {
  requestId: string;
  show: "client" | "partner";
}) {
  const [contact, setContact] = useState<MatchContact | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getMatchContacts(requestId)
      .then((rows) => {
        if (!alive) return;
        const found = rows.find((r) => r.side === show) ?? null;
        setContact(found);
        setFailed(!found);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [requestId, show]);

  if (failed) return null;
  if (!contact) {
    return (
      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs text-blue-700">연락처를 불러오는 중입니다...</p>
      </div>
    );
  }

  const label = show === "partner" ? "파트너사" : "의뢰사";

  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <p className="mb-2 text-xs font-semibold text-blue-700">
        매칭 성사로 {label} 연락처가 공개되었습니다
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs text-blue-900">
        <span className="inline-flex items-center gap-1.5">회사명: <CompanyLogo path={contact.logoPath} name={contact.companyName} size={20} /><span className="font-medium">{contact.companyName}</span></span>
        <span>담당자명: <span className="font-medium">{contact.contactName}</span></span>
        <span>이메일: <span className="font-medium">{contact.email}</span></span>
        <span>연락처: <span className="font-medium">{contact.phone || "-"}</span></span>
      </div>
    </div>
  );
}
