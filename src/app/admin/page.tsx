"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  listAllUsers,
  listAllInquiries,
  listAllNotices,
  listAllNotifications,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
  replyInquiry,
  editInquiryReply,
  setInquiryStatus,
  createNotice,
  deleteNotice as deleteNoticeApi,
  sendNotification as sendNotificationApi,
  replyNotification,
  setCompanyAdmin,
  updateProfileAsAdmin,
  updateCompanyAsAdmin,
  markAllMyNotificationsRead,
  markNotificationRead as markNotificationReadApi,
  type AdminInquiry as Inquiry,
  type AdminNotification,
} from "@/lib/data/admin";
import {
  listAllChangeRequests,
  reviewChangeRequest,
  FIELD_LABELS,
  type CompanyChangeRequest,
} from "@/lib/data/changeRequests";
import { listPartnerRequests } from "@/lib/data/requests";
import { changeMyPassword } from "@/lib/data/notices";
import { setPlatformAdmin, setMfaEmail, sanctionMember, listSanctions, resolveInquiry,
  SANCTION_LABELS, type SanctionKind, type SanctionRow } from "@/lib/data/admin";
import PasswordInput from "@/components/PasswordInput";
import { getPartnerProfile, verifyPartnerProfile, type PartnerProfile , listProfileDocs } from "@/lib/data/partnerProfiles";
import PartnerProfileCard from "@/components/partner/PartnerProfileCard";
import CompanyLogo from "@/components/CompanyLogo";
import QuoteAttachment from "@/components/dashboard/QuoteAttachment";
import type { MatchingRequest, Notice } from "@/types/auth";
import { toast } from "@/components/ui/Toast";
import { confirmDialog } from "@/components/ui/Confirm";

type Tab = "overview" | "users" | "matching" | "matched" | "inquiries" | "notices" | "notifications" | "reports" | "operators";
const TAB_KEYS: Tab[] = ["overview", "users", "matching", "matched", "inquiries", "notices", "notifications", "reports"];

// 펼친 상세의 맨 아래에 붙는 "목록으로" 줄. 긴 상세를 다 읽고 나서 위로
// 스크롤해 다시 제목을 누르지 않아도 되게.
function BackToList({ onClick, label = "목록으로" }: { onClick: () => void; label?: string }) {
  return (
    <div className="mt-4 flex justify-end border-t border-border pt-3">
      <button type="button" onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-muted">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
        {label}
      </button>
    </div>
  );
}

interface UserData {
  id: string;
  memberCode?: string;
  name: string;
  companyId?: string;
  company: string;
  email: string;
  roles: string[];
  activeRole: string;
  partnerCategories?: string[];
  phone?: string;
  businessNumber?: string;
  address?: string;
  status: string;
  // profiles.verified는 더 쓰지 않는다. 승인과 같은 판단을 담은 두 번째
  // 버튼이라 승인만 누르면 덜 한 것처럼 보였다. DB 칸은 남겨 두었다 —
  // 지우려면 admin_list_users 반환 타입을 바꿔야 하고, 그러는 동안 회원
  // 목록이 뜨지 않는다.
  isCompanyAdmin?: boolean;
  allowCategoryEdit?: boolean;
  createdAt?: string;
  marketingConsent?: boolean;
  marketingConsentAt?: string | null;
  isPlatformAdmin?: boolean;
  mfaEmail?: string | null;
  licensePath?: string | null;
  licenseName?: string | null;
  sanctionCount?: number;
}

