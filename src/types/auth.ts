export type Role = "client" | "partner";

export type UserStatus = "pending" | "approved" | "restricted" | "suspended";

export type PartnerCategory =
  | "CRO"
  | "CMO/CDMO"
  | "SMO"
  | "RA/인허가"
  | "기업보험"
  | "소모품 공급"
  | "원료·첨가제 공급"
  | "마케팅 대행";

export interface User {
  id: string;
  memberCode: string; // 회원 고유번호 (SJ-C-0001, SJ-P-0002, SJ-CP-0003)
  email: string;
  name: string;
  companyId: string; // 소속 회사 id. 의뢰·견적의 소유는 회원이 아니라 회사 단위다.
  companyLogo?: string | null; // 로고 저장 경로 (company-logos 버킷). 없으면 이니셜로 대신한다.
  company: string;
  businessNumber: string;
  roles: Role[];
  activeRole: Role;
  partnerCategories?: PartnerCategory[];
  phone?: string;
  address?: string; // 기업주소 (선택)
  status: UserStatus;
  isCompanyAdmin?: boolean; // 회사 담당 관리자
  // 손잡다 운영자. 일반 사이트에는 들어올 수 없다 — 운영자가 의뢰사로
  // 보이면 자기 플랫폼의 거래 당사자가 되어 버린다.
  isPlatformAdmin?: boolean;
  // 광고성 정보 수신 동의(선택). 승인·견적·매칭 같은 거래 안내 메일은
  // 이 값과 무관하게 발송된다 — 발송 코드에서 둘을 섞지 말 것.
  marketingConsent?: boolean;
  marketingConsentAt?: string | null;
  verified?: boolean;
  allowCategoryEdit?: boolean; // 관리자가 회사유형 수정을 허용했을 때
  createdAt: string;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  company: string;
  businessNumber: string;
  phone: string;
  roles: Role[];
  partnerCategories?: PartnerCategory[];
  agreeTerms: boolean;
  agreePrivacy: boolean;
}

export interface Inquiry {
  id: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  message: string;
  status: "new" | "read" | "replied" | "closed";
  createdAt: string;
}

export interface MatchingRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientCompany: string;
  partnerId?: string;
  partnerName?: string;
  partnerCompany?: string;
  title: string;
  description: string;
  budget: string;
  status: "pending" | "matching" | "contracted" | "completed" | "cancelled";
  createdAt: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  notifCode?: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}
