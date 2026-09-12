import type { MatchRequest } from "@/types/matching";

// localStorage에서 매칭 요청 가져오기
function getAllRequests(): MatchRequest[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("sonjobda_requests");
  return stored ? JSON.parse(stored) : [];
}

// 의뢰사: 내 요청 목록
export function getMyRequests(userId: string): MatchRequest[] {
  return getAllRequests().filter((r) => r.clientId === userId);
}

// 파트너사: 내 카테고리에 해당하는 의뢰 목록
// selfBusinessNumber가 주어지면 같은 회사(사업자등록번호)가 등록한 의뢰는 제외한다(자기 입찰 방지).
export function getRequestsForPartner(
  partnerCategories: string[],
  selfBusinessNumber?: string
): MatchRequest[] {
  const matched = getAllRequests().filter((r) => partnerCategories.includes(r.category));
  if (!selfBusinessNumber || typeof window === "undefined") return matched;

  const users: { id: string; businessNumber?: string }[] = JSON.parse(
    localStorage.getItem("sonjobda_users") || "[]"
  );
  return matched.filter((r) => {
    const client = users.find((u) => u.id === r.clientId);
    return client?.businessNumber !== selfBusinessNumber;
  });
}

// legacy 호환
export function getMyOffers() {
  return [];
}
