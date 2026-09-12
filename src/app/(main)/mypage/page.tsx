"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getMyRequests, getRequestsForPartner } from "@/lib/mock-data";
import type { PartnerCategory } from "@/types/auth";

const allPartnerCategories: PartnerCategory[] = [
  "CRO", "CMO/CDMO", "SMO", "RA/인허가", "임상시험 보험", "소모품 공급", "마케팅 대행",
];

export default function MyPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "company">("profile");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [companyMembers, setCompanyMembers] = useState<{ id: string; name: string; email: string; isCompanyAdmin?: boolean; status?: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showCompanyChangeModal, setShowCompanyChangeModal] = useState(false);
  const [companyChangeRequest, setCompanyChangeRequest] = useState("");
  const [editingCategories, setEditingCategories] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<PartnerCategory[]>([]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    setEditForm({ name: user.name, phone: user.phone || "" });
    // 같은 회사 멤버 조회
    const allUsers = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const members = allUsers
      .filter((u: { company: string; businessNumber: string }) => u.businessNumber === user.businessNumber)
      .map((u: { id: string; name: string; email: string; isCompanyAdmin?: boolean; status?: string }) => ({ id: u.id, name: u.name, email: u.email, isCompanyAdmin: u.isCompanyAdmin, status: u.status }));
    setCompanyMembers(members);
  }, [user, router]);

  if (!user) return null;

  // 활동 요약
  const myRequests = getMyRequests(user.id);
  const receivedQuotes = myRequests.reduce((sum, r) => sum + (r.quotes || []).filter((q) => q.status === "quoted").length, 0);
  const partnerRequests = user.partnerCategories ? getRequestsForPartner(user.partnerCategories, user.businessNumber) : [];
  const submittedQuotes = partnerRequests.filter((r) => (r.quotes || []).some((q) => q.partnerId === user.id && ["quoted", "client_reviewing", "accepted", "client_hold", "client_rejected", "not_selected"].includes(q.status))).length;

  const saveProfile = () => {
    if (editForm.name.trim().length < 2) { alert("이름은 2자 이상 입력해주세요."); return; }
    const allUsers = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const idx = allUsers.findIndex((u: { id: string }) => u.id === user.id);
    if (idx !== -1) {
      allUsers[idx].name = editForm.name;
      allUsers[idx].phone = editForm.phone;
      localStorage.setItem("sonjobda_users", JSON.stringify(allUsers));
      const updated = { ...user, name: editForm.name, phone: editForm.phone };
      localStorage.setItem("sonjobda_user", JSON.stringify(updated));
      alert("프로필이 수정되었습니다. 새로고침 후 반영됩니다.");
      setEditMode(false);
    }
  };

  const changePassword = () => {
    if (!pwForm.current) { alert("현재 비밀번호를 입력해주세요."); return; }
    if (pwForm.newPw.length < 8) { alert("새 비밀번호는 8자 이상이어야 합니다."); return; }
    if (pwForm.newPw !== pwForm.confirm) { alert("새 비밀번호가 일치하지 않습니다."); return; }
    const allUsers = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const idx = allUsers.findIndex((u: { id: string }) => u.id === user.id);
    if (idx === -1) return;
    if (allUsers[idx].password !== pwForm.current) { alert("현재 비밀번호가 올바르지 않습니다."); return; }
    allUsers[idx].password = pwForm.newPw;
    localStorage.setItem("sonjobda_users", JSON.stringify(allUsers));
    setPwForm({ current: "", newPw: "", confirm: "" });
    alert("비밀번호가 변경되었습니다.");
  };

  const deleteAccount = () => {
    if (!confirm("회원 탈퇴를 진행하시겠습니까?\n모든 데이터가 삭제되며 복구할 수 없습니다.")) return;
    if (!confirm("정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    const allUsers = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const filtered = allUsers.filter((u: { id: string }) => u.id !== user.id);
    localStorage.setItem("sonjobda_users", JSON.stringify(filtered));
    logout();
    alert("회원 탈퇴가 완료되었습니다.");
    router.push("/");
  };

  const isAdmin = user.isCompanyAdmin;

  const reloadMembers = () => {
    const allUsers = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    setCompanyMembers(allUsers
      .filter((u: { businessNumber: string }) => u.businessNumber === user.businessNumber)
      .map((u: { id: string; name: string; email: string; isCompanyAdmin?: boolean; status?: string }) => ({ id: u.id, name: u.name, email: u.email, isCompanyAdmin: u.isCompanyAdmin, status: u.status })));
  };

  const delegateAdmin = (memberId: string) => {
    if (!confirm("이 멤버에게 회사 관리자 권한을 위임하시겠습니까?\n본인의 관리자 권한은 해제됩니다.")) return;
    const allUsers = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const myIdx = allUsers.findIndex((u: { id: string }) => u.id === user.id);
    const targetIdx = allUsers.findIndex((u: { id: string }) => u.id === memberId);
    if (myIdx !== -1) allUsers[myIdx].isCompanyAdmin = false;
    if (targetIdx !== -1) allUsers[targetIdx].isCompanyAdmin = true;
    localStorage.setItem("sonjobda_users", JSON.stringify(allUsers));
    const updated = { ...user, isCompanyAdmin: false };
    localStorage.setItem("sonjobda_user", JSON.stringify(updated));
    reloadMembers();
    alert("관리자 권한이 위임되었습니다.");
  };

  const deactivateMember = (memberId: string) => {
    if (!confirm("이 멤버를 비활성화하시겠습니까?")) return;
    const allUsers = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const idx = allUsers.findIndex((u: { id: string }) => u.id === memberId);
    if (idx !== -1) {
      allUsers[idx].status = "suspended";
      localStorage.setItem("sonjobda_users", JSON.stringify(allUsers));
    }
    reloadMembers();
    alert("멤버가 비활성화되었습니다.");
  };

  const activateMember = (memberId: string) => {
    const allUsers = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
    const idx = allUsers.findIndex((u: { id: string }) => u.id === memberId);
    if (idx !== -1) {
      allUsers[idx].status = "approved";
      localStorage.setItem("sonjobda_users", JSON.stringify(allUsers));
    }
    reloadMembers();
  };

  const sendInvite = () => {
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) { alert("올바른 이메일을 입력해주세요."); return; }
    const invites = JSON.parse(localStorage.getItem("sonjobda_invites") || "[]");
    invites.push({ id: crypto.randomUUID(), email: inviteEmail, company: user.company, businessNumber: user.businessNumber, invitedBy: user.name, createdAt: new Date().toISOString() });
    localStorage.setItem("sonjobda_invites", JSON.stringify(invites));
    const inviteLink = `${window.location.origin}/signup?invite=${encodeURIComponent(inviteEmail)}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert(`초대 링크가 클립보드에 복사되었습니다.\n${inviteEmail}에게 직접 전달해주세요.\n\n※ 백엔드 구축 후 이메일 자동 발송으로 전환 예정`);
    }).catch(() => {
      prompt("아래 링크를 복사하여 전달해주세요:", inviteLink);
    });
    setInviteEmail("");
  };

  const submitCompanyInfoChange = () => {
    if (!companyChangeRequest.trim()) { alert("변경 요구사항을 입력해주세요."); return; }
    const notifications = JSON.parse(localStorage.getItem("sonjobda_notifications") || "[]");
    notifications.push({
      id: crypto.randomUUID(),
      userId: "admin",
      message: `[회사정보 변경 요청] ${user.company} (${user.businessNumber})\n요청자: ${user.name} (${user.email})\n\n요구사항:\n${companyChangeRequest}`,
      read: false,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("sonjobda_notifications", JSON.stringify(notifications));
    setShowCompanyChangeModal(false);
    setCompanyChangeRequest("");
    alert("회사 정보 변경이 요청되었습니다. 관리자 확인 후 반영됩니다.");
  };

  const statusLabel = !user.status || user.status === "pending" ? "승인 대기" : user.status === "approved" ? "활성" : user.status === "restricted" ? "제한" : "정지";
  const statusColor = !user.status || user.status === "pending" ? "bg-yellow-100 text-yellow-700" : user.status === "approved" ? "bg-green-100 text-green-700" : user.status === "restricted" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">마이페이지</h1>
        <p className="mt-1 text-sm text-foreground-muted">계정 정보를 관리하세요.</p>

        {/* 탭 */}
        <div className="mt-6 flex gap-2 border-b border-border">
          {([
            { key: "profile" as const, label: "프로필" },
            { key: "password" as const, label: "비밀번호 변경" },
            { key: "company" as const, label: "소속 관리" },
          ]).map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-foreground/50 hover:text-foreground"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 프로필 */}
        {activeTab === "profile" && (
          <div className="mt-6 space-y-6">
            {/* 계정 상태 */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface shadow-card p-5">
              <div>
                <p className="text-sm text-foreground/50">계정 상태</p>
                <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-foreground/50">회원번호</p>
                <p className="mt-1 font-mono text-sm font-medium text-foreground">{(user as unknown as { memberCode?: string }).memberCode || "-"}</p>
              </div>
            </div>

            {/* 프로필 정보 */}
            <div className="rounded-xl border border-border bg-surface shadow-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">프로필 정보</h3>
                {!editMode ? (
                  <button onClick={() => setEditMode(true)} className="text-xs font-medium text-primary hover:underline">수정</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveProfile} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark">저장</button>
                    <button onClick={() => { setEditMode(false); setEditForm({ name: user.name, phone: user.phone || "" }); }} className="text-xs text-foreground/50 hover:underline">취소</button>
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-foreground/40">이름</p>
                  {editMode ? (
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} maxLength={6}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground">{user.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-foreground/40">이메일 <span className="text-foreground/20">(수정 불가)</span></p>
                  <p className="mt-1 text-sm font-medium text-foreground">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/40">연락처</p>
                  {editMode ? (
                    <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} maxLength={13}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
                  ) : (
                    <p className="mt-1 text-sm font-medium text-foreground">{user.phone || "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-foreground/40">회사명 <span className="text-foreground/20">(수정 불가)</span></p>
                  <p className="mt-1 text-sm font-medium text-foreground">{user.company}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/40">사업자등록번호 <span className="text-foreground/20">(수정 불가)</span></p>
                  <p className="mt-1 text-sm font-medium text-foreground">{user.businessNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/40">기업주소</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{user.address || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/40">회원 유형</p>
                  <div className="mt-1 flex gap-1">
                    {user.roles?.map((role) => (
                      <span key={role} className={`rounded-full px-2 py-0.5 text-xs font-medium ${role === "partner" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                        {role === "client" ? "의뢰사" : "파트너사"}
                      </span>
                    ))}
                  </div>
                </div>
                {user.partnerCategories && user.partnerCategories.length > 0 && (
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-foreground/40">회사유형</p>
                      {user.allowCategoryEdit && !editingCategories && (
                        <button onClick={() => { setEditingCategories(true); setSelectedCategories([...(user.partnerCategories || [])]); }}
                          className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20">수정</button>
                      )}
                    </div>
                    {editingCategories ? (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {allPartnerCategories.filter((cat) => cat !== "임상시험 보험").map((cat) => (
                            <button key={cat} type="button"
                              onClick={() => setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat])}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                                selectedCategories.includes(cat) ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground/60 hover:border-foreground/30"
                              }`}>
                              {cat}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => {
                            if (selectedCategories.length === 0) { alert("회사유형을 하나 이상 선택해주세요."); return; }
                            const allUsers = JSON.parse(localStorage.getItem("sonjobda_users") || "[]");
                            const idx = allUsers.findIndex((u: { id: string }) => u.id === user.id);
                            if (idx !== -1) {
                              allUsers[idx].partnerCategories = selectedCategories;
                              allUsers[idx].allowCategoryEdit = false;
                              localStorage.setItem("sonjobda_users", JSON.stringify(allUsers));
                            }
                            setEditingCategories(false);
                            // 관리자에게 알림
                            const notifications = JSON.parse(localStorage.getItem("sonjobda_notifications") || "[]");
                            notifications.push({ id: crypto.randomUUID(), userId: "admin", message: `[회사유형 변경 완료] ${user.company} - ${user.name}님이 회사유형을 변경했습니다.\n변경: ${selectedCategories.join(", ")}`, read: false, createdAt: new Date().toISOString() });
                            localStorage.setItem("sonjobda_notifications", JSON.stringify(notifications));
                            alert("회사유형이 수정되었습니다.");
                            window.location.reload();
                          }}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark">저장</button>
                          <button onClick={() => setEditingCategories(false)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/60 hover:bg-muted">취소</button>
                        </div>
                        <p className="mt-2 text-xs text-amber-600">※ 관리자가 수정을 허용한 상태입니다. 저장 후 수정 권한이 자동 해제됩니다.</p>
                      </div>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user.partnerCategories.map((cat) => (
                          <span key={cat} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground/60">{cat}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 활동 요약 */}
            <div className="rounded-xl border border-border bg-surface shadow-card p-6">
              <h3 className="text-base font-semibold text-foreground">활동 요약</h3>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {user.roles?.includes("client") && (
                  <>
                    <div className="rounded-lg bg-muted p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{myRequests.length}</p>
                      <p className="mt-1 text-xs text-foreground/50">등록한 의뢰</p>
                    </div>
                    <div className="rounded-lg bg-muted p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{receivedQuotes}</p>
                      <p className="mt-1 text-xs text-foreground/50">받은 견적</p>
                    </div>
                  </>
                )}
                {user.roles?.includes("partner") && (
                  <>
                    <div className="rounded-lg bg-muted p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{partnerRequests.length}</p>
                      <p className="mt-1 text-xs text-foreground/50">받은 의뢰</p>
                    </div>
                    <div className="rounded-lg bg-muted p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{submittedQuotes}</p>
                      <p className="mt-1 text-xs text-foreground/50">제출 견적</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 회원 탈퇴 */}
            <div className="rounded-xl border border-red-100 bg-surface p-6">
              <h3 className="text-base font-semibold text-foreground">회원 탈퇴</h3>
              <p className="mt-1 text-sm text-foreground/50">탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.</p>
              <button onClick={deleteAccount}
                className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50">
                회원 탈퇴
              </button>
            </div>
          </div>
        )}

        {/* 비밀번호 변경 */}
        {activeTab === "password" && (
          <div className="mt-6">
            <div className="rounded-xl border border-border bg-surface shadow-card p-6">
              <h3 className="text-base font-semibold text-foreground">비밀번호 변경</h3>
              <div className="mt-4 max-w-sm space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">현재 비밀번호 *</label>
                  <input type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">새 비밀번호 *</label>
                  <input type="password" value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} maxLength={12}
                    placeholder="8~12자, 영문/숫자/특수문자 중 2종 이상"
                    className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">새 비밀번호 확인 *</label>
                  <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} maxLength={12}
                    className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  {pwForm.confirm && pwForm.newPw !== pwForm.confirm && (
                    <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
                  )}
                </div>
                <button onClick={changePassword}
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
                  비밀번호 변경
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 소속 관리 */}
        {activeTab === "company" && (
          <div className="mt-6 space-y-6">
            {/* 소속 회사 정보 */}
            <div className="rounded-xl border border-border bg-surface shadow-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">소속 회사</h3>
                {isAdmin && (
                  <button onClick={() => setShowCompanyChangeModal(true)} className="text-xs font-medium text-primary hover:underline">회사 정보 변경 요청</button>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-foreground/40">회사명</span><p className="mt-0.5 font-medium text-foreground">{user.company}</p></div>
                <div><span className="text-foreground/40">사업자등록번호</span><p className="mt-0.5 font-medium text-foreground">{user.businessNumber}</p></div>
              </div>
              {isAdmin && <p className="mt-3 text-xs text-primary/60">회사 관리자로 지정되어 있습니다</p>}
            </div>

            {/* 멤버 초대 - 회사 관리자만 */}
            {isAdmin && (
              <div className="rounded-xl border border-border bg-surface shadow-card p-6">
                <h3 className="text-base font-semibold text-foreground">멤버 초대</h3>
                <p className="mt-1 text-xs text-foreground/40">같은 회사 직원을 초대할 수 있습니다.</p>
                <div className="mt-4 flex gap-2">
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="초대할 이메일 주소" className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  <button onClick={sendInvite} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">초대</button>
                </div>
              </div>
            )}

            {/* 소속 멤버 */}
            <div className="rounded-xl border border-border bg-surface shadow-card p-6">
              <h3 className="text-base font-semibold text-foreground">소속 멤버 ({companyMembers.length}명)</h3>
              <p className="mt-1 text-xs text-foreground/40">같은 사업자등록번호로 가입한 멤버입니다.</p>
              <div className="mt-4 space-y-3">
                {companyMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground/60">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {member.name}
                          {member.id === user.id && <span className="ml-1 text-xs text-primary">(나)</span>}
                          {member.isCompanyAdmin && <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">관리자</span>}
                          {member.status === "suspended" && <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">정지</span>}
                        </p>
                        <p className="text-xs text-foreground/40">{member.email}</p>
                      </div>
                    </div>
                    {/* 회사 관리자만 다른 멤버 관리 가능 */}
                    {isAdmin && member.id !== user.id && (
                      <div className="flex gap-1">
                        {!member.isCompanyAdmin && (
                          <button onClick={() => delegateAdmin(member.id)} className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5">관리자 위임</button>
                        )}
                        {member.status !== "suspended" ? (
                          <button onClick={() => deactivateMember(member.id)} className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50">비활성화</button>
                        ) : (
                          <button onClick={() => activateMember(member.id)} className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50">활성화</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 회사 정보 변경 요청 모달 */}
      {showCompanyChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCompanyChangeModal(false)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">회사 정보 변경 요청</h3>
            <p className="mt-1 text-sm text-foreground/50">변경이 필요한 내용을 작성해주세요. 관리자 확인 후 반영됩니다.</p>
            <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
              <div className="flex gap-4">
                <span className="text-foreground/40">회사명</span>
                <span className="font-medium text-foreground">{user.company}</span>
              </div>
              <div className="mt-1 flex gap-4">
                <span className="text-foreground/40">사업자등록번호</span>
                <span className="font-medium text-foreground">{user.businessNumber}</span>
              </div>
            </div>
            <textarea
              value={companyChangeRequest}
              onChange={(e) => setCompanyChangeRequest(e.target.value)}
              rows={4}
              placeholder="예: (주)000으로 변경요청합니다."
              className="mt-4 w-full resize-none rounded-lg border border-border px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <div className="mt-4 flex gap-2">
              <button onClick={submitCompanyInfoChange}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
                요청 보내기
              </button>
              <button onClick={() => { setShowCompanyChangeModal(false); setCompanyChangeRequest(""); }}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:bg-muted">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