// 표 안의 날짜.
//
// toLocaleDateString("ko-KR")은 "2026. 10. 5."처럼 공백이 섞인 글자를
// 준다. 좁은 칸에서는 그 공백에서 줄이 갈라져 "2026. 10." / "5."로
// 끊긴다. 자리를 적게 쓰고 끊기지 않는 모양으로 고정한다.
function ymdhm(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function ymd(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

// 제재 사유.
//
// 사유를 빈칸으로 두면 사람마다 다른 말로 적는다. 같은 일에 어떤 날은
// "정보 부정확", 어떤 날은 "이름이 이상함"이라고 남으면, 나중에 왜
// 막았는지 설명할 수 없고 당사자에게도 들쭉날쭉한 통지가 간다.
//
// 그래서 조치마다 쓰는 사유를 정해 둔다. 고르면 그 문구가 들어가고
// 뒤에 구체적인 내용을 덧붙일 수 있다.
//
// 정지에는 하나만 둔다. 정지는 로그인을 막는 가장 센 조치라 운영자
// 재량으로 내릴 일이 아니다. 서비스운영정책 제6조 ③이 정한 "이용 제한
// 누적 3회"에 이르렀을 때만 쓴다. 그 전 단계는 경고와 제한이다.
const SANCTION_REASONS: Record<SanctionKind, string[]> = {
  warning: [
    "가입 정보가 정확하지 않음",
    "사업자등록증 미제출",
    "신고 접수 — 사실 확인 요청",
    "서비스운영정책 위반",
  ],
  restrict: [
    "가입 정보 부정확 — 담당자명이 실명과 다름",
    "가입 정보 부정확 — 회사명·사업자등록번호 불일치",
    "사업자등록증 미제출 또는 식별 불가",
    "신고 접수 — 사실 확인 중",
    "서비스운영정책 위반",
    "거래 의사 없는 반복 등록",
  ],
  suspend: [
    "이용 제한 누적 3회 — 서비스운영정책 제6조 ③",
  ],
  // 기각은 당사자를 제재하지 않는다. 신고를 접수하고 조사한 뒤 "조치할
  // 일이 아니다"로 닫는 경우라, 신고한 쪽에 돌려줄 말이 필요하다.
  dismiss: [
    "신고 내용이 사실과 다름",
    "제재할 사유에 해당하지 않음",
    "증빙이 부족해 사실 확인 불가",
  ],
};

// 알림에 쓰는 정형 문구.
//
// 운영자가 매번 처음부터 쓰면 같은 상황에도 말이 달라진다. 받는 쪽은
// 그게 규정인지 그 사람 생각인지 알 수 없고, 나중에 분쟁이 생기면
// "뭐라고 안내했는지"가 사람마다 다르게 남는다.
//
// 고르면 그대로 들어가고, 거기서 고쳐 보낼 수 있다. 틀을 주되 묶지는
// 않는다. {담당자명}과 {회사명}은 고른 회원의 값으로 바뀐다.
const NOTICE_TEMPLATES: { group: string; items: { label: string; body: string }[] }[] = [
  {
    group: "서류 · 정보 보완",
    items: [
      {
        label: "담당자명 확인 요청",
        body: "가입하신 담당자명({담당자명})이 실제 성함과 다른 것으로 보입니다.\n마이페이지에서 실명으로 수정해 주세요.\n확인되지 않으면 이용이 제한될 수 있습니다.",
      },
      {
        label: "사업자등록증 재제출 요청",
        body: "제출하신 사업자등록증을 확인하기 어렵습니다.\n글자가 선명하게 보이도록 다시 제출해 주세요.\n고객센터(contact@sonjobdamd.com)로 보내주셔도 됩니다.",
      },
      {
        label: "사업자등록증 미제출 안내",
        body: "{회사명}의 사업자등록증이 아직 제출되지 않았습니다.\n승인 심사에 필요한 서류라 제출 전에는 이용이 제한됩니다.\n고객센터(contact@sonjobdamd.com)로 보내주세요.",
      },
      {
        label: "회사 정보 불일치",
        body: "가입하신 회사명 또는 사업자등록번호가 제출 서류와 일치하지 않습니다.\n마이페이지에서 회사 정보 변경을 요청해 주세요.",
      },
    ],
  },
  {
    group: "승인 · 이용 제한",
    items: [
      {
        label: "가입 승인 완료",
        body: "{회사명}의 회원가입이 승인되었습니다.\n지금부터 손잡다매칭을 이용하실 수 있습니다.",
      },
      {
        label: "이용 제한 안내",
        body: "회원 정보에 확인이 필요하여 이용이 일시 제한되었습니다.\n아래 내용을 보완해 주시면 해제해 드립니다.\n\n보완할 내용: \n\n이의가 있으시면 통지일로부터 7일 이내에 고객센터(contact@sonjobdamd.com)로 알려주세요.",
      },
      {
        label: "이용 제한 해제",
        body: "확인이 완료되어 이용 제한이 해제되었습니다.\n정상적으로 이용하실 수 있습니다.",
      },
    ],
  },
  {
    group: "거래 안내",
    items: [
      {
        label: "견적 제출 요청",
        body: "{회사명} 분야의 새 의뢰가 등록되었습니다.\n받은 의뢰에서 확인하시고 견적을 제출해 주세요.",
      },
      {
        label: "의뢰 마감 임박",
        body: "등록하신 의뢰의 마감일이 다가오고 있습니다.\n받은 견적을 확인하고 선정을 진행해 주세요.",
      },
      {
        label: "추가 자료 요청",
        body: "진행 중인 건과 관련해 확인할 내용이 있습니다.\n고객센터(contact@sonjobdamd.com)로 연락 부탁드립니다.",
      },
    ],
  },
];

// 회원 상세 모달의 동작 버튼. 색을 기능마다 다르게 줬더니 산만해서
// 하나로 통일했다. 호버 강조는 globals.css의 전역 규칙이 맡는다.
const ACTION_BTN =
  "rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900";
// 회원 목록 행의 작은 동작 버튼. 같은 톤, 작은 크기.
const ROW_BTN =
  "rounded bg-slate-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-900";

// 회원 유형 표시. 색 대신 채움/테두리로 구분한다 — 의뢰사는 채운 배지,
// 파트너사는 테두리 배지. 색약이어도, 흑백 인쇄해도 구분된다.
function RoleBadge({ role }: { role: string }) {
  const partner = role === "partner";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      partner
        ? "border border-slate-400 bg-transparent text-slate-700"
        : "border border-slate-700 bg-slate-700 text-white"
    }`}>
      <span className="text-[10px] opacity-70">{partner ? "P" : "C"}</span>
      {partner ? "파트너사" : "의뢰사"}
    </span>
  );
}

const typeLabels: Record<string, string> = {
  general: "일반 문의",
  quote: "견적관련 문의",
  account: "계정/회원 문의",
  technical: "기술/시스템 문의",
  partnership: "제휴/파트너십 문의",
  complaint: "불만/개선 요청",
  report: "문제 회원 신고",
  other: "기타",
  clinical: "임상시험 파트너 매칭",
  bio: "바이오 업무 매칭",
  consulting: "컨설팅 의뢰",
  partner: "파트너 등록",
};

const matchingStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "대기중", color: "bg-yellow-100 text-yellow-700" },
  matching: { label: "매칭중", color: "bg-blue-100 text-blue-700" },
  contracted: { label: "계약완료", color: "bg-green-100 text-green-700" },
  completed: { label: "완료", color: "bg-gray-100 text-gray-700" },
  cancelled: { label: "취소", color: "bg-red-100 text-red-700" },
};

export default function AdminDashboard() {
  const { isAdmin, adminId, isLoading, logout } = useAdminAuth();
  const router = useRouter();
  const [activeTab, setActiveTabState] = useState<Tab>("overview");
  const [selectedRequestDetail, setSelectedRequestDetail] = useState<string | null>(null);

  // 탭을 주소(?tab=)에 적는다. 브라우저 뒤로가기가 이전 탭으로 돌아가고,
  // 새로고침해도 보던 탭이 유지된다. useSearchParams는 Suspense 경계를
  // 요구해서 history API를 직접 쓴다.
  useEffect(() => {
    const read = () => {
      const t = new URLSearchParams(window.location.search).get("tab");
      setActiveTabState(TAB_KEYS.includes(t as Tab) ? (t as Tab) : "overview");
      setSelectedRequestDetail(null);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  // Esc로 팝업과 펼친 상세를 닫는다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSelectedUser(null); setUserEdit(null);
      setShowNotificationModal(false);
      setSelectedRequestDetail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const setActiveTab = (t: Tab) => {
    setActiveTabState(t);
    setSelectedRequestDetail(null);
    const u = new URL(window.location.href);
    if (t === "overview") u.searchParams.delete("tab"); else u.searchParams.set("tab", t);
    window.history.pushState({}, "", u);
  };
  const [users, setUsers] = useState<UserData[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [matchings, setMatchings] = useState<MatchingRequest[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeForm, setNoticeForm] = useState({ title: "", content: "" });
  const [notificationForm, setNotificationForm] = useState({ userId: "", message: "" });
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [allRequests, setAllRequests] = useState<{ id: string; requestCode?: string; matchCode?: string; clientId: string; clientCompany: string; clientLogo?: string | null; title: string; category: string; description: string; budget: string; deadline: string; status: string; createdAt: string; quotes?: { id: string; quoteCode?: string; partnerId: string; partnerCompany: string; partnerLogo?: string | null; amount: string; duration: string; memo: string; status: string; createdAt: string; attachmentName?: string; attachmentData?: string }[] }[]>([]);
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [matchingView, setMatchingView] = useState<"all" | "requests" | "quotes">("all");
  const [matchingSortBy, setMatchingSortBy] = useState<"matchCode" | "title" | "client" | "partner" | "amount" | "category">("matchCode");
  const [matchingSortDir, setMatchingSortDir] = useState<"asc" | "desc">("asc");
  const toggleMatchSort = (key: typeof matchingSortBy) => {
    if (matchingSortBy === key) setMatchingSortDir(matchingSortDir === "asc" ? "desc" : "asc");
    else { setMatchingSortBy(key); setMatchingSortDir("asc"); }
  };
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [changeRequests, setChangeRequests] = useState<CompanyChangeRequest[]>([]);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [inquiryReplyingTo, setInquiryReplyingTo] = useState<string | null>(null);
  const [inquiryReplyText, setInquiryReplyText] = useState("");
  const [editingInqReply, setEditingInqReply] = useState<{ inqId: string; replyIdx: number } | null>(null);
  const [editInqReplyText, setEditInqReplyText] = useState("");
  const [adminReplyingTo, setAdminReplyingTo] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [admins, setAdmins] = useState<UserData[]>([]);
  // 신고만 따로 보기. 일반 문의와 섞여 있으면 눈에 띄지 않는다.
  const [inquiryOnlyReports, setInquiryOnlyReports] = useState(false);
  // 제재 창. 어느 신고에서 비롯됐는지 함께 들고 있어야 이력에 남길 수 있다.
  const [sanctionFor, setSanctionFor] = useState<{ user: UserData; inquiryId?: string } | null>(null);
  // 사유 유형은 통지의 제목이 되고, 상세는 본문이 된다. 한 칸에 섞어
  // 받으면 받는 쪽이 무엇이 문제인지 한눈에 알기 어렵다.
  const [sanctionForm, setSanctionForm] = useState<{ kind: SanctionKind; reason: string; detail: string }>(
    { kind: "warning", reason: "", detail: "" }
  );
  const [sanctionHistory, setSanctionHistory] = useState<SanctionRow[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "", mfaEmail: "" });
  // 파트너사 초대. 기업보험처럼 스스로 가입하지 못하게 닫아 둔 분야는
  // 운영자가 넣어 주지 않으면 비어 있게 된다.
  const [showInvitePartner, setShowInvitePartner] = useState(false);
  const [newPartner, setNewPartner] = useState<{ companyName: string; businessNumber: string; email: string; categories: string[] }>(
    { companyName: "", businessNumber: "", email: "", categories: [] }
  );
  const [partnerBiz, setPartnerBiz] = useState<{ ok: boolean | null; note: string; checking: boolean }>(
    { ok: null, note: "", checking: false }
  );
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [userFilterRole, setUserFilterRole] = useState<"all" | "client" | "partner">("all");
  const [userFilterStatus, setUserFilterStatus] = useState<"all" | "approved" | "pending" | "restricted" | "suspended">("all");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  // 회원 상세 모달의 "정보 수정" 폼. null이면 보기 모드.
  // 선택한 회원 회사의 파트너 프로필(있으면). 운영자가 보고 확인 표시를 한다.
  const [selectedProfile, setSelectedProfile] = useState<PartnerProfile | null | undefined>(undefined);
  // 회사소개서는 companies에 달려 있어 역량 프로필과 따로 읽는다.
  // 승인·제재를 판단할 때 쓰는 자료라 운영자도 볼 수 있어야 한다.
  const [selectedDocName, setSelectedDocName] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!selectedUser?.companyId || !selectedUser.roles?.includes("partner")) { setSelectedProfile(undefined); return; }
    let alive = true;
    getPartnerProfile(selectedUser.companyId).then((p) => alive && setSelectedProfile(p)).catch(() => alive && setSelectedProfile(null));
    listProfileDocs([selectedUser.companyId]).then((m) => alive && setSelectedDocName(m[selectedUser.companyId!])).catch(() => {});
    return () => { alive = false; };
  }, [selectedUser?.companyId, selectedUser?.roles]);
  const [userEdit, setUserEdit] = useState<{
    name: string; phone: string; company: string; businessNumber: string; address: string;
  } | null>(null);

  // 고유번호(MT-, NF-)를 화면에서 채워 넣던 코드는 사라졌다. 이제 DB
  // 시퀀스가 부여하므로 빠진 번호를 나중에 메울 일이 없다.
  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    // 하나가 실패해도 나머지는 그린다. Promise.all은 하나가 거절되면
    // 나머지 결과까지 버린다 — DB에 아직 없는 칸을 코드가 먼저 찾는
    // 동안(마이그레이션 전 배포) 의뢰 조회 하나 때문에 회원·문의·공지가
    // 모두 0으로 보였다. 데이터가 사라진 것처럼 읽힌다.
    const [userRes, inquiryRes, requestRes, noticeRes, notifRes] = await Promise.allSettled([
      listAllUsers(),
      listAllInquiries(),
      listPartnerRequests(),
      listAllNotices(),
      listAllNotifications(),
    ]);
    const parts = [
      { res: userRes, label: "회원" },
      { res: inquiryRes, label: "문의" },
      { res: requestRes, label: "의뢰" },
      { res: noticeRes, label: "공지" },
      { res: notifRes, label: "알림" },
    ];
    const failed = parts.filter((p) => p.res.status === "rejected");
    if (failed.length > 0) {
      failed.forEach((p) =>
        console.error(`[관리자] ${p.label} 불러오기 실패`, (p.res as PromiseRejectedResult).reason));
      // 조용히 0으로 두지 않는다. 비어 보이는 것과 못 불러온 것은 다르다.
      toast(
        `${failed.map((p) => p.label).join(", ")}을(를) 불러오지 못했습니다. ` +
        "데이터가 사라진 것은 아닙니다. 새로고침해도 같으면 알려주세요.",
        "error"
      );
    }
    try {
      const userList = userRes.status === "fulfilled" ? userRes.value : [];
      const inquiryList = inquiryRes.status === "fulfilled" ? inquiryRes.value : [];
      const requestList = requestRes.status === "fulfilled" ? requestRes.value : [];
      const noticeList = noticeRes.status === "fulfilled" ? noticeRes.value : [];
      const notifList = notifRes.status === "fulfilled" ? notifRes.value : [];
      // 운영자는 회원이 아니다. 계정 구조상 프로필을 갖고 있지만(권한 함수가
      // 프로필을 전제로 한다) 회원 목록·통계·회원번호 체계에서는 빼야 한다.
      // 손잡다메디칼 직원이 "의뢰사 회원"으로 세어지면 안 된다.
      setUsers(userList.filter((u) => !u.isPlatformAdmin));
      // 운영자는 회원 목록에서 빠지므로 따로 들고 있어야 화면에 보여줄 수 있다.
      setAdmins(userList.filter((u) => u.isPlatformAdmin));
      setInquiries(inquiryList);
      setAllRequests(requestList);
      setNotices(noticeList);
      setAdminNotifications(notifList);
    } catch (err) {
      console.error(err);
    }

    // 변경 요청은 따로 불러온다. 이것 하나가 실패해도 회원·의뢰·문의가
    // 같이 사라지면 안 된다. Promise.all에 묶었다가 테이블이 없는 동안
    // 관리자 화면 전체가 비는 일이 있었다.
    try {
      setChangeRequests(await listAllChangeRequests());
    } catch (err) {
      console.error(err);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isLoading && !isAdmin) router.push("/admin/login");
  }, [isAdmin, isLoading, router]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadData(); }, [activeTab]);
  useEffect(() => {
    window.addEventListener("focus", loadData);
    return () => window.removeEventListener("focus", loadData);
  }, [loadData]);

  if (isLoading || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center"><div className="text-foreground/50">로딩 중...</div></div>;
  }

  // 모든 쓰기는 운영자 자격을 서버에서 확인한 뒤 실행된다.
  const run = async (fn: () => Promise<void>, successMessage?: string) => {
    try {
      await fn();
      await loadData();
      if (successMessage) toast(successMessage);
    } catch (err) {
      toast(err instanceof Error ? err.message : "처리하지 못했습니다.");
    }
  };

  // ─── 회원 관리 ───
  const updateUserField = (userId: string, field: string, value: unknown) => {
    // 파트너사 유형은 프로필 수정 함수(10단계)로 간다. 이해상충 트리거에 걸리면
    // 서버 메시지가 그대로 알림으로 뜬다.
    if (field === "partnerCategories") {
      run(() => updateProfileAsAdmin(userId, { partnerCategories: value as string[] }));
      return;
    }
    const key =
      field === "status" ? { status: value as string }
      : field === "allowCategoryEdit" ? { allowCategoryEdit: value as boolean }
      : null;
    if (!key) return;
    run(() => updateUserApi(userId, key));
  };

  // 등록증을 연다. 비공개 버킷이라 서버가 운영자인지 다시 따진 뒤 5분짜리
  // 서명 링크를 내준다. 목록과 상세가 같은 경로를 쓴다.
  const openLicense = async (companyId?: string) => {
    try {
      const res = await fetch("/api/admin/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "열 수 없습니다.");
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      toast(err instanceof Error ? err.message : "열 수 없습니다.");
    }
  };

  // 승인은 등록증을 보고 판단하는 일이다. 목록 줄에서 바로 승인할 수 있으니
  // 서류를 안 보고 통과시키기 쉽다. 미제출이면 한 번 되묻는다 — 막지는
  // 않는다. 전화로 먼저 확인했거나 나중에 받기로 한 경우가 있다.
  const approveUser = async (user: UserData): Promise<boolean> => {
    if (
      !user.licensePath &&
      !await confirmDialog(
        '"' + user.company + '"는 사업자등록증을 제출하지 않았습니다.' + String.fromCharCode(10) +
        "서류 없이 그대로 승인하시겠습니까?"
      )
    ) {
      return false;
    }
    // 승인하고 나서 메일로 알린다. 회원은 가입해 놓고 기다리는 중이라,
    // 사이트에 들어와 봐야 아는 것은 앞뒤가 맞지 않는다.
    //
    // 메일이 실패해도 승인은 이미 끝났다. 되돌리지 않고 운영자에게만
    // 알린다 — 알림 발송으로 따로 알릴 수 있다.
    run(async () => {
      await updateUserApi(user.id, { status: "approved" });
      try {
        const res = await fetch("/api/admin/approve-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: user.id }),
        });
        const d = await res.json().catch(() => ({}));
        if (!d.sent) {
          toast(
            `승인은 끝났지만 안내 메일이 나가지 않았습니다. (${d.reason ?? d.message ?? "원인 미상"})`,
            "error"
          );
        }
      } catch {
        toast("승인은 끝났지만 안내 메일이 나가지 않았습니다.", "error");
      }
    }, "승인했습니다. 안내 메일을 보냈습니다.");
    return true;
  };

  // 제한·정지는 제재 창으로 보낸다.
  //
  // 전에는 "제한하시겠습니까?"만 묻고 조용히 상태를 바꿨다. 당사자는
  // 무엇 때문에 막혔는지 모른 채 기능이 안 되는 것만 겪고, 운영자 쪽에도
  // 왜 그랬는지가 남지 않는다. 제재 창은 사유를 받아 이력에 남기고
  // 당사자에게 통지까지 한 번에 한다(phase24).
  const openSanction = (user: UserData, kind: SanctionKind = "restrict") => {
    setSanctionFor({ user });
    // 정지는 사유가 하나뿐이라 미리 넣어 둔다. 고를 것이 하나인데
    // 고르게 하는 것은 일만 늘린다.
    setSanctionForm({
      kind,
      reason: kind === "suspend" ? SANCTION_REASONS.suspend[0] : "",
      detail: "",
    });
  };

  const deleteUser = (userId: string) => {
    run(() => deleteUserApi(userId));
  };

  // ─── 문의 관리 ───
  const replyToInquiry = (id: string) => {
    if (!inquiryReplyText.trim()) return;
    const text = inquiryReplyText;
    setInquiryReplyingTo(null);
    setInquiryReplyText("");
    run(() => replyInquiry(id, text));
  };

  const updateInqReply = (inqId: string, replyIdx: number) => {
    if (!editInqReplyText.trim()) return;
    const text = editInqReplyText;
    setEditingInqReply(null);
    setEditInqReplyText("");
    run(() => editInquiryReply(inqId, replyIdx, text));
  };

  const deleteInqReply = async (inqId: string, replyIdx: number) => {
    if (!await confirmDialog("답변을 삭제하시겠습니까?")) return;
    run(() => editInquiryReply(inqId, replyIdx, null));
  };

  const updateInquiryStatus = (id: string, status: "new" | "read" | "replied" | "closed") => {
    run(() => setInquiryStatus(id, status));
  };

  // ─── 공지사항 ───
  const addNotice = () => {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) return;
    const { title, content } = noticeForm;
    setNoticeForm({ title: "", content: "" });
    run(() => createNotice(title, content));
  };

  const deleteNotice = (id: string) => {
    run(() => deleteNoticeApi(id));
  };

  // ─── 알림 발송 ───
  const sendNotification = () => {
    if (!notificationForm.userId || !notificationForm.message.trim()) return;
    const { userId, message } = notificationForm;
    setNotificationForm({ userId: "", message: "" });
    setShowNotificationModal(false);
    run(() => sendNotificationApi(userId, message), "알림이 발송되었습니다.");
  };

  // ─── 엑셀(CSV) 다운로드 ───
  const downloadCSV = (type: "users" | "matchings") => {
    let csv = "";
    if (type === "users") {
      csv = "고유번호,담당자명,회사명,이메일,유형,파트너카테고리,연락처,사업자등록번호,기업주소,상태,사업자등록증,마케팅수신동의,동의일시\n";
      users.forEach((u) => {
        csv += `"${u.memberCode || ""}","${u.name}","${u.company}","${u.email}","${u.roles?.join("/")}","${u.partnerCategories?.join("/") || ""}","${u.phone || ""}","${u.businessNumber || ""}","${u.address || ""}","${u.status}","${u.licensePath ? "제출" : "미제출"}","${u.marketingConsent ? "Y" : "N"}","${u.marketingConsentAt ?? ""}"\n`;
      });
    } else {
      csv = "프로젝트명,의뢰사,예산,상태,생성일\n";
      matchings.forEach((m) => {
        csv += `"${m.title}","${m.clientCompany}","${m.budget}","${matchingStatusLabels[m.status]?.label}","${m.createdAt}"\n`;
      });
    }
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type === "users" ? "회원목록" : "매칭내역"}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── 통계 ───
  const totalUsers = users.length;
  const pendingUsers = users.filter((u) => u.status === "pending").length;
  const clientCount = users.filter((u) => u.roles?.includes("client")).length;
  const partnerCount = users.filter((u) => u.roles?.includes("partner")).length;
  const activeMatchings = allRequests.filter((r) => r.status === "pending" || r.status === "matched").length;
  const completedMatchings = allRequests.filter((r) => r.status === "completed").length;
  const newInquiries = inquiries.filter((i) => i.status === "new").length;

  // 전체 현황에 쓰는 셈.
  //
  // 운영자가 아침에 여는 화면이다. "숫자가 몇인가"보다 "내가 손대야 할
  // 일이 있는가"가 먼저 보여야 한다. 그래서 처리할 일과 거래 흐름을
  // 나누고, 처리할 일은 0이면 조용히 둔다.
  const openRequests = allRequests.filter((r) => r.status === "pending");
  const quotesOf = (r: (typeof allRequests)[number]) => r.quotes ?? [];
  // 아무도 견적을 내지 않은 의뢰. 플랫폼이 제 역할을 못 하고 있다는
  // 뜻이라 매칭 건수보다 먼저 봐야 한다.
  const noQuoteRequests = openRequests.filter((r) => quotesOf(r).length === 0).length;
  const totalQuotes = allRequests.reduce((n, r) => n + quotesOf(r).length, 0);
  const matchedCount = allRequests.filter((r) => r.status === "matched" || r.status === "completed").length;

  // 마감이 이레 안으로 다가온 열린 의뢰.
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const dueSoon = openRequests.filter((r) => {
    if (!r.deadline || r.deadline === "미정") return false;
    const d = new Date(r.deadline).getTime();
    return !Number.isNaN(d) && d - Date.now() <= WEEK && d >= Date.now();
  }).length;

  // 답을 기다리는 문의 (읽었든 안 읽었든 아직 답이 안 나간 것).
  const waitingInquiries = inquiries.filter((i) => i.status === "new" || i.status === "read").length;
  const pendingChangeCount = changeRequests.filter((r) => r.status === "pending").length;
  // 등록증은 회사 단위다. 같은 회사 멤버를 여러 번 세지 않는다.
  const noLicenseCompanies = new Set(
    users.filter((u) => !u.licensePath).map((u) => u.companyId ?? u.id)
  ).size;

  const isToday = (v?: string) => {
    if (!v) return false;
    const d = new Date(v);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };
  const todayUsers = users.filter((u) => isToday(u.createdAt)).length;
  const todayRequests = allRequests.filter((r) => isToday(r.createdAt)).length;

  // 회원이 답변을 달면 운영자 앞으로 알림이 온다(phase33). 통지를 보낸
  // 쪽이 답을 못 보면 회원은 기다리고 제한은 유지된다.
  const unreadForMe = adminNotifications.filter((n) => n.userId === adminId && !n.read).length;

  const todo = [
    { label: "승인 대기", n: pendingUsers, unit: "명", tab: "users" as const },
    { label: "답변 온 알림", n: unreadForMe, unit: "건", tab: "notifications" as const },
    { label: "답변 대기 문의", n: waitingInquiries, unit: "건", tab: "inquiries" as const },
    { label: "회사정보 변경 요청", n: pendingChangeCount, unit: "건", tab: "users" as const },
    { label: "등록증 미제출", n: noLicenseCompanies, unit: "곳", tab: "users" as const },
  ].filter((t) => t.n > 0);

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "overview", label: "전체 현황" },
    { key: "users", label: "사용자 관리", badge: pendingUsers },
    { key: "matching", label: "의뢰/견적 관리" },
    { key: "matched", label: "매칭관리" },
    { key: "inquiries", label: "문의관리", badge: newInquiries },
    { key: "notices", label: "공지사항" },
    // 배지는 운영자가 손댈 수 있는 것만 센다. 알림 관리 탭은 전 회원의
    // 알림을 보여주는 자리라, 안 읽은 것을 모두 세면 남의 알림까지 들어간다.
    // 운영자는 그것을 읽을 수 없으니 숫자가 영영 안 지워진다.
    {
      key: "notifications",
      label: "알림 관리",
      badge: unreadForMe || undefined,
    },
    { key: "reports", label: "분석 리포트" },
    // 운영자는 회원이 아니다. 회원 목록과 한 화면에 두면 "사용자 관리"가
    // 두 가지를 뜻하게 된다.
    { key: "operators", label: "운영자 관리" },
  ];

  return (
    <div className="min-h-screen bg-muted">
      {/* 상단 헤더 */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setActiveTab("overview"); window.scrollTo({ top: 0 }); }}
              className="flex items-center transition-opacity hover:opacity-70" title="관리자 첫 화면으로">
              <span className="text-xl font-bold text-foreground">손잡다매칭</span>
            </button>
            <span className="ml-2 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/50">관리자</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNotificationModal(true)} className="relative rounded-lg p-2 text-foreground/50 transition-colors hover:bg-muted hover:text-foreground">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              {(pendingUsers > 0 || newInquiries > 0) && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
            </button>
            {/* 관리자에게는 마이페이지가 없어 비밀번호를 바꾸려면 Supabase
                대시보드까지 들어가야 했다. 쓰는 사람이 못 바꾸는 비밀번호는
                결국 안 바뀐다. */}
            <button onClick={() => { setPwForm({ next: "", confirm: "" }); setShowPwModal(true); }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">비밀번호 변경</button>
            <button onClick={() => { logout(); router.push("/admin/login"); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">로그아웃</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 환영 메시지 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-primary">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">환영합니다!</h2>
              <p className="mt-1 text-sm text-foreground/50">오늘도 성공적인 매칭을 위해 함께하겠습니다.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setActiveTab("users")} className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">전체 회원 관리</button>
          </div>
        </div>

        {/* 탭 */}
        <div className="mt-8 overflow-x-auto border-b border-border">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`relative whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-foreground/50 hover:border-primary/40 hover:text-primary"}`}>
                {tab.label}
                {tab.badge ? <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{tab.badge}</span> : null}
              </button>
            ))}
          </nav>
        </div>

        {/* ════════════ 전체 현황 ════════════ */}
        {activeTab === "overview" && (
          <div className="mt-8">
            {/* 처리할 일. 없으면 띄우지 않는다 — 늘 보이면 0인지 아닌지를
                다시 읽어야 하고, 그러면 눈에 안 들어온다. */}
            {todo.length > 0 ? (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                <p className="text-sm font-bold text-amber-800">처리할 일</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {todo.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => setActiveTab(t.tab)}
                      className="rounded-full border border-amber-300 bg-white px-3.5 py-1.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100"
                    >
                      {t.label} <span className="font-bold tabular-nums">{t.n}</span>{t.unit}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
                <p className="text-sm font-medium text-emerald-800">지금 처리할 일이 없습니다.</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="회원" value={totalUsers} sub={`의뢰사 ${clientCount} · 파트너사 ${partnerCount}${todayUsers > 0 ? ` · 오늘 +${todayUsers}` : ""}`} color="text-primary" onClick={() => setActiveTab("users")} />
              <StatCard label="열린 의뢰" value={openRequests.length} sub={`${todayRequests > 0 ? `오늘 +${todayRequests} · ` : ""}마감 임박 ${dueSoon}건`} color="text-blue-600" onClick={() => setActiveTab("matching")} />
              {/* 견적이 하나도 안 붙은 의뢰. 매칭 건수보다 먼저 봐야 하는
                  숫자다 — 여기가 쌓이면 파트너사가 모자라다는 뜻이다. */}
              <StatCard label="견적 없는 의뢰" value={noQuoteRequests} sub={`전체 견적 ${totalQuotes}건`} color={noQuoteRequests > 0 ? "text-amber-600" : "text-foreground/40"} onClick={() => setActiveTab("matching")} />
              <StatCard label="매칭 성사" value={matchedCount} sub={`완료 ${completedMatchings}건`} color="text-green-600" onClick={() => setActiveTab("matched")} />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* 최근 가입자 (승인 대기 우선) */}
              <div className="rounded-2xl border border-border bg-background p-6">
                <h3 className="text-base font-bold text-foreground">최근 가입자</h3>
                <div className="mt-4 space-y-3">
                  {users.length === 0 ? <p className="text-sm text-foreground/60">가입된 회원이 없습니다.</p> : (
                    [...users].sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1)).slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground/60">{user.name?.charAt(0) || "?"}</div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-foreground/60">{user.company}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${user.status === "pending" ? "bg-yellow-100 text-yellow-700" : user.status === "approved" ? "bg-green-100 text-green-700" : user.status === "restricted" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                            {user.status === "pending" ? "대기" : user.status === "approved" ? "승인" : user.status === "restricted" ? "제한" : "정지"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 최근 문의 */}
              <div className="rounded-2xl border border-border bg-background p-6">
                <h3 className="text-base font-bold text-foreground">최근 문의</h3>
                <div className="mt-4 space-y-3">
                  {inquiries.length === 0 ? <p className="text-sm text-foreground/60">문의 내역이 없습니다.</p> : (
                    [...inquiries].reverse().slice(0, 5).map((inq) => (
                      <div key={inq.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{inq.company} - {inq.name}</p>
                          <p className="text-xs text-foreground/60">{typeLabels[inq.type] || inq.type}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-yellow-100 text-yellow-700" : inq.status === "read" ? "bg-purple-100 text-purple-700" : inq.status === "replied" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                          {inq.status === "new" ? "신규" : inq.status === "read" ? "확인됨" : inq.status === "replied" ? "답변완료" : "종료"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ 사용자 관리 ════════════ */}
        {activeTab === "users" && (() => {
          const approvedCount = users.filter((u) => u.status === "approved").length;
          const filtered = users.filter((u) => {
            const q = userSearch.toLowerCase();
            const matchSearch = !q || (u.memberCode || "").toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.company.toLowerCase().includes(q);
            const matchRole = userFilterRole === "all" || u.roles?.includes(userFilterRole);
            const matchStatus = userFilterStatus === "all" || u.status === userFilterStatus || (!u.status && userFilterStatus === "pending");
            return matchSearch && matchRole && matchStatus;
          });
          const pendingChanges = changeRequests.filter((r) => r.status === "pending");
          const reviewedChanges = changeRequests.filter((r) => r.status !== "pending");
          return (
          <div className="mt-8">

            {/* 회사 정보 변경 요청. 대기 건이 없어도 섹션은 보여 준다 —
                안 보이면 이런 절차가 있는지조차 모른다. */}
            <div className={`mb-6 rounded-2xl border p-6 ${
              pendingChanges.length > 0 ? "border-amber-200 bg-amber-50/40" : "border-border bg-background"
            }`}>
                <h3 className="text-base font-bold text-foreground">
                  회사 정보 변경 요청
                  {pendingChanges.length > 0 && (
                    <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                      대기 {pendingChanges.length}건
                    </span>
                  )}
                </h3>
                <p className="mt-1 text-xs text-foreground/50">
                  회원사 담당 관리자가 마이페이지에서 회사명·사업자번호·주소 등의 변경을 요청하면 여기 표시됩니다.
                  승인하면 회사 정보에 그대로 반영되고 요청자에게 알림이 갑니다.
                </p>
                {pendingChanges.length === 0 && (
                  <p className="mt-4 rounded-xl border border-dashed border-border py-5 text-center text-sm text-foreground/60">
                    대기 중인 변경 요청이 없습니다.
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {pendingChanges.map((r) => (
                    <div key={r.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {r.companyName} <span className="font-normal text-foreground/50">· {r.requesterName}</span>
                        </p>
                        <span className="text-xs text-foreground/60">
                          {new Date(r.createdAt).toLocaleString("ko-KR")}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm">
                        {Object.entries(r.after).map(([key, value]) => (
                          <p key={key}>
                            <span className="text-foreground/60">{FIELD_LABELS[key] ?? key}</span>{" "}
                            <span className="text-foreground/60 line-through">
                              {String(r.before[key as keyof typeof r.before] ?? "-")}
                            </span>{" "}
                            → <span className="font-semibold text-foreground">{String(value)}</span>
                          </p>
                        ))}
                      </div>

                      {r.reason && (
                        <p className="mt-2 rounded-lg bg-muted p-3 text-xs text-foreground/70">
                          사유: {r.reason}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => run(() => reviewChangeRequest(r.id, true), "변경 내용이 반영되었습니다.")}
                          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark">
                          승인하고 반영
                        </button>
                        <button onClick={() => {
                          const note = prompt("반려 사유를 입력하세요 (요청자에게 전달됩니다)");
                          if (note === null) return;
                          run(() => reviewChangeRequest(r.id, false, note), "반려 처리했습니다.");
                        }}
                          className="rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-50">
                          반려
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {reviewedChanges.length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-medium text-foreground/50 hover:text-foreground">
                      처리 이력 {reviewedChanges.length}건
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      {reviewedChanges.slice(0, 20).map((r) => (
                        <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${
                            r.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                          }`}>{r.status === "approved" ? "승인" : "반려"}</span>
                          <span className="font-medium text-foreground">{r.companyName}</span>
                          <span className="text-foreground/50">
                            {Object.keys(r.after).map((k) => FIELD_LABELS[k] ?? k).join(", ")}
                          </span>
                          <span className="ml-auto text-foreground/60">
                            {ymd(r.reviewedAt ?? r.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            {/* 검색 + 필터 */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="회원번호, 이름, 이메일, 회사명으로 검색..."
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <div className="flex gap-2">
                <select value={userFilterRole} onChange={(e) => setUserFilterRole(e.target.value as typeof userFilterRole)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="all">전체 유형</option>
                  <option value="client">의뢰사</option>
                  <option value="partner">파트너사</option>
                </select>
                <select value={userFilterStatus} onChange={(e) => setUserFilterStatus(e.target.value as typeof userFilterStatus)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="all">전체 상태</option>
                  <option value="approved">활성</option>
                  <option value="pending">대기</option>
                  <option value="restricted">제한</option>
                  <option value="suspended">정지</option>
                </select>
                <button onClick={() => downloadCSV("users")} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground/70 hover:bg-muted">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  내보내기
                </button>
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-background p-5 text-center">
                <p className="text-3xl font-bold text-foreground">{totalUsers}</p>
                <p className="mt-1 text-sm text-foreground/50">총 회원</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-5 text-center">
                <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
                <p className="mt-1 text-sm text-foreground/50">활성 회원</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-5 text-center">
                <p className="text-3xl font-bold text-blue-600">{clientCount}</p>
                <p className="mt-1 text-sm text-foreground/50">의뢰사</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-5 text-center">
                <p className="text-3xl font-bold text-purple-600">{partnerCount}</p>
                <p className="mt-1 text-sm text-foreground/50">파트너사</p>
              </div>
            </div>

            {/* 전체 회원 목록 */}
            <div className="rounded-2xl border border-border bg-background">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                <h3 className="font-semibold text-foreground">전체 회원 목록</h3>
                <button
                  onClick={() => {
                    setNewPartner({ companyName: "", businessNumber: "", email: "", categories: [] });
                    setPartnerBiz({ ok: null, note: "", checking: false });
                    setInviteLink(null);
                    setShowInvitePartner(true);
                  }}
                  className={ACTION_BTN}
                >
                  파트너사 초대
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="cards-on-mobile w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-center font-medium text-foreground/50">회원번호</th>
                      <th className="px-4 py-3 text-center font-medium text-foreground/50">담당자명</th>
                      <th className="px-4 py-3 text-center font-medium text-foreground/50">ID</th>
                      <th className="px-4 py-3 text-center font-medium text-foreground/50">회사명</th>
                      <th className="px-4 py-3 text-center font-medium text-foreground/50">유형</th>
                      <th className="px-4 py-3 text-center font-medium text-foreground/50">상태</th>
                      <th className="px-4 py-3 text-center font-medium text-foreground/50">등록증</th>
                      <th className="px-4 py-3 text-center font-medium text-foreground/50">가입일</th>
                      <th className="px-4 py-3 text-center font-medium text-foreground/50">프로젝트</th>
                      <th className="px-4 py-3 text-center font-medium text-foreground/50">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-12 text-center text-foreground/60">{userSearch || userFilterRole !== "all" || userFilterStatus !== "all" ? "검색 결과가 없습니다." : "가입된 회원이 없습니다."}</td></tr>
                    ) : filtered.map((user) => {
                      const projectCount = allRequests.filter((r) => r.clientId === user.id || (r.quotes || []).some((q) => q.partnerId === user.id)).length;
                      return (
                      <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td data-label="회원번호" className="px-4 py-3"><span className="font-mono text-xs text-foreground/60">{user.memberCode || "-"}</span></td>
                        <td data-label="담당자명" className="px-4 py-3"><button onClick={() => setSelectedUser(user)} className="font-medium text-primary hover:underline">{user.name}</button></td>
                        <td data-label="ID" className="px-4 py-3 text-primary/80">{user.email}</td>
                        <td data-label="회사명" className="px-4 py-3 text-foreground/70">{user.company}</td>
                        <td data-label="유형" className="px-4 py-3">
                          <div className="flex gap-1">
                            {user.roles?.map((role) => <RoleBadge key={role} role={role} />)}
                          </div>
                        </td>
                        <td data-label="상태" className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${!user.status || user.status === "pending" ? "bg-yellow-100 text-yellow-700" : user.status === "approved" ? "bg-green-100 text-green-700" : user.status === "restricted" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                            {!user.status || user.status === "pending" ? "대기" : user.status === "approved" ? "활성" : user.status === "restricted" ? "제한" : "정지"}
                          </span>
                        </td>
                        {/* 승인 판단에 쓰는 서류다. 승인 버튼과 같은 줄에
                            있어야 보고 누른다. */}
                        <td data-label="등록증" className="px-4 py-3 text-center">
                          {user.licensePath ? (
                            <button onClick={() => openLicense(user.companyId)}
                              className="text-xs font-medium text-primary underline hover:text-primary-dark">보기</button>
                          ) : (
                            <span className="text-xs font-medium text-red-500">미제출</span>
                          )}
                        </td>
                        <td data-label="가입일" className="whitespace-nowrap px-4 py-3 text-xs text-foreground/50">{ymd(user.createdAt)}</td>
                        <td data-label="프로젝트" className="px-4 py-3 text-sm text-foreground/70">{projectCount}건</td>
                        <td data-label="관리" className="px-4 py-3">
                          <div className="flex gap-1">
                            {(user.status === "pending" || !user.status) && (
                              <button onClick={() => approveUser(user)} className={ROW_BTN}>승인</button>
                            )}
                            {(user.status === "suspended" || user.status === "restricted") && (
                              <button onClick={() => updateUserField(user.id, "status", "approved")} className={ROW_BTN}>해제</button>
                            )}
                            {/* 제한·정지를 하나로 합쳤다. 어느 쪽인지는 창 안에서
                                고른다 — 버튼을 둘로 나누면 고르기 전에 결정한
                                셈이 되고, 누적 이력을 보기도 전에 센 쪽을
                                누르게 된다. */}
                            {user.status !== "suspended" && (
                              <button onClick={() => openSanction(user)}
                                className={ROW_BTN}>제재</button>
                            )}
                            <button onClick={() => { setNotificationForm({ userId: user.id, message: "" }); setShowNotificationModal(true); }}
                              className={ROW_BTN}>알림</button>
                            <button onClick={async () => { if (await confirmDialog(`"${user.name}" 회원을 삭제하시겠습니까?\n삭제된 회원 정보는 복구할 수 없습니다.`, { confirmLabel: "삭제", danger: true }) && await confirmDialog(`정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`, { confirmLabel: "삭제", danger: true })) deleteUser(user.id); }}
                              className={ROW_BTN}>삭제</button>
                          </div>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ════════════ 의뢰/견적 관리 ════════════ */}
        {activeTab === "matching" && (
          <div className="mt-8">
            {/* 요약 카드 */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button onClick={() => setMatchingView(matchingView === "requests" ? "all" : "requests")}
                className={`rounded-xl border p-5 text-left transition-all ${matchingView === "requests" ? "border-primary bg-primary/5 shadow-md" : "border-border bg-background hover:border-primary/30 hover:shadow-md"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground/50">전체 의뢰</p>
                    <p className="mt-1 text-3xl font-bold text-primary">{allRequests.length}<span className="ml-1 text-sm font-normal text-foreground/60">건</span></p>
                    <p className="mt-1 text-xs text-foreground/60">진행중 {allRequests.filter((r) => r.status === "pending").length} | 완료 {allRequests.filter((r) => r.status === "matched").length} | 회수 {allRequests.filter((r) => r.status === "cancelled").length}</p>
                  </div>
                  <div className="rounded-xl bg-primary/10 p-3 text-primary">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  </div>
                </div>
              </button>
              <button onClick={() => setMatchingView(matchingView === "quotes" ? "all" : "quotes")}
                className={`rounded-xl border p-5 text-left transition-all ${matchingView === "quotes" ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-border bg-background hover:border-emerald-300 hover:shadow-md"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground/50">견적 제출</p>
                    <p className="mt-1 text-3xl font-bold text-emerald-600">{allRequests.reduce((sum, r) => sum + (r.quotes || []).filter((q) => ["quoted", "client_reviewing", "accepted", "client_hold", "client_rejected", "not_selected"].includes(q.status)).length, 0)}<span className="ml-1 text-sm font-normal text-foreground/60">건</span></p>
                    <p className="mt-1 text-xs text-foreground/60">수락 {allRequests.reduce((sum, r) => sum + (r.quotes || []).filter((q) => q.status === "accepted").length, 0)} | 검토중 {allRequests.reduce((sum, r) => sum + (r.quotes || []).filter((q) => q.status === "client_reviewing" || q.status === "quoted").length, 0)} | 거절 {allRequests.reduce((sum, r) => sum + (r.quotes || []).filter((q) => q.status === "client_rejected" || q.status === "rejected").length, 0)}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                </div>
              </button>
            </div>
            {(() => {
              // 견적 뷰: 견적 단위 플랫 리스트
              if (matchingView === "quotes") {
                const allQuotesList = allRequests.flatMap((r) =>
                  (r.quotes || []).filter((q) => ["quoted", "client_reviewing", "accepted", "client_hold", "client_rejected", "not_selected"].includes(q.status))
                    .map((q) => ({ ...q, requestTitle: r.title, requestCode: r.requestCode, category: r.category, clientCompany: r.clientCompany, clientLogo: r.clientLogo, requestId: r.id }))
                ).sort((a, b) => (b.quoteCode || "").localeCompare(a.quoteCode || ""));
                return allQuotesList.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-background p-12 text-center">
                    <h3 className="text-lg font-semibold text-foreground/60">제출된 견적이 없습니다</h3>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-background">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="px-4 py-3 text-center font-medium text-foreground/50">견적번호</th>
                            <th className="px-4 py-3 text-center font-medium text-foreground/50">프로젝트명</th>
                            <th className="px-4 py-3 text-center font-medium text-foreground/50">카테고리</th>
                            <th className="px-4 py-3 text-center font-medium text-foreground/50">의뢰사</th>
                            <th className="px-4 py-3 text-center font-medium text-foreground/50">파트너사</th>
                            <th className="px-4 py-3 text-center font-medium text-foreground/50">담당자</th>
                            <th className="px-4 py-3 text-center font-medium text-foreground/50">견적금액</th>
                            <th className="px-4 py-3 text-center font-medium text-foreground/50">상태</th>
                            <th className="px-4 py-3 text-center font-medium text-foreground/50">제출일</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allQuotesList.map((q) => {
                            const isOpen = selectedRequestDetail === `qt-${q.id}`;
                            const statusLabel = q.status === "quoted" ? "견적완료" : q.status === "client_reviewing" ? "의뢰사 검토중" : q.status === "accepted" ? "수락됨" : q.status === "client_rejected" ? "거절됨" : q.status === "not_selected" ? "미결정" : q.status === "client_hold" ? "의뢰사 보류" : q.status;
                            const statusColor = q.status === "quoted" ? "bg-emerald-100 text-emerald-700" : q.status === "client_reviewing" ? "bg-amber-100 text-amber-700" : q.status === "accepted" ? "bg-primary/10 text-primary" : q.status === "client_rejected" ? "bg-red-100 text-red-600" : q.status === "not_selected" ? "bg-gray-100 text-gray-500" : q.status === "client_hold" ? "bg-gray-100 text-gray-600" : "bg-muted text-foreground/60";
                            const partnerUser = users.find((u) => u.id === q.partnerId);
                            return (
                              <React.Fragment key={q.id}>
                                <tr onClick={() => setSelectedRequestDetail(isOpen ? null : `qt-${q.id}`)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30">
                                  <td className="px-4 py-3 text-left font-mono text-xs text-foreground/50">{q.quoteCode || "-"}</td>
                                  <td className="px-4 py-3 text-center font-medium text-foreground">{q.requestTitle}</td>
                                  <td className="px-4 py-3 text-center"><span className="rounded-lg bg-muted px-2 py-0.5 text-xs text-foreground/60">{q.category}</span></td>
                                  <td className="px-4 py-3 text-center text-foreground/70"><span className="inline-flex items-center gap-2"><CompanyLogo path={q.clientLogo} name={q.clientCompany} size={22} />{q.clientCompany}</span></td>
                                  <td className="px-4 py-3 text-center text-foreground/70"><span className="inline-flex items-center gap-2"><CompanyLogo path={q.partnerLogo} name={q.partnerCompany} size={22} />{q.partnerCompany}</span></td>
                                  <td className="px-4 py-3 text-center text-xs text-foreground/50">{partnerUser?.name || "-"}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-primary">{q.amount}원</td>
                                  <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>{statusLabel}</span></td>
                                  <td className="px-4 py-3 text-center text-xs text-foreground/50">{ymd(q.createdAt)}</td>
                                </tr>
                                {isOpen && (
                                  <tr><td colSpan={9} className="bg-muted/10 px-6 py-4">
                                    <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-white p-4 sm:grid-cols-4">
                                      <div><p className="text-xs text-foreground/60">견적 금액</p><p className="mt-0.5 text-lg font-bold text-primary">{q.amount}원</p></div>
                                      <div><p className="text-xs text-foreground/60">소요 기간</p><p className="mt-0.5 text-base font-semibold text-foreground">{q.duration || "-"}</p></div>
                                      <div><p className="text-xs text-foreground/60">파트너사</p><p className="mt-0.5 text-sm font-medium text-foreground">{q.partnerCompany} <span className="font-mono text-xs text-foreground/50">{partnerUser?.memberCode || ""}</span></p></div>
                                      <div><p className="text-xs text-foreground/60">의뢰번호</p><p className="mt-0.5 font-mono text-sm text-foreground/60">{q.requestCode || "-"}</p></div>
                                    </div>
                                    {(q as { timeline?: { label: string; months: string }[] }).timeline?.filter((t) => t.months).length ? (
                                      <div className="mt-3"><p className="text-xs text-foreground/60">업무범위</p><div className="mt-1 flex flex-wrap gap-1">{(q as { timeline?: { label: string; months: string }[] }).timeline!.filter((t) => t.months).map((t, i) => (<span key={i} className="rounded-md border border-border bg-white px-2 py-0.5 text-xs"><span className="text-foreground/60">{t.label}</span> <span className="font-semibold">{t.months}개월</span></span>))}</div></div>
                                    ) : null}
                                    {q.memo && <div className="mt-3 rounded-lg bg-white p-3"><p className="text-xs text-foreground/60">메모</p><p className="mt-0.5 text-sm text-foreground/70">{q.memo}</p></div>}
                                    <QuoteAttachment path={q.attachmentData} name={q.attachmentName} variant="inline" />
                                    <BackToList onClick={() => setSelectedRequestDetail(null)} />
                                  </td></tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              // 의뢰 뷰: 기존 의뢰 단위 테이블
              const filtered = allRequests;
              return filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-background p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                <h3 className="mt-4 text-lg font-semibold text-foreground/60">등록된 의뢰가 없습니다</h3>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">의뢰번호</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">프로젝트명</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">의뢰사</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">카테고리</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">예산</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">상태</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">견적수</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">등록일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...filtered].reverse().map((req) => {
                        const allQuoteCount = (req.quotes || []).length;
                        const isOpen = selectedRequestDetail === req.id;
                        return (
                          <React.Fragment key={req.id}>
                            <tr onClick={() => setSelectedRequestDetail(isOpen ? null : req.id)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30">
                              <td className="px-4 py-3"><span className="font-mono text-xs text-foreground/60">{req.requestCode || "-"}</span></td>
                              <td className="px-4 py-3"><button className="font-medium text-primary hover:underline">{req.title}</button></td>
                              <td className="px-4 py-3 text-foreground/70"><span className="inline-flex items-center gap-2"><CompanyLogo path={req.clientLogo} name={req.clientCompany} size={22} />{req.clientCompany}</span></td>
                              <td className="px-4 py-3"><span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-foreground/60">{req.category}</span></td>
                              <td className="px-4 py-3 font-medium text-primary">{req.budget}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${req.status === "pending" ? "bg-yellow-100 text-yellow-700" : req.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                                  {req.status === "pending" ? "진행중" : req.status === "cancelled" ? "회수됨" : "완료"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-foreground/70">{allQuoteCount}건</td>
                              <td className="px-4 py-3 text-xs text-foreground/50">{ymd(req.createdAt)}</td>
                            </tr>
                            {isOpen && (
                              <tr>
                                <td colSpan={8} className="border-b border-border bg-muted/10 px-6 py-5">
                                  <div className="space-y-5">
                                    {/* 의뢰 상세 */}
                                    <div>
                                      <h5 className="text-base font-semibold text-foreground">의뢰 내용</h5>
                                      <div className="mt-4 rounded-xl border border-border bg-muted/20 p-5">
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                          {req.description.split("\n").map((line, i) => {
                                            if (!line.trim()) return null;
                                            const isSubItem = line.startsWith("  -");
                                            if (isSubItem) return <p key={i} className="col-span-2 pl-4 text-sm text-foreground/50">{line.trim()}</p>;
                                            const parts = line.split(": ");
                                            if (parts.length >= 2) {
                                              const label = parts[0];
                                              const value = parts.slice(1).join(": ");
                                              const isLong = value.length > 30 || label === "위탁업무" || label === "추가 요구사항" || label === "임상시험 목적";
                                              return <div key={i} className={isLong ? "col-span-2" : ""}><p className="text-xs text-foreground/60">{label}</p><p className="mt-1 text-sm font-medium text-foreground">{value}</p></div>;
                                            }
                                            return <p key={i} className="col-span-2 text-sm text-foreground/70">{line}</p>;
                                          })}
                                        </div>
                                      </div>
                                    </div>

                                    {/* 파트너사 견적 */}
                                    <div>
                                      <h5 className="text-base font-semibold text-foreground">파트너사 견적 현황 <span className="ml-1 text-sm font-normal text-foreground/60">{allQuoteCount > 0 ? `${allQuoteCount}건` : ""}</span></h5>
                                      {allQuoteCount === 0 ? (
                                        <p className="mt-3 text-sm text-foreground/60">아직 제출된 견적이 없습니다.</p>
                                      ) : (
                                        <div className="mt-3 space-y-3">
                                          {(req.quotes || []).map((quote) => (
                                            <div key={quote.id} className={`rounded-xl border transition-shadow hover:shadow-md ${quote.status === "quoted" || quote.status === "client_reviewing" ? "border-emerald-200 bg-emerald-50/30" : quote.status === "accepted" ? "border-primary/30 bg-primary/5" : quote.status === "rejected" || quote.status === "client_rejected" ? "border-red-100 bg-red-50/20" : quote.status === "reviewing" ? "border-amber-200 bg-amber-50/30" : "border-border bg-muted/20"}`}>
                                              <button onClick={() => setExpandedQuoteId(expandedQuoteId === quote.id ? null : quote.id)} className="flex w-full items-center justify-between p-5 text-left">
                                                <div className="flex items-center gap-3">
                                                  <CompanyLogo path={quote.partnerLogo} name={quote.partnerCompany} size={36} />
                                                  <div>
                                                    <p className="text-sm font-semibold text-foreground">{quote.partnerCompany}</p>
                                                    <p className="text-xs text-foreground/60">
                                                      {quote.quoteCode && <span className="font-mono">{quote.quoteCode} | </span>}
                                                      담당자: {users.find((u) => u.id === quote.partnerId)?.name || "-"} | {new Date(quote.createdAt).toLocaleString("ko-KR")}
                                                    </p>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${quote.status === "quoted" ? "bg-emerald-100 text-emerald-700" : quote.status === "client_reviewing" ? "bg-amber-100 text-amber-700" : quote.status === "reviewing" ? "bg-amber-100 text-amber-700" : quote.status === "accepted" ? "bg-primary/10 text-primary" : quote.status === "client_rejected" ? "bg-red-100 text-red-600" : quote.status === "rejected" ? "bg-red-100 text-red-600" : quote.status === "not_selected" ? "bg-gray-100 text-gray-500" : quote.status === "client_hold" ? "bg-gray-100 text-gray-600" : quote.status === "hold" ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700"}`}>
                                                    {quote.status === "quoted" ? "견적완료" : quote.status === "client_reviewing" ? "의뢰사 검토중" : quote.status === "reviewing" ? "파트너 검토중" : quote.status === "accepted" ? "수락됨" : quote.status === "client_rejected" ? "거절됨" : quote.status === "rejected" ? "파트너 거절" : quote.status === "not_selected" ? "미결정" : quote.status === "client_hold" ? "의뢰사 보류" : quote.status === "hold" ? "파트너 보류" : "신규"}
                                                  </span>
                                                  {quote.amount && <span className="text-sm font-bold text-primary">{quote.amount}</span>}
                                                  <svg className={`h-4 w-4 text-foreground/50 transition-transform ${expandedQuoteId === quote.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                              </button>
                                              {expandedQuoteId === quote.id && (
                                                <div className="border-t border-border px-5 pb-5 pt-4">
                                                  {/* 핵심 정보 */}
                                                  <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-4">
                                                    <div>
                                                      <p className="text-xs text-foreground/60">견적 금액</p>
                                                      <p className="mt-0.5 text-lg font-bold text-primary">{quote.amount || "-"}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-foreground/60">소요 기간</p>
                                                      <p className="mt-0.5 text-base font-semibold text-foreground">{quote.duration || "-"}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-foreground/60">담당자</p>
                                                      <p className="mt-0.5 text-sm font-medium text-foreground">{users.find((u) => u.id === quote.partnerId)?.name || "-"}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-foreground/60">회원번호</p>
                                                      <p className="mt-0.5 font-mono text-sm text-foreground/60">{users.find((u) => u.id === quote.partnerId)?.memberCode || "-"}</p>
                                                    </div>
                                                  </div>
                                                  {/* 업무범위 */}
                                                  {(quote as { timeline?: { label: string; months: string }[] }).timeline?.filter((t) => t.months).length ? (
                                                    <div className="mt-3">
                                                      <p className="text-xs text-foreground/60">업무범위별 소요기간</p>
                                                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                        {(quote as { timeline?: { label: string; months: string }[] }).timeline!.filter((t) => t.months).map((t, ti) => (
                                                          <span key={ti} className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
                                                            <span className="text-foreground/60">{t.label}</span> <span className="font-semibold text-foreground">{t.months}개월</span>
                                                          </span>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  ) : null}
                                                  {/* 메모 */}
                                                  {quote.memo && (
                                                    <div className="mt-3 rounded-lg bg-muted/30 p-3">
                                                      <p className="text-xs text-foreground/60">메모</p>
                                                      <p className="mt-0.5 text-sm text-foreground/70">{quote.memo}</p>
                                                    </div>
                                                  )}
                                                  {/* 첨부파일 */}
                                                  <QuoteAttachment path={(quote as { attachmentData?: string }).attachmentData} name={quote.attachmentName} variant="box" />
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <BackToList onClick={() => setSelectedRequestDetail(null)} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
            })()}
          </div>
        )}

        {/* ════════════ 매칭관리 ════════════ */}
        {activeTab === "matched" && (() => {
          const matchedAll = allRequests.filter((r) => r.status === "matched" || r.status === "completed");
          const sortBy = matchingSortBy;
          const matchedRequests = [...matchedAll].sort((a, b) => {
            let cmp = 0;
            if (sortBy === "matchCode") cmp = (a.matchCode || "").localeCompare(b.matchCode || "");
            else if (sortBy === "title") cmp = a.title.localeCompare(b.title);
            else if (sortBy === "client") cmp = a.clientCompany.localeCompare(b.clientCompany);
            else if (sortBy === "partner") {
              const aP = (a.quotes || []).find((q) => q.status === "accepted")?.partnerCompany || "";
              const bP = (b.quotes || []).find((q) => q.status === "accepted")?.partnerCompany || "";
              cmp = aP.localeCompare(bP);
            } else if (sortBy === "amount") {
              const aAmt = Number(((a.quotes || []).find((q) => q.status === "accepted")?.amount || "0").replace(/[^\d]/g, ""));
              const bAmt = Number(((b.quotes || []).find((q) => q.status === "accepted")?.amount || "0").replace(/[^\d]/g, ""));
              cmp = aAmt - bAmt;
            } else if (sortBy === "category") cmp = a.category.localeCompare(b.category);
            return matchingSortDir === "desc" ? -cmp : cmp;
          });
          return (
          <div className="mt-8">
            <div className="mb-4">
              <p className="text-sm text-foreground/50">최종 매칭 성사 {matchedRequests.length}건</p>
            </div>
            {matchedRequests.length === 0 ? (
              <div className="rounded-2xl border border-border bg-background p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" /></svg>
                <h3 className="mt-4 text-lg font-semibold text-foreground/60">매칭 성사된 건이 없습니다</h3>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {([
                          { key: "matchCode" as const, label: "매칭번호" },
                          { key: "title" as const, label: "프로젝트명" },
                          { key: "client" as const, label: "의뢰사" },
                          { key: "partner" as const, label: "파트너사" },
                          { key: "amount" as const, label: "견적금액" },
                        ]).map((col) => (
                          <th key={col.key} onClick={() => toggleMatchSort(col.key)} className="cursor-pointer px-4 py-3 text-center font-medium text-foreground/50 hover:text-foreground select-none">
                            {col.label} {sortBy === col.key && <span className="text-primary">{matchingSortDir === "asc" ? "▲" : "▼"}</span>}
                          </th>
                        ))}
                        <th onClick={() => toggleMatchSort("category")} className="cursor-pointer px-4 py-3 text-center font-medium text-foreground/50 hover:text-foreground select-none">
                          카테고리 {sortBy === "category" && <span className="text-primary">{matchingSortDir === "asc" ? "▲" : "▼"}</span>}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchedRequests.map((req) => {
                        const acceptedQuote = (req.quotes || []).find((q) => q.status === "accepted");
                        const isOpen = selectedRequestDetail === req.id;
                        return (
                          <React.Fragment key={req.id}>
                            <tr onClick={() => setSelectedRequestDetail(isOpen ? null : req.id)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30">
                              <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-primary">{req.matchCode || "-"}</span></td>
                              <td className="px-4 py-3"><button className="font-medium text-primary hover:underline">{req.title}</button></td>
                              <td className="px-4 py-3 text-foreground/70"><span className="inline-flex items-center gap-2"><CompanyLogo path={req.clientLogo} name={req.clientCompany} size={22} />{req.clientCompany}</span></td>
                              <td className="px-4 py-3 text-foreground/70">{acceptedQuote?.partnerCompany || "-"}</td>
                              <td className="px-4 py-3 font-medium text-primary">{acceptedQuote ? `${acceptedQuote.amount}원` : "-"}</td>
                              <td className="px-4 py-3"><span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-foreground/60">{req.category}</span></td>
                            </tr>
                            {isOpen && (
                              <tr>
                                <td colSpan={6} className="border-b border-border bg-muted/10 px-6 py-5">
                                  <div className="space-y-4">
                                    {/* 의뢰사 ↔ 파트너사 매칭 정보 */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                      {/* 의뢰사 */}
                                      <div className="rounded-xl border border-border p-4">
                                        <p className="text-xs font-medium text-foreground/60">의뢰사</p>
                                        <p className="mt-1 break-all text-base font-semibold text-foreground">{req.clientCompany}</p>
                                        <p className="mt-0.5 font-mono text-xs text-foreground/50">{users.find((u) => u.id === req.clientId)?.memberCode || ""}</p>
                                        <div className="mt-2 flex gap-3 text-xs text-foreground/50">
                                          <span>예산: <span className="font-medium text-foreground">{req.budget}</span></span>
                                          <span>등록일: {ymd(req.createdAt)}</span>
                                        </div>
                                      </div>
                                      {/* 파트너사 */}
                                      {acceptedQuote && (
                                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                                          <p className="text-xs font-medium text-primary/60">파트너사 (수락됨)</p>
                                          <p className="mt-1 break-all text-base font-semibold text-foreground">{acceptedQuote.partnerCompany}</p>
                                          <p className="mt-0.5 font-mono text-xs text-foreground/50">{acceptedQuote.quoteCode || ""} | {users.find((u) => u.id === acceptedQuote.partnerId)?.memberCode || ""}</p>
                                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                            <div><span className="text-foreground/60">견적 금액</span><p className="mt-0.5 text-base font-bold text-primary">{acceptedQuote.amount}원</p></div>
                                            <div><span className="text-foreground/60">소요 기간</span><p className="mt-0.5 font-semibold text-foreground">{acceptedQuote.duration || "-"}</p></div>
                                          </div>
                                          <QuoteAttachment path={(acceptedQuote as { attachmentData?: string }).attachmentData} name={acceptedQuote.attachmentName} variant="box" />
                                        </div>
                                      )}
                                    </div>

                                    {/* 전체 견적 요약 */}
                                    <div className="flex flex-wrap gap-2 text-xs text-foreground/60">
                                      <span>전체 견적 {(req.quotes || []).length}건</span>
                                      <span>|</span>
                                      <span>수락 {(req.quotes || []).filter((q) => q.status === "accepted").length}건</span>
                                      <span>미선택 {(req.quotes || []).filter((q) => q.status === "not_selected" || (q.status === "client_reviewing" && req.status === "matched")).length}건</span>
                                      <span>거절 {(req.quotes || []).filter((q) => q.status === "client_rejected" || q.status === "rejected").length}건</span>
                                    </div>
                                  </div>
                                  <BackToList onClick={() => setSelectedRequestDetail(null)} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* ════════════ 문의관리 ════════════ */}
        {activeTab === "inquiries" && (
          <div className="mt-8">
            {/* 신고만 따로 보기.
                신고는 일반 문의·제휴 문의와 한 목록에 섞여 있어 눈에 띄지
                않았다. 운영정책 제6조가 신고 접수를 전제로 제재를 정하고
                있으므로, 놓치면 정책이 돌아가지 않는다. */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button onClick={() => setInquiryOnlyReports(false)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${!inquiryOnlyReports ? "bg-foreground text-white" : "border border-border text-foreground/60 hover:bg-muted"}`}>
                전체 {inquiries.length}
              </button>
              <button onClick={() => setInquiryOnlyReports(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${inquiryOnlyReports ? "bg-foreground text-white" : "border border-border text-foreground/60 hover:bg-muted"}`}>
                신고 {inquiries.filter((i) => i.type === "report").length}
                {inquiries.filter((i) => i.type === "report" && i.status !== "closed").length > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    미처리 {inquiries.filter((i) => i.type === "report" && i.status !== "closed").length}
                  </span>
                )}
              </button>
            </div>
            {inquiries.length === 0 ? (
              <div className="rounded-2xl border border-border bg-background p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                <h3 className="mt-4 text-lg font-semibold text-foreground/60">문의 내역이 없습니다</h3>
                <p className="mt-2 text-sm text-foreground/60">새로운 문의가 들어오면 여기에 표시됩니다.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">유형</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">제목/내용</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">문의자</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">이메일</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">상태</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">접수일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...inquiries].filter((i) => !inquiryOnlyReports || i.type === "report").reverse().map((inq) => {
                        const inqTitle = (inq as { title?: string }).title || (inq.message ? inq.message.slice(0, 30) + (inq.message.length > 30 ? "..." : "") : "(내용 없음)");
                        return (
                          <React.Fragment key={inq.id}>
                            <tr onClick={() => {
                              if (inq.status === "new") updateInquiryStatus(inq.id, "read");
                              setSelectedRequestDetail(selectedRequestDetail === `inq-${inq.id}` ? null : `inq-${inq.id}`);
                            }} className={`cursor-pointer border-b border-border last:border-0 hover:bg-muted/30 ${inq.status === "new" ? "bg-yellow-50/30" : ""}`}>
                              <td className="px-4 py-3"><span className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-foreground/60">{typeLabels[inq.type] || inq.type}</span></td>
                              <td className="px-4 py-3 font-medium text-foreground">{inqTitle}</td>
                              <td className="px-4 py-3 text-foreground/70">{inq.company} - {inq.name}</td>
                              <td className="px-4 py-3 text-foreground/70">{inq.email}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inq.status === "new" ? "bg-yellow-100 text-yellow-700" : inq.status === "read" ? "bg-purple-100 text-purple-700" : inq.status === "replied" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                                  {inq.status === "new" ? "신규" : inq.status === "read" ? "확인됨" : inq.status === "replied" ? "답변완료" : "종료"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-foreground/50">{ymd(inq.createdAt)}</td>
                            </tr>
                            {selectedRequestDetail === `inq-${inq.id}` && (
                              <tr>
                                <td colSpan={6} className="border-b border-border bg-muted/10 px-6 py-5">
                                  <div>
                                    {/* 문의자 정보 */}
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                      <div className="text-xs"><span className="text-foreground/60">문의자</span><p className="mt-0.5 font-medium text-foreground">{inq.company} {inq.name}</p></div>
                                      <div className="text-xs"><span className="text-foreground/60">이메일</span><p className="mt-0.5 font-medium text-foreground">{inq.email}</p></div>
                                      <div className="text-xs"><span className="text-foreground/60">연락처</span><p className="mt-0.5 font-medium text-foreground">{inq.phone || "-"}</p></div>
                                    </div>

                                    {/* 신고 처리.
                                        신고를 보고 → 대상을 찾아가서 → 제재하는 것을
                                        전부 손으로 해야 했고, 그 제재가 어느 신고
                                        때문인지도 남지 않았다. 여기서 바로 끝낸다. */}
                                    {inq.type === "report" && (
                                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50/40 p-4">
                                        <p className="text-sm font-semibold text-foreground">신고 처리</p>
                                        {(() => {
                                          const target = users.find((u) => u.companyId === inq.targetCompanyId);
                                          if (inq.resolvedAt) {
                                            return (
                                              <p className="mt-2 text-sm text-foreground/60">
                                                <span className="font-medium text-emerald-600">처리 완료</span>
                                                {" · "}{ymd(inq.resolvedAt)}
                                                {inq.resolution ? ` · ${inq.resolution}` : ""}
                                              </p>
                                            );
                                          }
                                          if (!inq.targetCompanyId) {
                                            return (
                                              <p className="mt-2 text-sm text-foreground/50">
                                                대상이 지정되지 않은 신고입니다. 내용을 보고 사용자 관리에서 직접 처리해주세요.
                                              </p>
                                            );
                                          }
                                          if (!target) {
                                            return (
                                              <p className="mt-2 text-sm text-foreground/50">
                                                신고 대상 회사의 회원을 찾을 수 없습니다. 이미 탈퇴했을 수 있습니다.
                                              </p>
                                            );
                                          }
                                          return (
                                            <>
                                              <p className="mt-2 text-sm text-foreground/70">
                                                대상: <span className="font-semibold text-foreground">{target.company}</span>
                                                {" · "}{target.name}
                                                {(target.sanctionCount ?? 0) > 0 && (
                                                  <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                                    누적 제재 {target.sanctionCount}회
                                                  </span>
                                                )}
                                              </p>
                                              <div className="mt-3 flex flex-wrap gap-2">
                                                <button
                                                  onClick={async () => {
                                                    setSanctionFor({ user: target, inquiryId: inq.id });
                                                    setSanctionForm({ kind: "warning", reason: "", detail: "" });
                                                    setSanctionHistory(await listSanctions(target.id).catch(() => []));
                                                  }}
                                                  className={ACTION_BTN}
                                                >
                                                  제재하기
                                                </button>
                                                <button
                                                  onClick={async () => {
                                                    const why = prompt("기각 사유를 적어주세요. (신고 기록에는 남습니다)");
                                                    if (!why?.trim()) return;
                                                    try {
                                                      await sanctionMember(target.id, "dismiss", why.trim(), inq.id);
                                                      await resolveInquiry(inq.id, `기각 — ${why.trim()}`);
                                                      await loadData();
                                                    } catch (err) {
                                                      toast(err instanceof Error ? err.message : "처리하지 못했습니다.");
                                                    }
                                                  }}
                                                  className={ACTION_BTN}
                                                >
                                                  기각
                                                </button>
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    )}
                                    {/* 문의 내용 */}
                                    <div className="mt-3 rounded-lg bg-muted/30 p-3">
                                      <p className="whitespace-pre-wrap text-sm text-foreground/70">{inq.message || "(내용 없음)"}</p>
                                    </div>
                                    {/* 기존 답변 */}
                                    {(inq as { replies?: { from: string; message: string; createdAt: string }[] }).replies?.map((reply, ri) => (
                                      <div key={ri} className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3" onClick={(e) => e.stopPropagation()}>
                                        {editingInqReply?.inqId === inq.id && editingInqReply?.replyIdx === ri ? (
                                          <div className="flex gap-2">
                                            <input type="text" value={editInqReplyText} onChange={(e) => setEditInqReplyText(e.target.value)}
                                              onKeyDown={(e) => { if (e.key === "Enter" && editInqReplyText.trim()) updateInqReply(inq.id, ri); }}
                                              className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-primary" />
                                            <button onClick={() => updateInqReply(inq.id, ri)} className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5">저장</button>
                                            <button onClick={() => setEditingInqReply(null)} className="rounded px-2 py-1 text-xs text-foreground/60 hover:bg-muted">취소</button>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="flex items-start justify-between">
                                              <p className="text-xs text-primary/60">{reply.from} · {new Date(reply.createdAt).toLocaleString("ko-KR")}</p>
                                              <div className="flex gap-1">
                                                <button onClick={() => { setEditingInqReply({ inqId: inq.id, replyIdx: ri }); setEditInqReplyText(reply.message); }}
                                                  className="rounded px-1.5 py-0.5 text-xs text-foreground/50 hover:text-primary">수정</button>
                                                <button onClick={() => deleteInqReply(inq.id, ri)}
                                                  className="rounded px-1.5 py-0.5 text-xs text-foreground/50 hover:text-red-500">삭제</button>
                                              </div>
                                            </div>
                                            <p className="mt-0.5 text-sm text-foreground/70">{reply.message}</p>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                    {/* 답변 입력 */}
                                    {inquiryReplyingTo === inq.id && (
                                      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <input type="text" value={inquiryReplyText} onChange={(e) => setInquiryReplyText(e.target.value)}
                                          placeholder="답변을 입력하세요"
                                          onKeyDown={(e) => { if (e.key === "Enter" && inquiryReplyText.trim()) replyToInquiry(inq.id); }}
                                          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                                        <button onClick={() => replyToInquiry(inq.id)} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark">전송</button>
                                      </div>
                                    )}
                                    {/* 액션 버튼 */}
                                    <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                      <button onClick={() => { setInquiryReplyingTo(inquiryReplyingTo === inq.id ? null : inq.id); setInquiryReplyText(""); }}
                                        className="rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10">답변</button>
                                      {inq.status !== "closed" && <button onClick={() => updateInquiryStatus(inq.id, "closed")} className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100">종료</button>}
                                    </div>
                                  </div>
                                  <BackToList onClick={() => setSelectedRequestDetail(null)} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ 공지사항 ════════════ */}
        {activeTab === "notices" && (
          <div className="mt-8">
            {/* 공지 작성 */}
            <div className="rounded-2xl border border-border bg-background p-6">
              <h3 className="text-base font-bold text-foreground">새 공지사항 작성</h3>
              <div className="mt-4 space-y-3">
                <input type="text" value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  placeholder="공지 제목" maxLength={50}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <textarea value={noticeForm.content} onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                  placeholder="공지 내용을 입력하세요" rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                <button onClick={addNotice} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">공지 등록</button>
              </div>
            </div>

            {/* 공지 목록 */}
            <div className="mt-6 space-y-4">
              {notices.length === 0 ? (
                <div className="rounded-2xl border border-border bg-background p-12 text-center">
                  <p className="text-sm text-foreground/60">등록된 공지사항이 없습니다.</p>
                </div>
              ) : [...notices].reverse().map((notice) => (
                <div key={notice.id} className="rounded-2xl border border-border bg-background p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{notice.title}</h4>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/70">{notice.content}</p>
                      <p className="mt-2 text-xs text-foreground/50">{new Date(notice.createdAt).toLocaleString("ko-KR")}</p>
                    </div>
                    <button onClick={() => deleteNotice(notice.id)} className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════ 알림 관리 ════════════ */}
        {activeTab === "notifications" && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-foreground/50">전체 알림 {adminNotifications.length}건 (읽지 않은 알림 {adminNotifications.filter((n) => n.userId === adminId && !n.read).length}건)</p>
              {adminNotifications.filter((n) => n.userId === adminId && !n.read).length > 0 && (
                <button onClick={() => run(() => markAllMyNotificationsRead())}
                  className="text-xs font-medium text-primary hover:underline">모두 읽음 처리</button>
              )}
            </div>
            {adminNotifications.length === 0 ? (
              <div className="rounded-2xl border border-border bg-background p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                <h3 className="mt-4 text-lg font-semibold text-foreground/60">받은 알림이 없습니다</h3>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left font-medium text-foreground/50">알림번호</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">구분</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">내용</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">대상</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">일시</th>
                        <th className="px-4 py-3 text-center font-medium text-foreground/50">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...adminNotifications].reverse().map((notif) => {
                        // 보낸 사람/받는 사람이 컬럼으로 있어 메시지 본문을
                        // 파싱할 필요가 없다.
                        const counterpartId = notif.userId === adminId ? notif.fromUserId : notif.userId;
                        const counterpart = users.find((u) => u.id === counterpartId);
                        const targetInfo = counterpart ? `${counterpart.name} (${counterpart.company})` : "-";
                        return (
                          <React.Fragment key={notif.id}>
                            <tr onClick={() => {
                              if (notif.userId === adminId && !notif.read) {
                                run(() => markNotificationReadApi(notif.id));
                              }
                              setSelectedRequestDetail(selectedRequestDetail === `notif-${notif.id}` ? null : `notif-${notif.id}`);
                            }} className={`cursor-pointer border-b border-border last:border-0 hover:bg-muted/30 ${notif.userId === adminId && !notif.read ? "bg-blue-50/50" : ""}`}>
                              <td className="px-4 py-3 text-xs font-mono text-foreground/50">{notif.notifCode || "-"}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${notif.userId === adminId ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                                  {notif.userId === adminId ? "받은 알림" : "보낸 알림"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-foreground/70">{(() => { const h = notif.message.split("\n")[0]; return h.length > 40 ? h.slice(0, 40) + "..." : h; })()}</td>
                              <td className="px-4 py-3 text-foreground/70">{targetInfo}</td>
                              <td className="px-4 py-3 text-xs text-foreground/50">{new Date(notif.createdAt).toLocaleString("ko-KR")}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${notif.read || notif.userId !== "admin" ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-700"}`}>
                                  {notif.read || notif.userId !== "admin" ? "읽음" : "안읽음"}
                                </span>
                              </td>
                            </tr>
                            {selectedRequestDetail === `notif-${notif.id}` && (
                              <tr>
                                <td colSpan={5} className="border-b border-border bg-muted/10 px-6 py-5">
                                  <div>
                                    {/* 전체 메시지 */}
                                    {/* 줄바꿈을 살린다. 안 살리면 제목과 본문,
                                        이의 제기 안내가 한 덩어리로 뭉친다. */}
                                    <p className={`whitespace-pre-line text-sm leading-relaxed ${notif.read || notif.userId !== "admin" ? "text-foreground/60" : "font-medium text-foreground"}`}>{notif.message}</p>
                                    {/* 답변 이력 */}
                                    {notif.replies?.map((reply, ri) => (
                                      <div key={ri} className="mt-2 rounded-lg bg-muted/50 p-3">
                                        <p className="text-xs text-foreground/60">{reply.company} {reply.from} · {new Date(reply.createdAt).toLocaleString("ko-KR")}</p>
                                        <p className="mt-0.5 text-sm text-foreground/70">{reply.message}</p>
                                      </div>
                                    ))}
                                    {/* 관리자 답변 입력 */}
                                    {notif.userId === adminId && (
                                      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <input type="text" value={adminReplyingTo === notif.id ? adminReplyText : ""} onChange={(e) => { setAdminReplyingTo(notif.id); setAdminReplyText(e.target.value); }}
                                          onFocus={() => { if (adminReplyingTo !== notif.id) { setAdminReplyingTo(notif.id); setAdminReplyText(""); } }}
                                          placeholder="답변을 입력하세요"
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && adminReplyText.trim()) {
                                              const text = adminReplyText;
                                              setAdminReplyingTo(null);
                                              setAdminReplyText("");
                                              // 원본에 답변을 남기고, 보낸 사람에게 새 알림이 간다.
                                              run(() => replyNotification(notif.id, text));
                                            }
                                          }}
                                          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                                        <button onClick={() => {
                                          if (!adminReplyText.trim() || adminReplyingTo !== notif.id) return;
                                          const text = adminReplyText;
                                          setAdminReplyingTo(null);
                                          setAdminReplyText("");
                                          run(() => replyNotification(notif.id, text));
                                        }}
                                          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark">전송</button>
                                      </div>
                                    )}
                                  </div>
                                  <BackToList onClick={() => setSelectedRequestDetail(null)} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ 분석 리포트 ════════════ */}
        {activeTab === "operators" && (
          <div className="mt-8">
            {/* 운영자 목록.
                계정을 나눠 쓰면 안 되는 이유는 supabase/phase21에 적어 두었다.
                요약하면 2단계 인증 증명이 계정당 하나라 서로를 로그아웃시키고,
                누가 무엇을 했는지 남지 않는다. 사람마다 계정을 따로 둔다. */}
            <div className="mb-6 rounded-2xl border border-border bg-background p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-foreground">운영자</h3>
                <button onClick={() => { setNewAdmin({ name: "", email: "", password: "", mfaEmail: "" }); setShowAddAdmin(true); }} className={ACTION_BTN}>
                  운영자 추가
                </button>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-foreground/50">
                운영자 계정은 한 사람이 하나씩 씁니다. 나눠 쓰면 2단계 인증 때문에
                서로 로그아웃되고, 회원을 제재한 사람이 누구인지 남지 않습니다.
              </p>
              <div className="mt-4 space-y-2">
                {admins.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {a.name}
                        <span className="ml-2 font-mono text-xs font-normal text-foreground/50">{a.memberCode}</span>
                        {a.id === adminId && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/50">나</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground/50">{a.email}</p>
                      <p className="mt-0.5 text-xs text-foreground/60">
                        인증번호 수신: {a.mfaEmail ?? <span className="text-red-500">미설정 — 로그인 불가</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const next = prompt(`${a.name}님이 인증번호를 받을 주소`, a.mfaEmail ?? "");
                          if (!next) return;
                          try { await setMfaEmail(a.id, next); await loadData(); toast("변경했습니다."); }
                          catch (err) { toast(err instanceof Error ? err.message : "변경하지 못했습니다."); }
                        }}
                        className={ACTION_BTN}
                      >
                        주소 변경
                      </button>
                      {a.id !== adminId && (
                        <button
                          onClick={async () => {
                            if (!await confirmDialog(`${a.name}님의 운영자 권한을 해제하시겠습니까?

즉시 관리자 화면에서 로그아웃됩니다.`)) return;
                            try { await setPlatformAdmin(a.id, false); await loadData(); }
                            catch (err) { toast(err instanceof Error ? err.message : "해제하지 못했습니다."); }
                          }}
                          className={ACTION_BTN}
                        >
                          권한 해제
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-foreground/60">
                운영자는 의뢰사·파트너사 회원과 다릅니다. 회원가입을 거치지 않고 여기서
                계정을 바로 만듭니다.
              </p>
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="mt-8">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background p-6">
                <h4 className="text-sm font-medium text-foreground/50">회원 현황</h4>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">전체 회원</span><span className="font-semibold">{totalUsers}명</span></div>
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">의뢰사</span><span className="font-semibold">{clientCount}명</span></div>
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">파트너사</span><span className="font-semibold">{partnerCount}명</span></div>
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">승인 대기</span><span className="font-semibold text-yellow-600">{pendingUsers}명</span></div>
                  {/* 승인을 판단할 때 실제로 보는 숫자다. 등록증을 안 낸
                      회원은 서류 없이 통과시키게 되므로 눈에 띄어야 한다. */}
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">등록증 미제출</span><span className="font-semibold text-red-500">{users.filter((u) => !u.licensePath).length}명</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background p-6">
                <h4 className="text-sm font-medium text-foreground/50">매칭 현황</h4>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">전체 매칭</span><span className="font-semibold">{allRequests.length}건</span></div>
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">진행중</span><span className="font-semibold">{allRequests.filter(r => r.status === "pending").length}건</span></div>
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">매칭 성사</span><span className="font-semibold text-blue-600">{allRequests.filter(r => r.status === "matched").length}건</span></div>
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">계약완료</span><span className="font-semibold text-green-600">{allRequests.filter(r => r.status === "completed").length}건</span></div>
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">회수</span><span className="font-semibold text-red-500">{allRequests.filter(r => r.status === "cancelled").length}건</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background p-6">
                <h4 className="text-sm font-medium text-foreground/50">문의 현황</h4>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">전체 문의</span><span className="font-semibold">{inquiries.length}건</span></div>
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">신규</span><span className="font-semibold text-yellow-600">{newInquiries}건</span></div>
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">답변완료</span><span className="font-semibold text-blue-600">{inquiries.filter(i => i.status === "replied").length}건</span></div>
                  <div className="flex justify-between text-sm"><span className="text-foreground/70">종료</span><span className="font-semibold">{inquiries.filter(i => i.status === "closed").length}건</span></div>
                </div>
                <div className="mt-4 border-t border-border pt-3">
                  <h5 className="text-xs font-medium text-foreground/60">문의 유형별</h5>
                  <div className="mt-2 space-y-1.5">
                    {Object.entries(typeLabels).map(([key, label]) => {
                      const count = inquiries.filter(i => i.type === key).length;
                      return count > 0 ? <div key={key} className="flex justify-between text-xs"><span className="text-foreground/60">{label}</span><span className="font-medium">{count}건</span></div> : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════════════ 알림 발송 모달 ════════════ */}
      {/* 제재.
          이력·상태·통지를 한 번에 처리한다. 셋이 따로 놀면 "상태는 정지인데
          이력이 없는" 회원이 생기고, 그러면 누적 횟수를 믿을 수 없게 된다. */}
      {sanctionFor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4" onClick={() => setSanctionFor(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground">제재</h3>
            <p className="mt-1 text-sm text-foreground/60">
              {sanctionFor.user.company} · {sanctionFor.user.name}
              {(sanctionFor.user.sanctionCount ?? 0) > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  누적 {sanctionFor.user.sanctionCount}회
                </span>
              )}
            </p>

            {(sanctionFor.user.sanctionCount ?? 0) >= 2 && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                이번 제재로 누적 {(sanctionFor.user.sanctionCount ?? 0) + 1}회가 됩니다.
                서비스운영정책 제6조 ③에 따라 누적 3회 이상이면 영구 탈퇴를 검토할 수 있습니다.
              </p>
            )}

            <label className="mt-4 block text-sm font-medium text-foreground">조치</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["warning", "restrict", "suspend"] as SanctionKind[]).map((k) => (
                <button key={k} type="button" onClick={() => setSanctionForm({
                  kind: k,
                  // 조치를 바꾸면 사유도 비운다. 제한 사유를 적어 두고
                  // 정지로 옮기면 엉뚱한 문구가 통지된다. 상세는 남긴다 —
                  // 같은 사실을 설명한 글이라 조치가 바뀌어도 쓸모 있다.
                  reason: k === "suspend" ? SANCTION_REASONS.suspend[0] : "",
                  detail: sanctionForm.detail,
                })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    sanctionForm.kind === k ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground/60 hover:border-foreground/30"
                  }`}>
                  {SANCTION_LABELS[k]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-foreground/60">
              경고는 상태를 바꾸지 않고 이력만 남깁니다. 제한은 일부 기능이 막히고, 정지는 로그인이 막힙니다.
            </p>

            <label className="mt-4 block text-sm font-medium text-foreground">
              사유 * <span className="text-xs font-normal text-foreground/60">(통지의 제목이 됩니다)</span>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SANCTION_REASONS[sanctionForm.kind].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSanctionForm({ ...sanctionForm, reason: r })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    sanctionForm.reason === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground/60 hover:border-foreground/30"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {sanctionForm.kind === "suspend" && (
              <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-foreground/60">
                정지는 로그인을 막는 가장 센 조치입니다. 서비스운영정책 제6조 ③이 정한
                누적 3회에 이르렀을 때 씁니다. 그 전 단계는 경고와 제한입니다.
              </p>
            )}
            <label className="mt-4 block text-sm font-medium text-foreground">
              상세 내용 <span className="text-xs font-normal text-foreground/60">(선택 · 통지의 본문이 됩니다)</span>
            </label>
            <textarea value={sanctionForm.detail} onChange={(e) => setSanctionForm({ ...sanctionForm, detail: e.target.value })}
              rows={4} placeholder={"무엇이 어떻게 문제인지, 어떻게 하면 되는지 적어주세요.\n예: 담당자명이 실명과 다릅니다. 마이페이지에서 수정해 주시면 해제해 드립니다."}
              className="mt-1 w-full resize-none rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />

            {/* 보내기 전에 받는 사람이 볼 모양 그대로 보여준다. 통지는
                한 번 나가면 거두지 못한다. */}
            {sanctionForm.reason && sanctionForm.kind !== "dismiss" && (
              <div className="mt-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                <p className="text-xs font-semibold text-foreground/60">받는 사람에게 이렇게 갑니다</p>
                <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-foreground/80">
                  {`[${SANCTION_LABELS[sanctionForm.kind]}] ${sanctionForm.reason}`}
                  {sanctionForm.detail.trim() ? `\n\n${sanctionForm.detail.trim()}` : ""}
                  {/* 제한만 답변으로 풀린다(phase34). 경고는 풀 것이 없고,
                      정지는 누적 3회에 이른 상태라 이의 제기 절차를 거친다. */}
                  {sanctionForm.kind === "restrict"
                    ? "\n\n조치를 마치신 뒤 이 알림에 답변을 남겨주시면, 확인 후 제한을 해제해 드립니다."
                    : ""}
                  {"\n\n이의가 있으시면 통지일로부터 7일 이내에 고객센터(contact@sonjobdamd.com)로 알려주세요."}
                </p>
              </div>
            )}

            {sanctionHistory.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-foreground">지난 이력</p>
                <div className="mt-2 space-y-2">
                  {sanctionHistory.map((h) => (
                    <div key={h.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                      <p className="font-medium text-foreground">
                        {SANCTION_LABELS[h.kind]}
                        <span className="ml-2 font-normal text-foreground/60">
                          {ymd(h.createdAt)}
                          {h.decidedByName ? ` · ${h.decidedByName}` : ""}
                        </span>
                      </p>
                      <p className="mt-0.5 text-foreground/60">{h.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={async () => {
                  if (!sanctionForm.reason.trim()) { toast("사유를 선택해주세요."); return; }
                  try {
                    const { count } = await sanctionMember(
                      sanctionFor.user.id, sanctionForm.kind, sanctionForm.reason.trim(),
                      sanctionFor.inquiryId, sanctionForm.detail
                    );
                    if (sanctionFor.inquiryId) {
                      await resolveInquiry(sanctionFor.inquiryId, `${SANCTION_LABELS[sanctionForm.kind]} — ${sanctionForm.reason.trim()}`);
                    }
                    setSanctionFor(null);
                    await loadData();
                    toast(count >= 3
                      ? `제재했습니다. 누적 ${count}회입니다 — 정책 제6조 ③에 따라 영구 탈퇴를 검토할 수 있습니다.`
                      : `제재했습니다. 누적 ${count}회입니다.`);
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "처리하지 못했습니다.");
                  }
                }}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                제재하고 통지
              </button>
              <button onClick={() => setSanctionFor(null)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:bg-muted">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 파트너사 초대 */}
      {showInvitePartner && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-10" onClick={() => setShowInvitePartner(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground">파트너사 초대</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/50">
              회사와 분야는 운영자가 정하고, 비밀번호와 사업자등록증은 초대받은
              담당자가 직접 넣습니다. 스스로 가입할 수 없게 닫아 둔 분야도 이 길로
              들어옵니다. 가입이 끝나면 회원 목록에 대기로 올라오니, 올라온
              사업자등록증을 보고 승인해주세요.
            </p>

            {inviteLink ? (
              <div className="mt-5">
                <p className="text-sm font-medium text-foreground">초대를 만들었습니다.</p>
                <p className="mt-1 text-sm text-foreground/60">
                  메일이 나가지 않았습니다. 아래 링크를 담당자에게 직접 전해 주세요.
                  14일 동안 한 번만 쓸 수 있습니다.
                </p>
                <p className="mt-3 break-all rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs select-all">
                  {inviteLink}
                </p>
                <button
                  onClick={() => { setShowInvitePartner(false); loadData(); }}
                  className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  닫기
                </button>
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground">회사명</label>
                    <input
                      value={newPartner.companyName}
                      onChange={(e) => setNewPartner({ ...newPartner, companyName: e.target.value })}
                      placeholder="(주) 회사명"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">사업자등록번호</label>
                    <div className="mt-1 flex gap-2">
                      <input
                        value={newPartner.businessNumber}
                        onChange={(e) => { setNewPartner({ ...newPartner, businessNumber: e.target.value }); setPartnerBiz({ ok: null, note: "", checking: false }); }}
                        placeholder="000-00-00000"
                        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        disabled={partnerBiz.checking || newPartner.businessNumber.replace(/[^0-9]/g, "").length !== 10}
                        onClick={async () => {
                          setPartnerBiz({ ok: null, note: "", checking: true });
                          try {
                            const res = await fetch("/api/business-number", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ businessNumber: newPartner.businessNumber }),
                            });
                            const d = await res.json();
                            setPartnerBiz({ ok: d.valid !== false, note: d.message ?? d.status ?? "", checking: false });
                          } catch {
                            setPartnerBiz({ ok: null, note: "확인하지 못했습니다.", checking: false });
                          }
                        }}
                        className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground/70 hover:bg-muted disabled:opacity-40"
                      >
                        {partnerBiz.checking ? "조회 중" : "사업자 확인"}
                      </button>
                    </div>
                    {partnerBiz.note && (
                      <p className={`mt-1 text-xs ${partnerBiz.ok === false ? "text-red-500" : "text-foreground/60"}`}>
                        {partnerBiz.note}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">담당자 이메일</label>
                    <input
                      type="email"
                      value={newPartner.email}
                      onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                      placeholder="manager@company.com"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <p className="mt-1 text-xs text-foreground/50">
                      이 주소로 초대 링크가 갑니다. 운영자 계정과 다른 주소여야 합니다.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">분야 <span className="text-xs font-normal text-foreground/60">(복수 선택 가능)</span></label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["CRO", "CMO/CDMO", "SMO", "RA/인허가", "기업보험", "소모품 공급", "원료·첨가제 공급", "마케팅 대행"].map((cat) => {
                        const on = newPartner.categories.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setNewPartner({
                              ...newPartner,
                              categories: on
                                ? newPartner.categories.filter((c) => c !== cat)
                                : [...newPartner.categories, cat],
                            })}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              on ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground/60 hover:border-foreground/30"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {partnerBiz.ok !== true && (
                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    보내기 전에 「사업자 확인」을 눌러 국세청 등록 여부를 확인해주세요.
                    초대로 들어오는 사람은 이 조회를 거치지 않습니다.
                  </p>
                )}

                <div className="mt-5 flex gap-2">
                  <button
                    disabled={partnerBiz.ok !== true}
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/admin/partner-invite", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(newPartner),
                        });
                        const d = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(d.message ?? "초대하지 못했습니다.");
                        if (d.sent) {
                          setShowInvitePartner(false);
                          await loadData();
                          toast(`${newPartner.email}로 초대 메일을 보냈습니다.`);
                        } else {
                          // 메일만 실패한 것이다. 초대는 이미 만들어졌으므로
                          // 다시 누르면 회사가 중복된다 — 링크를 보여 준다.
                          setInviteLink(d.link ?? null);
                        }
                      } catch (err) {
                        toast(err instanceof Error ? err.message : "초대하지 못했습니다.");
                      }
                    }}
                    className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    초대 보내기
                  </button>
                  <button onClick={() => setShowInvitePartner(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:bg-muted">
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 운영자 추가 */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4" onClick={() => setShowAddAdmin(false)}>
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground">운영자 추가</h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/50">
              손잡다메디칼 직원 계정을 바로 만듭니다. 회원가입 절차를 거치지 않으므로
              사업자등록번호 조회나 승인 대기가 없습니다.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground">이름</label>
                <input
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  placeholder="홍길동"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">로그인 이메일</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="staff@sonjobdamd.com"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">초기 비밀번호</label>
                <PasswordInput
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  placeholder="8자 이상"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-foreground/60">
                  본인에게 전달하고, 첫 로그인 뒤 바꾸게 하세요.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">인증번호 받을 주소</label>
                <input
                  type="email"
                  value={newAdmin.mfaEmail}
                  onChange={(e) => setNewAdmin({ ...newAdmin, mfaEmail: e.target.value })}
                  placeholder="개인 메일 주소"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-foreground/60">
                  로그인 이메일과 <b>다른</b> 주소여야 합니다. 같으면 메일함 하나만 뚫려도
                  비밀번호 재설정과 인증번호 수신이 함께 되어 2단계 인증이 되지 않습니다.
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/operators", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(newAdmin),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.message ?? "만들지 못했습니다.");
                    setShowAddAdmin(false);
                    await loadData();
                    toast("운영자 계정을 만들었습니다.");
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "만들지 못했습니다.");
                  }
                }}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                계정 만들기
              </button>
              <button onClick={() => setShowAddAdmin(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:bg-muted">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 변경 */}
      {showPwModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4" onClick={() => setShowPwModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground">비밀번호 변경</h3>
            <p className="mt-1 text-sm text-foreground/50">8자 이상으로 지정해주세요.</p>
            <div className="mt-4 space-y-3">
              <PasswordInput
                value={pwForm.next}
                onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                placeholder="새 비밀번호"
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <PasswordInput
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                placeholder="새 비밀번호 확인"
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={async () => {
                  if (pwForm.next.length < 8) { toast("8자 이상 입력해주세요."); return; }
                  if (pwForm.next !== pwForm.confirm) { toast("두 번 입력한 비밀번호가 다릅니다."); return; }
                  setPwBusy(true);
                  try {
                    await changeMyPassword(pwForm.next);
                    setShowPwModal(false);
                    // 비밀번호를 바꿨으면 그 비밀번호로 다시 들어오는 것이
                    // 맞다. 바뀐 줄 모르고 쓰다가 다음 로그인에서 막히는
                    // 것보다, 지금 끊고 새로 들어오게 한다.
                    toast("비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해주세요.");
                    logout();
                    router.push("/admin/login");
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "변경하지 못했습니다.");
                  } finally {
                    setPwBusy(false);
                  }
                }}
                disabled={pwBusy}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
              >
                {pwBusy ? "변경 중..." : "변경"}
              </button>
              <button onClick={() => setShowPwModal(false)} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:bg-muted">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNotificationModal(false)}>
          <div className="mx-4 w-full max-w-xl rounded-2xl bg-background p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">알림 발송</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground">수신 회원</label>
                <select value={notificationForm.userId} onChange={(e) => setNotificationForm({ ...notificationForm, userId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                  <option value="">선택해주세요</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.company})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">
                  상황 선택 <span className="text-xs font-normal text-foreground/60">(고르면 아래에 들어갑니다. 고쳐서 보낼 수 있습니다)</span>
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    const body = e.target.value;
                    if (!body) return;
                    const u = users.find((x) => x.id === notificationForm.userId);
                    const filled = body
                      .replaceAll("{담당자명}", u?.name ?? "담당자")
                      .replaceAll("{회사명}", u?.company ?? "귀사");
                    setNotificationForm({ ...notificationForm, message: filled });
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">직접 작성</option>
                  {NOTICE_TEMPLATES.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map((t) => (
                        <option key={t.label} value={t.body}>{t.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">메시지</label>
                <textarea value={notificationForm.message} onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  placeholder="알림 메시지를 입력하세요" rows={6}
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowNotificationModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-muted">취소</button>
              <button onClick={sendNotification} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">발송</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ 회원 상세보기 모달 ════════════ */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setSelectedUser(null); setUserEdit(null); }}>
          <div className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-foreground">{userEdit ? "회원 정보 수정" : "회원 상세 정보"}</h3>
              <div className="flex items-center gap-2">
                {!userEdit && (
                  <button onClick={() => setUserEdit({
                    name: selectedUser.name, phone: selectedUser.phone ?? "",
                    company: selectedUser.company, businessNumber: selectedUser.businessNumber ?? "",
                    address: selectedUser.address ?? "",
                  })} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-muted">
                    정보 수정
                  </button>
                )}
                <button onClick={() => { setSelectedUser(null); setUserEdit(null); }} className="rounded-lg p-1 text-foreground/60 hover:bg-muted hover:text-foreground">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {userEdit ? (
              <form className="mt-5 space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const u = selectedUser; const f = userEdit;
                const profileChanged = f.name !== u.name || f.phone !== (u.phone ?? "");
                const companyChanged = f.company !== u.company || f.businessNumber !== (u.businessNumber ?? "") || f.address !== (u.address ?? "");
                if (!profileChanged && !companyChanged) { setUserEdit(null); return; }
                if (companyChanged && !await confirmDialog("회사 정보는 같은 회사의 모든 멤버에게 함께 반영됩니다. 저장할까요?")) return;
                await run(async () => {
                  if (profileChanged) await updateProfileAsAdmin(u.id, { name: f.name, phone: f.phone });
                  if (companyChanged && u.companyId) await updateCompanyAsAdmin(u.companyId, {
                    name: f.company, businessNumber: f.businessNumber, address: f.address,
                  });
                }, "저장했습니다.");
                setSelectedUser({ ...u, name: f.name, phone: f.phone, company: f.company, businessNumber: f.businessNumber, address: f.address });
                setUserEdit(null);
              }}>
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-xs font-semibold text-foreground/50">회원 개인 정보</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-foreground/60">담당자명</span>
                      <input value={userEdit.name} onChange={(e) => setUserEdit({ ...userEdit, name: e.target.value })} required
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-foreground/60">연락처</span>
                      <input value={userEdit.phone} onChange={(e) => setUserEdit({ ...userEdit, phone: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                    </label>
                  </div>
                  <p className="mt-2 text-[11px] text-foreground/60">이메일({selectedUser.email})은 로그인 계정이라 여기서 바꿀 수 없습니다.</p>
                </div>
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-xs font-semibold text-foreground/50">회사 정보 <span className="font-normal">— 같은 회사 멤버 전체에 반영</span></p>
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs text-foreground/60">회사명</span>
                        <input value={userEdit.company} onChange={(e) => setUserEdit({ ...userEdit, company: e.target.value })} required
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                      </label>
                      <label className="block">
                        <span className="text-xs text-foreground/60">사업자등록번호</span>
                        <input value={userEdit.businessNumber} onChange={(e) => setUserEdit({ ...userEdit, businessNumber: e.target.value })} required
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs text-foreground/60">기업주소</span>
                      <input value={userEdit.address} onChange={(e) => setUserEdit({ ...userEdit, address: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                    </label>
                  </div>
                  <p className="mt-2 text-[11px] text-foreground/60">사업자등록번호를 바꾸면 국세청 검증 상태가 초기화됩니다.</p>
                </div>
                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <button type="button" onClick={() => setUserEdit(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground/70 hover:bg-muted">취소</button>
                  <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark">저장</button>
                </div>
              </form>
            ) : (
            <>
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <InfoRow label="회원번호" value={selectedUser.memberCode || "-"} />
                <InfoRow label="담당자명" value={selectedUser.name} />
                <InfoRow label="이메일" value={selectedUser.email} />
                <InfoRow label="회사명" value={selectedUser.company} />
                <InfoRow label="연락처" value={selectedUser.phone || "-"} />
                <InfoRow label="사업자등록번호" value={selectedUser.businessNumber || "-"} />
                {/* 승인 판단에 쓰는 서류다. 비공개 버킷이라 서버에서 한시적인
                    서명 링크를 받아 연다. */}
                <div>
                  <p className="text-sm text-foreground/60">사업자등록증</p>
                  {selectedUser.licensePath ? (
                    <button
                      onClick={() => openLicense(selectedUser.companyId)}
                      className="mt-1 text-base font-medium text-primary underline hover:text-primary-dark"
                    >
                      {selectedUser.licenseName ?? "등록증 보기"}
                    </button>
                  ) : (
                    <p className="mt-1 text-base font-medium text-red-500">미제출</p>
                  )}
                </div>
                <InfoRow label="기업주소" value={selectedUser.address || "-"} />
                <InfoRow label="유형" value={selectedUser.roles?.map((r) => r === "client" ? "의뢰사" : "파트너사").join(", ") || "-"} />
                <InfoRow label="상태" value={!selectedUser.status || selectedUser.status === "pending" ? "대기" : selectedUser.status === "approved" ? "활성" : selectedUser.status === "restricted" ? "제한" : "정지"} />
                <InfoRow label="회사관리자" value={selectedUser.isCompanyAdmin ? "지정됨" : "일반"} />
                <InfoRow label="가입일시" value={ymdhm(selectedUser.createdAt)} />
                {/* 광고성 메일을 보내려면 누가 동의했는지 알아야 하고, 분쟁이
                    생기면 언제 받았는지에 답할 수 있어야 한다. */}
                <InfoRow
                  label="마케팅 수신"
                  value={
                    selectedUser.marketingConsent
                      ? `동의${selectedUser.marketingConsentAt ? ` (${ymd(selectedUser.marketingConsentAt)})` : ""}`
                      : "미동의"
                  }
                />
              </div>
              {selectedUser.roles?.includes("partner") && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-foreground/60">파트너사 유형 (파트너 카테고리)</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {["CRO", "CMO/CDMO", "SMO", "RA/인허가", "기업보험", "소모품 공급", "원료·첨가제 공급", "마케팅 대행"].map((cat) => (
                      <label key={cat} className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={(selectedUser.partnerCategories || []).includes(cat)}
                          onChange={() => {
                            const current = selectedUser.partnerCategories || [];
                            const updated = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
                            setSelectedUser({ ...selectedUser, partnerCategories: updated });
                            run(() => updateProfileAsAdmin(selectedUser.id, { partnerCategories: updated }))
                              .then(() => setUsers((prev) => { const u = prev.find((x) => x.id === selectedUser.id); if (u) setSelectedUser({ ...selectedUser, partnerCategories: u.partnerCategories }); return prev; }));
                          }}
                          className="h-4 w-4 rounded border-border accent-primary" />
                        <span className="text-sm text-foreground/70">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {selectedUser.roles?.includes("partner") && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-foreground/60">회사 역량 (파트너 프로필)</p>
                    {selectedProfile && (
                      <button type="button" onClick={async () => {
                        const next = !selectedProfile.verifiedAt;
                        await run(() => verifyPartnerProfile(selectedProfile.companyId, next), next ? "운영자 확인 표시를 했습니다." : "확인 표시를 해제했습니다.");
                        setSelectedProfile({ ...selectedProfile, verifiedAt: next ? new Date().toISOString() : null });
                      }} className={ROW_BTN}>
                        {selectedProfile.verifiedAt ? "확인 해제" : "운영자 확인"}
                      </button>
                    )}
                  </div>
                  {selectedProfile === undefined
                    ? <p className="mt-2 text-xs text-foreground/60">불러오는 중…</p>
                    : <PartnerProfileCard profile={selectedProfile} categories={selectedUser.partnerCategories ?? []} docName={selectedDocName} companyId={selectedUser.companyId} />}
                </div>
              )}
            </div>
            {/* 버튼은 왼쪽(상태·권한)과 오른쪽(알림·삭제)으로 나뉜다. 좁으면
                줄을 바꾸되 버튼 하나가 가운데서 갈라지진 않는다. */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <div className="flex flex-wrap gap-2">
                {(selectedUser.status === "pending" || !selectedUser.status) && (
                  <button onClick={async () => { if (await approveUser(selectedUser)) setSelectedUser({ ...selectedUser, status: "approved" }); }}
                    className={ACTION_BTN}>승인</button>
                )}
                {(selectedUser.status === "suspended" || selectedUser.status === "restricted") && (
                  <button onClick={() => { updateUserField(selectedUser.id, "status", "approved"); setSelectedUser({ ...selectedUser, status: "approved" }); }}
                    className={ACTION_BTN}>해제</button>
                )}
                {selectedUser.status !== "suspended" && (
                  <button onClick={() => { openSanction(selectedUser); setSelectedUser(null); }}
                    className={ACTION_BTN}>제재</button>
                )}
                {selectedUser.roles?.includes("partner") && (
                  <button onClick={() => {
                    updateUserField(selectedUser.id, "allowCategoryEdit", !selectedUser.allowCategoryEdit);
                    setSelectedUser({ ...selectedUser, allowCategoryEdit: !selectedUser.allowCategoryEdit });
                  }}
                    className={ACTION_BTN}>
                    {selectedUser.allowCategoryEdit ? "파트너사 유형 수정 잠금" : "파트너사 유형 수정 허용"}
                  </button>
                )}
                <button onClick={async () => {
                  const next = !selectedUser.isCompanyAdmin;
                  if (next && !await confirmDialog(`"${selectedUser.name}"을 회사관리자로 지정하시겠습니까?\n같은 회사의 기존 관리자는 자동 해제됩니다.`)) return;
                  // 같은 회사의 기존 담당자 해제까지 서버가 한 번에 처리한다.
                  run(() => setCompanyAdmin(selectedUser.id, next));
                  setSelectedUser({ ...selectedUser, isCompanyAdmin: next });
                }}
                  className={ACTION_BTN}>
                  {selectedUser.isCompanyAdmin ? "회사관리자 해제" : "회사관리자 지정"}
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setNotificationForm({ userId: selectedUser.id, message: "" }); setShowNotificationModal(true); setSelectedUser(null); }}
                  className={ACTION_BTN}>알림 발송</button>
                <button onClick={async () => { if (await confirmDialog(`"${selectedUser.name}" 회원을 삭제하시겠습니까?\n삭제된 회원 정보는 복구할 수 없습니다.`, { confirmLabel: "삭제", danger: true }) && await confirmDialog(`정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`, { confirmLabel: "삭제", danger: true })) { deleteUser(selectedUser.id); setSelectedUser(null); } }}
                  className={ACTION_BTN}>삭제</button>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={() => setSelectedUser(null)}
                className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground/70 hover:bg-muted">
                ← 목록으로
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="mt-1 break-keep text-base font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatCard({ label, value, sub, color, onClick }: { label: string; value: string | number; sub: string; color: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-2xl border border-border bg-background p-6 ${onClick ? "cursor-pointer transition-all hover:border-primary/30 hover:shadow-md" : ""}`}>
      <p className="text-sm text-foreground/50">{label}</p>
      <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
      <p className={`mt-1 text-xs ${color}`}>{sub}</p>
    </div>
  );
}
