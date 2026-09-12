export type RequestStatus = "pending" | "matching" | "matched" | "completed" | "cancelled";

// 파트너사가 받은 의뢰의 상태
export type QuoteStatus = "new" | "reviewing" | "quoted" | "rejected" | "hold" | "client_reviewing" | "accepted" | "client_rejected" | "client_hold" | "not_selected";

// 의뢰사가 작성하는 매칭 요청
export interface MatchRequest {
  id: string;
  requestCode?: string; // 의뢰 고유번호 (RQ-00000001)
  matchCode?: string; // 매칭 관리번호 (MT-00000001)
  clientId: string;
  clientCompany: string;
  title: string;
  category: string;
  description: string;
  budget: string;
  deadline: string;
  status: RequestStatus;
  createdAt: string;
  offers: MatchOffer[]; // 이 요청에 대한 파트너 제안 목록 (legacy)
  quotes: Quote[]; // 파트너사의 견적서 목록
  formData?: Record<string, unknown>; // 원본 폼 데이터
}

// 플랫폼이 파트너사에 보내는 매칭 제안 (legacy 호환)
export interface MatchOffer {
  id: string;
  requestId: string;
  partnerId: string;
  partnerCompany: string;
  requestTitle: string;
  clientCompany: string;
  category: string;
  message: string;
  status: "proposed" | "accepted" | "rejected";
  proposedAt: string;
}

// 예상소요시간 항목
export interface TimelineItem {
  label: string;
  months: string;
  na: boolean;
}

// 파트너사가 제출하는 견적서
export interface Quote {
  id: string;
  quoteCode?: string; // 견적 고유번호 (QT-0001)
  requestId: string;
  partnerId: string;
  partnerCompany: string;
  // 견적 정보
  subjectCount?: string;
  siteCountCapital?: string;
  siteCountLocal?: string;
  trialDuration?: string;
  perSubjectDuration?: string;
  timeline?: TimelineItem[];
  amount: string; // 견적 금액 (원)
  duration: string; // 예상 소요 기간 (legacy/총합)
  memo: string; // 프로젝트 설명
  attachmentName?: string;
  attachmentData?: string;
  expectedCra?: string;
  monitoringPerSite?: string;
  edcBrand?: string;
  status: QuoteStatus;
  createdAt: string;
}

// 예상소요시간 기본 항목
export const defaultTimeline: TimelineItem[] = [
  { label: "Planning", months: "", na: false },
  { label: "PRT development", months: "", na: false },
  { label: "EDC setup", months: "", na: false },
  { label: "IND", months: "", na: false },
  { label: "IRB", months: "", na: false },
  { label: "FPI", months: "", na: false },
  { label: "LPO", months: "", na: false },
  { label: "DB Lock", months: "", na: false },
  { label: "Site closing", months: "", na: false },
  { label: "STAT", months: "", na: false },
  { label: "CSR", months: "", na: false },
  { label: "IRB closing", months: "", na: false },
];

export const statusLabels: Record<RequestStatus, { label: string; color: string }> = {
  pending: { label: "검토 대기", color: "bg-gray-100 text-gray-600" },
  matching: { label: "매칭 진행중", color: "bg-blue-100 text-blue-700" },
  matched: { label: "매칭 성사", color: "bg-emerald-100 text-emerald-700" },
  completed: { label: "프로젝트 완료", color: "bg-purple-100 text-purple-700" },
  cancelled: { label: "취소됨", color: "bg-red-100 text-red-600" },
};

export const quoteStatusLabels: Record<QuoteStatus, { label: string; color: string }> = {
  new: { label: "신규", color: "bg-blue-100 text-blue-700" },
  reviewing: { label: "검토중", color: "bg-amber-100 text-amber-700" },
  quoted: { label: "견적완료", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "거절", color: "bg-red-100 text-red-600" },
  hold: { label: "보류", color: "bg-gray-100 text-gray-600" },
  client_reviewing: { label: "의뢰사 검토중", color: "bg-amber-100 text-amber-700" },
  accepted: { label: "수락됨", color: "bg-primary/10 text-primary" },
  client_rejected: { label: "거절됨", color: "bg-red-100 text-red-600" },
  client_hold: { label: "보류", color: "bg-gray-100 text-gray-600" },
  not_selected: { label: "미결정", color: "bg-gray-100 text-gray-500" },
};

export const offerStatusLabels: Record<string, { label: string; color: string }> = {
  proposed: { label: "제안 받음", color: "bg-amber-100 text-amber-700" },
  accepted: { label: "수락", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "거절", color: "bg-red-100 text-red-600" },
};
