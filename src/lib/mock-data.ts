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
export function getRequestsForPartner(partnerCategories: string[], userId: string): MatchRequest[] {
  return getAllRequests().filter((r) => partnerCategories.includes(r.category));
}

// legacy 호환
export function getMyOffers() {
  return [];
}
