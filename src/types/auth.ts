export type Role = "client" | "partner";

export type UserStatus = "pending" | "approved" | "restricted" | "suspended";

export type PartnerCategory =
  | "CRO"
  | "CMO/CDMO"
  | "SMO"
  | "RA/인허가"
  | "임상시험 보험"
  | "소모품 공급"
  | "마케팅 대행";

export interface User {
  id: string;
  memberCode: string; // 회원 고유번호 (SJ-C-0001, SJ-P-0002, SJ-CP-0003)
  email: string;
  name: string;
  companyId: string; // 소속 회사 id. 의뢰·견적의 소유는 회원이 아니라 회사 단위다.
  company: string;
  businessNumber: string;
  roles: Role[];
  activeRole: Role;
  partnerCategories?: PartnerCategory[];
  phone?: string;
  address?: string; // 기업주소 (선택)
  status: UserStatus;
  isCompanyAdmin?: boolean; // 회사 담당 관리자
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
